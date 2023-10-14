const checkIfExcluded = require('./checkIfExcluded');
const path = require('path');
const vscode = require('vscode');

module.exports = function updateStatusBar(gamsStatusBarItem) {
  const file = vscode.window.activeTextEditor?.document.fileName;
  const mainGmsFile = vscode.workspace.getConfiguration('gamsIde').get('mainGmsFile');
  const excludedFiles = vscode.workspace.getConfiguration('gamsIde').get('excludeFromMainGmsFile');
  const fileIsExcluded = checkIfExcluded(file, excludedFiles);
  const languageId = vscode.window.activeTextEditor?.document.languageId;
  if (languageId !== 'gams') {
    gamsStatusBarItem.hide();
  } else if (fileIsExcluded && mainGmsFile) {
    gamsStatusBarItem.text = `Main GMS: File is excluded`;
    // open workspace settings.json -> excludeFromMainGmsFile
    gamsStatusBarItem.command = 'workbench.action.openWorkspaceSettingsFile';
    gamsStatusBarItem.show();
  } else if (mainGmsFile) {
    gamsStatusBarItem.text = `Main GMS: ${path.basename(mainGmsFile)}`;
    // open settings for mainGmsFile
    gamsStatusBarItem.command = 'gams.selectMainGmsFile';
    gamsStatusBarItem.show();
  } else {
    gamsStatusBarItem.hide();
  }
};