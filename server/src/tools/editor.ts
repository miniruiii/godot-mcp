import type { GodotBridge } from '../godot-bridge.js';

export interface RunProjectArgs {
  scene_path?: string;
}

export interface RunProjectResult {
  running: boolean;
  message: string;
}

export function runProject(args: RunProjectArgs, bridge: GodotBridge): RunProjectResult {
  if (!bridge.isConnected) {
    return { running: false, message: 'run_project requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  bridge.call('project.run', { scene_path: args.scene_path ?? '' } as Record<string, unknown>);
  return { running: true, message: 'Project run requested via Godot editor.' };
}

export interface GetOutputLogArgs {
  lines?: number;
}

export interface GetOutputLogResult {
  lines: string[];
  message: string;
}

export function getOutputLog(args: GetOutputLogArgs, bridge: GodotBridge): GetOutputLogResult {
  if (!bridge.isConnected) {
    return { lines: [], message: 'get_output_log requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  const result = bridge.call('project.get_output_log', { lines: args.lines ?? 100 } as Record<string, unknown>) as { lines?: string[] };
  return { lines: result?.lines ?? [], message: 'Output log retrieved via Godot editor.' };
}

export interface GetEditorErrorsArgs {
  // No specific parameters, uses defaults
}

export interface GetEditorErrorsResult {
  errors: string[];
  message: string;
}

export function getEditorErrors(args: GetEditorErrorsArgs, bridge: GodotBridge): GetEditorErrorsResult {
  if (!bridge.isConnected) {
    return { errors: [], message: 'get_editor_errors requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  const result = bridge.call('editor.get_errors', {} as Record<string, unknown>) as { errors?: string[] };
  return { errors: result?.errors ?? [], message: 'Editor errors retrieved via Godot editor.' };
}

export interface GetEditorScreenshotArgs {
  // No specific parameters, uses defaults
}

export interface GetEditorScreenshotResult {
  screenshot: string;
  message: string;
}

export function getEditorScreenshot(args: GetEditorScreenshotArgs, bridge: GodotBridge): GetEditorScreenshotResult {
  if (!bridge.isConnected) {
    return { screenshot: '', message: 'get_editor_screenshot requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  const result = bridge.call('editor.get_screenshot', {} as Record<string, unknown>) as { screenshot?: string };
  return { screenshot: result?.screenshot ?? '', message: 'Editor screenshot retrieved via Godot editor.' };
}

export interface GetGameScreenshotArgs {
  // No specific parameters, uses defaults
}

export interface GetGameScreenshotResult {
  screenshot: string;
  message: string;
}

export function getGameScreenshot(args: GetGameScreenshotArgs, bridge: GodotBridge): GetGameScreenshotResult {
  if (!bridge.isConnected) {
    return { screenshot: '', message: 'get_game_screenshot requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  const result = bridge.call('editor.get_game_screenshot', {} as Record<string, unknown>) as { screenshot?: string };
  return { screenshot: result?.screenshot ?? '', message: 'Game screenshot retrieved via Godot editor.' };
}

export interface ExecuteEditorScriptArgs {
  code: string;
}

export interface ExecuteEditorScriptResult {
  output: string;
  message: string;
}

export function executeEditorScript(args: ExecuteEditorScriptArgs, bridge: GodotBridge): ExecuteEditorScriptResult {
  if (!bridge.isConnected) {
    return { output: '', message: 'execute_editor_script requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  const result = bridge.call('editor.execute_script', { code: args.code } as Record<string, unknown>) as { output?: string };
  return { output: result?.output ?? '', message: 'Editor script executed via Godot editor.' };
}

export interface ClearOutputArgs {
  // No specific parameters, uses defaults
}

export interface ClearOutputResult {
  success: boolean;
  message: string;
}

export function clearOutput(args: ClearOutputArgs, bridge: GodotBridge): ClearOutputResult {
  if (!bridge.isConnected) {
    return { success: false, message: 'clear_output requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  bridge.call('editor.clear_output', {} as Record<string, unknown>);
  return { success: true, message: 'Output cleared via Godot editor.' };
}

export interface ReloadPluginArgs {
  // No specific parameters, uses defaults
}

export interface ReloadPluginResult {
  success: boolean;
  message: string;
}

export function reloadPlugin(args: ReloadPluginArgs, bridge: GodotBridge): ReloadPluginResult {
  if (!bridge.isConnected) {
    return { success: false, message: 'reload_plugin requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  bridge.call('editor.reload_plugin', {} as Record<string, unknown>);
  return { success: true, message: 'Plugin reload requested via Godot editor.' };
}

export interface ReloadProjectArgs {
  // No specific parameters, uses defaults
}

export interface ReloadProjectResult {
  success: boolean;
  message: string;
}

export function reloadProject(args: ReloadProjectArgs, bridge: GodotBridge): ReloadProjectResult {
  if (!bridge.isConnected) {
    return { success: false, message: 'reload_project requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  bridge.call('editor.reload_project', {} as Record<string, unknown>);
  return { success: true, message: 'Project reload requested via Godot editor.' };
}