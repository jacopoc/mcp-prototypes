import { z } from "zod";
import { BACKEND_API_BASE, BACKEND_AUTH_TOKEN, USER_AGENT } from "../server.js";
import type { ToolDefinition } from "../toolLoader.js";

export default function(): ToolDefinition {
    return {
        name: "findProductById",
        metadata: {
            title: "Find a product by ID",
            description: "Find a product by using its ID. If the ID is not provided, ask for it.",
            inputSchema: {
                id: z.string().min(2).max(20).describe("ID of the product to find; must be between 2 and 20 characters long."),
            }
        },
        handler: async ({ id }: { id: string }) => {
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
            } catch (error) {
                console.error("Error making backend request:", error);
                return {
                    content: [
                        {
                            type: "text",
                            text: `Error finding product: ${error instanceof Error ? error.message : 'Unknown error'}`,
                        },
                    ],
                };
            }
        }
    };
}