import type { ParsedInstruction, Program } from "./parser";

export type VMStatus = "ready" | "waitingForInput" | "halted" | "error";

export type VMError = {
  message: string;
  instructionIndex: number;
};

export type RunResult = { status: VMStatus; reason: "stopped" | "breakpoint" | "stepLimit"; steps: number };

/** Plain copy of the VM state, safe to hand to React. */
export type VMSnapshot = {
  pc: number;
  stack: bigint[];
  /** Sorted by address. */
  heap: [bigint, bigint][];
  callStack: number[];
  output: string;
  status: VMStatus;
  error: VMError | null;
  stepCount: number;
};

class RuntimeError extends Error {}

/** Division and modulo round toward negative infinity, matching the reference implementation. */
const floorDiv = (a: bigint, b: bigint) => {
  const q = a / b;
  return a % b !== 0n && a < 0n !== b < 0n ? q - 1n : q;
};
const floorMod = (a: bigint, b: bigint) => {
  const r = a % b;
  return r !== 0n && r < 0n !== b < 0n ? r + b : r;
};

export class VM {
  readonly program: Program;
  pc = 0;
  stack: bigint[] = [];
  heap = new Map<bigint, bigint>();
  callStack: number[] = [];
  output = "";
  status: VMStatus = "ready";
  error: VMError | null = null;
  stepCount = 0;

  private input = "";
  private inputClosed = false;

  constructor(program: Program) {
    if (program.errors.length > 0) throw new Error("Cannot run a program that has parse errors.");
    this.program = program;
  }

  get currentInstruction(): ParsedInstruction | undefined {
    return this.program.instructions[this.pc];
  }

  snapshot(): VMSnapshot {
    return {
      pc: this.pc,
      stack: [...this.stack],
      heap: [...this.heap].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
      callStack: [...this.callStack],
      output: this.output,
      status: this.status,
      error: this.error && { ...this.error },
      stepCount: this.stepCount,
    };
  }

  provideInput(text: string) {
    this.input += text;
    if (this.status === "waitingForInput") this.status = "ready";
  }

  /** Signals end of input, so pending and future reads fail instead of waiting. */
  closeInput() {
    this.inputClosed = true;
    if (this.status === "waitingForInput") this.status = "ready";
  }

  step(): VMStatus {
    if (this.status !== "ready") return this.status;

    const ins = this.currentInstruction;
    // The spec leaves running off the end undefined; like many implementations, treat it as a normal exit.
    if (!ins) {
      this.status = "halted";
      return this.status;
    }

    try {
      if (this.execute(ins)) {
        this.stepCount++;
      }
    } catch (e) {
      if (!(e instanceof RuntimeError)) throw e;
      this.fail(e.message, this.pc);
    }
    return this.status;
  }

  /**
   * Steps until the VM stops, execution arrives at a breakpoint (an instruction index),
   * or `maxSteps` instructions have run. The instruction at the starting position is
   * always executed, so resuming from a breakpoint makes progress.
   */
  run({
    maxSteps = Number.POSITIVE_INFINITY,
    breakpoints,
  }: {
    maxSteps?: number;
    breakpoints?: ReadonlySet<number>;
  } = {}): RunResult {
    let steps = 0;
    while (this.status === "ready") {
      if (steps >= maxSteps) return { status: this.status, reason: "stepLimit", steps };
      if (steps > 0 && breakpoints?.has(this.pc)) return { status: this.status, reason: "breakpoint", steps };
      const before = this.stepCount;
      this.step();
      steps += this.stepCount - before;
    }
    return { status: this.status, reason: "stopped", steps };
  }

  private fail(message: string, instructionIndex: number) {
    this.status = "error";
    this.error = { message, instructionIndex };
  }

  private pop(ins: ParsedInstruction): bigint {
    const value = this.stack.pop();
    if (value === undefined) throw new RuntimeError(`Stack underflow in "${ins.def.name}".`);
    return value;
  }

  private jumpTo(label: string) {
    // Labels were verified by the parser.
    this.pc = this.program.labels.get(label) as number;
  }

