import type { GodotBridge } from '../godot-bridge.js';

export interface RunProjectArgs {
  scene_path?: string;
}

export interface RunProjectResult {
  running: boolean;
  message: string;
}

export async function runProject(args: RunProjectArgs, bridge: GodotBridge): Promise<RunProjectResult> {
  if (!bridge.isConnected) {
    return { running: false, message: 'run_project requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  await bridge.call('project.run', { scene_path: args.scene_path ?? '' } as Record<string, unknown>);
  return { running: true, message: 'Project run requested via Godot editor.' };
}

export interface GetOutputLogArgs {
  lines?: number;
}

export interface GetOutputLogResult {
  lines: string[];
  message: string;
}

export async function getOutputLog(args: GetOutputLogArgs, bridge: GodotBridge): Promise<GetOutputLogResult> {
  if (!bridge.isConnected) {
    return { lines: [], message: 'get_output_log requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  const result = await bridge.call('project.get_output_log', { lines: args.lines ?? 100 } as Record<string, unknown>) as { lines?: string[] };
  return { lines: result?.lines ?? [], message: 'Output log retrieved via Godot editor.' };
}