import * as http from 'http';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { randomUUID } from 'crypto';

// Store active sessions
const sessions = new Map<string, { server: McpServer; transport: StreamableHTTPServerTransport }>();

let httpServer: http.Server | null = null;

function createMcpServer(apiServerPort: number): McpServer {
  const server = new McpServer({
    name: "gams",
    version: "1.0.0",
    capabilities: {
      resources: {},
      tools: {},
    },
  });

  function returnError(message: string) {
    return {
      content: [
        {
          type: "text" as const,
          text: `Error: ${message}`,
        }
      ]
    };
  }

  // Register tools
  server.tool(
    "search_gams_symbols",
    'Semantically search for GAMS symbols (sets, parameters, variables, equations) based on a natural language query. Use this to find relevant symbols when you don\'t know the exact name.',
    {
      query: z.string().describe("The natural language query to find symbols for."),
    },
    async (req) => {
      const query = req.query;
      try {
        const response = await fetch(`http://localhost:${apiServerPort}/queryLLM`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify([query])
        }).then(res => res.json());

        if (!response) {
          return returnError("No symbols found matching the query.");
        }

        return {
          content: [{ type: "text" as const, text: JSON.stringify(response, null, 2) }]
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return returnError(`Failed to fetch symbol info: ${message}`);
      }
    }
  );

  server.tool(
    "get_symbol_details",
    "Retrieve detailed static analysis information for specific GAMS symbols, including type, description, domain, and declaration/definition locations.",
    {
      symbols: z.array(z.string()).describe("List of GAMS symbol names to get information about (case insensitive)."),
    },
    async (req) => {
      const symbols = req.symbols || [];
      if (!Array.isArray(symbols) || symbols.length === 0) {
        return returnError("No symbols provided.");
      }

      try {
        const results: unknown[] = [];

        for (const name of symbols) {
          const symbolName = String(name).trim();
          if (!symbolName) {
            continue;
          }

          const url = `http://localhost:${apiServerPort}/symbol?name=${encodeURIComponent(symbolName)}`;
          const res = await fetch(url);

          if (!res.ok) {
            results.push({ name: symbolName, error: `Failed to fetch symbol info (status ${res.status})` });
            continue;
          }

          const data = await res.json();
          results.push(data);
        }

        return {
          content: [{ type: "text" as const, text: JSON.stringify({ symbols: results }, null, 2) }],
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return returnError(`Failed to fetch symbol info: ${message}`);
      }
    }
  );

  server.tool(
    "get_symbol_values",
    "Retrieve the actual data values for specific GAMS symbols from the latest execution results.",
    {
      symbols: z.array(z.string()).describe("List of GAMS symbol names to get data for (case sensitive, matching the data store)."),
    },
    async (req) => {
      const symbols = req.symbols || [];
      if (!Array.isArray(symbols) || symbols.length === 0) {
        return returnError("No symbols provided.");
      }

      try {
        const results: unknown[] = [];

        for (const name of symbols) {
          const symbolName = String(name).trim();
          if (!symbolName) {
            continue;
          }

          const url = `http://localhost:${apiServerPort}/symbol-data?name=${encodeURIComponent(symbolName)}`;
          const res = await fetch(url);

          if (!res.ok) {
            results.push({ name: symbolName, error: `Failed to fetch symbol data (status ${res.status})` });
            continue;
          }

          const data = await res.json();
          results.push({ name: symbolName, data });
        }

        return {
          content: [{ type: "text" as const, text: JSON.stringify({ symbols: results }, null, 2) }],
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return returnError(`Failed to fetch symbol data: ${message}`);
      }
    }
  );

  server.tool(
    "get_model_structure",
    "Get the hierarchy of included files (the 'include tree') for the main GAMS file. Use this to understand file dependencies and execution order.",
    {},
    async () => {
      try {
        const res = await fetch(`http://localhost:${apiServerPort}/includeTree`);

        if (!res.ok) {
          return returnError(`Failed to fetch model structure (status ${res.status}).`);
        }

        const data = await res.json();
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ structure: data }, null, 2) }],
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return returnError(`Failed to fetch model structure: ${message}`);
      }
    }
  );

  server.tool(
    "get_solve_status",
    "Get the Model Status and Solver Status from the listing file (e.g. Optimal, Infeasible). Use this to quickly check if the model solved successfully.",
    {
      lstFilePath: z.string().describe("Absolute path to the .lst file."),
    },
    async (req) => {
      try {
        const res = await fetch(`http://localhost:${apiServerPort}/solve-status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lstFilePath: req.lstFilePath })
        });

        if (!res.ok) {
          return returnError(`Failed to get solve status (status ${res.status}).`);
        }

        const data = await res.json() as { status?: string; error?: string };

        if (!data.status) {
          return returnError(data.error || "No status found in listing file.");
        }

        return {
          content: [{ type: "text" as const, text: JSON.stringify({ status: data.status }, null, 2) }],
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return returnError(`Failed to get solve status: ${message}`);
      }
    }
  );

  server.tool(
    "get_reference_tree",
    "Get the full symbol reference tree as CSV. WARNING: This can be very large. Prefer using 'search_gams_symbols' or 'get_symbol_details' unless you need a global view of all symbols.",
    {},
    async () => {
      try {
        const res = await fetch(`http://localhost:${apiServerPort}/referenceTree`);

        if (!res.ok) {
          return returnError(`Failed to fetch reference tree (status ${res.status}).`);
        }

        const csv = await res.text();
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ csv }, null, 2) }],
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return returnError(`Failed to fetch reference tree: ${message}`);
      }
    }
  );

  server.tool(
    "check_syntax_errors",
    "Trigger a syntax check and update diagnostics for the current GAMS file or workspace. Use this to validate code changes.",
    {
      file: z.string().optional().describe("Optional path to a GAMS file to run diagnostics for. If omitted, diagnostics run for the active editor."),
    },
    async (req) => {
      try {
        const body: { file?: string } = {};
        if (req.file) {
          body.file = req.file;
        }

        const res = await fetch(`http://localhost:${apiServerPort}/update-diagnostics`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          return returnError(`Failed to trigger diagnostics update (status ${res.status}).`);
        }

        const data = await res.json() as { ok?: boolean; error?: string };

        if (!data.ok) {
          return returnError(`Diagnostics update reported failure: ${data.error || "unknown error"}.`);
        }

        return {
          content: [{ type: "text" as const, text: JSON.stringify({ ok: true }, null, 2) }],
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return returnError(`Failed to call update_diagnostics: ${message}`);
      }
    }
  );

  server.tool(
    "get_gams_execution_command",
    "Get the command line string required to execute a GAMS model, including all configured arguments and paths. Does not execute the command.",
    {
      file: z.string().optional().describe("Optional path to a GAMS file. If omitted, uses gamsIde.mainGmsFile."),
      extraArgs: z.array(z.string()).optional().describe("Optional additional command line arguments to append to the GAMS command."),
    },
    async (req) => {
      try {
        const payload: { file?: string; extraArgs?: string[] } = {};
        if (req.file) {
          payload.file = req.file;
        }
        if (req.extraArgs) {
          payload.extraArgs = req.extraArgs;
        }

        const res = await fetch(`http://localhost:${apiServerPort}/gams-execution-command`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          return returnError(`Failed to get GAMS execution command (status ${res.status}).`);
        }

        const data = await res.json();
        return {
          content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return returnError(`Failed to get GAMS execution command: ${message}`);
      }
    }
  );

  server.tool(
    "get_gams_compile_command",
    "Get the command line string required to compile a GAMS model. Does not execute the command.",
    {
      file: z.string().optional().describe("Optional path to a GAMS file. If omitted, uses gamsIde.mainGmsFile."),
      extraArgs: z.array(z.string()).optional().describe("Optional additional command line arguments to append to the GAMS command."),
    },
    async (req) => {
      try {
        const payload: { file?: string; extraArgs?: string[] } = {};
        if (req.file) {
          payload.file = req.file;
        }
        if (req.extraArgs) {
          payload.extraArgs = req.extraArgs;
        }

        const res = await fetch(`http://localhost:${apiServerPort}/gams-compile-command`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          return returnError(`Failed to get GAMS compile command (status ${res.status}).`);
        }

        const data = await res.json();
        return {
          content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return returnError(`Failed to get GAMS compile command: ${message}`);
      }
    }
  );

  server.tool(
    "read_listing_file_for_symbols",
    "Read and extract specific symbol information (values, equation listings) from a GAMS listing (.lst) file.",
    {
      lstFilePath: z.string().describe("Absolute path to the .lst file to filter."),
      symbols: z.union([z.string(), z.array(z.string())]).describe("A symbol name or list of symbol names to filter for."),
    },
    async (req) => {
      try {
        const res = await fetch(`http://localhost:${apiServerPort}/filter-listing`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lstFilePath: req.lstFilePath, symbols: req.symbols }),
        });

        if (!res.ok) {
          try {
            const errorData = await res.json() as { error?: string };
            if (errorData?.error) {
              return returnError(`Failed to filter listing file: ${errorData.error}`);
            }
          } catch {
            // ignore JSON parsing errors
          }
          return returnError(`Failed to filter listing file: (status ${res.status}).`);
        }

        const data = await res.json() as { summaryContent?: string; error?: string };

        if (!data.summaryContent) {
          return returnError(`Filtering listing file did not return a summary: ${data.error || "unknown error"}.`);
        }

        return {
          content: [{ type: "text" as const, text: JSON.stringify({ summaryContent: data.summaryContent }, null, 2) }],
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return returnError(`Failed to call filter_listing_file: ${message}`);
      }
    }
  );

  return server;
}

