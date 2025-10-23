import * as fs from "fs";
import * as path from "path";
import express from "express";
import { randomUUID } from "node:crypto";
import jwt, { JwtHeader, SigningKeyCallback } from "jsonwebtoken";
import jwksClient from "jwks-rsa";
import {
  mcpAuthMetadataRouter,
  getOAuthProtectedResourceMetadataUrl,
} from "@modelcontextprotocol/sdk/server/auth/router.js";
import { OAuthMetadata } from "@modelcontextprotocol/sdk/shared/auth.js";
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

// Always read the latest config from the file system
function getConfigData() {
    return JSON.parse(fs.readFileSync(configPath, "utf-8"));
}

const MCP_SERVER_BASE_URL = configData.MCP_SERVER_BASE_URL;
const AUTHZ_SERVER_BASE_URL = configData.AUTHZ_SERVER_BASE_URL;
export const BACKEND_API_BASE = configData.BACKEND_API_BASE;
export const BACKEND_AUTH_TOKEN = () => getConfigData().BACKEND_AUTH_TOKEN;
export const USER_AGENT = "OFBiz-MCP-server";

// Server configuration
const SERVER_PORT = configData.SERVER_PORT;
/*
const USE_HTTPS = configData.USE_HTTPS || false;
const SSL_KEY_PATH = configData.SSL_KEY_PATH;
const SSL_CERT_PATH = configData.SSL_CERT_PATH;
*/

// FIXME: Adjust based on your authorization server's metadata
//const jwksUri = `${AUTHZ_SERVER_BASE_URL}/.well-known/jwks.json`;
const jwksUri = `${AUTHZ_SERVER_BASE_URL}/protocol/openid-connect/certs`;

// Create a JWKS client to retrieve the public key
const client = jwksClient({
  jwksUri,
  cache: true,                 // enable local caching
  cacheMaxEntries: 5,          // maximum number of keys stored
  cacheMaxAge: 10 * 60 * 1000, // 10 minutes
});

// Function to get the public key from the JWT's kid
function getKey(header: JwtHeader, callback: SigningKeyCallback) {
  if (!header.kid) {
    return callback(new Error("Missing 'kid' in token header"));
  }
  client.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err, undefined);
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
}

function verifyToken(token: string): Promise<any> {
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      getKey,
      {
        algorithms: ["RS256"], // adjust based on token's algorithm
        //audience: "my-client-id",
        issuer: AUTHZ_SERVER_BASE_URL,
      },
      (err, decoded) => {
        if (err) return reject(err);
        resolve(decoded);
      }
    );
  });
}

const app = express();
app.use(express.json());

// MCP acting as an OAuth Resource Server

// Add Protected Resource Metadata endpoint (RFC9728)
function createOAuthUrls() {
  return {
    issuer: new URL(configData.AUTHZ_SERVER_BASE_URL).toString(),
    introspection_endpoint: "",
    authorization_endpoint: "",
    token_endpoint: "",
    registration_endpoint: ""
  };
}
const oauthUrls = createOAuthUrls();

const oauthMetadata: OAuthMetadata = {
  ...oauthUrls,
  response_types_supported: ["code"],
};
const mcpServerUrl = new URL(MCP_SERVER_BASE_URL);
app.use(
  mcpAuthMetadataRouter({
    oauthMetadata,
    resourceServerUrl: mcpServerUrl,
    scopesSupported: ["mcp:tools"],
    resourceName: "Apache OFBiz MCP Server",
  }),
);

// Middleware to check for valid access token
const authenticateRequest = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  const resourceMetadataUrl = getOAuthProtectedResourceMetadataUrl(mcpServerUrl);
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // Return 401 with WWW-Authenticate header pointing to metadata
    res.status(401)
      .set('WWW-Authenticate', `Bearer realm="mcp", as_uri="${resourceMetadataUrl}"`)
      .json({
        jsonrpc: '2.0',
        error: {
          code: -32001,
          message: 'Authorization required'
        },
        id: null
      });
    return;
  }
  
  const token = authHeader.substring(7);
  
  try {
    // Validate the access token
    const validationResult = await validateAccessToken(token);
    
    if (!validationResult.valid) {
      res.status(401)
        .set('WWW-Authenticate', `Bearer realm="mcp", error="invalid_token", as_uri="${resourceMetadataUrl}"`)
        .json({
          jsonrpc: '2.0',
          error: {
            code: -32001,
            message: 'Invalid or expired token'
          },
          id: null
        });
      return;
    }
    
    // Attach user/token info to request for use in handlers
    (req as any).auth = validationResult;
    next();
  } catch (error) {
    res.status(500).json({
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: 'Internal server error during authentication'
      },
      id: null
    });
  }
};

async function validateAccessToken(token: string): Promise<{
  valid: boolean;
  clientId?: string;
  scopes?: string[];
  userId?: string;
  audience?: string;
}> {
  try {
    // Using JWT tokens, validate locally
    const result = await verifyToken(token) as any;

    // Ensure the audience matches the MCP server's canonical URI
    if (result.aud !== MCP_SERVER_BASE_URL) {
      // FIXME
      //return { valid: false };
    }
    
    /*
    // Option 2: Call your authorization server's introspection endpoint
    const response = await fetch(`${AUTHZ_SERVER_BASE_URL}/oauth2/introspect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        token: token,
        token_type_hint: 'access_token'
      })
    });

    const result = await response.json();
    
    if (!result.active) {
      return { valid: false };
    }
    */
    
    return {
      valid: true,
      clientId: result.client_id,
      scopes: result.scope?.split(' '),
      userId: result.sub,
      audience: result.aud
    };
  } catch (error) {
    console.error('Token validation error:', error);
    return { valid: false };
  }
}


// Map to store transports by session ID
const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

// Handle POST requests for client-to-server communication
app.post('/mcp', authenticateRequest, async (req, res) => {
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
      name: "Apache OFBiz MCP Server (Streamable HTTP)",
      version: "0.1.0"
    });

    // Load and register tools from external files
    async function registerTools() {
        try {
            const tools = await loadTools();
            
            for (const tool of tools) {
                server.registerTool(
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
