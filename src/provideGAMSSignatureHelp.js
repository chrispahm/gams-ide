const vscode = require("vscode");
const gamsParser = require('./utils/gamsParser.js');

module.exports = function provideGAMSSignatureHelp(document, position, state) {
  const referenceTree = state.get("referenceTree");
  let ast = [];
  try {
    ast = gamsParser.parse(document.lineAt(position.line).text);
  } catch (error) {
    console.error("Error parsing line: ", error);
  }
  const signatureHelp = new vscode.SignatureHelp();
  if (ast) {
    // check if the cursor is in a symbol
    const gamsSymbol = ast.find(
      (entry) =>
        entry.start <= position.character + 1 &&
        entry.end >= position.character
    );

    if (gamsSymbol) {
      // we are in a symbol, now find the surrounding function
      const functionRef = referenceTree.find(
        (entry) => entry.nameLo === gamsSymbol.functionName.toLowerCase()
      );
      if (functionRef && functionRef.domain && functionRef.domain[gamsSymbol.index]) {
        const label = functionRef.name + "(" + functionRef.domain.map(d => d.name).join(", ") + ")";
        const signatureInformation = new vscode.SignatureInformation(label, functionRef.description);
        signatureInformation.parameters = functionRef.domain.map(d => ({label: d.name, documentation: d.description}));
        signatureInformation.activeParameter = gamsSymbol.index;

        signatureHelp.signatures = [signatureInformation];
        return signatureHelp;
      }
    }
  }
  return signatureHelp;
};