import { describe, expect, it } from "vitest";
import { parse } from "../whitespace/parser";
import { asm } from "../whitespace/testing";
import { instructionsAtLines } from "./breakpointMapping";

const linesOf = (source: string) => {
  const lines = [];
  let from = 0;
  for (const text of source.split("\n")) {
    lines.push({ from, to: from + text.length });
    from += text.length + 1;
  }
  return lines;
};

const map = (source: string, lineNumbers: number[]) => {
  const lines = linesOf(source);
  return [
    ...instructionsAtLines(
      parse(source).instructions,
      lineNumbers.map((n) => lines[n - 1]),
    ),
  ];
};

describe("instructionsAtLines", () => {
  it("maps a line to the instruction on it", () => {
    // Each of these instructions ends with its own line feed, so they occupy one line each.
    const source = asm([["push", 1n], ["push", 2n], ["printn"]]);
    expect(map(source, [1, 2, 3])).toEqual([0, 1, 2]);
  });

  it("picks the first instruction when a line holds several", () => {
    const source = asm([["add"], ["sub"], ["push", 1n]]);
    expect(map(source, [1])).toEqual([0]);
  });

  it("maps every line of a multi-line instruction to it", () => {
    // "end" is three line feeds: it starts on line 2 and covers lines 2 to 4.
    const source = asm([["push", 1n], ["end"]]);
    expect(map(source, [2])).toEqual([1]);
    expect(map(source, [3])).toEqual([1]);
    expect(map(source, [4])).toEqual([1]);
  });

  it("ignores lines without instructions", () => {
    // Any line feed is a token, so only text after the last instruction can form an instruction-free line.
    const source = `${asm([["push", 1n]])}comment`;
    expect(map(source, [1])).toEqual([0]);
    expect(map(source, [2])).toEqual([]);
  });
});
