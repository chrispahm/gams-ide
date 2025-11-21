import type State from "./State";
import * as vscode from 'vscode';
import { createServer } from 'http';
import type { AddressInfo } from 'net';
import type { ReferenceSymbol } from "./types/gams-symbols";
import updateDiagnostics from './diagnostics';
import createGamsCommand from './utils/createGamsCommand';
import filterListing from "./utils/filterListing";
import { access } from "fs/promises";
import { constants } from "fs";

const typeMapping = {
  "SET": "set",
  "PARAM": "parameter",
  "VAR": "variable",
  "EQU": "equation",
};

let started = false;

export async function startHttpServer(state: State): Promise<number> {
  if (started) {
    return (state as any).httpServerPort;
  }
  started = true;

  const server = createServer(async (req, res) => {
    try {
      const method = (req.method || 'GET').toUpperCase();
      const urlObj = new URL(req.url || '/', 'http://localhost');
      const path = urlObj.pathname;

      // GET /referenceTree -> returns CSV string of the reference tree
      if (method === 'GET' && path === '/referenceTree') {
        const csv = prepareReferenceTree(
          (state.get<Record<string, any[]>>('referenceTree') as any[] | undefined) || []
        );
        res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8' });
        res.end(csv);
        return;
      }

      // GET /symbol -> returns a JSON of a specific symbol from the reference tree
      if (method === 'GET' && path === '/symbol') {
        const symbolName = urlObj.searchParams.get('name');
        if (!symbolName) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: 'Missing symbol name' }));
          return;
        }
        const referenceTree = state.get<ReferenceSymbol[]>('referenceTree') || [];
        const symbol = referenceTree.find(
          (sym) => sym.nameLo?.toLowerCase() === symbolName.toLowerCase()
        );
        if (!symbol) {
          res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: 'Symbol not found' }));
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(prepareReferenceTree([symbol], { asCsv: false })[0]));
        return;
      }

      // GET /symbol-data -> returns the data field of a specific symbol from the reference tree
      if (method === 'GET' && path === '/symbol-data') {
        const data = state.get<Record<string, any>>('dataStore') || {};
        const symbolName = urlObj.searchParams.get('name');
        if (!symbolName) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: 'Missing symbol name' }));
          return;
        }
        const symbolData = data[symbolName];
        if (!symbolData) {
          res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: 'Symbol data not found' }));
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(symbolData));
        return;
      }
      // GET /dataStore -> returns JSON object of the data store
      if (method === 'GET' && path === '/dataStore') {
        const data = state.get<Record<string, any>>('dataStore') || {};
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(data));
        return;
      }

      // GET /model-structure -> returns the parsed include tree
      if (method === 'GET' && path === '/model-structure') {
        const parsedIncludes = state.get('parsedIncludes') || [];
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(parsedIncludes));
        return;
      }

      // POST /gams-execution-command { file?: string, extraArgs?: string[] }
      // -> returns the command and arguments to execute a GAMS model
      if (method === 'POST' && path === '/gams-execution-command') {
        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
          if (body.length > 1_000_000) {
            try { req.socket.destroy(); } catch {}
          }
        });
        req.on('end', async () => {
          try {
            const parsed = body ? JSON.parse(body) : {};
            const fileName = typeof parsed?.file === 'string' ? parsed.file : undefined;
            const extraArgs = Array.isArray(parsed?.extraArgs)
              ? parsed.extraArgs.filter((a: unknown) => typeof a === 'string')
              : [];

            const defaultSettings = vscode.workspace.getConfiguration('gamsIde');
            const mainGmsFile = defaultSettings.get<string | undefined>('mainGmsFile');

            const targetFile = fileName || mainGmsFile;
            if (!targetFile) {
              res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
              res.end(JSON.stringify({ error: 'No file provided and no mainGmsFile configured.' }));
              return;
            }

            const cmd = await createGamsCommand(targetFile, extraArgs, false);
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify(cmd));
          } catch (e: any) {
            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: e?.message || String(e) }));
          }
        });
        return;
      }

      // POST /filter-listing { lstFilePath: string, symbols: string | string[], entryType?: string }
      // -> filters the listing file by the given symbols and returns the summary content
      if (method === 'POST' && path === '/filter-listing') {
        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
          if (body.length > 1_000_000) {
            try { req.socket.destroy(); } catch {}
          }
        });
        req.on('end', async () => {
          try {
            const parsed = body ? JSON.parse(body) : {};
            const lstFilePath = typeof parsed?.lstFilePath === 'string' ? parsed.lstFilePath : undefined;
            const rawSymbols = parsed?.symbols;
            const entryType = typeof parsed?.entryType === 'string' ? parsed.entryType : undefined;

            if (!lstFilePath) {
              res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
              res.end(JSON.stringify({ error: 'Missing lstFilePath' }));
              return;
            }
            // perform a quick check if the file exists
            try {
              await access(lstFilePath, constants.F_OK);
            } catch {
              res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
              res.end(JSON.stringify({ error: 'Listing file does not exist' }));
              return;
            }

            let symbols: string | string[];
            if (Array.isArray(rawSymbols)) {
              symbols = rawSymbols.map((s: unknown) => String(s));
            } else if (typeof rawSymbols === 'string') {
              symbols = rawSymbols;
            } else {
              if (!entryType) {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ error: 'Missing symbols' }));
                return;
              }
              symbols = [];
            }
            const summaryContent = await filterListing(lstFilePath, symbols, entryType);
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ summaryContent }));
          } catch (e: any) {
            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: e?.message || String(e) }));
          }
        });
        return;
      }

      // POST /update-diagnostics -> triggers diagnostics update in the extension host
      if (method === 'POST' && path === '/update-diagnostics') {
        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
          if (body.length > 1_000_000) {
            try { req.socket.destroy(); } catch {}
          }
        });
        req.on('end', async () => {
          try {
            const parsed = body ? JSON.parse(body) : {};
            const fileName = typeof parsed?.file === 'string' ? parsed.file : undefined;

            if (fileName) {
              const collection = vscode.languages.createDiagnosticCollection('gams');
              const terminal =
                vscode.window.terminals.find((t) => t.name === 'GAMS') ||
                vscode.window.createTerminal('GAMS');

              await updateDiagnostics({
                document: {fileName} as vscode.TextDocument, 
                collection, 
                state, 
                terminal
              });
            } else {
              await vscode.commands.executeCommand('gams.updateDiagnostics');
            }

            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ ok: true }));
          } catch (e: any) {
            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ ok: false, error: e?.message || String(e) }));
          }
        });
        return;
      }

      // POST /queryLLM { query: string } -> returns the LLM result JSON
      if (method === 'POST' && path === '/queryLLM') {
        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
          // Basic protection against excessively large bodies
          if (body.length > 1_000_000) {
            try { req.socket.destroy(); } catch {}
          }
        });
        req.on('end', async () => {
          try {
            const parsed = body ? JSON.parse(body) : {};
            const query = typeof parsed?.query === 'string' ? parsed.query : undefined;
            if (!query) {
              res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
              res.end(JSON.stringify({ error: 'Missing query' }));
              return;
            }
            const result = await runLLMQuery(state as any, query);
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify(result));
          } catch (e: any) {
            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: e?.message || String(e) }));
          }
        });
        return;
      }

      // Not found
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Not found' }));
    } catch (e: any) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: e?.message || String(e) }));
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, () => resolve());
  });

  const address = server.address() as AddressInfo;
  const port = address.port;
  (state as any).httpServerPort = port;

  return port;
}

