const vscode = require('vscode');
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

export default function registerIncludeTreeCommands(context, state) {
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
    vscode.commands.registerCommand(`gams.modelTree.hideFile`, (node) => {
      console.log("shouldhide", node.resourceUri);
      let ignoreFiles = state.get("ignoreFilesIncludeTree");
      if (!ignoreFiles) {
        ignoreFiles = [];
      }
      ignoreFiles.push(node.resourceUri.fsPath);
      state.update("ignoreFilesIncludeTree", ignoreFiles);
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