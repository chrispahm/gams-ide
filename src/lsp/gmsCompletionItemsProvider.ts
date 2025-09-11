import * as vscode from "vscode";
import gamsParser from "../utils/gamsParser.js";
import { ReferenceSymbol, CompileTimeVariable, GamsLineAst } from "../types/gams-symbols";
import State from "../State";

function getCompletionStringsSubsets(symbol: ReferenceSymbol): (string | undefined)[] {
  const completionStrings: (string | undefined)[] = [symbol.name];
  if (symbol.subsets) {
    for (const subset of symbol.subsets) {
      completionStrings.push(subset.name);
    }
  }
  if (symbol.type === "SET" && symbol.domain && symbol.domain.length === 1 && symbol.data) {
    if (symbol.setElements) {
      completionStrings.push(...symbol.setElements);
    } else {
      const solves = Object.keys(symbol.data);
      if (solves.length) {
        const lastSolveLine = solves[solves.length - 1];
        const lastSolveContent = symbol.data[lastSolveLine];
        if (typeof lastSolveContent === "string" && !lastSolveContent.includes("( EMPTY )")) {
          const lines = lastSolveContent.split("\n");
            const startIndex = lines.findIndex((line: string) => line.startsWith("----")) + 1;
            symbol.setElements = lines
              .slice(startIndex)
              .join(",")
              .split(",")
              .map(el => el.trim())
              .filter(Boolean)
              .map(el => '"' + el + '"');
            completionStrings.push(...symbol.setElements);
        }
      }
    }
  }
  return completionStrings;
}

function symbolToCompletionItemKind(symbol: ReferenceSymbol): vscode.CompletionItemKind {
  switch (symbol.type) {
    case "SET": return vscode.CompletionItemKind.Enum;
    case "PARAM": return vscode.CompletionItemKind.Constant;
    case "EQU": return vscode.CompletionItemKind.Function;
    case "VAR": return vscode.CompletionItemKind.Variable;
    case "MODEL": return vscode.CompletionItemKind.Module;
    case "SCALAR": return vscode.CompletionItemKind.Constant;
    default: return vscode.CompletionItemKind.Text;
  }
}

interface CompletionSymbolsOptions {
  prefix?: string;
  isInSymbol?: boolean;
  isLastIndex?: boolean;
  curIndex?: number;
  countExpectedIndeces?: number;
}

function createCompletionsForCompileTimeVariables(symbols: CompileTimeVariable[], options: CompletionSymbolsOptions = {}): vscode.CompletionItem[] {
  const { prefix = "" } = options;
  const lcPrefix = prefix.toLowerCase();
  return symbols
    .filter(symbol => symbol.name?.toLowerCase()?.startsWith(lcPrefix))
    .map(symbol => {
      const completionItem = new vscode.CompletionItem(symbol.name);
      completionItem.kind = vscode.CompletionItemKind.Constant;
      if (symbol.description) {
        completionItem.documentation = new vscode.MarkdownString(`(${symbol.type ?? "var"}) ${symbol.description}`);
      }
      completionItem.command = { command: 'editor.action.triggerSuggest', title: 'Re-trigger completions...' };
      completionItem.insertText = `%${symbol.name}%`;
      return completionItem;
    });
}

