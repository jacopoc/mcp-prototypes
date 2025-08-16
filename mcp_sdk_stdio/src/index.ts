import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";

const configPath = path.resolve(
    path.dirname(new URL(import.meta.url).pathname),
    "../config/config.json"
);
const configData = JSON.parse(fs.readFileSync(configPath, "utf-8"));

const BACKEND_API_BASE = configData.BACKEND_API_BASE;
const BACKEND_AUTH_TOKEN = configData.BACKEND_AUTH_TOKEN;

const USER_AGENT = "OFBiz-MCP-server";

// Create server instance
const server = new McpServer({
    name: "Apache OFBiz",
    version: "0.1.0",
});

// Register test tools
server.tool(
    "findProductById",
    "Find a product by using its ID. If the ID is not provided, ask for it.",
    {
        id: z.string().min(2).max(20).describe("ID of the product to find; must be between 2 and 20 characters long."),
    },
    async ({ id }) => {
        const idParam = { idToFind: id };
        const inParams = encodeURIComponent(JSON.stringify(idParam));
        const backendUrl = `${BACKEND_API_BASE}/findProductById?inParams=${inParams}`;

        const requestOptions = {
            method: "GET",
            headers: {
                "User-Agent": USER_AGENT,
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Bearer ${BACKEND_AUTH_TOKEN}`,
            },
        };

        try {
            const response = await fetch(backendUrl, requestOptions);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const responseData = await response.json();
            const resultString = [
                `Product ID: ${responseData.data.product.productId || ""}`,
                `Name: ${responseData.data.product.productName || ""}`,
                `Internal Name: ${responseData.data.product.productName || ""}`,
                `Description: ${responseData.data.product.description || ""}`,
                `Product Type ID: ${responseData.data.product.productTypeId || ""}`,
                "---",
            ].join("\n");

            return {
                content: [
                    {
                        type: "text",
                        text: resultString,
                    },
                ],
            };

            return await response.json(); // ???????
        } catch (error) {
            console.error("Error making NWS request:", error);
            return null;
        }
    },
);

// Start the server
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Apache OFBiz MCP Server running on stdio");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});