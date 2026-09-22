// @vitest-environment jsdom
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { breakpointLines, toggleBreakpoint } from "../editor/breakpoints";
import { editorExtensions } from "../editor/extensions";
import { useAppStore } from "../store";
import { type AsmLine, asm } from "../whitespace/testing";
import * as debug from "./session";

// jsdom does not implement layout; CodeMirror only needs these to exist when it measures.
Range.prototype.getClientRects = () =>
  ({ length: 0, item: () => null, [Symbol.iterator]: [][Symbol.iterator] }) as unknown as DOMRectList;
Range.prototype.getBoundingClientRect = () => new DOMRect();

let view: EditorView;

const load = (lines: AsmLine[] | string) => {
  const doc = typeof lines === "string" ? lines : asm(lines);
  view = new EditorView({ state: EditorState.create({ doc, extensions: editorExtensions }), parent: document.body });
};

const state = () => useAppStore.getState();
// Marks may be split into several spans around whitespace markers, so compare the kinds present.
const highlighted = () => [
  ...new Set(
    [...view.dom.querySelectorAll(".cm-debugCurrent, .cm-debugError")].map((el) =>
      el.classList.contains("cm-debugError") ? "error" : "current",
    ),
  ),
];

beforeEach(() => {
  vi.useFakeTimers();
  useAppStore.setState({ debugStatus: "idle", snapshot: null, diagnostics: [] });
});

afterEach(() => {
  debug.stop();
  view.destroy();
  vi.useRealTimers();
});

describe("debug session", () => {
  it("runs a program to completion and unlocks the editor", () => {
    load([["push", 72n], ["printc"], ["push", 105n], ["printc"], ["end"]]);
    debug.run(view);
    expect(state().debugStatus).toBe("halted");
    expect(state().snapshot?.output).toBe("Hi");
    expect(view.state.readOnly).toBe(false);
  });

  it("stops before the first instruction on the first step, then steps one at a time", () => {
    load([["push", 1n], ["push", 2n], ["end"]]);
    debug.step(view);
    expect(state()).toMatchObject({ debugStatus: "paused", snapshot: { pc: 0, stepCount: 0 } });
    expect(view.state.readOnly).toBe(true);
    expect(highlighted()).toEqual(["current"]);

    debug.step(view);
    expect(state().snapshot).toMatchObject({ pc: 1, stack: [1n] });
    debug.step(view);
    debug.step(view);
    expect(state().debugStatus).toBe("halted");
    expect(highlighted()).toEqual([]);
  });

  it("runs long programs in batches and can be paused and stopped", () => {
    load([
      ["mark", "S"],
      ["jump", "S"],
    ]);
    debug.run(view);
    expect(state().debugStatus).toBe("running");
    const first = state().snapshot?.stepCount ?? 0;
    vi.advanceTimersToNextTimer();
    expect(state().snapshot?.stepCount).toBeGreaterThan(first);

    debug.pause();
    expect(state().debugStatus).toBe("paused");
    const paused = state().snapshot?.stepCount;
    vi.runOnlyPendingTimers();
    expect(state().snapshot?.stepCount).toBe(paused);

    debug.stop();
    expect(state().debugStatus).toBe("stopped");
    expect(view.state.readOnly).toBe(false);
  });

  it("waits for input and resumes running when a line arrives", () => {
    load([["push", 0n], ["readn"], ["push", 0n], ["retrieve"], ["printn"], ["end"]]);
    debug.run(view);
    expect(state().debugStatus).toBe("waitingForInput");

    debug.provideInput("42\n");
    expect(state().debugStatus).toBe("halted");
    expect(state().snapshot?.output).toBe("42");
  });

  it("reports parse errors with their position without starting a session", () => {
    load(`${asm([["push", 1n]])}\t\n\n`);
    debug.run(view);
    expect(state().debugStatus).toBe("error");
    expect(state().diagnostics).toEqual([
      expect.objectContaining({ line: 2, column: 1, message: 'Unknown instruction "TLL".' }),
    ]);
    expect(view.state.readOnly).toBe(false);
    expect(highlighted()).toEqual(["error"]);
  });

  it("reports runtime errors at the failing instruction", () => {
    load([["push", 1n], ["add"]]);
    debug.run(view);
    expect(state().debugStatus).toBe("error");
    expect(state().diagnostics[0]).toMatchObject({ message: 'Stack underflow in "add".', from: 5 });
    expect(state().snapshot?.pc).toBe(1);
  });

  it("clears highlights once the source is edited", () => {
    load([["add"]]);
    debug.run(view);
    expect(highlighted()).toEqual(["error"]);
    view.dispatch({ changes: { from: 0, insert: "x" } });
    expect(highlighted()).toEqual([]);
  });

  describe("breakpoints", () => {
    const counter: AsmLine[] = [
      ["push", 0n], // line 1
      ["mark", "S"], // lines 2-3
      ["push", 1n], // line 4
      ["add"], // line 5, where dup also starts
      ["dup"],
      ["printn"],
      ["jump", "S"],
    ];
    const lineStart = (n: number) => view.state.doc.line(n).from;

    it("stops at breakpoints and continues to the next hit", () => {
      load(counter);
      toggleBreakpoint(view, lineStart(4));
      debug.run(view);
      expect(state()).toMatchObject({ debugStatus: "paused", snapshot: { pc: 2, output: "" } });
      expect(view.state.readOnly).toBe(true);

      debug.run(view);
      expect(state()).toMatchObject({ debugStatus: "paused", snapshot: { pc: 2, output: "1" } });
    });

    it("stops before the first instruction of a new run", () => {
      load(counter);
      toggleBreakpoint(view, lineStart(1));
      debug.run(view);
      expect(state()).toMatchObject({ debugStatus: "paused", snapshot: { pc: 0, stepCount: 0 } });
    });

    it("applies breakpoints toggled while paused", () => {
      load(counter);
      debug.step(view);
      toggleBreakpoint(view, lineStart(5));
      debug.run(view);
      expect(state().snapshot?.pc).toBe(3);

      toggleBreakpoint(view, lineStart(5));
      debug.run(view);
      vi.advanceTimersToNextTimer();
      expect(state().debugStatus).toBe("running");
    });

    it("toggles with F9 and moves with edits above", () => {
      load(counter);
      view.dispatch({ selection: { anchor: lineStart(4) } });
      view.contentDOM.dispatchEvent(new KeyboardEvent("keydown", { key: "F9", bubbles: true }));
      expect(breakpointLines(view.state).map((l) => l.number)).toEqual([4]);

      view.dispatch({ changes: { from: 0, insert: "comment\n" } });
      expect(breakpointLines(view.state).map((l) => l.number)).toEqual([5]);

      view.dispatch({ selection: { anchor: lineStart(5) + 1 } });
      view.contentDOM.dispatchEvent(new KeyboardEvent("keydown", { key: "F9", bubbles: true }));
      expect(breakpointLines(view.state)).toEqual([]);
    });
  });

  it("blocks literal Tab insertion while running", () => {
    load([["push", 1n], ["end"]]);
    debug.step(view);
    const before = view.state.doc.toString();
    view.contentDOM.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }));
    expect(view.state.doc.toString()).toBe(before);
  });
});
