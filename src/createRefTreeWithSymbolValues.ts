import * as vscode from 'vscode';
import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';
import * as shell from 'shelljs';
import State from './State';
import { ReferenceTree, SolveStatement, SymbolDataStore } from './types/gams-symbols';

interface CreateRefTreeWithSymbolValuesArgs {
  file: string; // path to .dmp dump file produced by GAMS (dumpopt=11)
  filePath: string; // original gms file directory (workdir)
  scratchdir: string; // scratch directory passed to GAMS (-scrdir)
  gamsexe: string; // path to gams executable
  dataProgress: vscode.Progress<{ message?: string; increment?: number }>;
  cancellationToken: vscode.CancellationToken;
  state: State;
}

interface ParseDmpResult {
  dumpFile: fs.WriteStream; // temporary .gms file created from .dmp
  solves: SolveStatement[];
}

export default async function createRefTreeWithSymbolValues(options: CreateRefTreeWithSymbolValuesArgs): Promise<void> {
  const { file, filePath, scratchdir, gamsexe, dataProgress, cancellationToken, state } = options;
  
  const referenceTree = state.get<ReferenceTree>('referenceTree');
  // reset gamsSolve state
  // state.update("solves", [{
  //   model: "Compile time",
  //   line: 0
  // }]);
  state.update<SolveStatement[]>("solves", []);
  state.update<SymbolDataStore>('dataStore', {});
  const solvesStore = state.get<SolveStatement[]>("solves")!;
  const dataInStore = state.get<SymbolDataStore>('dataStore') || {};
  dataProgress.report({ message: "Creating DMP File" });
  const {
    dumpFile,
    solves
  } = await parseDMP(file, { scratchdir, gamsexe }, referenceTree);
  
  dataProgress.report({ message: "Executing DMP" });
  const lst = await execDMP(dumpFile, { scratchdir, gamsexe, filePath, cancellationToken });
  // if the request is cancelled, the will be no lst
  // return silently
  if (!lst) {
    return;
  }
  dataProgress.report({ message: "Parsing DMP" });
  let dataStore: SymbolDataStore | undefined;
  try {
    dataStore = await getData(lst, solves, solvesStore, referenceTree || [], dataInStore);
  } catch (error) {
    throw error;
  }
  
  state.update("solves", solvesStore);
  state.update("dataStore", dataStore);
};

function parseDMP(file: string, config: { scratchdir: string; gamsexe: string }, referenceTree: ReferenceTree | undefined): Promise<ParseDmpResult> {
  return new Promise<ParseDmpResult>((resolve, reject) => {
    const stream = fs.createReadStream(file);
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

    let lineno = 0;
    const defaultSettings = vscode.workspace.getConfiguration('gamsIde');
    const consoleDispWidth = defaultSettings.get<number>('consoleDispWidth');
    const resLim = defaultSettings.get<number>('parseGamsDataResLim');
    const dumpFile = fs.createWriteStream(`${config.scratchdir}${path.sep}${path.basename(file, '.dmp')}.gms`, { flags: 'w' });

    const symbols = referenceTree?.filter(o => (o.type === 'SET' || o.type === 'PARAM') && o.name);
    const solves: SolveStatement[] = [];

    rl.on('line', (line: string) => {
      if (/solve (.*?) using/i.test(line)) {
        const model = line.split(/solve/i)[1].split(/\s+/)[1];
        dumpFile.write('option dispWidth=' + consoleDispWidth + ';\ndisplay\n');
        lineno += 2;
        const display = lineno + 1;
        symbols?.forEach(symbol => {
          if (symbol.name) {
            dumpFile.write(`$if defined ${symbol.name} ${symbol.name} \n`);
            lineno++;
          }
        });

        dumpFile.write(';\n');
        dumpFile.write(`${model}.limrow=${defaultSettings.get('consoleLimrow')};
          ${model}.limcol=${defaultSettings.get('consoleLimcol')};
          ${model}.solprint=1;
          ${model}.resLim=${resLim};
          option limrow=${defaultSettings.get('consoleLimrow')};
          option limcol=${defaultSettings.get('consoleLimcol')};
          `);
        dumpFile.write(line + '\n');
        lineno += 8;

        solves.push({ model, line: lineno, display });
      } else if (!/display.*?;/gi.test(line)) {
        lineno++;
        dumpFile.write(line + '\n');
      }
    });

    rl.on('close', () => {
      dumpFile.end();
      fs.unlink(file, err => {
        if (err) {
          throw err;
        }
      });
      resolve({ dumpFile, solves });
    });

    rl.on('error', err => {
      console.log('error in parseDMP', err);
      reject(err);
    });
  });
}

