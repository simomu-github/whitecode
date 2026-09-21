import type { EditorView } from "@codemirror/view";
import { message, open, save } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { resetDocument } from "../editor/Editor";
import { fileNameOf, useAppStore } from "../store";

const filters = [
  { name: "Whitespace", extensions: ["ws"] },
  { name: "All Files", extensions: ["*"] },
];

const saveLabel = "Save";
const dontSaveLabel = "Don't Save";

/** Resolves to `true` when it is safe to drop the current document. */
export async function confirmUnsavedChanges(view: EditorView): Promise<boolean> {
  const { isDirty, filePath } = useAppStore.getState();
  if (!isDirty) return true;

  const result = await message(`Do you want to save the changes you made to ${fileNameOf(filePath)}?`, {
    title: "Whitecode",
    kind: "warning",
    buttons: { yes: saveLabel, no: dontSaveLabel, cancel: "Cancel" },
  });
  if (result === saveLabel) {
    await saveFile(view);
    return !useAppStore.getState().isDirty;
  }
  return result === dontSaveLabel;
}

export async function newFile(view: EditorView) {
  if (!(await confirmUnsavedChanges(view))) return;
  resetDocument(view, "");
  useAppStore.setState({ filePath: null, isDirty: false });
}

export async function openFile(view: EditorView) {
  if (!(await confirmUnsavedChanges(view))) return;
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
