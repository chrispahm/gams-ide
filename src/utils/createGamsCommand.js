const vscode = require("vscode");
const { resolve, basename, dirname, parse, sep, format } = require('path');
const getGamsPath = require('./getGamsPath.js')

module.exports = async function createGamsCommand(document, extraArgs = []) {
  // get the default settings, and define the variables
  const defaultSettings = vscode.workspace.getConfiguration("gamsIde");  
  let gamsExecutable = await getGamsPath();
  let scratchDirectory = defaultSettings.get("scratchDirectory");
  let multiFileEntryPoint = defaultSettings.get("multi_fileEntryPoint");
  let multiFileEntryPointFile = '';
  let commandLineArguments = defaultSettings.get(
    "commandLineArguments_execution"
  ) || [];
  let fileName = basename(document.fileName);
  let filePath = dirname(document.fileName);

  // if the scratch directory is not specified, we use 
  // this extension's scratch directory
  if (!scratchDirectory) {
    scratchDirectory = resolve(__dirname + '/../../scrdir');
  }

  // check if there is a .gams-ide-settings.json file in the same folder, or in a parent folder
  const pattern = new vscode.RelativePattern(vscode.workspace.workspaceFolders[0], `**/.gams-ide-settings.json`);
  const settingsFiles = await vscode.workspace.findFiles(pattern);
  
  // check if a settingsFile exists, if so, read the seetings 
  // "Gams Executable", "Scratch directory", "Multi-file entry point", 
  // and "Command Line Arguments - Execution"
  // and use them to compile and execute the GAMS file
  if (settingsFiles?.length > 0) {
    const settings = require(settingsFiles[0].fsPath);
    gamsExecutable = settings["Gams Executable"] || gamsExecutable;
    scratchDirectory = settings["Scratch directory"] || scratchDirectory;
    multiFileEntryPoint = settings["Multi-file entry point"] || multiFileEntryPoint;
    commandLineArguments = settings["Command Line Arguments - Execution"] || commandLineArguments;
  }
  
  // if a multi-file entry point is specified, we try to find the file in the workspace
  if (multiFileEntryPoint) {
    const pattern = new vscode.RelativePattern(vscode.workspace.workspaceFolders[0], `**/${multiFileEntryPoint}`);
    const files = await vscode.workspace.findFiles(pattern);
    
    if (files && files.length > 0) {
      multiFileEntryPointFile = files[0].fsPath;
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
  }

  let gamsFileToExecute = document.fileName;
  if (multiFileEntryPointFile) {
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