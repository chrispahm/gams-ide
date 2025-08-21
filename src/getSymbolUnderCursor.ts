const vscode = require("vscode");
const gamsParser = require('./utils/gamsParser.js');

export default async function getSymbolUnderCursor(args) {
  const {
    event,
    gamsDataView,
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
    const characterBeforeWord = wordRange.start.character ? document.getText(
      new vscode.Range(
        new vscode.Position(wordRange.start.line, wordRange.start.character - 1),
        new vscode.Position(wordRange.start.line, wordRange.start.character)
      )
    ) : "";
    
    // find the word in the reference tree
    const referenceTree = state.get("referenceTree");
    const compileTimeVariables = state.get("compileTimeVariables");
    const solves = state.get("solves");
    // const position = editor.selection.active;
    const line = position.line;
    const column = position.character;
    const file = document.fileName;

    let quotedElement = "";
    let functionName = "";
    let domain = [];
    let domainIndex = 0;

    // first, we try to find the reference in the reference tree without checking the AST
    let matchingRef;
    if (characterBeforeWord === "%") {
      matchingRef = compileTimeVariables?.find(
        (item) => item.name?.toLowerCase() === word?.toLowerCase()
      );
    } else {
      matchingRef = referenceTree?.find(
        (item) => item.name?.toLowerCase() === word?.toLowerCase()
      );
      if (!matchingRef) {
        matchingRef = compileTimeVariables?.find(
          (item) => item.name?.toLowerCase() === word?.toLowerCase()
        );
      }
    }

    const { text: lineText } = document.lineAt(line);
    let ast = [];
    try {
      ast = gamsParser.parse(lineText);
    } catch (error) {
      console.error("Error parsing line: ", error);
    }
    if (ast) {
      // parse the line using the PEG parser      
      const gamsSymbol = ast.find((entry) =>
      (entry && entry.name?.toString().toLowerCase().includes(word?.toLowerCase())
        && entry.start <= column
        && entry.end >= column
      ));

      if (gamsSymbol) {
        const functionRef = referenceTree?.find((item) => item.nameLo === gamsSymbol?.functionName?.toLowerCase());
        if (gamsSymbol.isQuoted) {
          quotedElement = gamsSymbol.name;
        }
        functionName = gamsSymbol.functionName;
        domain = functionRef?.domain?.map((domain) => domain.name);
        domainIndex = gamsSymbol.index;

        if (!matchingRef) {
          matchingRef = functionRef.domain[domainIndex];
        }
      }
    }
    
    if (matchingRef && gamsView) {
      const data = {
        ...matchingRef,
        domain: matchingRef.domain?.map((domain) => ({ name: domain.name })),
        subsets: matchingRef.subsets?.map((subset) => ({ name: subset.name })),
        superset: {
          name: matchingRef.superset?.name
        },
        quotedElement,
        functionName,
        functionDomain: domain,
        functionDomainIndex: domainIndex,
        historyCursorFile: file,
        historyCursorLine: line + 1,
        historyCursorColumn: column + 1
      };

      state.update("curSymbol", data);

      // send data to webview
      gamsView.webview.postMessage({
        command: "updateReference",
        data
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
    // show the data view
    //if (vscode.window.state.focused) {
    //   terminal_symbols.show(true);
    //}
    // only update data view if it enabled in the settings
    const isDataParsingEnabled = vscode.workspace.getConfiguration("gamsIde").get("parseGamsData");
    if (matchingRef && gamsDataView && isDataParsingEnabled) {
      const dataStore = state.get("dataStore") || {};
      console.log("dataStore", dataStore[matchingRef.name]);
      
      gamsDataView.webview.postMessage({
        command: "updateSolveData",
        data: {
          solves: solves,
          symbol: word,
          data: dataStore[matchingRef.name]
        },
      });
    } else if (gamsDataView && isDataParsingEnabled) {
      gamsDataView.webview.postMessage({
        command: "updateSymbolError",
        data: {
          symbol: word,
          solves: solves
        }
      });
    }
  }
};