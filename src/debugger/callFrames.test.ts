import { describe, expect, it } from "vitest";
import { parse } from "../whitespace/parser";
import { asm } from "../whitespace/testing";
import { VM } from "../whitespace/vm";
import { callFrames } from "./callFrames";

// main calls S, which calls T; T then pauses at its "end" so the frames can be inspected.
const program = parse(
  asm([
    ["call", "S"], // 0
    ["end"], // 1
    ["mark", "S"], // 2
    ["call", "T"], // 3
    ["ret"], // 4
    ["mark", "T"], // 5
    ["end"], // 6
  ]),
);
const range = (index: number) => ({ from: program.instructions[index].from, to: program.instructions[index].to });

const runTo = (pc: number) => {
  const vm = new VM(program);
  while (vm.pc !== pc) vm.step();
  return vm;
};

describe("callFrames", () => {
  it("has only the main frame outside a subroutine", () => {
    expect(callFrames(program, 0, [])).toEqual([{ label: null, at: range(0) }]);
  });

  it("lists nested frames innermost first, each waiting at its call", () => {
    const vm = runTo(6);
    expect(callFrames(program, vm.pc, vm.callStack)).toEqual([
      { label: "T", at: range(6) },
      { label: "S", at: range(3) },
      { label: null, at: range(0) },
    ]);
  });

  it("builds only the innermost frames up to the limit", () => {
    const vm = runTo(6);
    expect(callFrames(program, vm.pc, vm.callStack, 2)).toEqual([
      { label: "T", at: range(6) },
      { label: "S", at: range(3) },
    ]);
  });

  it("has no position for the innermost frame once execution ran past the end", () => {
    expect(callFrames(program, program.instructions.length, [1])).toEqual([
      { label: "S", at: null },
      { label: null, at: range(0) },
    ]);
  });
});
