import type { EditorView } from "@codemirror/view";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { message } from "@tauri-apps/plugin-dialog";
import { useEffect, useRef, useState } from "react";
import { Group, Panel } from "react-resizable-panels";
import { InstructionPalette } from "./components/InstructionPalette";
import type { Menu } from "./components/MenuBar";
import { Pane } from "./components/Pane";
import { ParamDialog } from "./components/ParamDialog";
import { ResizeHandle } from "./components/ResizeHandle";
import { Toolbar } from "./components/Toolbar";
import { InputView } from "./debugger/InputView";
import { OutputView } from "./debugger/OutputView";
import { HeapView, StackView } from "./debugger/StateViews";
import * as debug from "./debugger/session";
import { removeAllBreakpoints, toggleBreakpointAtCursor } from "./editor/breakpoints";
import { Editor } from "./editor/Editor";
import * as edit from "./editor/editCommands";
import { insertInstruction } from "./editor/insert";
import { confirmUnsavedChanges, newFile, openFile, saveFile, saveFileAs } from "./file/fileActions";
import { type DebugStatus, fileNameOf, isSessionActive, useAppStore } from "./store";
import {
  MAX_EDITOR_FONT_SIZE,
  MIN_EDITOR_FONT_SIZE,
  resetZoom,
  useViewSettings,
  zoomIn,
  zoomOut,
} from "./viewSettings";
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
  const { impColors, whitespaceSymbols, editorFontSize } = useViewSettings();

  const withView = (action: (view: EditorView) => void) => () => {
    if (editorViewRef.current) action(editorViewRef.current);
  };
  const runOrPause = debugStatus === "running" ? debug.pause : withView(debug.run);
  const step = withView(debug.step);
  const restart = withView(debug.restart);
  const toggleBreakpoint = withView(toggleBreakpointAtCursor);
  const removeBreakpoints = withView(removeAllBreakpoints);

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

  const runEditAction = (action: (view: EditorView) => void | Promise<void>) => async () => {
    if (!editorViewRef.current) return;
    try {
      await action(editorViewRef.current);
    } catch (error) {
      await message(String(error), { title: "Whitecode", kind: "error" });
    }
  };

  // Editing is disabled while debugging because the editor is read-only then.
  const whenEditable = (action: () => void) => (debugging ? undefined : action);

  const menus: Menu[] = [
    {
      label: "File",
      mnemonic: "f",
      items: [
        { label: "New File", shortcut: "Ctrl+N", onClick: () => runFileAction(newFile) },
        { label: "Open File...", shortcut: "Ctrl+O", onClick: () => runFileAction(openFile) },
        null,
        { label: "Save", shortcut: "Ctrl+S", onClick: () => runFileAction(saveFile) },
        { label: "Save As...", shortcut: "Ctrl+Shift+S", onClick: () => runFileAction(saveFileAs) },
        null,
        // Goes through onCloseRequested, so unsaved changes are still confirmed.
        { label: "Exit", onClick: () => void getCurrentWindow().close() },
      ],
    },
    {
      label: "Edit",
      mnemonic: "e",
      items: [
        { label: "Undo", shortcut: "Ctrl+Z", onClick: whenEditable(runEditAction(edit.undo)) },
        { label: "Redo", shortcut: "Ctrl+Y", onClick: whenEditable(runEditAction(edit.redo)) },
        null,
        { label: "Cut", shortcut: "Ctrl+X", onClick: whenEditable(runEditAction(edit.cut)) },
        { label: "Copy", shortcut: "Ctrl+C", onClick: runEditAction(edit.copy) },
        { label: "Paste", shortcut: "Ctrl+V", onClick: whenEditable(runEditAction(edit.paste)) },
        null,
        { label: "Select All", shortcut: "Ctrl+A", onClick: runEditAction(edit.selectAll) },
      ],
    },
    {
      label: "View",
      mnemonic: "v",
      items: [
        {
          label: "Instruction Colors",
          checked: impColors,
          onClick: () => useViewSettings.setState({ impColors: !impColors }),
        },
        {
          label: "Whitespace Symbols",
          checked: whitespaceSymbols,
          onClick: () => useViewSettings.setState({ whitespaceSymbols: !whitespaceSymbols }),
        },
        null,
        {
          label: "Zoom In",
          shortcut: "Ctrl++",
          onClick: editorFontSize < MAX_EDITOR_FONT_SIZE ? zoomIn : undefined,
        },
        {
          label: "Zoom Out",
          shortcut: "Ctrl+-",
          onClick: editorFontSize > MIN_EDITOR_FONT_SIZE ? zoomOut : undefined,
        },
        { label: "Reset Zoom", shortcut: "Ctrl+0", onClick: resetZoom },
      ],
    },
    {
      label: "Run",
      mnemonic: "r",
      items: [
        debugStatus === "running"
          ? { label: "Pause", shortcut: "F5", onClick: runOrPause }
          : { label: "Run", shortcut: "F5", onClick: runOrPause },
        { label: "Restart", shortcut: "Ctrl+Shift+F5", onClick: debugging ? restart : undefined },
        { label: "Stop", shortcut: "Shift+F5", onClick: debugging ? debug.stop : undefined },
        null,
        { label: "Step", shortcut: "F10", onClick: debugStatus === "running" ? undefined : step },
        null,
        { label: "Toggle Breakpoint", shortcut: "F9", onClick: toggleBreakpoint },
        { label: "Remove All Breakpoints", shortcut: "Ctrl+Shift+F9", onClick: removeBreakpoints },
      ],
    },
  ];

  // Re-registered every render so the handler always sees the latest runFileAction.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F5" || e.key === "F9" || e.key === "F10") {
        e.preventDefault();
        const ctrlShift = (e.ctrlKey || e.metaKey) && e.shiftKey;
        if (e.key === "F10") step();
        else if (e.key === "F9") (ctrlShift ? removeBreakpoints : toggleBreakpoint)();
        else if (ctrlShift) {
          if (debugging) restart();
        } else if (e.shiftKey) debug.stop();
        else runOrPause();
        return;
      }
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      // "+" needs Shift on many layouts (e.g. Japanese), so "=" and "+" both zoom in, as in browsers.
      const zoom = e.key === "+" || e.key === "=" ? zoomIn : e.key === "-" ? zoomOut : e.key === "0" ? resetZoom : null;
      if (zoom) {
        e.preventDefault();
        zoom();
        return;
      }
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
        menus={menus}
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
            <Panel id="io" defaultSize="30%" minSize="10%">
              <Group orientation="horizontal" className="h-full">
                <Panel id="input" defaultSize="40%" minSize="15%">
                  <Pane title="Input">
                    <InputView />
                  </Pane>
                </Panel>
                <ResizeHandle orientation="horizontal" />
                <Panel id="output" minSize="15%">
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
