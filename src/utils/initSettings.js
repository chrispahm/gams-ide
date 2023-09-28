const vscode = require('vscode');
const fs = require('fs');

module.exports = async function initSettings(state) {
  // Get a list of all settings of the extension
  const settings = vscode.workspace.getConfiguration("gamsIde");
  let settingsFiles = [];

  // check if a gams-ide-settings.json file exists in the workspace
  if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length) {
    const pattern = new vscode.RelativePattern(vscode.workspace.workspaceFolders[0], `gams-ide-settings.json`);
    settingsFiles = await vscode.workspace.findFiles(pattern);
  }
  // check if a settingsFile exists, if so, read the seetings 
  // "Gams Executable", "Scratch directory", "Multi-file entry point", 
  // and "Command Line Arguments - Execution"
  // and use them to compile and execute the GAMS file
  if (settingsFiles?.length > 0) {
    const settingsFromFile = JSON.parse(fs.readFileSync(settingsFiles[0].fsPath, 'utf8'));
    vscode.workspace.getConfiguration("gamsIde").update("gamsExecutable", settings["Gams Executable"], true);
    vscode.workspace.getConfiguration("gamsIde").update("scratchDirectory", settings["Scratch directory"], true);
    vscode.workspace.getConfiguration("gamsIde").update("multi_fileEntryPoint", settings["Multi-file entry point"], true);
    vscode.workspace.getConfiguration("gamsIde").update("commandLineArguments_execution", settings["Command Line Arguments - Execution"], true);
    vscode.workspace.getConfiguration("gamsIde").update("commandLineArguments_compilation", settings["Command Line Arguments - Compilation"], true);
  }
};