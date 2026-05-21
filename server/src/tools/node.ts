import { readScene, type SceneNodeResult } from './scene.js';
import type { GodotBridge } from '../godot-bridge.js';

export interface GetSceneTreeArgs {
  scene_path: string;
}

export interface GetSceneTreeResult {
  nodes: SceneNodeResult[];
  rootName: string;
}

export function getSceneTree(args: GetSceneTreeArgs, projectRoot: string, godotConnected: boolean): GetSceneTreeResult {
  const scene = readScene(args, projectRoot);
  const nodes: SceneNodeResult[] = [];

  function collect(node: SceneNodeResult) {
    nodes.push(node);
    for (const child of node.children) {
      collect(child);
    }
  }

  collect(scene.root);
  return { nodes, rootName: scene.root.name };
}

export interface GetNodeArgs {
  scene_path: string;
  node_path: string;
}

export interface GetNodeResult {
  name: string;
  type: string;
  path: string;
  properties: Record<string, string>;
}

export function getNode(args: GetNodeArgs, projectRoot: string, godotConnected: boolean): GetNodeResult {
  const scene = readScene(args, projectRoot);

  function find(node: SceneNodeResult): SceneNodeResult | null {
    if (node.path === args.node_path) return node;
    for (const child of node.children) {
      const found = find(child);
      if (found) return found;
    }
    return null;
  }

  const found = find(scene.root);
  if (!found) {
    throw new Error(`Node not found: ${args.node_path}`);
  }

  return {
    name: found.name,
    type: found.type,
    path: found.path,
    properties: found.properties,
  };
}

export interface AddNodeArgs {
  scene_path: string;
  parent_path: string;
  node_type: string;
  node_name: string;
}

export interface AddNodeResult {
  added: boolean;
  message: string;
}

function validateRequired(obj: Record<string, unknown>, ...fields: string[]): void {
  for (const field of fields) {
    if (obj[field] === undefined || obj[field] === null) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
}

export async function addNode(args: AddNodeArgs, projectRoot: string, bridge: GodotBridge): Promise<AddNodeResult> {
  if (!bridge.isConnected) {
    return { added: false, message: 'add_node requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  validateRequired(args as unknown as Record<string, unknown>, 'scene_path', 'parent_path', 'node_type', 'node_name');
  await bridge.call('scene.open', { scene_path: args.scene_path } as Record<string, unknown>);
  await bridge.call('scene.add_node', { scene_path: args.scene_path, parent_path: args.parent_path, node_type: args.node_type, node_name: args.node_name } as Record<string, unknown>);
  return { added: true, message: 'Node added via Godot editor.' };
}

export interface RemoveNodeArgs {
  scene_path: string;
  node_path: string;
}

export interface RemoveNodeResult {
  removed: boolean;
  message: string;
}

export async function removeNode(args: RemoveNodeArgs, projectRoot: string, bridge: GodotBridge): Promise<RemoveNodeResult> {
  if (!bridge.isConnected) {
    return { removed: false, message: 'remove_node requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  validateRequired(args as unknown as Record<string, unknown>, 'scene_path', 'node_path');
  await bridge.call('scene.open', { scene_path: args.scene_path } as Record<string, unknown>);
  await bridge.call('scene.remove_node', { scene_path: args.scene_path, node_path: args.node_path } as Record<string, unknown>);
  await bridge.call('scene.save', { scene_path: args.scene_path } as Record<string, unknown>);
  return { removed: true, message: 'Node removed via Godot editor.' };
}

export interface UpdatePropertyArgs {
  scene_path: string;
  node_path: string;
  property: string;
  value: string;
}

export interface UpdatePropertyResult {
  updated: boolean;
  message: string;
}

export async function updateProperty(args: UpdatePropertyArgs, projectRoot: string, bridge: GodotBridge): Promise<UpdatePropertyResult> {
  if (!bridge.isConnected) {
    return { updated: false, message: 'update_property requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  validateRequired(args as unknown as Record<string, unknown>, 'scene_path', 'node_path', 'property', 'value');
  await bridge.call('scene.open', { scene_path: args.scene_path } as Record<string, unknown>);
  await bridge.call('scene.update_property', { scene_path: args.scene_path, node_path: args.node_path, property: args.property, value: args.value } as Record<string, unknown>);
  return { updated: true, message: 'Property updated via Godot editor.' };
}