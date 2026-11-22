export const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent);

// macOS lists modifiers in this order, as symbols with no separator (e.g. ⇧⌘S).
const macModifiers = [
  ["Ctrl", "⌘"],
  ["Alt", "⌥"],
  ["Shift", "⇧"],
] as const;
const macOrder = ["⌥", "⇧", "⌘"];

/**
 * Formats a shortcut written in the Windows/Linux style ("Ctrl+Shift+S") for the current platform.
 * "Ctrl" stands for the primary modifier, which the key handlers accept as either Ctrl or Cmd.
 */
export function formatShortcut(shortcut: string, mac = isMac): string {
  if (!mac) return shortcut;
  const symbols: string[] = [];
  let rest = shortcut;
  for (let matched = true; matched; ) {
    matched = false;
    for (const [name, symbol] of macModifiers) {
      // `rest.length > prefix` keeps the "+" of "Ctrl++" as the key.
      if (rest.startsWith(`${name}+`) && rest.length > name.length + 1) {
        symbols.push(symbol);
        rest = rest.slice(name.length + 1);
        matched = true;
      }
    }
  }
  symbols.sort((a, b) => macOrder.indexOf(a) - macOrder.indexOf(b));
  return symbols.join("") + rest;
}
