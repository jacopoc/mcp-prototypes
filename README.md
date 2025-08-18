# mcp-prototypes
Various prototypes for MCP server implementations.

## mcp_Typescript-sdk

Contains MCP servers built using the Anthropic's Typescript SDK. These servers act as protocol bridges, acting as an MCP server to communicate via MCP with clients hosted in AI powered applications and as an HTTP client to communicate with a remote backend RESTful APIs (e.g. Apache OFBiz, Moqui).

### local MCP server (STDIO)
An MCP server that communicates with the MCP client via stdio and connects as an HTTP client to a remote backend server.

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

### remote MCP server (Streamable HTTP)
This server uses the Streamable HTTP transport.
1) npm install
2) npm run build
3) node build/server-remote.js

# how to test
npx @modelcontextprotocol/inspector
