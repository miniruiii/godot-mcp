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
  offline: boolean;
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
    return { added: false, offline: true, message: 'add_node requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  validateRequired(args as unknown as Record<string, unknown>, 'scene_path', 'parent_path', 'node_type', 'node_name');
  await bridge.call('scene.open', { scene_path: args.scene_path } as Record<string, unknown>);
  await bridge.call('scene.add_node', { scene_path: args.scene_path, parent_path: args.parent_path, node_type: args.node_type, node_name: args.node_name } as Record<string, unknown>);
  return { added: true, offline: false, message: 'Node added via Godot editor.' };
}

export interface RemoveNodeArgs {
  scene_path: string;
  node_path: string;
}

export interface RemoveNodeResult {
  removed: boolean;
  offline: boolean;
  message: string;
}

export async function removeNode(args: RemoveNodeArgs, projectRoot: string, bridge: GodotBridge): Promise<RemoveNodeResult> {
  if (!bridge.isConnected) {
    return { removed: false, offline: true, message: 'remove_node requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  validateRequired(args as unknown as Record<string, unknown>, 'scene_path', 'node_path');
  await bridge.call('scene.open', { scene_path: args.scene_path } as Record<string, unknown>);
  await bridge.call('scene.remove_node', { scene_path: args.scene_path, node_path: args.node_path } as Record<string, unknown>);
  await bridge.call('scene.save', { scene_path: args.scene_path } as Record<string, unknown>);
  return { removed: true, offline: false, message: 'Node removed via Godot editor.' };
}

export interface UpdatePropertyArgs {
  scene_path: string;
  node_path: string;
  property: string;
  value: string;
}

export interface UpdatePropertyResult {
  updated: boolean;
  offline: boolean;
  message: string;
}

export async function updateProperty(args: UpdatePropertyArgs, projectRoot: string, bridge: GodotBridge): Promise<UpdatePropertyResult> {
  if (!bridge.isConnected) {
    return { updated: false, offline: true, message: 'update_property requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  validateRequired(args as unknown as Record<string, unknown>, 'scene_path', 'node_path', 'property', 'value');
  await bridge.call('scene.open', { scene_path: args.scene_path } as Record<string, unknown>);
  await bridge.call('scene.update_property', { scene_path: args.scene_path, node_path: args.node_path, property: args.property, value: args.value } as Record<string, unknown>);
  return { updated: true, offline: false, message: 'Property updated via Godot editor.' };
}

export interface DuplicateNodeArgs {
  scene_path: string;
  node_path: string;
  new_name: string;
}

export interface DuplicateNodeResult {
  duplicated: boolean;
  message: string;
}

export async function duplicateNode(args: DuplicateNodeArgs, projectRoot: string, bridge: GodotBridge): Promise<DuplicateNodeResult> {
  if (!bridge.isConnected) {
    return { duplicated: false, message: 'duplicate_node requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  validateRequired(args as unknown as Record<string, unknown>, 'scene_path', 'node_path', 'new_name');
  await bridge.call('scene.open', { scene_path: args.scene_path } as Record<string, unknown>);
  await bridge.call('node.duplicate', { node_path: args.node_path, new_name: args.new_name } as Record<string, unknown>);
  return { duplicated: true, message: 'Node duplicated via Godot editor.' };
}

export interface MoveNodeArgs {
  scene_path: string;
  node_path: string;
  new_parent_path: string;
}

export interface MoveNodeResult {
  moved: boolean;
  message: string;
}

export async function moveNode(args: MoveNodeArgs, projectRoot: string, bridge: GodotBridge): Promise<MoveNodeResult> {
  if (!bridge.isConnected) {
    return { moved: false, message: 'move_node requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  validateRequired(args as unknown as Record<string, unknown>, 'scene_path', 'node_path', 'new_parent_path');
  await bridge.call('scene.open', { scene_path: args.scene_path } as Record<string, unknown>);
  await bridge.call('node.move', { node_path: args.node_path, new_parent_path: args.new_parent_path } as Record<string, unknown>);
  return { moved: true, message: 'Node moved via Godot editor.' };
}

export interface ConnectSignalArgs {
  scene_path: string;
  node_path: string;
  signal: string;
  target_path: string;
  method: string;
}

export interface ConnectSignalResult {
  connected: boolean;
  message: string;
}

export async function connectSignal(args: ConnectSignalArgs, projectRoot: string, bridge: GodotBridge): Promise<ConnectSignalResult> {
  if (!bridge.isConnected) {
    return { connected: false, message: 'connect_signal requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  validateRequired(args as unknown as Record<string, unknown>, 'scene_path', 'node_path', 'signal', 'target_path', 'method');
  await bridge.call('node.connect_signal', { node_path: args.node_path, signal: args.signal, target_path: args.target_path, method: args.method } as Record<string, unknown>);
  return { connected: true, message: 'Signal connected via Godot editor.' };
}

export interface DisconnectSignalArgs {
  scene_path: string;
  node_path: string;
  signal: string;
  target_path: string;
  method: string;
}

export interface DisconnectSignalResult {
  disconnected: boolean;
  message: string;
}

export async function disconnectSignal(args: DisconnectSignalArgs, projectRoot: string, bridge: GodotBridge): Promise<DisconnectSignalResult> {
  if (!bridge.isConnected) {
    return { disconnected: false, message: 'disconnect_signal requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  validateRequired(args as unknown as Record<string, unknown>, 'scene_path', 'node_path', 'signal', 'target_path', 'method');
  await bridge.call('node.disconnect_signal', { node_path: args.node_path, signal: args.signal, target_path: args.target_path, method: args.method } as Record<string, unknown>);
  return { disconnected: true, message: 'Signal disconnected via Godot editor.' };
}

export interface GetNodeGroupsArgs {
  scene_path: string;
  node_path: string;
}

export interface GetNodeGroupsResult {
  groups: string[];
}

export async function getNodeGroups(args: GetNodeGroupsArgs, projectRoot: string, bridge: GodotBridge): Promise<GetNodeGroupsResult> {
  if (!bridge.isConnected) {
    return { groups: [] };
  }
  validateRequired(args as unknown as Record<string, unknown>, 'scene_path', 'node_path');
  const result = await bridge.call('node.get_groups', { node_path: args.node_path } as Record<string, unknown>);
  return { groups: (result as string[]) || [] };
}

export interface SetNodeGroupsArgs {
  scene_path: string;
  node_path: string;
  add_to_groups?: string[];
  remove_from_groups?: string[];
}

export interface SetNodeGroupsResult {
  success: boolean;
  message: string;
}

export async function setNodeGroups(args: SetNodeGroupsArgs, projectRoot: string, bridge: GodotBridge): Promise<SetNodeGroupsResult> {
  if (!bridge.isConnected) {
    return { success: false, message: 'set_node_groups requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  validateRequired(args as unknown as Record<string, unknown>, 'scene_path', 'node_path');
  await bridge.call('node.set_groups', { node_path: args.node_path, add_to_groups: args.add_to_groups, remove_from_groups: args.remove_from_groups } as Record<string, unknown>);
  return { success: true, message: 'Node groups updated via Godot editor.' };
}

export interface FindNodesInGroupArgs {
  group: string;
}

export interface FindNodesInGroupResult {
  node_paths: string[];
}

export async function findNodesInGroup(args: FindNodesInGroupArgs, projectRoot: string, bridge: GodotBridge): Promise<FindNodesInGroupResult> {
  if (!bridge.isConnected) {
    return { node_paths: [] };
  }
  validateRequired(args as unknown as Record<string, unknown>, 'group');
  const result = await bridge.call('node.find_in_group', { group: args.group } as Record<string, unknown>);
  return { node_paths: (result as string[]) || [] };
}

export interface RenameNodeArgs {
  scene_path: string;
  node_path: string;
  new_name: string;
}

export interface RenameNodeResult {
  renamed: boolean;
  message: string;
}

export async function renameNode(args: RenameNodeArgs, projectRoot: string, bridge: GodotBridge): Promise<RenameNodeResult> {
  if (!bridge.isConnected) {
    return { renamed: false, message: 'rename_node requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  validateRequired(args as unknown as Record<string, unknown>, 'scene_path', 'node_path', 'new_name');
  await bridge.call('scene.open', { scene_path: args.scene_path } as Record<string, unknown>);
  await bridge.call('node.rename', { node_path: args.node_path, new_name: args.new_name } as Record<string, unknown>);
  return { renamed: true, message: 'Node renamed via Godot editor.' };
}