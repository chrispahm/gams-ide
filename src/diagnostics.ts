import * as vscode from 'vscode';
import { format, parse } from 'node:path';
import { exec } from 'node:child_process';
import { readFile, access, unlink } from 'fs/promises';
import parseError, { ParsedErrorMessage } from './utils/parseError';
import createRefTree from './utils/createRefTree.js';
import createGamsCompileCommand from './utils/createGamsCompileCommand.js';
import createRefTreeWithSymbolValues from './createRefTreeWithSymbolValues.js';
import { parseIncludeFileSummary } from './createIncludeTree.js';
import State from './State';
import { ReferenceTree, CompileTimeVariable } from './types/gams-symbols';

interface ExecResult {
  error: (Error & { code?: number }) | null;
  stdout: string;
  stderr: string;
}

interface UpdateDiagnosticsArgs {
  document: vscode.TextDocument;
  collection: vscode.DiagnosticCollection;
  state: State;
  terminal?: vscode.Terminal;
  forceDataParsing?: boolean;
  progress?: vscode.Progress<{ message?: string; increment?: number }>;
}

interface CompileCommandResult {
  gamsExe: string;
  gamsArgs: string[];
  refPath: string;
  errorPath: string;
  listingPath: string;
  dumpPath: string;
  gdxPath?: string;
  scratchDirectory: string;
  filePath: string; // directory of main file
}

interface IncludeFileSummaryEntry {
  file?: string;
  count?: number;
  depth?: number;
  parent?: string;
}

interface ParseIncludeFileSummaryResult {
  includeFileSummary: IncludeFileSummaryEntry[];
  compileTimeVariables: CompileTimeVariable[];
}

function execAsync(command: string): Promise<ExecResult> {
  return new Promise(resolve => {
    exec(command, (error, stdout, stderr) => {
      resolve({ error, stdout, stderr });
    });
  });
}

export default async function updateDiagnosticsWithProgrss(args: UpdateDiagnosticsArgs): Promise<void> {
  vscode.window.withProgress({
    location: vscode.ProgressLocation.Window,
    cancellable: false,
    title: 'Compiling GAMS'
  }, async (progress) => {
    progress.report({ increment: 0 });
    (args as UpdateDiagnosticsArgs).progress = progress;
    await updateDiagnostics(args);
    progress.report({ increment: 100 });
  });
};

