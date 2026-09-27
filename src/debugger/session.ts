import type { EditorView } from "@codemirror/view";
import { breakpointLines } from "../editor/breakpoints";
import { setReadOnly, showHighlight } from "../editor/debugHighlight";
import { type DiagnosticMessage, useAppStore } from "../store";
import { parse, type SourceRange } from "../whitespace/parser";
import { VM } from "../whitespace/vm";
import { instructionsAtLines } from "./breakpointMapping";

/** Instructions per batch while running; the UI is updated between batches. */
const RUN_BATCH_SIZE = 10_000;

type Session = { vm: VM; view: EditorView; running: boolean; timer?: ReturnType<typeof setTimeout> };

let session: Session | null = null;

const toDiagnostic = (view: EditorView, { from, to }: SourceRange, message: string): DiagnosticMessage => {
  const line = view.state.doc.lineAt(from);
  return { from, to, line: line.number, column: from - line.from + 1, message };
};

/** Read on every batch, so breakpoints toggled during a session take effect immediately. */
const breakpointsOf = (s: Session) => instructionsAtLines(s.vm.program.instructions, breakpointLines(s.view.state));

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

  const vm = new VM(program);
  const { presetInput } = useAppStore.getState();
  if (presetInput) {
    // Preset input is all the program gets; after EOF the VM also accepts an unterminated last line.
    vm.provideInput(presetInput);
    vm.closeInput();
  }
  session = { vm, view, running: false };
  setReadOnly(view, true);
  useAppStore.setState({ diagnostics: [], interactiveInputSent: presetInput ? null : 0 });
  return session;
}

function end(s: Session) {
  clearTimeout(s.timer);
  setReadOnly(s.view, false);
  session = null;
  useAppStore.setState({ interactiveInputSent: null });
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
  const { reason } = s.vm.run({ maxSteps: RUN_BATCH_SIZE, breakpoints: breakpointsOf(s) });
  if (reason === "breakpoint") s.running = false;
  publish(s);
  if (session === s && s.running && s.vm.status === "ready") {
    s.timer = setTimeout(() => runBatch(s), 0);
  }
}

/** Runs until the program stops, waits for input or reaches a breakpoint; starts a session if needed. */
export function run(view: EditorView) {
  const isNew = !session;
  const s = session ?? start(view);
  if (!s || s.running) return;
  // VM.run always executes the current instruction, so a breakpoint on the very first one is checked here.
  if (isNew && breakpointsOf(s).has(s.vm.pc)) {
    publish(s);
    return;
  }
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

/**
 * Applies an edit to the Input panel's text. Outside a session the text is free to change; a preset session
 * has already consumed it, so edits are ignored. In an interactive session, text already sent is locked and
 * every newly completed line is sent to the program.
 */
export function editInput(text: string) {
  const { presetInput, interactiveInputSent: sent } = useAppStore.getState();
  if (sent === null) {
    if (!session) useAppStore.setState({ presetInput: text });
    return;
  }
  if (!text.startsWith(presetInput.slice(0, sent))) return;
  const complete = Math.max(sent, text.lastIndexOf("\n") + 1);
  useAppStore.setState({ presetInput: text, interactiveInputSent: complete });
  if (complete > sent && session) {
    session.vm.provideInput(text.slice(sent, complete));
    resume(session);
  }
}

/** Ends an interactive session's input, sending any unfinished last line first. */
export function sendEof() {
  const { presetInput, interactiveInputSent: sent } = useAppStore.getState();
  if (sent === null || !session) return;
  useAppStore.setState({ interactiveInputSent: presetInput.length });
  if (sent < presetInput.length) session.vm.provideInput(presetInput.slice(sent));
  session.vm.closeInput();
  resume(session);
}

function resume(s: Session) {
  if (s.running) runBatch(s);
  else publish(s);
}
