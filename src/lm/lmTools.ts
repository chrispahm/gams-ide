import * as vscode from 'vscode';

// Interface definitions for tool input parameters
interface SearchSymbolsInput {
  query: string;
}

interface GetSymbolDetailsInput {
  symbols: string[];
}

interface GetSymbolValuesInput {
  symbols: string[];
}

interface GetSolveStatusInput {
  lstFilePath: string;
}

interface CheckSyntaxErrorsInput {
  file?: string;
}

interface GetExecutionCommandInput {
  file?: string;
  extraArgs?: string[];
}

interface GetCompileCommandInput {
  file?: string;
  extraArgs?: string[];
}

interface ReadListingForSymbolsInput {
  lstFilePath: string;
  symbols: string[];
}

// Helper function to create error result
function createErrorResult(message: string): vscode.LanguageModelToolResult {
  return new vscode.LanguageModelToolResult([
    new vscode.LanguageModelTextPart(`Error: ${message}`)
  ]);
}

// Helper function to create success result
function createSuccessResult(data: unknown): vscode.LanguageModelToolResult {
  return new vscode.LanguageModelToolResult([
    new vscode.LanguageModelTextPart(JSON.stringify(data, null, 2))
  ]);
}

/**
 * Search GAMS Symbols Tool
 */
export class SearchGamsSymbolsTool implements vscode.LanguageModelTool<SearchSymbolsInput> {
  constructor(private apiServerPort: number) {}

  async prepareInvocation(
    options: vscode.LanguageModelToolInvocationPrepareOptions<SearchSymbolsInput>,
    _token: vscode.CancellationToken
  ): Promise<vscode.PreparedToolInvocation> {
    return {
      invocationMessage: `Searching for GAMS symbols matching: "${options.input.query}"`,
      confirmationMessages: {
        title: 'Search GAMS Symbols',
        message: new vscode.MarkdownString(`Search for symbols matching: **${options.input.query}**?`)
      }
    };
  }

  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<SearchSymbolsInput>,
    _token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    const { query } = options.input;
    
    try {
      const response = await fetch(`http://localhost:${this.apiServerPort}/queryLLM`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([query])
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data) {
        return createErrorResult("No symbols found matching the query.");
      }
      
      return createSuccessResult(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return createErrorResult(`Failed to search symbols: ${message}`);
    }
  }
}

/**
 * Get Symbol Details Tool
 */
export class GetSymbolDetailsTool implements vscode.LanguageModelTool<GetSymbolDetailsInput> {
  constructor(private apiServerPort: number) {}

  async prepareInvocation(
    options: vscode.LanguageModelToolInvocationPrepareOptions<GetSymbolDetailsInput>,
    _token: vscode.CancellationToken
  ): Promise<vscode.PreparedToolInvocation> {
    const symbolList = options.input.symbols.join(', ');
    return {
      invocationMessage: `Getting details for GAMS symbols: ${symbolList}`,
      confirmationMessages: {
        title: 'Get GAMS Symbol Details',
        message: new vscode.MarkdownString(`Get details for symbols: **${symbolList}**?`)
      }
    };
  }

  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<GetSymbolDetailsInput>,
    _token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    const { symbols } = options.input;
    
    if (!symbols || symbols.length === 0) {
      return createErrorResult("No symbols provided.");
    }
    
    try {
      const results: unknown[] = [];
      
      for (const name of symbols) {
        const symbolName = String(name).trim();
        if (!symbolName) {
          continue;
        }
        
        const url = `http://localhost:${this.apiServerPort}/symbol?name=${encodeURIComponent(symbolName)}`;
        const res = await fetch(url);
        
        if (!res.ok) {
          results.push({ name: symbolName, error: `Failed to fetch (status ${res.status})` });
          continue;
        }
        
        const data = await res.json();
        results.push(data);
      }
      
      return createSuccessResult({ symbols: results });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return createErrorResult(`Failed to fetch symbol info: ${message}`);
    }
  }
}

/**
 * Get Symbol Values Tool
 */
export class GetSymbolValuesTool implements vscode.LanguageModelTool<GetSymbolValuesInput> {
  constructor(private apiServerPort: number) {}

