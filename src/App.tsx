import type { EditorView } from "@codemirror/view";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { message } from "@tauri-apps/plugin-dialog";
import { useEffect, useRef, useState } from "react";
import { Group, Panel } from "react-resizable-panels";
import { InstructionPalette } from "./components/InstructionPalette";
import { Pane, PanePlaceholder } from "./components/Pane";
import { ParamDialog } from "./components/ParamDialog";
import { ResizeHandle } from "./components/ResizeHandle";
import { Toolbar } from "./components/Toolbar";
import { Editor } from "./editor/Editor";
import { insertInstruction } from "./editor/insert";
import { newFile, openFile, saveFile, saveFileAs } from "./file/fileActions";
import { fileNameOf, useAppStore } from "./store";
import { type ParameterizedInstruction, hasParam } from "./whitespace/instructions";

function App() {
  const editorViewRef = useRef<EditorView | null>(null);
  const [pendingInstruction, setPendingInstruction] = useState<ParameterizedInstruction | null>(null);
  const filePath = useAppStore((s) => s.filePath);
  const isDirty = useAppStore((s) => s.isDirty);

  const runFileAction = async (action: (view: EditorView) => Promise<void>) => {
    if (!editorViewRef.current) return;
    try {
      await action(editorViewRef.current);
    } catch (error) {
      await message(String(error), { title: "Whitecode", kind: "error" });
    }
  };

  // Re-registered every render so the handler always sees the latest runFileAction.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      const key = e.key.toLowerCase();
      const action =
        key === "n" ? newFile
        : key === "o" ? openFile
        : key === "s" ? (e.shiftKey ? saveFileAs : saveFile)
        : null;
      if (!action) return;
      e.preventDefault();
      void runFileAction(action);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  useEffect(() => {
    void getCurrentWindow().setTitle(`${isDirty ? "● " : ""}${fileNameOf(filePath)} - Whitecode`);
  }, [filePath, isDirty]);

  return (
    <div className="flex h-full flex-col">
      <Toolbar
        onNew={() => runFileAction(newFile)}
        onOpen={() => runFileAction(openFile)}
        onSave={() => runFileAction(saveFile)}
        onSaveAs={() => runFileAction(saveFileAs)}
      />

      <Group orientation="horizontal" className="min-h-0 flex-1">
        <Panel id="instructions" defaultSize="20%" minSize="12%">
          <Pane title="Instructions">
            <InstructionPalette
              onInsert={(instruction) => {
                if (hasParam(instruction)) setPendingInstruction(instruction);
                else if (editorViewRef.current) insertInstruction(editorViewRef.current, instruction);
              }}
            />
          </Pane>
        </Panel>

        <ResizeHandle orientation="horizontal" />

        <Panel id="main" minSize="30%">
          <Group orientation="vertical" className="h-full">
            <Panel id="editor" minSize="20%">
              <Pane title="Editor">
                <Editor viewRef={editorViewRef} />
              </Pane>
            </Panel>
            <ResizeHandle orientation="vertical" />
            <Panel id="output" defaultSize="30%" minSize="10%">
              <Pane title="Output">
                <PanePlaceholder>Program output will appear here.</PanePlaceholder>
              </Pane>
            </Panel>
          </Group>
        </Panel>

        <ResizeHandle orientation="horizontal" />

        <Panel id="inspector" defaultSize="25%" minSize="15%">
          <Group orientation="vertical" className="h-full">
            <Panel id="stack" minSize="15%">
              <Pane title="Stack">
                <PanePlaceholder>Stack is empty.</PanePlaceholder>
              </Pane>
            </Panel>
            <ResizeHandle orientation="vertical" />
            <Panel id="heap" minSize="15%">
              <Pane title="Heap">
                <PanePlaceholder>Heap is empty.</PanePlaceholder>
              </Pane>
            </Panel>
          </Group>
        </Panel>
      </Group>

      <footer className="flex h-6 shrink-0 items-center gap-2 bg-accent px-3 text-xs text-white">
        <span title={filePath ?? undefined}>{filePath ?? "Untitled"}</span>
        {isDirty && <span>(modified)</span>}
      </footer>

      {pendingInstruction && (
        <ParamDialog
          instruction={pendingInstruction}
          onSubmit={(paramTokens) => {
            if (editorViewRef.current) insertInstruction(editorViewRef.current, pendingInstruction, paramTokens);
            setPendingInstruction(null);
          }}
          onCancel={() => {
            setPendingInstruction(null);
            editorViewRef.current?.focus();
          }}
        />
      )}
    </div>
  );
}

export default App;
