import type { EditorView } from "@codemirror/view";
import { useRef, useState } from "react";
import { Group, Panel } from "react-resizable-panels";
import { InstructionPalette } from "./components/InstructionPalette";
import { Pane, PanePlaceholder } from "./components/Pane";
import { ParamDialog } from "./components/ParamDialog";
import { ResizeHandle } from "./components/ResizeHandle";
import { Toolbar } from "./components/Toolbar";
import { Editor } from "./editor/Editor";
import { insertInstruction } from "./editor/insert";
import { type ParameterizedInstruction, hasParam } from "./whitespace/instructions";

function App() {
  const editorViewRef = useRef<EditorView | null>(null);
  const [pendingInstruction, setPendingInstruction] = useState<ParameterizedInstruction | null>(null);

  return (
    <div className="flex h-full flex-col">
      <Toolbar />

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

      <footer className="flex h-6 shrink-0 items-center bg-accent px-3 text-xs text-white">
        Ready
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
