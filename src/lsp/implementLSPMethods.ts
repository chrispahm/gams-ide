const vscode = require("vscode");
const gmsDeclarationProvider = require("./gmsDeclarationProvider.js");
const gmsDefinitionProvider = require("./gmsDefinitionProvider.js");
const gmsHoverProvider = require("./gmsHoverProvider.js");
const gmsReferenceProvider = require("./gmsReferenceProvider.js");
const gmsImplementationProvider = require("./gmsImplementationProvider.js");
const gmsDocumentSymbolsProvider = require("./gmsDocumentSymbolsProvider.js");
const gmsCompletionItemsProvider = require("./gmsCompletionItemsProvider.js");
const gmsSignatureHelpProvider = require("./gmsSignatureHelpProvider.js");

export default function implementLSPMethods(context, state) {
  // Register the GAMS declaration provider
  context.subscriptions.push(
    vscode.languages.registerDeclarationProvider(
      { scheme: "file", language: "gams" },
      {
        provideDeclaration: (document, position) => {
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
        provideDefinition: (document, position) => {
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
        provideHover: (document, position) => {
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
        provideReferences: (document, position) => {
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
        provideImplementation: (document, position) => {
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
    vscode.languages.registerCompletionItemProvider("gams", {
      provideCompletionItems(document, position) {
        return gmsCompletionItemsProvider(document, position, state);
      }
    }, " ", ",", "(", "[", "{", ":", ">", "<", "=", "+", "-", "*", "/", "^", "!", "&", "|", ">", "<", "\t")
  );

  // provide signature help
  context.subscriptions.push(
    vscode.languages.registerSignatureHelpProvider("gams", {
      provideSignatureHelp(document, position) {
        return gmsSignatureHelpProvider(document, position, state);
      }
    }, "(", ",")
  );
};