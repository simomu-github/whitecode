/** S = Space, T = Tab, L = LF */
export type Token = "S" | "T" | "L";

const tokenChars: Record<Token, string> = { S: " ", T: "\t", L: "\n" };

export const tokensToSource = (tokens: readonly Token[]): string => tokens.map((token) => tokenChars[token]).join("");

export type ImpCategory = "stack" | "arith" | "heap" | "flow" | "io";

/** `number` is a signed integer. */
export type ParamKind = "number" | "label";

export type InstructionName =
  | "push"
  | "dup"
  | "copy"
  | "swap"
  | "discard"
  | "slide"
  | "add"
  | "sub"
  | "mul"
  | "div"
  | "mod"
  | "store"
  | "retrieve"
  | "mark"
  | "call"
  | "jump"
  | "jz"
  | "jn"
  | "ret"
  | "end"
  | "printc"
  | "printn"
  | "readc"
  | "readn";

export type InstructionDef = {
  name: InstructionName;
  category: ImpCategory;
  /** Includes the IMP but not the argument. */
  tokens: readonly Token[];
  param?: ParamKind;
  description: string;
};

export type ParameterizedInstruction = InstructionDef & { param: ParamKind };

export const hasParam = (instruction: InstructionDef): instruction is ParameterizedInstruction =>
  instruction.param !== undefined;

export type ImpDef = {
  category: ImpCategory;
  label: string;
  imp: readonly Token[];
};

const stack: ImpDef = { category: "stack", label: "Stack", imp: ["S"] };
const arith: ImpDef = { category: "arith", label: "Arithmetic", imp: ["T", "S"] };
const heap: ImpDef = { category: "heap", label: "Heap", imp: ["T", "T"] };
const flow: ImpDef = { category: "flow", label: "Flow", imp: ["L"] };
const io: ImpDef = { category: "io", label: "I/O", imp: ["T", "L"] };

export const imps: readonly ImpDef[] = [stack, arith, heap, flow, io];

const define = (
  { category, imp }: ImpDef,
  command: string,
  name: InstructionName,
  description: string,
  param?: ParamKind,
): InstructionDef => ({
  name,
  category,
  tokens: [...imp, ...(command.split("") as Token[])],
  param,
  description,
});

export const instructions: readonly InstructionDef[] = [
  define(stack, "S", "push", "Push a number onto the stack", "number"),
  define(stack, "LS", "dup", "Duplicate the top item"),
  define(stack, "TS", "copy", "Copy the n-th item onto the top", "number"),
  define(stack, "LT", "swap", "Swap the top two items"),
  define(stack, "LL", "discard", "Discard the top item"),
  define(stack, "TL", "slide", "Discard n items below the top, keeping the top", "number"),

  define(arith, "SS", "add", "Addition"),
  define(arith, "ST", "sub", "Subtraction"),
  define(arith, "SL", "mul", "Multiplication"),
  define(arith, "TS", "div", "Integer division"),
  define(arith, "TT", "mod", "Modulo"),

  define(heap, "S", "store", "Store a value at a heap address"),
  define(heap, "T", "retrieve", "Retrieve a value from a heap address"),

  define(flow, "SS", "mark", "Mark a location with a label", "label"),
  define(flow, "ST", "call", "Call a subroutine", "label"),
  define(flow, "SL", "jump", "Jump unconditionally", "label"),
  define(flow, "TS", "jz", "Jump if the top item is zero", "label"),
  define(flow, "TT", "jn", "Jump if the top item is negative", "label"),
  define(flow, "TL", "ret", "Return from a subroutine"),
  define(flow, "LL", "end", "End the program"),

  define(io, "SS", "printc", "Output the top item as a character"),
  define(io, "ST", "printn", "Output the top item as a number"),
  define(io, "TS", "readc", "Read a character into a heap address"),
  define(io, "TT", "readn", "Read a number into a heap address"),
];
