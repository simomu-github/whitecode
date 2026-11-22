import type { Program, SourceRange } from "../whitespace/parser";

export type CallFrame = {
  /** Label of the subroutine the frame is executing; `null` for the outermost (main) frame. */
  label: string | null;
  /**
   * Where the frame is executing: the current instruction for the innermost frame, the pending `call` for
   * the others. `null` when execution has run past the last instruction.
   */
  at: SourceRange | null;
};

/**
 * Rebuilds the call frames, innermost first, from the VM's return addresses. Each return address is the
 * index after the `call` that pushed it, so that `call` names the subroutine and is where its caller waits.
 * Only the innermost `limit` frames are built, so deep recursion stays cheap to display.
 */
export function callFrames(
  program: Program,
  pc: number,
  callStack: readonly number[],
  limit = Number.POSITIVE_INFINITY,
): CallFrame[] {
  const callAt = (returnTo: number) => program.instructions[returnTo - 1];
  const frames: CallFrame[] = [];
  let at: SourceRange | null = program.instructions[pc] ?? null;
  for (let i = callStack.length - 1; i >= -1 && frames.length < limit; i--) {
    const call = i >= 0 ? callAt(callStack[i]) : undefined;
    frames.push({ label: call?.label ?? null, at: at && { from: at.from, to: at.to } });
    at = call ?? null;
  }
  return frames;
}
