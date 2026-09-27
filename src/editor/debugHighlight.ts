import { Compartment, EditorState, type Extension, StateEffect, StateField } from "@codemirror/state";
import { Decoration, type DecorationSet, EditorView } from "@codemirror/view";

export type HighlightKind = "current" | "error";
export type Highlight = { from: number; to: number; kind: HighlightKind };

const setHighlight = StateEffect.define<Highlight | null>();

const markClass: Record<HighlightKind, string> = { current: "cm-debugCurrent", error: "cm-debugError" };
const lineClass: Record<HighlightKind, string> = { current: "cm-debugCurrentLine", error: "cm-debugErrorLine" };

const highlightField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(decorations, tr) {
    for (const effect of tr.effects) {
      if (!effect.is(setHighlight)) continue;
      const h = effect.value;
      if (!h) return Decoration.none;
      const lineStart = tr.state.doc.lineAt(h.from).from;
      return Decoration.set(
        [
          Decoration.line({ class: lineClass[h.kind] }).range(lineStart),
          Decoration.mark({ class: markClass[h.kind] }).range(h.from, h.to),
        ],
        true,
      );
    }
    // Positions no longer match the program once the source is edited.
    return tr.docChanged ? Decoration.none : decorations;
  },
  provide: (field) => EditorView.decorations.from(field),
});

const readOnly = new Compartment();

export const debugExtensions: Extension = [
  highlightField,
  readOnly.of(EditorState.readOnly.of(false)),
  EditorView.baseTheme({
    ".cm-debugCurrentLine": {
      backgroundColor: "color-mix(in srgb, var(--color-debug-current) 8%, transparent)",
    },
    ".cm-debugCurrent": {
      backgroundColor: "color-mix(in srgb, var(--color-debug-current) 45%, transparent)",
    },
    ".cm-debugErrorLine": { backgroundColor: "color-mix(in srgb, var(--color-error) 12%, transparent)" },
    ".cm-debugError": { backgroundColor: "color-mix(in srgb, var(--color-error) 50%, transparent)" },
  }),
];

export function showHighlight(view: EditorView, highlight: Highlight | null) {
  view.dispatch({
    effects: [
      setHighlight.of(highlight),
      ...(highlight ? [EditorView.scrollIntoView(highlight.from, { y: "nearest" })] : []),
    ],
  });
}

export function setReadOnly(view: EditorView, value: boolean) {
  view.dispatch({ effects: readOnly.reconfigure(EditorState.readOnly.of(value)) });
}
