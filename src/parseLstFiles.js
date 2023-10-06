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
  const isContentChangedExternally = contentChanges.length;
  if (path.extname(document.fileName).toLowerCase() === ".lst" && !document.isDirty && isOpen) {
    // parse the listing file
    const ast = await lstParser(document.fileName)
    state.update("lstTree", ast);
    // check if the active document is a listing file
    const isListing = vscode.window.activeTextEditor && vscode.window.activeTextEditor.document.fileName.toLowerCase().endsWith('.lst');
    // send the AST to the webview
    console.log("Sending AST to webview", gamsView?.webview);
    
    gamsView?.webview?.postMessage({
      command: "updateListing",
      data: {
        isListing,
        lstTree: ast
      }
    });

    if (!isContentChangedExternally) {
      // if the listing file is not changed externally, we don't change the scroll position
      return;
    }

    // check if there are compilation errors in the listing file
    const shouldJumpToError = vscode.workspace.getConfiguration("gamsIde").get("jumpToFirstError");
    if (shouldJumpToError) {
      const firstCompilationError = ast.find(node => node.type?.startsWith("Error"));
      if (firstCompilationError) {
        // jump to the first compilation error
        const firstCompilationErrorPosition = new vscode.Position(firstCompilationError.line - 1, firstCompilationError.column[0]);
        const options = {
          selection: new vscode.Range(firstCompilationErrorPosition, firstCompilationErrorPosition),
          preview: true,
          revealType: vscode.TextEditorRevealType.InCenterIfOutsideViewport
        };
        vscode.window.showTextDocument(document, options);
        return;
      }
    }
    // if the jump to abort setting is enabled, find the abort statement in the ast
    // and jump to it
    const isJumpToAbortEnabled = vscode.workspace.getConfiguration("gamsIde").get("jumpToAbort");
    if (isJumpToAbortEnabled) {
      const abortStatement = ast.find(node => node.type === "Abort");
      if (abortStatement) {
        console.log(abortStatement);

        const abortPosition = new vscode.Position(abortStatement.line[0] - 1, abortStatement.column[0]);
        const options = {
          selection: new vscode.Range(abortPosition, abortPosition),
          preview: true,
          revealType: vscode.TextEditorRevealType.InCenterIfOutsideViewport
        };
        vscode.window.showTextDocument(document, options);
        return;
      }
    }
    // next, check if a default parameter to jump to is set
    const jumpTo = vscode.workspace.getConfiguration("gamsIde").get("defaultParameterToJumpToAfterSolve");
    if (jumpTo) {
      // find the parameter in the ast
      console.log(jumpTo, ast);

      const jumpToParameter = ast.flatMap(node => node?.entries).findLast(entry => entry?.name?.toLowerCase() === jumpTo.toLowerCase());
      if (jumpToParameter) {
        const jumpToPosition = new vscode.Position(jumpToParameter.line - 1, jumpToParameter.column);
        const options = {
          selection: new vscode.Range(jumpToPosition, jumpToPosition),
          preview: true,
          revealType: vscode.TextEditorRevealType.InCenterIfOutsideViewport
        };
        vscode.window.showTextDocument(document, options);
        return;
      }
    }
    
    // Get the end position of the document
    const endPosition = document.lineAt(document.lineCount - 1).range.end;
    const autoScroll = vscode.workspace.getConfiguration("gamsIde").get("autoScrollToEndOfListing");
    if (autoScroll) {
      // Default: jump to the end of the document
      // Show the document in the editor and scroll to the end position
      const options = {
        selection: new vscode.Range(endPosition, endPosition),
        preview: true,
        revealType: vscode.TextEditorRevealType.InCenterIfOutsideViewport
      };
      vscode.window.showTextDocument(document, options);
    }
  }
}

const debouncedListenToLstFiles = debounce(listenToLstFiles, 300);

module.exports = debouncedListenToLstFiles;