const vscode = require("vscode");

module.exports = function gmsHoverProvider(document, position, state) {
  // get the word at the current position
  const wordRange = document.getWordRangeAtPosition(position);
  const word = document.getText(wordRange);
  const referenceTree = state.get("referenceTree");
  let matchingRef = referenceTree?.find(
    (item) => item.name?.toLowerCase() === word?.toLowerCase()
  );

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