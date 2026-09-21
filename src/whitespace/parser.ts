import { type InstructionDef, instructions, type Token } from "./instructions";

/** Offsets into the source string; `to` is exclusive. */
export type SourceRange = { from: number; to: number };

export type ParsedInstruction = SourceRange & {
  def: InstructionDef;
  /** Present for `number` params. */
  value?: bigint;
  /** Present for `label` params, as a string of S and T (may be empty). */
  label?: string;
};

export type ParseError = SourceRange & { message: string };

export type Program = {
  instructions: ParsedInstruction[];
  /** Label to the index of its `mark` instruction. */
  labels: Map<string, number>;
  errors: ParseError[];
};

const charTokens: Record<string, Token> = { " ": "S", "\t": "T", "\n": "L" };

const byTokens = new Map(instructions.map((def) => [def.tokens.join(""), def]));
const prefixes = new Set(instructions.flatMap((def) => def.tokens.map((_, i) => def.tokens.slice(0, i + 1).join(""))));

type SourceToken = { token: Token; offset: number };

/** Every character other than Space, Tab and LF is a comment. */
function tokenize(source: string): SourceToken[] {
  const tokens: SourceToken[] = [];
  for (let offset = 0; offset < source.length; offset++) {
    const token = charTokens[source[offset]];
    if (token) tokens.push({ token, offset });
  }
  return tokens;
}

export function parse(source: string): Program {
  const tokens = tokenize(source);
  const program: Program = { instructions: [], labels: new Map(), errors: [] };
  const rangeOf = (start: number, end: number): SourceRange => ({
    from: tokens[start].offset,
    to: tokens[end].offset + 1,
  });

  let pos = 0;
  while (pos < tokens.length) {
    const start = pos;

    let key = "";
    let def: InstructionDef | undefined;
    while (!def) {
      if (pos >= tokens.length) {
        program.errors.push({ ...rangeOf(start, pos - 1), message: "Incomplete instruction at end of source." });
        return program;
      }
      key += tokens[pos++].token;
      if (!prefixes.has(key)) {
        program.errors.push({ ...rangeOf(start, pos - 1), message: `Unknown instruction "${key}".` });
        return program;
      }
      def = byTokens.get(key);
    }

    const parsed: ParsedInstruction = { def, from: tokens[start].offset, to: 0 };

    if (def.param) {
      let bits = "";
      while (pos < tokens.length && tokens[pos].token !== "L") bits += tokens[pos++].token;
      if (pos >= tokens.length) {
        program.errors.push({
          ...rangeOf(start, pos - 1),
          message: `Missing LF to terminate the ${def.param} of "${def.name}".`,
        });
        return program;
      }
      pos++;

      if (def.param === "label") {
        parsed.label = bits;
      } else if (bits === "") {
        program.errors.push({ ...rangeOf(start, pos - 1), message: `Missing sign in the number of "${def.name}".` });
        return program;
      } else {
        parsed.value = decodeNumber(bits);
      }
    }

    parsed.to = tokens[pos - 1].offset + 1;
    program.instructions.push(parsed);
  }

  checkLabels(program);
  return program;
}

/** `bits` starts with the sign token; an empty magnitude is zero. */
function decodeNumber(bits: string): bigint {
  const magnitude = bits.length > 1 ? BigInt(`0b${bits.slice(1).replace(/S/g, "0").replace(/T/g, "1")}`) : 0n;
  return bits[0] === "T" ? -magnitude : magnitude;
}

const formatLabel = (label: string) => (label === "" ? "(empty label)" : `"${label}"`);

function checkLabels(program: Program) {
  program.instructions.forEach((ins, index) => {
    if (ins.def.name !== "mark" || ins.label === undefined) return;
    if (program.labels.has(ins.label)) {
      program.errors.push({
        from: ins.from,
        to: ins.to,
        message: `Label ${formatLabel(ins.label)} is already defined.`,
      });
    } else {
      program.labels.set(ins.label, index);
    }
  });

  for (const ins of program.instructions) {
    if (ins.def.name === "mark" || ins.label === undefined) continue;
    if (!program.labels.has(ins.label)) {
      program.errors.push({ from: ins.from, to: ins.to, message: `Label ${formatLabel(ins.label)} is not defined.` });
    }
  }
}
