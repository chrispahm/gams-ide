const vscode = require("vscode");

// Implements "go to references"
export default function gmsReferenceProvider(document, position, state) {
  // get the word at the current position
  const wordRange = document.getWordRangeAtPosition(position);
  const word = document.getText(wordRange);
  const referenceTree = state.get("referenceTree");
  let matchingRef = referenceTree?.find(
    (item) => item.name?.toLowerCase() === word?.toLowerCase()
  );

  if (matchingRef && matchingRef.ref) {
    return matchingRef.ref.map((ref) => {
      const { file, line, column } = ref;
      const uri = vscode.Uri.file(file);
      return new vscode.Location(uri, new vscode.Position(line-1, column-1));
    });
  }
};