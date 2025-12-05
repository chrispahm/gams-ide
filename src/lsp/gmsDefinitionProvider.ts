import * as vscode from "vscode";
import State from "../State";
import { ReferenceSymbol } from "../types/gams-symbols";
import { isPositionInEmbeddedPython } from './embeddedPython';

export default function gmsDefinitionProvider(
  document: vscode.TextDocument,
  position: vscode.Position,
  state: State
): vscode.Location | null {
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

  if (matchingRef?.defined?.file) {
    const { file, line, column } = matchingRef.defined;
    const uri = vscode.Uri.file(file);
    return new vscode.Location(uri, new vscode.Position((line || 1)-1, (column || 1)-1));
  }
  return null;
};