const vscode = require("vscode");
const { format, parse } = require("node:path");
const { exec } = require('node:child_process');
const { readFile, access, unlink } = require("fs/promises");
const parseError = require("./utils/parseError.js");
const createRefTree = require("./utils/createRefTree.js");
const createGamsCompileCommand = require("./utils/createGamsCompileCommand.js");
// const gdx = require('node-gdx')();
const createRefTreeWithSymbolValues = require("./createRefTreeWithSymbolValues.js");
const { parseIncludeFileSummary } = require("./createIncludeTree.js");

function execAsync(command) {
  return new Promise((resolve) => {
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

  const shouldParseGamsData = vscode.workspace.getConfiguration("gamsIde").get("parseGamsData");

  if (document && collection) {
    // get the compile statement for the current document
    const compileCommand = await createGamsCompileCommand(document.fileName, [shouldParseGamsData ? "dumpopt=11" : ""]);
    // run the compile command
    const command = `${compileCommand.gamsExe} ${compileCommand.gamsArgs.join(" ")}`;
    let res;
    try {
      // run the compile command      
      res = await execAsync(command);
    } catch (error) {
      // show error in VS Code output
      // and add button to open the lst file
      vscode.window.showErrorMessage("GAMS compilation failed: " + command + " -> " + error);
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
      // return;
    }
    const stdout = res.stdout;
    // const stderr = res.stderr; // sterr is always emtpy as GAMS writes errors to stdout

    try {
      // parse the reference tree
      const referenceTree = await createRefTree(compileCommand.refPath);
      state.update("referenceTree", referenceTree);

      // parse the contents of the error file
      const errorFileContents = await readFile(compileCommand.errorPath, "utf8");
      // delete the error file, but do not wait for it
      unlink(compileCommand.errorPath);
      // if include parsing is enabled, parse the include file summary
      parseIncludeFileSummary(compileCommand.listingPath, state).then(({ includeFileSummary, compileTimeVariables }) => {        
        state.update("parsedIncludes", includeFileSummary);
        state.update("compileTimeVariables", compileTimeVariables);
        // call the refresh command on the include tree view
        if (includeFileSummary.length > 0) {
          vscode.commands.executeCommand("gams.refreshIncludeTree");
        }
        // delete the lst file, but do not wait for it
        unlink(compileCommand.listingPath);
      }).catch(err => {
        console.error("error", err);
      });

      // if there are no errors, reset the collection to no errors
      if (errorFileContents.split(/\n/).length <= 2) {
        collection.clear();
        // only parse symbol values if the according setting is enabled
        if (shouldParseGamsData) {
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
            console.error("error", err);
          });
          */
          createRefTreeWithSymbolValues({
            file: compileCommand.dumpPath,
            scratchdir: compileCommand.scratchDirectory,
            gamsexe: compileCommand.gamsExe,
            state
          }).then(() => {
            // call the refresh command on the include tree view
            vscode.commands.executeCommand("gams.getSymbolUnderCursor");
            // delete the dmp lst file, but do not wait for it
            unlink(compileCommand.dumpPath + ".lst");
          }).catch(err => {
            // show error in VS Code output
            // and add button to open the dmp file
            if (!state.get("ignoreDataValueParsingError")) {
              vscode.window.showWarningMessage("GAMS Data Parsing: " + err + ".\nClick 'Hide error' to hide for this session.", "Hide error", "Disable data parsing", "Open DMP .lst").then((value) => {
                if (value === "Open DMP .lst") {
                  vscode.workspace.openTextDocument(format({ ...parse(compileCommand.dumpPath), base: '', ext: '.gms.lst' })).then((doc) => {
                    vscode.window.showTextDocument(doc);
                  });
                } else if (value === "Disable data parsing") {
                  vscode.workspace.getConfiguration("gamsIde").update("parseGamsData", false);
                } else if (value === "Hide error") {
                  state.update("ignoreDataValueParsingError", true);
                }
              });
              console.error("error", err);
            } else {
              // delete the dmp lst file, but do not wait for it
              unlink(compileCommand.dumpPath + ".lst");
            }
            vscode.commands.executeCommand("gams.getSymbolUnderCursor");
          });
        }
        // return early
        return;
      }
      let errors = errorFileContents.split(/\r\n?|\n/).slice(1);
      // get max errors to display from settings
      const maxErrorsToDisplay = vscode.workspace.getConfiguration("gamsIde").get("maxErrorsToDisplay");
      if (maxErrorsToDisplay > 0) {
        errors = errors.slice(0, maxErrorsToDisplay);
      }
      const errorMessages = await Promise.all(
        errors
          .filter(err => err.length)
          .map((err, i) => parseError(err, i))
      );
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
              });
          }
        });
      } else {
        vscode.window.showErrorMessage("GAMS compilation failed! Check the GAMS output in the terminal. Stdout:" + stdout,);
        // focus on the terminal, and send the gams command to the terminal
        terminal?.show(true);
        terminal?.sendText(command);
      }
      console.warn("res", res);
      console.error("error", error);
      console.warn("stdout", stdout);
    }
  } else {
    collection.clear();
  }
};