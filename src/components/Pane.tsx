import type { ReactNode } from "react";

type PaneProps = {
  title: string;
  children?: ReactNode;
};

export function Pane({ title, children }: PaneProps) {
  return (
    <section className="flex h-full flex-col bg-surface">
      <header className="flex h-7 shrink-0 items-center border-b border-border bg-surface-alt px-3 text-[11px] font-semibold tracking-wide text-fg-muted uppercase">
        {title}
      </header>
      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
    </section>
  );
}

export function PanePlaceholder({ children }: { children: ReactNode }) {
  return <p className="p-3 text-fg-muted">{children}</p>;
}
