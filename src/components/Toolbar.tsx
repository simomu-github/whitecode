import type { ReactNode } from "react";
// Shared with the app bundle so the in-app icon always matches the window/taskbar icon.
import appIcon from "../../src-tauri/icons/64x64.png";
import { type Menu, MenuBar } from "./MenuBar";

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
  menus: Menu[];
  /** Omitted callbacks render their button disabled. */
  onRun?: () => void;
  onPause?: () => void;
  onStep?: () => void;
  onStop?: () => void;
};

export function Toolbar({ menus, onRun, onPause, onStep, onStop }: ToolbarProps) {
  return (
    <div className="flex h-9 shrink-0 items-center gap-1 border-b border-border bg-surface-raised px-2">
      <img src={appIcon} alt="" className="size-5" draggable={false} />
      <span className="mr-3 font-semibold">Whitecode</span>

      <MenuBar menus={menus} />

      <div className="ml-auto flex items-center gap-1">
        {onPause ? (
          <ToolbarButton title="Pause (F5)" onClick={onPause}>
            <svg viewBox="0 0 16 16" className="size-4 fill-warning" aria-hidden="true">
              <path d="M4 3h3v10H4zM9 3h3v10H9z" />
            </svg>
          </ToolbarButton>
        ) : (
          <ToolbarButton title="Run (F5)" onClick={onRun}>
            <svg viewBox="0 0 16 16" className="size-4 fill-success" aria-hidden="true">
              <path d="M4 2.5v11l9-5.5z" />
            </svg>
          </ToolbarButton>
        )}
        <ToolbarButton title="Step (F10)" onClick={onStep}>
          <svg viewBox="0 0 16 16" className="size-4 fill-accent" aria-hidden="true">
            <path d="M2 3h2v10H2zM6 3v10l8-5z" />
          </svg>
        </ToolbarButton>
        <ToolbarButton title="Stop (Shift+F5)" onClick={onStop}>
          <svg viewBox="0 0 16 16" className="size-4 fill-error" aria-hidden="true">
            <path d="M3 3h10v10H3z" />
          </svg>
        </ToolbarButton>
      </div>
    </div>
  );
}
