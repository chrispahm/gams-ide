import * as vscode from 'vscode';
import { resolve } from 'path';
import * as fs from 'fs/promises';

export default async function clearScrdir(): Promise<void> {
  const config = vscode.workspace.getConfiguration("gamsIde");
  let scratchDirectory = config.get<string | undefined>("scratchDirectory");
  if (!scratchDirectory) {    
    scratchDirectory = resolve(__dirname + '/../scrdir');
    let scratchDirectoryExists = false;
    try {
      await fs.access(scratchDirectory);
      scratchDirectoryExists = true;
    } catch (error) {
      console.error("error in clearScrdir: ", error);
    }
    if (!scratchDirectoryExists) {
      try {
        await fs.mkdir(scratchDirectory as string);
      } catch (error) {
        console.error("error in clearScrdir: ", error);
        if (error instanceof Error) {
          vscode.window.showErrorMessage("Error in clearScrdir: " + error.message);
        }
      }
    }
  }
  
  const files = await fs.readdir(scratchDirectory);

  for (const file of files) {
    try {
      await fs.rm(`${scratchDirectory}/${file}`, { force: true, recursive: true });
    } catch (error) {
      console.error("error in clearScrdir: ", error);
      vscode.window.showErrorMessage("Could not delete file " + file);
    }
  }
};