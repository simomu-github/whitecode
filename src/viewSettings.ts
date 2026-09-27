import { create } from "zustand";
import { persist } from "zustand/middleware";

export const DEFAULT_EDITOR_FONT_SIZE = 14;
export const MIN_EDITOR_FONT_SIZE = 8;
export const MAX_EDITOR_FONT_SIZE = 32;
const ZOOM_STEP = 2;

export type ViewSettings = {
  /** Background colors per IMP category. */
  impColors: boolean;
  /** The ·, → and ↵ markers for space, tab and line feed. */
  whitespaceSymbols: boolean;
  editorFontSize: number;
};

/** Survives restarts through the webview's localStorage. */
export const useViewSettings = create<ViewSettings>()(
  persist<ViewSettings>(
    () => ({
      impColors: true,
      whitespaceSymbols: true,
      editorFontSize: DEFAULT_EDITOR_FONT_SIZE,
    }),
    { name: "whitecode.viewSettings" },
  ),
);

const setFontSize = (size: number) =>
  useViewSettings.setState({
    editorFontSize: Math.min(MAX_EDITOR_FONT_SIZE, Math.max(MIN_EDITOR_FONT_SIZE, size)),
  });

export const zoomIn = () => setFontSize(useViewSettings.getState().editorFontSize + ZOOM_STEP);
export const zoomOut = () => setFontSize(useViewSettings.getState().editorFontSize - ZOOM_STEP);
export const resetZoom = () => setFontSize(DEFAULT_EDITOR_FONT_SIZE);
