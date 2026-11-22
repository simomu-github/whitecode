import type { ReactNode } from "react";
import { PanePlaceholder } from "../components/Pane";
import { useAppStore } from "../store";
import { formatLabel } from "../whitespace/parser";

/** Printable ASCII is shown next to values, since programs mostly push character codes. */
const charHint = (value: bigint) => (value >= 32n && value <= 126n ? `'${String.fromCharCode(Number(value))}'` : "");

function ValueTable({ rows }: { rows: { key: ReactNode; value: bigint }[] }) {
  return (
    <table className="w-full font-mono text-xs">
      <tbody>
        {rows.map(({ key, value }, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: rows are positional and never reordered in place.
          <tr key={i} className="hover:bg-hover">
            <td className="w-0 py-0.5 pr-3 pl-3 text-right whitespace-nowrap text-fg-muted">{key}</td>
            <td className="py-0.5 break-all">{value.toString()}</td>
            <td className="w-0 py-0.5 pr-3 pl-2 whitespace-nowrap text-fg-muted">{charHint(value)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function StackView() {
  const snapshot = useAppStore((s) => s.snapshot);
  if (!snapshot) return <PanePlaceholder>Not running.</PanePlaceholder>;

  const { stack } = snapshot;
  if (stack.length === 0) return <PanePlaceholder>Stack is empty.</PanePlaceholder>;
  return (
    <div className="py-1">
      <ValueTable
        rows={stack
          .map((value, i) => ({ key: i === stack.length - 1 ? "top" : stack.length - 1 - i, value }))
          .reverse()}
      />
    </div>
  );
}

export function HeapView() {
  const snapshot = useAppStore((s) => s.snapshot);
  if (!snapshot) return <PanePlaceholder>Not running.</PanePlaceholder>;
  if (snapshot.heap.length === 0) return <PanePlaceholder>Heap is empty.</PanePlaceholder>;
  return (
    <div className="py-1">
      <ValueTable rows={snapshot.heap.map(([address, value]) => ({ key: address.toString(), value }))} />
    </div>
  );
}

type CallStackViewProps = {
  /** Called with the source range of a clicked frame's position. */
  onSelectRange: (from: number, to: number) => void;
};

/** Innermost frame first, like most debuggers; each row shows the subroutine and where it is executing. */
export function CallStackView({ onSelectRange }: CallStackViewProps) {
  const snapshot = useAppStore((s) => s.snapshot);
  const frames = useAppStore((s) => s.callFrames);
  if (!snapshot) return <PanePlaceholder>Not running.</PanePlaceholder>;

  // The main frame is not on the VM's call stack.
  const hidden = snapshot.callStack.length + 1 - frames.length;
  return (
    <div className="py-1">
      <ul className="font-mono text-xs">
        {frames.map(({ label, at }, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: frames are positional, innermost first.
          <li key={i}>
            <button
              type="button"
              disabled={!at}
              onClick={() => at && onSelectRange(at.from, at.to)}
              className="flex w-full items-baseline gap-2 px-3 py-0.5 text-left hover:bg-hover disabled:hover:bg-transparent"
            >
              <span className="w-3 shrink-0 text-accent" aria-hidden="true">
                {i === 0 && "▶"}
              </span>
              <span className={`min-w-0 flex-1 truncate ${label === null ? "text-fg-muted" : ""}`}>
                {label === null ? "(main)" : formatLabel(label)}
              </span>
              <span className="shrink-0 whitespace-nowrap text-fg-muted">
                {at ? `Ln ${at.line}, Col ${at.column}` : "(end)"}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {hidden > 0 && (
        <p className="px-3 pt-1 text-xs text-fg-muted">
          … {hidden.toLocaleString("en-US")} more {hidden === 1 ? "frame" : "frames"}
        </p>
      )}
    </div>
  );
}
