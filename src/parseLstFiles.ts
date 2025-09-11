import * as vscode from 'vscode';
import * as path from 'path';
import { debounce } from 'lodash';
import lstParser from './lstParser';
import State from './State';
import { LstEntry } from './types/gams-symbols';

interface ListenArgs {
  document: vscode.TextDocument;
  contentChanges: readonly vscode.TextDocumentContentChangeEvent[];
  gamsView?: vscode.WebviewView;
  state: State;
}

async function listenToLstFiles(args: ListenArgs): Promise<void> {
  const { document, contentChanges, gamsView, state } = args;
  // Check if the document is a listing file
  // and if the document was changed externally (!document.isDirty)
  // and if the document is open in any of the visible editors
  // and only if the contentChanges array is not empty
  const isOpen = vscode.window.visibleTextEditors.some(editor => editor.document === document);
  const isContentChangedExternally = contentChanges.length;
  if (path.extname(document.fileName).toLowerCase() === ".lst" && !document.isDirty && isOpen) {
    // parse the listing file
  const ast: LstEntry[] = await lstParser(document.fileName);
  state.update('lstTree', ast);
    // check if the active document is a listing file
  const isListing = !!(vscode.window.activeTextEditor && vscode.window.activeTextEditor.document.fileName.toLowerCase().endsWith('.lst'));
    // send the AST to the webview    
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
      const firstCompilationError = ast.find(node => typeof node.type === 'string' && (node.type as string).startsWith('Error'));
      if (firstCompilationError && typeof firstCompilationError.line === 'number' && (Array.isArray(firstCompilationError.column) || typeof firstCompilationError.column === 'number')) {
        const lineNo = typeof firstCompilationError.line === 'number' ? firstCompilationError.line : (firstCompilationError.line as number[])[0];
        const colValRaw = firstCompilationError.column;
        const colVal = Array.isArray(colValRaw) ? colValRaw[0] : colValRaw ?? 0;
        const firstCompilationErrorPosition = new vscode.Position(Math.max(0, lineNo - 1), Math.max(0, colVal));
  const options: vscode.TextDocumentShowOptions = { selection: new vscode.Range(firstCompilationErrorPosition, firstCompilationErrorPosition), preview: true };
        await vscode.window.showTextDocument(document, options);
        return;
      }
    }
    // if the jump to abort setting is enabled, find the abort statement in the ast
    // and jump to it
    const isJumpToAbortEnabled = vscode.workspace.getConfiguration("gamsIde").get("jumpToAbort");
    if (isJumpToAbortEnabled) {
      const abortStatement = ast.find(node => node.type === 'Abort');
      if (abortStatement && Array.isArray(abortStatement.line) && Array.isArray(abortStatement.column)) {
        const lineNo = abortStatement.line[0];
        const colNo = abortStatement.column[0];
        const abortPosition = new vscode.Position(Math.max(0, lineNo - 1), Math.max(0, colNo));
  const options: vscode.TextDocumentShowOptions = { selection: new vscode.Range(abortPosition, abortPosition), preview: true };
        await vscode.window.showTextDocument(document, options);
        return;
      }
    }
    // next, check if a default parameter to jump to is set
    const jumpTo = vscode.workspace.getConfiguration("gamsIde").get("defaultParameterToJumpToAfterSolve");
    if (jumpTo) {
      const lower = (jumpTo as string).toLowerCase();
      const entries = ast.flatMap(node => node?.entries || []);
      // emulate findLast
      let jumpToParameter: any = undefined;
      for (let i = entries.length - 1; i >= 0; i--) {
        const e = entries[i];
        if (e?.name?.toLowerCase() === lower) {
          jumpToParameter = e;
          break;
        }
      }
      if (jumpToParameter && typeof jumpToParameter.line === 'number' && typeof jumpToParameter.column === 'number') {
        const jumpToPosition = new vscode.Position(Math.max(0, jumpToParameter.line - 1), Math.max(0, jumpToParameter.column));
  const options: vscode.TextDocumentShowOptions = { selection: new vscode.Range(jumpToPosition, jumpToPosition), preview: true };
        await vscode.window.showTextDocument(document, options);
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

export default debouncedListenToLstFiles;