  async prepareInvocation(
    options: vscode.LanguageModelToolInvocationPrepareOptions<GetSymbolValuesInput>,
    _token: vscode.CancellationToken
  ): Promise<vscode.PreparedToolInvocation> {
    const symbolList = options.input.symbols.join(', ');
    return {
      invocationMessage: `Getting values for GAMS symbols: ${symbolList}`,
      confirmationMessages: {
        title: 'Get GAMS Symbol Values',
        message: new vscode.MarkdownString(`Get values for symbols: **${symbolList}**?`)
      }
    };
  }

  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<GetSymbolValuesInput>,
    _token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    const { symbols } = options.input;
    
    if (!symbols || symbols.length === 0) {
      return createErrorResult("No symbols provided.");
    }
    
    try {
      const results: unknown[] = [];
      
      for (const name of symbols) {
        const symbolName = String(name).trim();
        if (!symbolName) {
          continue;
        }
        
        const url = `http://localhost:${this.apiServerPort}/symbol-data?name=${encodeURIComponent(symbolName)}`;
        const res = await fetch(url);
        
        if (!res.ok) {
          results.push({ name: symbolName, error: `Failed to fetch (status ${res.status})` });
          continue;
        }
        
        const data = await res.json();
        results.push({ name: symbolName, data });
      }
      
      return createSuccessResult({ symbols: results });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return createErrorResult(`Failed to fetch symbol data: ${message}`);
    }
  }
}

/**
 * Get Model Structure Tool
 */
export class GetModelStructureTool implements vscode.LanguageModelTool<Record<string, never>> {
  constructor(private apiServerPort: number) {}

  async prepareInvocation(
    _options: vscode.LanguageModelToolInvocationPrepareOptions<Record<string, never>>,
    _token: vscode.CancellationToken
  ): Promise<vscode.PreparedToolInvocation> {
    return {
      invocationMessage: 'Getting GAMS model structure (include tree)',
      confirmationMessages: {
        title: 'Get GAMS Model Structure',
        message: new vscode.MarkdownString('Get the include tree structure for the main GAMS file?')
      }
    };
  }

  async invoke(
    _options: vscode.LanguageModelToolInvocationOptions<Record<string, never>>,
    _token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    try {
      const res = await fetch(`http://localhost:${this.apiServerPort}/includeTree`);
      
      if (!res.ok) {
        return createErrorResult(`Failed to fetch model structure (status ${res.status}).`);
      }
      
      const data = await res.json();
      return createSuccessResult({ structure: data });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return createErrorResult(`Failed to fetch model structure: ${message}`);
    }
  }
}

/**
 * Get Solve Status Tool
 */
export class GetSolveStatusTool implements vscode.LanguageModelTool<GetSolveStatusInput> {
  constructor(private apiServerPort: number) {}

  async prepareInvocation(
    options: vscode.LanguageModelToolInvocationPrepareOptions<GetSolveStatusInput>,
    _token: vscode.CancellationToken
  ): Promise<vscode.PreparedToolInvocation> {
    return {
      invocationMessage: `Getting solve status from: ${options.input.lstFilePath}`,
      confirmationMessages: {
        title: 'Get GAMS Solve Status',
        message: new vscode.MarkdownString(`Get solve status from listing file:\n\`${options.input.lstFilePath}\`?`)
      }
    };
  }

  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<GetSolveStatusInput>,
    _token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    const { lstFilePath } = options.input;
    
