import * as fs from 'fs';
import * as readline from 'readline';
import listingParser from '../lstParser';

/**
 * Filter a GAMS listing file by one or more symbol names.
 *
 * @param lstFilePath Absolute path to the .lst file
 * @param symbols Single symbol name or list of symbol names to filter for
 * @param entryType Optional entry type to filter for (e.g. "Solution Report")
 * @returns Promise that resolves when the filtered summary file has been written
 */
export default async function filterListing(lstFilePath: string, symbols: string | string[], entryType?: string): Promise<string> {
  const symbolList = Array.isArray(symbols)
    ? symbols.map((s) => s.toString()).filter(Boolean)
    : [symbols.toString()];

  const lowerSymbols = symbolList.map((s) => s.toLowerCase());
  // Parse the listing file into structured entries
  const lstEntries = await listingParser(lstFilePath);
  // write lstEntries to disk for debugging
  //await fs.promises.writeFile(`${
  //  lstFilePath
  //}.debug.json`, JSON.stringify(lstEntries, null, 2), 'utf8');

  let linesToKeep: Set<number> = new Set();

  for (const entry of lstEntries) {
    // Check if entry matches requested type
    if (entryType && entry.type && entry.type.toLowerCase().includes(entryType.toLowerCase())) {
      let startLine: number | undefined;
      if (typeof entry.line === 'number') {
        startLine = entry.line;
      } else if (Array.isArray(entry.line) && entry.line.length > 0) {
        startLine = entry.line[0];
      }

      let endLine: number | undefined;
      // @ts-ignore - endLine is not strictly typed in LstEntry but added by parser
      const rawEndLine = entry.endLine;
      if (typeof rawEndLine === 'number') {
        endLine = rawEndLine;
      } else if (Array.isArray(rawEndLine) && rawEndLine.length > 0) {
        endLine = rawEndLine[0];
      }

      if (startLine !== undefined) {
        const end = endLine ?? startLine;
        for (let i = startLine; i <= end; i++) {
          linesToKeep.add(i);
        }
      }
    }

    const matches = entry?.entries?.filter(child =>
      typeof child.name === 'string' &&
      lowerSymbols.some(sym => child.name.toLowerCase().includes(sym))
    );
    if (matches && matches.length > 0) {
      if (typeof entry.line === 'number') {
        linesToKeep.add(entry.line);
      } else if (Array.isArray(entry.line)) {
        linesToKeep.add(entry.line[0]);
      }
      for (const match of matches) {
        const start = match.line;
        const end = match.endLine ?? match.line;
        for (let i = start; i <= end; i++) {
          linesToKeep.add(i);
        }
      }
    }
  }

  const readStream = fs.createReadStream(lstFilePath);
  const rl = readline.createInterface({
    input: readStream,
    crlfDelay: Infinity
  });

  let currentLine = 1;
  let filteredContent = '';
  let previousLineKept = false;

  for await (const line of rl) {
    const lineIsKept = linesToKeep.has(currentLine);
    if (lineIsKept) {
      if (!previousLineKept) {
        filteredContent += `--- ${lstFilePath}:${currentLine}\n`;
      }
      filteredContent += line + '\n';
    }
    previousLineKept = lineIsKept;
    currentLine++;
  }

  return filteredContent;
}
