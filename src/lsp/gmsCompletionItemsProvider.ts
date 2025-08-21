const gamsParser = require("../utils/gamsParser.js");
const vscode = require("vscode");

function getCompletionStringsSubsets(symbol) {
  let completionStrings = [symbol.name];
  if (symbol.subsets) {
    for (const subset of symbol.subsets) {
      completionStrings.push(subset.name);
    }
  }

  // if the symbol is a one dimensional set, we also add the set elements (if available)
  if (symbol.type === "SET" && symbol.domain.length === 1 && symbol.data) {
    // TODO: switch to node-gdx for actual parsing of set elements
    // data in an object of model_lineno: data -> get the last entry
    if (symbol.setElements) {
      completionStrings = completionStrings.concat(symbol.setElements);
    } else {
      const solves = Object.keys(symbol.data);
      const lastSolveLine = solves[solves.length - 1];
      if (!symbol.data[lastSolveLine].includes("( EMPTY )")) {
        const lines = symbol.data[lastSolveLine].split("\n");
        const startIndex = lines.findIndex(line => line.startsWith("----")) + 1;
        // join all lines after the start index, split by comma, and trim whitespace
        symbol.setElements = lines
          .slice(startIndex)
          .join(",")
          .split(",")
          .filter(el => el.trim())
          .map(el => '"' + el.trim() + '"');
        completionStrings = completionStrings.concat(symbol.setElements);
      }
    }
  }
  return completionStrings;
}

function symbolToCompletionItemKind(symbol) {
  switch (symbol.type) {
    case "SET":
      return vscode.CompletionItemKind.Enum;
    case "PARAM":
      return vscode.CompletionItemKind.Constant;
    case "EQU":
      return vscode.CompletionItemKind.Function;
    case "VAR":
      return vscode.CompletionItemKind.Variable;
    case "MODEL":
      return vscode.CompletionItemKind.Module;
    case "SCALAR":
      return vscode.CompletionItemKind.Constant;
    default:
      return vscode.CompletionItemKind.Text;
  }
}

function createCompletionsForCompileTimeVariables(symbols, options = {}) {
  const {
    prefix = ""
  } = options;
  
  return symbols
    .filter(symbol => symbol.name?.toLowerCase()?.startsWith(prefix?.toLowerCase()))
    .map(symbol => {
      const completionItem = new vscode.CompletionItem(symbol.name);
      completionItem.kind = vscode.CompletionItemKind.Constant;
      if (symbol.description) {
        completionItem.documentation = `(${symbol.type}) ${symbol.description}`;
      }
      completionItem.command = { command: 'editor.action.triggerSuggest', title: 'Re-trigger completions...' };
      completionItem.insertText = `%${symbol.name}%`;
      return completionItem;
    });
}