    try {
      const res = await fetch(`http://localhost:${this.apiServerPort}/solve-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lstFilePath })
      });
      
      if (!res.ok) {
        return createErrorResult(`Failed to get solve status (status ${res.status}).`);
      }
      
      const data = await res.json() as { status?: string; error?: string };
      
      if (!data.status) {
        return createErrorResult(data.error || "No status found in listing file.");
      }
      
      return createSuccessResult({ status: data.status });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return createErrorResult(`Failed to get solve status: ${message}`);
    }
  }
}

/**
 * Get Reference Tree Tool
 */
export class GetReferenceTreeTool implements vscode.LanguageModelTool<Record<string, never>> {
  constructor(private apiServerPort: number) {}

  async prepareInvocation(
    _options: vscode.LanguageModelToolInvocationPrepareOptions<Record<string, never>>,
    _token: vscode.CancellationToken
  ): Promise<vscode.PreparedToolInvocation> {
    return {
      invocationMessage: 'Getting full GAMS reference tree (this may be large)',
      confirmationMessages: {
        title: 'Get GAMS Reference Tree',
        message: new vscode.MarkdownString('Get the full symbol reference tree as CSV?\n\n**Warning:** This can be very large for complex models.')
      }
    };
  }

  async invoke(
    _options: vscode.LanguageModelToolInvocationOptions<Record<string, never>>,
    _token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    try {
      const res = await fetch(`http://localhost:${this.apiServerPort}/referenceTree`);
      
      if (!res.ok) {
        return createErrorResult(`Failed to fetch reference tree (status ${res.status}).`);
      }
      
      const csv = await res.text();
      return createSuccessResult({ csv });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return createErrorResult(`Failed to fetch reference tree: ${message}`);
    }
  }
}

/**
 * Check Syntax Errors Tool
 */
export class CheckSyntaxErrorsTool implements vscode.LanguageModelTool<CheckSyntaxErrorsInput> {
  constructor(private apiServerPort: number) {}

  async prepareInvocation(
    options: vscode.LanguageModelToolInvocationPrepareOptions<CheckSyntaxErrorsInput>,
    _token: vscode.CancellationToken
  ): Promise<vscode.PreparedToolInvocation> {
    const target = options.input.file || 'active editor';
    return {
      invocationMessage: `Checking syntax errors in: ${target}`,
      confirmationMessages: {
        title: 'Check GAMS Syntax Errors',
        message: new vscode.MarkdownString(`Run syntax check for: **${target}**?`)
      }
    };
  }

  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<CheckSyntaxErrorsInput>,
    _token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    try {
      const body: { file?: string } = {};
      if (options.input.file) {
        body.file = options.input.file;
      }
      
      const res = await fetch(`http://localhost:${this.apiServerPort}/update-diagnostics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      
      if (!res.ok) {
        return createErrorResult(`Failed to trigger diagnostics (status ${res.status}).`);
      }
      
      const data = await res.json() as { ok?: boolean; error?: string };
      
      if (!data.ok) {
        return createErrorResult(`Diagnostics update failed: ${data.error || "unknown error"}.`);
      }
      
      return createSuccessResult({ ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return createErrorResult(`Failed to check syntax errors: ${message}`);
    }
  }
}

/**
 * Get Execution Command Tool
 */
export class GetExecutionCommandTool implements vscode.LanguageModelTool<GetExecutionCommandInput> {
  constructor(private apiServerPort: number) {}

  async prepareInvocation(
    options: vscode.LanguageModelToolInvocationPrepareOptions<GetExecutionCommandInput>,
    _token: vscode.CancellationToken
  ): Promise<vscode.PreparedToolInvocation> {
    const target = options.input.file || 'main GAMS file';
    return {
      invocationMessage: `Getting execution command for: ${target}`,
      confirmationMessages: {
        title: 'Get GAMS Execution Command',
        message: new vscode.MarkdownString(`Get the command to execute: **${target}**?`)
      }
    };
  }

  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<GetExecutionCommandInput>,
    _token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    try {
      const payload: { file?: string; extraArgs?: string[] } = {};
      if (options.input.file) {
        payload.file = options.input.file;
      }
      if (options.input.extraArgs) {
        payload.extraArgs = options.input.extraArgs;
      }
      
      const res = await fetch(`http://localhost:${this.apiServerPort}/gams-execution-command`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        return createErrorResult(`Failed to get execution command (status ${res.status}).`);
      }
      
      const data = await res.json();
      return createSuccessResult(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return createErrorResult(`Failed to get execution command: ${message}`);
    }
  }
}

/**
 * Get Compile Command Tool
 */
export class GetCompileCommandTool implements vscode.LanguageModelTool<GetCompileCommandInput> {
  constructor(private apiServerPort: number) {}

