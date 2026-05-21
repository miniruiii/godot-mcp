import type { GodotBridge } from '../godot-bridge.js';

// =============================================================================
// analyze_scene_complexity
// =============================================================================

export interface AnalyzeSceneComplexityArgs {
  scene_path: string;
}

export interface ComplexityMetric {
  node_count: number;
  script_count: number;
  resource_count: number;
  nested_scene_count: number;
  animation_track_count: number;
  signal_connection_count: number;
}

export interface AnalyzeSceneComplexityResult {
  scene_path: string;
  metrics: ComplexityMetric;
  complexity_score: number;
  warnings: string[];
  message: string;
}

export async function analyzeSceneComplexity(args: AnalyzeSceneComplexityArgs, bridge: GodotBridge): Promise<AnalyzeSceneComplexityResult> {
  if (!bridge.isConnected) {
    return {
      scene_path: args.scene_path,
      metrics: {
        node_count: 0,
        script_count: 0,
        resource_count: 0,
        nested_scene_count: 0,
        animation_track_count: 0,
        signal_connection_count: 0,
      },
      complexity_score: 0,
      warnings: ['analyze_scene_complexity requires Godot editor to be running with the Godot MCP plugin enabled.'],
      message: 'Offline mode: complexity analysis unavailable.',
    };
  }
  const result = await bridge.call('analysis.complexity', {
    scene_path: args.scene_path,
  }) as {
    node_count?: number;
    script_count?: number;
    resource_count?: number;
    nested_scene_count?: number;
    animation_track_count?: number;
    signal_connection_count?: number;
    complexity_score?: number;
    warnings?: string[];
  };
  return {
    scene_path: args.scene_path,
    metrics: {
      node_count: result?.node_count ?? 0,
      script_count: result?.script_count ?? 0,
      resource_count: result?.resource_count ?? 0,
      nested_scene_count: result?.nested_scene_count ?? 0,
      animation_track_count: result?.animation_track_count ?? 0,
      signal_connection_count: result?.signal_connection_count ?? 0,
    },
    complexity_score: result?.complexity_score ?? 0,
    warnings: result?.warnings ?? [],
    message: `Scene complexity analysis complete for '${args.scene_path}'.`,
  };
}

// =============================================================================
// analyze_signal_flow
// =============================================================================

export interface SignalConnection {
  source_node: string;
  source_signal: string;
  target_node: string;
  target_method: string;
  binds?: string[];
}

export interface AnalyzeSignalFlowArgs {
  scene_path?: string;
  root_path?: string;
}

export interface AnalyzeSignalFlowResult {
  connections: SignalConnection[];
  orphan_signals: string[];
  circular_dependencies: string[];
  message: string;
}

export async function analyzeSignalFlow(args: AnalyzeSignalFlowArgs, bridge: GodotBridge): Promise<AnalyzeSignalFlowResult> {
  if (!bridge.isConnected) {
    return {
      connections: [],
      orphan_signals: [],
      circular_dependencies: [],
      message: 'analyze_signal_flow requires Godot editor to be running with the Godot MCP plugin enabled.',
    };
  }
  const result = await bridge.call('analysis.signal_flow', {
    scene_path: args.scene_path,
    root_path: args.root_path,
  }) as {
    connections?: SignalConnection[];
    orphan_signals?: string[];
    circular_dependencies?: string[];
  };
  return {
    connections: result?.connections ?? [],
    orphan_signals: result?.orphan_signals ?? [],
    circular_dependencies: result?.circular_dependencies ?? [],
    message: 'Signal flow analysis complete.',
  };
}

// =============================================================================
// find_unused_resources
// =============================================================================

export interface UnusedResource {
  resource_path: string;
  resource_type: string;
  file_size?: number;
}

export interface FindUnusedResourcesArgs {
  resource_types?: string[];
  search_path?: string;
}

export interface FindUnusedResourcesResult {
  unused_resources: UnusedResource[];
  total_count: number;
  message: string;
}

export async function findUnusedResources(args: FindUnusedResourcesArgs, bridge: GodotBridge): Promise<FindUnusedResourcesResult> {
  if (!bridge.isConnected) {
    return {
      unused_resources: [],
      total_count: 0,
      message: 'find_unused_resources requires Godot editor to be running with the Godot MCP plugin enabled.',
    };
  }
  const result = await bridge.call('analysis.unused_resources', {
    resource_types: args.resource_types,
    search_path: args.search_path,
  }) as {
    unused_resources?: UnusedResource[];
    total_count?: number;
  };
  return {
    unused_resources: result?.unused_resources ?? [],
    total_count: result?.total_count ?? 0,
    message: `Found ${result?.total_count ?? 0} unused resources.`,
  };
}

// =============================================================================
// get_project_statistics
// =============================================================================

export interface ProjectStatistics {
  total_scenes: number;
  total_scripts: number;
  total_resources: number;
  total_nodes: number;
  scene_distribution: Record<string, number>;
  script_language_distribution: Record<string, number>;
}

export interface GetProjectStatisticsArgs {
  include_scripts?: boolean;
  include_resources?: boolean;
}

export interface GetProjectStatisticsResult {
  statistics: ProjectStatistics;
  message: string;
}

export async function getProjectStatistics(args: GetProjectStatisticsArgs, bridge: GodotBridge): Promise<GetProjectStatisticsResult> {
  if (!bridge.isConnected) {
    return {
      statistics: {
        total_scenes: 0,
        total_scripts: 0,
        total_resources: 0,
        total_nodes: 0,
        scene_distribution: {},
        script_language_distribution: {},
      },
      message: 'get_project_statistics requires Godot editor to be running with the Godot MCP plugin enabled.',
    };
  }
  const result = await bridge.call('analysis.project_stats', {
    include_scripts: args.include_scripts ?? true,
    include_resources: args.include_resources ?? true,
  }) as {
    total_scenes?: number;
    total_scripts?: number;
    total_resources?: number;
    total_nodes?: number;
    scene_distribution?: Record<string, number>;
    script_language_distribution?: Record<string, number>;
  };
  return {
    statistics: {
      total_scenes: result?.total_scenes ?? 0,
      total_scripts: result?.total_scripts ?? 0,
      total_resources: result?.total_resources ?? 0,
      total_nodes: result?.total_nodes ?? 0,
      scene_distribution: result?.scene_distribution ?? {},
      script_language_distribution: result?.script_language_distribution ?? {},
    },
    message: 'Project statistics retrieved.',
  };
}