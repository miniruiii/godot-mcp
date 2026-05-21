import type { GodotBridge } from '../godot-bridge.js';
import type { Config } from '../config.js';
import { readFileTool, writeFileTool } from './file.js';
import { listProjectFiles, readProjectSettings, getProjectInfo } from './project.js';
import { readScene, createScene, saveScene, openScene, getSceneFileContent, deleteScene, addSceneInstance, playScene, stopScene, getSignals } from './scene.js';
import { getSceneTree, getNode, addNode, removeNode, updateProperty } from './node.js';
import { createScript, readScript, editScript, listScripts, attachScript, validateScript, searchInFiles } from './script.js';
import { runProject, getOutputLog, getEditorErrors, getEditorScreenshot, getGameScreenshot, executeEditorScript, clearOutput, reloadPlugin, reloadProject } from './editor.js';
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
import {
  duplicateNode, moveNode, connectSignal, disconnectSignal,
  getNodeGroups, setNodeGroups, findNodesInGroup, renameNode
} from './node.js';

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: object;
  handler: (args: Record<string, unknown>) => Promise<unknown> | unknown;
}

export function buildToolRegistry(config: Config, bridge: GodotBridge): ToolDefinition[] {
  const projectRoot = config.project_path;

  return [
    {
      name: 'list_project_files',
      description: 'List all files in the Godot project. Optional filter by extension.',
      inputSchema: {
        type: 'object',
        properties: { extension: { type: 'string' } },
      },
      handler: (args) => listProjectFiles(args, projectRoot),
    },
    {
      name: 'read_project_settings',
      description: 'Read key settings from project.godot',
      inputSchema: { type: 'object', properties: {} },
      handler: () => readProjectSettings({}, projectRoot),
    },
    {
      name: 'get_project_info',
      description: 'Get project metadata: engine version, rendering backend',
      inputSchema: { type: 'object', properties: {} },
      handler: () => getProjectInfo({}, projectRoot),
    },
    {
      name: 'read_scene',
      description: 'Read a .tscn file and return its node tree structure',
      inputSchema: {
        type: 'object',
        properties: { scene_path: { type: 'string' } },
        required: ['scene_path'],
      },
      handler: (args) => readScene(args as { scene_path: string }, projectRoot),
    },
    {
      name: 'create_scene',
      description: 'Create a new .tscn file with a root node',
      inputSchema: {
        type: 'object',
        properties: { scene_path: { type: 'string' }, root_type: { type: 'string' }, root_name: { type: 'string' } },
        required: ['scene_path', 'root_type', 'root_name'],
      },
      handler: (args) => createScene(args as { scene_path: string; root_type: string; root_name: string }, projectRoot),
    },
    {
      name: 'save_scene',
      description: 'Save the current scene in Godot editor',
      inputSchema: {
        type: 'object',
        properties: { scene_path: { type: 'string' } },
        required: ['scene_path'],
      },
      handler: (args) => saveScene(args as { scene_path: string }, projectRoot, bridge),
    },
    {
      name: 'open_scene',
      description: 'Open a scene in Godot editor',
      inputSchema: {
        type: 'object',
        properties: { scene_path: { type: 'string' } },
        required: ['scene_path'],
      },
      handler: (args) => openScene(args as { scene_path: string }, projectRoot, bridge),
    },
    // Scene tools (6)
    {
      name: 'get_scene_file_content',
      description: 'Get the raw content of a scene file',
      inputSchema: {
        type: 'object',
        properties: { scene_path: { type: 'string' } },
        required: ['scene_path'],
      },
      handler: (args) => getSceneFileContent(args as { scene_path: string }, projectRoot),
    },
    {
      name: 'delete_scene',
      description: 'Delete a scene file from the project',
      inputSchema: {
        type: 'object',
        properties: { scene_path: { type: 'string' } },
        required: ['scene_path'],
      },
      handler: (args) => deleteScene(args as { scene_path: string }, projectRoot, bridge),
    },
    {
      name: 'add_scene_instance',
      description: 'Add a scene instance as a child node',
      inputSchema: {
        type: 'object',
        properties: { scene_path: { type: 'string' }, parent_path: { type: 'string' }, name: { type: 'string' } },
        required: ['scene_path', 'parent_path'],
      },
      handler: (args) => addSceneInstance(args as any, projectRoot, bridge),
    },
    {
      name: 'play_scene',
      description: 'Play a scene in the Godot editor',
      inputSchema: {
        type: 'object',
        properties: { scene_path: { type: 'string' } },
      },
      handler: (args) => playScene(args as { scene_path?: string }, projectRoot, bridge),
    },
    {
      name: 'stop_scene',
      description: 'Stop the currently playing scene',
      inputSchema: { type: 'object', properties: {} },
      handler: (args) => stopScene(args, projectRoot, bridge),
    },
    {
      name: 'get_signals',
      description: 'Get the list of signals for a node in a scene',
      inputSchema: {
        type: 'object',
        properties: { node_path: { type: 'string' } },
        required: ['node_path'],
      },
      handler: (args) => getSignals(args as { node_path: string }, projectRoot, bridge),
    },
    // Node tools (continued)
      name: 'get_scene_tree',
      description: 'Get the full node tree of a scene',
      inputSchema: {
        type: 'object',
        properties: { scene_path: { type: 'string' } },
        required: ['scene_path'],
      },
      handler: (args) => getSceneTree(args as { scene_path: string }, projectRoot, bridge.isConnected),
    },
    {
      name: 'get_node',
      description: 'Get details of a single node by path',
      inputSchema: {
        type: 'object',
        properties: { scene_path: { type: 'string' }, node_path: { type: 'string' } },
        required: ['scene_path', 'node_path'],
      },
      handler: (args) => getNode(args as { scene_path: string; node_path: string }, projectRoot, bridge.isConnected),
    },
    {
      name: 'add_node',
      description: 'Add a node to a scene in Godot editor',
      inputSchema: {
        type: 'object',
        properties: { scene_path: { type: 'string' }, parent_path: { type: 'string' }, node_type: { type: 'string' }, node_name: { type: 'string' } },
        required: ['scene_path', 'parent_path', 'node_type', 'node_name'],
      },
      handler: (args) => addNode(args as any, projectRoot, bridge),
    },
    {
      name: 'remove_node',
      description: 'Remove a node from a scene in Godot editor',
      inputSchema: {
        type: 'object',
        properties: { scene_path: { type: 'string' }, node_path: { type: 'string' } },
        required: ['scene_path', 'node_path'],
      },
      handler: (args) => removeNode(args as any, projectRoot, bridge),
    },
    {
      name: 'update_property',
      description: 'Update a property of a node in Godot editor',
      inputSchema: {
        type: 'object',
        properties: { scene_path: { type: 'string' }, node_path: { type: 'string' }, property: { type: 'string' }, value: { type: 'string' } },
        required: ['scene_path', 'node_path', 'property', 'value'],
      },
      handler: (args) => updateProperty(args as any, projectRoot, bridge),
    },
    {
      name: 'create_script',
      description: 'Create a new GDScript or C# file',
      inputSchema: {
        type: 'object',
        properties: { script_path: { type: 'string' }, extends_type: { type: 'string' }, template: { type: 'string' } },
        required: ['script_path'],
      },
      handler: (args) => createScript(args as any, projectRoot),
    },
    {
      name: 'read_script',
      description: 'Read the content of a script file',
      inputSchema: {
        type: 'object',
        properties: { script_path: { type: 'string' } },
        required: ['script_path'],
      },
      handler: (args) => readScript(args as any, projectRoot),
    },
    {
      name: 'edit_script',
      description: 'Edit a script by full replacement or line range',
      inputSchema: {
        type: 'object',
        properties: { script_path: { type: 'string' }, replacement: { type: 'string' }, start_line: { type: 'number' }, end_line: { type: 'number' } },
        required: ['script_path', 'replacement'],
      },
      handler: (args) => editScript(args as any, projectRoot),
    },
    // Script tools (4)
    {
      name: 'list_scripts',
      description: 'List all scripts in the Godot project',
      inputSchema: { type: 'object', properties: {} },
      handler: (args) => listScripts(args as Record<string, unknown>, bridge),
    },
    {
      name: 'attach_script',
      description: 'Attach a script to a node in the current scene',
      inputSchema: {
        type: 'object',
        properties: { node_path: { type: 'string' }, script_path: { type: 'string' } },
        required: ['node_path', 'script_path'],
      },
      handler: (args) => attachScript(args as { node_path: string; script_path: string }, bridge),
    },
    {
      name: 'validate_script',
      description: 'Validate a script file or code content',
      inputSchema: {
        type: 'object',
        properties: { script_path: { type: 'string' }, code: { type: 'string' } },
      },
      handler: (args) => validateScript(args as { script_path?: string; code?: string }, bridge),
    },
    {
      name: 'search_in_files',
      description: 'Search for text across script files in the project',
      inputSchema: {
        type: 'object',
        properties: { text: { type: 'string' }, extensions: { type: 'array', items: { type: 'string' } }, case_sensitive: { type: 'boolean' } },
        required: ['text'],
      },
      handler: (args) => searchInFiles(args as { text: string; extensions?: string[]; case_sensitive?: boolean }, bridge),
    },
    {
      name: 'run_project',
      description: 'Run the Godot project',
      inputSchema: {
        type: 'object',
        properties: { scene_path: { type: 'string' } },
      },
      handler: (args) => runProject(args as any, bridge),
    },
    {
      name: 'get_output_log',
      description: 'Get recent lines from the Godot editor output log',
      inputSchema: {
        type: 'object',
        properties: { lines: { type: 'number' } },
      },
      handler: (args) => getOutputLog(args as any, bridge),
    },
    // Editor tools (7)
    {
      name: 'get_editor_errors',
      description: 'Get current editor errors from the Godot console',
      inputSchema: { type: 'object', properties: {} },
      handler: (args) => getEditorErrors(args as Record<string, unknown>, bridge),
    },
    {
      name: 'get_editor_screenshot',
      description: 'Capture a screenshot of the Godot editor window',
      inputSchema: { type: 'object', properties: {} },
      handler: (args) => getEditorScreenshot(args as Record<string, unknown>, bridge),
    },
    {
      name: 'get_game_screenshot',
      description: 'Capture a screenshot of the running game viewport',
      inputSchema: { type: 'object', properties: {} },
      handler: (args) => getGameScreenshot(args as Record<string, unknown>, bridge),
    },
    {
      name: 'execute_editor_script',
      description: 'Execute arbitrary script code in the Godot editor context',
      inputSchema: {
        type: 'object',
        properties: { code: { type: 'string' } },
        required: ['code'],
      },
      handler: (args) => executeEditorScript(args as { code: string }, bridge),
    },
    {
      name: 'clear_output',
      description: 'Clear the Godot editor output log',
      inputSchema: { type: 'object', properties: {} },
      handler: (args) => clearOutput(args as Record<string, unknown>, bridge),
    },
    {
      name: 'reload_plugin',
      description: 'Reload the Godot MCP plugin',
      inputSchema: { type: 'object', properties: {} },
      handler: (args) => reloadPlugin(args as Record<string, unknown>, bridge),
    },
    {
      name: 'reload_project',
      description: 'Reload the Godot project',
      inputSchema: { type: 'object', properties: {} },
      handler: (args) => reloadProject(args as Record<string, unknown>, bridge),
    },
    {
      name: 'read_file',
      description: 'Read any file in the project',
      inputSchema: {
        type: 'object',
        properties: { path: { type: 'string' } },
        required: ['path'],
      },
      handler: (args) => readFileTool(args as any, projectRoot),
    },
    {
      name: 'write_file',
      description: 'Write content to any file in the project',
      inputSchema: {
        type: 'object',
        properties: { path: { type: 'string' }, content: { type: 'string' } },
        required: ['path', 'content'],
      },
      handler: (args) => writeFileTool(args as any, projectRoot),
    },
    // Runtime tools (19)
    {
      name: 'get_game_scene_tree',
      description: 'Get the active scene tree from a running Godot game',
      inputSchema: { type: 'object', properties: {} },
      handler: () => getGameSceneTree({}, projectRoot, bridge),
    },
    {
      name: 'get_game_node_properties',
      description: 'Get all properties of a node in a running Godot game',
      inputSchema: {
        type: 'object',
        properties: { node_path: { type: 'string' } },
        required: ['node_path'],
      },
      handler: (args) => getGameNodeProperties(args as { node_path: string }, projectRoot, bridge),
    },
    {
      name: 'set_game_node_property',
      description: 'Set a property value on a node in a running Godot game',
      inputSchema: {
        type: 'object',
        properties: { node_path: { type: 'string' }, property: { type: 'string' }, value: { type: 'string' } },
        required: ['node_path', 'property', 'value'],
      },
      handler: (args) => setGameNodeProperty(args as any, projectRoot, bridge),
    },
    {
      name: 'execute_game_script',
      description: 'Execute arbitrary GDScript code in a running Godot game',
      inputSchema: {
        type: 'object',
        properties: { code: { type: 'string' } },
        required: ['code'],
      },
      handler: (args) => executeGameScript(args as { code: string }, projectRoot, bridge),
    },
    {
      name: 'find_nodes_by_script',
      description: 'Find all nodes in the current scene tree that use a specific script',
      inputSchema: {
        type: 'object',
        properties: { script_path: { type: 'string' } },
        required: ['script_path'],
      },
      handler: (args) => findNodesByScript(args as { script_path: string }, projectRoot, bridge),
    },
    {
      name: 'get_autoload',
      description: 'Get the autoload singleton by name',
      inputSchema: {
        type: 'object',
        properties: { name: { type: 'string' } },
        required: ['name'],
      },
      handler: (args) => getAutoload(args as { name: string }, projectRoot, bridge),
    },
    {
      name: 'batch_get_properties',
      description: 'Get properties from multiple nodes in a single call',
      inputSchema: {
        type: 'object',
        properties: { node_paths: { type: 'array', items: { type: 'string' } } },
        required: ['node_paths'],
      },
      handler: (args) => batchGetProperties(args as { node_paths: string[] }, projectRoot, bridge),
    },
    {
      name: 'find_ui_elements',
      description: 'Find UI elements by type or text content',
      inputSchema: {
        type: 'object',
        properties: { type: { type: 'string' }, text: { type: 'string' } },
      },
      handler: (args) => findUiElements(args as { type?: string; text?: string }, projectRoot, bridge),
    },
    {
      name: 'click_button_by_text',
      description: 'Click a button UI element that contains the specified text',
      inputSchema: {
        type: 'object',
        properties: { text: { type: 'string' } },
        required: ['text'],
      },
      handler: (args) => clickButtonByText(args as { text: string }, projectRoot, bridge),
    },
    {
      name: 'wait_for_node',
      description: 'Wait for a node to appear in the scene tree',
      inputSchema: {
        type: 'object',
        properties: { node_path: { type: 'string' }, timeout_ms: { type: 'number' } },
        required: ['node_path'],
      },
      handler: (args) => waitForNode(args as { node_path: string; timeout_ms?: number }, projectRoot, bridge),
    },
    {
      name: 'find_nearby_nodes',
      description: 'Find nodes near a given node within a specified distance',
      inputSchema: {
        type: 'object',
        properties: { node_path: { type: 'string' }, distance: { type: 'number' } },
        required: ['node_path'],
      },
      handler: (args) => findNearbyNodes(args as { node_path: string; distance?: number }, projectRoot, bridge),
    },
    {
      name: 'navigate_to',
      description: 'Navigate to a target node (e.g., for UI navigation)',
      inputSchema: {
        type: 'object',
        properties: { node_path: { type: 'string' }, target: { type: 'string' } },
        required: ['node_path', 'target'],
      },
      handler: (args) => navigateTo(args as { node_path: string; target: string }, projectRoot, bridge),
    },
    {
      name: 'get_game_node_property',
      description: 'Get a single property value from a node in a running Godot game',
      inputSchema: {
        type: 'object',
        properties: { node_path: { type: 'string' }, property: { type: 'string' } },
        required: ['node_path', 'property'],
      },
      handler: (args) => getGameNodeProperty(args as { node_path: string; property: string }, projectRoot, bridge),
    },
    {
      name: 'capture_frames',
      description: 'Capture frames from the game viewport for replay/inspection',
      inputSchema: {
        type: 'object',
        properties: { count: { type: 'number' } },
      },
      handler: (args) => captureFrames(args as { count?: number }, projectRoot, bridge),
    },
    {
      name: 'monitor_properties',
      description: 'Start monitoring property changes on a node',
      inputSchema: {
        type: 'object',
        properties: { node_path: { type: 'string' }, properties: { type: 'array', items: { type: 'string' } } },
        required: ['node_path', 'properties'],
      },
      handler: (args) => monitorProperties(args as { node_path: string; properties: string[] }, projectRoot, bridge),
    },
    {
      name: 'start_recording',
      description: 'Start recording user input for replay',
      inputSchema: { type: 'object', properties: {} },
      handler: () => startRecording({}, projectRoot, bridge),
    },
    {
      name: 'stop_recording',
      description: 'Stop recording and get the recorded input data',
      inputSchema: { type: 'object', properties: {} },
      handler: () => stopRecording({}, projectRoot, bridge),
    },
    {
      name: 'replay_recording',
      description: 'Replay a previously recorded input sequence',
      inputSchema: {
        type: 'object',
        properties: { data: { type: 'object' } },
        required: ['data'],
      },
      handler: (args) => replayRecording(args as { data: unknown }, projectRoot, bridge),
    },
    // Input tools (7)
    {
      name: 'simulate_key',
      description: 'Simulate a keyboard key press or release',
      inputSchema: {
        type: 'object',
        properties: { keycode: { type: 'string' }, pressed: { type: 'boolean' }, modifiers: { type: 'array', items: { type: 'string' } } },
        required: ['keycode', 'pressed'],
      },
      handler: (args) => simulateKey(args as any, bridge),
    },
    {
      name: 'simulate_mouse_click',
      description: 'Simulate a mouse button click at a position',
      inputSchema: {
        type: 'object',
        properties: { position: { type: 'object', properties: { x: { type: 'number' }, y: { type: 'number' } } }, button: { type: 'number' }, pressed: { type: 'boolean' } },
        required: ['position', 'button', 'pressed'],
      },
      handler: (args) => simulateMouseClick(args as any, bridge),
    },
    {
      name: 'simulate_mouse_move',
      description: 'Simulate mouse movement to a position',
      inputSchema: {
        type: 'object',
        properties: { position: { type: 'object', properties: { x: { type: 'number' }, y: { type: 'number' } } } },
        required: ['position'],
      },
      handler: (args) => simulateMouseMove(args as any, bridge),
    },
    {
      name: 'simulate_action',
      description: 'Simulate an input action (e.g., "ui_accept")',
      inputSchema: {
        type: 'object',
        properties: { action: { type: 'string' }, pressed: { type: 'boolean' } },
        required: ['action', 'pressed'],
      },
      handler: (args) => simulateAction(args as any, bridge),
    },
    {
      name: 'simulate_sequence',
      description: 'Simulate a sequence of input events',
      inputSchema: {
        type: 'object',
        properties: { events: { type: 'array', items: { type: 'object' } } },
        required: ['events'],
      },
      handler: (args) => simulateSequence(args as any, bridge),
    },
    {
      name: 'get_input_actions',
      description: 'Get list of all defined input actions',
      inputSchema: { type: 'object', properties: {} },
      handler: () => getInputActions({}, bridge),
    },
    {
      name: 'set_input_action',
      description: 'Add or modify an input action with a new event',
      inputSchema: {
        type: 'object',
        properties: { action: { type: 'string' }, event: { type: 'object' } },
        required: ['action', 'event'],
      },
      handler: (args) => setInputAction(args as any, bridge),
    },
    // Node tools (8)
    {
      name: 'duplicate_node',
      description: 'Duplicate a node in a scene with a new name',
      inputSchema: {
        type: 'object',
        properties: { scene_path: { type: 'string' }, node_path: { type: 'string' }, new_name: { type: 'string' } },
        required: ['scene_path', 'node_path', 'new_name'],
      },
      handler: (args) => duplicateNode(args as any, projectRoot, bridge),
    },
    {
      name: 'move_node',
      description: 'Move a node to a new parent in the scene tree',
      inputSchema: {
        type: 'object',
        properties: { scene_path: { type: 'string' }, node_path: { type: 'string' }, new_parent_path: { type: 'string' } },
        required: ['scene_path', 'node_path', 'new_parent_path'],
      },
      handler: (args) => moveNode(args as any, projectRoot, bridge),
    },
    {
      name: 'connect_signal',
      description: 'Connect a signal from one node to a method on another',
      inputSchema: {
        type: 'object',
        properties: { scene_path: { type: 'string' }, node_path: { type: 'string' }, signal: { type: 'string' }, target_path: { type: 'string' }, method: { type: 'string' } },
        required: ['scene_path', 'node_path', 'signal', 'target_path', 'method'],
      },
      handler: (args) => connectSignal(args as any, projectRoot, bridge),
    },
    {
      name: 'disconnect_signal',
      description: 'Disconnect a signal connection between nodes',
      inputSchema: {
        type: 'object',
        properties: { scene_path: { type: 'string' }, node_path: { type: 'string' }, signal: { type: 'string' }, target_path: { type: 'string' }, method: { type: 'string' } },
        required: ['scene_path', 'node_path', 'signal', 'target_path', 'method'],
      },
      handler: (args) => disconnectSignal(args as any, projectRoot, bridge),
    },
    {
      name: 'get_node_groups',
      description: 'Get all groups that a node belongs to',
      inputSchema: {
        type: 'object',
        properties: { scene_path: { type: 'string' }, node_path: { type: 'string' } },
        required: ['scene_path', 'node_path'],
      },
      handler: (args) => getNodeGroups(args as any, projectRoot, bridge),
    },
    {
      name: 'set_node_groups',
      description: 'Add or remove a node from groups',
      inputSchema: {
        type: 'object',
        properties: { scene_path: { type: 'string' }, node_path: { type: 'string' }, add_to_groups: { type: 'array', items: { type: 'string' } }, remove_from_groups: { type: 'array', items: { type: 'string' } } },
        required: ['scene_path', 'node_path'],
      },
      handler: (args) => setNodeGroups(args as any, projectRoot, bridge),
    },
    {
      name: 'find_nodes_in_group',
      description: 'Find all nodes that belong to a specific group',
      inputSchema: {
        type: 'object',
        properties: { group: { type: 'string' } },
        required: ['group'],
      },
      handler: (args) => findNodesInGroup(args as any, projectRoot, bridge),
    },
    {
      name: 'rename_node',
      description: 'Rename a node in a scene',
      inputSchema: {
        type: 'object',
        properties: { scene_path: { type: 'string' }, node_path: { type: 'string' }, new_name: { type: 'string' } },
        required: ['scene_path', 'node_path', 'new_name'],
      },
      handler: (args) => renameNode(args as any, projectRoot, bridge),
    },
  ];
}