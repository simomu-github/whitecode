import { useEffect, useRef, useState } from "react";
import { isSessionActive, useAppStore } from "../store";
import { closeInput, provideInput } from "./session";

type OutputViewProps = {
  onSelectRange: (from: number, to: number) => void;
};

export function OutputView({ onSelectRange }: OutputViewProps) {
  const output = useAppStore((s) => s.snapshot?.output ?? "");
  const diagnostics = useAppStore((s) => s.diagnostics);
  const status = useAppStore((s) => s.debugStatus);
  const [line, setLine] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const active = isSessionActive(status);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll whenever new output or messages arrive.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [output, diagnostics]);

  useEffect(() => {
    if (status === "waitingForInput") inputRef.current?.focus();
  }, [status]);

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto p-3 font-mono text-xs select-text">
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
            className="mt-2 block text-left font-sans text-imp-io hover:underline"
          >
            Ln {d.line}, Col {d.column}: {d.message}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          provideInput(`${line}\n`);
          setLine("");
        }}
        className="flex shrink-0 items-center gap-2 border-t border-border px-2 py-1"
      >
        <span className={`text-xs ${status === "waitingForInput" ? "text-imp-arith" : "text-fg-muted"}`}>
          {status === "waitingForInput" ? "Input needed" : "Input"}
        </span>
        <input
          ref={inputRef}
          value={line}
          onChange={(e) => setLine(e.target.value)}
          disabled={!active}
          spellCheck={false}
          autoComplete="off"
          placeholder={active ? "Press Enter to send a line" : "Available while running"}
          className="min-w-0 flex-1 border border-border bg-surface-sunken px-2 py-0.5 font-mono text-xs outline-none focus:border-accent disabled:opacity-50"
        />
        <button
          type="button"
          onClick={closeInput}
          disabled={!active}
          title="Signal end of input"
          className="px-2 py-0.5 text-xs hover:bg-hover disabled:opacity-50 disabled:hover:bg-transparent"
        >
          EOF
        </button>
      </form>
    </div>
  );
}
