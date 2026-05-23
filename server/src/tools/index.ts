import type { GodotBridge } from '../godot-bridge.js';
import type { Config } from '../config.js';
import { mcpLog, formatArgs } from './log.js';
import { readFileTool, writeFileTool } from './file.js';
import { listProjectFiles, readProjectSettings, getProjectInfo } from './project.js';
import { readScene, createScene, saveScene, openScene } from './scene.js';
import {
  getSceneTree, getNode, addNode, removeNode, updateProperty,
  duplicateNode, moveNode, connectSignal, disconnectSignal,
  getNodeGroups, setNodeGroups, findNodesInGroup, renameNode
} from './node.js';
import { createScript, readScript, editScript } from './script.js';
import { runProject, getOutputLog } from './editor.js';
import {
  getGameSceneTree, getGameNodeProperties, setGameNodeProperty, executeGameScript,
  findNodesByScript, getAutoload, batchGetProperties, findUiElements, clickButtonByText,
  waitForNode, findNearbyNodes, navigateTo, getGameNodeProperty, captureFrames,
  monitorProperties, startRecording, stopRecording, replayRecording
} from './runtime.js';
import {
  simulateKey, simulateMouseClick, simulateMouseMove, simulateAction,
  simulateSequence, getInputActions, setInputAction
} from './input.js';

export interface ToolDefinition {
  name: string;
  group: string;
  description: string;
  inputSchema: object;
  handler: (args: Record<string, unknown>) => Promise<unknown> | unknown;
}

