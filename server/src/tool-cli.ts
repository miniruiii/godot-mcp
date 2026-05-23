#!/usr/bin/env node
import { loadConfig } from './config.js';
import { GodotBridge } from './godot-bridge.js';
import { buildToolRegistry, getToolGroups, type ToolDefinition } from './tools/index.js';

export const COMMAND_MAP: Record<string, string> = {
  'project list-files': 'list_project_files',
  'project settings': 'read_project_settings',
  'project info': 'get_project_info',
  'scene read': 'read_scene',
  'scene create': 'create_scene',
  'scene save': 'save_scene',
  'scene open': 'open_scene',
  'node tree': 'get_scene_tree',
  'node get': 'get_node',
  'node add': 'add_node',
  'node remove': 'remove_node',
  'node update': 'update_property',
  'node duplicate': 'duplicate_node',
  'node move': 'move_node',
  'node connect': 'connect_signal',
  'node disconnect': 'disconnect_signal',
  'node groups': 'get_node_groups',
  'node set-groups': 'set_node_groups',
  'node find-in-group': 'find_nodes_in_group',
  'node rename': 'rename_node',
  'script create': 'create_script',
  'script read': 'read_script',
  'script edit': 'edit_script',
  'editor run': 'run_project',
  'editor logs': 'get_output_log',
  'file read': 'read_file',
  'file write': 'write_file',
  'game tree': 'get_game_scene_tree',
  'game properties': 'get_game_node_properties',
  'game set-property': 'set_game_node_property',
  'game execute': 'execute_game_script',
  'game find-by-script': 'find_nodes_by_script',
  'game autoload': 'get_autoload',
  'game batch-properties': 'batch_get_properties',
  'game ui-elements': 'find_ui_elements',
  'game click-button': 'click_button_by_text',
  'game wait-for-node': 'wait_for_node',
  'game nearby-nodes': 'find_nearby_nodes',
  'game navigate': 'navigate_to',
  'game property': 'get_game_node_property',
  'game capture': 'capture_frames',
  'game monitor': 'monitor_properties',
  'game start-recording': 'start_recording',
  'game stop-recording': 'stop_recording',
  'game replay-recording': 'replay_recording',
  'input key': 'simulate_key',
  'input mouse-click': 'simulate_mouse_click',
  'input mouse-move': 'simulate_mouse_move',
  'input action': 'simulate_action',
  'input sequence': 'simulate_sequence',
  'input actions': 'get_input_actions',
  'input set-action': 'set_input_action',
};

export function kebabToCamel(s: string): string {
  return s.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

export function parseCliFlags(args: string[]): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg.startsWith('--')) continue;
    const key = kebabToCamel(arg.slice(2));
    const next = args[i + 1];
    if (next && !next.startsWith('--')) {
      try {
        params[key] = JSON.parse(next);
      } catch {
        params[key] = next;
      }
      i++;
    } else {
      params[key] = true;
    }
  }
  return params;
}

function printGeneralHelp(tools: ToolDefinition[]): void {
  const groups = getToolGroups(tools);
  console.log('godot-mcp <group> <command> [options]');
  console.log('');
  console.log('Groups:');
  for (const group of Object.keys(groups).sort()) {
    console.log(`  ${group} (${groups[group].length} commands)`);
  }
  console.log('');
  console.log('Use: godot-mcp <group> --help    for group commands');
  console.log('Use: godot-mcp <group> <cmd> --help for command options');
}

function printGroupHelp(group: string, tools: ToolDefinition[]): void {
  const groups = getToolGroups(tools);
  const groupTools = groups[group];
  if (!groupTools) {
    console.error(`Unknown group: ${group}`);
    process.exit(1);
  }
  console.log(`godot-mcp ${group} <command> [options]`);
  console.log('');
  console.log('Commands:');
  for (const tool of groupTools) {
    const cliCmd = Object.entries(COMMAND_MAP).find(([, v]) => v === tool.name)?.[0] ?? tool.name;
    const [, cmd] = cliCmd.split(' ');
    console.log(`  ${cmd.padEnd(20)} ${tool.description}`);
  }
}

function printCommandHelp(tool: ToolDefinition): void {
  const cliCmd = Object.entries(COMMAND_MAP).find(([, v]) => v === tool.name)?.[0] ?? `${tool.group} ${tool.name}`;
  console.log(`godot-mcp ${cliCmd} [options]`);
  console.log('');
  console.log(tool.description);
  console.log('');
  const schema = tool.inputSchema as { properties?: Record<string, { type?: string; description?: string }>; required?: string[] };
  if (schema.properties && Object.keys(schema.properties).length > 0) {
    console.log('Options:');
    for (const [key, val] of Object.entries(schema.properties)) {
      const required = schema.required?.includes(key) ? ' (required)' : '';
      const flag = key.replace(/[A-Z]/g, c => '-' + c.toLowerCase());
      console.log(`  --${flag.padEnd(20)} <${val.type || 'string'}>${required}  ${val.description || ''}`);
    }
  } else {
    console.log('No options.');
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const config = loadConfig('./settings.json');
  const bridge = new GodotBridge(config.port);

  bridge.connect().catch(() => {
    // Godot not running — offline tools still work
  });

  const tools = buildToolRegistry(config, bridge);

  if (args.length === 0) {
    printGeneralHelp(tools);
    process.exit(0);
  }

  const group = args[0];

  if (group === '--help' || group === '-h') {
    printGeneralHelp(tools);
    process.exit(0);
  }

  if (args.length === 2 && (args[1] === '--help' || args[1] === '-h')) {
    printGroupHelp(group, tools);
    process.exit(0);
  }

  const command = args[1];

  if (args.length >= 2 && args.slice(2).some(a => a === '--help' || a === '-h')) {
    const fullCommand = `${group} ${command}`;
    const toolName = COMMAND_MAP[fullCommand];
    const tool = tools.find(t => t.name === toolName);
    if (tool) {
      printCommandHelp(tool);
    } else {
      console.error(`Unknown command: ${fullCommand}`);
      console.error('Run: godot-mcp --help for available commands');
    }
    process.exit(1);
  }

  const fullCommand = `${group} ${command}`;
  const toolName = COMMAND_MAP[fullCommand];

  if (!toolName) {
    console.error(`Unknown command: ${fullCommand}`);
    console.error('Run: godot-mcp --help for available commands');
    process.exit(1);
  }

  const tool = tools.find(t => t.name === toolName);
  if (!tool) {
    console.error(`Tool not found: ${toolName}`);
    process.exit(1);
  }

  const params = parseCliFlags(args.slice(2));

  try {
    const result = await tool.handler(params);
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(JSON.stringify({ error: message }));
    process.exit(1);
  }
}

import { fileURLToPath } from 'url';

if (import.meta.url.startsWith('file:') && process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(JSON.stringify({ error: String(err) }));
    process.exit(1);
  });
}
