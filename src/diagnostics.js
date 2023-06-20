const vscode = require("vscode");
const { exec } = require('node:child_process');
const { readFile } = require("fs/promises");
const parseError = require("./utils/parseError.js");
const createRefTree = require("./utils/createRefTree.js");
const createGamsCompileCommand = require("./utils/createGamsCompileCommand.js");
// const gdx = require('node-gdx');
const createRefTreeWithSymbolValues = require("./createRefTreeWithSymbolValues.js");

function execAsync(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
        resolve({ error, stdout, stderr });
    });
  });
}

module.exports = async function updateDiagnostics(args) {
  const { 
    document, 
    collection, 
    state 
  } = args;
  
  if (document && collection) {    
    // get the compile statement for the current document
    const compileCommand = await createGamsCompileCommand(document, ["dumpopt=11"]);
    // run the compile command
    const command = `${compileCommand.gamsExe} ${compileCommand.gamsArgs.join(" ")}`;
    let res
    try {
      // run the compile command      
      res = await execAsync(command);
    } catch (error) {
      console.log("error");
    }    
    
    // get the output of the compile command
    if (!res) {
      return;
    }
    const stdout = res.stdout;
    const stderr = res.stderr;
    
    
    try {
      // parse the reference tree
      const referenceTree = await createRefTree(compileCommand.refPath);
      state.update("referenceTree", referenceTree);

      // parse the contents of the error file
      const errorFileContents = await readFile(compileCommand.errorPath, "utf8");
      // if there are no errors, reset the collection to no errors
      if (errorFileContents.split(/\n/).length <= 2) {
        collection.clear();
        // only parse symbol values if the according setting is enabled
        if (vscode.workspace.getConfiguration("gamsIde").get("parseSymbolValues")) {
          createRefTreeWithSymbolValues({
            file: compileCommand.dumpPath,
            scratchdir: compileCommand.scratchDirectory,
            gamsexe: compileCommand.gamsExe,
            state
          }).catch(err => {
            // console.log("error", err);
          });
        }        
       // return early
        return;
      }
      let errors = errorFileContents.split(/\r\n?|\n/).slice(1);
      const errorMessages = await Promise.all(
        errors
        .filter(err => err.length)
        .map((err, i) => parseError(err, i))
      )
      // error messages are for multiple files, 
      // so we group them by filename and set the collection accordingly
      const errorMessagesByFile = errorMessages.reduce((acc, err) => {
        if (!acc[err.errFile]) {
          acc[err.errFile] = [];
        }
        acc[err.errFile].push(err);
        return acc;
      }, {});
      Object.keys(errorMessagesByFile).forEach(file => {
        const uri = vscode.Uri.file(file);
        collection.set(uri, errorMessagesByFile[file]);
      });
      
      // and the gdx smybol container
      // TODO: re-enable once GAMS provides arm64 binaries
      // for macOS
      // const symbolValues = await gdx.read(compileCommand.gdxPath);
      // mutate reference tree with symbol values, we explicitly do not await 
      // this potentially long-running process in order to return the diagnostic
      // collection faster
      
      // open the Problems tab, and jump to the first error
      // if the user has the setting enabled
      // if (vscode.workspace.getConfiguration("gams").get("openProblemsTabOnCompile")) {
      vscode.commands.executeCommand("workbench.panel.markers.view.focus");
      if (errorMessages.length) {
        /*
        const firstError = errorMessages[0];
        const firstErrorUri = vscode.Uri.file(firstError.errFile);
        const firstErrorPosition = new vscode.Position(firstError.errLine - 1, firstError.errCol - 1);
        const firstErrorRange = new vscode.Range(firstErrorPosition, firstErrorPosition);
        vscode.window.showTextDocument(firstErrorUri, { selection: firstErrorRange });
        */
      }
      //}      
    } catch (error) {
      // show error in VS Code output
      console.log("error", stdout);      
    }
  } else {
    collection.clear();
  }
}