function execDMP(
  dumpFile: fs.WriteStream,
  config: { scratchdir: string; gamsexe: string; filePath: string; cancellationToken: vscode.CancellationToken }
): Promise<string> {
  return new Promise(resolve => {
    const listingPath = `${(dumpFile as any).path}.lst`;
    const defaultSettings = vscode.workspace.getConfiguration('gamsIde');
    const resLim = defaultSettings.get<number>('parseGamsDataResLim');
    const gamsParams = `"${config.gamsexe}" "${(dumpFile as any).path}" -workdir="${config.filePath}" -curDir="${config.filePath}" o="${listingPath}" suppress=1 pageWidth=80 pageSize=0 lo=3 resLim=${resLim} -scrdir="${config.scratchdir}"`;

    if (config.cancellationToken.isCancellationRequested) {
      resolve('');
      return;
    }
    // @ts-ignore
    shell.cd(config.scratchdir);
    // @ts-ignore
    const child = shell.exec(gamsParams, { silent: true }, (code: number, stdout: string, stderr: string) => {
      if (code !== 0) {
        console.log('Error in dmp exec: ' + stdout, stderr);
      }
      resolve(listingPath);
    });
    config.cancellationToken.onCancellationRequested(() => { child.kill(); });
  });
}

function getData(
  lst: string,
  solves: SolveStatement[],
  gamsSolves: SolveStatement[],
  referenceTree: ReferenceTree,
  dataStore: SymbolDataStore
): Promise<SymbolDataStore> {
  const timestamp = Date.now();
  return new Promise<SymbolDataStore>((resolve, reject) => {
    const stream = fs.createReadStream(lst);
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
    let curSym: string | undefined;
    let curData = '';
    let curSection: 'Compilation' | 'Displays' | 'Equations' | 'Variables' | undefined;
    let curSolve: string | number | undefined;
    let foundError = false;

    function save(solve: string | number | undefined, symbol: string | undefined, data: string) {
      if (!symbol || !solve) {
        return;
      }
      const curSolveObj = solves.find(s => s.line === Number(solve));
      if (curSolveObj) {
        const statement: SolveStatement = { timestamp, model: curSolveObj.model, line: Number(solve) };
        if (!gamsSolves.find(s => s.line === Number(solve))) {
          gamsSolves.push(statement);
        }
      }
      const entry = referenceTree.find(el => el.name && el.name.toLowerCase() === symbol.toLowerCase());
      if (entry && entry.name) {
        if (!dataStore[entry.name]) {
          dataStore[entry.name] = [];
        }
        dataStore[entry.name].push({ solve: Number(solve), data });
        curSym = undefined;
        curData = '';
      }
    }

    rl.on('line', (line: string) => {
      if (line.includes('C o m p i l a t i o n')) {
        curSection = 'Compilation';
      } else if (line.includes('E x e c u t i o n')) {
        curSection = 'Displays';
      } else if (line.includes('Equation Listing')) {
        curSection = 'Equations';
        curSolve = line.split(/[\s]+/)[8];
      } else if (line.includes('Column Listing')) {
        curSection = 'Variables';
        curSolve = line.split(/[\s]+/)[8];
      } else if (/^(----)\s*/.test(line)) {
        if (curSym) {
          save(curSolve, curSym, curData);
        }
        if (curSection === 'Displays') {
          const dispLine = Number(line.split(/[\s]+/)[1]);
            const symbol = line.split(/[\s]+/)[3];
          const pieces = line.split(/[\s]+/);
          pieces.splice(0, 2);
          const data = pieces.join(' ');
          const solve = solves.find(s => s.display === dispLine);
          if (!solve) {
            return;
          }
          curSym = symbol;
          curSolve = solve.line;
          curData = `---- ${data}`;
        } else {
          const symbol = line.split(/[\s]+/)[1];
          curSym = symbol;
          curData = `${line}\n`;
        }
      } else if (line.includes('PARAMETER') || line.includes('SET')) {
        if (curSym) {
          save(curSolve, curSym, curData);
        }
        if (curSection === 'Displays') {
          const symbol = line.split(/[\s]+/)[2];
          const pieces = line.split(/[\s]+/);
          pieces.splice(0, 1);
          const data = pieces.join(' ');
          curSym = symbol;
          curData = `---- ${data}`;
        }
      } else if (curSection === 'Compilation' && line.includes('****')) {
        foundError = true;
        reject('Compilation error in DMP .lst file');
      } else if (line.includes('Error Messages') || line.includes('**** USER ERROR(S) ENCOUNTERED')) {
        foundError = true;
        reject('User error in DMP .lst file');
      } else if (/^(\*\*\*\*)\s*\d/.test(line) || /^(GAMS)/.test(line) || line.includes('G e n e r a l') || /^(Range Statistics)/.test(line) || /^(RANGE STATISTICS)/.test(line)) {
        save(curSolve, curSym, curData);
      } else {
        curData += line + '\n';
      }
    });

    rl.on('close', () => {
      if (foundError) {
        return;
      }
      fs.unlink(lst, err => {
        if (err) {
          throw err;
        }
      });
      resolve(dataStore);
    });
    rl.on('error', err => { reject(err); });
  });
}