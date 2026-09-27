// @vitest-environment jsdom
import type { EditorView } from "@codemirror/view";
import { act, createRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useViewSettings } from "../viewSettings";
import { asm } from "../whitespace/testing";
import { Editor, resetDocument } from "./Editor";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
const viewRef = createRef<EditorView>();
const view = () => viewRef.current as EditorView;

beforeEach(() => {
  useViewSettings.setState({ impColors: true, whitespaceSymbols: true, editorFontSize: 14 });
  root = createRoot(document.body.appendChild(document.createElement("div")));
  act(() => root.render(<Editor viewRef={viewRef} />));
});

afterEach(() => act(() => root.unmount()));

describe("View settings in the editor", () => {
  it("keeps them through focus changes and document resets", async () => {
    act(() => useViewSettings.setState({ impColors: false, whitespaceSymbols: false, editorFontSize: 20 }));
    const expectApplied = () => {
      expect(view().contentDOM.querySelector(".cm-imp")).toBeNull();
      expect(view().dom.classList).toContain("cm-hideWhitespace");
      expect(view().dom.style.getPropertyValue("--editor-font-size")).toBe("20px");
    };
    expectApplied();

    // CodeMirror rewrites the root element's attributes when it notices focus moving, shortly afterwards.
    view().focus();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(view().dom.classList).toContain("cm-focused");
    expectApplied();

    resetDocument(view(), asm([["push", 1n], ["add"]]));
    expectApplied();
  });

  it("restores the coloring when turned back on", () => {
    act(() => resetDocument(view(), asm([["add"]])));
    act(() => useViewSettings.setState({ impColors: false }));
    expect(view().contentDOM.querySelector(".cm-imp")).toBeNull();
    act(() => useViewSettings.setState({ impColors: true }));
    expect(view().contentDOM.querySelector(".cm-imp")).not.toBeNull();
  });
});
