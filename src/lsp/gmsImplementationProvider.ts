import * as vscode from "vscode";
import State from "../State";
import { ReferenceSymbol } from "../types/gams-symbols";
import { isPositionInEmbeddedPython } from './embeddedPython';

// Implements "go to implementations"
export default function gmsImplementationProvider(
  document: vscode.TextDocument,
  position: vscode.Position,
  state: State
): vscode.Location[] | null {
  // Skip if inside embedded Python code
  if (isPositionInEmbeddedPython(document, position)) {
    return null;
  }
  // get the word at the current position
  const wordRange = document.getWordRangeAtPosition(position);
  if (!wordRange) { return null; }
  const word = document.getText(wordRange);
  const referenceTree = state.get<ReferenceSymbol[]>("referenceTree") || [];
  const matchingRef = referenceTree.find(
    (item) => item.name?.toLowerCase() === word?.toLowerCase()
  );

  if (matchingRef?.assigned) {
    return matchingRef.assigned.filter(r => !!r.file).map((ref) => {
      const { file, line, column } = ref;
      const uri = vscode.Uri.file(file!);
      return new vscode.Location(uri, new vscode.Position((line || 1)-1, (column || 1)-1));
    });
  }
  return null;
};