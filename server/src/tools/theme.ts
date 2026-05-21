import type { GodotBridge } from '../godot-bridge.js';

// =============================================================================
// createTheme
// =============================================================================

export interface CreateThemeArgs {
  node_path: string;
}

export interface CreateThemeResult {
  created: boolean;
  message: string;
}

export async function createTheme(args: CreateThemeArgs, bridge: GodotBridge): Promise<CreateThemeResult> {
  if (!bridge.isConnected) {
    return { created: false, message: 'createTheme requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  await bridge.call('theme.create', { node_path: args.node_path });
  return { created: true, message: 'Theme created via Godot editor.' };
}

// =============================================================================
// setThemeColor
// =============================================================================

export interface SetThemeColorArgs {
  node_path: string;
  section?: string;
  name: string;
  value: string;
}

export interface SetThemeColorResult {
  success: boolean;
  message: string;
}

export async function setThemeColor(args: SetThemeColorArgs, bridge: GodotBridge): Promise<SetThemeColorResult> {
  if (!bridge.isConnected) {
    return { success: false, message: 'setThemeColor requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  await bridge.call('theme.set_color', {
    node_path: args.node_path,
    section: args.section,
    name: args.name,
    value: args.value,
  });
  return { success: true, message: 'Theme color set via Godot editor.' };
}

// =============================================================================
// setThemeConstant
// =============================================================================

export interface SetThemeConstantArgs {
  node_path: string;
  name: string;
  value: number;
}

export interface SetThemeConstantResult {
  success: boolean;
  message: string;
}

export async function setThemeConstant(args: SetThemeConstantArgs, bridge: GodotBridge): Promise<SetThemeConstantResult> {
  if (!bridge.isConnected) {
    return { success: false, message: 'setThemeConstant requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  await bridge.call('theme.set_constant', {
    node_path: args.node_path,
    name: args.name,
    value: args.value,
  });
  return { success: true, message: 'Theme constant set via Godot editor.' };
}

// =============================================================================
// setThemeFontSize
// =============================================================================

export interface SetThemeFontSizeArgs {
  node_path: string;
  name: string;
  size: number;
}

export interface SetThemeFontSizeResult {
  success: boolean;
  message: string;
}

export async function setThemeFontSize(args: SetThemeFontSizeArgs, bridge: GodotBridge): Promise<SetThemeFontSizeResult> {
  if (!bridge.isConnected) {
    return { success: false, message: 'setThemeFontSize requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  await bridge.call('theme.set_font_size', {
    node_path: args.node_path,
    name: args.name,
    size: args.size,
  });
  return { success: true, message: 'Theme font size set via Godot editor.' };
}

// =============================================================================
// setThemeStylebox
// =============================================================================

export interface SetThemeStyleboxArgs {
  node_path: string;
  name: string;
  type?: string;
  color?: string;
}

export interface SetThemeStyleboxResult {
  success: boolean;
  message: string;
}

export async function setThemeStylebox(args: SetThemeStyleboxArgs, bridge: GodotBridge): Promise<SetThemeStyleboxResult> {
  if (!bridge.isConnected) {
    return { success: false, message: 'setThemeStylebox requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  await bridge.call('theme.set_stylebox', {
    node_path: args.node_path,
    name: args.name,
    type: args.type,
    color: args.color,
  });
  return { success: true, message: 'Theme stylebox set via Godot editor.' };
}

// =============================================================================
// getThemeInfo
// =============================================================================

export interface GetThemeInfoArgs {
  node_path: string;
}

export interface GetThemeInfoResult {
  has_theme: boolean;
  theme_type: string;
  message: string;
}

export async function getThemeInfo(args: GetThemeInfoArgs, bridge: GodotBridge): Promise<GetThemeInfoResult> {
  if (!bridge.isConnected) {
    return { has_theme: false, theme_type: '', message: 'getThemeInfo requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  const result = await bridge.call('theme.get_info', {
    node_path: args.node_path,
  }) as { has_theme?: boolean; theme_type?: string };
  return {
    has_theme: result?.has_theme ?? false,
    theme_type: result?.theme_type || '',
    message: 'Theme info retrieved via Godot editor.',
  };
}