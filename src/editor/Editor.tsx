import { Compartment, EditorState, type Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { type RefObject, useEffect, useRef } from "react";
import { useAppStore } from "../store";
import { useViewSettings, type ViewSettings } from "../viewSettings";
import { editorExtensions } from "./extensions";
import { impColorsEnabled } from "./impHighlight";

const dirtyTracker = EditorView.updateListener.of((update) => {
  if (update.docChanged && !useAppStore.getState().isDirty) {
    useAppStore.setState({ isDirty: true });
  }
});

// CodeMirror rewrites the root element's class and style attributes itself (e.g. on focus changes),
// so the View settings live in the editor state (a compartment) rather than being applied to the DOM directly.
const viewSettings = new Compartment();

// The font size goes in a theme rather than an inline style: CodeMirror re-measures line heights when the
// theme changes, but not when only an attribute does. Without that, a short document (whose content element
// keeps its min-height) left the line numbers at the old line height after zooming.
const fontSizeThemes = new Map<number, Extension>();
const fontSizeTheme = (size: number) => {
  let theme = fontSizeThemes.get(size);
  if (!theme) {
    theme = EditorView.theme({ ".cm-scroller": { fontSize: `${size}px` } });
    fontSizeThemes.set(size, theme);
  }
  return theme;
};

const viewSettingsExtension = ({ impColors, whitespaceSymbols, editorFontSize }: ViewSettings) => [
  impColorsEnabled.of(impColors),
  EditorView.editorAttributes.of({ class: whitespaceSymbols ? "" : "cm-hideWhitespace" }),
  fontSizeTheme(editorFontSize),
];

const createState = (doc: string) =>
  EditorState.create({
    doc,
    extensions: [editorExtensions, dirtyTracker, viewSettings.of(viewSettingsExtension(useViewSettings.getState()))],
  });

/** Replaces the whole state so that undo history does not carry over between files. */
export function resetDocument(view: EditorView, doc: string) {
  view.setState(createState(doc));
  view.focus();
}

type EditorProps = {
  viewRef: RefObject<EditorView | null>;
};

export function Editor({ viewRef }: EditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const parent = containerRef.current;
    if (!parent) return;
    const view = new EditorView({ state: createState(""), parent });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [viewRef]);

  const settings = useViewSettings();
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({ effects: viewSettings.reconfigure(viewSettingsExtension(settings)) });
  }, [viewRef, settings]);

  return <div ref={containerRef} className="h-full" />;
}
