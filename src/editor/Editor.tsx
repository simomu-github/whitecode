import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { type RefObject, useEffect, useRef } from "react";
import { editorExtensions } from "./extensions";

type EditorProps = {
  viewRef: RefObject<EditorView | null>;
};

export function Editor({ viewRef }: EditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const view = new EditorView({
      state: EditorState.create({ extensions: editorExtensions }),
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
