export interface RunProjectArgs {
  scene_path?: string;
}

export interface RunProjectResult {
  running: boolean;
  message: string;
}

export function runProject(_args: RunProjectArgs, godotConnected: boolean): RunProjectResult {
  if (!godotConnected) {
    return { running: false, message: 'run_project requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  return { running: true, message: 'Project run requested via Godot editor.' };
}

export interface GetOutputLogArgs {
  lines?: number;
}

export interface GetOutputLogResult {
  lines: string[];
  message: string;
}

export function getOutputLog(_args: GetOutputLogArgs, godotConnected: boolean): GetOutputLogResult {
  if (!godotConnected) {
    return { lines: [], message: 'get_output_log requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  return { lines: [], message: 'Output log requested via Godot editor.' };
}