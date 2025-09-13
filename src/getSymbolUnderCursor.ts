import * as vscode from 'vscode';
import gamsParser from './utils/gamsParser.js';
import State from './State';
import { ReferenceTree, ReferenceSymbol, CompileTimeVariable, GamsLineAst } from './types/gams-symbols';

interface GetSymbolArgs {
  event: {
    textEditor: vscode.TextEditor;
    selections: readonly vscode.Selection[];
    kind?: vscode.TextEditorSelectionChangeKind;
  };
  gamsDataView?: vscode.WebviewView;
  gamsView?: vscode.WebviewView;
  state: State;
}

export default async function getSymbolUnderCursor(args: GetSymbolArgs): Promise<void> {
  const { event, gamsDataView, state, gamsView } = args;
  
  /*
  const document = editor.document;
  const position = editor.selection.active;
  const line = document.lineAt(position.line);
  const lineText = line.text;
  const symbol = lineText.substring(line.firstNonWhitespaceCharacterIndex, lineText.length);
  */
  const editor = event.textEditor;
  // Get the document
  const document = editor.document;

  // Get the position of the cursor
  const position = event.selections[0].active;

  // Get the range of the word at the position
  const wordRange = document.getWordRangeAtPosition(position);

  // Check if there is a word range
  if (wordRange) {
    // Get the text of the word
    const word = document.getText(wordRange);    
    const characterBeforeWord = wordRange.start.character ? document.getText(
      new vscode.Range(
        new vscode.Position(wordRange.start.line, wordRange.start.character - 1),
        new vscode.Position(wordRange.start.line, wordRange.start.character)
      )
    ) : "";
      
      // find the word in the reference tree
    const referenceTree = state.get<ReferenceTree>('referenceTree');
    const compileTimeVariables = state.get<CompileTimeVariable[]>('compileTimeVariables');
    const solves = state.get<any>('solves');
    // const position = editor.selection.active;
    const line = position.line;
    const column = position.character;
    const file = document.fileName;

    let quotedElement = '';
    let functionName = '';
    let domain: (string | undefined)[] = [];
    let domainIndex = 0;

      // first, we try to find the reference in the reference tree without checking the AST
    let matchingRef: (ReferenceSymbol | CompileTimeVariable) | undefined;
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
    let ast: GamsLineAst | [] = [];
    try {
      ast = gamsParser.parse(lineText);
    } catch (error) {
      console.error("Error parsing line: ", error);
    }
    if (ast) {
      // parse the line using the PEG parser      
      const gamsSymbol = ast.find((entry: any) =>
        (entry && entry.name?.toString().toLowerCase().includes(word?.toLowerCase())
          && entry.start <= column
          && entry.end >= column
      ));

      if (gamsSymbol) {
        const functionRef = referenceTree?.find((item) => item.nameLo === gamsSymbol?.functionName?.toLowerCase());
        if (gamsSymbol.isQuoted) {
          quotedElement = gamsSymbol.name.toString();
        }
        functionName = gamsSymbol.functionName || '';
        domain = functionRef?.domain?.map(d => d.name) || [];
        domainIndex = gamsSymbol.index;

        if (!matchingRef && functionRef?.domain) {
          matchingRef = functionRef.domain[domainIndex];
        }
      }
    }
    
  if (matchingRef && (matchingRef as ReferenceSymbol).name && gamsView) {
      const data = {
        ...matchingRef,
        domain: (matchingRef as ReferenceSymbol).domain?.map(domain => ({ name: domain.name })),
        subsets: (matchingRef as ReferenceSymbol).subsets?.map(subset => ({ name: subset.name })),
        superset: {
          name: (matchingRef as ReferenceSymbol).superset?.name
        },
        quotedElement,
        functionName,
        functionDomain: domain,
        functionDomainIndex: domainIndex,
        historyCursorFile: file,
        historyCursorLine: line + 1,
        historyCursorColumn: column + 1
      };

      state.update('curSymbol', data);

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
    const isDataParsingEnabled = vscode.workspace.getConfiguration('gamsIde').get<boolean>('parseGamsData');
    if (matchingRef && (matchingRef as ReferenceSymbol).name && gamsDataView && isDataParsingEnabled) {
      const dataStore = state.get<Record<string, any>>('dataStore') || {};
      const name = (matchingRef as ReferenceSymbol).name!;
      gamsDataView.webview.postMessage({
        command: 'updateSolveData',
        data: { solves, symbol: word, data: dataStore[name] },
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