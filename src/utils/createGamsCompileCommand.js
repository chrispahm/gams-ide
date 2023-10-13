const vscode = require("vscode");
const { resolve, basename, dirname, parse, sep, isAbsolute } = require('path');
const fs = require("fs");
const getGamsPath = require('./getGamsPath.js');
const checkIfExcluded = require('./checkIfExcluded.js');

module.exports = async function createGamsCommand(docFileName, extraArgs = []) {
  // get the default settings, and define the variables
  const defaultSettings = vscode.workspace.getConfiguration("gamsIde");
  let gamsExecutable = await getGamsPath();
  let scratchDirectory = defaultSettings.get("scratchDirectory");
  let mainGmsFile = defaultSettings.get("mainGmsFile");
  let mainGmsFilePath = '';
  let commandLineArguments = defaultSettings.get(
    "commandLineArguments_compilation"
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

  let ignoreMainGmsFile = false;
  if (mainGmsFile) {
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
        [`-scrdir="${scratchDirectory}"`, '--scen=fortran']
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
  // create a random string so that multiple linting processes don't delete each others files
  const randStr = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  let randBasePath = `${scratchDirectory}${sep}${randStr}`;

  let gamsArgs = [
    `"${gamsFileToExecute}"`, 'LO=3', "a=c", 
    `o="${randBasePath}.lst"`, 
    `fErr="${randBasePath}.err"`,
    `rf="${randBasePath}.ref"`,
    `gdx="${randBasePath}.gdx"`,
    `-scrdir="${scratchDirectory}"`,
    `--scrdir="${scratchDirectory}"`, 
    `-workdir="${filePath}"`,
    `-curDir="${filePath}"`
  ];

  if (commandLineArguments?.length > 0) gamsArgs = gamsArgs.concat(commandLineArguments);
  if (extraArgs?.length > 0) gamsArgs = gamsArgs.concat(extraArgs);

  return {
    gamsExe: gamsExecutable,
    gamsArgs: gamsArgs,
    listingPath: randBasePath + '.lst',
    gdxPath: randBasePath + '.gdx',
    errorPath: randBasePath + '.err',
    refPath: randBasePath + '.ref',
    dumpPath: randBasePath + '.dmp',
    scratchDirectory: scratchDirectory,
    gamsFile: fileName,
    filePath: filePath
  };
};