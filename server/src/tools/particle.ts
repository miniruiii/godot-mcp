import type { GodotBridge } from '../godot-bridge.js';

// =============================================================================
// create_particles
// =============================================================================

export interface CreateParticlesArgs {
  node_path: string;
  type: 'GPUParticles2D' | 'GPUParticles3D';
  position?: { x: number; y: number; z?: number };
  amount?: number;
  lifetime?: number;
  explosiveness?: number;
  visibility_aabb?: { min_x: number; min_y: number; min_z?: number; max_x: number; max_y: number; max_z?: number };
}

export interface CreateParticlesResult {
  created: boolean;
  node_path: string;
  message: string;
}

export async function createParticles(args: CreateParticlesArgs, bridge: GodotBridge): Promise<CreateParticlesResult> {
  if (!bridge.isConnected) {
    return { created: false, node_path: '', message: 'create_particles requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  const result = await bridge.call('particle.create', {
    node_path: args.node_path,
    type: args.type,
    position: args.position,
    amount: args.amount,
    lifetime: args.lifetime,
    explosiveness: args.explosiveness,
    visibility_aabb: args.visibility_aabb,
  }) as { node_path?: string };
  return {
    created: true,
    node_path: result?.node_path || '',
    message: `${args.type} node created via Godot editor.`,
  };
}

// =============================================================================
// set_particle_material
// =============================================================================

export interface SetParticleMaterialArgs {
  node_path: string;
  process_material?: {
    type: 'ParticleProcessMaterial' | 'ShaderMaterial';
    spread?: number;
    flatness?: number;
    gravity?: { x: number; y: number; z?: number };
    initial_velocity_min?: number;
    initial_velocity_max?: number;
    angular_velocity_min?: number;
    angular_velocity_max?: number;
    linear_accel_min?: number;
    linear_accel_max?: number;
    radial_accel_min?: number;
    radial_accel_max?: number;
    tangential_accel_min?: number;
    tangential_accel_max?: number;
    damping_min?: number;
    damping_max?: number;
    scale_min?: number;
    scale_max?: number;
    hue_variation_min?: number;
    hue_variation_max?: number;
    anim_speed_min?: number;
    anim_speed_max?: number;
    anim_offset_min?: number;
    anim_offset_max?: number;
  };
  draw_passes?: Array<{
    index: number;
    resource_path?: string;
  }>;
  trail_enabled?: boolean;
  trail_size_min?: number;
  trail_size_max?: number;
  trail_lifetime_min?: number;
  trail_lifetime_max?: number;
}

export interface SetParticleMaterialResult {
  success: boolean;
  message: string;
}

export async function setParticleMaterial(args: SetParticleMaterialArgs, bridge: GodotBridge): Promise<SetParticleMaterialResult> {
  if (!bridge.isConnected) {
    return { success: false, message: 'set_particle_material requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  await bridge.call('particle.set_material', {
    node_path: args.node_path,
    process_material: args.process_material,
    draw_passes: args.draw_passes,
    trail_enabled: args.trail_enabled,
    trail_size_min: args.trail_size_min,
    trail_size_max: args.trail_size_max,
    trail_lifetime_min: args.trail_lifetime_min,
    trail_lifetime_max: args.trail_lifetime_max,
  });
  return { success: true, message: 'Particle material set via Godot editor.' };
}

// =============================================================================
// set_particle_color_gradient
// =============================================================================

export interface SetParticleColorGradientArgs {
  node_path: string;
  gradient_type: 'Gradient' | 'GradientTexture1D';
  color_points?: Array<{
    offset: number;
    color: { r: number; g: number; b: number; a?: number };
  }>;
  texture_path?: string;
}

export interface SetParticleColorGradientResult {
  success: boolean;
  message: string;
}

export async function setParticleColorGradient(args: SetParticleColorGradientArgs, bridge: GodotBridge): Promise<SetParticleColorGradientResult> {
  if (!bridge.isConnected) {
    return { success: false, message: 'set_particle_color_gradient requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  await bridge.call('particle.set_color_gradient', {
    node_path: args.node_path,
    gradient_type: args.gradient_type,
    color_points: args.color_points,
    texture_path: args.texture_path,
  });
  return { success: true, message: 'Particle color gradient set via Godot editor.' };
}

// =============================================================================
// apply_particle_preset
// =============================================================================

