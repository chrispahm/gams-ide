import * as readline from 'readline';
import * as fs from 'fs';

export interface DataParserEntryChild {
  name: string;
  line: number;
  column: number;
  file: string;
}

export interface DataParserEntry {
  type: string;
  line?: number[];
  column?: number[];
  file?: string;
  entries?: DataParserEntryChild[];
  open?: boolean;
}

export default function dataParser(file: string): Promise<DataParserEntry[]> {
  return new Promise((resolve) => {

    const rl = readline.createInterface({
      input: fs.createReadStream(file),
      crlfDelay: Infinity
    });

    const ast: DataParserEntry[] = [];
    let entry: DataParserEntry | null = null;
    let lineno = 0;

    function save(type: string | null, pos: [number[], number[]] | null, push: boolean, child: DataParserEntryChild | null) {
  if (!entry) { entry = { type: type || '' }; }
  if (type) { entry.type = type; }
      if (pos) {
        entry.line = pos[0];
        entry.column = pos[1];
        entry.file = file;
      }
      if (child) {
        if (entry.entries) {
          entry.entries.push(child);
          entry.open = true;
        } else {
          entry.entries = [child];
        }
      }
      if (push && entry) {
        ast.push(entry);
        entry = null;
      }
    }

  rl.on('line', (line: string) => {
      lineno++;

      if ((/^(\*\*\*\*)\s*\d\d/).test(line)) {
  const m = line.match(/(\*\*\*\*)\s*(.*)/);
  const errorMessage = m ? m[2] : '';
        save("Error: " + errorMessage, [
          [lineno],
          [0]
        ], true, null);
      } else if (line.includes('Model Statistics    ')) {
  if (entry) { save(null, null, true, null); }
        save(line, [
          [lineno],
          [0]
        ], true, null);
      } else if (line.includes('Equation Listing')) {
  if (entry) { save(null, null, true, null); }
        save(line, [
          [lineno],
          [0]
        ], false, null);
      } else if (line.includes('Column Listing')) {
  if (entry) { save(null, null, true, null); }
        save(line, [
          [lineno],
          [0]
        ], false, null);
      } else if (line.includes('Solution Report     ')) {
  if (entry) { save(null, null, true, null); }
        save(line, [
          [lineno],
          [0]
        ], true, null);
      } else if (line.includes('---- EQU')) {
        const equName = line.slice(9).split(/\s/)[0];
  if (entry && entry.type !== 'SolEQU') { save(null, null, true, null); }
        save('SolEQU', null, false, {
          name: equName,
          line: lineno,
          column: 1,
          file: file
        });
      } else if (line.includes('---- VAR')) {
        const varName = line.slice(9).split(/\s/)[0];

  if (entry && entry.type !== 'SolVAR') { save(null, null, true, null); }
        save('SolVAR', null, false, {
          name: varName,
          line: lineno,
          column: 1,
          file: file
        });
      } else if (/^(----)\s*\d/.test(line)) {
        const disTokens = line.split(/[\s]+/);
        const disName = disTokens[3] || '';
  if (entry && entry.type !== 'Display') { save(null, null, true, null); }
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
  if (entry) { save(null, null, true, null); }
      resolve(ast);
    });
  });
};
