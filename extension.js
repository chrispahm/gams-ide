const vscode = require("vscode");
const clearScrdir = require("./src/utils/clearScrdir");
const updateDiagnostics = require("./src/diagnostics");
const runGams = require("./src/runGams");
const getSymbolUnderCursor = require("./src/getSymbolUnderCursor");
const getGamsIdeViewContainerContent = require("./src/utils/getGamsIdeViewContainerContent");
const getGamsIdeDataViewContainerContent = require("./src/utils/getGamsIdeDataViewContainerContent");
const debouncedListenToLstFiles = require("./src/parseLstFiles");
const updateStatusBar = require("./src/utils/updateStatusBar");
const checkIfExcluded = require("./src/utils/checkIfExcluded");
const implementLSPMethods = require("./src/lsp/implementLSPMethods");
const { gamsIncludeExplorer } = require("./src/createIncludeTree");
const registerIncludeTreeCommands = require("./src/registerIncludeTreeCommands");
const State = require("./src/State.js");

let terminal;
let gamsView;
let gamsDataView;
let gamsStatusBarItem;
let includeTreeProvider;

async function activate(context) {
  // first, we try to delete all contents of the scratch directory (scrdir) to avoid
  // conflicts with previous runs
  await clearScrdir();
  // check if a terminal with the name "GAMS" already exists
  terminal = vscode.window.terminals.find((terminal) => terminal.name === "GAMS");
  // if not, create a terminal for compiling and executing GAMS files
  if (!terminal) terminal = vscode.window.createTerminal("GAMS");

  const state = new State();
  // start listening to save events to generate diagnostics
  const collection = vscode.languages.createDiagnosticCollection("gams");
  
  if (vscode.window.activeTextEditor) {
    const document = vscode.window.activeTextEditor.document;
    // check if the active editor is a GAMS file
    if (document.languageId === "gams") {
      await updateDiagnostics({ document, collection, gamsDataView, state, terminal });
    } 
  }

  // update both diagnostics and listing file parsing on editor change
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(async (editor) => {
      let isListing = false;
      if (editor && editor.document.languageId === "gams") {
        await updateDiagnostics({
          document: editor.document,
          collection,
          gamsDataView,
          state,
          terminal
        });
        // get current cursor position
        getSymbolUnderCursor({ event: {
          textEditor: editor,
          selections: editor.selections,
        }, gamsDataView, state, gamsView });
      } else if (editor && editor.document.fileName.toLowerCase().endsWith('.lst')) {
        isListing = true;
        await debouncedListenToLstFiles({
          document: editor.document,
          contentChanges: [], // fake content changes to trigger the update
          gamsView,
          state
        });
      }
      if (gamsView) {
        // change the webview to either show the listing contents or the GAMS reference tree
        gamsView.webview.postMessage({
          command: "showGAMSorListing",
          data: {
            isListing
          }
        });
      }
    })
  );

  // start listening to save events to generate diagnostics
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(async (document) => {
      if (document && document.languageId === "gams") {
        await updateDiagnostics({ document, collection, gamsDataView, state, terminal });
      }
    })
  );

  // add the model include tree view if enabled
  if (vscode.workspace.getConfiguration("gamsIde").get("enableModelIncludeTreeView")) {
    includeTreeProvider = new gamsIncludeExplorer(context, state);
  }
  // add commands necessary for include tree view anyways
  registerIncludeTreeCommands(context, state);
  
  // add LSP features
  implementLSPMethods(context, state);

  // add commands
  // register a command to get the symbol under the cursor
  context.subscriptions.push(
    vscode.window.onDidChangeTextEditorSelection(async (event) => {
      if (event && event.textEditor.document.languageId === "gams" && event.kind) {
        getSymbolUnderCursor({ event, gamsDataView, state, gamsView });
      }
    }),
    vscode.commands.registerCommand("gams.getSymbolUnderCursor", () => {
      const editor = vscode.window.activeTextEditor;
      if (editor && editor.document.languageId === "gams") {
        getSymbolUnderCursor({ event: {
          textEditor: editor,
          selections: editor.selections,
        }, gamsDataView, state, gamsView });
      }
    })
  );
  

  // register status bar item showing the current main file
  gamsStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  context.subscriptions.push(gamsStatusBarItem);

  // register some listener that make sure the status bar 
  // item id always up-to-date
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(() => updateStatusBar(gamsStatusBarItem))
  );

  updateStatusBar(gamsStatusBarItem);

  // register a command to execute a GAMS file
  context.subscriptions.push(
    vscode.commands.registerCommand("gams.run", () => runGams(terminal))
  );

  // gams stop -> sigterm
  context.subscriptions.push(
    vscode.commands.registerCommand("gams.stop", () => terminal.sendText(String.fromCharCode(3)))
  );

  // gams kill -> sigkill
  context.subscriptions.push(
    vscode.commands.registerCommand("gams.kill", () => terminal.sendText(String.fromCharCode(24)))
  );

  // add "Set as main GAMS file" command
  context.subscriptions.push(
    vscode.commands.registerCommand("gams.setAsMainGmsFile", () => {
      const file = vscode.window.activeTextEditor?.document.fileName;
      vscode.workspace.getConfiguration().update("gamsIde.mainGmsFile", file, vscode.ConfigurationTarget.Workspace);
    })
  );

  // add "Clear main GAMS file" command
  context.subscriptions.push(
    vscode.commands.registerCommand("gams.clearMainGmsFile", () => {
      vscode.workspace.getConfiguration().update("gamsIde.mainGmsFile", "", vscode.ConfigurationTarget.Workspace);
    })
  );

  // add "Add to exclude from main GAMS file" command
  context.subscriptions.push(
    vscode.commands.registerCommand("gams.addToExcludeFromMainGmsFile", () => {
      const file = vscode.window.activeTextEditor?.document.fileName;
      const excludeFromMainGmsFile = vscode.workspace.getConfiguration().get("gamsIde.excludeFromMainGmsFile");
      // check if the file is already excluded
      if (checkIfExcluded(file, excludeFromMainGmsFile)) {
        vscode.window.showInformationMessage("File is already excluded.");
        return;
      } else {
        excludeFromMainGmsFile.push(file);
        vscode.workspace.getConfiguration().update("gamsIde.excludeFromMainGmsFile", excludeFromMainGmsFile, vscode.ConfigurationTarget.Workspace);
      }
    })
  );

  // add "Remove from exclude from main GAMS file" command
  context.subscriptions.push(
    vscode.commands.registerCommand("gams.removeFromExcludeFromMainGmsFile", () => {
      const file = vscode.window.activeTextEditor?.document.fileName;
      const excludeFromMainGmsFile = vscode.workspace.getConfiguration().get("gamsIde.excludeFromMainGmsFile");
      const matchedExcludePath = checkIfExcluded(file, excludeFromMainGmsFile, true);
      // check if the file is already excluded
      if (!matchedExcludePath) {
        vscode.window.showInformationMessage("File is not excluded.");
        return;
      } else {
        const index = excludeFromMainGmsFile.indexOf(matchedExcludePath);
        excludeFromMainGmsFile.splice(index, 1);
        vscode.workspace.getConfiguration().update("gamsIde.excludeFromMainGmsFile", excludeFromMainGmsFile, vscode.ConfigurationTarget.Workspace);
      }
    })
  );

  // add "Select main GAMS file" command
  context.subscriptions.push(
    vscode.commands.registerCommand("gams.selectMainGmsFile", async () => {
      // show a quick pick to select the main GAMS file
      // only show gams files from the current workspace
      const gmsFiles = await vscode.workspace.findFiles("**/*.gms");
      const quickPick = vscode.window.createQuickPick(); 
      quickPick.items = gmsFiles.map((file) => ({ label: file.fsPath }));
      quickPick.title = "Select main GAMS file";
      quickPick.onDidChangeSelection((selection) => {        
        if (selection[0]) {
          vscode.workspace.getConfiguration().update("gamsIde.mainGmsFile", selection[0].label, vscode.ConfigurationTarget.Workspace);
          quickPick.hide();
        }
      });
      quickPick.onDidHide(() => quickPick.dispose());
      quickPick.show();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("gams.runThisFile", () => runGams(terminal, false, true))
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("gams.compile", () => runGams(terminal, true))
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("gams.compileThisFile", () => runGams(terminal, true, true))
  );

  // add a listener to all .lst files, that scrolls to the bottom of the file 
  // if they are changed externally
  context.subscriptions.push(
    // Register a listener for listing file changes
    vscode.workspace.onDidChangeTextDocument((event) => {
      return debouncedListenToLstFiles({
        document: event.document,
        contentChanges: event.contentChanges,
        gamsView,
        state
      });
    })
  );

  // add the gams reference tree sidebar
  vscode.window.registerWebviewViewProvider('gamsIdeView', {
    // Implement the resolveWebviewView method
    resolveWebviewView(webviewView, undefined) {
      gamsView = webviewView;
      // Set the webview options
      webviewView.webview.options = {
        enableScripts: true
      };
      const vueUri = webviewView.webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'view', 'vue.esm-browser.js'));
      const webviewToolkitUri = webviewView.webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'view', 'webview-ui-toolkit.esm.js'));
      const codiconsUri = webviewView.webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'view', 'codicon.css'));
      // Set the webview content
      webviewView.webview.html = getGamsIdeViewContainerContent({
        vueUri,
        webviewToolkitUri,
        codiconsUri
      });

      // Handle messages from the webview
      webviewView.webview.onDidReceiveMessage(
        async message => {
          // get current cursor position
          const editor = vscode.window.activeTextEditor;
          const position = editor.selection?.active ;
          const file = editor.document?.fileName;
          const line = position?.line;
          const column = position?.character;

          switch (message.command) {
            case 'jumpToPosition':
              let uri = vscode.Uri.file(message.data.file);
              // Create a TextDocumentShowOptions object with the line and column
              let options = {
                selection: new vscode.Range(
                  message.data.line - 1,
                  message.data.column - 1,
                  message.data.line - 1,
                  message.data.column - 1
                ),
                preview: true
              };
              // Open the document with the options
              vscode.workspace.openTextDocument(uri).then(doc => {
                vscode.window.showTextDocument(doc, options);
              });
              break;
            case 'updateSymbol':
              const referenceTree = state.get("referenceTree");
              let matchingRef;
              if (message.data.fuzzy) {
                matchingRef = referenceTree?.find((item) => item.name?.toLowerCase().includes(message.data.symbol?.toLowerCase()));
              } else {
                matchingRef = referenceTree?.find((item) => item.name?.toLowerCase() === message.data.symbol?.toLowerCase());
              }

              if (matchingRef) {
                const data = {
                  ...matchingRef,
                  domain: matchingRef.domain?.map((domain) => ({ name: domain.name })),
                  subsets: matchingRef.subsets?.map((subset) => ({ name: subset.name })),
                  superset: {
                    name: matchingRef.superset?.name
                  },
                  historyCursorFile: file,
                  historyCursorLine: line + 1,
                  historyCursorColumn: column + 1
                };
                
                gamsView.webview.postMessage({
                  command: "updateReference",
                  data
                });
              }
              break;
            case 'runGams':
              await runGams(terminal);
              break;
            case 'stopGams':
              terminal.sendText(String.fromCharCode(3));
              break;
            case 'getState':
              const isListing = vscode.window.activeTextEditor && vscode.window.activeTextEditor.document.fileName.toLowerCase().endsWith('.lst');
              if (isListing) {
                await debouncedListenToLstFiles({
                  document: vscode.window.activeTextEditor.document,
                  contentChanges: [],
                  gamsView,
                  state
                });
                const lstTree = state.get("lstTree");
                if (lstTree) {
                  webviewView.webview.postMessage({
                    command: "updateListing",
                    data: {
                      lstTree,
                      isListing
                    }
                  });
                }
              } else {
                getSymbolUnderCursor({ event: {
                  textEditor: vscode.window.activeTextEditor,
                  selections: vscode.window.activeTextEditor?.selections,
                }, gamsDataView, state, gamsView });
                const curSymbol = state.get("curSymbol");
                curSymbol.domain = curSymbol.domain?.map((domain) => ({ name: domain.name }));
                curSymbol.subsets = curSymbol.subsets?.map((subset) => ({ name: subset.name }));

                if (curSymbol) {
                  webviewView.webview.postMessage({
                    command: "updateReference",
                    data: curSymbol
                  });
                }
              }
              break;
          }
        },
        undefined,
        context.subscriptions
      );
        
    }
  });
  context.subscriptions.push(gamsView);
  // add a command to open the gams reference tree sidebar
  context.subscriptions.push(
    vscode.commands.registerCommand("gams.openSidebar", () => {
      gamsView.show();
    })
  );

  // gams data view
  function createGamsDataView() {
    return {
      // Implement the resolveWebviewView method
      resolveWebviewView(webviewView) {
        gamsDataView = webviewView;
        // Set the webview options
        webviewView.webview.options = {
          enableScripts: true
        };
        
        const webviewToolkitUri = webviewView.webview.asWebviewUri(
          vscode.Uri.joinPath(context.extensionUri, 'view', 'webview-ui-toolkit.esm.js'));
        const codiconsUri = webviewView.webview.asWebviewUri(
          vscode.Uri.joinPath(
            context.extensionUri, 'view', 'codicon.css'
          )
        );
        // Set the webview content
        webviewView.webview.html = getGamsIdeDataViewContainerContent({
          webviewToolkitUri,
          codiconsUri,
          isDataParsingEnabled: vscode.workspace.getConfiguration("gamsIde").get("parseGamsData")
        });

        webviewView.webview.onDidReceiveMessage(async message => {
          switch (message.command) {
            case 'enableDataParsing':
              vscode.workspace.getConfiguration("gamsIde").update("parseGamsData", true);
              break;
          }
        });
      }
    };
  }
  // add the gams data view if enabled
  let showDataViewCommandDisposable, gamsDataViewDisposable;
  // create the gams data view
  gamsDataViewDisposable = vscode.window.registerWebviewViewProvider('gamsIdeDataView', createGamsDataView());
  context.subscriptions.push(gamsDataViewDisposable);

  // add a command to open the gams data view sidebar
  showDataViewCommandDisposable = vscode.commands.registerCommand("gams.openDataPanel", () => {
    // make sure the bottom panel is open
    vscode.commands.executeCommand("workbench.action.togglePanel");
    // check if parsing symbols is enabled
    if (!vscode.workspace.getConfiguration("gamsIde").get("parseGamsData")) {
      vscode.window.showErrorMessage("Data parsing is disabled.", "Enable data parsing").then((value) => {
        if (value === "Enable data parsing") {
          vscode.workspace.getConfiguration("gamsIde").update("parseGamsData", true);
        }
      });
    } else {
      gamsDataView?.show();
    }
  });

  context.subscriptions.push(showDataViewCommandDisposable);

  // listen to changes to the parseGamsData setting
  vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration("gamsIde.parseGamsData")) {      
      // send a message to the data view to update the content
      const isDataParsingEnabled = vscode.workspace.getConfiguration("gamsIde").get("parseGamsData");
      gamsDataView?.webview.postMessage({
        command: "isDataParsingEnabled",
        data: {
          isDataParsingEnabled
        }
      });

      if (isDataParsingEnabled) {
        // re-run diagnostics so that the data view is updated
        const editor = vscode.window.activeTextEditor;
        if (editor && editor.document.languageId === "gams") {
          updateDiagnostics({ document: editor.document, collection, gamsDataView, state, terminal });
        }
      }
    } else if (e.affectsConfiguration("gamsIde.mainGmsFile") || e.affectsConfiguration("gamsIde.excludeFromMainGmsFile")) {
      updateStatusBar(gamsStatusBarItem);
      // re-run diagnostics
      const editor = vscode.window.activeTextEditor;
      if (editor && editor.document.languageId === "gams") {
        updateDiagnostics({ document: editor.document, collection, gamsDataView, state, terminal });
      }
    } else if (e.affectsConfiguration("gamsIde.enableModelIncludeTreeView")) {
      if (vscode.workspace.getConfiguration("gamsIde").get("enableModelIncludeTreeView")) {
        includeTreeProvider = new gamsIncludeExplorer(context, state);
      } else {
        includeTreeProvider.dispose();
      }
    }
  });
}

// this method is called when your extension is deactivated
function deactivate() { }

module.exports = {
  activate,
  deactivate,
};
