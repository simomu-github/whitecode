import { describe, expect, it } from "vitest";
import { formatShortcut } from "./shortcuts";

describe("formatShortcut", () => {
  it("leaves shortcuts unchanged outside macOS", () => {
    expect(formatShortcut("Ctrl+Shift+S", false)).toBe("Ctrl+Shift+S");
    expect(formatShortcut("Ctrl++", false)).toBe("Ctrl++");
  });

  it("uses macOS symbols in the standard modifier order", () => {
    expect(formatShortcut("Ctrl+N", true)).toBe("⌘N");
    expect(formatShortcut("Ctrl+Shift+S", true)).toBe("⇧⌘S");
    expect(formatShortcut("Ctrl+Shift+F5", true)).toBe("⇧⌘F5");
    expect(formatShortcut("Shift+F5", true)).toBe("⇧F5");
    expect(formatShortcut("F10", true)).toBe("F10");
  });

  it("keeps + and - as keys", () => {
    expect(formatShortcut("Ctrl++", true)).toBe("⌘+");
    expect(formatShortcut("Ctrl+-", true)).toBe("⌘-");
  });
});
