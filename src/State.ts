export type StateRecord = Record<string, unknown>;
import type { SymbolDataStore } from "./types/gams-symbols";
export default class State {
  private state: StateRecord;

  constructor() {
    this.state = {};
  }

  update<T = unknown>(key: string, newState: T): void {
    this.state[key] = newState as unknown;

    // When the reference tree is updated, persist a flattened CSV snapshot (non-blocking)
    // if (key === 'referenceTree' && Array.isArray(newState)) {
    //   this.persistReferenceTreeCsv(newState as unknown as any[]).catch((err) => {
    //     try {
    //       console.warn('Failed to persist referenceTree to CSV:', err);
    //     } catch {
    //       // noop
    //     }
    //   });
    //   this.persistDataStoreCsv(this.state['dataStore'] as unknown as any[]).catch((err) => {
    //     try {
    //       console.warn('Failed to persist dataStore to CSV:', err);
    //     } catch {
    //       // noop
    //     }
    //   });
    // }

  }

  get<T = unknown>(key: string): T | undefined {
    return this.state[key] as T | undefined;
  }

  // --- Internal helpers ---
  private async persistReferenceTreeCsv(referenceTree: any[]): Promise<void> {
    const { default: path } = await import('node:path');
    const fs = await import('node:fs/promises');

    // Resolve output directory via VS Code setting gamsIde.scratchDirectory, else fall back to bundled scrdir
    let outDir: string | undefined;
    try {
      const vscode = await import('vscode');
      const cfg = vscode.workspace.getConfiguration('gamsIde');
      const configured = cfg.get<string>('scratchDirectory');
      if (configured && configured.trim().length > 0) {
        outDir = configured;
      }
    } catch {
      // vscode not available (e.g., unit tests)
    }
    if (!outDir) {
      const here = path.resolve(__dirname);
      outDir = path.resolve(here, '../scrdir');
    }

    // Ensure directory exists
    try {
      await fs.access(outDir);
    } catch {
      await fs.mkdir(outDir, { recursive: true });
    }

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
      'data'
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

      const line = headers.map((h) => csvEscape(row[h])).join(',');
      if (row.nameLo) {
        lines.push(line);
      }
    }

    const outPath = path.join(outDir, 'referenceTree.csv');
    await fs.writeFile(outPath, lines.join('\n'), 'utf8');
  }

  private async persistDataStoreCsv(dataStore: SymbolDataStore): Promise<void> {
    const { default: path } = await import('node:path');
    const fs = await import('node:fs/promises');

    // Resolve output directory via VS Code setting gamsIde.scratchDirectory, else fall back to bundled scrdir
    let outDir: string | undefined;
    try {
      const vscode = await import('vscode');
      const cfg = vscode.workspace.getConfiguration('gamsIde');
      const configured = cfg.get<string>('scratchDirectory');
      if (configured && configured.trim().length > 0) {
        outDir = configured;
      }
    } catch {
      // vscode not available (e.g., unit tests)
    }
    if (!outDir) {
      const here = path.resolve(__dirname);
      outDir = path.resolve(here, '../scrdir');
    }

    // Ensure directory exists
    try {
      await fs.access(outDir);
    } catch {
      await fs.mkdir(outDir, { recursive: true });
    }

    // dataStore is an object with symbol names as keys and array of objects with the keys solve (string) and data (string)
    const headers = ["symbol", "solve", "data"] as const;

    const csvEscape = (v: unknown): string => {
      const s = v === undefined || v === null ? '' : String(v);
      if (s === '') {
        return '';
      }
      const needsQuotes = /[",\n\r]/.test(s);
      const escaped = s.replace(/\"/g, '""');
      return needsQuotes ? `\"${escaped}\"` : escaped;
    };

    const lines: string[] = [];
    lines.push(headers.join(','));

    for (const symbol in dataStore || []) {
      const entry = dataStore[symbol];
      /*
      for (const solveEntry of entry) {
        const solve = solveEntry.solve;
        const data = solveEntry.data;
        const row: Record<(typeof headers)[number], unknown> = {
          symbol,
          solve,
          data,
        };
        const line = headers.map((h) => csvEscape(row[h])).join(',');
        if (row.symbol) {
          lines.push(line);
        }
      }
      */
      // find the first data entry with non-empty data
      const firstNonEmpty = entry.find(e => e.data && e.data.trim().length > 0);
      if (firstNonEmpty) {
        const row: Record<(typeof headers)[number], unknown> = {
          symbol,
          solve: firstNonEmpty.solve,
          data: JSON.stringify(firstNonEmpty.data),
        };
        const line = headers.map((h) => csvEscape(row[h])).join(',');
        if (row.symbol) {
          lines.push(line);
        }
      }
    }

    const outPath = path.join(outDir, 'dataStore.csv');
    await fs.writeFile(outPath, lines.join('\n'), 'utf8');
  }
}
