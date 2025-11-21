#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path = __importStar(require("path"));
const promises_1 = require("fs/promises");
const filterListing_1 = __importDefault(require("../src/utils/filterListing"));
const DEFAULT_LST_PATH = '/Users/pahmeyer/capri/gams/capmod.lst';
const DEFAULT_SYMBOL = 'v_manureExports';
const DEFAULT_ENTRY_TYPE = 'Solution Report';
function slugify(label) {
    return label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'entry';
}
async function runSymbolFilter(lstPath, symbol) {
    const filteredContent = await (0, filterListing_1.default)(lstPath, symbol);
    const outPath = `${lstPath}.${symbol}.filtered.lst`;
    await (0, promises_1.writeFile)(outPath, filteredContent, 'utf8');
    console.log(`Symbol filter (${symbol}) written to: ${outPath}`);
}
async function runEntryTypeFilter(lstPath, entryType) {
    const filteredContent = await (0, filterListing_1.default)(lstPath, [], entryType);
    const outPath = `${lstPath}.${slugify(entryType)}.lst`;
    await (0, promises_1.writeFile)(outPath, filteredContent, 'utf8');
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
    }
    catch (err) {
        console.error('Error while filtering listing file:', err);
        process.exit(1);
    }
}
main();
//# sourceMappingURL=filterListingTest.js.map