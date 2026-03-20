import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import { resolve, basename, dirname, parse, format, isAbsolute } from 'path';
import checkIfExcluded from './checkIfExcluded';
import getGamsPath from './getGamsPath';
import { getGgigCommand, type ShellType } from '../ggig/index';

function detectShell(): ShellType {
  return process.platform === 'win32' ? 'cmd' : 'bash';
}

interface GamsCommandResult {
  gamsExe: string;
  gamsArgs: string[];
  listingPath: string;
  gamsFile: string;
  filePath: string;
}

export default async function createGamsCommand(docFileName: string, extraArgs: string[] = [], ignoreMainGmsFile = false): Promise<GamsCommandResult> {
  // Check if this is a GGIG project — if so, use the XML+INI-based command builder
  if (!ignoreMainGmsFile && vscode.workspace.workspaceFolders?.length) {
    const settings = vscode.workspace.getConfiguration("gamsIde");
    const explicitIni = settings.get<string>("ggigIniFile");
    const explicitXml = settings.get<string>("ggigXmlFile");
    const execArgs = settings.get<string[]>("commandLineArguments_execution") || [];
    const allExtraArgs = [...execArgs, ...extraArgs];

    for (const folder of vscode.workspace.workspaceFolders) {
      try {
        const ggigOpts = (explicitIni && explicitXml)
          ? { iniPath: explicitIni, xmlPath: explicitXml, extraArgs: allExtraArgs }
          : (allExtraArgs.length ? { extraArgs: allExtraArgs } : undefined);
        const ggigSpec = await getGgigCommand(folder.uri.fsPath, 'execute', detectShell(), ggigOpts);
        if (ggigSpec) {
          const args = [...ggigSpec.args];
          return {
            gamsExe: ggigSpec.executable,
            gamsArgs: args,
            listingPath: ggigSpec.listingFile,
            gamsFile: basename(ggigSpec.args[0]?.replace(/^"(.*)"$/, '$1') ?? docFileName),
            filePath: ggigSpec.workDir,
          };
        }
      } catch {
        // GGIG detection failed, fall through to standard behavior
      }
    }
  }

  // Standard (non-GGIG) behavior
  const defaultSettings = vscode.workspace.getConfiguration("gamsIde");
  let gamsExecutable = await getGamsPath() as string;
  let scratchDirectory = defaultSettings.get<string | undefined>("scratchDirectory");
  let mainGmsFile = defaultSettings.get<string | undefined>("mainGmsFile");
  let mainGmsFilePath = '';
  let commandLineArguments = defaultSettings.get(
    "commandLineArguments_execution"
  ) || [];
  let fileName = basename(docFileName);
  let filePath = dirname(docFileName);

  if (!scratchDirectory) {
    scratchDirectory = resolve(__dirname + '/../scrdir');
    try {
      await fs.access(scratchDirectory, fs.constants.R_OK | fs.constants.W_OK);
    } catch (e) {
      try {
        await fs.mkdir(scratchDirectory as string);
      } catch (error) {
        if (error instanceof Error) {
          vscode.window.showErrorMessage("Error accessing scrdir: " + error.message);
        }
      }
    }
  }

  if (!ignoreMainGmsFile && mainGmsFile) {
    ignoreMainGmsFile = checkIfExcluded(docFileName, defaultSettings.get("excludeFromMainGmsFile")) ? true : false;
  }
  if (mainGmsFile && vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length && !ignoreMainGmsFile) {
    if (mainGmsFile && !isAbsolute(mainGmsFile)) {
      const pattern = new vscode.RelativePattern(vscode.workspace.workspaceFolders[0], `**/${mainGmsFile}`);
      const files = await vscode.workspace.findFiles(pattern);

      if (files && files.length > 0) {
        mainGmsFilePath = files[0].fsPath;
        vscode.workspace.getConfiguration().update("gamsIde.mainGmsFile", mainGmsFilePath, vscode.ConfigurationTarget.Workspace);
      } else {
        const openSettings = 'Open Settings';
        await vscode.window.showErrorMessage(`main GMS file ${mainGmsFile} not found in workspace. Please update the workspace settings, or disable main GMS file.`, openSettings).then((selection: string | undefined) => {
          if (selection === openSettings) {
            vscode.commands.executeCommand('workbench.action.openSettings', 'gamsIde.mainGmsFile');
          }
        });
      }
    }
    try {
      await fs.access(mainGmsFile as string, fs.constants.R_OK);
    } catch (e) {
      const selectMainGMS = 'Select main GMS file';
      const removeMainGmsFile = 'Remove main GMS file';
      await vscode.window.showErrorMessage(`Main GMS file ${mainGmsFile} not found in workspace. Please update the workspace settings, or disable main GMS file.`, selectMainGMS, removeMainGmsFile).then((selection: string | undefined) => {
        if (selection === selectMainGMS) {
          vscode.commands.executeCommand('gams.selectMainGmsFile');
        } else if (selection === removeMainGmsFile) {
          vscode.workspace.getConfiguration().update("gamsIde.mainGmsFile", "", vscode.ConfigurationTarget.Workspace);
        }
      });
    }
    mainGmsFilePath = mainGmsFile as string;
    fileName = basename(mainGmsFilePath);
    filePath = dirname(mainGmsFilePath);
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

  if (Array.isArray(commandLineArguments) && commandLineArguments.length > 0) { gamsArgs = gamsArgs.concat(commandLineArguments); }
  if (extraArgs?.length > 0) { gamsArgs = gamsArgs.concat(extraArgs); }

  return {
    gamsExe: gamsExecutable,
    gamsArgs: gamsArgs,
    listingPath: listingPath,
    gamsFile: fileName,
    filePath: filePath
  };
};