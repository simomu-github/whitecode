import { type AsmInstruction, assemble, printText } from "./assemble";

export type Example = {
  name: string;
  /** Suggested file name when the example is saved. */
  fileName: string;
  source: string;
};

const helloWorld: AsmInstruction[] = [...printText("Hello, World!\n"), ["end"]];

/** Prints 1 to 100, with Fizz for multiples of 3, Buzz for multiples of 5 and FizzBuzz for both. */
const fizzBuzz: AsmInstruction[] = [
  ["push", 1n], // stack: i
  ["mark", "loop"],
  ["dup"],
  ["push", 15n],
  ["mod"],
  ["jz", "fizzbuzz"],
  ["dup"],
  ["push", 3n],
  ["mod"],
  ["jz", "fizz"],
  ["dup"],
  ["push", 5n],
  ["mod"],
  ["jz", "buzz"],
  ["dup"],
  ["printn"],
  ["jump", "next"],

  ["mark", "fizzbuzz"],
  ["call", "printFizz"],
  ["call", "printBuzz"],
  ["jump", "next"],
  ["mark", "fizz"],
  ["call", "printFizz"],
  ["jump", "next"],
  ["mark", "buzz"],
  ["call", "printBuzz"],

  ["mark", "next"],
  ...printText("\n"),
  ["push", 1n],
  ["add"],
  ["dup"],
  ["push", 101n],
  ["sub"],
  ["jn", "loop"], // i + 1 < 101
  ["discard"],
  ["end"],

  ["mark", "printFizz"],
  ...printText("Fizz"),
  ["ret"],
  ["mark", "printBuzz"],
  ...printText("Buzz"),
  ["ret"],
];

/** Prints the first 30 Fibonacci numbers; heap[0] counts down the numbers left to print. */
const fibonacci: AsmInstruction[] = [
  ["push", 0n],
  ["push", 30n],
  ["store"],
  ["push", 0n], // stack: a b
  ["push", 1n],
  ["mark", "loop"],
  ["push", 0n],
  ["retrieve"],
  ["jz", "done"],
  ["copy", 1n], // print a
  ["printn"],
  ...printText("\n"),
  ["swap"], // a b -> b (a + b)
  ["copy", 1n],
  ["add"],
  ["push", 0n], // heap[0] -= 1
  ["push", 0n],
  ["retrieve"],
  ["push", 1n],
  ["sub"],
  ["store"],
  ["jump", "loop"],
  ["mark", "done"],
  ["end"],
];

/** Prints back each line it reads, until it reads an empty line. heap[0] holds the character just read. */
const echo: AsmInstruction[] = [
  ["mark", "line"],
  ["push", 0n],
  ["readc"],
  ["push", 0n],
  ["retrieve"],
  ["dup"],
  ["push", 10n],
  ["sub"],
  ["jz", "done"], // the line is empty
  ["mark", "char"],
  ["dup"],
  ["printc"],
  ["push", 10n],
  ["sub"],
  ["jz", "line"], // the line has ended
  ["push", 0n],
  ["readc"],
  ["push", 0n],
  ["retrieve"],
  ["jump", "char"],
  ["mark", "done"],
  ["end"],
];

export const examples: readonly Example[] = [
  { name: "Hello World", fileName: "hello-world.ws", source: assemble(helloWorld) },
  { name: "FizzBuzz", fileName: "fizzbuzz.ws", source: assemble(fizzBuzz) },
  { name: "Fibonacci", fileName: "fibonacci.ws", source: assemble(fibonacci) },
  { name: "Echo", fileName: "echo.ws", source: assemble(echo) },
];
