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
      find_symbol: {
        name: "find_symbol",
        title: "Find Symbol",
        description: "Find a symbol / list of symbols that best match a user query. E.g. 'What is the parameter that drives crop prices?' -> ['p_cropprice']",
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
      get_symbol_info: {
        name: "get_symbol_info",
        title: "Get Symbol Info",
        description: "Get detailed information about one or more GAMS symbols from the compiler's reference tree.",
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
      get_symbol_data: {
        name: "get_symbol_data",
        title: "Get Symbol Data",
        description:
          "Get the current data for one or more GAMS symbols from the data store.",
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
          "Get the reference tree for the current GAMS code as CSV rows.",
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
      update_diagnostics: {
        name: "update_diagnostics",
        title: "Update Diagnostics",
        description:
          "Trigger an update of diagnostics in the GAMS IDE extension, optionally for a specific file.",
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
      gams_execution_command: {
        name: "gams_execution_command",
        title: "GAMS Execution Command",
        description:
          "Returns the full GAMS execution command (executable and arguments) for a file or the configured main GMS file.",
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
      gams_compile_command: {
        name: "gams_compile_command",
        title: "GAMS Compile Command",
        description:
          "Returns the full GAMS compile command (executable and arguments) for a file or the configured main GMS file.",
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
      filter_listing_file: {
        name: "filter_listing_file",
        title: "Filter Listing File",
        description:
          "Extract specific information about a symbol or list of symbols from a GAMS listing file.",
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
  "find_symbol",
  'Find a symbol / list of symbols that best match a user query. E.g. "What is the parameter that drives crop prices?" -> ["p_cropprice"]',
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
  "get_symbol_info",
  "Get all information about one or more GAMS symbols from the compiler's reference tree.",
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
  "get_symbol_data",
  "Get the current data for one or more GAMS symbols from the data store.",
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
  "Get the reference tree for the current GAMS code as CSV rows.",
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
  "update_diagnostics",
  "Trigger an update of diagnostics in the GAMS IDE extension.",
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
  "gams_execution_command",
  "Returns the full GAMS execution command (executable and arguments) for a file or the configured main GMS file.",
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
  "gams_compile_command",
  "Returns the full GAMS compile command (executable and arguments) for a file or the configured main GMS file.",
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
  "filter_listing_file",
  "Extract specific information about a symbol or list of symbols from a GAMS listing file.",
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