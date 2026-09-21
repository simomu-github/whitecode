import type { EditorView } from "@codemirror/view";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { message } from "@tauri-apps/plugin-dialog";
import { useEffect, useRef, useState } from "react";
import { Group, Panel } from "react-resizable-panels";
import { InstructionPalette } from "./components/InstructionPalette";
import { Pane } from "./components/Pane";
import { ParamDialog } from "./components/ParamDialog";
import { ResizeHandle } from "./components/ResizeHandle";
import { Toolbar } from "./components/Toolbar";
import { OutputView } from "./debugger/OutputView";
import { HeapView, StackView } from "./debugger/StateViews";
import * as debug from "./debugger/session";
import { Editor } from "./editor/Editor";
import { insertInstruction } from "./editor/insert";
import { confirmUnsavedChanges, newFile, openFile, saveFile, saveFileAs } from "./file/fileActions";
import { type DebugStatus, fileNameOf, isSessionActive, useAppStore } from "./store";
import { hasParam, type ParameterizedInstruction } from "./whitespace/instructions";

const statusLabels: Record<DebugStatus, string> = {
  idle: "",
  paused: "Paused",
  running: "Running",
  waitingForInput: "Waiting for input",
  halted: "Exited",
  error: "Error",
  stopped: "Stopped",
};

function App() {
  const editorViewRef = useRef<EditorView | null>(null);
  const [pendingInstruction, setPendingInstruction] = useState<ParameterizedInstruction | null>(null);
  const filePath = useAppStore((s) => s.filePath);
  const isDirty = useAppStore((s) => s.isDirty);
  const debugStatus = useAppStore((s) => s.debugStatus);
  const stepCount = useAppStore((s) => s.snapshot?.stepCount);
  const debugging = isSessionActive(debugStatus);

  const withView = (action: (view: EditorView) => void) => () => {
    if (editorViewRef.current) action(editorViewRef.current);
  };
  const runOrPause = debugStatus === "running" ? debug.pause : withView(debug.run);
  const step = withView(debug.step);

  const runFileAction = async (action: (view: EditorView) => Promise<void>) => {
    if (!editorViewRef.current) return;
    // Replacing the document would leave the session pointing at stale source positions.
    if (action === newFile || action === openFile) debug.stop();
    try {
      await action(editorViewRef.current);
    } catch (error) {
      await message(String(error), { title: "Whitecode", kind: "error" });
    }
  };

  // Re-registered every render so the handler always sees the latest runFileAction.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F5" || e.key === "F10") {
        e.preventDefault();
        if (e.key === "F10") step();
        else if (e.shiftKey) debug.stop();
        else runOrPause();
        return;
      }
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      const key = e.key.toLowerCase();
      const action =
        key === "n" ? newFile : key === "o" ? openFile : key === "s" ? (e.shiftKey ? saveFileAs : saveFile) : null;
      if (!action) return;
      e.preventDefault();
      void runFileAction(action);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  useEffect(() => {
    const unlisten = getCurrentWindow().onCloseRequested(async (event) => {
      const view = editorViewRef.current;
      if (!view) return;
      try {
        if (!(await confirmUnsavedChanges(view))) event.preventDefault();
      } catch (error) {
        event.preventDefault();
        await message(String(error), { title: "Whitecode", kind: "error" });
      }
    });
    return () => {
      void unlisten.then((fn) => fn());
    };
  }, []);

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
        onRun={debugStatus === "running" ? undefined : runOrPause}
        onPause={debugStatus === "running" ? runOrPause : undefined}
        onStep={debugStatus === "running" ? undefined : step}
        onStop={debugging ? debug.stop : undefined}
      />

      <Group orientation="horizontal" className="min-h-0 flex-1">
        <Panel id="instructions" defaultSize="20%" minSize="12%">
          <Pane title="Instructions">
            <InstructionPalette
              onInsert={
                debugging
                  ? undefined
                  : (instruction) => {
                      if (hasParam(instruction)) setPendingInstruction(instruction);
                      else if (editorViewRef.current) insertInstruction(editorViewRef.current, instruction);
                    }
              }
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
                <OutputView
                  onSelectRange={(from, to) => {
                    const view = editorViewRef.current;
                    if (!view) return;
                    view.dispatch({ selection: { anchor: from, head: to }, scrollIntoView: true });
                    view.focus();
                  }}
                />
              </Pane>
            </Panel>
          </Group>
        </Panel>

        <ResizeHandle orientation="horizontal" />

        <Panel id="inspector" defaultSize="25%" minSize="15%">
          <Group orientation="vertical" className="h-full">
            <Panel id="stack" minSize="15%">
              <Pane title="Stack">
                <StackView />
              </Pane>
            </Panel>
            <ResizeHandle orientation="vertical" />
            <Panel id="heap" minSize="15%">
              <Pane title="Heap">
                <HeapView />
              </Pane>
            </Panel>
          </Group>
        </Panel>
      </Group>

      <footer className="flex h-6 shrink-0 items-center gap-2 bg-accent px-3 text-xs text-white">
        <span title={filePath ?? undefined}>{filePath ?? "Untitled"}</span>
        {isDirty && <span>(modified)</span>}
        {debugStatus !== "idle" && (
          <span className="ml-auto">
            {statusLabels[debugStatus]}
            {stepCount !== undefined && ` · ${stepCount.toLocaleString("en-US")} steps`}
          </span>
        )}
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
