import { encodeNumber } from "../whitespace/encoding";
import { type InstructionName, instructions, type Token, tokensToSource } from "../whitespace/instructions";

/** A number argument, or a symbolic label name for flow control. */
export type AsmInstruction = [InstructionName] | [InstructionName, bigint | string];

const labelBits = (n: number): Token[] =>
  n
    .toString(2)
    .split("")
    .map((bit) => (bit === "0" ? "S" : "T"));

/**
 * Builds Whitespace source from instructions. Label names are numbered 1, 2, 3, ... in order of
 * first appearance and written in binary, so no label is empty.
 */
export function assemble(program: readonly AsmInstruction[]): string {
  const labels = new Map<string, Token[]>();
  const labelOf = (name: string) => {
    let bits = labels.get(name);
    if (!bits) {
      bits = labelBits(labels.size + 1);
      labels.set(name, bits);
    }
    return bits;
  };

  return program
    .map(([name, arg]) => {
      const def = instructions.find((ins) => ins.name === name);
      if (!def) throw new Error(`Unknown instruction "${name}".`);
      if ((arg === undefined) !== (def.param === undefined)) throw new Error(`Wrong argument for "${name}".`);
      const param: Token[] =
        typeof arg === "bigint" ? encodeNumber(arg) : typeof arg === "string" ? [...labelOf(arg), "L"] : [];
      return tokensToSource([...def.tokens, ...param]);
    })
    .join("");
}

/** Pushes and prints each character of `text`. */
export const printText = (text: string): AsmInstruction[] =>
  [...text].flatMap((c): AsmInstruction[] => [["push", BigInt(c.codePointAt(0) as number)], ["printc"]]);
