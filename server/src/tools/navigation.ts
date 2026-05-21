import type { GodotBridge } from '../godot-bridge.js';

// =============================================================================
// setup_navigation_region
// =============================================================================

export interface SetupNavigationRegionArgs {
  node_path: string;
  bounds_min_x: number;
  bounds_min_y: number;
  bounds_max_x: number;
  bounds_max_y: number;
}

export interface SetupNavigationRegionResult {
  created: boolean;
  message: string;
}

export async function setupNavigationRegion(args: SetupNavigationRegionArgs, bridge: GodotBridge): Promise<SetupNavigationRegionResult> {
  if (!bridge.isConnected) {
    return { created: false, message: 'setup_navigation_region requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  await bridge.call('navigation.setup_region', {
    node_path: args.node_path,
    bounds_min_x: args.bounds_min_x,
    bounds_min_y: args.bounds_min_y,
    bounds_max_x: args.bounds_max_x,
    bounds_max_y: args.bounds_max_y,
  });
  return { created: true, message: 'Navigation region created via Godot editor.' };
}

// =============================================================================
// setup_navigation_agent
// =============================================================================

export interface SetupNavigationAgentArgs {
  node_path: string;
  agent_type?: string;
  radius?: number;
  height?: number;
  max_speed?: number;
  target_desired_distance?: number;
}

export interface SetupNavigationAgentResult {
  created: boolean;
  message: string;
}

export async function setupNavigationAgent(args: SetupNavigationAgentArgs, bridge: GodotBridge): Promise<SetupNavigationAgentResult> {
  if (!bridge.isConnected) {
    return { created: false, message: 'setup_navigation_agent requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  await bridge.call('navigation.setup_agent', {
    node_path: args.node_path,
    agent_type: args.agent_type,
    radius: args.radius,
    height: args.height,
    max_speed: args.max_speed,
    target_desired_distance: args.target_desired_distance,
  });
  return { created: true, message: 'Navigation agent created via Godot editor.' };
}

// =============================================================================
// bake_navigation_mesh
// =============================================================================

export interface BakeNavigationMeshArgs {
  node_path: string;
}

export interface BakeNavigationMeshResult {
  baked: boolean;
  message: string;
}

export async function bakeNavigationMesh(args: BakeNavigationMeshArgs, bridge: GodotBridge): Promise<BakeNavigationMeshResult> {
  if (!bridge.isConnected) {
    return { baked: false, message: 'bake_navigation_mesh requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  await bridge.call('navigation.bake_mesh', {
    node_path: args.node_path,
  });
  return { baked: true, message: 'Navigation mesh baked via Godot editor.' };
}

// =============================================================================
// set_navigation_layers
// =============================================================================

export interface SetNavigationLayersArgs {
  node_path: string;
  navigation_layer?: number;
  avoidance_layer?: number;
}

export interface SetNavigationLayersResult {
  success: boolean;
  message: string;
}

export async function setNavigationLayers(args: SetNavigationLayersArgs, bridge: GodotBridge): Promise<SetNavigationLayersResult> {
  if (!bridge.isConnected) {
    return { success: false, message: 'set_navigation_layers requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  await bridge.call('navigation.set_layers', {
    node_path: args.node_path,
    navigation_layer: args.navigation_layer,
    avoidance_layer: args.avoidance_layer,
  });
  return { success: true, message: 'Navigation layers set via Godot editor.' };
}

// =============================================================================
// get_navigation_info
// =============================================================================

export interface GetNavigationInfoArgs {
  node_path: string;
}

export interface NavigationRegionInfo {
  bounds: {
    min_x: number;
    min_y: number;
    max_x: number;
    max_y: number;
  };
  cell_size: number;
  layers: number;
}

export interface NavigationAgentInfo {
  agent_type: string;
  radius: number;
  height: number;
  max_speed: number;
  target_desired_distance: number;
  navigation_layers: number;
  avoidance_layers: number;
}

export interface GetNavigationInfoResult {
  is_region: boolean;
  is_agent: boolean;
  region_info?: NavigationRegionInfo;
  agent_info?: NavigationAgentInfo;
  message: string;
}

export async function getNavigationInfo(args: GetNavigationInfoArgs, bridge: GodotBridge): Promise<GetNavigationInfoResult> {
  if (!bridge.isConnected) {
    return { is_region: false, is_agent: false, message: 'get_navigation_info requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  const result = await bridge.call('navigation.get_info', {
    node_path: args.node_path,
  }) as {
    is_region?: boolean;
    is_agent?: boolean;
    region_info?: NavigationRegionInfo;
    agent_info?: NavigationAgentInfo;
  };
  return {
    is_region: result?.is_region ?? false,
    is_agent: result?.is_agent ?? false,
    region_info: result?.region_info,
    agent_info: result?.agent_info,
    message: 'Navigation info retrieved via Godot editor.',
  };
}

// =============================================================================
// get_navigation_path
// =============================================================================

export interface GetNavigationPathArgs {
  node_path: string;
  target_x: number;
  target_y: number;
  optimize_path?: boolean;
}

export interface NavigationPathPoint {
  x: number;
  y: number;
}

export interface GetNavigationPathResult {
  path: NavigationPathPoint[];
  path_size: number;
  message: string;
}

export async function getNavigationPath(args: GetNavigationPathArgs, bridge: GodotBridge): Promise<GetNavigationPathResult> {
  if (!bridge.isConnected) {
    return { path: [], path_size: 0, message: 'get_navigation_path requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  const result = await bridge.call('navigation.get_path', {
    node_path: args.node_path,
    target_x: args.target_x,
    target_y: args.target_y,
    optimize_path: args.optimize_path,
  }) as { path?: NavigationPathPoint[]; path_size?: number };
  return {
    path: result?.path || [],
    path_size: result?.path_size ?? 0,
    message: 'Navigation path retrieved via Godot editor.',
  };
}