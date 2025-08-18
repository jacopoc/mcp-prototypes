# mcp-prototypes
Various prototypes for MCP server implementations.

## mcp_Typescript-sdk

Contains MCP servers built using the Anthropic's Typescript SDK. These servers act as protocol bridges, acting as an MCP server to communicate via MCP with clients hosted in AI powered applications and as an HTTP client to communicate with a remote backend RESTful APIs (e.g. Apache OFBiz, Moqui).

Prerequisites:
* Node.js
* npm

Steps to build:
```sh
npm install
npm run build
```

### local MCP server (STDIO)
An MCP server that communicates with the MCP client via stdio and connects as an HTTP client to a remote backend server.


Edit or create the Claude Desktop configuration file:

```sh
vi ~/Library/Application\ Support/Claude/claude_desktop_config.json
```
and add to it the definition of the MCP local server (e.g. "Apache OFBiz")
```json
{
  "mcpServers": {
    "Apache OFBiz": {
      "command": "node",
      "args": ["PATH_TO/mcp-prototypes/mcp_sdk_stdio/build/server.js"]
    }
  }
}
```

### remote MCP server (Streamable HTTP)

This server uses the Streamable HTTP transport.

Run the server:
```sh
node build/server-remote.js
```


# Tool to test
You can use Anthropic's Inspector to test the interaction with the MCP servers.
This tool is especially useful to test the remote server from a browser without an AI client.

You can run (and install) the Inspector with the following command:
```sh
npx @modelcontextprotocol/inspector
```
This command will open up a browser window ready to work with the Inspector.