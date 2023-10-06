const vscode = require("vscode");
const createGamsCommand = require("./utils/createGamsCommand.js");
const os = require("os");

async function openListing(listingPath) {
  const doc = await vscode.workspace.openTextDocument(listingPath);
  vscode.window.showTextDocument(doc);
}

module.exports = async function runGams(terminal, compileOnly = false, ignoreMultiFileEntryPoint = false) {
  const editor = vscode.window.activeTextEditor;
  if (editor && editor.document.languageId === "gams") {
    const document = editor.document;
    const gamsCommand = await createGamsCommand(document, ["lo=3", compileOnly ? "a=c" : ""], ignoreMultiFileEntryPoint);
    // if the terminal has been closed, create a new one
    if (terminal.exitStatus !== undefined) {
      terminal = vscode.window.createTerminal("GAMS");
    }
    // show the terminal        
    terminal.show(true);
    // clear the terminal before executing the GAMS file
    const clear = os.platform() === "win32" ? "cls" : "clear";
    terminal.sendText(clear);
    // push into the current directory before executing the GAMS file
    terminal.sendText(`cd ${gamsCommand.filePath}`);
    terminal.sendText(`${gamsCommand.gamsExe} ${gamsCommand.gamsArgs.join(" ")}`);
    // open the gams listing file right away
    // try to open the listing file
    // we try three times to open the listing file, with a timeout of 1 second
    // this is necessary because the listing file is not available immediately
    // after the GAMS file has been executed
    for (let i = 0; i < 3; i++) {
      try {        
        await openListing(gamsCommand.listingPath);
        break;
      } catch (error) {
        console.log(error);
        
        // wait for 1 second before trying again
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }
  }
}