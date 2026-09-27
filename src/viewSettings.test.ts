// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_EDITOR_FONT_SIZE,
  MAX_EDITOR_FONT_SIZE,
  MIN_EDITOR_FONT_SIZE,
  resetZoom,
  useViewSettings,
  zoomIn,
  zoomOut,
} from "./viewSettings";

const fontSize = () => useViewSettings.getState().editorFontSize;

beforeEach(resetZoom);

describe("editor zoom", () => {
  it("steps the font size and resets it", () => {
    zoomIn();
    expect(fontSize()).toBeGreaterThan(DEFAULT_EDITOR_FONT_SIZE);
    resetZoom();
    zoomOut();
    expect(fontSize()).toBeLessThan(DEFAULT_EDITOR_FONT_SIZE);
    resetZoom();
    expect(fontSize()).toBe(DEFAULT_EDITOR_FONT_SIZE);
  });

  it("stays within the limits", () => {
    for (let i = 0; i < 50; i++) zoomIn();
    expect(fontSize()).toBe(MAX_EDITOR_FONT_SIZE);
    for (let i = 0; i < 50; i++) zoomOut();
    expect(fontSize()).toBe(MIN_EDITOR_FONT_SIZE);
  });

  it("persists across restarts", () => {
    zoomIn();
    expect(JSON.parse(localStorage.getItem("whitecode.viewSettings") ?? "{}").state.editorFontSize).toBe(fontSize());
  });
});
