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
import {
  listAnimations, createAnimation, addAnimationTrack, setAnimationKeyframe,
  getAnimationInfo, removeAnimation
} from './animation.js';
import {
  tilemapSetCell, tilemapGetCell, tilemapClear, tilemapGetInfo,
  tilemapGetUsedCells, tilemapFillRect
} from './tilemap.js';
import {
  createTheme, setThemeColor, setThemeConstant, setThemeFontSize,
  setThemeStylebox, getThemeInfo
} from './theme.js';
import {
  readResource, editResource, createResource, getResourcePreview,
  addAutoload, removeAutoload
} from './resource.js';
import {
  setupPhysicsBody, setupCollision, setPhysicsLayers,
  getPhysicsLayers, getCollisionInfo, addRaycast
} from './physics.js';
import {
  setupNavigationRegion, setupNavigationAgent, bakeNavigationMesh,
  setNavigationLayers, getNavigationInfo, getNavigationPath
} from './navigation.js';
import {
  addMeshInstance, setupCamera3D, setupLighting, setupEnvironment,
  addGridMap, setMaterial3D
} from './scene3d.js';
import {
  createParticles, setParticleMaterial, setParticleColorGradient,
  applyParticlePreset, getParticleInfo
} from './particle.js';
import {
  addAudioPlayer, addAudioBus, addAudioBusEffect, setAudioBus,
  getAudioBusLayout, getAudioInfo
} from './audio.js';
import {
  createShader, readShader, editShader, assignShaderMaterial,
  setShaderParam, getShaderParams
} from './shader.js';
import {
  listExportPresets, exportProject, getExportInfo
} from './export.js';
import {
  getPerformanceMonitors, getEditorPerformance
} from './profiling.js';

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
    {
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
    // Animation tools (6)
    {
      name: 'list_animations',
      description: 'List all animations on a node with an AnimationPlayer',
      inputSchema: {
        type: 'object',
        properties: { node_path: { type: 'string' } },
        required: ['node_path'],
      },
      handler: (args) => listAnimations(args as { node_path: string }, bridge),
    },
    {
      name: 'create_animation',
      description: 'Create a new animation on an AnimationPlayer node',
      inputSchema: {
        type: 'object',
        properties: { node_path: { type: 'string' }, name: { type: 'string' } },
        required: ['node_path', 'name'],
      },
      handler: (args) => createAnimation(args as { node_path: string; name: string }, bridge),
    },
    {
      name: 'add_animation_track',
      description: 'Add a track to an animation on an AnimationPlayer node',
      inputSchema: {
        type: 'object',
        properties: { node_path: { type: 'string' }, animation: { type: 'string' }, track_path: { type: 'string' } },
        required: ['node_path', 'animation', 'track_path'],
      },
      handler: (args) => addAnimationTrack(args as { node_path: string; animation: string; track_path: string }, bridge),
    },
    {
      name: 'set_animation_keyframe',
      description: 'Set a keyframe value at a specific time in an animation track',
      inputSchema: {
        type: 'object',
        properties: { node_path: { type: 'string' }, animation: { type: 'string' }, track_index: { type: 'number' }, time: { type: 'number' }, value: { type: 'string' } },
        required: ['node_path', 'animation', 'track_index', 'time', 'value'],
      },
      handler: (args) => setAnimationKeyframe(args as { node_path: string; animation: string; track_index: number; time: number; value: string }, bridge),
    },
    {
      name: 'get_animation_info',
      description: 'Get detailed information about an animation',
      inputSchema: {
        type: 'object',
        properties: { node_path: { type: 'string' }, animation: { type: 'string' } },
        required: ['node_path', 'animation'],
      },
      handler: (args) => getAnimationInfo(args as { node_path: string; animation: string }, bridge),
    },
    {
      name: 'remove_animation',
      description: 'Remove an animation from an AnimationPlayer node',
      inputSchema: {
        type: 'object',
        properties: { node_path: { type: 'string' }, animation: { type: 'string' } },
        required: ['node_path', 'animation'],
      },
      handler: (args) => removeAnimation(args as { node_path: string; animation: string }, bridge),
    },
    // Tilemap tools (6)
    {
      name: 'tilemap_set_cell',
      description: 'Set a cell in a TileMap layer to a specific tile ID',
      inputSchema: {
        type: 'object',
        properties: { node_path: { type: 'string' }, layer: { type: 'number' }, x: { type: 'number' }, y: { type: 'number' }, tile_id: { type: 'number' } },
        required: ['node_path', 'x', 'y', 'tile_id'],
      },
      handler: (args) => tilemapSetCell(args as { node_path: string; layer?: number; x: number; y: number; tile_id: number }, bridge),
    },
    {
      name: 'tilemap_get_cell',
      description: 'Get the tile ID at a specific cell position in a TileMap',
      inputSchema: {
        type: 'object',
        properties: { node_path: { type: 'string' }, layer: { type: 'number' }, x: { type: 'number' }, y: { type: 'number' } },
        required: ['node_path', 'x', 'y'],
      },
      handler: (args) => tilemapGetCell(args as { node_path: string; layer?: number; x: number; y: number }, bridge),
    },
    {
      name: 'tilemap_clear',
      description: 'Clear all cells in a TileMap layer',
      inputSchema: {
        type: 'object',
        properties: { node_path: { type: 'string' }, layer: { type: 'number' } },
        required: ['node_path'],
      },
      handler: (args) => tilemapClear(args as { node_path: string; layer?: number }, bridge),
    },
    {
      name: 'tilemap_get_info',
      description: 'Get information about a TileMap node including cell size, tile set, and layers',
      inputSchema: {
        type: 'object',
        properties: { node_path: { type: 'string' } },
        required: ['node_path'],
      },
      handler: (args) => tilemapGetInfo(args as { node_path: string }, bridge),
    },
    {
      name: 'tilemap_get_used_cells',
      description: 'Get all used cell positions in a TileMap layer',
      inputSchema: {
        type: 'object',
        properties: { node_path: { type: 'string' }, layer: { type: 'number' } },
        required: ['node_path'],
      },
      handler: (args) => tilemapGetUsedCells(args as { node_path: string; layer?: number }, bridge),
    },
    {
      name: 'tilemap_fill_rect',
      description: 'Fill a rectangular region in a TileMap layer with a specific tile ID',
      inputSchema: {
        type: 'object',
        properties: { node_path: { type: 'string' }, layer: { type: 'number' }, x: { type: 'number' }, y: { type: 'number' }, width: { type: 'number' }, height: { type: 'number' }, tile_id: { type: 'number' } },
        required: ['node_path', 'x', 'y', 'width', 'height', 'tile_id'],
      },
      handler: (args) => tilemapFillRect(args as { node_path: string; layer?: number; x: number; y: number; width: number; height: number; tile_id: number }, bridge),
    },
    // Theme tools (6)
    {
      name: 'create_theme',
      description: 'Create a new Theme resource file',
      inputSchema: {
        type: 'object',
        properties: { node_path: { type: 'string' } },
        required: ['node_path'],
      },
      handler: (args) => createTheme(args as { node_path: string }, bridge),
    },
    {
      name: 'set_theme_color',
      description: 'Set a color value in a Theme resource',
      inputSchema: {
        type: 'object',
        properties: { theme_path: { type: 'string' }, color_class: { type: 'string' }, color_name: { type: 'string' }, color: { type: 'string' } },
        required: ['theme_path', 'color_class', 'color_name', 'color'],
      },
      handler: (args) => setThemeColor(args as any, bridge),
    },
    {
      name: 'set_theme_constant',
      description: 'Set a constant value in a Theme resource',
      inputSchema: {
        type: 'object',
        properties: { theme_path: { type: 'string' }, constant_class: { type: 'string' }, constant_name: { type: 'string' }, value: { type: 'number' } },
        required: ['theme_path', 'constant_class', 'constant_name', 'value'],
      },
      handler: (args) => setThemeConstant(args as any, bridge),
    },
    {
      name: 'set_theme_font_size',
      description: 'Set a font size value in a Theme resource',
      inputSchema: {
        type: 'object',
        properties: { theme_path: { type: 'string' }, font_class: { type: 'string' }, font_name: { type: 'string' }, size_name: { type: 'string' }, size: { type: 'number' } },
        required: ['theme_path', 'font_class', 'font_name', 'size_name', 'size'],
      },
      handler: (args) => setThemeFontSize(args as any, bridge),
    },
    {
      name: 'set_theme_stylebox',
      description: 'Set a StyleBox texture in a Theme resource',
      inputSchema: {
        type: 'object',
        properties: { theme_path: { type: 'string' }, style_class: { type: 'string' }, style_name: { type: 'string' }, texture_path: { type: 'string' } },
        required: ['theme_path', 'style_class', 'style_name', 'texture_path'],
      },
      handler: (args) => setThemeStylebox(args as any, bridge),
    },
    {
      name: 'get_theme_info',
      description: 'Get information about a Theme resource',
      inputSchema: {
        type: 'object',
        properties: { node_path: { type: 'string' } },
        required: ['node_path'],
      },
      handler: (args) => getThemeInfo(args as { node_path: string }, bridge),
    },
    // Resource tools (6)
    {
      name: 'read_resource',
      description: 'Read a .tres resource file and return its properties',
      inputSchema: {
        type: 'object',
        properties: { path: { type: 'string' } },
        required: ['path'],
      },
      handler: (args) => readResource(args as { path: string }, bridge),
    },
    {
      name: 'edit_resource',
      description: 'Edit a property value in a .tres resource file',
      inputSchema: {
        type: 'object',
        properties: { resource_path: { type: 'string' }, property: { type: 'string' }, value: { type: 'string' } },
        required: ['resource_path', 'property', 'value'],
      },
      handler: (args) => editResource(args as any, bridge),
    },
    {
      name: 'create_resource',
      description: 'Create a new .tres resource file',
      inputSchema: {
        type: 'object',
        properties: { resource_path: { type: 'string' }, resource_type: { type: 'string' } },
        required: ['resource_path'],
      },
      handler: (args) => createResource(args as any, bridge),
    },
    {
      name: 'get_resource_preview',
      description: 'Get a preview texture or icon path from a resource',
      inputSchema: {
        type: 'object',
        properties: { path: { type: 'string' } },
        required: ['path'],
      },
      handler: (args) => getResourcePreview(args as { path: string }, bridge),
    },
    {
      name: 'add_autoload',
      description: 'Add an autoload singleton to the project',
      inputSchema: {
        type: 'object',
        properties: { name: { type: 'string' }, path: { type: 'string' } },
        required: ['name', 'path'],
      },
      handler: (args) => addAutoload(args as { name: string; path: string }, bridge),
    },
    {
      name: 'remove_autoload',
      description: 'Remove an autoload singleton from the project',
      inputSchema: {
        type: 'object',
        properties: { name: { type: 'string' } },
        required: ['name'],
      },
      handler: (args) => removeAutoload(args as { name: string }, bridge),
    },
    // Physics tools (6)
    {
      name: 'setup_physics_body',
      description: 'Create a physics body node (StaticBody2D, RigidBody2D, etc.)',
      inputSchema: {
        type: 'object',
        properties: { node_path: { type: 'string' }, body_type: { type: 'string' }, position: { type: 'object' } },
        required: ['node_path', 'body_type'],
      },
      handler: (args) => setupPhysicsBody(args as any, bridge),
    },
    {
      name: 'setup_collision',
      description: 'Set up a collision shape on a physics body',
      inputSchema: {
        type: 'object',
        properties: { node_path: { type: 'string' }, shape_type: { type: 'string' }, size: { type: 'object' }, radius: { type: 'number' } },
        required: ['node_path', 'shape_type'],
      },
      handler: (args) => setupCollision(args as any, bridge),
    },
    {
      name: 'set_physics_layers',
      description: 'Set physics layer and mask bits on a physics body',
      inputSchema: {
        type: 'object',
        properties: { node_path: { type: 'string' }, layer: { type: 'number' }, mask: { type: 'number' } },
        required: ['node_path'],
      },
      handler: (args) => setPhysicsLayers(args as any, bridge),
    },
    {
      name: 'get_physics_layers',
      description: 'Get physics layer and mask configuration from a physics body',
      inputSchema: {
        type: 'object',
        properties: { node_path: { type: 'string' } },
        required: ['node_path'],
      },
      handler: (args) => getPhysicsLayers(args as any, bridge),
    },
    {
      name: 'get_collision_info',
      description: 'Get collision shape information from a physics body',
      inputSchema: {
        type: 'object',
        properties: { node_path: { type: 'string' } },
        required: ['node_path'],
      },
      handler: (args) => getCollisionInfo(args as any, bridge),
    },
    {
      name: 'add_raycast',
      description: 'Add a RayCast2D node to a physics body',
      inputSchema: {
        type: 'object',
        properties: { node_path: { type: 'string' }, name: { type: 'string' }, target_position: { type: 'object' }, enabled: { type: 'boolean' } },
        required: ['node_path'],
      },
      handler: (args) => addRaycast(args as any, bridge),
    },
    // Navigation tools (6)
    {
      name: 'setup_navigation_region',
      description: 'Create a NavigationRegion2D with bounds',
      inputSchema: {
        type: 'object',
        properties: { node_path: { type: 'string' }, bounds: { type: 'object' }, cell_size: { type: 'number' } },
        required: ['node_path'],
      },
      handler: (args) => setupNavigationRegion(args as any, bridge),
    },
    {
      name: 'setup_navigation_agent',
      description: 'Create a NavigationAgent2D with properties',
      inputSchema: {
        type: 'object',
        properties: { node_path: { type: 'string' }, agent_type: { type: 'string' }, radius: { type: 'number' } },
        required: ['node_path'],
      },
      handler: (args) => setupNavigationAgent(args as any, bridge),
    },
    {
      name: 'bake_navigation_mesh',
      description: 'Bake the navigation mesh for a NavigationRegion2D',
      inputSchema: {
        type: 'object',
        properties: { node_path: { type: 'string' } },
        required: ['node_path'],
      },
      handler: (args) => bakeNavigationMesh(args as any, bridge),
    },
    {
      name: 'set_navigation_layers',
      description: 'Set navigation layer bits on a navigation node',
      inputSchema: {
        type: 'object',
        properties: { node_path: { type: 'string' }, layers: { type: 'number' } },
        required: ['node_path'],
      },
      handler: (args) => setNavigationLayers(args as any, bridge),
    },
    {
      name: 'get_navigation_info',
      description: 'Get navigation region or agent configuration',
      inputSchema: {
        type: 'object',
        properties: { node_path: { type: 'string' } },
        required: ['node_path'],
      },
      handler: (args) => getNavigationInfo(args as any, bridge),
    },
    {
      name: 'get_navigation_path',
      description: 'Get the navigation path from a NavigationAgent',
      inputSchema: {
        type: 'object',
        properties: { node_path: { type: 'string' } },
        required: ['node_path'],
      },
      handler: (args) => getNavigationPath(args as any, bridge),
    },
    // Scene3D tools (6)
    {
      name: 'add_mesh_instance',
      description: 'Create a MeshInstance3D with a primitive mesh',
      inputSchema: {
        type: 'object',
        properties: { node_path: { type: 'string' }, mesh_type: { type: 'string' }, position: { type: 'object' } },
        required: ['node_path', 'mesh_type'],
      },
      handler: (args) => addMeshInstance(args as any, bridge),
    },
    {
      name: 'setup_camera_3d',
      description: 'Create a Camera3D with position and fov',
      inputSchema: {
        type: 'object',
        properties: { node_path: { type: 'string' }, position: { type: 'object' }, fov: { type: 'number' } },
        required: ['node_path'],
      },
      handler: (args) => setupCamera3D(args as any, bridge),
    },
    {
      name: 'setup_lighting',
      description: 'Create a light node (OmniLight3D, DirectionalLight3D, SpotLight3D)',
      inputSchema: {
        type: 'object',
        properties: { node_path: { type: 'string' }, light_type: { type: 'string' }, position: { type: 'object' } },
        required: ['node_path', 'light_type'],
      },
      handler: (args) => setupLighting(args as any, bridge),
    },
    {
      name: 'setup_environment',
      description: 'Create a WorldEnvironment with Environment resource',
      inputSchema: {
        type: 'object',
        properties: { node_path: { type: 'string' }, background_mode: { type: 'string' } },
        required: ['node_path'],
      },
      handler: (args) => setupEnvironment(args as any, bridge),
    },
    {
      name: 'add_gridmap',
      description: 'Create a GridMap node with optional tile set',
      inputSchema: {
        type: 'object',
        properties: { node_path: { type: 'string' }, tile_set_path: { type: 'string' }, cell_size: { type: 'number' } },
        required: ['node_path'],
      },
      handler: (args) => addGridMap(args as any, bridge),
    },
    {
      name: 'set_material_3d',
      description: 'Apply a material to a MeshInstance3D',
      inputSchema: {
        type: 'object',
        properties: { node_path: { type: 'string' }, material_type: { type: 'string' }, properties: { type: 'object' } },
        required: ['node_path'],
      },
      handler: (args) => setMaterial3D(args as any, bridge),
    },
    // Particle tools (5)
    {
      name: 'create_particles',
      description: 'Create a GPUParticles2D or GPUParticles3D node',
      inputSchema: {
        type: 'object',
        properties: { node_path: { type: 'string' }, particle_type: { type: 'string' }, amount: { type: 'number' } },
        required: ['node_path'],
      },
      handler: (args) => createParticles(args as any, bridge),
    },
    {
      name: 'set_particle_material',
      description: 'Set the process material on a particle system',
      inputSchema: {
        type: 'object',
        properties: { node_path: { type: 'string' }, properties: { type: 'object' } },
        required: ['node_path'],
      },
      handler: (args) => setParticleMaterial(args as any, bridge),
    },
    {
      name: 'set_particle_color_gradient',
      description: 'Set color gradient over particle lifetime',
      inputSchema: {
        type: 'object',
        properties: { node_path: { type: 'string' }, color_points: { type: 'array' } },
        required: ['node_path'],
      },
      handler: (args) => setParticleColorGradient(args as any, bridge),
    },
    {
      name: 'apply_particle_preset',
      description: 'Apply a preset configuration to a particle system',
      inputSchema: {
        type: 'object',
        properties: { node_path: { type: 'string' }, preset: { type: 'string' } },
        required: ['node_path', 'preset'],
      },
      handler: (args) => applyParticlePreset(args as any, bridge),
    },
    {
      name: 'get_particle_info',
      description: 'Get particle system configuration',
      inputSchema: {
        type: 'object',
        properties: { node_path: { type: 'string' } },
        required: ['node_path'],
      },
      handler: (args) => getParticleInfo(args as any, bridge),
    },
    // Audio tools (6)
    {
      name: 'add_audio_player',
      description: 'Create an AudioStreamPlayer node',
      inputSchema: {
        type: 'object',
        properties: { node_path: { type: 'string' }, stream_type: { type: 'string' }, volume_db: { type: 'number' } },
        required: ['node_path'],
      },
      handler: (args) => addAudioPlayer(args as any, bridge),
    },
    {
      name: 'add_audio_bus',
      description: 'Add a new audio bus',
      inputSchema: {
        type: 'object',
        properties: { name: { type: 'string' }, volume: { type: 'number' } },
        required: ['name'],
      },
      handler: (args) => addAudioBus(args as any, bridge),
    },
    {
      name: 'add_audio_bus_effect',
      description: 'Add an effect to an audio bus',
      inputSchema: {
        type: 'object',
        properties: { bus_name: { type: 'string' }, effect_type: { type: 'string' } },
        required: ['bus_name', 'effect_type'],
      },
      handler: (args) => addAudioBusEffect(args as any, bridge),
    },
    {
      name: 'set_audio_bus',
      description: 'Set the audio bus for an AudioStreamPlayer',
      inputSchema: {
        type: 'object',
        properties: { node_path: { type: 'string' }, bus_index: { type: 'number' } },
        required: ['node_path', 'bus_index'],
      },
      handler: (args) => setAudioBus(args as any, bridge),
    },
    {
      name: 'get_audio_bus_layout',
      description: 'Get all audio buses and their effects',
      inputSchema: {
        type: 'object',
        properties: {},
      },
      handler: (args) => getAudioBusLayout(args as Record<string, unknown>, bridge),
    },
    {
      name: 'get_audio_info',
      description: 'Get audio player configuration',
      inputSchema: {
        type: 'object',
        properties: { node_path: { type: 'string' } },
        required: ['node_path'],
      },
      handler: (args) => getAudioInfo(args as any, bridge),
    },
    // Shader tools (6)
    {
      name: 'create_shader',
      description: 'Create a new .gdshader file with template',
      inputSchema: {
        type: 'object',
        properties: { shader_path: { type: 'string' }, shader_type: { type: 'string' } },
        required: ['shader_path'],
      },
      handler: (args) => createShader(args as any, bridge, projectRoot),
    },
    {
      name: 'read_shader',
      description: 'Read shader file content',
      inputSchema: {
        type: 'object',
        properties: { shader_path: { type: 'string' } },
        required: ['shader_path'],
      },
      handler: (args) => readShader(args as any, bridge, projectRoot),
    },
    {
      name: 'edit_shader',
      description: 'Edit shader code by full replacement or line range',
      inputSchema: {
        type: 'object',
        properties: { shader_path: { type: 'string' }, replacement: { type: 'string' }, start_line: { type: 'number' }, end_line: { type: 'number' } },
        required: ['shader_path', 'replacement'],
      },
      handler: (args) => editShader(args as any, bridge, projectRoot),
    },
    {
      name: 'assign_shader_material',
      description: 'Assign a shader material to a node',
      inputSchema: {
        type: 'object',
        properties: { node_path: { type: 'string' }, shader_path: { type: 'string' } },
        required: ['node_path', 'shader_path'],
      },
      handler: (args) => assignShaderMaterial(args as any, bridge),
    },
    {
      name: 'set_shader_param',
      description: 'Set a uniform parameter on a shader material',
      inputSchema: {
        type: 'object',
        properties: { node_path: { type: 'string' }, param: { type: 'string' }, value: { type: 'any' } },
        required: ['node_path', 'param', 'value'],
      },
      handler: (args) => setShaderParam(args as any, bridge),
    },
    {
      name: 'get_shader_params',
      description: 'Get all uniforms from a shader material',
      inputSchema: {
        type: 'object',
        properties: { node_path: { type: 'string' } },
        required: ['node_path'],
      },
      handler: (args) => getShaderParams(args as any, bridge),
    },
    // Export tools (3)
    {
      name: 'list_export_presets',
      description: 'List all export presets',
      inputSchema: {
        type: 'object',
        properties: { platform: { type: 'string' } },
      },
      handler: (args) => listExportPresets(args as any, bridge),
    },
    {
      name: 'export_project',
      description: 'Export the project using a preset',
      inputSchema: {
        type: 'object',
        properties: { preset: { type: 'string' }, output_path: { type: 'string' } },
        required: ['preset'],
      },
      handler: (args) => exportProject(args as any, bridge),
    },
    {
      name: 'get_export_info',
      description: 'Get export platform information',
      inputSchema: {
        type: 'object',
        properties: {},
      },
      handler: (args) => getExportInfo(args as Record<string, unknown>, bridge),
    },
    // Profiling tools (2)
    {
      name: 'get_performance_monitors',
      description: 'Get Performance singleton metrics',
      inputSchema: {
        type: 'object',
        properties: {},
      },
      handler: (args) => getPerformanceMonitors(args as Record<string, unknown>, bridge),
    },
    {
      name: 'get_editor_performance',
      description: 'Get editor-related performance stats',
      inputSchema: {
        type: 'object',
        properties: {},
      },
      handler: (args) => getEditorPerformance(args as Record<string, unknown>, bridge),
    },
  ];
}