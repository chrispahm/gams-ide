import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

if (!process.env.API_SERVER_PORT) {
  console.error("Error: API_SERVER_PORT environment variable is not set.");
  process.exit(1);
}
const apiServerPort = parseInt(process.env.API_SERVER_PORT, 10);

// Create server instance
const server = new McpServer({
  name: "gams",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {
      search_gams_symbols: {
        name: "search_gams_symbols",
        title: "Search GAMS Symbols",
        description: "Semantically search for GAMS symbols (sets, parameters, variables, equations) based on a natural language query. Use this to find relevant symbols when you don't know the exact name.",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The user query to find symbols for."
            }
          },
          required: ["query"]
        },
        outputSchema: {
          type: "object",
          properties: {
            symbols: {
              type: "array",
              items: {
                type: "string"
              },
              description: "List of symbol names that best match the query."
            }
          },
          required: ["symbols"]
        }
      },
      get_symbol_details: {
        name: "get_symbol_details",
        title: "Get Symbol Details",
        description: "Retrieve detailed static analysis information for specific GAMS symbols, including type, description, domain, and declaration/definition locations.",
        inputSchema: {
          type: "object",
          properties: {
            symbols: {
              type: "array",
              items: { type: "string" },
              description: "List of symbol names to fetch info for (case insensitive).",
            },
          },
          required: ["symbols"],
        },
        outputSchema: {
          type: "object",
          properties: {
            symbols: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: true,
              },
              description: "Array of symbol info objects as returned by the API server.",
            },
          },
          required: ["symbols"],
        },
      },
      get_symbol_values: {
        name: "get_symbol_values",
        title: "Get Symbol Values",
        description:
          "Retrieve the actual data values for specific GAMS symbols from the latest execution results.",
        inputSchema: {
          type: "object",
          properties: {
            symbols: {
              type: "array",
              items: { type: "string" },
              description:
                "List of symbol names to fetch data for (case sensitive, matching the data store).",
            },
          },
          required: ["symbols"],
        },
        outputSchema: {
          type: "object",
          properties: {
            symbols: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: true,
              },
              description:
                "Array of symbol data objects (or error objects) as returned by the API server.",
            },
          },
          required: ["symbols"],
        },
      },
      get_reference_tree: {
        name: "get_reference_tree",
        title: "Get Reference Tree",
        description:
          "Get the full symbol reference tree as CSV. WARNING: This can be very large. Prefer using 'search_gams_symbols' or 'get_symbol_details' unless you need a global view of all symbols.",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false,
        },
        outputSchema: {
          type: "object",
          properties: {
            csv: {
              type: "string",
              description: "The reference tree encoded as CSV text.",
            },
          },
          required: ["csv"],
        },
      },
      check_syntax_errors: {
        name: "check_syntax_errors",
        title: "Check Syntax Errors",
        description:
          "Trigger a syntax check and update diagnostics for the current GAMS file or workspace. Use this to validate code changes.",
        inputSchema: {
          type: "object",
          properties: {
            file: {
              type: "string",
              description:
                "Optional path to a GAMS file to run diagnostics for. If omitted, diagnostics run for the active editor.",
            },
          },
          additionalProperties: false,
        },
        outputSchema: {
          type: "object",
          properties: {
            ok: { type: "boolean" },
            error: { type: "string" },
          },
          required: ["ok"],
        },
      },
      get_gams_execution_command: {
        name: "get_gams_execution_command",
        title: "Get GAMS Execution Command",
        description:
          "Get the command line string required to execute a GAMS model, including all configured arguments and paths. Does not execute the command.",
        inputSchema: {
          type: "object",
          properties: {
            file: {
              type: "string",
              description:
                "Optional path to a GAMS file. If omitted, uses gamsIde.mainGmsFile.",
            },
            extraArgs: {
              type: "array",
              items: { type: "string" },
              description:
                "Optional additional command line arguments to append to the GAMS command.",
            },
          },
          additionalProperties: false,
        },
        outputSchema: {
          type: "object",
          properties: {
            gamsExe: { type: "string" },
            gamsArgs: {
              type: "array",
              items: { type: "string" },
            },
            listingPath: { type: "string" },
            gamsFile: { type: "string" },
            filePath: { type: "string" },
          },
          required: ["gamsExe", "gamsArgs", "listingPath", "gamsFile", "filePath"],
        },
      },
      get_gams_compile_command: {
        name: "get_gams_compile_command",
        title: "Get GAMS Compile Command",
        description:
          "Get the command line string required to compile a GAMS model. Does not execute the command.",
        inputSchema: {
          type: "object",
          properties: {
            file: {
              type: "string",
              description:
                "Optional path to a GAMS file. If omitted, uses gamsIde.mainGmsFile.",
            },
            extraArgs: {
              type: "array",
              items: { type: "string" },
              description:
                "Optional additional command line arguments to append to the GAMS command.",
            },
          },
          additionalProperties: false,
        },
        outputSchema: {
          type: "object",
          properties: {
            gamsExe: { type: "string" },
            gamsArgs: {
              type: "array",
              items: { type: "string" },
            },
            listingPath: { type: "string" },
            gamsFile: { type: "string" },
            filePath: { type: "string" },
          },
          required: ["gamsExe", "gamsArgs", "listingPath", "gamsFile", "filePath"],
        },
      },
      read_listing_file_for_symbols: {
        name: "read_listing_file_for_symbols",
        title: "Read Listing File for Symbols",
        description:
          "Read and extract specific symbol information (values, equation listings) from a GAMS listing (.lst) file.",
        inputSchema: {
          type: "object",
          properties: {
            lstFilePath: {
              type: "string",
              description: "Absolute path to the .lst file to filter.",
            },
            symbols: {
              anyOf: [
                { type: "string" },
                {
                  type: "array",
                  items: { type: "string" },
                },
              ],
              description:
                "A symbol name or list of symbol names to filter for.",
            },
          },
          required: ["lstFilePath", "symbols"],
          additionalProperties: false,
        },
        outputSchema: {
          type: "object",
          properties: {
            summaryContent: {
              type: "string",
              description:
                "Filtered listing content as a string.",
            },
          },
          required: ["summaryContent"],
        },
      },
    },
  },
});

