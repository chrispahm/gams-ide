const vscode = require("vscode");
const { dirname, format, parse } = require("node:path");
const { exec } = require('node:child_process');
const { readFile, access } = require("fs/promises");
const parseError = require("./utils/parseError.js");
const createRefTree = require("./utils/createRefTree.js");
const createGamsCompileCommand = require("./utils/createGamsCompileCommand.js");
// const gdx = require('node-gdx')();
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
    state,
    terminal
  } = args;

  const shouldParseSymbolValues = vscode.workspace.getConfiguration("gamsIde").get("parseSymbolValues")

  if (document && collection) {
    // get the compile statement for the current document
    const compileCommand = await createGamsCompileCommand(document, [shouldParseSymbolValues ? "dumpopt=11" : ""]);
    // run the compile command
    const command = `${compileCommand.gamsExe} ${compileCommand.gamsArgs.join(" ")}`;
    console.log("compileCommand", compileCommand, command);
    let res
    try {
      // run the compile command      
      res = await execAsync(command);
    } catch (error) {
      // show error in VS Code output
      // and add button to open the lst file
      vscode.window.showErrorMessage("GAMS compilation failed: " + command + " -> " + error);
      console.log("error");
    }

    // get the output of the compile command
    if (!res) {
      // show error in VS Code output
      vscode.window.showErrorMessage("GAMS compilation failed: " + command);
      return;
    } else if (res.error) {
      // show error in VS Code output
      // vscode.window.showErrorMessage("GAMS compilation failed: Check the GAMS output in the terminal");
      // terminal?.show(true);
      // terminal?.sendText(command);
      // console.log("error", res.error);
      // return;
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
        if (shouldParseSymbolValues) {
          // and the gdx smybol container
          // we mutate the  reference tree with symbol values, and explicitly do not await
          // this potentially long-running process in order to return the diagnostic
          // collection faster
          /*
          gdx.read(compileCommand.gdxPath, null, dirname(compileCommand.gamsExe)).then((symbolValues) => {            
            Object.keys(symbolValues).forEach(symbolName => {
              const matchingRef = referenceTree?.find((item) => item.name?.toLowerCase() === symbolName.toLowerCase());
              if (matchingRef && symbolValues[symbolName][0]) {
                const domain = Object.keys(symbolValues[symbolName][0]);
                if (!matchingRef.data) {
                  matchingRef.data = {};
                }
                matchingRef.data[`line_0`] = table(symbolValues[symbolName].reduce((acc, item) => {
                  acc.push(Object.values(item));
                  return acc;
                }, [domain]));                
              }
            });
            
          }).catch(err => {
            console.log("error", err);
          });
          */
          createRefTreeWithSymbolValues({
            file: compileCommand.dumpPath,
            scratchdir: compileCommand.scratchDirectory,
            gamsexe: compileCommand.gamsExe,
            state
          }).catch(err => {
            // show error in VS Code output
            // and add button to open the dmp file
            vscode.window.showErrorMessage("Error creating GAMS symbols: " + err, "Open DMP lst", "Open scrdir", "Disable symbol parsing").then((value) => {
              if (value === "Open DMP lst") {
                vscode.workspace.openTextDocument(format({ ...parse(compileCommand.dumpPath), base: '', ext: '.lst' })).then((doc) => {
                  vscode.window.showTextDocument(doc);
                });
              } else if (value === "Open scrdir") {
                // open scrdir in explorer/finder                
                vscode.env.openExternal(vscode.Uri.file(compileCommand.scratchDirectory));
              } else if (value === "Disable symbol parsing") {
                vscode.workspace.getConfiguration("gamsIde").update("parseSymbolValues", false);
              }
            });
            console.log("error", err);
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

      // open the Problems tab, and jump to the first error
      // if the user has the setting enabled
      // if (vscode.workspace.getConfiguration("gams").get("openProblemsTabOnCompile")) {
      // vscode.commands.executeCommand("workbench.panel.markers.view.focus");
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
      // and add button to open the lst file
      // check if the listing file exists
      let lstExists = false;
      try {
        await access(compileCommand.listingPath);
        lstExists = true;
      } catch (error) {
        lstExists = false;
      }
      if (lstExists) {
        vscode.window.showErrorMessage("GAMS compilation failed! " + command + "->" + error, "Open lst file").then((value) => {
          if (value === "Open lst file") {
            // open lst file, or show error if it does not exist
            vscode.workspace.openTextDocument(compileCommand.listingPath)
              .then((doc) => {
                vscode.window.showTextDocument(doc);
              })
          }
        });
      } else {
        vscode.window.showErrorMessage("GAMS compilation failed! Check the GAMS output in the terminal. Stdout:" + stdout, );
        // focus on the terminal, and send the gams command to the terminal
        terminal?.show(true);
        terminal?.sendText(command);
      }
      console.log("res", res);
      console.log("error", error);
      console.log("stdout", stdout);
    }
  } else {
    collection.clear();
  }
}