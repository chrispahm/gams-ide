const vscode = require("vscode");
const gamsParser = require('./utils/gamsParser.js');

module.exports = async function getSymbolUnderCursor(args) {
  const {
    event,
    gamsSymbolView,
    state,
    gamsView
  } = args;
  /*
  const document = editor.document;
  const position = editor.selection.active;
  const line = document.lineAt(position.line);
  const lineText = line.text;
  const symbol = lineText.substring(line.firstNonWhitespaceCharacterIndex, lineText.length);
  */
  let editor = event.textEditor;
  // Get the document
  let document = editor.document;

  // Get the position of the cursor
  let position = event.selections[0].active;

  // Get the range of the word at the position
  let wordRange = document.getWordRangeAtPosition(position);

  // Check if there is a word range
  if (wordRange) {
    // Get the text of the word
    let word = document.getText(wordRange);

    // find the word in the reference tree
    const referenceTree = state.get("referenceTree");
    const solves = state.get("solves")

    // const position = editor.selection.active;
    const line = position.line;
    const column = position.character;
    const file = document.fileName;

    let quotedElement = "";
    let functionName = "";
    let domain = [];
    let domainIndex = 0;

    // first, we try to find the reference in the reference tree without checking the AST
    let matchingRef = referenceTree?.find(
      (item) => item.name?.toLowerCase() === word?.toLowerCase()
    );
    const { text: lineText } = document.lineAt(line);
    let ast = [];
    try {
      ast = gamsParser.parse(lineText);
    } catch (error) {
      console.log("Error parsing line: ", error);
    }
    if (ast) {
      // parse the line using the PEG parser
      const gamsSymbol = ast.find((functionCall) => functionCall.args?.find(
        (arg) => arg?.name?.toLowerCase().includes(word?.toLowerCase())
          && arg.start <= column
          && arg.end >= column
      ));
      const arg = gamsSymbol?.args?.find(
        (arg) => arg?.name?.toLowerCase().includes(word?.toLowerCase())
          && arg.start <= column
          && arg.end >= column
      );
      if (gamsSymbol) {
        const functionRef = referenceTree?.find((item) => item.name?.toLowerCase() === gamsSymbol?.name?.toLowerCase());
        if (arg.isQuoted) {
          quotedElement = arg.name;
        }
        functionName = gamsSymbol.name;
        domain = functionRef?.domain?.map((domain) => domain.name);
        domainIndex = arg.index;
        
        if (!matchingRef) {
          matchingRef = functionRef.domain[arg.index]
        }
      }
    }


    if (matchingRef && gamsView) {
      state.update("curSymbol", {
        ...matchingRef,
        quotedElement,
        functionName,
        functionDomain: domain,
        functionDomainIndex: domainIndex,
        historyCursorFile: file,
        historyCursorLine: line + 1,
        historyCursorColumn: column + 1
      })
      // send data to webview      
      gamsView.webview.postMessage({
        command: "updateReference",
        data: {
          ...matchingRef,
          quotedElement,
          functionName,
          functionDomain: domain,
          functionDomainIndex: domainIndex,
          historyCursorFile: file,
          historyCursorLine: line,
          historyCursorColumn: column
        },
      });
    } else if (gamsView) {
      gamsView.webview.postMessage({
        command: "updateReferenceError",
        data: {
          missingSymbol: word,
          historyCursorFile: file,
          historyCursorLine: line,
          historyCursorColumn: column
        }
      });
    }
    // show the symbol view
    //if (vscode.window.state.focused) {
    //   terminal_symbols.show(true);
    //}
    // only update symbol view if it enabled in the settings
    const isSymbolParsingEnabled = vscode.workspace.getConfiguration("gamsIde").get("parseSymbolValues");
    if (matchingRef && gamsSymbolView && isSymbolParsingEnabled) {
      gamsSymbolView.webview.postMessage({
        command: "updateSolveData",
        data: {
          solves: solves,
          symbol: word,
          data: matchingRef.data
        },
      });
    } else if (gamsSymbolView && isSymbolParsingEnabled) {
      gamsSymbolView.webview.postMessage({
        command: "updateSymbolError",
        data: {
          symbol: word
        }
      });
    }
  }
}