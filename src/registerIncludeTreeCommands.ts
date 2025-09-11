import * as vscode from 'vscode';
import State from './State';
const includeTypes = [
  "EXIT",
  "INCLUDE",
  "BATINCLUDE",
  "LIBINCLUDE",
  "SYSINCLUDE",
  "CALL",
  "CALL.ASYNC",
  "CALL.TOOL",
  "GDXIN",
  "GDXOUT",
  "IF_EXIST",
  "IF_DEXIST",
  "FUNCLIBIN",
  "TERMINATE",
  "STOP"
];

interface HideFileNode { resourceUri: vscode.Uri; }

export default function registerIncludeTreeCommands(context: vscode.ExtensionContext, state: State) {
  includeTypes.forEach(type => {
    context.subscriptions.push(
      vscode.commands.registerCommand(`gams.modelTree.hide${type}`, () => {
        vscode.commands.executeCommand('setContext', `gamsIde:modelTreeIsHidden${type}`, true);
        state.update(`modelTreeIsHidden${type}`, true);
        vscode.commands.executeCommand('gams.refreshIncludeTree');
      })
    );
    context.subscriptions.push(
      vscode.commands.registerCommand(`gams.modelTree.show${type}`, () => {
        vscode.commands.executeCommand('setContext', `gamsIde:modelTreeIsHidden${type}`, false);
        state.update(`modelTreeIsHidden${type}`, false);
        vscode.commands.executeCommand('gams.refreshIncludeTree');
      })
    );
  });

  context.subscriptions.push(
    vscode.commands.registerCommand(`gams.modelTree.hideFile`, (node: HideFileNode) => {
      console.log("shouldhide", node.resourceUri);
      const existing = state.get<string[]>("ignoreFilesIncludeTree") || [];
      existing.push(node.resourceUri.fsPath);
      state.update("ignoreFilesIncludeTree", existing);
      vscode.commands.executeCommand('gams.refreshIncludeTree');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(`gams.modelTree.resetHiddenFiles`, () => {
      state.update("ignoreFilesIncludeTree", []);
      vscode.commands.executeCommand('gams.refreshIncludeTree');
    })
  );
};