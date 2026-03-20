import * as vscode from 'vscode';
import { resolve, basename, dirname, parse, sep, isAbsolute } from 'path';
import * as fs from 'fs/promises';
import getGamsPath from './getGamsPath.js';
import checkIfExcluded from './checkIfExcluded.js';
import { getGgigCommand, type ShellType } from '../ggig/index';

function detectShell(): ShellType {
  return process.platform === 'win32' ? 'cmd' : 'bash';
}

interface CompileGamsCommandResult {
  gamsExe: string;
  gamsArgs: string[];
  listingPath: string;
  gdxPath: string;
  errorPath: string;
  refPath: string;
  dumpPath: string;
  scratchDirectory: string;
  gamsFile: string;
  filePath: string;
}

export default async function createGamsCommand(docFileName: string, extraArgs: string[] = []): Promise<CompileGamsCommandResult> {
  // Check if this is a GGIG project — if so, use the XML+INI-based command builder for compile mode
  if (vscode.workspace.workspaceFolders?.length) {
    const settings = vscode.workspace.getConfiguration("gamsIde");
    const explicitIni = settings.get<string>("ggigIniFile");
    const explicitXml = settings.get<string>("ggigXmlFile");
    const compileArgs = settings.get<string[]>("commandLineArguments_compilation") || [];
    const allExtraArgs = [...compileArgs, ...extraArgs];

    for (const folder of vscode.workspace.workspaceFolders) {
      try {
        const ggigOpts = (explicitIni && explicitXml)
          ? { iniPath: explicitIni, xmlPath: explicitXml, extraArgs: allExtraArgs }
          : (allExtraArgs.length ? { extraArgs: allExtraArgs } : undefined);
        const ggigSpec = await getGgigCommand(folder.uri.fsPath, 'compile', detectShell(), ggigOpts);
        if (ggigSpec) {
          // For compile mode, we still use the compile.gms wrapper but with GGIG-resolved paths
          const gamsExecutable = ggigSpec.executable;
          const scratchDirectory = resolve(ggigSpec.workDir, '../output/temp');
          const randStr = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
          const randBasePath = `${scratchDirectory}${sep}${randStr}`;
          const compileGamsFilePath = `${__dirname}${sep}compile.gms`;
          const gamsFilePath = ggigSpec.args[0]?.replace(/^"(.*)"$/, '$1') ?? docFileName;

          // Extract GGIG-specific args (skip gamsFile, -a=c, -o=, -ef=, -rf= as compile wrapper handles those)
          const ggigArgs = ggigSpec.args.filter((a, i) => {
            if (i === 0) return false; // skip gamsFile (first arg)
            const al = a.toLowerCase();
            // Skip args that the compile wrapper handles itself
            if (al.startsWith('-a=') || al.startsWith('-o=') || al.startsWith('-ef=') || al.startsWith('-rf=') || al.startsWith('-lo=') || al.startsWith('-errorlog=')) return false;
            return true;
          });

          let gamsArgs = [
            `"${compileGamsFilePath}"`, `--gamsFileToRun="${gamsFilePath}"`, 'LO=3', "a=c",
            `o="${randBasePath}.lst"`,
            `fErr="${randBasePath}.err"`,
            `rf="${randBasePath}.ref"`,
            ...ggigArgs,
          ];

          // Extra args are already included via ggigOpts.extraArgs -> buildGamsCommand -> ggigSpec.args

          return {
            gamsExe: gamsExecutable,
            gamsArgs: gamsArgs,
            listingPath: randBasePath + '.lst',
            gdxPath: randBasePath + '.gdx',
            errorPath: randBasePath + '.err',
            refPath: randBasePath + '.ref',
            dumpPath: randBasePath + '.dmp',
            scratchDirectory: scratchDirectory,
            gamsFile: basename(gamsFilePath),
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
    "commandLineArguments_compilation"
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

  let ignoreMainGmsFile = false;
  if (mainGmsFile) {
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
        await vscode.window.showErrorMessage(`Main GMS file ${mainGmsFile} not found in workspace. Please update the workspace settings, or disable main GMS file.`, openSettings).then(selection => {
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
      await vscode.window.showErrorMessage(`Main GMS file ${mainGmsFile} not found in workspace. Please update the workspace settings, or disable main GMS file.`, selectMainGMS, removeMainGmsFile).then(selection => {
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
  const randStr = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  let randBasePath = `${scratchDirectory}${sep}${randStr}`;

  const compileGamsFilePath = `${__dirname}${sep}compile.gms`;

  let gamsArgs = [
    `"${compileGamsFilePath}"`, `--gamsFileToRun="${gamsFileToExecute}"`, 'LO=3', "a=c",
    `o="${randBasePath}.lst"`,
    `fErr="${randBasePath}.err"`,
    `rf="${randBasePath}.ref"`,
    `-scrdir="${scratchDirectory}"`,
    `--scrdir="${scratchDirectory}"`,
    `-workdir="${filePath}"`,
    `-curDir="${filePath}"`
  ];

  if (Array.isArray(commandLineArguments) && commandLineArguments.length > 0) { gamsArgs = gamsArgs.concat(commandLineArguments); }
  if (extraArgs?.length > 0) { gamsArgs = gamsArgs.concat(extraArgs); }

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