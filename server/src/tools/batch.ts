import type { GodotBridge } from '../godot-bridge.js';

// =============================================================================
// find_nodes_by_type
// =============================================================================

export interface FindNodesByTypeArgs {
  scene_path?: string;
  node_type: string;
}

export interface FindNodesByTypeResult {
  nodes: string[];
  count: number;
  message: string;
}

export async function findNodesByType(args: FindNodesByTypeArgs, bridge: GodotBridge): Promise<FindNodesByTypeResult> {
  if (!bridge.isConnected) {
    return {
      nodes: [],
      count: 0,
      message: 'find_nodes_by_type requires Godot editor to be running with the Godot MCP plugin enabled.',
    };
  }
  const result = await bridge.call('batch.find_by_type', {
    scene_path: args.scene_path,
    node_type: args.node_type,
  }) as { nodes?: string[] };
  return {
    nodes: result?.nodes || [],
    count: (result?.nodes || []).length,
    message: `Found ${(result?.nodes || []).length} node(s) of type '${args.node_type}' via Godot editor.`,
  };
}

// =============================================================================
// find_signal_connections
// =============================================================================

export interface SignalConnectionInfo {
  source_node: string;
  signal_name: string;
  target_node: string;
  target_method: string;
}

export interface FindSignalConnectionsArgs {
  node_path: string;
  signal_name?: string;
}

export interface FindSignalConnectionsResult {
  connections: SignalConnectionInfo[];
  count: number;
  message: string;
}

export async function findSignalConnections(args: FindSignalConnectionsArgs, bridge: GodotBridge): Promise<FindSignalConnectionsResult> {
  if (!bridge.isConnected) {
    return {
      connections: [],
      count: 0,
      message: 'find_signal_connections requires Godot editor to be running with the Godot MCP plugin enabled.',
    };
  }
  const result = await bridge.call('batch.find_connections', {
    node_path: args.node_path,
    signal_name: args.signal_name,
  }) as { connections?: SignalConnectionInfo[] };
  return {
    connections: result?.connections || [],
    count: (result?.connections || []).length,
    message: `Found ${(result?.connections || []).length} signal connection(s) for node '${args.node_path}' via Godot editor.`,
  };
}

// =============================================================================
// batch_set_property
// =============================================================================

export interface BatchSetPropertyItem {
  node_path: string;
  property_name: string;
  value: unknown;
}

export interface BatchSetPropertyArgs {
  items: BatchSetPropertyItem[];
}

export interface BatchSetPropertyResult {
  success_count: number;
  failed_count: number;
  failed_items: { node_path: string; property_name: string; error?: string }[];
  message: string;
}

export async function batchSetProperty(args: BatchSetPropertyArgs, bridge: GodotBridge): Promise<BatchSetPropertyResult> {
  if (!bridge.isConnected) {
    return {
      success_count: 0,
      failed_count: args.items.length,
      failed_items: args.items.map(item => ({ node_path: item.node_path, property_name: item.property_name })),
      message: 'batch_set_property requires Godot editor to be running with the Godot MCP plugin enabled.',
    };
  }
  const result = await bridge.call('batch.set_property', {
    items: args.items,
  }) as { success_count?: number; failed_count?: number; failed_items?: { node_path: string; property_name: string; error?: string }[] };
  return {
    success_count: result?.success_count ?? 0,
    failed_count: result?.failed_count ?? 0,
    failed_items: result?.failed_items || [],
    message: `Batch set property: ${result?.success_count ?? 0} succeeded, ${result?.failed_count ?? 0} failed via Godot editor.`,
  };
}

// =============================================================================
// find_node_references
// =============================================================================

export interface NodeReferenceInfo {
  scene_path: string;
  node_path: string;
  reference_type: 'script' | 'scene' | 'variable' | 'signal';
}

export interface FindNodeReferencesArgs {
  node_path: string;
  include_children?: boolean;
}

export interface FindNodeReferencesResult {
  references: NodeReferenceInfo[];
  count: number;
  message: string;
}

export async function findNodeReferences(args: FindNodeReferencesArgs, bridge: GodotBridge): Promise<FindNodeReferencesResult> {
  if (!bridge.isConnected) {
    return {
      references: [],
      count: 0,
      message: 'find_node_references requires Godot editor to be running with the Godot MCP plugin enabled.',
    };
  }
  const result = await bridge.call('batch.find_node_refs', {
    node_path: args.node_path,
    include_children: args.include_children,
  }) as { references?: NodeReferenceInfo[] };
  return {
    references: result?.references || [],
    count: (result?.references || []).length,
    message: `Found ${(result?.references || []).length} reference(s) to node '${args.node_path}' via Godot editor.`,
  };
}

