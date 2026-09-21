import { encodeNumber } from "./encoding";
import { type InstructionName, instructions, type Token, tokensToSource } from "./instructions";

export type AsmLine = [InstructionName] | [InstructionName, bigint | string];

/** Builds Whitespace source from instruction names; string arguments are labels written in S/T. */
export function asm(lines: AsmLine[]): string {
  return lines
    .map(([name, arg]) => {
      const def = instructions.find((ins) => ins.name === name);
      if (!def) throw new Error(`Unknown instruction ${name}`);
      const argTokens: Token[] =
        typeof arg === "bigint"
          ? encodeNumber(arg)
          : typeof arg === "string"
            ? [...(arg.split("") as Token[]), "L"]
            : [];
      return tokensToSource([...def.tokens, ...argTokens]);
    })
    .join("");
}

/** Converts a readable S/T/L string (other characters ignored) into Whitespace source. */
export const ws = (text: string) => tokensToSource(text.replace(/[^STL]/g, "").split("") as Token[]);
