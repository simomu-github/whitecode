import { useEffect, useRef, useState } from "react";
import { parseParam } from "../whitespace/encoding";
import type { ParameterizedInstruction, Token } from "../whitespace/instructions";
import { TokenSequence } from "./TokenSequence";

type ParamDialogProps = {
  instruction: ParameterizedInstruction;
  onSubmit: (paramTokens: Token[]) => void;
  onCancel: () => void;
};

const hints = {
  number: "Integer, e.g. 42 or -7",
  label: "Sequence of S (Space) and T (Tab), e.g. STTS",
} as const;

export function ParamDialog({ instruction, onSubmit, onCancel }: ParamDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [input, setInput] = useState("");
  const result = parseParam(instruction.param, input);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: the keyboard equivalent of a backdrop click is Escape, handled by onCancel.
    <dialog
      ref={dialogRef}
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      onClick={(e) => {
        if (e.target === dialogRef.current) onCancel();
      }}
      className="m-auto w-96 border border-border bg-surface-alt p-0 text-fg backdrop:bg-black/50"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (result.ok) onSubmit(result.tokens);
        }}
        className="flex flex-col gap-3 p-4"
      >
        <header>
          <h2 className="font-mono text-sm font-semibold">
            {instruction.name} <span className="text-fg-muted">{`<${instruction.param}>`}</span>
          </h2>
          <p className="mt-1 text-xs text-fg-muted">{instruction.description}</p>
        </header>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-fg-muted">{hints[instruction.param]}</span>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            spellCheck={false}
            autoComplete="off"
            className="border border-border bg-surface-sunken px-2 py-1 font-mono outline-none focus:border-accent"
          />
        </label>

        <div className="flex min-h-5 flex-wrap items-center gap-2 text-xs">
          {result.ok ? (
            <TokenSequence tokens={result.tokens} />
          ) : (
            input.trim() !== "" && <span className="text-imp-io">{result.error}</span>
          )}
        </div>

        <footer className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="px-3 py-1 hover:bg-hover">
            Cancel
          </button>
          <button
            type="submit"
            disabled={!result.ok}
            className="bg-accent px-3 py-1 text-white hover:brightness-110 disabled:opacity-50 disabled:hover:brightness-100"
          >
            Insert
          </button>
        </footer>
      </form>
    </dialog>
  );
}
