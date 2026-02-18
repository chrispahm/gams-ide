# Using the MCP Server

GAMS-IDE includes a **Model Context Protocol (MCP)** server. This allows AI assistants (like Claude Desktop or other MCP clients) to interact with your GAMS model.

## Capabilities

The MCP server exposes tools that allow an AI agent to:
*   **Search Symbols**: Find Sets, Parameters, Variables by name or description.
*   **Inspect Structure**: View the include tree of the model.
*   **Read Data**: Retrieve actual values of parameters or variable levels after a run.
*   **Check Status**: Read the solve status from the listing file.

## Configuration

The MCP server runs on a local port (default: `3001`).

To configure the port:
1.  Open Settings.
2.  Search for `gamsIde.mcpServerPort`.

![MCP Server Port Setting](/screenshots/usage-mcp-settings.png)

## Starting the Server

The server starts automatically with the extension. You can verify its status in the "GAMS MCP Server" output channel.
