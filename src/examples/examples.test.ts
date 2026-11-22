import { describe, expect, it } from "vitest";
import { parse } from "../whitespace/parser";
import { VM } from "../whitespace/vm";
import { assemble } from "./assemble";
import { examples } from "./examples";

const run = (name: string, input?: string) => {
  const example = examples.find((e) => e.name === name);
  if (!example) throw new Error(`No example named ${name}`);
  const vm = new VM(parse(example.source));
  if (input !== undefined) {
    vm.provideInput(input);
    vm.closeInput();
  }
  vm.run();
  return vm;
};

describe("assemble", () => {
  it("numbers labels from 1", () => {
    expect(
      assemble([
        ["mark", "a"],
        ["push", 2n],
        ["jump", "a"],
      ]),
    ).toBe("\n  \t\n   \t \n\n \n\t\n");
  });

  it("rejects a missing or unexpected argument", () => {
    expect(() => assemble([["push"]])).toThrow();
    expect(() => assemble([["add", 1n]])).toThrow();
  });
});

describe("examples", () => {
  it.each(examples.map((e) => [e.name, e]))("%s parses without errors", (_, example) => {
    expect(parse(example.source).errors).toEqual([]);
  });

  it("Hello World", () => {
    const vm = run("Hello World");
    expect(vm.status).toBe("halted");
    expect(vm.output).toBe("Hello, World!\n");
  });

  it("FizzBuzz", () => {
    const vm = run("FizzBuzz");
    const expected = Array.from({ length: 100 }, (_, i) => {
      const n = i + 1;
      return n % 15 === 0 ? "FizzBuzz" : n % 3 === 0 ? "Fizz" : n % 5 === 0 ? "Buzz" : String(n);
    });
    expect(vm.status).toBe("halted");
    expect(vm.output).toBe(`${expected.join("\n")}\n`);
    expect(vm.stack).toEqual([]);
  });

  it("Fibonacci", () => {
    const vm = run("Fibonacci");
    const expected = [0, 1];
    while (expected.length < 30) expected.push(expected[expected.length - 2] + expected[expected.length - 1]);
    expect(vm.status).toBe("halted");
    expect(vm.output).toBe(`${expected.join("\n")}\n`);
  });

  it("Echo prints lines back until an empty line", () => {
    const vm = run("Echo", "hello\nこんにちは\n\nignored\n");
    expect(vm.status).toBe("halted");
    expect(vm.output).toBe("hello\nこんにちは\n");
  });

  it("Echo waits for each line when input is interactive", () => {
    const example = examples.find((e) => e.name === "Echo");
    const vm = new VM(parse(example?.source ?? ""));
    vm.run();
    expect(vm.status).toBe("waitingForInput");
    vm.provideInput("hi\n");
    vm.run();
    expect(vm.output).toBe("hi\n");
    expect(vm.status).toBe("waitingForInput");
  });
});
