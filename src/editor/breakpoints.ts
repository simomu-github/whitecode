import { type EditorState, type Extension, RangeSet, StateEffect, StateField } from "@codemirror/state";
import { EditorView, GutterMarker, gutter, keymap } from "@codemirror/view";

class BreakpointMarker extends GutterMarker {
  toDOM() {
    const dot = document.createElement("span");
    dot.className = "cm-breakpoint";
    return dot;
  }
}

const marker = new BreakpointMarker();

/** `pos` is the start of the line; mapping keeps the effect valid if it is applied after other changes. */
const toggleEffect = StateEffect.define<{ pos: number; on: boolean }>({
  map: ({ pos, on }, changes) => ({ pos: changes.mapPos(pos), on }),
});

/** Markers sit at line starts and move with edits, so breakpoints follow their code. */
const breakpointField = StateField.define<RangeSet<GutterMarker>>({
  create: () => RangeSet.empty,
  update(set, tr) {
    let next = set.map(tr.changes);
    for (const effect of tr.effects) {
      if (!effect.is(toggleEffect)) continue;
      const { pos, on } = effect.value;
      next = on
        ? next.update({ add: [marker.range(pos)] })
        : next.update({ filter: (from) => tr.state.doc.lineAt(from).from !== tr.state.doc.lineAt(pos).from });
    }
    return next;
  },
});

const hasBreakpoint = (state: EditorState, lineStart: number) => {
  const line = state.doc.lineAt(lineStart);
  let found = false;
  state.field(breakpointField).between(line.from, line.to, () => {
    found = true;
    return false;
  });
  return found;
};

export function toggleBreakpoint(view: EditorView, pos: number) {
  const line = view.state.doc.lineAt(pos);
  view.dispatch({ effects: toggleEffect.of({ pos: line.from, on: !hasBreakpoint(view.state, line.from) }) });
}

/** Lines that currently have a breakpoint, in document order and without duplicates. */
export function breakpointLines(state: EditorState): { number: number; from: number; to: number }[] {
  const lines = new Map<number, { number: number; from: number; to: number }>();
  state.field(breakpointField).between(0, state.doc.length, (from) => {
    const line = state.doc.lineAt(from);
    lines.set(line.number, { number: line.number, from: line.from, to: line.to });
  });
  return [...lines.values()].sort((a, b) => a.number - b.number);
}

export const breakpoints: Extension = [
  breakpointField,
  gutter({
    class: "cm-breakpoint-gutter",
    markers: (view) => view.state.field(breakpointField),
    initialSpacer: () => marker,
    domEventHandlers: {
      mousedown(view, line) {
        toggleBreakpoint(view, line.from);
        return true;
      },
    },
  }),
  keymap.of([
    {
      key: "F9",
      run: (view) => {
        toggleBreakpoint(view, view.state.selection.main.head);
        return true;
      },
    },
  ]),
  EditorView.baseTheme({
    ".cm-breakpoint-gutter .cm-gutterElement": {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: "16px",
      paddingLeft: "4px",
      cursor: "pointer",
    },
    ".cm-breakpoint": {
      display: "block",
      width: "9px",
      height: "9px",
      borderRadius: "50%",
      backgroundColor: "#e51400",
    },
    ".cm-breakpoint-gutter .cm-gutterElement:hover:empty::before": {
      content: '""',
      width: "9px",
      height: "9px",
      borderRadius: "50%",
      backgroundColor: "rgba(229, 20, 0, 0.4)",
    },
  }),
];
