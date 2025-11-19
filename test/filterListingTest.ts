#!/usr/bin/env node

import * as path from 'path';
import { writeFile } from 'fs/promises';
import filterListing from '../src/utils/filterListing';

async function main() {
  const [, , lstPathArg, symbolArg] = process.argv;

  if (!lstPathArg || !symbolArg) {
    console.error('Usage: filterListingTest <path-to.lst> <symbol-name>');
    process.exit(1);
  }

  const lstPath = path.resolve(lstPathArg);
  const symbol = symbolArg;

  try {
    const filteredContent = await filterListing(lstPath, symbol);
    const outPath = `${lstPath}.filtered.lst`;
    await writeFile(outPath, filteredContent, 'utf8');
    console.log(`Filtered listing written to: ${outPath}`);
  } catch (err) {
    console.error('Error while filtering listing file:', err);
    process.exit(1);
  }
}

main();
