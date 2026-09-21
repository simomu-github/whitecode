import type { EditorView } from "@codemirror/view";
import { setReadOnly, showHighlight } from "../editor/debugHighlight";
import { type DiagnosticMessage, useAppStore } from "../store";
import { parse, type SourceRange } from "../whitespace/parser";
import { VM } from "../whitespace/vm";

/** Instructions per batch while running; the UI is updated between batches. */
const RUN_BATCH_SIZE = 10_000;

type Session = { vm: VM; view: EditorView; running: boolean; timer?: ReturnType<typeof setTimeout> };

let session: Session | null = null;

const toDiagnostic = (view: EditorView, { from, to }: SourceRange, message: string): DiagnosticMessage => {
  const line = view.state.doc.lineAt(from);
  return { from, to, line: line.number, column: from - line.from + 1, message };
};

function start(view: EditorView): Session | null {
  const program = parse(view.state.doc.toString());
  if (program.errors.length > 0) {
    useAppStore.setState({
      debugStatus: "error",
      snapshot: null,
      diagnostics: program.errors.map((e) => toDiagnostic(view, e, e.message)),
    });
    showHighlight(view, { ...program.errors[0], kind: "error" });
    return null;
  }

  session = { vm: new VM(program), view, running: false };
  setReadOnly(view, true);
  useAppStore.setState({ diagnostics: [] });
  return session;
}

function end(s: Session) {
  clearTimeout(s.timer);
  setReadOnly(s.view, false);
  session = null;
}

/** Pushes the VM state to the store and the editor, ending the session if the program stopped. */
function publish(s: Session) {
  const { vm, view } = s;
  const snapshot = vm.snapshot();

  if (vm.status === "halted" || vm.status === "error") {
    end(s);
    const failed = vm.error && vm.program.instructions[vm.error.instructionIndex];
    useAppStore.setState({
      debugStatus: vm.status,
      snapshot,
      diagnostics: vm.error && failed ? [toDiagnostic(view, failed, vm.error.message)] : [],
    });
    showHighlight(view, failed ? { from: failed.from, to: failed.to, kind: "error" } : null);
    return;
  }

  const debugStatus = vm.status === "waitingForInput" ? "waitingForInput" : s.running ? "running" : "paused";
  useAppStore.setState({ debugStatus, snapshot });
  const current = vm.currentInstruction;
  showHighlight(view, current ? { from: current.from, to: current.to, kind: "current" } : null);
}

function runBatch(s: Session) {
  s.vm.run({ maxSteps: RUN_BATCH_SIZE });
  publish(s);
  if (session === s && s.running && s.vm.status === "ready") {
    s.timer = setTimeout(() => runBatch(s), 0);
  }
}

/** Runs until the program stops or waits for input; starts a session if needed. */
export function run(view: EditorView) {
  const s = session ?? start(view);
  if (!s || s.running) return;
  s.running = true;
  runBatch(s);
}

/** Executes one instruction. The first step of a new session only stops before the first instruction. */
export function step(view: EditorView) {
  if (session) {
    if (session.running) return;
    session.vm.step();
    publish(session);
    return;
  }
  const s = start(view);
  if (s) publish(s);
}

export function pause() {
  if (!session?.running) return;
  clearTimeout(session.timer);
  session.running = false;
  publish(session);
}

export function stop() {
  if (!session) return;
  const s = session;
  end(s);
  useAppStore.setState({ debugStatus: "stopped", snapshot: s.vm.snapshot() });
  showHighlight(s.view, null);
}

export function provideInput(text: string) {
  if (!session) return;
  session.vm.provideInput(text);
  resume(session);
}

export function closeInput() {
  if (!session) return;
  session.vm.closeInput();
  resume(session);
}

function resume(s: Session) {
  if (s.running) runBatch(s);
  else publish(s);
}
