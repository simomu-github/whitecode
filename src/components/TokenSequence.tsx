import type { Token } from "../whitespace/instructions";

const tokenGlyph: Record<Token, string> = { S: "·", T: "→", L: "↵" };
const tokenName: Record<Token, string> = { S: "Space", T: "Tab", L: "LF" };

export function TokenSequence({ tokens }: { tokens: readonly Token[] }) {
  return (
    <span className="flex flex-wrap gap-px font-mono text-[11px]">
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
