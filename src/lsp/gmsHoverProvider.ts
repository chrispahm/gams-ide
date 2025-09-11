import * as vscode from "vscode";
import State from "../State";
import { ReferenceSymbol, CompileTimeVariable } from "../types/gams-symbols";

export default function gmsHoverProvider(
  document: vscode.TextDocument,
  position: vscode.Position,
  state: State
): vscode.Hover | null {
  // get the word at the current position
  const wordRange = document.getWordRangeAtPosition(position);
  if (!wordRange) { return null; } // nothing to hover
  const word = document.getText(wordRange);
  const characterBeforeWord = wordRange.start.character > 0 ? document.getText(
    new vscode.Range(
      new vscode.Position(wordRange.start.line, wordRange.start.character - 1),
      new vscode.Position(wordRange.start.line, wordRange.start.character)
    )
  ) : "";
  const referenceTree = state.get<ReferenceSymbol[]>("referenceTree") || [];
  const compileTimeVariables = state.get<CompileTimeVariable[]>("compileTimeVariables") || [];
  let matchingRef: (ReferenceSymbol | CompileTimeVariable) | undefined;
  if (characterBeforeWord === "%") {
    matchingRef = compileTimeVariables.find(
      (item) => item.name?.toLowerCase() === word?.toLowerCase()
    );
  } else {
    // first try to find the reference tree
    matchingRef = referenceTree.find(
      (item) => item.name?.toLowerCase() === word?.toLowerCase()
    );
    // if we can't find it there, we also check the compile time variables
    if (!matchingRef) {
      matchingRef = compileTimeVariables.find(
        (item) => item.name?.toLowerCase() === word?.toLowerCase()
      );
    }
  }

  if (matchingRef) {
    const typeLabel = (matchingRef as ReferenceSymbol).type ? (matchingRef as ReferenceSymbol).type!.toLowerCase() : "var";
    let hoverContent = new vscode.MarkdownString(`(${typeLabel}) **${matchingRef.name}**${matchingRef.description ? "\n\n" + matchingRef.description : ""}`);
    if ((matchingRef as ReferenceSymbol).domain) {
      const dom = (matchingRef as ReferenceSymbol).domain as ReferenceSymbol[];
      hoverContent = new vscode.MarkdownString(`(${typeLabel}) **${matchingRef.name}**(${dom.map(d => d.name).join(", ")})${matchingRef.description ? "\n\n" + matchingRef.description : ""}`);
    }
    return new vscode.Hover(
      hoverContent,
      wordRange
    );
  }
  return null;
};