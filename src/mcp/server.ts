import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

if (!process.env.API_SERVER_PORT) {
  console.error("Error: API_SERVER_PORT environment variable is not set.");
  process.exit(1);
}
const apiServerPort = parseInt(process.env.API_SERVER_PORT, 10);

/* tools:
find_symbol - Find a symbol / list of symbols that best match a user query. E.g. "What is the parameter that drives crop prices?" -> ["p_cropprice"]
get_symbol_info - Get all information about a GAMS symbol or list of symbols that the compiler has. This includes its type, domain, declaration, definition, reference and control locations as JSON.
get_symbol_data - Get the current data for a symbol (if available) from the GAMS listing file. This will be set elements, parameter values, column and row listings for variables and equations.
update_diagnostics - Update the diagnostics for the current GAMS code, including errors and warnings.
get_reference_tree - Get the reference tree for the current GAMS code, showing how symbols are related to each other.
execute_model - Execute the GAMS model with the current code and return the path to the listing file.
compile_model - Compile the GAMS model with the current code and return any compilation errors or warnings.
filter_listing_file - Extract specific information about a symbol or list of symbols from the GAMS listing file, such as set elements, parameter values, variable levels, etc.
*/
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
  "get_symbol_info", 
  "Get all information about a GAMS symbol or list of symbols that the compiler has. This includes its type, domain, declaration, definition, reference and control locations.",
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
        body: JSON.stringify(req)
      }).then(res => res.json());

      if (response) {
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
    } catch (error) {
      return returnError(`Failed to fetch symbol info: ${error.message}`);
    }
  }
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