function returnError(message: string) {
  return {
    content: [
      {
        type: "text",
        text: `Error: ${message}`,
      }
    ]
  };
}

// @ts-ignore - suppress unused warning
server.tool(
  "search_gams_symbols",
  'Semantically search for GAMS symbols (sets, parameters, variables, equations) based on a natural language query. Use this to find relevant symbols when you don\'t know the exact name.',
  {
    query: z.array(z.string()).describe("List of GAMS symbols to get information about (case insensitive)."),
  },
  async (req = { query: [] }) => {
    const query = req.query;
    // send the req to the "queryLLM" POST endpoint of the API server
    try {
      const response = await fetch(`http://localhost:${apiServerPort}/queryLLM`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(query)
      }).then(res => res.json());

      if (!response) {
        // no symbols found
        return returnError("No symbols found matching the query.");
      }
    
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(response, null, 2),
          }
        ]
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return returnError(`Failed to fetch symbol info: ${message}`);
    }
  }
);

// @ts-ignore - suppress unused warning
server.tool(
  "get_symbol_details",
  "Retrieve detailed static analysis information for specific GAMS symbols, including type, description, domain, and declaration/definition locations.",
  {
    symbols: z
      .array(z.string())
      .describe(
        "List of GAMS symbol names to get information about (case insensitive).",
      ),
  },
  async (req = { symbols: [] }) => {
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

        const url = `http://localhost:${apiServerPort}/symbol?name=${encodeURIComponent(
          symbolName,
        )}`;

        const res = await fetch(url);

        if (!res.ok) {
          // If a symbol is not found (404) or other error, skip but record an error entry
          results.push({
            name: symbolName,
            error: `Failed to fetch symbol info (status ${res.status})`,
          });
          continue;
        }

        const data = await res.json();
        results.push(data);
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ symbols: results }, null, 2),
          },
        ],
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return returnError(`Failed to fetch symbol info: ${message}`);
    }
  },
);

// @ts-ignore - suppress unused warning
server.tool(
  "get_symbol_values",
  "Retrieve the actual data values for specific GAMS symbols from the latest execution results.",
  {
    symbols: z
      .array(z.string())
      .describe(
        "List of GAMS symbol names to get data for (case sensitive, matching the data store).",
      ),
  },
  async (req = { symbols: [] }) => {
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

        const url = `http://localhost:${apiServerPort}/symbol-data?name=${encodeURIComponent(
          symbolName,
        )}`;

        const res = await fetch(url);

        if (!res.ok) {
          results.push({
            name: symbolName,
            error: `Failed to fetch symbol data (status ${res.status})`,
          });
          continue;
        }

        const data = await res.json();
        results.push({ name: symbolName, data });
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ symbols: results }, null, 2),
          },
        ],
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return returnError(`Failed to fetch symbol data: ${message}`);
    }
  },
);

// @ts-ignore - suppress unused warning
server.tool(
  "get_reference_tree",
  "Get the full symbol reference tree as CSV. WARNING: This can be very large. Prefer using 'search_gams_symbols' or 'get_symbol_details' unless you need a global view of all symbols.",
  {},
  async () => {
    try {
      const res = await fetch(`http://localhost:${apiServerPort}/referenceTree`);

      if (!res.ok) {
        return returnError(
          `Failed to fetch reference tree (status ${res.status}).`,
        );
      }

      const csv = await res.text();

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ csv }, null, 2),
          },
        ],
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return returnError(`Failed to fetch reference tree: ${message}`);
    }
  },
);

