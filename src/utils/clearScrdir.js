const vscode = require("vscode");
const { resolve } = require("path");
const fs = require("fs/promises");

module.exports = async function clearScrdir() {
  const config = vscode.workspace.getConfiguration("gamsIde");
  let scratchDirectory = config.get("scratchDirectory");
  if (!scratchDirectory) {    
    scratchDirectory = resolve(__dirname + '/../scrdir');
    let scratchDirectoryExists = false;
    try {
      await fs.access(scratchDirectory);
      scratchDirectoryExists = true;
    } catch (error) {
      console.log(error);
    }
    if (!scratchDirectoryExists) {
      try {
        await fs.mkdir(scratchDirectory);
      } catch (error) {
        console.log(error);
        vscode.window.showErrorMessage(error.message);
      }
    }
  }
  
  const files = await fs.readdir(scratchDirectory);

  for (const file of files) {
    try {
      await fs.unlink(`${scratchDirectory}/${file}`);
    } catch (error) {
      console.log(error);
      vscode.window.showErrorMessage("Could not delete file " + file);
    }
  }
}