  async prepareInvocation(
    options: vscode.LanguageModelToolInvocationPrepareOptions<GetCompileCommandInput>,
    _token: vscode.CancellationToken
  ): Promise<vscode.PreparedToolInvocation> {
    const target = options.input.file || 'main GAMS file';
    return {
      invocationMessage: `Getting compile command for: ${target}`,
      confirmationMessages: {
        title: 'Get GAMS Compile Command',
        message: new vscode.MarkdownString(`Get the command to compile: **${target}**?`)
      }
    };
  }

  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<GetCompileCommandInput>,
    _token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    try {
      const payload: { file?: string; extraArgs?: string[] } = {};
      if (options.input.file) {
        payload.file = options.input.file;
      }
      if (options.input.extraArgs) {
        payload.extraArgs = options.input.extraArgs;
      }
      
      const res = await fetch(`http://localhost:${this.apiServerPort}/gams-compile-command`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        return createErrorResult(`Failed to get compile command (status ${res.status}).`);
      }
      
      const data = await res.json();
      return createSuccessResult(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return createErrorResult(`Failed to get compile command: ${message}`);
    }
  }
}

/**
 * Read Listing for Symbols Tool
 */
export class ReadListingForSymbolsTool implements vscode.LanguageModelTool<ReadListingForSymbolsInput> {
  constructor(private apiServerPort: number) {}

  async prepareInvocation(
    options: vscode.LanguageModelToolInvocationPrepareOptions<ReadListingForSymbolsInput>,
    _token: vscode.CancellationToken
  ): Promise<vscode.PreparedToolInvocation> {
    const symbolList = options.input.symbols.join(', ');
    return {
      invocationMessage: `Reading listing file for symbols: ${symbolList}`,
      confirmationMessages: {
        title: 'Read GAMS Listing for Symbols',
        message: new vscode.MarkdownString(`Extract information for symbols **${symbolList}** from:\n\`${options.input.lstFilePath}\`?`)
      }
    };
  }

  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<ReadListingForSymbolsInput>,
    _token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    const { lstFilePath, symbols } = options.input;
    
    try {
      const res = await fetch(`http://localhost:${this.apiServerPort}/filter-listing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lstFilePath, symbols })
      });
      
      if (!res.ok) {
        try {
          const errorData = await res.json() as { error?: string };
          if (errorData?.error) {
            return createErrorResult(`Failed to filter listing file: ${errorData.error}`);
          }
        } catch {
          // ignore JSON parsing errors
        }
        return createErrorResult(`Failed to filter listing file (status ${res.status}).`);
      }
      
      const data = await res.json() as { summaryContent?: string; error?: string };
      
      if (!data.summaryContent) {
        return createErrorResult(`No content found: ${data.error || "unknown error"}.`);
      }
      
      return createSuccessResult({ summaryContent: data.summaryContent });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return createErrorResult(`Failed to read listing file: ${message}`);
    }
  }
}

/**
 * Register all GAMS language model tools
 */
export function registerGamsLmTools(
  context: vscode.ExtensionContext,
  apiServerPort: number
): void {
  context.subscriptions.push(
    vscode.lm.registerTool('gams-ide_search_symbols', new SearchGamsSymbolsTool(apiServerPort)),
    vscode.lm.registerTool('gams-ide_get_symbol_details', new GetSymbolDetailsTool(apiServerPort)),
    vscode.lm.registerTool('gams-ide_get_symbol_values', new GetSymbolValuesTool(apiServerPort)),
    vscode.lm.registerTool('gams-ide_get_model_structure', new GetModelStructureTool(apiServerPort)),
    vscode.lm.registerTool('gams-ide_get_solve_status', new GetSolveStatusTool(apiServerPort)),
    vscode.lm.registerTool('gams-ide_get_reference_tree', new GetReferenceTreeTool(apiServerPort)),
    vscode.lm.registerTool('gams-ide_check_syntax_errors', new CheckSyntaxErrorsTool(apiServerPort)),
    vscode.lm.registerTool('gams-ide_get_execution_command', new GetExecutionCommandTool(apiServerPort)),
    vscode.lm.registerTool('gams-ide_get_compile_command', new GetCompileCommandTool(apiServerPort)),
    vscode.lm.registerTool('gams-ide_read_listing_for_symbols', new ReadListingForSymbolsTool(apiServerPort))
  );
}
