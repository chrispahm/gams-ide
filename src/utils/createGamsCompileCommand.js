const vscode = require("vscode");
const { resolve, basename, dirname, parse, sep, isAbsolute } = require('path');
const fs = require("fs");
const getGamsPath = require('./getGamsPath.js')

module.exports = async function createGamsCommand(docFileName, extraArgs = []) {
  // get the default settings, and define the variables
  const defaultSettings = vscode.workspace.getConfiguration("gamsIde");
  let gamsExecutable = await getGamsPath();
  let scratchDirectory = defaultSettings.get("scratchDirectory");
  let multiFileEntryPoint = defaultSettings.get("multi_fileEntryPoint");
  let multiFileEntryPointFile = '';
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

  // check if there is a .gams-ide-settings.json file in the same folder, or in a parent folder
  let settingsFiles = [];

  if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length) {
    const pattern = new vscode.RelativePattern(vscode.workspace.workspaceFolders[0], `**/gams-ide-settings.json`);
    settingsFiles = await vscode.workspace.findFiles(pattern);
  }
  // check if a settingsFile exists, if so, read the seetings 
  // "Gams Executable", "Scratch directory", "Multi-file entry point", 
  // and "Command Line Arguments - Execution"
  // and use them to compile and execute the GAMS file
  if (settingsFiles?.length > 0) {
    console.log('settingsFiles', settingsFiles);
    
    const settings = JSON.parse(fs.readFileSync(settingsFiles[0].fsPath, 'utf8'));
    gamsExecutable = settings["Gams Executable"] || gamsExecutable;
    scratchDirectory = settings["Scratch directory"] || scratchDirectory;
    multiFileEntryPoint = settings["Multi-file entry point"] || multiFileEntryPoint;
    commandLineArguments = settings["Command Line Arguments - Compilation"] || commandLineArguments;
  }

  // if a multi-file entry point is specified, we try to find the file in the workspace
  console.log('multiFileEntryPoint', multiFileEntryPoint);
  
  if (multiFileEntryPoint && vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length) {
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
  
  if (multiFileEntryPointFile) {
    gamsFileToExecute = multiFileEntryPointFile;
  }
  // create a random string so that multiple linting processes don't delete each others files
  const randStr = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
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
  ]

  if (commandLineArguments?.length > 0) gamsArgs = gamsArgs.concat(commandLineArguments)
  if (extraArgs?.length > 0) gamsArgs = gamsArgs.concat(extraArgs)

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
  }
}