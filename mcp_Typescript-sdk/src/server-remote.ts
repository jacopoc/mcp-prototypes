import * as fs from "fs";
import * as path from "path";
import express from "express";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js"
import { loadTools } from "./toolLoader.js";

// Load configuration
const configPath = path.resolve(
    path.dirname(new URL(import.meta.url).pathname),
    "../config/config.json"
);
const configData = JSON.parse(fs.readFileSync(configPath, "utf-8"));

export const BACKEND_API_BASE = configData.BACKEND_API_BASE;
export const BACKEND_AUTH_TOKEN = configData.BACKEND_AUTH_TOKEN;
export const USER_AGENT = "OFBiz-MCP-server";

// Server configuration
const SERVER_PORT = configData.SERVER_PORT || 3000;
/*
const USE_HTTPS = configData.USE_HTTPS || false;
const SSL_KEY_PATH = configData.SSL_KEY_PATH;
const SSL_CERT_PATH = configData.SSL_CERT_PATH;
*/


const app = express();
app.use(express.json());

// Map to store transports by session ID
const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

// Handle POST requests for client-to-server communication
app.post('/mcp', async (req, res) => {
  // Check for existing session ID
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  let transport: StreamableHTTPServerTransport;

  if (sessionId && transports[sessionId]) {
    // Reuse existing transport
    transport = transports[sessionId];
  } else if (!sessionId && isInitializeRequest(req.body)) {
    // New initialization request
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sessionId) => {
        // Store the transport by session ID
        transports[sessionId] = transport;
      },
      // DNS rebinding protection is disabled by default for backwards compatibility. If you are running this server
      // locally, make sure to set:
      // enableDnsRebindingProtection: true,
      // allowedHosts: ['127.0.0.1'],
    });

    // Clean up transport when closed
    transport.onclose = () => {
      if (transport.sessionId) {
        delete transports[transport.sessionId];
      }
    };
    const server = new McpServer({
      name: "Apache OFBiz",
      version: "0.1.0"
    });

    // Load and register tools from external files
    async function registerTools() {
        try {
            const tools = await loadTools();
            
            for (const tool of tools) {
                server.tool(
                    tool.name,
                    tool.metadata,
                    tool.handler
                );
                console.error(`Registered tool: ${tool.name}`);
            }
        } catch (error) {
            console.error("Error loading tools:", error);
            throw error;
        }
    }

    // Set up server resources, tools, and prompts
    await registerTools();
    
    // Connect to the MCP server
    await server.connect(transport);
  } else {
    // Invalid request
    res.status(400).json({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Bad Request: No valid session ID provided',
      },
      id: null,
    });
    return;
  }

  // Handle the request
  console.log(`Processing request for session ${sessionId}`);
  await transport.handleRequest(req, res, req.body);
  console.log(`Completed request for session ${sessionId}`);
});

// Reusable handler for GET and DELETE requests
const handleSessionRequest = async (req: express.Request, res: express.Response) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send('Invalid or missing session ID');
    return;
  }
  
  const transport = transports[sessionId];
  await transport.handleRequest(req, res);
};

// Handle GET requests for server-to-client notifications via SSE
app.get('/mcp', handleSessionRequest);

// Handle DELETE requests for session termination
app.delete('/mcp', handleSessionRequest);

app.listen(SERVER_PORT, () => {
    console.log(`MCP stateful Streamable HTTP Server listening on port ${SERVER_PORT}`);
});
