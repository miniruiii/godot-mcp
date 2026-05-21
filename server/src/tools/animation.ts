import type { GodotBridge } from '../godot-bridge.js';

// =============================================================================
// listAnimations
// =============================================================================

export interface ListAnimationsArgs {
  node_path: string;
}

export interface ListAnimationsResult {
  animations: string[];
  node_path: string;
}

export async function listAnimations(args: ListAnimationsArgs, bridge: GodotBridge): Promise<ListAnimationsResult> {
  if (!bridge.isConnected) {
    return { animations: [], node_path: args.node_path };
  }
  const result = await bridge.call('animation.list', { node_path: args.node_path }) as { animations?: string[] };
  return { animations: result?.animations || [], node_path: args.node_path };
}

// =============================================================================
// createAnimation
// =============================================================================

export interface CreateAnimationArgs {
  node_path: string;
  name: string;
}

export interface CreateAnimationResult {
  created: boolean;
  name: string;
  message: string;
}

export async function createAnimation(args: CreateAnimationArgs, bridge: GodotBridge): Promise<CreateAnimationResult> {
  if (!bridge.isConnected) {
    return { created: false, name: args.name, message: 'create_animation requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  await bridge.call('animation.create', {
    node_path: args.node_path,
    name: args.name,
  });
  return { created: true, name: args.name, message: 'Animation created via Godot editor.' };
}

// =============================================================================
// addAnimationTrack
// =============================================================================

export interface AddAnimationTrackArgs {
  node_path: string;
  animation: string;
  track_path: string;
}

export interface AddAnimationTrackResult {
  added: boolean;
  track_index: number;
  message: string;
}

export async function addAnimationTrack(args: AddAnimationTrackArgs, bridge: GodotBridge): Promise<AddAnimationTrackResult> {
  if (!bridge.isConnected) {
    return { added: false, track_index: -1, message: 'add_animation_track requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  const result = await bridge.call('animation.add_track', {
    node_path: args.node_path,
    animation: args.animation,
    track_path: args.track_path,
  }) as { track_index?: number };
  return { added: true, track_index: result?.track_index ?? -1, message: 'Animation track added via Godot editor.' };
}

// =============================================================================
// setAnimationKeyframe
// =============================================================================

export interface SetAnimationKeyframeArgs {
  node_path: string;
  animation: string;
  track_index: number;
  time: number;
  value: string;
}

export interface SetAnimationKeyframeResult {
  success: boolean;
  message: string;
}

export async function setAnimationKeyframe(args: SetAnimationKeyframeArgs, bridge: GodotBridge): Promise<SetAnimationKeyframeResult> {
  if (!bridge.isConnected) {
    return { success: false, message: 'set_animation_keyframe requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  await bridge.call('animation.set_keyframe', {
    node_path: args.node_path,
    animation: args.animation,
    track_index: args.track_index,
    time: args.time,
    value: args.value,
  });
  return { success: true, message: 'Animation keyframe set via Godot editor.' };
}

// =============================================================================
// getAnimationInfo
// =============================================================================

export interface GetAnimationInfoArgs {
  node_path: string;
  animation: string;
}

export interface AnimationTrackInfo {
  path: string;
  type: string;
}

export interface AnimationKeyframeInfo {
  time: number;
  value: string;
}

export interface GetAnimationInfoResult {
  name: string;
  length: number;
  tracks: AnimationTrackInfo[];
  keyframes: AnimationKeyframeInfo[];
}

export async function getAnimationInfo(args: GetAnimationInfoArgs, bridge: GodotBridge): Promise<GetAnimationInfoResult> {
  if (!bridge.isConnected) {
    return { name: args.animation, length: 0, tracks: [], keyframes: [] };
  }
  const result = await bridge.call('animation.get_info', {
    node_path: args.node_path,
    animation: args.animation,
  }) as {
    name?: string;
    length?: number;
    tracks?: AnimationTrackInfo[];
    keyframes?: AnimationKeyframeInfo[];
  };
  return {
    name: result?.name || args.animation,
    length: result?.length ?? 0,
    tracks: result?.tracks || [],
    keyframes: result?.keyframes || [],
  };
}

// =============================================================================
// removeAnimation
// =============================================================================

export interface RemoveAnimationArgs {
  node_path: string;
  animation: string;
}

export interface RemoveAnimationResult {
  removed: boolean;
  message: string;
}

export async function removeAnimation(args: RemoveAnimationArgs, bridge: GodotBridge): Promise<RemoveAnimationResult> {
  if (!bridge.isConnected) {
    return { removed: false, message: 'remove_animation requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  await bridge.call('animation.remove', {
    node_path: args.node_path,
    animation: args.animation,
  });
  return { removed: true, message: 'Animation removed via Godot editor.' };
}