# mcp-prototypes
Various prototypes for MCP server implementations.

*mcp_sdk_stdio*
An MCP server that communicates via stdio to the MCP client and connects as an HTTP client to a remote Backend server (e.g. Apache OFBiz, Moqui). Implemented in Typescript with the MCP SDK.

Prerequisites:
Node.js, npm

Steps to build:

1) npm install
2) npm run build
3) vi ~/Library/Application\ Support/Claude/claude_desktop_config.json
{
  "mcpServers": {
    "Apache OFBiz": {
      "command": "node",
      "args": ["/Users/jacopoc/projects/ofbiz/mcp-prototypes/mcp_sdk_stdio/build/server.js"]
    }
  }
}
