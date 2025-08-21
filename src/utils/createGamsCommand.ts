const vscode = require("vscode");
const fs = require("fs/promises");
const { resolve, basename, dirname, parse, sep, format, isAbsolute } = require('path');
const checkIfExcluded = require('./checkIfExcluded.js');
const getGamsPath = require('./getGamsPath.js');

export default async function createGamsCommand(docFileName, extraArgs = [], ignoreMainGmsFile = false) {
  // get the default settings, and define the variables
  const defaultSettings = vscode.workspace.getConfiguration("gamsIde");  
  let gamsExecutable = await getGamsPath();
  let scratchDirectory = defaultSettings.get("scratchDirectory");
  let mainGmsFile = defaultSettings.get("mainGmsFile");
  let mainGmsFilePath = '';
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
    try {
      await fs.access(scratchDirectory, fs.constants.R_OK | fs.constants.W_OK);
    } catch (e) {
      // no access to scratch directory, try to create it
      try {
        await fs.mkdir(scratchDirectory);
      } catch (error) {
        vscode.window.showErrorMessage("Error accessing scrdir: ", error.message);
      }
    }
  }
    
  // perform a quick check if the current file is excluded from the main GMS file
  if (!ignoreMainGmsFile && mainGmsFile) {
    ignoreMainGmsFile = checkIfExcluded(docFileName, defaultSettings.get("excludeFromMainGmsFile"));
  }
  // if a main GMS file is specified, we try to find the file in the workspace
  if (mainGmsFile && vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length && !ignoreMainGmsFile) {
    // check if main GMS file is a an absolute path
    if (!isAbsolute(mainGmsFile)) {
      // if not, we have to find the absolute path using glob and update the workspace settings accordingly
      const pattern = new vscode.RelativePattern(vscode.workspace.workspaceFolders[0], `**/${mainGmsFile}`);
      const files = await vscode.workspace.findFiles(pattern);

      if (files && files.length > 0) {
        mainGmsFilePath = files[0].fsPath;
        // update the workspace settings
        vscode.workspace.getConfiguration().update("gamsIde.mainGmsFile", mainGmsFilePath, vscode.ConfigurationTarget.Workspace);
      } else {
        // Show error message and button with link to settings
        const openSettings = 'Open Settings';
        const removeMainGmsFile = 'Remove main GMS file';
        await vscode.window.showErrorMessage(`main GMS file ${mainGmsFile} not found in workspace. Please update the workspace settings, or disable main GMS file.`, openSettings).then(selection => {
          if (selection === openSettings) {
            vscode.commands.executeCommand('workbench.action.openSettings', 'gamsIde.mainGmsFile');
          } else if (selection === removeMainGmsFile) {
            vscode.workspace.getConfiguration().update("gamsIde.mainGmsFile", "", vscode.ConfigurationTarget.Workspace);
          }
        });
      }
    }
    // check if the file exists, if not show buttons to either select main gams file or disable
    try {
      await fs.access(mainGmsFile, fs.constants.R_OK);
    } catch (e) {
      // Show error message and button with link to settings
      const selectMainGMS = 'Select main GMS file';
      const removeMainGmsFile = 'Remove main GMS file';
      await vscode.window.showErrorMessage(`Main GMS file ${mainGmsFile} not found in workspace. Please update the workspace settings, or disable main GMS file.`, selectMainGMS, removeMainGmsFile).then(selection => {
        if (selection === selectMainGMS) {
          vscode.commands.executeCommand('gams.selectMainGmsFile');
        } else if (selection === removeMainGmsFile) {
          vscode.workspace.getConfiguration().update("gamsIde.mainGmsFile", "", vscode.ConfigurationTarget.Workspace);
        }
      });
    }
    mainGmsFilePath = mainGmsFile;
    // overwrite the file name and path with the main GMS file    
    fileName = basename(mainGmsFilePath);
    filePath = dirname(mainGmsFilePath);
    // add specific command line arguments for multi-file execution
    // for known GAMS Models
    const gamsFile = parse(mainGmsFilePath).base;

    if (gamsFile === 'exp_starter.gms') {
      commandLineArguments = commandLineArguments.concat(
        [`--scen=incgen${sep}runInc`, '--ggig=on', '--baseBreed=falsemyBasBreed']
      );
    } else if (gamsFile === 'capmod.gms') {
      commandLineArguments = commandLineArguments.concat(
        ['--scen=fortran']
      );
    } else if (gamsFile === 'capreg.gms') {
      commandLineArguments = commandLineArguments.concat(
        ['--scen=forreg', '--ggig=on']
      );
    } else if (gamsFile === 'com_.gms') {
      commandLineArguments = commandLineArguments.concat(
        [`-procdirpath="${scratchDirectory}"`, '--scen=com_inc']
      );
    }
  }

  let gamsFileToExecute = docFileName;
  if (mainGmsFilePath && !ignoreMainGmsFile) {
    gamsFileToExecute = mainGmsFilePath;
  }

  let parsedListingPath = parse(gamsFileToExecute);
  parsedListingPath.ext = '.lst';
  parsedListingPath.base = '';
  
  let listingPath = format(parsedListingPath);
  
  let gamsArgs = [`"${gamsFileToExecute}"`, 'PS=0', `-scrdir="${scratchDirectory}"`,
    `--scrdir="${scratchDirectory}"`, `-workdir="${filePath}"`,
    `-curDir="${filePath}"`];
        
  if (commandLineArguments?.length > 0) gamsArgs = gamsArgs.concat(commandLineArguments);
  if (extraArgs?.length > 0) gamsArgs = gamsArgs.concat(extraArgs);
  
  return {
    gamsExe: gamsExecutable,
    gamsArgs: gamsArgs,
    listingPath: listingPath,
    gamsFile: fileName,
    filePath: filePath
  };
};