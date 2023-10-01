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
    let matchingRef = referenceTree?.find((item) => item.name?.toLowerCase() === word?.toLowerCase());
    // const position = editor.selection.active;
    const line = position.line;
    const column = position.character;
    const file = document.fileName;

    if (!matchingRef) {
      // parse the line using the PEG parser
      try {
        console.log('line.text', document.lineAt(line));
        const { text: lineText } = document.lineAt(line);
        const ast = gamsParser.parse(lineText);
        console.log('ast', ast);

        const gamsSymbol = ast.find((functionCall) => functionCall.args?.find(
          (arg) => arg?.name?.toLowerCase().includes(word?.toLowerCase())
            && arg.location.start.column <= column
            && arg.location.end.column >= column
        ));
        const argIndex = gamsSymbol?.args?.findIndex(
          (arg) => arg?.name?.toLowerCase().includes(word?.toLowerCase())
            && arg.location.start.column <= column
            && arg.location.end.column >= column
        );
        matchingRef = referenceTree?.find((item) => item.name?.toLowerCase() === gamsSymbol?.name?.toLowerCase());
        matchingRef = matchingRef.domain[argIndex]
      } catch (error) {
        console.log("Error finding quoted string in GAMS symbols: ", error);
      }
    }
    if (matchingRef && gamsView) {
      state.update("curSymbol", {
        ...matchingRef,
        historyCursorFile: file,
        historyCursorLine: line + 1,
        historyCursorColumn: column + 1
      })
      // send data to webview      
      gamsView.webview.postMessage({
        command: "updateReference",
        data: {
          ...matchingRef,
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