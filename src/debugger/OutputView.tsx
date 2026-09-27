import { useEffect, useRef } from "react";
import { useAppStore } from "../store";

type OutputViewProps = {
  onSelectRange: (from: number, to: number) => void;
};

export function OutputView({ onSelectRange }: OutputViewProps) {
  const output = useAppStore((s) => s.snapshot?.output ?? "");
  const diagnostics = useAppStore((s) => s.diagnostics);
  const status = useAppStore((s) => s.debugStatus);
  const scrollRef = useRef<HTMLDivElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll whenever new output or messages arrive.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [output, diagnostics]);

  return (
    <div ref={scrollRef} className="h-full overflow-auto p-3 font-mono text-xs select-text">
      {output === "" && diagnostics.length === 0 ? (
        <p className="font-sans text-fg-muted">Program output will appear here.</p>
      ) : (
        <pre className="break-all whitespace-pre-wrap">{output}</pre>
      )}
      {status === "halted" && <p className="mt-2 font-sans text-fg-muted">Program exited.</p>}
      {status === "stopped" && <p className="mt-2 font-sans text-fg-muted">Stopped.</p>}
      {diagnostics.map((d) => (
        <button
          key={`${d.from}:${d.message}`}
          type="button"
          onClick={() => onSelectRange(d.from, d.to)}
          className="mt-2 block text-left font-sans text-error hover:underline"
        >
          Ln {d.line}, Col {d.column}: {d.message}
        </button>
      ))}
    </div>
  );
}