export function buildToolRegistry(config: Config, bridge: GodotBridge): ToolDefinition[] {
  const projectRoot = config.project_path;

  const tools: ToolDefinition[] = [
    {
      name: 'list_project_files',
      group: 'project',
      description: 'List all files in the Godot project. Optional filter by extension.',
      inputSchema: {
        type: 'object',
        properties: { extension: { type: 'string' } },
      },
      handler: (args: Record<string, unknown>) => listProjectFiles(args, projectRoot),
    },
    {
      name: 'read_project_settings',
      group: 'project',
      description: 'Read key settings from project.godot',
      inputSchema: { type: 'object', properties: {} },
      handler: () => readProjectSettings({}, projectRoot),
    },
    {
      name: 'get_project_info',
      group: 'project',
      description: 'Get project metadata: engine version, rendering backend',
      inputSchema: { type: 'object', properties: {} },
      handler: () => getProjectInfo({}, projectRoot),
    },
    {
      name: 'read_scene',
      group: 'scene',
      description: 'Read a .tscn file and return its node tree structure',
      inputSchema: {
        type: 'object',
        properties: { scene_path: { type: 'string' } },
        required: ['scene_path'],
      },
      handler: (args: Record<string, unknown>) => readScene(args as { scene_path: string }, projectRoot),
    },
    {
      name: 'create_scene',
      group: 'scene',
      description: 'Create a new .tscn file with a root node',
      inputSchema: {
        type: 'object',
        properties: { scene_path: { type: 'string' }, root_type: { type: 'string' }, root_name: { type: 'string' } },
        required: ['scene_path', 'root_type', 'root_name'],
      },
      handler: (args: Record<string, unknown>) => createScene(args as { scene_path: string; root_type: string; root_name: string }, projectRoot),
    },
    {
      name: 'save_scene',
      group: 'scene',
      description: 'Save the current scene in Godot editor',
      inputSchema: {
        type: 'object',
        properties: { scene_path: { type: 'string' } },
        required: ['scene_path'],
      },
      handler: (args: Record<string, unknown>) => saveScene(args as { scene_path: string }, projectRoot, bridge),
    },
    {
      name: 'open_scene',
      group: 'scene',
      description: 'Open a scene in Godot editor',
      inputSchema: {
        type: 'object',
        properties: { scene_path: { type: 'string' } },
        required: ['scene_path'],
      },
      handler: (args: Record<string, unknown>) => openScene(args as { scene_path: string }, projectRoot, bridge),
    },
    {
      name: 'get_scene_tree',
      group: 'node',
      description: 'Get the full node tree of a scene',
      inputSchema: {
        type: 'object',
        properties: { scene_path: { type: 'string' } },
        required: ['scene_path'],
      },
      handler: (args: Record<string, unknown>) => getSceneTree(args as { scene_path: string }, projectRoot, bridge.isConnected),
    },
    {
      name: 'get_node',
      group: 'node',
      description: 'Get details of a single node by path',
      inputSchema: {
        type: 'object',
        properties: { scene_path: { type: 'string' }, node_path: { type: 'string' } },
        required: ['scene_path', 'node_path'],
      },
      handler: (args: Record<string, unknown>) => getNode(args as { scene_path: string; node_path: string }, projectRoot, bridge.isConnected),
    },
    {
      name: 'add_node',
      group: 'node',
      description: 'Add a node to a scene in Godot editor',
      inputSchema: {
        type: 'object',
        properties: { scene_path: { type: 'string' }, parent_path: { type: 'string' }, node_type: { type: 'string' }, node_name: { type: 'string' } },
        required: ['scene_path', 'parent_path', 'node_type', 'node_name'],
      },
      handler: (args: Record<string, unknown>) => addNode(args as any, projectRoot, bridge),
    },
    {
      name: 'remove_node',
      group: 'node',
      description: 'Remove a node from a scene in Godot editor',
      inputSchema: {
        type: 'object',
        properties: { scene_path: { type: 'string' }, node_path: { type: 'string' } },
        required: ['scene_path', 'node_path'],
      },
      handler: (args: Record<string, unknown>) => removeNode(args as any, projectRoot, bridge),
    },
    {
      name: 'update_property',
      group: 'node',
      description: 'Update a property of a node in Godot editor',
      inputSchema: {
        type: 'object',
        properties: { scene_path: { type: 'string' }, node_path: { type: 'string' }, property: { type: 'string' }, value: { type: 'string' } },
        required: ['scene_path', 'node_path', 'property', 'value'],
      },
      handler: (args: Record<string, unknown>) => updateProperty(args as any, projectRoot, bridge),
    },
    {
      name: 'duplicate_node',
      group: 'node',
      description: 'Duplicate a node in a scene with a new name',
      inputSchema: {
        type: 'object',
        properties: { scene_path: { type: 'string' }, node_path: { type: 'string' }, new_name: { type: 'string' } },
        required: ['scene_path', 'node_path', 'new_name'],
      },
      handler: (args: Record<string, unknown>) => duplicateNode(args as any, projectRoot, bridge),
    },
    {
      name: 'move_node',
      group: 'node',
      description: 'Move a node to a new parent in the scene tree',
      inputSchema: {
        type: 'object',
        properties: { scene_path: { type: 'string' }, node_path: { type: 'string' }, new_parent_path: { type: 'string' } },
        required: ['scene_path', 'node_path', 'new_parent_path'],
      },
      handler: (args: Record<string, unknown>) => moveNode(args as any, projectRoot, bridge),
    },
    {
      name: 'connect_signal',
      group: 'node',
      description: 'Connect a signal from one node to a method on another',
      inputSchema: {
        type: 'object',
        properties: { scene_path: { type: 'string' }, node_path: { type: 'string' }, signal: { type: 'string' }, target_path: { type: 'string' }, method: { type: 'string' } },
        required: ['scene_path', 'node_path', 'signal', 'target_path', 'method'],
      },
      handler: (args: Record<string, unknown>) => connectSignal(args as any, projectRoot, bridge),
    },
    {
      name: 'disconnect_signal',
      group: 'node',
      description: 'Disconnect a signal connection between nodes',
      inputSchema: {
        type: 'object',
        properties: { scene_path: { type: 'string' }, node_path: { type: 'string' }, signal: { type: 'string' }, target_path: { type: 'string' }, method: { type: 'string' } },
        required: ['scene_path', 'node_path', 'signal', 'target_path', 'method'],
      },
      handler: (args: Record<string, unknown>) => disconnectSignal(args as any, projectRoot, bridge),
    },
    {
      name: 'get_node_groups',
      group: 'node',
      description: 'Get all groups that a node belongs to',
      inputSchema: {
        type: 'object',
        properties: { scene_path: { type: 'string' }, node_path: { type: 'string' } },
        required: ['scene_path', 'node_path'],
      },
      handler: (args: Record<string, unknown>) => getNodeGroups(args as any, projectRoot, bridge),
    },
    {
      name: 'set_node_groups',
      group: 'node',
      description: 'Add or remove a node from groups',
      inputSchema: {
        type: 'object',
        properties: { scene_path: { type: 'string' }, node_path: { type: 'string' }, add_to_groups: { type: 'array', items: { type: 'string' } }, remove_from_groups: { type: 'array', items: { type: 'string' } } },
        required: ['scene_path', 'node_path'],
      },
      handler: (args: Record<string, unknown>) => setNodeGroups(args as any, projectRoot, bridge),
    },
    {
      name: 'find_nodes_in_group',
      group: 'node',
      description: 'Find all nodes that belong to a specific group',
      inputSchema: {
        type: 'object',
        properties: { group: { type: 'string' } },
        required: ['group'],
      },
      handler: (args: Record<string, unknown>) => findNodesInGroup(args as any, projectRoot, bridge),
    },
    {
      name: 'rename_node',
      group: 'node',
      description: 'Rename a node in a scene',
      inputSchema: {
        type: 'object',
        properties: { scene_path: { type: 'string' }, node_path: { type: 'string' }, new_name: { type: 'string' } },
        required: ['scene_path', 'node_path', 'new_name'],
      },
      handler: (args: Record<string, unknown>) => renameNode(args as any, projectRoot, bridge),
    },
    {
      name: 'create_script',
      group: 'script',
      description: 'Create a new GDScript or C# file',
      inputSchema: {
        type: 'object',
        properties: { script_path: { type: 'string' }, extends_type: { type: 'string' }, template: { type: 'string' } },
        required: ['script_path'],
      },
      handler: (args: Record<string, unknown>) => createScript(args as any, projectRoot),
    },
    {
      name: 'read_script',
      group: 'script',
      description: 'Read the content of a script file',
      inputSchema: {
        type: 'object',
        properties: { script_path: { type: 'string' } },
        required: ['script_path'],
      },
      handler: (args: Record<string, unknown>) => readScript(args as any, projectRoot),
    },
    {
      name: 'edit_script',
      group: 'script',
      description: 'Edit a script by full replacement or line range',
      inputSchema: {
        type: 'object',
        properties: { script_path: { type: 'string' }, replacement: { type: 'string' }, start_line: { type: 'number' }, end_line: { type: 'number' } },
        required: ['script_path', 'replacement'],
      },
      handler: (args: Record<string, unknown>) => editScript(args as any, projectRoot),
    },
    {
      name: 'run_project',
      group: 'editor',
      description: 'Run the Godot project',
      inputSchema: {
        type: 'object',
        properties: { scene_path: { type: 'string' } },
      },
      handler: (args: Record<string, unknown>) => runProject(args as any, bridge),
    },
    {
      name: 'get_output_log',
      group: 'editor',
      description: 'Get recent lines from the Godot editor output log',
      inputSchema: {
        type: 'object',
        properties: { lines: { type: 'number' } },
      },
      handler: (args: Record<string, unknown>) => getOutputLog(args as any, bridge),
    },
    {
      name: 'read_file',
      group: 'file',
      description: 'Read any file in the project',
      inputSchema: {
        type: 'object',
        properties: { path: { type: 'string' } },
        required: ['path'],
      },
      handler: (args: Record<string, unknown>) => readFileTool(args as any, projectRoot),
    },
    {
      name: 'write_file',
      group: 'file',
      description: 'Write content to any file in the project',
      inputSchema: {
        type: 'object',
        properties: { path: { type: 'string' }, content: { type: 'string' } },
        required: ['path', 'content'],
      },
      handler: (args: Record<string, unknown>) => writeFileTool(args as any, projectRoot),
    },
    {
      name: 'get_game_scene_tree',
      group: 'game',
      description: 'Get the active scene tree from a running Godot game. Use max_depth to limit tree depth and avoid large payloads.',
      inputSchema: {
        type: 'object',
        properties: {
          max_depth: { type: 'number', description: 'Maximum tree depth to traverse (default: 5)' },
        },
      },
      handler: (args: Record<string, unknown>) => getGameSceneTree({ max_depth: args.max_depth as number | undefined }, projectRoot, bridge),
    },
    {
      name: 'get_game_node_properties',
      group: 'game',
      description: 'Get all properties of a node in a running Godot game',
      inputSchema: {
        type: 'object',
        properties: { node_path: { type: 'string' } },
        required: ['node_path'],
      },
      handler: (args: Record<string, unknown>) => getGameNodeProperties(args as { node_path: string }, projectRoot, bridge),
    },
    {
      name: 'set_game_node_property',
      group: 'game',
      description: 'Set a property value on a node in a running Godot game',
      inputSchema: {
        type: 'object',
        properties: { node_path: { type: 'string' }, property: { type: 'string' }, value: { type: 'string' } },
        required: ['node_path', 'property', 'value'],
      },
      handler: (args: Record<string, unknown>) => setGameNodeProperty(args as any, projectRoot, bridge),
    },
    {
      name: 'execute_game_script',
      group: 'game',
      description: 'Execute arbitrary GDScript code in a running Godot game',
      inputSchema: {
        type: 'object',
        properties: { code: { type: 'string' } },
        required: ['code'],
      },
      handler: (args: Record<string, unknown>) => executeGameScript(args as { code: string }, projectRoot, bridge),
    },
    {
      name: 'find_nodes_by_script',
      group: 'game',
      description: 'Find all nodes in the current scene tree that use a specific script',
      inputSchema: {
        type: 'object',
        properties: { script_path: { type: 'string' } },
        required: ['script_path'],
      },
      handler: (args: Record<string, unknown>) => findNodesByScript(args as { script_path: string }, projectRoot, bridge),
    },
    {
      name: 'get_autoload',
      group: 'game',
      description: 'Get the autoload singleton by name',
      inputSchema: {
        type: 'object',
        properties: { name: { type: 'string' } },
        required: ['name'],
      },
      handler: (args: Record<string, unknown>) => getAutoload(args as { name: string }, projectRoot, bridge),
    },
    {
      name: 'batch_get_properties',
      group: 'game',
      description: 'Get properties from multiple nodes in a single call',
      inputSchema: {
        type: 'object',
        properties: { node_paths: { type: 'array', items: { type: 'string' } } },
        required: ['node_paths'],
      },
      handler: (args: Record<string, unknown>) => batchGetProperties(args as { node_paths: string[] }, projectRoot, bridge),
    },
    {
      name: 'find_ui_elements',
      group: 'game',
      description: 'Find UI elements by type or text content',
      inputSchema: {
        type: 'object',
        properties: { type: { type: 'string' }, text: { type: 'string' } },
      },
      handler: (args: Record<string, unknown>) => findUiElements(args as { type?: string; text?: string }, projectRoot, bridge),
    },
    {
      name: 'click_button_by_text',
      group: 'game',
      description: 'Click a button UI element that contains the specified text',
      inputSchema: {
        type: 'object',
        properties: { text: { type: 'string' } },
        required: ['text'],
      },
      handler: (args: Record<string, unknown>) => clickButtonByText(args as { text: string }, projectRoot, bridge),
    },
    {
      name: 'wait_for_node',
      group: 'game',
      description: 'Wait for a node to appear in the scene tree',
      inputSchema: {
        type: 'object',
        properties: { node_path: { type: 'string' }, timeout_ms: { type: 'number' } },
        required: ['node_path'],
      },
      handler: (args: Record<string, unknown>) => waitForNode(args as { node_path: string; timeout_ms?: number }, projectRoot, bridge),
    },
    {
      name: 'find_nearby_nodes',
      group: 'game',
      description: 'Find nodes near a given node within a specified distance',
      inputSchema: {
        type: 'object',
        properties: { node_path: { type: 'string' }, distance: { type: 'number' } },
        required: ['node_path'],
      },
      handler: (args: Record<string, unknown>) => findNearbyNodes(args as { node_path: string; distance?: number }, projectRoot, bridge),
    },
    {
      name: 'navigate_to',
      group: 'game',
      description: 'Navigate to a target node (e.g., for UI navigation)',
      inputSchema: {
        type: 'object',
        properties: { node_path: { type: 'string' }, target: { type: 'string' } },
        required: ['node_path', 'target'],
      },
      handler: (args: Record<string, unknown>) => navigateTo(args as { node_path: string; target: string }, projectRoot, bridge),
    },
    {
      name: 'get_game_node_property',
      group: 'game',
      description: 'Get a single property value from a node in a running Godot game',
      inputSchema: {
        type: 'object',
        properties: { node_path: { type: 'string' }, property: { type: 'string' } },
        required: ['node_path', 'property'],
      },
      handler: (args: Record<string, unknown>) => getGameNodeProperty(args as { node_path: string; property: string }, projectRoot, bridge),
    },
    {
      name: 'capture_frames',
      group: 'game',
      description: 'Capture frames from the game viewport for replay/inspection',
      inputSchema: {
        type: 'object',
        properties: { count: { type: 'number' } },
      },
      handler: (args: Record<string, unknown>) => captureFrames(args as { count?: number }, projectRoot, bridge),
    },
    {
      name: 'monitor_properties',
      group: 'game',
      description: 'Start monitoring property changes on a node',
      inputSchema: {
        type: 'object',
        properties: { node_path: { type: 'string' }, properties: { type: 'array', items: { type: 'string' } } },
        required: ['node_path', 'properties'],
      },
      handler: (args: Record<string, unknown>) => monitorProperties(args as { node_path: string; properties: string[] }, projectRoot, bridge),
    },
    {
      name: 'start_recording',
      group: 'game',
      description: 'Start recording user input for replay',
      inputSchema: { type: 'object', properties: {} },
      handler: () => startRecording({}, projectRoot, bridge),
    },
    {
      name: 'stop_recording',
      group: 'game',
      description: 'Stop recording and get the recorded input data',
      inputSchema: { type: 'object', properties: {} },
      handler: () => stopRecording({}, projectRoot, bridge),
    },
    {
      name: 'replay_recording',
      group: 'game',
      description: 'Replay a previously recorded input sequence',
      inputSchema: {
        type: 'object',
        properties: { data: { type: 'object' } },
        required: ['data'],
      },
      handler: (args: Record<string, unknown>) => replayRecording(args as { data: unknown }, projectRoot, bridge),
    },
    {
      name: 'simulate_key',
      group: 'input',
      description: 'Simulate a keyboard key press or release',
      inputSchema: {
        type: 'object',
        properties: { keycode: { type: 'string' }, pressed: { type: 'boolean' }, modifiers: { type: 'object', properties: { meta: { type: 'boolean' }, ctrl: { type: 'boolean' }, shift: { type: 'boolean' }, alt: { type: 'boolean' } } } },
        required: ['keycode', 'pressed'],
      },
      handler: (args: Record<string, unknown>) => simulateKey(args as any, bridge),
    },
    {
      name: 'simulate_mouse_click',
      group: 'input',
      description: 'Simulate a mouse button click at a position',
      inputSchema: {
        type: 'object',
        properties: { position: { type: 'object', properties: { x: { type: 'number' }, y: { type: 'number' } } }, button: { type: 'number' }, pressed: { type: 'boolean' } },
        required: ['position', 'button', 'pressed'],
      },
      handler: (args: Record<string, unknown>) => simulateMouseClick(args as any, bridge),
    },
    {
      name: 'simulate_mouse_move',
      group: 'input',
      description: 'Simulate mouse movement to a position',
      inputSchema: {
        type: 'object',
        properties: { position: { type: 'object', properties: { x: { type: 'number' }, y: { type: 'number' } } } },
        required: ['position'],
      },
      handler: (args: Record<string, unknown>) => simulateMouseMove(args as any, bridge),
    },
    {
      name: 'simulate_action',
      group: 'input',
      description: 'Simulate an input action (e.g., "ui_accept")',
      inputSchema: {
        type: 'object',
        properties: { action: { type: 'string' }, pressed: { type: 'boolean' } },
        required: ['action', 'pressed'],
      },
      handler: (args: Record<string, unknown>) => simulateAction(args as any, bridge),
    },
    {
      name: 'simulate_sequence',
      group: 'input',
      description: 'Simulate a sequence of input events',
      inputSchema: {
        type: 'object',
        properties: { events: { type: 'array', items: { type: 'object' } } },
        required: ['events'],
      },
      handler: (args: Record<string, unknown>) => simulateSequence(args as any, bridge),
    },
    {
      name: 'get_input_actions',
      group: 'input',
      description: 'Get list of all defined input actions',
      inputSchema: { type: 'object', properties: {} },
      handler: () => getInputActions({}, bridge),
    },
    {
      name: 'set_input_action',
      group: 'input',
      description: 'Add or modify an input action with a new event',
      inputSchema: {
        type: 'object',
        properties: { action: { type: 'string' }, event: { type: 'object' } },
        required: ['action', 'event'],
      },
      handler: (args: Record<string, unknown>) => setInputAction(args as any, bridge),
    },
  ];

  return tools.map((tool) => ({
    ...tool,
    handler: async (args: Record<string, unknown>) => {
      const startTime = Date.now();
      const paramStr = formatArgs(args, config.log_max_param_length);
      await mcpLog(`${tool.name} → ${paramStr}`, 'debug');
      try {
        const result = await tool.handler(args);
        const elapsed = Date.now() - startTime;
        await mcpLog(`${tool.name} ← OK (${elapsed}ms)`, 'debug');
        return result;
      } catch (err) {
        const elapsed = Date.now() - startTime;
        const msg = err instanceof Error ? err.message : String(err);
        await mcpLog(`${tool.name} ← ERROR: ${msg} (${elapsed}ms)`, 'debug');
        throw err;
      }
    },
  }));
}

export function getToolGroups(tools: ToolDefinition[]): Record<string, ToolDefinition[]> {
  const groups: Record<string, ToolDefinition[]> = {};
  for (const tool of tools) {
    if (!groups[tool.group]) groups[tool.group] = [];
    groups[tool.group].push(tool);
  }
  return groups;
}
