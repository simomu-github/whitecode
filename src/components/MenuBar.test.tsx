// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type Menu, MenuBar } from "./MenuBar";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let container: HTMLDivElement;
const onFirst = vi.fn();
const onSecond = vi.fn();
const onOther = vi.fn();

const menus: Menu[] = [
  {
    label: "File",
    mnemonic: "f",
    items: [
      { label: "Other", onClick: onOther },
      {
        label: "Open Example",
        submenu: [
          { label: "First", onClick: onFirst },
          { label: "Second", onClick: onSecond },
        ],
      },
    ],
  },
  { label: "Edit", mnemonic: "e", items: [{ label: "Undo", onClick: () => {} }] },
];

const button = (label: string) =>
  [...container.querySelectorAll("button")].find((b) => b.textContent?.startsWith(label)) as HTMLButtonElement;
const key = (k: string) =>
  act(() => void document.activeElement?.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true })));
const focused = () => document.activeElement?.textContent;

beforeEach(() => {
  vi.clearAllMocks();
  container = document.body.appendChild(document.createElement("div"));
  root = createRoot(container);
  act(() => root.render(<MenuBar menus={menus} />));
  act(() => button("File").click());
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("MenuBar submenus", () => {
  it("opens a submenu on click and runs the chosen item", () => {
    act(() => button("Open Example").click());
    expect(button("Open Example").getAttribute("aria-expanded")).toBe("true");
    expect(focused()).toBe("First");

    act(() => button("Second").click());
    expect(onSecond).toHaveBeenCalledOnce();
    expect(button("First")).toBeUndefined();
  });

  it("navigates into and out of a submenu with the keyboard", () => {
    act(() => button("Open Example").focus());
    key("ArrowRight");
    expect(focused()).toBe("First");
    key("ArrowDown");
    expect(focused()).toBe("Second");

    key("ArrowLeft");
    expect(focused()).toContain("Open Example");
    expect(button("First")).toBeUndefined();

    key("ArrowRight");
    key("Escape");
    expect(focused()).toContain("Open Example");
    expect(button("File").getAttribute("aria-expanded")).toBe("true");
  });

  it("only moves among the items of the focused level", () => {
    act(() => button("Open Example").click());
    key("ArrowDown");
    key("ArrowDown");
    expect(focused()).toBe("First");
  });

  it("closes the submenu when another item takes focus", () => {
    act(() => button("Open Example").click());
    act(() => button("Other").focus());
    expect(button("First")).toBeUndefined();
  });

  it("moves to the next menu with ArrowRight on an item without a submenu", () => {
    act(() => button("Other").focus());
    key("ArrowRight");
    expect(button("Edit").getAttribute("aria-expanded")).toBe("true");
  });
});