function createCompletionsForSymbols(symbols: ReferenceSymbol[], options: CompletionSymbolsOptions = {}): vscode.CompletionItem[] {
  const { prefix = "", isInSymbol = false, isLastIndex = false, curIndex = 0, countExpectedIndeces = 0 } = options;
  const lcPrefix = prefix.toLowerCase();
  return symbols
    .filter(symbol => symbol.name?.toLowerCase()?.startsWith(lcPrefix))
    .reduce<vscode.CompletionItem[]>((completionItems, symbol) => {
      if (!symbol.name) {
        return completionItems;
      }
      const completionItem = new vscode.CompletionItem(symbol.name);
      completionItem.kind = symbolToCompletionItemKind(symbol);
      if (symbol.description) {
        completionItem.documentation = new vscode.MarkdownString(symbol.description);
      }
      completionItem.command = { command: 'editor.action.triggerSuggest', title: 'Re-trigger completions...' };
      completionItem.insertText = symbol.name;
      if (symbol.domain && symbol.domain.length && (symbol.domain.length > 1 || symbol.type !== "SET")) {
        if (symbol.type === "SET" && isInSymbol) {
          let closeSnippet = ", ";
          if (curIndex + symbol.domain.length === countExpectedIndeces) {
            closeSnippet = ") ";
          }
          completionItem.insertText = new vscode.SnippetString(
            symbol.name + "(" + symbol.domain.map((d, i) => "${" + (i + 1) + "|" + getCompletionStringsSubsets(d as ReferenceSymbol).join(",") + "|}").join(", ") + ")" + closeSnippet
          );
        } else {
          completionItem.command = {
            command: "runCommands",
            arguments: [{ commands: ["editor.action.triggerSuggest", "editor.action.triggerParameterHints"] }],
            title: "Re-trigger completions..."
          };
        }
      } else if (isInSymbol && !isLastIndex) {
        completionItem.insertText += ", ";
      }
      completionItems.push(completionItem);
      if (symbol === symbols[0] && symbol.type === "SET" && symbol.domain && symbol.domain.length === 1 && symbol.data) {
        if (!symbol.setElements) {
          const solves = Object.keys(symbol.data);
          if (solves.length) {
            const lastSolveLine = solves[solves.length - 1];
            const lastSolveContent = symbol.data[lastSolveLine];
            if (typeof lastSolveContent === "string" && !lastSolveContent.includes("( EMPTY )")) {
              const lines = lastSolveContent.split("\n");
              const startIndex = lines.findIndex((line: string) => line.startsWith("----")) + 1;
              symbol.setElements = lines
                .slice(startIndex)
                .join(",")
                .split(",")
                .map(el => el.trim())
                .filter(Boolean)
                .map(el => '"' + el + '"');
            }
          }
        }
        if (symbol.setElements) {
          completionItems.push(...symbol.setElements.map(name => {
            const item = new vscode.CompletionItem(name);
            item.kind = vscode.CompletionItemKind.Text;
            item.insertText = name + (isInSymbol && !isLastIndex ? ", " : "");
            item.command = { command: 'editor.action.triggerSuggest', title: 'Re-trigger completions...' };
            return item;
          }));
        }
      }
      return completionItems;
    }, []);
}

export default function provideGAMSCompletionItems(
  document: vscode.TextDocument,
  position: vscode.Position,
  state: State
): vscode.CompletionItem[] {
  let ast: GamsLineAst = [];
  const referenceTree = (state.get<ReferenceSymbol[]>("referenceTree") ?? []);
  const compileTimeVariables = (state.get<CompileTimeVariable[]>("compileTimeVariables") ?? []);

  try {
    ast = gamsParser.parse(document.lineAt(position.line).text) as GamsLineAst;
  } catch {
    // swallow parser errors per-line; they are expected for incomplete input while typing
  }

  if (ast && ast.length) {
    const gamsSymbol = ast.find(entry => entry.start <= position.character + 1 && entry.end >= position.character);
    if (gamsSymbol && typeof (gamsSymbol as any).functionName === "string") {
      const fnName = String((gamsSymbol as any).functionName).toLowerCase();
      const functionRef = referenceTree.find(entry => entry.nameLo === fnName);
      if (functionRef && functionRef.domain && functionRef.domain[(gamsSymbol as any).index]) {
        const gIndex = (gamsSymbol as any).index as number;
        const expectedSetAtIndex = functionRef.domain[gIndex] as ReferenceSymbol;
        expectedSetAtIndex.subsets = expectedSetAtIndex.subsets || [];
        let crosssets: ReferenceSymbol[] = [];
        if (functionRef.domain.length > 1) {
          crosssets = referenceTree.filter(entry => (
            entry.type === "SET" && entry.domain && entry.domain.length > 1 && entry.name !== functionRef.name &&
            entry.domain.every((el, i) => functionRef.domain?.[i + gIndex]?.name === el.name)
          ));
        }
        const possSymbols: ReferenceSymbol[] = [expectedSetAtIndex, ...expectedSetAtIndex.subsets, ...crosssets];
        return createCompletionsForSymbols(possSymbols, {
          prefix: String((gamsSymbol as any).name ?? ""),
          isInSymbol: true,
          isLastIndex: gIndex === functionRef.domain.length - 1,
          curIndex: gIndex,
          countExpectedIndeces: functionRef.domain.length,
        });
      }
    }
  }

  const wordRange = document.getWordRangeAtPosition(position);
  const prefix = wordRange ? document.getText(wordRange) : "";
  const symbolCompletions = createCompletionsForSymbols(referenceTree, { prefix });
  const ctvCompletions = createCompletionsForCompileTimeVariables(compileTimeVariables, { prefix });
  return [...symbolCompletions, ...ctvCompletions];
}