  /** Returns `false` when the instruction could not run yet because it is waiting for input. */
  private execute(ins: ParsedInstruction): boolean {
    const { stack } = this;
    const pop = () => this.pop(ins);
    let next = this.pc + 1;

    switch (ins.def.name) {
      case "push":
        stack.push(ins.value as bigint);
        break;
      case "dup": {
        const a = pop();
        stack.push(a, a);
        break;
      }
      case "copy": {
        const n = ins.value as bigint;
        const index = stack.length - 1 - Number(n);
        if (n < 0n || index < 0) throw new RuntimeError(`"copy ${n}" is out of range for a stack of ${stack.length}.`);
        stack.push(stack[index]);
        break;
      }
      case "swap": {
        const b = pop();
        const a = pop();
        stack.push(b, a);
        break;
      }
      case "discard":
        pop();
        break;
      case "slide": {
        const top = pop();
        const n = ins.value as bigint;
        // Like the reference implementation, a count beyond the stack clears it and a negative count is a no-op.
        if (n > 0n) stack.length = Math.max(0, stack.length - Number(n));
        stack.push(top);
        break;
      }

      case "add":
      case "sub":
      case "mul":
      case "div":
      case "mod": {
        const b = pop();
        const a = pop();
        if ((ins.def.name === "div" || ins.def.name === "mod") && b === 0n) {
          throw new RuntimeError(`Division by zero in "${ins.def.name}".`);
        }
        const result = {
          add: () => a + b,
          sub: () => a - b,
          mul: () => a * b,
          div: () => floorDiv(a, b),
          mod: () => floorMod(a, b),
        }[ins.def.name]();
        stack.push(result);
        break;
      }

      case "store": {
        const value = pop();
        const address = pop();
        this.heap.set(address, value);
        break;
      }
      case "retrieve": {
        const address = pop();
        const value = this.heap.get(address);
        if (value === undefined) throw new RuntimeError(`Heap address ${address} has not been stored.`);
        stack.push(value);
        break;
      }

      case "mark":
        break;
      case "call":
        this.callStack.push(next);
        this.jumpTo(ins.label as string);
        return true;
      case "jump":
        this.jumpTo(ins.label as string);
        return true;
      case "jz":
      case "jn": {
        const a = pop();
        if (ins.def.name === "jz" ? a === 0n : a < 0n) {
          this.jumpTo(ins.label as string);
          return true;
        }
        break;
      }
      case "ret": {
        const returnTo = this.callStack.pop();
        if (returnTo === undefined) throw new RuntimeError('"ret" was executed outside of a subroutine.');
        next = returnTo;
        break;
      }
      case "end":
        this.status = "halted";
        return true;

      case "printc": {
        const a = pop();
        if (a < 0n || a > 0x10ffffn) throw new RuntimeError(`${a} is not a valid character code.`);
        this.output += String.fromCodePoint(Number(a));
        break;
      }
      case "printn":
        this.output += pop().toString();
        break;
      case "readc": {
        if (this.input === "") return this.waitForInput();
        const address = pop();
        const code = this.input.codePointAt(0) as number;
        this.input = this.input.slice(String.fromCodePoint(code).length);
        this.heap.set(address, BigInt(code));
        break;
      }
      case "readn": {
        const newline = this.input.indexOf("\n");
        if (newline === -1 && (this.input === "" || !this.inputClosed)) return this.waitForInput();
        const address = pop();
        const line = newline === -1 ? this.input : this.input.slice(0, newline);
        this.input = newline === -1 ? "" : this.input.slice(newline + 1);
        const text = line.trim();
        // Like the reference implementation, a leading "+" is not accepted.
        if (!/^-?\d+$/.test(text)) throw new RuntimeError(`"${text}" is not a valid integer.`);
        this.heap.set(address, BigInt(text));
        break;
      }
    }

    this.pc = next;
    return true;
  }

  /** Always returns `false`; throws instead of waiting once input has been closed. */
  private waitForInput(): false {
    if (this.inputClosed) throw new RuntimeError("Unexpected end of input.");
    this.status = "waitingForInput";
    return false;
  }
}
