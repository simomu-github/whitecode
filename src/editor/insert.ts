import type { EditorView } from "@codemirror/view";
import { type InstructionDef, tokensToSource } from "../whitespace/instructions";

/** Arguments are not encoded yet; the caret is left where the argument should be typed. */
export function insertInstruction(view: EditorView, instruction: InstructionDef) {
  view.dispatch(view.state.replaceSelection(tokensToSource(instruction.tokens)), {
    scrollIntoView: true,
    userEvent: "input",
  });
  view.focus();
}
