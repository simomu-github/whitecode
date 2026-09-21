import type { EditorView } from "@codemirror/view";
import { ask, open, save } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { resetDocument } from "../editor/Editor";
import { useAppStore } from "../store";

const filters = [
  { name: "Whitespace", extensions: ["ws"] },
  { name: "All Files", extensions: ["*"] },
];

async function confirmDiscard(): Promise<boolean> {
  if (!useAppStore.getState().isDirty) return true;
  return ask("You have unsaved changes. Discard them?", {
    title: "Whitecode",
    kind: "warning",
    okLabel: "Discard",
    cancelLabel: "Cancel",
  });
}

export async function newFile(view: EditorView) {
  if (!(await confirmDiscard())) return;
  resetDocument(view, "");
  useAppStore.setState({ filePath: null, isDirty: false });
}

export async function openFile(view: EditorView) {
  if (!(await confirmDiscard())) return;
  const path = await open({ multiple: false, directory: false, filters });
  if (path === null) return;
  const text = await readTextFile(path);
  resetDocument(view, text);
  useAppStore.setState({ filePath: path, isDirty: false });
}

export async function saveFileAs(view: EditorView) {
  const current = useAppStore.getState().filePath;
  const path = await save({ filters, defaultPath: current ?? "untitled.ws" });
  if (path === null) return;
  await writeTextFile(path, view.state.doc.toString());
  useAppStore.setState({ filePath: path, isDirty: false });
}

export async function saveFile(view: EditorView) {
  const path = useAppStore.getState().filePath;
  if (path === null) return saveFileAs(view);
  await writeTextFile(path, view.state.doc.toString());
  useAppStore.setState({ isDirty: false });
}
