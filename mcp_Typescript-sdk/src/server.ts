import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as fs from "fs";
import * as path from "path";
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

// Create server instance
const server = new McpServer({
    name: "Apache OFBiz",
    version: "0.1.0",
});

// Load and register tools from external files
async function registerTools() {
    try {
        const tools = await loadTools();
        
        for (const tool of tools) {
            server.tool(
                tool.name,
                tool.description,
                tool.inputSchema,
                tool.handler
            );
            console.error(`Registered tool: ${tool.name}`);
        }
    } catch (error) {
        console.error("Error loading tools:", error);
        throw error;
    }
}

// Start the server
async function main() {
    await registerTools();
    
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Apache OFBiz MCP Server running on stdio");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});