function createCompletionsForSymbols(symbols, options = {}) {
  const {
    prefix = "",
    isInSymbol = false,
    isLastIndex = false,
    curIndex = 0,
    countExpectedIndeces = 0,
  } = options;

  return symbols
    .filter(symbol => symbol.name?.toLowerCase()?.startsWith(prefix?.toLowerCase()))
    .reduce((completionItems, symbol) => {
      const completionItem = new vscode.CompletionItem(symbol.name);
      completionItem.kind = symbolToCompletionItemKind(symbol);
      if (symbol.description) {
        completionItem.documentation = symbol.description;
      }
      completionItem.command = { command: 'editor.action.triggerSuggest', title: 'Re-trigger completions...' };
      completionItem.insertText = symbol.name;
      if (symbol.domain && (symbol.domain.length > 1 || symbol.type !== "SET")) {
        // for cross-sets, we automatically add the domain as a snippet
        if (symbol.type === "SET" && isInSymbol) {
          let closeSnippet = ", ";
          if (curIndex + symbol.domain.length === countExpectedIndeces) {
            closeSnippet = ") ";
          }
          completionItem.insertText = new vscode.SnippetString(
            symbol.name + "(" + symbol.domain.map(
              (d, i) => "${" + (i + 1) + "|" + getCompletionStringsSubsets(d).join(",") + "|}"
            ).join(", ") + ")" + closeSnippet
          );
        } else {
          completionItem.command = {
            command: "runCommands",
            arguments: [
              {
                commands: [
                  "editor.action.triggerSuggest",
                  "editor.action.triggerParameterHints"
                ]
              }
            ],
            title: "Re-trigger completions..."
          };
        }

      } else if (isInSymbol && !isLastIndex) {
        completionItem.insertText += ", ";
      }
      completionItems.push(completionItem);
      // if it's a one dimensional set, also add the set elements as completion items
      // TODO: replace with node-gdx actual gdx contents
      if (symbol === symbols[0] && symbol.type === "SET" && symbol.domain.length === 1 && symbol.data) {
        // TODO: switch to node-gdx for actual parsing of set elements
        // data in an object of model_lineno: data -> get the last entry
        if (!symbol.setElements) {
          const solves = Object.keys(symbol.data);
          const lastSolveLine = solves[solves.length - 1];
          if (!symbol.data[lastSolveLine].includes("( EMPTY )")) {
            const lines = symbol.data[lastSolveLine].split("\n");
            const startIndex = lines.findIndex(line => line.startsWith("----")) + 1;
            // join all lines after the start index, split by comma, and trim whitespace
            symbol.setElements = lines
              .slice(startIndex)
              .join(",")
              .split(",")
              .filter(el => el.trim())
              .map(el => '"' + el.trim() + '"');
          }
        }
        if (symbol.setElements) {
          completionItems = completionItems.concat(symbol.setElements.map(name => {
            const completionItem = new vscode.CompletionItem(name);
            completionItem.kind = vscode.CompletionItemKind.Text;
            completionItem.insertText = name;
            if (isInSymbol && !isLastIndex) {
              completionItem.insertText += ", ";
            }
            completionItem.command = { command: 'editor.action.triggerSuggest', title: 'Re-trigger completions...' };
            return completionItem;
          }));
        }
      }
      return completionItems;
    }, []);
}

export default function provideGAMSCompletionItems(document, position, state) {
  let ast = [];
  let completions = [];
  const referenceTree = state.get("referenceTree");
  const compileTimeVariables = state.get("compileTimeVariables");

  try {
    ast = gamsParser.parse(document.lineAt(position.line).text);
  } catch (error) {
    console.error("Error parsing line: ", error);
  }
  if (ast) {
    // check if the cursor is in a symbol
    const gamsSymbol = ast.find(entry => (
      entry.start <= position.character + 1 &&
      entry.end >= position.character
    ));

    if (gamsSymbol) {
      // we are in a symbol, now find the surrounding function
      const functionRef = referenceTree.find(entry =>
        (entry.nameLo === gamsSymbol.functionName.toLowerCase())
      );
      if (functionRef && functionRef.domain && functionRef.domain[gamsSymbol.index]) {
        // provide completions for the current domain index
        let crosssets = [];
        const expectedSetAtIndex = functionRef.domain[gamsSymbol.index];
        expectedSetAtIndex.subsets = expectedSetAtIndex.subsets || [];
        if (functionRef.domain.length > 1) {
          // there may be cross-sets that contain the same domain (or parts of it)
          // that we also need to consider
          crosssets = referenceTree.filter(entry =>
          (entry.type === "SET" && entry.domain.length > 1
            && entry.name !== functionRef.name
            && entry.domain.every((el, i) => functionRef.domain[i + gamsSymbol.index]?.name === el.name)
          )
          );
        }
        const possSmybols = [
          expectedSetAtIndex, // the set as defined for the current index
          ...expectedSetAtIndex.subsets, // and all subsets of the set
          ...crosssets
        ];

        completions = createCompletionsForSymbols(possSmybols, {
          prefix: gamsSymbol.name,
          isInSymbol: true,
          isLastIndex: gamsSymbol.index === functionRef.domain.length - 1,
          curIndex: gamsSymbol.index,
          countExpectedIndeces: functionRef.domain.length,
        });
        return completions;
      }
    }
  }
  // all other cases
  const prefix = document.getText(document.getWordRangeAtPosition(position));
  completions = createCompletionsForSymbols(referenceTree, {
    prefix
  });
  // merge with compile time variables
  completions = completions.concat(
    createCompletionsForCompileTimeVariables(compileTimeVariables, {
      prefix
    })
  );
  return completions;
};