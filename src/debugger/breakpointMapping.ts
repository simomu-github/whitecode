import type { SourceRange } from "../whitespace/parser";

/**
 * Maps each line (whose `to` is the offset of its line feed) to the first instruction overlapping it.
 * Instructions may span lines, so a breakpoint on any of those lines stops at the same instruction.
 * `instructions` must be sorted and non-overlapping, as produced by the parser.
 */
export function instructionsAtLines(instructions: readonly SourceRange[], lines: readonly SourceRange[]): Set<number> {
  const result = new Set<number>();
  for (const line of lines) {
    let low = 0;
    let high = instructions.length;
    while (low < high) {
      const mid = (low + high) >> 1;
      if (instructions[mid].to > line.from) high = mid;
      else low = mid + 1;
    }
    if (low < instructions.length && instructions[low].from <= line.to) result.add(low);
  }
  return result;
}
