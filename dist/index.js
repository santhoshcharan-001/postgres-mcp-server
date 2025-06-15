#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, } from '@modelcontextprotocol/sdk/types.js';
import { Pool } from 'pg';
const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_X2Zh5DnQHMVi@ep-wispy-block-a7x9cc24-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require'
});
// Test database connection
pool.on('connect', () => {
    console.error('Connected to PostgreSQL database');
});
pool.on('error', (err) => {
    console.error('Database connection error:', err);
});
const server = new Server({
    name: 'postgres-mcp-server',
    version: '1.0.0',
}, {
    capabilities: {
        tools: {},
    },
});
// Define available tools
const tools = [
    {
        name: 'get_users_info',
        description: 'Execute a PostgreSQL query and return results',
        inputSchema: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'The SQL query to execute',
                },
                params: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Optional parameters for parameterized queries',
                    default: [],
                },
            },
            required: ['query'],
        },
    },
];
// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools };
});
// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
        switch (name) {
            case 'get_users_info': {
                const query = "SELECT * FROM santhosh_users LIMIT 5";
                const result = await pool.query(query);
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({
                                rows: result.rows,
                                rowCount: result.rowCount,
                                fields: result.fields?.map(f => ({ name: f.name, type: f.dataTypeID })),
                            }, null, 2),
                        },
                    ],
                };
            }
            default:
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Unknown tool: ${name}`,
                        },
                    ],
                    isError: true,
                };
        }
    }
    catch (error) {
        return {
            content: [
                {
                    type: 'text',
                    text: `Database error: ${error instanceof Error ? error.message : String(error)}`,
                },
            ],
            isError: true,
        };
    }
});
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}
main().catch((error) => {
    console.error('Server error:', error);
    process.exit(1);
});
