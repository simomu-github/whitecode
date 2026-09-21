import {
  type ImpCategory,
  type InstructionDef,
  type Token,
  imps,
  instructions,
} from "../whitespace/instructions";

const categoryColor: Record<ImpCategory, string> = {
  stack: "bg-imp-stack",
  arith: "bg-imp-arith",
  heap: "bg-imp-heap",
  flow: "bg-imp-flow",
  io: "bg-imp-io",
};

const tokenGlyph: Record<Token, string> = { S: "·", T: "→", L: "↵" };
const tokenName: Record<Token, string> = { S: "Space", T: "Tab", L: "LF" };

function TokenSequence({ tokens }: { tokens: readonly Token[] }) {
  return (
    <span className="flex gap-px font-mono text-[11px]">
      {tokens.map((token, i) => (
        <span
          key={i}
          title={tokenName[token]}
          className="flex h-4 w-4 items-center justify-center bg-surface-raised text-fg-muted"
        >
          {tokenGlyph[token]}
        </span>
      ))}
    </span>
  );
}

type InstructionPaletteProps = {
  onInsert?: (instruction: InstructionDef) => void;
};

export function InstructionPalette({ onInsert }: InstructionPaletteProps) {
  return (
    <div className="py-1">
      {imps.map(({ category, label, imp }) => (
        <section key={category} className="mb-2">
          <h3 className="flex items-center gap-2 px-3 py-1 text-[11px] font-semibold text-fg-muted">
            <span className={`size-2 ${categoryColor[category]}`} />
            <span className="flex-1">{label}</span>
            <TokenSequence tokens={imp} />
          </h3>
          <ul>
            {instructions
              .filter((ins) => ins.category === category)
              .map((ins) => (
                <li key={ins.name}>
                  <button
                    type="button"
                    title={ins.description}
                    disabled={!onInsert}
                    onClick={() => onInsert?.(ins)}
                    className="flex w-full items-center gap-2 py-0.5 pr-3 pl-7 text-left enabled:hover:bg-hover"
                  >
                    <span className="font-mono">{ins.name}</span>
                    {ins.param && <span className="text-[11px] text-fg-muted">{`<${ins.param}>`}</span>}
                    <span className="ml-auto">
                      <TokenSequence tokens={ins.tokens.slice(imp.length)} />
                    </span>
                  </button>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
