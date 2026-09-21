import type { ParamKind, Token } from "./instructions";

const toBits = (value: bigint): Token[] =>
  value
    .toString(2)
    .split("")
    .map((bit) => (bit === "0" ? "S" : "T"));

/** Zero is encoded with an explicit 0 bit, since not every interpreter accepts an empty bit sequence. */
export function encodeNumber(value: bigint): Token[] {
  const sign: Token = value < 0n ? "T" : "S";
  const magnitude = value < 0n ? -value : value;
  return [sign, ...toBits(magnitude), "L"];
}

export type ParseResult = { ok: true; tokens: Token[] } | { ok: false; error: string };

export function parseParam(kind: ParamKind, input: string): ParseResult {
  const text = input.trim();
  if (text === "") return { ok: false, error: "Enter a value." };

  if (kind === "number") {
    if (!/^[+-]?\d+$/.test(text)) return { ok: false, error: "Enter an integer." };
    return { ok: true, tokens: encodeNumber(BigInt(text)) };
  }

  if (!/^[st]+$/i.test(text)) return { ok: false, error: "Use only S (Space) and T (Tab)." };
  return { ok: true, tokens: [...(text.toUpperCase().split("") as Token[]), "L"] };
}