// @ts-ignore - suppress unused warning
server.tool(
  "check_syntax_errors",
  "Trigger a syntax check and update diagnostics for the current GAMS file or workspace. Use this to validate code changes.",
  {
    file: z
      .string()
      .optional()
      .describe(
        "Optional path to a GAMS file to run diagnostics for. If omitted, diagnostics run for the active editor.",
      ),
  },
  async (req = {}) => {
    try {
      const body: { file?: string } = {};
      if (typeof (req as { file?: string }).file === "string") {
        body.file = (req as { file?: string }).file;
      }

      const res = await fetch(`http://localhost:${apiServerPort}/update-diagnostics`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        return returnError(
          `Failed to trigger diagnostics update (status ${res.status}).`,
        );
      }

      const data = (await res.json()) as { ok?: boolean; error?: string };

      if (!data.ok) {
        return returnError(
          `Diagnostics update reported failure: ${data.error || "unknown error"}.`,
        );
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ ok: true }, null, 2),
          },
        ],
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return returnError(`Failed to call update_diagnostics: ${message}`);
    }
  },
);

// @ts-ignore - suppress unused warning
server.tool(
  "get_gams_execution_command",
  "Get the command line string required to execute a GAMS model, including all configured arguments and paths. Does not execute the command.",
  {
    file: z
      .string()
      .optional()
      .describe(
        "Optional path to a GAMS file. If omitted, uses gamsIde.mainGmsFile.",
      ),
    extraArgs: z
      .array(z.string())
      .optional()
      .describe(
        "Optional additional command line arguments to append to the GAMS command.",
      ),
  },
  async (req = {}) => {
    try {
      const payload: { file?: string; extraArgs?: string[] } = {};
      if (typeof (req as { file?: string }).file === "string") {
        payload.file = (req as { file?: string }).file;
      }
      if (Array.isArray((req as { extraArgs?: string[] }).extraArgs)) {
        payload.extraArgs = (req as { extraArgs?: string[] }).extraArgs;
      }

      const res = await fetch(
        `http://localhost:${apiServerPort}/gams-execution-command`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      if (!res.ok) {
        return returnError(
          `Failed to get GAMS execution command (status ${res.status}).`,
        );
      }

      const data = (await res.json()) as unknown;

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return returnError(`Failed to get GAMS execution command: ${message}`);
    }
  },
);

// @ts-ignore - suppress unused warning
server.tool(
  "get_gams_compile_command",
  "Get the command line string required to compile a GAMS model. Does not execute the command.",
  {
    file: z
      .string()
      .optional()
      .describe(
        "Optional path to a GAMS file. If omitted, uses gamsIde.mainGmsFile.",
      ),
    extraArgs: z
      .array(z.string())
      .optional()
      .describe(
        "Optional additional command line arguments to append to the GAMS command.",
      ),
  },
  async (req = {}) => {
    try {
      const payload: { file?: string; extraArgs?: string[] } = {};
      if (typeof (req as { file?: string }).file === "string") {
        payload.file = (req as { file?: string }).file;
      }
      if (Array.isArray((req as { extraArgs?: string[] }).extraArgs)) {
        payload.extraArgs = (req as { extraArgs?: string[] }).extraArgs;
      }

      const res = await fetch(
        `http://localhost:${apiServerPort}/gams-execution-command`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      if (!res.ok) {
        return returnError(
          `Failed to get GAMS compile command (status ${res.status}).`,
        );
      }

      const data = (await res.json()) as unknown;

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return returnError(`Failed to get GAMS compile command: ${message}`);
    }
  },
);

// @ts-ignore - suppress unused warning
server.tool(
  "read_listing_file_for_symbols",
  "Read and extract specific symbol information (values, equation listings) from a GAMS listing (.lst) file.",
  {
    lstFilePath: z
      .string()
      .describe("Absolute path to the .lst file to filter."),
    symbols: z
      .union([z.string(), z.array(z.string())])
      .describe(
        "A symbol name or list of symbol names to filter for.",
      ),
  },
  async (req) => {
    try {
      const lstFilePath = (req as { lstFilePath: string }).lstFilePath;
      const symbols = (req as { symbols: string | string[] }).symbols;

      const res = await fetch(
        `http://localhost:${apiServerPort}/filter-listing`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ lstFilePath, symbols }),
        },
      );

      if (!res.ok) {
        // try parsing error message from response
        try {
          const errorData = await res.json();
          if (errorData?.error) {
            return returnError(`Failed to filter listing file: ${errorData.error}`);
          }
        } catch {
          // ignore JSON parsing errors
        }
        return returnError(
          `Failed to filter listing file: (status ${res.status}).`,
        );
      }

      const data = (await res.json()) as { summaryContent?: string; error?: string };

      if (!data.summaryContent) {
        return returnError(
          `Filtering listing file did not return a summary: ${data.error || "unknown error"}.`,
        );
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ summaryContent: data.summaryContent }, null, 2),
          },
        ],
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return returnError(`Failed to call filter_listing_file: ${message}`);
    }
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("GAMS MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});