import { Group, Panel } from "react-resizable-panels";
import { InstructionPalette } from "./components/InstructionPalette";
import { Pane, PanePlaceholder } from "./components/Pane";
import { ResizeHandle } from "./components/ResizeHandle";
import { Toolbar } from "./components/Toolbar";

function App() {
  return (
    <div className="flex h-full flex-col">
      <Toolbar />

      <Group orientation="horizontal" className="min-h-0 flex-1">
        <Panel id="instructions" defaultSize="20%" minSize="12%">
          <Pane title="Instructions">
            <InstructionPalette />
          </Pane>
        </Panel>

        <ResizeHandle orientation="horizontal" />

        <Panel id="main" minSize="30%">
          <Group orientation="vertical" className="h-full">
            <Panel id="editor" minSize="20%">
              <Pane title="Editor">
                <PanePlaceholder>Editor is not available yet.</PanePlaceholder>
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
    </div>
  );
}

export default App;
