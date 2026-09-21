import { defaultKeymap, history, historyKeymap, insertNewline } from "@codemirror/commands";
import { EditorState, type Extension } from "@codemirror/state";
import {
  type Command,
  drawSelection,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightWhitespace,
  keymap,
  lineNumbers,
} from "@codemirror/view";

// Whitespace source is made of exactly these characters, so Tab and Enter must insert
// them literally instead of indenting or copying the previous line's indentation.
const insertLiteralTab: Command = (view) => {
  view.dispatch(view.state.replaceSelection("\t"), { scrollIntoView: true, userEvent: "input" });
  return true;
};

const whitespaceKeymap = keymap.of([
  { key: "Tab", run: insertLiteralTab },
  { key: "Enter", run: insertNewline },
]);

const theme = EditorView.theme(
  {
    "&": {
      height: "100%",
      backgroundColor: "var(--color-surface)",
      color: "var(--color-fg)",
    },
    ".cm-scroller": {
      fontFamily: "var(--font-mono)",
      fontSize: "14px",
      lineHeight: "1.5",
    },
    ".cm-content": {
      caretColor: "var(--color-fg)",
      userSelect: "text",
      WebkitUserSelect: "text",
    },
    ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--color-fg)" },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
      backgroundColor: "#264f78",
    },
    ".cm-activeLine": { backgroundColor: "#2a2d2e" },
    ".cm-gutters": {
      backgroundColor: "var(--color-surface)",
      color: "#6e7681",
      border: "none",
    },
    ".cm-activeLineGutter": { backgroundColor: "transparent", color: "var(--color-fg)" },
    ".cm-lineNumbers .cm-gutterElement": { padding: "0 12px 0 16px" },
  },
  { dark: true },
);

export const editorExtensions: Extension[] = [
  lineNumbers(),
  highlightActiveLineGutter(),
  highlightActiveLine(),
  highlightWhitespace(),
  drawSelection(),
  history(),
  EditorState.tabSize.of(4),
  whitespaceKeymap,
  keymap.of([...defaultKeymap, ...historyKeymap]),
  theme,
];
