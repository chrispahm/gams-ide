// import * as vscode from 'vscode';
import * as readline from 'readline';
import * as fs from 'fs';
import { LstEntry, LstEntryChild } from './types/gams-symbols';

function getAbortLine(abortParam: string, lineno: number, ast: LstEntry[]): number {
  const abortEntry = ast.find(obj => obj.type === 'Display' && obj.entries?.find(item => item.name === abortParam));
  if (abortEntry) {
    const displayEntry = abortEntry.entries?.find(item => item.name === abortParam);
    return displayEntry?.line || lineno;
  }
  return lineno;
}

export default function listingParser(file: string): Promise<LstEntry[]> {
  return new Promise(resolve => {

    const rl = readline.createInterface({
      input: fs.createReadStream(file),
      crlfDelay: Infinity
    });

    const ast: LstEntry[] = [];
    let entry: LstEntry | null | undefined;
    let lineno = 0;
    // const defaultSettings = vscode.workspace.getConfiguration("gamsIde");

    function save(type: string | null, pos: number[][] | null, push: boolean, entries: LstEntryChild | null) {
      if (!entry) {
        entry = {} as LstEntry;
      }
      if (type) {
        entry.type = type;
      }
      if (pos) {
        entry.line = pos[0];
        entry.column = pos[1];
        entry.file = file;
      }
      if (entries) {
        // add endLine to each previous entry, which is the line property of the current entry        
        if (entry.entries) {
          entry.entries[entry.entries.length - 1].endLine = entries.line - 1;
          entry.entries.push(entries);
          entry.open = true;
          // const unfoldThreshold = defaultSettings.get<number>('autoUnfoldListingEntriesTreshold');
          // if (entry.entries.length > (unfoldThreshold ?? Number.MAX_SAFE_INTEGER)) {
          //   entry.open = false;
          // }
          //const onlyDisplay = defaultSettings.get<boolean>('onlyAutoUnfoldDisplayStatements');
          //if (onlyDisplay && type !== 'Display') {
          //  entry.open = false;
          //}
        } else {
          entry.entries = [entries];
        }
      }
      if (push) {
        if (entry && entry.entries && entry.entries.length > 0) {
          // also add final endLine to last child entry
          entry.entries[entry.entries.length - 1].endLine = lineno - 1;
        }
        if (entry && entry.type.includes('Solution Report')) {
          entry.endLine = [ lineno - 1 ];
        }
        ast.push(entry);
        entry = null;
      }
    }

    rl.on('line', (line: string) => {
      lineno++;

      if ((/^(\*\*\*\*)\s*\d\d/).test(line)) {
        const match = line.match(/(\*\*\*\*)\s*(.*)/);
        const errorMessage = match ? match[2] : 'Error';
        save("Error: " + errorMessage, [
          [lineno],
          [0]
        ], true, null);
      } else if ((/^(\*\*\*\*)\s*\w/).test(line)) {
        // ignore if previous entry was "Solution Report"
        if (entry && entry.type.includes('Solution Report')) {
          return;
        }
        if (entry) {
          save(null, null, true, null);
        }
        const match = line.match(/^(\*\*\*\*)\s*((?:(?!\s{3,}|:).)*)(?=\s{3,}|:|$)/);
        save(match?.[2] ?? '', [
          [lineno],
          [0]
        ], true, null);
      } else if (line === 'Compilation') {
        save('C o m p i l a t i o n', [
          [lineno],
          [0]
        ], true, null);
      } else if (line === 'Symbol Listing') {
        save('Symbol Listing', [
          [lineno],
          [0]
        ], true, null);
      } else if (line === 'Include File Summary') {
        save('Include File Summary', [
          [lineno],
          [0]
        ], true, null);
      } else if (line === 'Execution') {
        if (entry) {
          save(null, null, true, null);
        }
        save('E x e c u t i o n', [
          [lineno],
          [0]
        ], true, null);
      } else if (line.includes('Model Statistics    ')) {
        if (entry) {
          save(null, null, true, null);
        }
        save(line, [
          [lineno],
          [0]
        ], true, null);
      } else if (line.includes('Equation Listing')) {
        if (entry) {
          save(null, null, true, null);
        }
        save(line, [
          [lineno],
          [0]
        ], false, null);
      } else if (line.includes('Column Listing')) {
        if (entry) {
          save(null, null, true, null);
        }
        save(line, [
          [lineno],
          [0]
        ], false, null);
      } else if (line.includes('Solution Report     ')) {
        if (entry) {
          save(null, null, true, null);
        }
        save(line, [
          [lineno],
          [0]
        ], false, null);
      } else if (line.includes('---- EQU')) {
        const equName = line.slice(9).split(/\s/)[0];
        if (entry && entry.type !== 'SolEQU') {
          save(null, null, true, null);
        }
        save('SolEQU', null, false, {
          name: equName,
          line: lineno,
          column: 1,
          file: file
        });
      } else if (line.includes('---- VAR')) {
        const varName = line.slice(9).split(/\s/)[0];

        if (entry && entry.type !== 'SolVAR') {
          save(null, null, true, null);
        }
        save('SolVAR', null, false, {
          name: varName,
          line: lineno,
          column: 1,
          file: file
        });
      } else if (line.includes('Execution halted: abort ')) {
        if (entry) {
          save(null, null, true, null);
        }
        const abortParam = line.split('Execution halted: abort ')[1];
        const abortLine = getAbortLine(abortParam, lineno, ast);
        save('Abort', [
          [abortLine],
          [0]
        ], true, null);
      } else if (/^(----)\s*\d/.test(line)) {
        const disName = line.split(/[\s]+/)[3];
        if (entry && entry.type !== 'Display') {
          save(null, null, true, null);
        }
        save('Display', null, false, {
          name: disName,
          line: lineno,
          column: 1,
          file: file
        });
      } else if (entry && /^(----)/.test(line) && entry.type.includes('Equation Listing')) {
        const equLst = line.split(/[\s]+/)[1];
        // if (entry && entry.type !== 'Display') save(null, null, true, null)
        save(null, null, false, {
          name: equLst,
          line: lineno,
          column: 1,
          file: file
        });
      } else if (entry && /^(----)/.test(line) && entry.type.includes('Column Listing')) {
        const colLst = line.split(/[\s]+/)[1];
        // if (entry && entry.type !== 'Display') save(null, null, true, null)
        save(null, null, false, {
          name: colLst,
          line: lineno,
          column: 1,
          file: file
        });
      }
    });

    rl.on('close', () => {
      // save last time to get displays after solve
      if (entry) {
        save(null, null, true, null);
      }
      resolve(ast);
    });
  });
};
