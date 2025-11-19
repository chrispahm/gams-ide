import * as vscode from 'vscode';
import clearScrdir from "./utils/clearScrdir";
import updateDiagnostics from "./diagnostics";
import runGams from "./runGams";
import getSymbolUnderCursor from "./getSymbolUnderCursor";
import getGamsIdeViewContainerContent from "./utils/getGamsIdeViewContainerContent";
import getGamsIdeDataViewContainerContent from "./utils/getGamsIdeDataViewContainerContent";
import debouncedListenToLstFiles from "./parseLstFiles";
import updateStatusBar from "./utils/updateStatusBar";
import checkIfExcluded from "./utils/checkIfExcluded";
import implementLSPMethods from "./lsp/implementLSPMethods";
import { gamsIncludeExplorer } from "./createIncludeTree";
import registerIncludeTreeCommands from "./registerIncludeTreeCommands";
import State from "./State.js";
import { ReferenceSymbol } from "./types/gams-symbols";
import { startHttpServer } from "./httpServer";

let terminal: vscode.Terminal;
let gamsView: vscode.WebviewView | undefined;
let gamsDataView: vscode.WebviewView | undefined;
let gamsStatusBarItem: vscode.StatusBarItem;
let includeTreeProvider: vscode.Disposable | undefined;

function createOrFindTerminal(): vscode.Terminal {
	// check if a terminal with the name "GAMS" already exists
	let terminal = vscode.window.terminals.find((terminal) => terminal.name === "GAMS");
	// if not, create a terminal for compiling and executing GAMS files
	if (!terminal) {
		terminal = vscode.window.createTerminal("GAMS");
	}
	return terminal;
}

