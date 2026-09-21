import type { ReactNode } from "react";

type ToolbarButtonProps = {
  title: string;
  onClick?: () => void;
  children: ReactNode;
};

function ToolbarButton({ title, onClick, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={title}
      disabled={!onClick}
      onClick={onClick}
      className="flex h-7 items-center gap-1.5 px-2 hover:bg-hover disabled:opacity-50 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}

type ToolbarProps = {
  onNew: () => void;
  onOpen: () => void;
  onSave: () => void;
  onSaveAs: () => void;
};

export function Toolbar({ onNew, onOpen, onSave, onSaveAs }: ToolbarProps) {
  return (
    <div className="flex h-9 shrink-0 items-center gap-1 border-b border-border bg-surface-raised px-2">
      <span className="mr-3 font-semibold">Whitecode</span>

      <ToolbarButton title="New File (Ctrl+N)" onClick={onNew}>
        New
      </ToolbarButton>
      <ToolbarButton title="Open File (Ctrl+O)" onClick={onOpen}>
        Open
      </ToolbarButton>
      <ToolbarButton title="Save (Ctrl+S)" onClick={onSave}>
        Save
      </ToolbarButton>
      <ToolbarButton title="Save As (Ctrl+Shift+S)" onClick={onSaveAs}>
        Save As
      </ToolbarButton>

      <div className="ml-auto flex items-center gap-1">
        <ToolbarButton title="Run">
          <svg viewBox="0 0 16 16" className="size-4 fill-imp-flow" aria-hidden="true">
            <path d="M4 2.5v11l9-5.5z" />
          </svg>
        </ToolbarButton>
        <ToolbarButton title="Step">
          <svg viewBox="0 0 16 16" className="size-4 fill-accent" aria-hidden="true">
            <path d="M2 3h2v10H2zM6 3v10l8-5z" />
          </svg>
        </ToolbarButton>
        <ToolbarButton title="Stop">
          <svg viewBox="0 0 16 16" className="size-4 fill-imp-io" aria-hidden="true">
            <path d="M3 3h10v10H3z" />
          </svg>
        </ToolbarButton>
      </div>
    </div>
  );
}
