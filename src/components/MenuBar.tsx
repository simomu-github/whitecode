import { useEffect, useRef, useState } from "react";

export type MenuItem = {
  label: string;
  shortcut?: string;
  /** Omitted renders the item disabled. */
  onClick?: () => void;
  /** Set to make the item a toggle that shows a check mark while on. */
  checked?: boolean;
  /** Items of a nested menu, opened by hovering, clicking or ArrowRight; `onClick` is ignored. */
  submenu?: (MenuItem | null)[];
};

export type Menu = {
  label: string;
  /** Letter of `label` that opens the menu together with Alt. */
  mnemonic: string;
  /** `null` entries render as separators. */
  items: (MenuItem | null)[];
};

function MenuLabel({ label, mnemonic, showMnemonic }: { label: string; mnemonic: string; showMnemonic: boolean }) {
  const i = label.toLowerCase().indexOf(mnemonic.toLowerCase());
  if (i < 0 || !showMnemonic) return label;
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
  const submenuRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  /** Which level should focus its first item after the next render. */
  const focusFirstRef = useRef<"menu" | "submenu" | null>(null);
  /** Index, in the open menu's items, of the item whose submenu is open. */
  const [submenuIndex, setSubmenuIndex] = useState<number | null>(null);
  // Like Windows and VS Code, the mnemonic underlines only appear while Alt is held.
  const [altHeld, setAltHeld] = useState(false);

  // `:scope > div >` keeps the top level from also picking up the items of an open submenu.
  const enabledItems = (level: HTMLDivElement | null) =>
    Array.from(level?.querySelectorAll<HTMLButtonElement>(':scope > div > [role^="menuitem"]:not(:disabled)') ?? []);

  // Remember where focus was so closing the menu can hand it back (usually to the editor).
  const rememberFocus = () => {
    if (openIndex !== null) return;
    const active = document.activeElement as HTMLElement | null;
    returnFocusRef.current = rootRef.current?.contains(active) ? null : active;
  };

  const open = (index: number, focusFirst: boolean) => {
    rememberFocus();
    focusFirstRef.current = focusFirst ? "menu" : null;
    setOpenIndex(index);
    setSubmenuIndex(null);
  };

  const close = () => {
    setOpenIndex(null);
    setSubmenuIndex(null);
    returnFocusRef.current?.focus();
  };

  const openSubmenu = (index: number, focusFirst: boolean) => {
    if (focusFirst) focusFirstRef.current = "submenu";
    setSubmenuIndex(index);
  };

  /** Closes the submenu and puts focus back on the item that opened it. */
  const closeSubmenu = () => {
    submenuRef.current?.parentElement?.querySelector<HTMLButtonElement>(":scope > button")?.focus();
    setSubmenuIndex(null);
  };

  // Runs after every render; the ref limits it to the render that opened a menu from the keyboard.
  useEffect(() => {
    const level = focusFirstRef.current === "menu" ? dropdownRef.current : submenuRef.current;
    if (openIndex !== null && focusFirstRef.current && level) {
      focusFirstRef.current = null;
      enabledItems(level)[0]?.focus();
    }
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) =>
      setAltHeld(e.type === "keydown" ? e.key === "Alt" || e.altKey : e.key !== "Alt" && e.altKey);
    // Alt+Tab to another window never delivers the keyup here.
    const onBlur = () => setAltHeld(false);
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("keyup", onKey, true);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("keyup", onKey, true);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

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

      const inSubmenu = submenuRef.current?.contains(document.activeElement) ?? false;
      const items = enabledItems(inSubmenu ? submenuRef.current : dropdownRef.current);
      const current = items.indexOf(document.activeElement as HTMLButtonElement);
      const focusedHasSubmenu = !inSubmenu && items[current]?.getAttribute("aria-haspopup") === "menu";
      switch (e.key) {
        case "Escape":
          if (inSubmenu) closeSubmenu();
          else close();
          break;
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
          if (inSubmenu) closeSubmenu();
          else open((openIndex + menus.length - 1) % menus.length, true);
          break;
        case "ArrowRight":
          if (focusedHasSubmenu) items[current].click();
          else open((openIndex + 1) % menus.length, true);
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

  const itemClass =
    "flex w-full items-center justify-between gap-6 py-1 pr-4 pl-2 text-left outline-none focus:bg-accent focus:text-white disabled:opacity-50";

  const itemLabel = (item: MenuItem) => (
    <span className="flex items-center gap-2">
      <span className="w-3 text-center" aria-hidden="true">
        {item.checked && "✓"}
      </span>
      {item.label}
    </span>
  );

  // Each item sits in its own wrapper, which also anchors a submenu next to it.
  const renderItems = (items: (MenuItem | null)[], topLevel: boolean) =>
    items.map((item, i) => {
      if (!item) {
        // biome-ignore lint/suspicious/noArrayIndexKey: separators have no identity
        return <hr key={i} className="my-1 border-0 border-t border-border" />;
      }

      if (topLevel && item.submenu) {
        const expanded = submenuIndex === i;
        return (
          <div key={item.label} className="relative">
            <button
              type="button"
              role="menuitem"
              aria-haspopup="menu"
              aria-expanded={expanded}
              disabled={item.submenu.length === 0}
              onClick={() => openSubmenu(i, true)}
              onPointerEnter={(e) => {
                e.currentTarget.focus();
                openSubmenu(i, false);
              }}
              className={`${itemClass} ${expanded ? "bg-hover" : ""}`}
            >
              {itemLabel(item)}
              <span className="text-xs opacity-70" aria-hidden="true">
                ▶
              </span>
            </button>
            {expanded && (
              <div
                ref={submenuRef}
                role="menu"
                className="absolute top-0 left-full z-50 -mt-1 min-w-48 border border-border bg-surface-raised py-1 shadow-lg"
              >
                {renderItems(item.submenu, false)}
              </div>
            )}
          </div>
        );
      }

      return (
        <div key={item.label}>
          <button
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
            // Moving to another item, by pointer or keyboard, closes the open submenu.
            onFocus={topLevel ? () => setSubmenuIndex(null) : undefined}
            className={itemClass}
          >
            {itemLabel(item)}
            {item.shortcut && <span className="text-xs opacity-70">{item.shortcut}</span>}
          </button>
        </div>
      );
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
            <MenuLabel label={menu.label} mnemonic={menu.mnemonic} showMnemonic={altHeld} />
          </button>
          {openIndex === menuIndex && (
            <div
              ref={dropdownRef}
              role="menu"
              className="absolute top-full left-0 z-50 mt-0.5 min-w-56 border border-border bg-surface-raised py-1 shadow-lg"
            >
              {renderItems(menu.items, true)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
