/** S = Space, T = Tab, L = LF */
export type Token = "S" | "T" | "L";

const tokenChars: Record<Token, string> = { S: " ", T: "\t", L: "\n" };

export const tokensToSource = (tokens: readonly Token[]): string =>
  tokens.map((token) => tokenChars[token]).join("");

export type ImpCategory = "stack" | "arith" | "heap" | "flow" | "io";

/** `number` is a signed integer. */
export type ParamKind = "number" | "label";

export type InstructionDef = {
  name: string;
  category: ImpCategory;
  /** Includes the IMP but not the argument. */
  tokens: readonly Token[];
  param?: ParamKind;
  description: string;
};

export type ImpDef = {
  category: ImpCategory;
  label: string;
  imp: readonly Token[];
};

export const imps: readonly ImpDef[] = [
  { category: "stack", label: "Stack", imp: ["S"] },
  { category: "arith", label: "Arithmetic", imp: ["T", "S"] },
  { category: "heap", label: "Heap", imp: ["T", "T"] },
  { category: "flow", label: "Flow", imp: ["L"] },
  { category: "io", label: "I/O", imp: ["T", "L"] },
];

const define = (
  category: ImpCategory,
  command: string,
  name: string,
  description: string,
  param?: ParamKind,
): InstructionDef => {
  const imp = imps.find((i) => i.category === category)!.imp;
  return { name, category, tokens: [...imp, ...(command.split("") as Token[])], param, description };
};

export const instructions: readonly InstructionDef[] = [
  define("stack", "S", "push", "Push a number onto the stack", "number"),
  define("stack", "LS", "dup", "Duplicate the top item"),
  define("stack", "TS", "copy", "Copy the n-th item onto the top", "number"),
  define("stack", "LT", "swap", "Swap the top two items"),
  define("stack", "LL", "discard", "Discard the top item"),
  define("stack", "TL", "slide", "Discard n items below the top, keeping the top", "number"),

  define("arith", "SS", "add", "Addition"),
  define("arith", "ST", "sub", "Subtraction"),
  define("arith", "SL", "mul", "Multiplication"),
  define("arith", "TS", "div", "Integer division"),
  define("arith", "TT", "mod", "Modulo"),

  define("heap", "S", "store", "Store a value at a heap address"),
  define("heap", "T", "retrieve", "Retrieve a value from a heap address"),

  define("flow", "SS", "mark", "Mark a location with a label", "label"),
  define("flow", "ST", "call", "Call a subroutine", "label"),
  define("flow", "SL", "jump", "Jump unconditionally", "label"),
  define("flow", "TS", "jz", "Jump if the top item is zero", "label"),
  define("flow", "TT", "jn", "Jump if the top item is negative", "label"),
  define("flow", "TL", "ret", "Return from a subroutine"),
  define("flow", "LL", "end", "End the program"),

  define("io", "SS", "printc", "Output the top item as a character"),
  define("io", "ST", "printn", "Output the top item as a number"),
  define("io", "TS", "readc", "Read a character into a heap address"),
  define("io", "TT", "readn", "Read a number into a heap address"),
];
