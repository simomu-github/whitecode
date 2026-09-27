import { redo as cmRedo, selectAll as cmSelectAll, undo as cmUndo } from "@codemirror/commands";
import type { EditorView } from "@codemirror/view";
import { readText, writeText } from "@tauri-apps/plugin-clipboard-manager";

// Menu-driven equivalents of the editor's own shortcuts. Clipboard access goes through the
// Tauri plugin because the web Clipboard API is unreliable across the platform webviews.

const selectedText = (view: EditorView) =>
  view.state.selection.ranges
    .filter((range) => !range.empty)
    .map((range) => view.state.sliceDoc(range.from, range.to))
    .join(view.state.lineBreak);

export function undo(view: EditorView) {
  cmUndo(view);
  view.focus();
}

export function redo(view: EditorView) {
  cmRedo(view);
  view.focus();
}

export function selectAll(view: EditorView) {
  cmSelectAll(view);
  view.focus();
}

export async function copy(view: EditorView) {
  view.focus();
  const text = selectedText(view);
  if (text) await writeText(text);
}

export async function cut(view: EditorView) {
  view.focus();
  const text = selectedText(view);
  if (!text || view.state.readOnly) return;
  await writeText(text);
  view.dispatch(view.state.replaceSelection(""), { scrollIntoView: true, userEvent: "delete.cut" });
}

export async function paste(view: EditorView) {
  view.focus();
  const text = await readText();
  if (!text || view.state.readOnly) return;
  view.dispatch(view.state.replaceSelection(text), { scrollIntoView: true, userEvent: "input.paste" });
}
