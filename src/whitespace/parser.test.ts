import { describe, expect, it } from "vitest";
import { parse } from "./parser";
import { asm, ws } from "./testing";

const summarize = (source: string) =>
  parse(source).instructions.map((ins) => [ins.def.name, ins.value ?? ins.label].filter((x) => x !== undefined));

describe("parse", () => {
  it("parses numbers with sign, magnitude and zero", () => {
    expect(summarize(ws("SS STSTL  SS TTSTL  SS SL  SS SSL"))).toEqual([
      ["push", 5n],
      ["push", -5n],
      ["push", 0n],
      ["push", 0n],
    ]);
  });

  it("parses big numbers without losing precision", () => {
    const big = 2n ** 100n + 1n;
    expect(summarize(asm([["push", big]]))).toEqual([["push", big]]);
  });

  it("parses every instruction", () => {
    const source = asm([
      ["mark", "ST"],
      ["push", 1n],
      ["dup"],
      ["copy", 1n],
      ["swap"],
      ["discard"],
      ["slide", 1n],
      ["add"],
      ["sub"],
      ["mul"],
      ["div"],
      ["mod"],
      ["store"],
      ["retrieve"],
      ["call", "ST"],
      ["jump", "ST"],
      ["jz", "ST"],
      ["jn", "ST"],
      ["ret"],
      ["printc"],
      ["printn"],
      ["readc"],
      ["readn"],
      ["end"],
    ]);
    const program = parse(source);
    expect(program.errors).toEqual([]);
    expect(program.instructions).toHaveLength(24);
  });

  it("treats every other character as a comment", () => {
    const source = `push 1:${ws("SS")}sign${ws("S")}bit${ws("T")}end${ws("L")}\rfin${ws("LLL")}`;
    expect(summarize(source)).toEqual([["push", 1n], ["end"]]);
  });

  it("records source ranges covering the whole instruction", () => {
    const source = `x${ws("SSSTL")}yy${ws("LLL")}`;
    const [push, end] = parse(source).instructions;
    expect([push.from, push.to]).toEqual([1, 6]);
    expect([end.from, end.to]).toEqual([8, 11]);
  });

  it("maps labels to the index of their mark, including the empty label", () => {
    const program = parse(asm([["mark", "ST"], ["mark", ""], ["jump", ""], ["end"]]));
    expect(program.errors).toEqual([]);
    expect([...program.labels]).toEqual([
      ["ST", 0],
      ["", 1],
    ]);
  });

  it("reports unknown instructions", () => {
    const { errors } = parse(ws("TLL"));
    expect(errors).toEqual([{ from: 0, to: 3, message: 'Unknown instruction "TLL".' }]);
  });

  it("reports an incomplete instruction at the end", () => {
    expect(parse(ws("TS")).errors[0].message).toBe("Incomplete instruction at end of source.");
  });

  it("reports a missing terminator", () => {
    expect(parse(ws("SSSTT")).errors[0].message).toBe('Missing LF to terminate the number of "push".');
  });

  it("reports a number without sign", () => {
    expect(parse(ws("SSL")).errors[0].message).toBe('Missing sign in the number of "push".');
  });

  it("reports duplicate and undefined labels", () => {
    const { errors } = parse(asm([["mark", "S"], ["mark", "S"], ["jump", "T"], ["end"]]));
    expect(errors.map((e) => e.message)).toEqual(['Label "S" is already defined.', 'Label "T" is not defined.']);
  });
});
