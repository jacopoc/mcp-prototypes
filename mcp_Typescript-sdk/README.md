# MCP Servers Implemented Using the Anthropic SDK for TypeScript

This project provides prototype implementations of MCP servers that:  

- expose specific tools,  
- receive requests from an MCP client (usually hosted in a generative AI application such as Claude Desktop),  
- forward those requests to a remote backend via RESTful API endpoints.  

With this approach, the servers enable generative AI applications to interact with remote systems such as **Apache OFBiz** and **Moqui**.  

The project is implemented in **TypeScript**, uses the **Anthropic TypeScript SDK**, and requires:  

- Node.js  
- npm

---

## 📑 Table of Contents
1. [Features](#-features)  
2. [Configuration](#-configuration)  
3. [Project Structure](#-project-structure)  
4. [Build the Project](#-build-the-project)  
5. [Test the Local MCP Server](#-test-the-local-mcp-server)  
6. [Test the Remote MCP Server](#-test-the-remote-mcp-server)  

---

## 🚀 Features

The project includes two alternative MCP servers:  

- **Local MCP server** (`src/server.ts`) — communicates with the MCP client via stdio transport.  
- **Remote MCP server** (`src/server-remote.ts`) — communicates with the MCP client via MCP Streamable HTTP transport.  

The servers are modular and dynamically discover MCP tools contained in the `tools` directory.  

Each tool is defined and implemented in its own file. For example, the sample tool `tools/findProductById.ts` invokes an endpoint in Apache OFBiz to retrieve product information for a given ID. This works with an out-of-the-box (OOTB) OFBiz instance with the `rest-api` plugin installed.  

---

## ⚙️ Configuration

Server configuration is managed via `config/config.json`, which defines:  

- **`BACKEND_API_BASE`** — the base URL for backend REST API calls  
- **`BACKEND_AUTH_TOKEN`** — the token used to authorize backend API calls  
- **`SERVER_PORT`** — the port on which the MCP server listens for client connections (required only for the remote server)  

The authorization token for the OFBiz API can be easily generated and set up by running the script `update_token.sh`. This script retrieves a JWT for an OOTB OFBiz demo instance (using `https://demo-stable.ofbiz.apache.org/rest/auth/token`).  

---

## 📂 Project Structure

```text
mcp_Typescript-sdk/
├── config/
│   └── config.json               # Server configuration (backend API base, auth token, etc.)
├── src/
│   ├── server.ts                 # Local MCP server (stdio transport)
│   ├── server-remote.ts          # Remote MCP server (Streamable HTTP transport)
│   ├── toolLoader.ts             # Loader of tool definitions from "tools/"
│   └── tools/               
│       └── findProductById.ts    # Example tool calling an Apache OFBiz REST endpoint
├── update_token.sh               # Script to refresh backend auth token
├── package.json
├── tsconfig.json
└── README.md
```

## 🔨 Build the Project

```sh
npm install
npm run build
```

## 🖥️ Test the Local MCP Server

You can test the local MCP server with **Claude Desktop**.  

Edit or create the Claude Desktop configuration file:

```sh
~/Library/Application\ Support/Claude/claude_desktop_config.json
```
Add your local MCP server configuration:
```json
{
  "mcpServers": {
    "Apache OFBiz": {
      "command": "node",
      "args": ["PATH_TO/mcp_Typescript-sdk/build/server.js"]
    }
  }
}
```
After updating the configuration file, launch Claude Desktop and try the following sample prompts:
* *"Can you provide some information about the product WG-1111?"*
* *"Can you provide some information about a product?"*  
(Claude will ask for a product ID before invoking the tool.)
* *"Can you compare two products?"*  
(Claude will ask for two product IDs, invoke the tool twice, and then compare the results.)

## 🌐 Test the Remote MCP Server

Start the server:
```sh
node build/server-remote.js
```
You can use Anthropic’s **Inspector** to easily test interactions with the remote MCP server, without requiring valid certificates or deploying the server on a publicly accessible host.

Run (and install) the Inspector with:
```sh
npx @modelcontextprotocol/inspector
```
This will open a browser window ready to test your MCP server.
