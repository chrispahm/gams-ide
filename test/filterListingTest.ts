#!/usr/bin/env node

import * as path from 'path';
import { writeFile } from 'fs/promises';
import filterListing from '../src/utils/filterListing';

const DEFAULT_LST_PATH = '/Users/pahmeyer/capri/gams/capmod.lst';
const DEFAULT_SYMBOL = 'v_manureExports';
const DEFAULT_ENTRY_TYPE = 'Solution Report';

function slugify(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'entry';
}

async function runSymbolFilter(lstPath: string, symbol: string) {
  const filteredContent = await filterListing(lstPath, symbol);
  const outPath = `${lstPath}.${symbol}.filtered.lst`;
  await writeFile(outPath, filteredContent, 'utf8');
  console.log(`Symbol filter (${symbol}) written to: ${outPath}`);
}

async function runEntryTypeFilter(lstPath: string, entryType: string) {
  const filteredContent = await filterListing(lstPath, [], entryType);
  const outPath = `${lstPath}.${slugify(entryType)}.lst`;
  await writeFile(outPath, filteredContent, 'utf8');
  console.log(`Entry type filter (${entryType}) written to: ${outPath}`);
}

async function main() {
  const [, , lstPathArg, symbolArg] = process.argv;

  if (!lstPathArg || !symbolArg) {
    console.warn('Usage: filterListingTest <path-to.lst> <symbol-name> (defaults applied if omitted)');
  }

  const lstPath = path.resolve(lstPathArg ?? DEFAULT_LST_PATH);
  const symbol = symbolArg ?? DEFAULT_SYMBOL;

  try {
    await runSymbolFilter(lstPath, symbol);
    await runEntryTypeFilter(lstPath, DEFAULT_ENTRY_TYPE);
  } catch (err) {
    console.error('Error while filtering listing file:', err);
    process.exit(1);
  }
}

main();
