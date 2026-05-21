import type { GodotBridge } from '../godot-bridge.js';

// =============================================================================
// get_performance_monitors
// =============================================================================

export interface GetPerformanceMonitorsArgs {
}

export interface GetPerformanceMonitorsResult {
  fps: number;
  memory_static: number;
  memory_static_max: number;
  memory_dynamic: number;
  memory_dynamic_global: number;
  node_count: number;
  object_count: number;
  orphan_object_count: number;
  orphan_node_count: number;
  resource_count: number;
  message: string;
}

export async function getPerformanceMonitors(args: GetPerformanceMonitorsArgs, bridge: GodotBridge): Promise<GetPerformanceMonitorsResult> {
  if (!bridge.isConnected) {
    return {
      fps: 0,
      memory_static: 0,
      memory_static_max: 0,
      memory_dynamic: 0,
      memory_dynamic_global: 0,
      node_count: 0,
      object_count: 0,
      orphan_object_count: 0,
      orphan_node_count: 0,
      resource_count: 0,
      message: 'get_performance_monitors requires Godot editor to be running with the Godot MCP plugin enabled.',
    };
  }
  const result = await bridge.call('profiling.get_monitors', {}) as {
    fps?: number;
    memory_static?: number;
    memory_static_max?: number;
    memory_dynamic?: number;
    memory_dynamic_global?: number;
    node_count?: number;
    object_count?: number;
    orphan_object_count?: number;
    orphan_node_count?: number;
    resource_count?: number;
  };
  return {
    fps: result?.fps ?? 0,
    memory_static: result?.memory_static ?? 0,
    memory_static_max: result?.memory_static_max ?? 0,
    memory_dynamic: result?.memory_dynamic ?? 0,
    memory_dynamic_global: result?.memory_dynamic_global ?? 0,
    node_count: result?.node_count ?? 0,
    object_count: result?.object_count ?? 0,
    orphan_object_count: result?.orphan_object_count ?? 0,
    orphan_node_count: result?.orphan_node_count ?? 0,
    resource_count: result?.resource_count ?? 0,
    message: 'Performance monitors retrieved via Godot editor.',
  };
}

// =============================================================================
// get_editor_performance
// =============================================================================

export interface GetEditorPerformanceArgs {
}

export interface GetEditorPerformanceResult {
  editor_fps: number;
  draw_calls: number;
  triangles_drawn: number;
  scene_nodes: number;
  script_instances: number;
  message: string;
}

export async function getEditorPerformance(args: GetEditorPerformanceArgs, bridge: GodotBridge): Promise<GetEditorPerformanceResult> {
  if (!bridge.isConnected) {
    return {
      editor_fps: 0,
      draw_calls: 0,
      triangles_drawn: 0,
      scene_nodes: 0,
      script_instances: 0,
      message: 'get_editor_performance requires Godot editor to be running with the Godot MCP plugin enabled.',
    };
  }
  const result = await bridge.call('profiling.get_editor_stats', {}) as {
    editor_fps?: number;
    draw_calls?: number;
    triangles_drawn?: number;
    scene_nodes?: number;
    script_instances?: number;
  };
  return {
    editor_fps: result?.editor_fps ?? 0,
    draw_calls: result?.draw_calls ?? 0,
    triangles_drawn: result?.triangles_drawn ?? 0,
    scene_nodes: result?.scene_nodes ?? 0,
    script_instances: result?.script_instances ?? 0,
    message: 'Editor performance stats retrieved via Godot editor.',
  };
}