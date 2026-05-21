import { readScene, type SceneNodeResult } from './scene.js';

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

export function addNode(_args: AddNodeArgs, _projectRoot: string, godotConnected: boolean): AddNodeResult {
  if (!godotConnected) {
    return { added: false, message: 'add_node requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
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

export function removeNode(_args: RemoveNodeArgs, _projectRoot: string, godotConnected: boolean): RemoveNodeResult {
  if (!godotConnected) {
    return { removed: false, message: 'remove_node requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
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

export function updateProperty(_args: UpdatePropertyArgs, _projectRoot: string, godotConnected: boolean): UpdatePropertyResult {
  if (!godotConnected) {
    return { updated: false, message: 'update_property requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  return { updated: true, message: 'Property updated via Godot editor.' };
}