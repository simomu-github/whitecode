import { useEffect, useRef } from "react";
import { isSessionActive, useAppStore } from "../store";
import { editInput, sendEof } from "./session";

export function InputView() {
  const text = useAppStore((s) => s.presetInput);
  const sent = useAppStore((s) => s.interactiveInputSent);
  const status = useAppStore((s) => s.debugStatus);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const active = isSessionActive(status);
  const interactive = active && sent !== null;
  const waiting = status === "waitingForInput";

  useEffect(() => {
    const el = textareaRef.current;
    if (!waiting || !el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, [waiting]);

  const hint = !active
    ? text
      ? "Read as standard input when the program runs, followed by EOF."
      : "Empty: the program will wait for input typed here while it runs."
    : !interactive
      ? "Reading the text above, followed by EOF."
      : waiting
        ? "Input needed: type a line and press Enter."
        : "Interactive: Enter sends a line.";

  return (
    <div className="flex h-full flex-col">
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => editInput(e.target.value)}
        onKeyDown={(e) => {
          if (interactive && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
            e.preventDefault();
            sendEof();
          }
        }}
        // A preset session has already been handed the whole text.
        disabled={active && !interactive}
        spellCheck={false}
        placeholder={"Standard input for the program.\nLeave empty to type input while it runs."}
        className="min-h-0 flex-1 resize-none bg-surface-sunken p-3 font-mono text-xs outline-none select-text placeholder:font-sans placeholder:text-fg-muted disabled:opacity-50"
      />

      <div className="flex h-7 shrink-0 items-center gap-2 border-t border-border px-2">
        <span className={`min-w-0 flex-1 truncate text-xs ${waiting ? "text-warning" : "text-fg-muted"}`}>{hint}</span>
        <button
          type="button"
          onClick={sendEof}
          disabled={!interactive}
          title="Signal end of input (Ctrl+D)"
          className="px-2 py-0.5 text-xs hover:bg-hover disabled:opacity-50 disabled:hover:bg-transparent"
        >
          EOF
        </button>
      </div>
    </div>
  );
}