async function updateDiagnostics(args: UpdateDiagnosticsArgs): Promise<void> {
  const {
    document,
    collection,
    state,
    terminal,
    forceDataParsing,
    progress
  } = args;

  const pkgConfig = vscode.workspace.getConfiguration("gamsIde");
  const shouldParseGamsData = pkgConfig.get("parseGamsData") && (pkgConfig.get("parseGamsDataWithDiagnostics") || forceDataParsing);

  if (document && collection) {
    // clear the previous collection, as we are going to re-populate it
    collection.clear();
    // get the compile statement for the current document
    const compileCommand: CompileCommandResult = await createGamsCompileCommand(document.fileName, [shouldParseGamsData ? 'dumpopt=11' : '']);
    // run the compile command
    const command = `${compileCommand.gamsExe} ${compileCommand.gamsArgs.join(" ")}`;
    let res: ExecResult | undefined;
    try {
      // run the compile command      
      res = await execAsync(command);
    } catch (error) {
      // show error in VS Code output
      // and add button to open the lst file
      await vscode.window.showErrorMessage("GAMS compilation failed: " + command + " -> " + error);
    }

    // get the output of the compile command
    if (!res) {
      // show error in VS Code output
      await vscode.window.showErrorMessage("GAMS compilation failed: " + command);
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
      const referenceTree: ReferenceTree = await createRefTree(compileCommand.refPath);
      state.update('referenceTree', referenceTree);

      // parse the contents of the error file
      const errorFileContents = await readFile(compileCommand.errorPath, 'utf8');
      // delete the error file, but do not wait for it
      unlink(compileCommand.errorPath);
      // if include parsing is enabled, parse the include file summary
      (parseIncludeFileSummary(compileCommand.listingPath, state) as Promise<ParseIncludeFileSummaryResult>).then(({ includeFileSummary, compileTimeVariables }) => {
        state.update('parsedIncludes', includeFileSummary);
        state.update('compileTimeVariables', compileTimeVariables);
        // call the refresh command on the include tree view
        if (includeFileSummary.length > 0) {
          vscode.commands.executeCommand('gams.refreshIncludeTree');
        }
        // delete the lst file, but do not wait for it
        unlink(compileCommand.listingPath);
      }).catch(err => {
        console.error("error", err);
      });

      // if there are no errors, reset the collection to no errors
      if (errorFileContents.split(/\n/).length <= 2) {
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
          // inidcate that main diagnostics are finished
          progress?.report({ increment: 100 });
          vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            cancellable: true,
            title: 'Parsing GAMS data'
          }, (dataProgress, cancellationToken) => {
            return createRefTreeWithSymbolValues({
              file: compileCommand.dumpPath,
              scratchdir: compileCommand.scratchDirectory,
              gamsexe: compileCommand.gamsExe,
              filePath: compileCommand.filePath,
              dataProgress,
              cancellationToken,
              state
            }).then(() => {
              // call the refresh command on the include tree view
              vscode.commands.executeCommand('gams.getSymbolUnderCursor');
              // delete the dmp lst file, but do not wait for it
              // indicate that data parsing is finished            
              dataProgress.report({ increment: 100 });
            }).catch((err: unknown) => {
              // show error in VS Code output
              // and add button to open the dmp file
              if (!state.get('ignoreDataValueParsingError')) {
                vscode.window.showWarningMessage('GAMS Data Parsing: ' + err + ".\nClick 'Hide error' to hide for this session.", 'Hide error', 'Disable data parsing', 'Open scrdir', 'Open DMP .lst').then((value) => {
                  const lstPath = format({ ...parse(compileCommand.dumpPath), base: '', ext: '.gms.lst' });
                  if (value === 'Open DMP .lst') {
                    vscode.workspace.openTextDocument(lstPath).then((doc) => {
                      vscode.window.showTextDocument(doc);
                    });
                  } else if (value === 'Open scrdir') {
                    vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(lstPath));
                  } else if (value === 'Disable data parsing') {
                    vscode.workspace.getConfiguration('gamsIde').update('parseGamsData', false);
                  } else if (value === 'Hide error') {
                    state.update('ignoreDataValueParsingError', true);
                  }
                });
                console.error("error", err);
              } else {
                // delete the dmp lst file, but do not wait for it
                unlink(compileCommand.dumpPath + ".lst");
              }
              vscode.commands.executeCommand('gams.getSymbolUnderCursor');
              dataProgress.report({ increment: 100 });
            });
          });
        }
        // return early
        return;
      }
      let errors = errorFileContents.split(/\r\n?|\n/).slice(1);
      // get max errors to display from settings
      const maxErrorsToDisplay = vscode.workspace.getConfiguration('gamsIde').get<number>('maxErrorsToDisplay');
      if ((maxErrorsToDisplay ?? 0) > 0) {
        errors = errors.slice(0, maxErrorsToDisplay);
      }
      const errorMessages: ParsedErrorMessage[] = await Promise.all(
        errors
          .filter(err => err.length)
          .map((err, i) => parseError(err, i))
      );
      // error messages are for multiple files, 
      // so we group them by filename and set the collection accordingly
      const errorMessagesByFile = errorMessages.reduce<Record<string, ParsedErrorMessage[]>>((acc, err) => {
        if (!acc[err.errFile]) {
          acc[err.errFile] = [];
        }
        acc[err.errFile].push(err);
        return acc;
      }, {});
      Object.keys(errorMessagesByFile).forEach(file => {
        const uri = vscode.Uri.file(file);
        const diagnostics: vscode.Diagnostic[] = errorMessagesByFile[file].map(msg => {
          const d = new vscode.Diagnostic(msg.range, msg.message, msg.severity);
          d.source = 'gams';
          d.code = msg.code;
          return d;
        });
        collection.set(uri, diagnostics);
      });
    } catch (error) {
      // progress.report({ increment: 100 });
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
        vscode.window.showErrorMessage('GAMS compilation failed! Check the GAMS output in the terminal and the .lst file.', 'Open .lst file').then((value) => {
          if (value === 'Open .lst file') {
            // open lst file, or show error if it does not exist
            vscode.workspace.openTextDocument(compileCommand.listingPath)
              .then((doc) => {
                vscode.window.showTextDocument(doc);
              });
          }
        });
        terminal?.show(true);
        terminal?.sendText(command);
      } else {
        vscode.window.showErrorMessage('GAMS compilation failed! Check the GAMS output in the terminal. Stdout:' + stdout);
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