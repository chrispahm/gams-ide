const vscode = require("vscode");
const { resolve } = require("path");
const fs = require("fs/promises");

module.exports = async function clearScrdir() {
  const config = vscode.workspace.getConfiguration("gamsIde");
  let scratchDirectory = config.get("scratchDirectory");
  if (!scratchDirectory) {
    scratchDirectory = resolve(__dirname + '/../../scrdir');
  }
  
  const files = await fs.readdir(scratchDirectory);

  for (const file of files) {
    try {
      await fs.unlink(`${scratchDirectory}/${file}`);
    } catch (error) {
      console.log(error);
    }
  }
}