import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { type RefObject, useEffect, useRef } from "react";
import { useAppStore } from "../store";
import { editorExtensions } from "./extensions";

const dirtyTracker = EditorView.updateListener.of((update) => {
  if (update.docChanged && !useAppStore.getState().isDirty) {
    useAppStore.setState({ isDirty: true });
  }
});

const createState = (doc: string) =>
  EditorState.create({ doc, extensions: [editorExtensions, dirtyTracker] });

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
    const view = new EditorView({
      state: createState(""),
      parent: containerRef.current!,
    });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [viewRef]);

  return <div ref={containerRef} className="h-full" />;
}
