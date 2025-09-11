import * as vscode from 'vscode';
import State from '../State';
import { ReferenceTree, ReferenceSymbol, SymbolActionLocation } from '../types/gams-symbols';

function createDocumentSymbol(symbol: ReferenceSymbol, detail: string): vscode.DocumentSymbol {
  let symbolKind = vscode.SymbolKind.Variable;
  switch (symbol.type) {
    case 'SET':
      symbolKind = vscode.SymbolKind.Array; break;
    case 'EQU':
      symbolKind = vscode.SymbolKind.Function; break;
    case 'PARAM':
      symbolKind = vscode.SymbolKind.Constant; break;
    case 'MODEL':
      symbolKind = vscode.SymbolKind.Class; break;
  }
  const line = (symbol.line as number) || symbol.declared?.line || symbol.defined?.line || 1;
  const column = (symbol.column as number) || symbol.declared?.column || symbol.defined?.column || 1;
  const symbolRange = new vscode.Range(new vscode.Position(line - 1, Math.max(0, column - 1)), new vscode.Position(line - 1, Math.max(0, column)));
  return new vscode.DocumentSymbol(symbol.name, detail, symbolKind, symbolRange, symbolRange);
}

// Implements "go to document symbols"
export default function gmsDocumentSymbolsProvider(document: vscode.TextDocument, state: State): vscode.DocumentSymbol[] {
  const referenceTree = state.get<ReferenceTree>('referenceTree') || [];
  const symbolsInFile = referenceTree.reduce<vscode.DocumentSymbol[]>((acc, symbol) => {
    if (!symbol || !symbol.name) {
      return acc;
    }
    const { declared, defined, ref, assigned } = symbol as ReferenceSymbol & { ref?: SymbolActionLocation[]; assigned?: SymbolActionLocation[] };
    if (declared?.file === document.fileName) {
      acc.push(createDocumentSymbol(symbol, 'declared'));
    }
    if (defined?.file === document.fileName) {
      acc.push(createDocumentSymbol(symbol, 'defined'));
    }
    ref?.forEach(r => {
      if (r.file === document.fileName) {
        acc.push(createDocumentSymbol(symbol, 'referenced'));
      }
    });
    assigned?.forEach(r => {
      if (r.file === document.fileName) {
        acc.push(createDocumentSymbol(symbol, 'assigned'));
      }
    });
    return acc;
  }, []);
  return symbolsInFile;
}