// =============================================================================
// get_scene_dependencies
// =============================================================================

export interface DependencyInfo {
  path: string;
  type: 'scene' | 'script' | 'resource' | 'other';
  is_external: boolean;
}

export interface GetSceneDependenciesArgs {
  scene_path: string;
}

export interface GetSceneDependenciesResult {
  dependencies: DependencyInfo[];
  count: number;
  message: string;
}

export async function getSceneDependencies(args: GetSceneDependenciesArgs, bridge: GodotBridge): Promise<GetSceneDependenciesResult> {
  if (!bridge.isConnected) {
    return {
      dependencies: [],
      count: 0,
      message: 'get_scene_dependencies requires Godot editor to be running with the Godot MCP plugin enabled.',
    };
  }
  const result = await bridge.call('batch.get_dependencies', {
    scene_path: args.scene_path,
  }) as { dependencies?: DependencyInfo[] };
  return {
    dependencies: result?.dependencies || [],
    count: (result?.dependencies || []).length,
    message: `Found ${(result?.dependencies || []).length} dependency/ies for scene '${args.scene_path}' via Godot editor.`,
  };
}

// =============================================================================
// cross_scene_set_property
// =============================================================================

export interface CrossSceneSetPropertyArgs {
  scene_paths: string[];
  node_name: string;
  property_name: string;
  value: unknown;
}

export interface CrossSceneSetPropertyResult {
  success_count: number;
  failed_count: number;
  failed_scenes: { scene_path: string; error?: string }[];
  message: string;
}

export async function crossSceneSetProperty(args: CrossSceneSetPropertyArgs, bridge: GodotBridge): Promise<CrossSceneSetPropertyResult> {
  if (!bridge.isConnected) {
    return {
      success_count: 0,
      failed_count: args.scene_paths.length,
      failed_scenes: args.scene_paths.map(scene_path => ({ scene_path })),
      message: 'cross_scene_set_property requires Godot editor to be running with the Godot MCP plugin enabled.',
    };
  }
  const result = await bridge.call('batch.cross_scene_set', {
    scene_paths: args.scene_paths,
    node_name: args.node_name,
    property_name: args.property_name,
    value: args.value,
  }) as { success_count?: number; failed_count?: number; failed_scenes?: { scene_path: string; error?: string }[] };
  return {
    success_count: result?.success_count ?? 0,
    failed_count: result?.failed_count ?? 0,
    failed_scenes: result?.failed_scenes || [],
    message: `Cross-scene set property: ${result?.success_count ?? 0} succeeded, ${result?.failed_count ?? 0} failed via Godot editor.`,
  };
}

// =============================================================================
// find_script_references
// =============================================================================

export interface ScriptReferenceInfo {
  scene_path: string;
  node_path: string;
  usage_type: 'script' | 'extends' | 'preload' | 'internal';
}

export interface FindScriptReferencesArgs {
  script_path: string;
}

export interface FindScriptReferencesResult {
  references: ScriptReferenceInfo[];
  count: number;
  message: string;
}

export async function findScriptReferences(args: FindScriptReferencesArgs, bridge: GodotBridge): Promise<FindScriptReferencesResult> {
  if (!bridge.isConnected) {
    return {
      references: [],
      count: 0,
      message: 'find_script_references requires Godot editor to be running with the Godot MCP plugin enabled.',
    };
  }
  const result = await bridge.call('batch.find_script_refs', {
    script_path: args.script_path,
  }) as { references?: ScriptReferenceInfo[] };
  return {
    references: result?.references || [],
    count: (result?.references || []).length,
    message: `Found ${(result?.references || []).length} reference(s) to script '${args.script_path}' via Godot editor.`,
  };
}

// =============================================================================
// detect_circular_dependencies
// =============================================================================

export interface CircularDependencyChain {
  chain: string[];
  length: number;
}

export interface DetectCircularDependenciesArgs {
  root_path?: string;
}

export interface DetectCircularDependenciesResult {
  cycles: CircularDependencyChain[];
  count: number;
  message: string;
}

export async function detectCircularDependencies(args: DetectCircularDependenciesArgs, bridge: GodotBridge): Promise<DetectCircularDependenciesResult> {
  if (!bridge.isConnected) {
    return {
      cycles: [],
      count: 0,
      message: 'detect_circular_dependencies requires Godot editor to be running with the Godot MCP plugin enabled.',
    };
  }
  const result = await bridge.call('batch.detect_cycles', {
    root_path: args.root_path,
  }) as { cycles?: CircularDependencyChain[] };
  return {
    cycles: result?.cycles || [],
    count: (result?.cycles || []).length,
    message: `Detected ${(result?.cycles || []).length} circular dependency/dependencies via Godot editor.`,
  };
}