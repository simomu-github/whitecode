import { type EditorState, type Extension, Facet, Prec, type Range } from "@codemirror/state";
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate, WidgetType } from "@codemirror/view";
import type { ImpCategory } from "../whitespace/instructions";
import { type ParsedInstruction, parse } from "../whitespace/parser";

type LineFeed = { category: ImpCategory; isStart: boolean };

class LineFeedWidget extends WidgetType {
  constructor(readonly lineFeed: LineFeed | undefined) {
    super();
  }

  eq(other: LineFeedWidget) {
    return other.lineFeed?.category === this.lineFeed?.category && other.lineFeed?.isStart === this.lineFeed?.isStart;
  }

  toDOM() {
    const span = document.createElement("span");
    const classes = ["cm-lf"];
    if (this.lineFeed) classes.push(`cm-imp-${this.lineFeed.category}`);
    if (this.lineFeed?.isStart) classes.push("cm-imp-start");
    span.className = classes.join(" ");
    span.textContent = "↵";
    return span;
  }

  ignoreEvent() {
    return false;
  }
}

const describe = (ins: ParsedInstruction) => {
  const arg = ins.value ?? (ins.label !== undefined ? `"${ins.label}"` : undefined);
  return arg === undefined ? ins.def.name : `${ins.def.name} ${arg}`;
};

/** Whether instructions are colored (with tooltips) at all. Off leaves only the plain ↵ markers. */
export const impColorsEnabled = Facet.define<boolean, boolean>({
  combine: (values) => (values.length > 0 ? values[values.length - 1] : true),
});

function buildDecorations(state: EditorState): DecorationSet {
  const { doc } = state;
  const text = doc.toString();
  const decorations: Range<Decoration>[] = [];
  const lineFeeds = new Map<number, LineFeed>();

  for (const ins of state.facet(impColorsEnabled) ? parse(text).instructions : []) {
    const { category } = ins.def;
    const title = describe(ins);
    // Whether the next token drawn is the first of the instruction, which gets the start marker.
    let isFirst = true;
    let runStart = -1;

    const closeRun = (end: number) => {
      if (runStart < 0) return;
      const isParam = ins.paramFrom !== undefined && runStart >= ins.paramFrom;
      const classes = ["cm-imp", `cm-imp-${category}`];
      if (isParam) classes.push("cm-imp-param");
      if (isFirst) classes.push("cm-imp-start");
      decorations.push(Decoration.mark({ class: classes.join(" "), attributes: { title } }).range(runStart, end));
      isFirst = false;
      runStart = -1;
    };

    for (let pos = ins.from; pos < ins.to; pos++) {
      const ch = text[pos];
      if (ch === " " || ch === "\t") {
        // Split at the parameter boundary so the command and its argument are styled separately.
        if (pos === ins.paramFrom) closeRun(pos);
        if (runStart < 0) runStart = pos;
      } else {
        closeRun(pos);
        if (ch === "\n") {
          lineFeeds.set(pos, { category, isStart: isFirst });
          isFirst = false;
        }
      }
    }
    closeRun(ins.to);
  }

  for (let n = 1; n < doc.lines; n++) {
    const end = doc.line(n).to;
    decorations.push(Decoration.widget({ widget: new LineFeedWidget(lineFeeds.get(end)), side: 1 }).range(end));
  }

  return Decoration.set(decorations, true);
}

const impHighlighter = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildDecorations(view.state);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.startState.facet(impColorsEnabled) !== update.state.facet(impColorsEnabled)) {
        this.decorations = buildDecorations(update.state);
      }
    }
  },
  { decorations: (plugin) => plugin.decorations },
);

const impTheme = EditorView.baseTheme({
  ".cm-imp-stack": { "--imp": "var(--color-imp-stack)" },
  ".cm-imp-arith": { "--imp": "var(--color-imp-arith)" },
  ".cm-imp-heap": { "--imp": "var(--color-imp-heap)" },
  ".cm-imp-flow": { "--imp": "var(--color-imp-flow)" },
  ".cm-imp-io": { "--imp": "var(--color-imp-io)" },
  ".cm-imp": { backgroundColor: "color-mix(in srgb, var(--imp) 32%, transparent)" },
  ".cm-imp.cm-imp-param": { backgroundColor: "color-mix(in srgb, var(--imp) 14%, transparent)" },
  ".cm-imp-start": { boxShadow: "inset 2px 0 0 var(--imp)" },
  ".cm-lf": { color: "#5a5a5a", paddingLeft: "1px", pointerEvents: "none" },
  ".cm-lf[class*='cm-imp-']": { color: "var(--imp)" },
  // Toggled from the View menu. Kept after the rules above so it wins at equal specificity.
  "&.cm-hideWhitespace .cm-lf": { display: "none" },
});

/**
 * Colors each instruction by its IMP category and shows line feeds as ↵.
 * Lower-precedence marks are rendered outside higher ones, so the lowest precedence keeps each run in
 * one element (instead of being split by the whitespace markers) and leaves the debugger highlight inside, on top.
 */
export const impHighlight: Extension = [Prec.lowest(impHighlighter), impTheme];
