import { create } from "zustand";

type AppState = {
  /** `null` while the document has never been saved. */
  filePath: string | null;
  isDirty: boolean;
};

export const useAppStore = create<AppState>(() => ({
  filePath: null,
  isDirty: false,
}));

export const fileNameOf = (path: string | null) => path?.split(/[\\/]/).pop() ?? "Untitled";
