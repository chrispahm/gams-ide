import * as path from 'path';
import * as vscode from 'vscode';
import checkIfExcluded from './checkIfExcluded';

export default function updateStatusBar(gamsStatusBarItem: vscode.StatusBarItem): void {
  const file = vscode.window.activeTextEditor?.document.fileName;
  const mainGmsFile = vscode.workspace.getConfiguration('gamsIde').get('mainGmsFile');
  const excludedFiles = vscode.workspace.getConfiguration('gamsIde').get('excludeFromMainGmsFile') as string[] | undefined;
  const fileIsExcluded = file ? checkIfExcluded(file, excludedFiles || []) : false;
  const languageId = vscode.window.activeTextEditor?.document.languageId;
  if (languageId !== 'gams') {
    gamsStatusBarItem.hide();
  } else if (fileIsExcluded && mainGmsFile) {
    gamsStatusBarItem.text = `Main GMS: File is excluded`;
    // open workspace settings.json -> excludeFromMainGmsFile
    gamsStatusBarItem.command = 'workbench.action.openWorkspaceSettingsFile';
    gamsStatusBarItem.show();
  } else if (typeof mainGmsFile === 'string' && mainGmsFile) {
    gamsStatusBarItem.text = `Main GMS: ${path.basename(mainGmsFile)}`;
    // open settings for mainGmsFile
    gamsStatusBarItem.command = 'gams.selectMainGmsFile';
    gamsStatusBarItem.show();
  } else {
    gamsStatusBarItem.hide();
  }
};