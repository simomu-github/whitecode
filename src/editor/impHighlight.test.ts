// @vitest-environment jsdom
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { afterEach, describe, expect, it } from "vitest";
import { asm } from "../whitespace/testing";
import { showHighlight } from "./debugHighlight";
import { editorExtensions } from "./extensions";
import { impColorsEnabled } from "./impHighlight";

let view: EditorView;

const load = (doc: string) => {
  view = new EditorView({ state: EditorState.create({ doc, extensions: editorExtensions }), parent: document.body });
};

const marks = () =>
  [...view.contentDOM.querySelectorAll(".cm-imp")].map((el) => ({
    text: el.textContent?.replace(/ /g, "S").replace(/\t/g, "T"),
    classes: [...el.classList].filter((c) => c.startsWith("cm-imp")).sort(),
    title: el.getAttribute("title"),
  }));

const lineFeeds = () => [...view.contentDOM.querySelectorAll(".cm-lf")].map((el) => [...el.classList].sort().join(" "));

afterEach(() => view.destroy());

describe("IMP highlighting", () => {
  it("colors the command and parameter of each instruction separately", () => {
    load(asm([["push", 5n], ["add"]]));
    expect(marks()).toEqual([
      { text: "SS", classes: ["cm-imp", "cm-imp-stack", "cm-imp-start"], title: "push 5" },
      { text: "STST", classes: ["cm-imp", "cm-imp-param", "cm-imp-stack"], title: "push 5" },
      { text: "TSSS", classes: ["cm-imp", "cm-imp-arith", "cm-imp-start"], title: "add" },
    ]);
    expect(lineFeeds()).toEqual(["cm-imp-stack cm-lf"]);
  });

  it("puts the start marker on the line feed of instructions that begin with one", () => {
    load(asm([["mark", "S"], ["end"]]));
    expect(lineFeeds()).toEqual([
      "cm-imp-flow cm-imp-start cm-lf",
      "cm-imp-flow cm-lf",
      "cm-imp-flow cm-imp-start cm-lf",
      "cm-imp-flow cm-lf",
      "cm-imp-flow cm-lf",
    ]);
    expect(marks().map((m) => [m.text, m.classes.includes("cm-imp-param")])).toEqual([
      ["SS", false],
      ["S", true],
    ]);
  });

  it("does not color comments", () => {
    load(`note${asm([["dup"]])}x`);
    expect(marks().map((m) => m.text)).toEqual(["S", "S"]);
    expect(view.contentDOM.textContent).toContain("note");
  });

  it("colors instructions up to a parse error and leaves the rest uncolored", () => {
    load(`${asm([["dup"]])}\t\n\n${asm([["add"]])}`);
    expect(marks().map((m) => m.title)).toEqual(["dup", "dup"]);
    expect(lineFeeds()).toEqual(["cm-imp-stack cm-lf", "cm-lf", "cm-lf"]);
  });

  it("updates as the document changes", () => {
    load(asm([["dup"]]));
    view.dispatch({ changes: { from: 0, insert: asm([["add"]]) } });
    expect(marks().map((m) => m.title)).toEqual(["add", "dup", "dup"]);
  });

  it("draws neither colors nor tooltips when turned off", () => {
    view = new EditorView({
      state: EditorState.create({
        doc: asm([["push", 5n], ["add"]]),
        extensions: [editorExtensions, impColorsEnabled.of(false)],
      }),
      parent: document.body,
    });
    expect(marks()).toEqual([]);
    expect(view.contentDOM.querySelector("[title]")).toBeNull();
    expect(lineFeeds()).toEqual(["cm-lf"]);
  });

  it("keeps the debugger highlight inside the IMP marks so it stays visible", () => {
    load(asm([["add"]]));
    showHighlight(view, { from: 0, to: 4, kind: "current" });
    const current = view.contentDOM.querySelector(".cm-debugCurrent");
    expect(current?.closest(".cm-imp")).not.toBeNull();
  });
});
