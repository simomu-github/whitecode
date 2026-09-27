import { useEffect, useRef, useState } from "react";

export type MenuItem = {
  label: string;
  shortcut?: string;
  /** Omitted renders the item disabled. */
  onClick?: () => void;
  /** Set to make the item a toggle that shows a check mark while on. */
  checked?: boolean;
};

export type Menu = {
  label: string;
  /** Letter of `label` that opens the menu together with Alt. */
  mnemonic: string;
  /** `null` entries render as separators. */
  items: (MenuItem | null)[];
};

function MenuLabel({ label, mnemonic }: { label: string; mnemonic: string }) {
  const i = label.toLowerCase().indexOf(mnemonic.toLowerCase());
  if (i < 0) return label;
  return (
    <>
      {label.slice(0, i)}
      <span className="underline">{label[i]}</span>
      {label.slice(i + 1)}
    </>
  );
}

export function MenuBar({ menus }: { menus: Menu[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const focusFirstRef = useRef(false);

  const enabledItems = () =>
    Array.from(dropdownRef.current?.querySelectorAll<HTMLButtonElement>('[role^="menuitem"]:not(:disabled)') ?? []);

  // Remember where focus was so closing the menu can hand it back (usually to the editor).
  const rememberFocus = () => {
    if (openIndex !== null) return;
    const active = document.activeElement as HTMLElement | null;
    returnFocusRef.current = rootRef.current?.contains(active) ? null : active;
  };

  const open = (index: number, focusFirst: boolean) => {
    rememberFocus();
    focusFirstRef.current = focusFirst;
    setOpenIndex(index);
  };

  const close = () => {
    setOpenIndex(null);
    returnFocusRef.current?.focus();
  };

  // Runs after every render; the ref limits it to the render that opened a menu from the keyboard.
  useEffect(() => {
    if (openIndex !== null && focusFirstRef.current) {
      focusFirstRef.current = false;
      enabledItems()[0]?.focus();
    }
  });

  // Re-registered every render so the handler always sees the latest state.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        // `code` rather than `key`: on macOS Option+letter produces a different character.
        const index = menus.findIndex((menu) => e.code === `Key${menu.mnemonic.toUpperCase()}`);
        if (index < 0) return;
        e.preventDefault();
        e.stopPropagation();
        open(index, true);
        return;
      }
      if (openIndex === null) return;

      const items = enabledItems();
      const current = items.indexOf(document.activeElement as HTMLButtonElement);
      switch (e.key) {
        case "Escape":
        case "Tab":
          close();
          break;
        case "ArrowDown":
          items[(current + 1) % items.length]?.focus();
          break;
        case "ArrowUp":
          items[(current <= 0 ? items.length : current) - 1]?.focus();
          break;
        case "Home":
          items[0]?.focus();
          break;
        case "End":
          items[items.length - 1]?.focus();
          break;
        case "ArrowLeft":
          open((openIndex + menus.length - 1) % menus.length, true);
          break;
        case "ArrowRight":
          open((openIndex + 1) % menus.length, true);
          break;
        case "Enter":
        case " ":
          // Let a focused item activate itself; otherwise keep the key away from the editor.
          if (current >= 0) return;
          break;
        default:
          return;
      }
      e.preventDefault();
      e.stopPropagation();
    };
    const onPointerDown = (e: PointerEvent) => {
      if (openIndex !== null && !rootRef.current?.contains(e.target as Node)) setOpenIndex(null);
    };
    // Capture phase so the editor does not also act on keys meant for the menu.
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  });

  return (
    <div ref={rootRef} role="menubar" className="flex items-center">
      {menus.map((menu, menuIndex) => (
        <div key={menu.label} className="relative">
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={openIndex === menuIndex}
            // Runs before the button takes focus, unlike onClick.
            onPointerDown={rememberFocus}
            onClick={() => (openIndex === menuIndex ? close() : open(menuIndex, false))}
            onPointerEnter={() => {
              if (openIndex !== null && openIndex !== menuIndex) open(menuIndex, false);
            }}
            className={`flex h-7 items-center px-2 hover:bg-hover ${openIndex === menuIndex ? "bg-hover" : ""}`}
          >
            <MenuLabel label={menu.label} mnemonic={menu.mnemonic} />
          </button>
          {openIndex === menuIndex && (
            <div
              ref={dropdownRef}
              role="menu"
              className="absolute top-full left-0 z-50 mt-0.5 min-w-56 border border-border bg-surface-raised py-1 shadow-lg"
            >
              {menu.items.map((item, i) =>
                item ? (
                  <button
                    key={item.label}
                    type="button"
                    {...(item.checked === undefined
                      ? { role: "menuitem" }
                      : { role: "menuitemcheckbox", "aria-checked": item.checked })}
                    disabled={!item.onClick}
                    onClick={() => {
                      close();
                      item.onClick?.();
                    }}
                    onPointerEnter={(e) => e.currentTarget.focus()}
                    className="flex w-full items-center justify-between gap-6 py-1 pr-4 pl-2 text-left outline-none focus:bg-accent focus:text-white disabled:opacity-50"
                  >
                    <span className="flex items-center gap-2">
                      <span className="w-3 text-center" aria-hidden="true">
                        {item.checked && "✓"}
                      </span>
                      {item.label}
                    </span>
                    {item.shortcut && <span className="text-xs opacity-70">{item.shortcut}</span>}
                  </button>
                ) : (
                  // biome-ignore lint/suspicious/noArrayIndexKey: separators have no identity
                  <hr key={i} className="my-1 border-0 border-t border-border" />
                ),
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
