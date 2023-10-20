const vscode = require("vscode");

module.exports = function gmsHoverProvider(document, position, state) {
  // get the word at the current position
  const wordRange = document.getWordRangeAtPosition(position);
  const word = document.getText(wordRange);
  const characterBeforeWord = wordRange.start.character ? document.getText(
    new vscode.Range(
      new vscode.Position(wordRange.start.line, wordRange.start.character - 1),
      new vscode.Position(wordRange.start.line, wordRange.start.character)
    )
  ) : "";
  const referenceTree = state.get("referenceTree");
  const compileTimeVariables = state.get("compileTimeVariables");
  let matchingRef;
  if (characterBeforeWord === "%") {
    matchingRef = compileTimeVariables?.find(
      (item) => item.name?.toLowerCase() === word?.toLowerCase()
    );
  } else {
    // frist try to find the reference tree
    matchingRef = referenceTree?.find(
      (item) => item.name?.toLowerCase() === word?.toLowerCase()
    );
    // if we can't find it there, we also check the compile time variables
    if (!matchingRef) {
      matchingRef = compileTimeVariables?.find(
        (item) => item.name?.toLowerCase() === word?.toLowerCase()
      );
    }
  }

  if (matchingRef) {
    let hoverContent = new vscode.MarkdownString(`(${matchingRef.type.toLowerCase()}) **${matchingRef.name}**${matchingRef.description ? "\n\n" + matchingRef.description : ""}`);
    if (matchingRef.domain) {
      hoverContent = new vscode.MarkdownString(`(${matchingRef.type.toLowerCase()}) **${matchingRef.name}**(${matchingRef.domain.map(d => d.name).join(", ")})${matchingRef.description ? "\n\n" + matchingRef.description : ""}`);
    }
    return new vscode.Hover(
      hoverContent,
      wordRange
    );
  }
};