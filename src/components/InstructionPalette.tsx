import { type ImpCategory, type InstructionDef, imps, instructions } from "../whitespace/instructions";
import { TokenSequence } from "./TokenSequence";

const categoryColor: Record<ImpCategory, string> = {
  stack: "bg-imp-stack",
  arith: "bg-imp-arith",
  heap: "bg-imp-heap",
  flow: "bg-imp-flow",
  io: "bg-imp-io",
};

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
