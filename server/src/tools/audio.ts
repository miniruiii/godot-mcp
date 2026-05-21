import type { GodotBridge } from '../godot-bridge.js';

// =============================================================================
// add_audio_player
// =============================================================================

export interface AddAudioPlayerArgs {
  node_path: string;
  stream_type: 'mp3' | 'wav' | 'ogg';
  stream_path?: string;
  volume_db?: number;
  pitch_scale?: number;
  autoplay?: boolean;
  loop?: boolean;
}

export interface AddAudioPlayerResult {
  created: boolean;
  node_path: string;
  message: string;
}

export async function addAudioPlayer(args: AddAudioPlayerArgs, bridge: GodotBridge): Promise<AddAudioPlayerResult> {
  if (!bridge.isConnected) {
    return { created: false, node_path: '', message: 'add_audio_player requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  const result = await bridge.call('audio.add_player', {
    node_path: args.node_path,
    stream_type: args.stream_type,
    stream_path: args.stream_path,
    volume_db: args.volume_db,
    pitch_scale: args.pitch_scale,
    autoplay: args.autoplay,
    loop: args.loop,
  }) as { node_path?: string };
  return {
    created: true,
    node_path: result?.node_path || '',
    message: 'AudioStreamPlayer added via Godot editor.',
  };
}

// =============================================================================
// add_audio_bus
// =============================================================================

export interface AddAudioBusArgs {
  name: string;
  volume_db?: number;
}

export interface AddAudioBusResult {
  created: boolean;
  bus_index: number;
  message: string;
}

export async function addAudioBus(args: AddAudioBusArgs, bridge: GodotBridge): Promise<AddAudioBusResult> {
  if (!bridge.isConnected) {
    return { created: false, bus_index: -1, message: 'add_audio_bus requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  const result = await bridge.call('audio.add_bus', {
    name: args.name,
    volume_db: args.volume_db,
  }) as { bus_index?: number };
  return {
    created: true,
    bus_index: result?.bus_index ?? -1,
    message: 'Audio bus created via Godot editor.',
  };
}

// =============================================================================
// add_audio_bus_effect
// =============================================================================

export interface AddAudioBusEffectArgs {
  bus_index: number;
  effect_type: 'reverb' | 'delay' | 'eq' | 'compressor' | 'limiter' | 'distortion' | ' chorus' | 'panner' | 'phaser' | 'spectrum';
  enabled?: boolean;
  parameters?: Record<string, number | string | boolean>;
}

export interface AddAudioBusEffectResult {
  success: boolean;
  effect_index: number;
  message: string;
}

export async function addAudioBusEffect(args: AddAudioBusEffectArgs, bridge: GodotBridge): Promise<AddAudioBusEffectResult> {
  if (!bridge.isConnected) {
    return { success: false, effect_index: -1, message: 'add_audio_bus_effect requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  const result = await bridge.call('audio.add_bus_effect', {
    bus_index: args.bus_index,
    effect_type: args.effect_type,
    enabled: args.enabled,
    parameters: args.parameters,
  }) as { effect_index?: number };
  return {
    success: true,
    effect_index: result?.effect_index ?? -1,
    message: 'Effect added to audio bus via Godot editor.',
  };
}

// =============================================================================
// set_audio_bus
// =============================================================================

export interface SetAudioBusArgs {
  node_path: string;
  bus_index: number;
}

export interface SetAudioBusResult {
  success: boolean;
  message: string;
}

export async function setAudioBus(args: SetAudioBusArgs, bridge: GodotBridge): Promise<SetAudioBusResult> {
  if (!bridge.isConnected) {
    return { success: false, message: 'set_audio_bus requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  await bridge.call('audio.set_bus', {
    node_path: args.node_path,
    bus_index: args.bus_index,
  });
  return { success: true, message: 'Audio bus set via Godot editor.' };
}

// =============================================================================
// get_audio_bus_layout
// =============================================================================

export interface AudioBusEffectInfo {
  effect_type: string;
  enabled: boolean;
  parameters?: Record<string, number | string | boolean>;
}

export interface AudioBusInfo {
  name: string;
  volume_db: number;
  effects: AudioBusEffectInfo[];
}

export interface GetAudioBusLayoutArgs {
  // Optional filter to get specific bus
  bus_index?: number;
}

export interface GetAudioBusLayoutResult {
  buses: AudioBusInfo[];
  message: string;
}

export async function getAudioBusLayout(args: GetAudioBusLayoutArgs, bridge: GodotBridge): Promise<GetAudioBusLayoutResult> {
  if (!bridge.isConnected) {
    return { buses: [], message: 'get_audio_bus_layout requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  const result = await bridge.call('audio.get_bus_layout', {
    bus_index: args.bus_index,
  }) as { buses?: AudioBusInfo[] };
  return {
    buses: result?.buses || [],
    message: 'Audio bus layout retrieved via Godot editor.',
  };
}

// =============================================================================
// get_audio_info
// =============================================================================

export interface AudioPlayerInfo {
  stream_type: string;
  stream_path: string;
  volume_db: number;
  pitch_scale: number;
  autoplay: boolean;
  loop: boolean;
  bus_index: number;
}

export interface GetAudioInfoArgs {
  node_path: string;
}

export interface GetAudioInfoResult {
  is_player: boolean;
  player_info: AudioPlayerInfo | null;
  message: string;
}

export async function getAudioInfo(args: GetAudioInfoArgs, bridge: GodotBridge): Promise<GetAudioInfoResult> {
  if (!bridge.isConnected) {
    return { is_player: false, player_info: null, message: 'get_audio_info requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  const result = await bridge.call('audio.get_info', {
    node_path: args.node_path,
  }) as {
    is_player?: boolean;
    stream_type?: string;
    stream_path?: string;
    volume_db?: number;
    pitch_scale?: number;
    autoplay?: boolean;
    loop?: boolean;
    bus_index?: number;
  };
  return {
    is_player: result?.is_player ?? false,
    player_info: result?.is_player ? {
      stream_type: result?.stream_type || '',
      stream_path: result?.stream_path || '',
      volume_db: result?.volume_db ?? 0,
      pitch_scale: result?.pitch_scale ?? 1.0,
      autoplay: result?.autoplay ?? false,
      loop: result?.loop ?? false,
      bus_index: result?.bus_index ?? 0,
    } : null,
    message: 'Audio info retrieved via Godot editor.',
  };
}