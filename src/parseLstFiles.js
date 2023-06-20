const vscode = require("vscode");
const path = require("path");
const { debounce } = require("lodash");
const lstParser = require("./lstParser");

async function listenToLstFiles(args) {
  const {
    document,
    contentChanges,
    gamsView,
    state
  } = args;
  // Check if the document is a listing file
  // and if the document was changed externally (!document.isDirty)
  // and if the document is open in any of the visible editors
  // and only if the contentChanges array is not empty
  const isOpen = vscode.window.visibleTextEditors.some(editor => editor.document === document);
  const isContentChanged = contentChanges.length;
  if (path.extname(document.fileName) === ".lst" && !document.isDirty && isOpen && isContentChanged) {
    // parse the listing file
    const ast = await lstParser(document.fileName)
    state.update("lstTree", ast);
    // check if the active document is a listing file
    const isListing = vscode.window.activeTextEditor && vscode.window.activeTextEditor.document.fileName.toLowerCase().endsWith('.lst');
    // send the AST to the webview
    gamsView?.webview?.postMessage({
      command: "updateListing",
      data: {
        isListing,
        lstTree: ast
      }
    });
    
    // Get the end position of the document
    const endPosition = document.lineAt(document.lineCount - 1).range.end;

    // Show the document in the editor and scroll to the end position
    const options = {
      selection: new vscode.Range(endPosition, endPosition),
      preview: true,
      revealType: vscode.TextEditorRevealType.InCenterIfOutsideViewport
    };
    vscode.window.showTextDocument(document, options);
  }
}

const debouncedListenToLstFiles = debounce(listenToLstFiles, 300);

module.exports = debouncedListenToLstFiles;