import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

interface SymbolLocation { line: number; column: number; file?: string; base?: string }
interface SymbolAction extends SymbolLocation {}
interface SymbolEntry {
  name?: string;
  nameLo?: string;
  declared?: SymbolLocation;
  defined?: SymbolLocation;
  isSubset?: boolean;
  superset?: SymbolEntry;
  subsets?: SymbolEntry[];
  symId?: string;
  type?: string;
  domain?: (SymbolEntry | { name: string })[];
  description?: string;
  [key: string]: any; // dynamic keys like assigned, ref, etc.
}

export default function createRefTree(refFile: string): Promise<SymbolEntry[]> {
  return new Promise<SymbolEntry[]>((resolve, reject) => {
    const rl = readline.createInterface({
      input: fs.createReadStream(refFile),
      crlfDelay: Infinity
    });

    // the ctags compatible .tags file
    // const tagsFile = fs.openSync(`${rootDir}${path.sep}.tags`, 'w')
    // the variable where we will store our reference tree
  const json: Record<string | number, SymbolEntry> = {};

  rl.on('line', (line: string) => {
      const segments = line.split(' ');

      if (!isNaN(+segments[1])) {
        if (segments[4] === 'declared' || segments[4] === 'defined') {
          let symbol: SymbolEntry = json[Number(segments[1])] = json[Number(segments[1])] || {};

          let file;
          let base;
          if (typeof segments[10] === 'string') {
            file = segments.slice(10).join(' ');
            base = path.parse(file).name;
          }
          // make case-insensitive comparison possible (as GAMS is case-insensitive)
          let nameLo;
          if (typeof segments[2] === 'string') {
            nameLo = segments[2].toLowerCase();
          }

          Object.assign(symbol, {
            'name': segments[2],
            'nameLo': nameLo,
            [segments[4]]: {
              'line': Number(segments[6]),
              'column': Number(segments[7]),
              'file': file,
              'base': base
            }
          });

          // save symbol to ctags file
          /*
          if (segments[4] === 'declared' && segments[10]) {
            const symbolLine = `${segments[2]}\t${segments[10].substr(rootDir.length)}\t${Number(segments[6])}\n`
            fs.write(tagsFile, symbolLine, (err) => {
              if (err) throw err
            })
          }
          */

        } else {
          json[segments[1]] = json[segments[1]] || {} as SymbolEntry;
          let action: SymbolAction[] = json[segments[1]][segments[4]] = json[segments[1]][segments[4]] || [];

          let file;
          let base;
          if (typeof segments[10] === 'string') {
            file = segments.slice(10).join(' ');
            base = path.parse(file).name;
          }

          action.push({
            'line': Number(segments[6]),
            'column': Number(segments[7]),
            'file': file,
            'base': base
          });
        }
      } else if (segments[0] === '0') {
        return;
      } else {
  let symbol: SymbolEntry = json[segments[0]] = json[segments[0]] || {};
        const domainCount = Number(segments[4]);
  let domain: (SymbolEntry | { name: string })[] = [];
        if (domainCount > 0) {
          const range = segments.slice(6, 6 + domainCount);
          // '0' represents universal set
          domain = range.map((entry) => {
            if (entry !== '0' && json[entry].name !== symbol.name) {
              return json[entry];
            } else {
              return { name: '*' };
            }
          });
        }
        
        let description = "";
        if (domainCount > 0) {
          description = segments.slice(6 + domainCount).join(' ');
        };

        Object.assign(symbol, {
          'symId': segments[2],
          'type': segments[3],
          'domain': domain,
          'description': description
        });

        if (Number(segments[2]) === 2 && symbol.domain && symbol.domain.length === 1 && symbol.domain[0].name !== '*') {
          Object.assign(symbol, {
            'isSubset': true,
            'superset': symbol.domain[0]
          });
          // add this set to the list of subsets of the superset
          if (symbol.superset) {
            addSubsetToSupersetRecursive(symbol, symbol.superset);
          }
        }
      }
    });

  function addSubsetToSupersetRecursive(subset: SymbolEntry, superset: SymbolEntry) {
      superset.subsets = superset.subsets || [];
      superset.subsets.push(subset);
      if (superset.isSubset && superset.superset) {
        addSubsetToSupersetRecursive(subset, superset.superset);
      }
    }

    rl.on('close', () => {
      const keepOutputFilesInScratchDir = vscode.workspace.getConfiguration("gamsIde").get<boolean>("keepOutputFilesInScratchDir");
      if (keepOutputFilesInScratchDir) {
        resolve(Object.values(json));
        return;
      }
      fs.unlink(refFile, (err) => {
        if (err) {
          return reject(err);
        }
        resolve(Object.values(json));
      });
    });

    rl.on('error', reject);
  });
};