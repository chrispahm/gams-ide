const vscode = require("vscode");
const fs = require("fs");
const { resolve, basename, dirname, parse, sep, format, isAbsolute } = require('path');
const checkIfExcluded = require('./checkIfExcluded.js');
const getGamsPath = require('./getGamsPath.js');

module.exports = async function createGamsCommand(docFileName, extraArgs = [], ignoreMultiFileEntryPoint = false) {
  // get the default settings, and define the variables
  const defaultSettings = vscode.workspace.getConfiguration("gamsIde");  
  let gamsExecutable = await getGamsPath();
  let scratchDirectory = defaultSettings.get("scratchDirectory");
  let multiFileEntryPoint = defaultSettings.get("multi_fileEntryPoint");
  let multiFileEntryPointFile = '';
  let commandLineArguments = defaultSettings.get(
    "commandLineArguments_execution"
  ) || [];
  let fileName = basename(docFileName);
  let filePath = dirname(docFileName);

  // if the scratch directory is not specified, we use 
  // this extension's scratch directory
  if (!scratchDirectory) {
    scratchDirectory = resolve(__dirname + '/../scrdir');
    // check if the scratch directory exists, if not, create it
    if (!fs.existsSync(scratchDirectory)) {
      try {
        fs.mkdirSync(scratchDirectory);
      } catch (error) {
        console.log(error);
        vscode.window.showErrorMessage(error.message);
      }
    }
  }
    
  // perform a quick check if the current file is excluded from the multi-file entry point
  if (!ignoreMultiFileEntryPoint && multiFileEntryPoint) {
    ignoreMultiFileEntryPoint = checkIfExcluded(docFileName, defaultSettings.get("excludeFromMultiFileEntryPoint"));
  }
  // if a multi-file entry point is specified, we try to find the file in the workspace
  if (multiFileEntryPoint && vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length && !ignoreMultiFileEntryPoint) {
    // check if multi-file entry point is a an absolute path
    if (!isAbsolute(multiFileEntryPoint)) {
      // if not, we have to find the absolute path using glob and update the workspace settings accordingly
      const pattern = new vscode.RelativePattern(vscode.workspace.workspaceFolders[0], `**/${multiFileEntryPoint}`);
      const files = await vscode.workspace.findFiles(pattern);

      if (files && files.length > 0) {
        multiFileEntryPointFile = files[0].fsPath;
        // update the workspace settings
        vscode.workspace.getConfiguration().update("gamsIde.multi_fileEntryPoint", multiFileEntryPointFile, vscode.ConfigurationTarget.Workspace);
      } else {
        // Show error message and button with link to settings
        const openSettings = 'Open Settings';
        const removeMultiFileEntry = 'Remove multi-file entry point';
        await vscode.window.showErrorMessage(`Multi-file entry point ${multiFileEntryPoint} not found in workspace. Please update the workspace settings, or disable multi-file entry point.`, openSettings).then(selection => {
          if (selection === openSettings) {
            vscode.commands.executeCommand('workbench.action.openSettings', '@ext:GAMS.gams-ide multi_fileEntryPoint');
          } else if (selection === removeMultiFileEntry) {
            vscode.workspace.getConfiguration().update("gamsIde.multi_fileEntryPoint", "", vscode.ConfigurationTarget.Workspace);
          }
        });
      }
    }
    multiFileEntryPointFile = multiFileEntryPoint;
    // overwrite the file name and path with the multi-file entry point    
    fileName = basename(multiFileEntryPointFile);
    filePath = dirname(multiFileEntryPointFile);
    // add specific command line arguments for multi-file execution
    // for known GAMS Models
    const gamsFile = parse(multiFileEntryPointFile).base

    if (gamsFile === 'exp_starter.gms') {
      commandLineArguments = commandLineArguments.concat(
        [`--scen=incgen${sep}runInc`, '--ggig=on', '--baseBreed=falsemyBasBreed']
      )
    } else if (gamsFile === 'capmod.gms') {
      commandLineArguments = commandLineArguments.concat(
        [`-scrdir="${scratchDirectory}"`, '--scen=fortran']
      )
    } else if (gamsFile === 'com_.gms') {
      commandLineArguments = commandLineArguments.concat(
        [`-procdirpath="${scratchDirectory}"`, '--scen=com_inc']
      )
    }
  }

  let gamsFileToExecute = docFileName;
  if (multiFileEntryPointFile && !ignoreMultiFileEntryPoint) {
    gamsFileToExecute = multiFileEntryPointFile;
  }

  let parsedListingPath = parse(gamsFileToExecute);
  parsedListingPath.ext = '.lst';
  parsedListingPath.base = '';
  
  let listingPath = format(parsedListingPath);
  
  let gamsArgs = [`"${gamsFileToExecute}"`, 'PS=0', `-scrdir="${scratchDirectory}"`,
    `--scrdir="${scratchDirectory}"`, `-workdir="${filePath}"`,
    `-curDir="${filePath}"`]
    
  if (commandLineArguments?.length > 0) gamsArgs = gamsArgs.concat(commandLineArguments)
  if (extraArgs?.length > 0) gamsArgs = gamsArgs.concat(extraArgs)
  
  return {
    gamsExe: gamsExecutable,
    gamsArgs: gamsArgs,
    listingPath: listingPath,
    gamsFile: fileName,
    filePath: filePath
  }
}