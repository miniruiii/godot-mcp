import type { GodotBridge } from '../godot-bridge.js';

// =============================================================================
// setupPhysicsBody
// =============================================================================

export interface SetupPhysicsBodyArgs {
  node_path: string;
  body_type: 'StaticBody2D' | 'RigidBody2D' | 'CharacterBody2D' | 'StaticBody3D' | 'RigidBody3D' | 'CharacterBody3D';
  position?: { x: number; y: number; z?: number };
}

export interface SetupPhysicsBodyResult {
  created: boolean;
  message: string;
}

export async function setupPhysicsBody(args: SetupPhysicsBodyArgs, bridge: GodotBridge): Promise<SetupPhysicsBodyResult> {
  if (!bridge.isConnected) {
    return { created: false, message: 'setup_physics_body requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  await bridge.call('physics.setup_body', {
    node_path: args.node_path,
    body_type: args.body_type,
    position: args.position,
  });
  return { created: true, message: 'Physics body created via Godot editor.' };
}

// =============================================================================
// setupCollision
// =============================================================================

export interface SetupCollisionArgs {
  node_path: string;
  shape_type: 'CircleShape2D' | 'RectangleShape2D' | 'CapsuleShape2D' | 'PolygonShape2D' | 'BoxShape3D' | 'SphereShape3D' | 'CapsuleShape3D';
  size?: { x: number; y: number; z?: number };
  radius?: number;
  height?: number;
}

export interface SetupCollisionResult {
  success: boolean;
  message: string;
}

export async function setupCollision(args: SetupCollisionArgs, bridge: GodotBridge): Promise<SetupCollisionResult> {
  if (!bridge.isConnected) {
    return { success: false, message: 'setup_collision requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  await bridge.call('physics.setup_collision', {
    node_path: args.node_path,
    shape_type: args.shape_type,
    size: args.size,
    radius: args.radius,
    height: args.height,
  });
  return { success: true, message: 'Collision shape set up via Godot editor.' };
}

// =============================================================================
// setPhysicsLayers
// =============================================================================

export interface SetPhysicsLayersArgs {
  node_path: string;
  layer?: number;
  mask?: number;
}

export interface SetPhysicsLayersResult {
  success: boolean;
  message: string;
}

export async function setPhysicsLayers(args: SetPhysicsLayersArgs, bridge: GodotBridge): Promise<SetPhysicsLayersResult> {
  if (!bridge.isConnected) {
    return { success: false, message: 'set_physics_layers requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  await bridge.call('physics.set_layers', {
    node_path: args.node_path,
    layer: args.layer,
    mask: args.mask,
  });
  return { success: true, message: 'Physics layers set via Godot editor.' };
}

// =============================================================================
// getPhysicsLayers
// =============================================================================

export interface GetPhysicsLayersArgs {
  node_path: string;
}

export interface PhysicsLayerInfo {
  layer: number;
  mask: number;
}

export interface GetPhysicsLayersResult {
  layer: number;
  mask: number;
  message: string;
}

export async function getPhysicsLayers(args: GetPhysicsLayersArgs, bridge: GodotBridge): Promise<GetPhysicsLayersResult> {
  if (!bridge.isConnected) {
    return { layer: 0, mask: 0, message: 'get_physics_layers requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  const result = await bridge.call('physics.get_layers', {
    node_path: args.node_path,
  }) as { layer?: number; mask?: number };
  return {
    layer: result?.layer ?? 0,
    mask: result?.mask ?? 0,
    message: 'Physics layers retrieved via Godot editor.',
  };
}

// =============================================================================
// getCollisionInfo
// =============================================================================

export interface GetCollisionInfoArgs {
  node_path: string;
}

export interface CollisionShapeInfo {
  shape_type: string;
  size?: { x: number; y: number; z?: number };
  radius?: number;
  height?: number;
}

export interface GetCollisionInfoResult {
  shape_info: CollisionShapeInfo;
  layer: number;
  mask: number;
  message: string;
}

export async function getCollisionInfo(args: GetCollisionInfoArgs, bridge: GodotBridge): Promise<GetCollisionInfoResult> {
  if (!bridge.isConnected) {
    return {
      shape_info: { shape_type: '' },
      layer: 0,
      mask: 0,
      message: 'get_collision_info requires Godot editor to be running with the Godot MCP plugin enabled.',
    };
  }
  const result = await bridge.call('physics.get_collision_info', {
    node_path: args.node_path,
  }) as {
    shape_type?: string;
    size?: { x: number; y: number; z?: number };
    radius?: number;
    height?: number;
    layer?: number;
    mask?: number;
  };
  return {
    shape_info: {
      shape_type: result?.shape_type || '',
      size: result?.size,
      radius: result?.radius,
      height: result?.height,
    },
    layer: result?.layer ?? 0,
    mask: result?.mask ?? 0,
    message: 'Collision info retrieved via Godot editor.',
  };
}

// =============================================================================
// addRaycast
// =============================================================================

export interface AddRaycastArgs {
  node_path: string;
  name?: string;
  target_position?: { x: number; y: number; z?: number };
  cast_to?: { x: number; y: number; z?: number };
  enabled?: boolean;
  collide_with_bodies?: boolean;
  collide_with_areas?: boolean;
}

export interface AddRaycastResult {
  created: boolean;
  node_path: string;
  message: string;
}

export async function addRaycast(args: AddRaycastArgs, bridge: GodotBridge): Promise<AddRaycastResult> {
  if (!bridge.isConnected) {
    return { created: false, node_path: '', message: 'add_raycast requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  const result = await bridge.call('physics.add_raycast', {
    node_path: args.node_path,
    name: args.name,
    target_position: args.target_position,
    cast_to: args.cast_to,
    enabled: args.enabled,
    collide_with_bodies: args.collide_with_bodies,
    collide_with_areas: args.collide_with_areas,
  }) as { node_path?: string };
  return {
    created: true,
    node_path: result?.node_path || '',
    message: 'RayCast2D node added via Godot editor.',
  };
}