export interface ApplyParticlePresetArgs {
  node_path: string;
  preset: 'explosion' | 'rain' | 'snow' | 'smoke' | 'fire' | 'sparkle' | 'confetti' | 'dust' | 'magic' | 'custom';
  custom_params?: {
    particle_count?: number;
    speed_min?: number;
    speed_max?: number;
    spread?: number;
    lifetime?: number;
    gravity?: { x: number; y: number; z?: number };
    color_start?: { r: number; g: number; b: number; a?: number };
    color_end?: { r: number; g: number; b: number; a?: number };
  };
}

export interface ApplyParticlePresetResult {
  success: boolean;
  message: string;
}

export async function applyParticlePreset(args: ApplyParticlePresetArgs, bridge: GodotBridge): Promise<ApplyParticlePresetResult> {
  if (!bridge.isConnected) {
    return { success: false, message: 'apply_particle_preset requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  await bridge.call('particle.apply_preset', {
    node_path: args.node_path,
    preset: args.preset,
    custom_params: args.custom_params,
  });
  return { success: true, message: `Particle preset '${args.preset}' applied via Godot editor.` };
}

// =============================================================================
// get_particle_info
// =============================================================================

export interface GetParticleInfoArgs {
  node_path: string;
}

export interface ParticleProcessMaterialInfo {
  type: string;
  spread: number;
  flatness: number;
  gravity: { x: number; y: number; z?: number };
  initial_velocity_min: number;
  initial_velocity_max: number;
  angular_velocity_min: number;
  angular_velocity_max: number;
  linear_accel_min: number;
  linear_accel_max: number;
  radial_accel_min: number;
  radial_accel_max: number;
  tangential_accel_min: number;
  tangential_accel_max: number;
  damping_min: number;
  damping_max: number;
  scale_min: number;
  scale_max: number;
  hue_variation_min: number;
  hue_variation_max: number;
  anim_speed_min: number;
  anim_speed_max: number;
  anim_offset_min: number;
  anim_offset_max: number;
}

export interface ParticleDrawPassInfo {
  index: number;
  resource_path: string;
}

export interface ParticleTrailInfo {
  enabled: boolean;
  size_min: number;
  size_max: number;
  lifetime_min: number;
  lifetime_max: number;
}

export interface GradientInfo {
  type: string;
  color_points: Array<{ offset: number; color: { r: number; g: number; b: number; a: number } }>;
  texture_path?: string;
}

export interface GetParticleInfoResult {
  node_type: string;
  amount: number;
  lifetime: number;
  explosiveness: number;
  visibility_aabb?: { min_x: number; min_y: number; min_z?: number; max_x: number; max_y: number; max_z?: number };
  process_material?: ParticleProcessMaterialInfo;
  draw_passes: ParticleDrawPassInfo[];
  trail: ParticleTrailInfo;
  gradient?: GradientInfo;
  message: string;
}

export async function getParticleInfo(args: GetParticleInfoArgs, bridge: GodotBridge): Promise<GetParticleInfoResult> {
  if (!bridge.isConnected) {
    return {
      node_type: '',
      amount: 0,
      lifetime: 0,
      explosiveness: 0,
      draw_passes: [],
      trail: { enabled: false, size_min: 0, size_max: 0, lifetime_min: 0, lifetime_max: 0 },
      message: 'get_particle_info requires Godot editor to be running with the Godot MCP plugin enabled.',
    };
  }
  const result = await bridge.call('particle.get_info', {
    node_path: args.node_path,
  }) as {
    node_type?: string;
    amount?: number;
    lifetime?: number;
    explosiveness?: number;
    visibility_aabb?: { min_x: number; min_y: number; min_z?: number; max_x: number; max_y: number; max_z?: number };
    process_material?: ParticleProcessMaterialInfo;
    draw_passes?: ParticleDrawPassInfo[];
    trail?: ParticleTrailInfo;
    gradient?: GradientInfo;
  };
  return {
    node_type: result?.node_type || '',
    amount: result?.amount ?? 0,
    lifetime: result?.lifetime ?? 0,
    explosiveness: result?.explosiveness ?? 0,
    visibility_aabb: result?.visibility_aabb,
    process_material: result?.process_material,
    draw_passes: result?.draw_passes || [],
    trail: result?.trail || { enabled: false, size_min: 0, size_max: 0, lifetime_min: 0, lifetime_max: 0 },
    gradient: result?.gradient,
    message: 'Particle info retrieved via Godot editor.',
  };
}