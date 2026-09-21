import { describe, expect, it } from "vitest";
import { parse } from "./parser";
import { type AsmLine, asm } from "./testing";
import { VM } from "./vm";

const load = (lines: AsmLine[]) => new VM(parse(asm(lines)));

const runToEnd = (lines: AsmLine[], input?: string) => {
  const vm = load(lines);
  if (input !== undefined) {
    vm.provideInput(input);
    vm.closeInput();
  }
  vm.run();
  return vm;
};

const printString = (text: string): AsmLine[] =>
  [...text].flatMap((c): AsmLine[] => [["push", BigInt(c.codePointAt(0) as number)], ["printc"]]);

describe("VM", () => {
  it("prints characters and numbers", () => {
    const vm = runToEnd([...printString("Hi"), ["push", -42n], ["printn"], ["end"]]);
    expect(vm.status).toBe("halted");
    expect(vm.output).toBe("Hi-42");
  });

  it("manipulates the stack", () => {
    const vm = runToEnd([
      ["push", 1n],
      ["push", 2n],
      ["push", 3n],
      ["copy", 2n], // 1 2 3 1
      ["swap"], // 1 2 1 3
      ["dup"], // 1 2 1 3 3
      ["discard"], // 1 2 1 3
      ["slide", 2n], // 1 3
      ["end"],
    ]);
    expect(vm.stack).toEqual([1n, 3n]);
  });

  it("slides away everything below the top when the count exceeds the stack", () => {
    expect(runToEnd([["push", 1n], ["push", 2n], ["slide", 10n], ["end"]]).stack).toEqual([2n]);
  });

  it("performs arithmetic with floored division and modulo", () => {
    const binary = (a: bigint, op: AsmLine[0], b: bigint): AsmLine[] => [["push", a], ["push", b], [op]];
    const vm = runToEnd([
      ...binary(7n, "add", 3n),
      ...binary(7n, "sub", 10n),
      ...binary(-6n, "mul", 7n),
      ...binary(7n, "div", 2n),
      ...binary(-7n, "div", 2n),
      ...binary(-7n, "mod", 3n),
      ...binary(7n, "mod", -3n),
      ["end"],
    ]);
    expect(vm.stack).toEqual([10n, -3n, -42n, 3n, -4n, 2n, -2n]);
  });

  it("keeps arbitrary precision", () => {
    const vm = runToEnd([["push", 2n ** 64n], ["push", 2n ** 64n], ["mul"], ["printn"], ["end"]]);
    expect(vm.output).toBe((2n ** 128n).toString());
  });

  it("stores and retrieves heap values", () => {
    const vm = runToEnd([["push", 10n], ["push", 99n], ["store"], ["push", 10n], ["retrieve"], ["end"]]);
    expect(vm.stack).toEqual([99n]);
    expect([...vm.heap]).toEqual([[10n, 99n]]);
  });

  it("loops with conditional jumps", () => {
    // Prints 1 to 5: counter at heap[0].
    const vm = runToEnd([
      ["push", 0n],
      ["push", 1n],
      ["store"],
      ["mark", "S"],
      ["push", 0n],
      ["retrieve"],
      ["printn"],
      ["push", 0n],
      ["push", 0n],
      ["retrieve"],
      ["push", 1n],
      ["add"],
      ["store"],
      ["push", 0n],
      ["retrieve"],
      ["push", 6n],
      ["sub"],
      ["jz", "T"],
      ["jump", "S"],
      ["mark", "T"],
      ["end"],
    ]);
    expect(vm.output).toBe("12345");
  });

  it("branches on negative values with jn", () => {
    const vm = runToEnd([
      ["push", -1n],
      ["jn", "S"],
      ...printString("x"),
      ["mark", "S"],
      ["push", 0n],
      ["jn", "T"],
      ...printString("y"),
      ["mark", "T"],
      ["end"],
    ]);
    expect(vm.output).toBe("y");
  });

  it("calls and returns from subroutines", () => {
    const vm = runToEnd([["call", "S"], ["call", "S"], ["end"], ["mark", "S"], ...printString("!"), ["ret"]]);
    expect(vm.status).toBe("halted");
    expect(vm.output).toBe("!!");
    expect(vm.callStack).toEqual([]);
  });

  it("reads characters and numbers from input", () => {
    const vm = runToEnd(
      [["push", 0n], ["readc"], ["push", 1n], ["readc"], ["push", 2n], ["readn"], ["push", 3n], ["readn"], ["end"]],
      "a😀 -12 \n34",
    );
    expect(vm.status).toBe("halted");
    expect([...vm.heap]).toEqual([
      [0n, 97n],
      [1n, 0x1f600n],
      [2n, -12n],
      [3n, 34n],
    ]);
  });

  it("waits for input and resumes when it arrives", () => {
    const vm = load([["push", 0n], ["readn"], ["push", 0n], ["retrieve"], ["printn"], ["end"]]);
    expect(vm.run()).toEqual({ status: "waitingForInput", reason: "stopped", steps: 1 });
    expect(vm.stack).toEqual([0n]);

    vm.provideInput("4");
    expect(vm.run().status).toBe("waitingForInput");
    vm.provideInput("2\n");
    vm.run();
    expect(vm.status).toBe("halted");
    expect(vm.output).toBe("42");
  });

  it("fails on reads after input is closed", () => {
    const vm = runToEnd([["push", 0n], ["readc"], ["end"]], "");
    expect(vm.status).toBe("error");
    expect(vm.error).toEqual({ message: "Unexpected end of input.", instructionIndex: 1 });
  });

  it.each(["abc", "+12", "1.5"])("fails on invalid number input %s", (text) => {
    const vm = runToEnd([["push", 0n], ["readn"], ["end"]], `${text}\n`);
    expect(vm.error?.message).toBe(`"${text}" is not a valid integer.`);
  });

  it.each<[string, AsmLine[], string]>([
    ["stack underflow", [["add"]], 'Stack underflow in "add".'],
    ["division by zero", [["push", 1n], ["push", 0n], ["div"]], 'Division by zero in "div".'],
    [
      "copy out of range",
      [
        ["push", 1n],
        ["copy", 1n],
      ],
      '"copy 1" is out of range for a stack of 1.',
    ],
    ["ret outside subroutine", [["ret"]], '"ret" was executed outside of a subroutine.'],
    [
      "retrieve from an unset address",
      [["push", 1n], ["push", 5n], ["store"], ["push", 0n], ["retrieve"]],
      "Heap address 0 has not been stored.",
    ],
    ["invalid character code", [["push", -1n], ["printc"]], "-1 is not a valid character code."],
  ])("reports %s", (_, lines, message) => {
    const vm = runToEnd(lines);
    expect(vm.status).toBe("error");
    expect(vm.error).toEqual({ message, instructionIndex: lines.length - 1 });
    expect(vm.pc).toBe(lines.length - 1);
  });

  it("halts normally when running off the end of the program", () => {
    const vm = runToEnd([["push", 1n]]);
    expect(vm.status).toBe("halted");
    expect(vm.error).toBeNull();
    expect(vm.stepCount).toBe(1);
  });

  it("halts an empty program immediately", () => {
    expect(runToEnd([]).status).toBe("halted");
  });

  it("does nothing once stopped", () => {
    const vm = runToEnd([["end"]]);
    expect(vm.step()).toBe("halted");
    expect(vm.stepCount).toBe(1);
  });

  it("stops after the step limit and at breakpoints", () => {
    const vm = load([["mark", "S"], ["push", 1n], ["discard"], ["jump", "S"]]);
    expect(vm.run({ maxSteps: 10 })).toEqual({ status: "ready", reason: "stepLimit", steps: 10 });

    const breakpoints = new Set([2]);
    const first = vm.run({ breakpoints, maxSteps: 100 });
    expect(first.reason).toBe("breakpoint");
    expect(vm.pc).toBe(2);
    // Resuming from a breakpoint executes it before stopping there again.
    expect(vm.run({ breakpoints, maxSteps: 100 })).toEqual({ status: "ready", reason: "breakpoint", steps: 4 });
  });

  it("refuses programs with parse errors", () => {
    expect(() => new VM(parse(asm([["jump", "S"]])))).toThrow();
  });
});
