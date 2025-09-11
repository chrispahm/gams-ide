import * as vscode from "vscode";
import State from "../State";
import { ReferenceSymbol, GamsLineAst } from "../types/gams-symbols";
import gamsParser from '../utils/gamsParser.js';

export default function provideGAMSSignatureHelp(
  document: vscode.TextDocument,
  position: vscode.Position,
  state: State
) {
  const referenceTree = state.get<ReferenceSymbol[]>("referenceTree") || [];
  let ast: GamsLineAst = [];
  try {
    ast = gamsParser.parse(document.lineAt(position.line).text) as GamsLineAst;
  } catch {
    // ignore parse errors while typing
  }
  const signatureHelp = new vscode.SignatureHelp();
  if (ast && ast.length) {
    const gamsSymbol = ast.find(entry => entry.start <= position.character + 1 && entry.end >= position.character);
    if (gamsSymbol && typeof (gamsSymbol as any).functionName === "string") {
      const fnName = String((gamsSymbol as any).functionName).toLowerCase();
      const functionRef = referenceTree.find(entry => entry.nameLo === fnName);
      if (functionRef && functionRef.domain && functionRef.domain[(gamsSymbol as any).index]) {
        const gIndex = (gamsSymbol as any).index as number;
        const label = functionRef.name + "(" + functionRef.domain.map(d => d.name).join(", ") + ")";
        const signatureInformation = new vscode.SignatureInformation(label, functionRef.description);
        signatureInformation.parameters = functionRef.domain.map(d => ({ label: d.name, documentation: d.description }));
        signatureInformation.activeParameter = gIndex;
        signatureHelp.signatures = [signatureInformation];
        return signatureHelp;
      }
    }
  }
  return signatureHelp;
};