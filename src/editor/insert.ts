import type { EditorView } from "@codemirror/view";
import { type InstructionDef, type Token, tokensToSource } from "../whitespace/instructions";

export function insertInstruction(view: EditorView, instruction: InstructionDef, paramTokens: readonly Token[] = []) {
  const source = tokensToSource([...instruction.tokens, ...paramTokens]);
  view.dispatch(view.state.replaceSelection(source), {
    scrollIntoView: true,
    userEvent: "input",
  });
  view.focus();
}
