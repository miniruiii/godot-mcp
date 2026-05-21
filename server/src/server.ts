#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { loadConfig } from './config.js';
import { parseArgs, printHelp } from './cli.js';
import { GodotBridge } from './godot-bridge.js';
import { buildToolRegistry } from './tools/index.js';

export async function main(): Promise<void> {
  const cliArgs = parseArgs(process.argv.slice(2));

  if (cliArgs.help) {
    printHelp();
    process.exit(0);
  }

  const config = loadConfig('./settings.json');
  if (cliArgs.mode) config.mode = cliArgs.mode;
  if (cliArgs.port) config.port = cliArgs.port;
  if (cliArgs.logLevel) config.log_level = cliArgs.logLevel;

  const bridge = new GodotBridge(config.port);
  bridge.connect().catch(() => {
    // Godot not running — tools will operate in offline mode
  });

  const tools = buildToolRegistry(config, bridge);

  const server = new Server(
    { name: 'godot-mcp', version: '1.0.0' },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: tools.map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
      })),
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const tool = tools.find((t) => t.name === request.params.name);
    if (!tool) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: `Unknown tool: ${request.params.name}` }) }],
        isError: true,
      };
    }

    try {
      const result = await tool.handler(request.params.arguments || {});
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: message }) }],
        isError: true,
      };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  await new Promise(() => {});
}

main().catch((err) => {
  console.error('Server error:', err);
  process.exit(1);
});