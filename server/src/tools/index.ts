import type { GodotBridge } from '../godot-bridge.js';
import type { Config } from '../config.js';
import { readFileTool, writeFileTool } from './file.js';
import { listProjectFiles, readProjectSettings, getProjectInfo } from './project.js';
import { readScene, createScene, saveScene, openScene } from './scene.js';
import { getSceneTree, getNode, addNode, removeNode, updateProperty } from './node.js';
import { createScript, readScript, editScript } from './script.js';
import { runProject, getOutputLog } from './editor.js';

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
      handler: (args) => saveScene(args as { scene_path: string }, projectRoot, bridge.isConnected),
    },
    {
      name: 'open_scene',
      description: 'Open a scene in Godot editor',
      inputSchema: {
        type: 'object',
        properties: { scene_path: { type: 'string' } },
        required: ['scene_path'],
      },
      handler: (args) => openScene(args as { scene_path: string }, projectRoot, bridge.isConnected),
    },
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
      handler: (args) => addNode(args as any, projectRoot, bridge.isConnected),
    },
    {
      name: 'remove_node',
      description: 'Remove a node from a scene in Godot editor',
      inputSchema: {
        type: 'object',
        properties: { scene_path: { type: 'string' }, node_path: { type: 'string' } },
        required: ['scene_path', 'node_path'],
      },
      handler: (args) => removeNode(args as any, projectRoot, bridge.isConnected),
    },
    {
      name: 'update_property',
      description: 'Update a property of a node in Godot editor',
      inputSchema: {
        type: 'object',
        properties: { scene_path: { type: 'string' }, node_path: { type: 'string' }, property: { type: 'string' }, value: { type: 'string' } },
        required: ['scene_path', 'node_path', 'property', 'value'],
      },
      handler: (args) => updateProperty(args as any, projectRoot, bridge.isConnected),
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
    {
      name: 'run_project',
      description: 'Run the Godot project',
      inputSchema: {
        type: 'object',
        properties: { scene_path: { type: 'string' } },
      },
      handler: (args) => runProject(args as any, bridge.isConnected),
    },
    {
      name: 'get_output_log',
      description: 'Get recent lines from the Godot editor output log',
      inputSchema: {
        type: 'object',
        properties: { lines: { type: 'number' } },
      },
      handler: (args) => getOutputLog(args as any, bridge.isConnected),
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
  ];
}