export async function activate(context: vscode.ExtensionContext): Promise<void> {
	// first, we try to delete all contents of the scratch directory (scrdir) to avoid
	// conflicts with previous runs
	await clearScrdir();
	// check if a terminal with the name "GAMS" already exists
	terminal = createOrFindTerminal();

	const state = new State();
	// start the HTTP server
	const httpServerPort = await startHttpServer(state);
	// start listening to save events to generate diagnostics
	const collection = vscode.languages.createDiagnosticCollection("gams");

	if (vscode.window.activeTextEditor) {
		const document = vscode.window.activeTextEditor.document;
		// check if the active editor is a GAMS file
		if (document.languageId === "gams") {
			await updateDiagnostics({ document, collection, state, terminal });
		}
	}

	// update both diagnostics and listing file parsing on editor change
	context.subscriptions.push(
		vscode.window.onDidChangeActiveTextEditor(async (editor) => {
			let isListing = false;
			if (editor && editor.document.languageId === "gams") {
				// updating diagnostics is only necessary if
				// a) there is no main file set
				// b) there is a main file, but this file is excluded from the main file
				const mainGmsFile = vscode.workspace.getConfiguration("gamsIde").get("mainGmsFile");
				const excludeFromMainGmsFile = vscode.workspace.getConfiguration().get("gamsIde.excludeFromMainGmsFile") as string[] | undefined;
				const file = editor.document.fileName;
				if (!mainGmsFile || checkIfExcluded(file, excludeFromMainGmsFile)) {
					await updateDiagnostics({
						document: editor.document,
						collection,
						state,
						terminal
					});
				}
				// get current cursor position
				getSymbolUnderCursor({
					event: {
						textEditor: editor,
						selections: editor.selections,
					}, gamsDataView, state, gamsView
				});
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
			// check if "runDiagnosticsOnSave" is enabled
			const runDiagnosticsOnSave = vscode.workspace.getConfiguration("gamsIde").get("runDiagnosticsOnSave");
			if (document && document.languageId === "gams" && runDiagnosticsOnSave) {
				await updateDiagnostics({ document, collection, state, terminal });
			}
		})
	);

	// add the model include tree view if enabled
	if (vscode.workspace.getConfiguration("gamsIde").get("enableModelIncludeTreeView")) {
		// Wrap include explorer so it satisfies vscode.Disposable
		const explorerInstance = new gamsIncludeExplorer(context, state);
		includeTreeProvider = {
			dispose() {
				if (typeof (explorerInstance as unknown as { dispose?: () => void }).dispose === 'function') {
					(explorerInstance as unknown as { dispose: () => void }).dispose();
				}
			}
		};
	}
	// add commands necessary for include tree view anyways
	registerIncludeTreeCommands(context, state);

	// add LSP features
	implementLSPMethods(context, state);

	// add the MCP server
	const didChangeEmitter = new vscode.EventEmitter<void>();

	context.subscriptions.push(vscode.lm.registerMcpServerDefinitionProvider('gamsMcpServerProvider', {
		onDidChangeMcpServerDefinitions: didChangeEmitter.event,
		provideMcpServerDefinitions: async () => {
			let servers: vscode.McpServerDefinition[] = [];

			// Example of a simple stdio server definition
			servers.push(new vscode.McpStdioServerDefinition(
				'gamsMcpServer',
				'node',
				[context.asAbsolutePath('out/mcp/server.js')],
				{ API_SERVER_PORT: String(httpServerPort) }
			));

			return servers;
		},
		resolveMcpServerDefinition: async (server: vscode.McpServerDefinition) => {
			// Return undefined to indicate that the server should not be started or throw an error
			// If there is a pending tool call, the editor will cancel it and return an error message
			// to the language model.
			console.log('Resolving MCP server definition:', server);
			return server;
		}
	}));
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
				getSymbolUnderCursor({
					event: {
						textEditor: editor,
						selections: editor.selections,
					}, gamsDataView, state, gamsView
				});
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

	// register a command to update diagnostics
	context.subscriptions.push(
		vscode.commands.registerCommand("gams.updateDiagnostics", async () => {
			const editor = vscode.window.activeTextEditor;
			if (editor && editor.document.languageId === "gams") {
				await updateDiagnostics({ document: editor.document, collection, state, terminal });
			}
		})
	);

	// register a command to update the GAMS Data Panel
	context.subscriptions.push(
		vscode.commands.registerCommand("gams.updateData", async () => {
			// check if data parsing is enabled in the settings
			const isDataParsingEnabled = vscode.workspace.getConfiguration("gamsIde").get("parseGamsData");
			if (!isDataParsingEnabled) {
				vscode.window.showErrorMessage("Data parsing is disabled.", "Enable data parsing").then((value) => {
					if (value === "Enable data parsing") {
						vscode.workspace.getConfiguration("gamsIde").update("parseGamsData", true);
					}
				});
			} else {
				// re-run diagnostics so that the data view is updated
				const editor = vscode.window.activeTextEditor;
				if (editor && editor.document.languageId === "gams") {
					await updateDiagnostics({ forceDataParsing: true, document: editor.document, collection, state, terminal });
				}
			}
		})
	);

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
			if (!file) { return; }
			const excludeFromMainGmsFile = vscode.workspace.getConfiguration().get<string[]>("gamsIde.excludeFromMainGmsFile") || [];
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
			if (!file) { return; }
			const excludeFromMainGmsFile = vscode.workspace.getConfiguration().get<string[]>("gamsIde.excludeFromMainGmsFile") || [];
			const matchedExcludePath = checkIfExcluded(file, excludeFromMainGmsFile, true);
			// check if the file is already excluded
			if (!matchedExcludePath) {
				vscode.window.showInformationMessage("File is not excluded.");
				return;
			} else {
				if (typeof matchedExcludePath === 'string') {
					const index = excludeFromMainGmsFile.indexOf(matchedExcludePath);
					if (index >= 0) {
						excludeFromMainGmsFile.splice(index, 1);
						vscode.workspace.getConfiguration().update("gamsIde.excludeFromMainGmsFile", excludeFromMainGmsFile, vscode.ConfigurationTarget.Workspace);
					}
				}
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
		resolveWebviewView(
			webviewView: vscode.WebviewView,
			_context: vscode.WebviewViewResolveContext<unknown>,
			_token: vscode.CancellationToken
		) {
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
					const position = editor?.selection?.active;
					const file = editor?.document?.fileName;
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
							const referenceTree = (state.get<ReferenceSymbol[]>("referenceTree") || []);
							let matchingRef: ReferenceSymbol | undefined;
							if (message.data.fuzzy) {
								const sym = message.data.symbol?.toLowerCase();
								matchingRef = referenceTree.find((item: ReferenceSymbol) => item.name?.toLowerCase().includes(sym));
							} else {
								const sym = message.data.symbol?.toLowerCase();
								matchingRef = referenceTree.find((item: ReferenceSymbol) => item.name?.toLowerCase() === sym);
							}

							if (matchingRef) {
								const data = {
									...matchingRef,
										domain: matchingRef.domain?.map((domain: ReferenceSymbol) => ({ name: domain.name })),
										subsets: matchingRef.subsets?.map((subset: ReferenceSymbol) => ({ name: subset.name })),
									superset: {
										name: matchingRef.superset?.name
									},
										historyCursorFile: file,
										historyCursorLine: (line ?? 0) + 1,
										historyCursorColumn: (column ?? 0) + 1
								};

								gamsView?.webview.postMessage({
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
							const activeEditor = vscode.window.activeTextEditor;
							const isListing = !!activeEditor && activeEditor.document.fileName.toLowerCase().endsWith('.lst');
							if (isListing) {
								if (activeEditor) {
									await debouncedListenToLstFiles({
										document: activeEditor.document,
									contentChanges: [],
									gamsView,
									state
								});
									const lstTree = state.get("lstTree");
									if (lstTree) {
										webviewView.webview.postMessage({
											command: "updateListing",
											data: { lstTree, isListing }
										});
									}
								}
							} else {
								if (activeEditor) {
									getSymbolUnderCursor({
										event: {
											textEditor: activeEditor,
											selections: activeEditor.selections,
										}, gamsDataView, state, gamsView
									});
								}
								const curSymbol = state.get<ReferenceSymbol>("curSymbol");
								if (curSymbol) {
									curSymbol.domain = curSymbol.domain?.map((domain: ReferenceSymbol) => ({ name: domain.name }));
									curSymbol.subsets = curSymbol.subsets?.map((subset: ReferenceSymbol) => ({ name: subset.name }));
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
	// no need to push gamsView directly; it is managed by VSCode lifecycle
	// add a command to open the gams reference tree sidebar
	context.subscriptions.push(
		vscode.commands.registerCommand("gams.openSidebar", () => {
			gamsView?.show();
		})
	);

	// gams data view
	function createGamsDataView(): vscode.WebviewViewProvider {
		return {
			resolveWebviewView(
				webviewView: vscode.WebviewView,
				_context: vscode.WebviewViewResolveContext<unknown>,
				_token: vscode.CancellationToken
			) {
				gamsDataView = webviewView;
				state.update("gamsDataView", gamsDataView);
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
					isDataParsingEnabled: !!vscode.workspace.getConfiguration("gamsIde").get("parseGamsData")
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
	const configChangeDisposable = vscode.workspace.onDidChangeConfiguration((e) => {
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
					updateDiagnostics({ document: editor.document, collection, state, terminal });
				}
			}
		} else if (e.affectsConfiguration("gamsIde.mainGmsFile") || e.affectsConfiguration("gamsIde.excludeFromMainGmsFile")) {
			updateStatusBar(gamsStatusBarItem);
			// re-run diagnostics
			const editor = vscode.window.activeTextEditor;
			if (editor && editor.document.languageId === "gams") {
				updateDiagnostics({ document: editor.document, collection, state, terminal });
			}
		} else if (e.affectsConfiguration("gamsIde.enableModelIncludeTreeView")) {
			if (vscode.workspace.getConfiguration("gamsIde").get("enableModelIncludeTreeView")) {
				const explorerInstance = new gamsIncludeExplorer(context, state);
				includeTreeProvider = {
					dispose() {
						if (typeof (explorerInstance as unknown as { dispose?: () => void }).dispose === 'function') {
							(explorerInstance as unknown as { dispose: () => void }).dispose();
						}
					}
				};
			} else {
				includeTreeProvider?.dispose();
				includeTreeProvider = undefined;
			}
		}
	});
	context.subscriptions.push(configChangeDisposable);
}

// this method is called when your extension is deactivated
export function deactivate() { }