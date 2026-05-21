import type { GodotBridge } from '../godot-bridge.js';

// =============================================================================
// add_mesh_instance
// =============================================================================

export interface AddMeshInstanceArgs {
  node_path: string;
  mesh_type: 'BoxMesh' | 'SphereMesh' | 'CylinderMesh' | 'CapsuleMesh' | 'PlaneMesh' | 'QuadMesh' | 'TorusMesh' | 'PrismMesh';
  position?: { x: number; y: number; z: number };
  size?: { x?: number; y?: number; z?: number };
  radius?: number;
  height?: number;
}

export interface AddMeshInstanceResult {
  created: boolean;
  node_path: string;
  message: string;
}

export async function addMeshInstance(args: AddMeshInstanceArgs, bridge: GodotBridge): Promise<AddMeshInstanceResult> {
  if (!bridge.isConnected) {
    return { created: false, node_path: '', message: 'add_mesh_instance requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  const result = await bridge.call('scene3d.add_mesh', {
    node_path: args.node_path,
    mesh_type: args.mesh_type,
    position: args.position,
    size: args.size,
    radius: args.radius,
    height: args.height,
  }) as { node_path?: string };
  return {
    created: true,
    node_path: result?.node_path || '',
    message: 'MeshInstance3D created via Godot editor.',
  };
}

// =============================================================================
// setup_camera_3d
// =============================================================================

export interface SetupCamera3DArgs {
  node_path: string;
  position?: { x: number; y: number; z: number };
  fov?: number;
  near_clip?: number;
  far_clip?: number;
  current?: boolean;
}

export interface SetupCamera3DResult {
  created: boolean;
  node_path: string;
  message: string;
}

export async function setupCamera3D(args: SetupCamera3DArgs, bridge: GodotBridge): Promise<SetupCamera3DResult> {
  if (!bridge.isConnected) {
    return { created: false, node_path: '', message: 'setup_camera_3d requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  const result = await bridge.call('scene3d.setup_camera', {
    node_path: args.node_path,
    position: args.position,
    fov: args.fov,
    near_clip: args.near_clip,
    far_clip: args.far_clip,
    current: args.current,
  }) as { node_path?: string };
  return {
    created: true,
    node_path: result?.node_path || '',
    message: 'Camera3D set up via Godot editor.',
  };
}

// =============================================================================
// setup_lighting
// =============================================================================

export interface SetupLightingArgs {
  node_path: string;
  light_type: 'OmniLight3D' | 'DirectionalLight3D' | 'SpotLight3D';
  position?: { x: number; y: number; z: number };
  rotation?: { x: number; y: number; z: number };
  color?: { r?: number; g?: number; b?: number };
  energy?: number;
  shadow_enabled?: boolean;
  omni_range?: number;
  omni_attenuation?: number;
  spot_angle?: number;
  spot_attenuation?: number;
}

export interface SetupLightingResult {
  created: boolean;
  node_path: string;
  message: string;
}

export async function setupLighting(args: SetupLightingArgs, bridge: GodotBridge): Promise<SetupLightingResult> {
  if (!bridge.isConnected) {
    return { created: false, node_path: '', message: 'setup_lighting requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  const result = await bridge.call('scene3d.setup_lighting', {
    node_path: args.node_path,
    light_type: args.light_type,
    position: args.position,
    rotation: args.rotation,
    color: args.color,
    energy: args.energy,
    shadow_enabled: args.shadow_enabled,
    omni_range: args.omni_range,
    omni_attenuation: args.omni_attenuation,
    spot_angle: args.spot_angle,
    spot_attenuation: args.spot_attenuation,
  }) as { node_path?: string };
  return {
    created: true,
    node_path: result?.node_path || '',
    message: 'Lighting set up via Godot editor.',
  };
}

// =============================================================================
// setup_environment
// =============================================================================

export interface SetupEnvironmentArgs {
  node_path: string;
  position?: { x: number; y: number; z: number };
  background_mode?: 'sky' | 'sun' | 'color' | 'blur' | 'solid_color' | 'clear';
  sky_contrast?: number;
  ambient_light_source?: 'sky' | 'color' | 'blend';
  ambient_color?: { r?: number; g?: number; b?: number };
  ambient_energy?: number;
  tonemap_mode?: number;
  glow_enabled?: boolean;
  glow_intensity?: number;
  glow_strength?: number;
  glow_bloom?: number;
}

export interface SetupEnvironmentResult {
  created: boolean;
  node_path: string;
  message: string;
}

export async function setupEnvironment(args: SetupEnvironmentArgs, bridge: GodotBridge): Promise<SetupEnvironmentResult> {
  if (!bridge.isConnected) {
    return { created: false, node_path: '', message: 'setup_environment requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  const result = await bridge.call('scene3d.setup_environment', {
    node_path: args.node_path,
    position: args.position,
    background_mode: args.background_mode,
    sky_contrast: args.sky_contrast,
    ambient_light_source: args.ambient_light_source,
    ambient_color: args.ambient_color,
    ambient_energy: args.ambient_energy,
    tonemap_mode: args.tonemap_mode,
    glow_enabled: args.glow_enabled,
    glow_intensity: args.glow_intensity,
    glow_strength: args.glow_strength,
    glow_bloom: args.glow_bloom,
  }) as { node_path?: string };
  return {
    created: true,
    node_path: result?.node_path || '',
    message: 'WorldEnvironment set up via Godot editor.',
  };
}

// =============================================================================
// add_gridmap
// =============================================================================

export interface AddGridMapArgs {
  node_path: string;
  position?: { x: number; y: number; z: number };
  tile_set_path?: string;
  cell_size?: number;
}

export interface AddGridMapResult {
  created: boolean;
  node_path: string;
  message: string;
}

export async function addGridMap(args: AddGridMapArgs, bridge: GodotBridge): Promise<AddGridMapResult> {
  if (!bridge.isConnected) {
    return { created: false, node_path: '', message: 'add_gridmap requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  const result = await bridge.call('scene3d.add_gridmap', {
    node_path: args.node_path,
    position: args.position,
    tile_set_path: args.tile_set_path,
    cell_size: args.cell_size,
  }) as { node_path?: string };
  return {
    created: true,
    node_path: result?.node_path || '',
    message: 'GridMap created via Godot editor.',
  };
}

// =============================================================================
// set_material_3d
// =============================================================================

export interface SetMaterial3DArgs {
  node_path: string;
  material_type?: 'standard' | 'on_top' | 'double_sided' | 'translucent' | 'premulti alpha' | 'unshaded';
  albedo_color?: { r?: number; g?: number; b?: number; a?: number };
  metallic?: number;
  roughness?: number;
  emission_color?: { r?: number; g?: number; b?: number };
  emission_energy?: number;
  uv_offset?: { x?: number; y?: number };
  uv_scale?: { x?: number; y?: number };
}

export interface SetMaterial3DResult {
  applied: boolean;
  message: string;
}

export async function setMaterial3D(args: SetMaterial3DArgs, bridge: GodotBridge): Promise<SetMaterial3DResult> {
  if (!bridge.isConnected) {
    return { applied: false, message: 'set_material_3d requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  await bridge.call('scene3d.set_material', {
    node_path: args.node_path,
    material_type: args.material_type,
    albedo_color: args.albedo_color,
    metallic: args.metallic,
    roughness: args.roughness,
    emission_color: args.emission_color,
    emission_energy: args.emission_energy,
    uv_offset: args.uv_offset,
    uv_scale: args.uv_scale,
  });
  return { applied: true, message: 'Material applied via Godot editor.' };
}