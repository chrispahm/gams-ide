const vscode = require("vscode");

function createDocumentSymbol(symbol, detail) {
  let symbolKind = vscode.SymbolKind.Variable;
  if (symbol.type === "SET") {
    symbolKind = vscode.SymbolKind.Array;
  } else if (symbol.type === "EQU") {
    symbolKind = vscode.SymbolKind.Function;
  } else if (symbol.type === "PARAM") {
    symbolKind = vscode.SymbolKind.Constant;
  } else if (symbol.type === "MODEL") {
    symbolKind = vscode.SymbolKind.Class;
  }
  const symbolRange = new vscode.Range(
    new vscode.Position(symbol.line-1, symbol.column-1),
    new vscode.Position(symbol.line-1, symbol.column)
  );
  return new vscode.DocumentSymbol(
    symbol.name,
    detail,
    symbolKind,
    symbolRange,
    symbolRange
  );
}

// Implements "go to document symbols"
module.exports = function gmsDocumentSymbolsProvider(document, state) {
  const referenceTree = state.get("referenceTree");
  const symbolsInFile = referenceTree.reduce((acc, symbol) => {
    // check if the smybol is declared, defined, references or assigned
    // in this file
    if (!symbol || !symbol.name) return acc;
    const { declared, defined, ref, assigned } = symbol;
    if (declared?.file === document.fileName) {
      // add to symbols
      acc.push(createDocumentSymbol(symbol, "declared"));
    }
    if (defined?.file === document.fileName) {
      // add to symbols
      acc.push(createDocumentSymbol(symbol, "defined"));
    }
    ref?.forEach((ref) => {
      if (ref.file === document.fileName) {
        // add to symbols
        acc.push(createDocumentSymbol(symbol, "referenced"));
      }
    });
    assigned?.forEach((ref) => {
      if (ref.file === document.fileName) {
        // add to symbols
        acc.push(createDocumentSymbol(symbol, "assigned"));
      }
    });

    return acc;
  }, []);
  return symbolsInFile;
};