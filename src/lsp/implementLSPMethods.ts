import * as vscode from 'vscode';
import gmsDeclarationProvider from './gmsDeclarationProvider';
import gmsDefinitionProvider from './gmsDefinitionProvider';
import gmsHoverProvider from './gmsHoverProvider';
import gmsReferenceProvider from './gmsReferenceProvider';
import gmsImplementationProvider from './gmsImplementationProvider';
import gmsDocumentSymbolsProvider from './gmsDocumentSymbolsProvider';
import gmsCompletionItemsProvider from './gmsCompletionItemsProvider';
import gmsSignatureHelpProvider from './gmsSignatureHelpProvider';
import { registerEmbeddedPythonProviders } from './embeddedPython';
import State from '../State';

export default function implementLSPMethods(context: vscode.ExtensionContext, state: State): void {
  // Register the GAMS declaration provider
  context.subscriptions.push(
    vscode.languages.registerDeclarationProvider(
      { scheme: "file", language: "gams" },
      {
  provideDeclaration: (document: vscode.TextDocument, position: vscode.Position) => {
          return gmsDeclarationProvider(document, position, state);
        },
      }
    )
  );

  // Register the GAMS definition provider
  context.subscriptions.push(
    vscode.languages.registerDefinitionProvider(
      { scheme: "file", language: "gams" },
      {
  provideDefinition: (document: vscode.TextDocument, position: vscode.Position) => {
          return gmsDefinitionProvider(document, position, state);
        },
      }
    )
  );

  // Register the GAMS hover provider
  context.subscriptions.push(
    vscode.languages.registerHoverProvider(
      { scheme: "file", language: "gams" },
      {
  provideHover: (document: vscode.TextDocument, position: vscode.Position) => {
          return gmsHoverProvider(document, position, state);
        },
      }
    )
  );

  // Register the GAMS reference provider
  context.subscriptions.push(
    vscode.languages.registerReferenceProvider(
      { scheme: "file", language: "gams" },
      {
  provideReferences: (document: vscode.TextDocument, position: vscode.Position) => {
          return gmsReferenceProvider(document, position, state);
        },
      }
    )
  );

  // Register the GAMS implementation provider
  context.subscriptions.push(
    vscode.languages.registerImplementationProvider(
      { scheme: "file", language: "gams" },
      {
  provideImplementation: (document: vscode.TextDocument, position: vscode.Position) => {
          return gmsImplementationProvider(document, position, state);
        },
      }
    )
  );

  // Register the GAMS document symbol provider
  /*
  TODO: VSCode seems to query symbols quite often, so this can be
  a performance bottleneck. Caching symbols may not make sense, as they have
  to be re-calculated when the source code changes.
  
  context.subscriptions.push(
    vscode.languages.registerDocumentSymbolProvider(
      { scheme: "file", language: "gams" },
      {
        provideDocumentSymbols: (document) => {
          return gmsDocumentSymbolsProvider(document, state);
        },
      }
    )
  );
  */
  // provide auto-completeion 
  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider('gams', {
      provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
        return gmsCompletionItemsProvider(document, position, state);
      }
    }, " ", ",", "(", "[", "{", ":", ">", "<", "=", "+", "-", "*", "/", "^", "!", "&", "|", ">", "<", "\t")
  );

  // provide signature help
  context.subscriptions.push(
    vscode.languages.registerSignatureHelpProvider('gams', {
      provideSignatureHelp(document: vscode.TextDocument, position: vscode.Position) {
        return gmsSignatureHelpProvider(document, position, state);
      }
    }, "(", ",")
  );

  // Register embedded Python language support
  // This provides Python language features (completion, hover, etc.) for embedded Python code sections
  registerEmbeddedPythonProviders(context);
};