function prepareReferenceTree(referenceTree: any[], options = {
  asCsv: true
}): string | Record<string, unknown>[] {
  const { asCsv = true } = options;
  // Build CSV rows with a stable header. Use only first-level domain/subsets and omit heavy fields (e.g., data)
  const headers = [
    'name',
    'nameLo',
    'type',
    'description',
    'isSubset',
    'superset',
    'subsets',
    'domain',
    'declared_line',
    'declared_column',
    'declared_file',
    'defined_line',
    'defined_column',
    'defined_file',
    'data',
  ] as const;

  const toNameLo = (sym: any): string => {
    const nl = typeof sym?.nameLo === 'string' ? sym.nameLo : undefined;
    const n = typeof sym?.name === 'string' ? sym.name : undefined;
    return (nl ?? (n ? n.toLowerCase() : '') ?? '').toString();
  };
  const toLoc = (loc: any): { line?: number; column?: number; file?: string } =>
    loc && typeof loc === 'object'
      ? {
        line: typeof loc.line === 'number' ? loc.line : undefined,
        column: typeof loc.column === 'number' ? loc.column : undefined,
        file: typeof loc.file === 'string' ? loc.file : undefined,
      }
      : {};
  const joinNameLo = (arr: any): string => (Array.isArray(arr) ? arr.map(toNameLo).filter(Boolean).join(',') : '');
  const str = (v: unknown): string => (v === undefined || v === null ? '' : String(v));
  const csvEscape = (v: unknown): string => {
    const s = str(v);
    if (s === '') {
      return '';
    }
    const needsQuotes = /[",\n\r]/.test(s);
    const escaped = s.replace(/\"/g, '""');
    return needsQuotes ? `\"${escaped}\"` : escaped;
  };

  if (asCsv) {
    const lines: string[] = [];
    lines.push(headers.join(','));

    for (const sym of referenceTree || []) {
      const declared = toLoc(sym?.declared);
      const defined = toLoc(sym?.defined);
      const data = sym?.data;

      const row: Record<(typeof headers)[number], unknown> = {
        name: typeof sym?.name === 'string' ? sym.name : '',
        nameLo: toNameLo(sym),
        type: typeof sym?.type === 'string' ? sym.type : '',
        description: typeof sym?.description === 'string' ? sym.description : '',
        isSubset: Boolean(sym?.isSubset ?? false),
        superset: sym?.superset ? toNameLo(sym.superset) : '',
        subsets: joinNameLo(sym?.subsets),
        domain: joinNameLo(sym?.domain),
        declared_line: declared.line ?? '',
        declared_column: declared.column ?? '',
        declared_file: declared.file ?? '',
        defined_line: defined.line ?? '',
        defined_column: defined.column ?? '',
        defined_file: defined.file ?? '',
        data: data !== undefined && data !== null ? JSON.stringify(data) : '',
      };

      if (toNameLo(sym)) {
        const line = headers.map((h) => csvEscape(row[h])).join(',');
        lines.push(line);
      }
    }

    return lines.join('\n');
  } else {
    const lines: Record<string, unknown>[] = [];

    for (const sym of referenceTree || []) {
      const declared = toLoc(sym?.declared);
      const defined = toLoc(sym?.defined);
      const data = sym?.data;

      const row: Record<(typeof headers)[number], unknown> = {
        ...sym,
        name: typeof sym?.name === 'string' ? sym.name : '',
        nameLo: toNameLo(sym),
        type: typeof sym?.type === 'string' ? sym.type : '',
        description: typeof sym?.description === 'string' ? sym.description : '',
        isSubset: Boolean(sym?.isSubset ?? false),
        superset: sym?.superset ? toNameLo(sym.superset) : '',
        subsets: joinNameLo(sym?.subsets),
        domain: joinNameLo(sym?.domain),
        declared_line: declared.line ?? '',
        declared_column: declared.column ?? '',
        declared_file: declared.file ?? '',
        defined_line: defined.line ?? '',
        defined_column: defined.column ?? '',
        defined_file: defined.file ?? '',
        data: data !== undefined && data !== null ? JSON.stringify(data) : '',
      };

      if (toNameLo(sym)) {
        lines.push(row);
      }
    }

    return lines;
  }
}

async function runLLMQuery(state: any, query: string): Promise<any> {
  if (!(vscode as any).lm) {return { error: 'Language model API not available' };}

  let symbols: string[] = [];
  symbols = state.symbols
    .map((d: ReferenceSymbol) => `${typeMapping[d.type as keyof typeof typeMapping] ? typeMapping[d.type as keyof typeof typeMapping] + ": " : ""}${d.nameLo}, ${d.description}`);

  const [model] = await vscode.lm.selectChatModels({
    vendor: 'copilot',
    family: 'gpt-4.1'
  });

  if (!model) {
    return { error: 'No GPT-4.1 model available' };
  }

  const FIND_SYMBOLS_PROMPT =
    'You are a helpful assistant that helps users find symbols in a GAMS model. ' +
    'You have access to a list of symbols, each with a type (set, parameter, variable, equation), a name, and a description. ' +
    'When given a search term, you will return a list of the most relevant symbols (0-n) that match the search term. ' +
    'Only answer with symbols that are within the list, or none. Users might confuse variables and parameters, ' +
    "preferably answer with the user's intended meaning. Answer with just a JSON array of symbol name(s) and nothing else. " +
    "Here's the user query:";

  const messages = [
    vscode.LanguageModelChatMessage.User(FIND_SYMBOLS_PROMPT),
    vscode.LanguageModelChatMessage.User(query),
    vscode.LanguageModelChatMessage.User(`Symbols:\n${symbols.join('\n')}`)
  ];

  let chatResponse = await model.sendRequest(
    messages,
    {},
    new vscode.CancellationTokenSource().token
  );

  const stringResponse = await accumulateResponse(chatResponse);

  let parsed: any;
  try {
    parsed = JSON.parse(stringResponse);
  } catch {
    parsed = { raw: stringResponse };
  }

  return parsed;
}

async function accumulateResponse(chatResponse: vscode.LanguageModelChatResponse) {
  let fullResponse = '';
  for await (const chunk of chatResponse.text) {
    fullResponse += chunk;
  }
  return fullResponse;
}