import type { ReactNode } from "react";
import { PanePlaceholder } from "../components/Pane";
import { useAppStore } from "../store";

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

  const { stack, callStack } = snapshot;
  return (
    <div className="py-1">
      {stack.length === 0 ? (
        <PanePlaceholder>Stack is empty.</PanePlaceholder>
      ) : (
        <ValueTable
          rows={stack
            .map((value, i) => ({ key: i === stack.length - 1 ? "top" : stack.length - 1 - i, value }))
            .reverse()}
        />
      )}
      {callStack.length > 0 && (
        <p className="border-t border-border px-3 pt-1 font-mono text-xs text-fg-muted">
          Call depth {callStack.length}
        </p>
      )}
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
