import { create } from "zustand";
import type { VMSnapshot } from "./whitespace/vm";

/**
 * `paused`, `running` and `waitingForInput` mean a session is active and the editor is read-only.
 * The other states keep showing the last snapshot, if any.
 */
export type DebugStatus = "idle" | "paused" | "running" | "waitingForInput" | "halted" | "error" | "stopped";

export type DiagnosticMessage = { from: number; to: number; line: number; column: number; message: string };

type AppState = {
  /** `null` while the document has never been saved. */
  filePath: string | null;
  isDirty: boolean;

  debugStatus: DebugStatus;
  snapshot: VMSnapshot | null;
  /** Parse errors or the runtime error of the last session. */
  diagnostics: DiagnosticMessage[];
};

export const useAppStore = create<AppState>(() => ({
  filePath: null,
  isDirty: false,

  debugStatus: "idle",
  snapshot: null,
  diagnostics: [],
}));

export const isSessionActive = (status: DebugStatus) =>
  status === "paused" || status === "running" || status === "waitingForInput";

export const fileNameOf = (path: string | null) => path?.split(/[\\/]/).pop() ?? "Untitled";