/**
 * Starts the MCP HTTP server on the specified port
 */
export async function startMcpHttpServer(apiServerPort: number, mcpPort: number): Promise<http.Server> {
  return new Promise((resolve, reject) => {
    httpServer = http.createServer(async (req, res) => {
      // Set CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Mcp-Session-Id, MCP-Protocol-Version, Last-Event-ID');
      res.setHeader('Access-Control-Expose-Headers', 'Mcp-Session-Id');

      // Handle preflight requests
      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      const url = new URL(req.url || '/', `http://localhost:${mcpPort}`);
      
      // Only handle /mcp endpoint
      if (url.pathname !== '/mcp') {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
        return;
      }

      const sessionId = req.headers['mcp-session-id'] as string | undefined;

      if (req.method === 'GET') {
        // Handle GET request for SSE stream
        if (sessionId && sessions.has(sessionId)) {
          const session = sessions.get(sessionId)!;
          await session.transport.handleRequest(req, res);
        } else {
          // No session or session not found - return 405
          res.writeHead(405, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            jsonrpc: "2.0",
            error: { code: -32000, message: "Method not allowed or session not found." },
            id: null
          }));
        }
        return;
      }

      if (req.method === 'POST') {
        // Parse request body
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const parsedBody = JSON.parse(body);
            const isInitialize = parsedBody.method === 'initialize';

            if (isInitialize) {
              // Create new session
              const newSessionId = randomUUID();
              const server = createMcpServer(apiServerPort);
              const transport = new StreamableHTTPServerTransport({
                sessionIdGenerator: () => newSessionId,
                onsessioninitialized: (sid) => {
                  console.log(`MCP Session initialized: ${sid}`);
                },
                onsessionclosed: (sid) => {
                  console.log(`MCP Session closed: ${sid}`);
                  sessions.delete(sid);
                }
              });

              await server.connect(transport);
              sessions.set(newSessionId, { server, transport });
              
              await transport.handleRequest(req, res, parsedBody);
            } else if (sessionId && sessions.has(sessionId)) {
              // Use existing session
              const session = sessions.get(sessionId)!;
              await session.transport.handleRequest(req, res, parsedBody);
            } else if (sessionId) {
              // Session ID provided but not found
              res.writeHead(404, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                jsonrpc: "2.0",
                error: { code: -32000, message: "Session not found." },
                id: parsedBody.id || null
              }));
            } else {
              // No session ID for non-initialize request
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                jsonrpc: "2.0",
                error: { code: -32000, message: "Session ID required for non-initialize requests." },
                id: parsedBody.id || null
              }));
            }
          } catch (error) {
            console.error('Error handling MCP request:', error);
            if (!res.headersSent) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                jsonrpc: '2.0',
                error: { code: -32603, message: 'Internal server error' },
                id: null,
              }));
            }
          }
        });
        return;
      }

      if (req.method === 'DELETE') {
        // Handle session termination
        if (sessionId && sessions.has(sessionId)) {
          const session = sessions.get(sessionId)!;
          await session.transport.close();
          await session.server.close();
          sessions.delete(sessionId);
          res.writeHead(204);
          res.end();
        } else {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            jsonrpc: "2.0",
            error: { code: -32000, message: "Session not found." },
            id: null
          }));
        }
        return;
      }

      // Method not allowed
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        jsonrpc: "2.0",
        error: { code: -32000, message: "Method not allowed." },
        id: null
      }));
    });

    httpServer.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        reject(new Error(`Port ${mcpPort} is already in use`));
      } else {
        reject(error);
      }
    });

    // Bind only to localhost for security (DNS rebinding protection)
    httpServer.listen(mcpPort, '127.0.0.1', () => {
      console.log(`GAMS MCP Server running on http://127.0.0.1:${mcpPort}/mcp`);
      resolve(httpServer!);
    });
  });
}

/**
 * Stops the MCP HTTP server
 */
export async function stopMcpHttpServer(): Promise<void> {
  if (httpServer) {
    // Close all sessions
    for (const [sessionId, session] of sessions) {
      try {
        await session.transport.close();
        await session.server.close();
      } catch (error) {
        console.error(`Error closing session ${sessionId}:`, error);
      }
    }
    sessions.clear();

    return new Promise((resolve, reject) => {
      httpServer!.close((err) => {
        if (err) {
          reject(err);
        } else {
          httpServer = null;
          console.log('GAMS MCP Server stopped');
          resolve();
        }
      });
    });
  }
}

/**
 * Check if the MCP server is running
 */
export function isMcpServerRunning(): boolean {
  return httpServer !== null && httpServer.listening;
}

/**
 * Get the MCP server URL
 */
export function getMcpServerUrl(port: number): string {
  return `http://127.0.0.1:${port}/mcp`;
}
