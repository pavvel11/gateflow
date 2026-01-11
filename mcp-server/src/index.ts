#!/usr/bin/env node
/**
 * GateFlow MCP Server - Entry Point
 *
 * Starts the MCP server with stdio transport for Claude Desktop integration.
 *
 * Environment variables:
 *   GATEFLOW_API_KEY - Required: API key for GateFlow v1 API (gf_live_xxx or gf_test_xxx)
 *   GATEFLOW_API_URL - Required: Base URL for GateFlow API (e.g., https://app.gateflow.io)
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server.js';

async function main() {
  const apiKey = process.env.GATEFLOW_API_KEY;
  const apiUrl = process.env.GATEFLOW_API_URL;

  if (!apiKey) {
    console.error('Error: GATEFLOW_API_KEY environment variable is required');
    console.error('Create an API key in your GateFlow admin panel with appropriate scopes');
    process.exit(1);
  }

  if (!apiUrl) {
    console.error('Error: GATEFLOW_API_URL environment variable is required');
    console.error('Example: https://app.gateflow.io');
    process.exit(1);
  }

  // Create the MCP server
  const server = createServer({
    apiKey,
    apiUrl,
  });

  // Create stdio transport for Claude Desktop
  const transport = new StdioServerTransport();

  // Connect and start
  await server.connect(transport);

  // Log to stderr (stdout is used for MCP protocol)
  console.error('GateFlow MCP Server started');
  console.error(`Connected to: ${apiUrl}`);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
