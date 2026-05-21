import type { GodotBridge } from '../godot-bridge.js';

// =============================================================================
// list_export_presets
// =============================================================================

export interface ListExportPresetsArgs {
  /** Optional: Filter by platform (e.g., 'Windows', 'macOS', 'Linux', 'Android', 'iOS') */
  platform?: string;
}

export interface ExportPresetInfo {
  name: string;
  platform: string;
  path: string;
  debug: boolean;
  custom_features: string[];
}

export interface ListExportPresetsResult {
  presets: ExportPresetInfo[];
  message: string;
}

export async function listExportPresets(args: ListExportPresetsArgs, bridge: GodotBridge): Promise<ListExportPresetsResult> {
  if (!bridge.isConnected) {
    return {
      presets: [],
      message: 'list_export_presets requires Godot editor to be running with the Godot MCP plugin enabled.',
    };
  }
  const result = await bridge.call('export.list_presets', {
    platform: args.platform,
  }) as {
    presets?: Array<{
      name?: string;
      platform?: string;
      path?: string;
      debug?: boolean;
      custom_features?: string[];
    }>;
  };
  const presets: ExportPresetInfo[] = (result?.presets || []).map((p) => ({
    name: p.name || '',
    platform: p.platform || '',
    path: p.path || '',
    debug: p.debug || false,
    custom_features: p.custom_features || [],
  }));
  return {
    presets,
    message: `Found ${presets.length} export preset(s).`,
  };
}

// =============================================================================
// export_project
// =============================================================================

export interface ExportProjectArgs {
  /** Name of the export preset to use (e.g., 'Windows Desktop', 'Android') */
  preset_name?: string;
  /** Custom output directory for exported files */
  output_path?: string;
  /** Run export silently without showing progress dialog */
  silent?: boolean;
}

export interface ExportProjectResult {
  success: boolean;
  output_path: string;
  message: string;
}

export async function exportProject(args: ExportProjectArgs, bridge: GodotBridge): Promise<ExportProjectResult> {
  if (!bridge.isConnected) {
    return {
      success: false,
      output_path: '',
      message: 'export_project requires Godot editor to be running with the Godot MCP plugin enabled.',
    };
  }
  const result = await bridge.call('export.run', {
    preset_name: args.preset_name,
    output_path: args.output_path,
    silent: args.silent,
  }) as {
    success?: boolean;
    output_path?: string;
    error?: string;
  };
  return {
    success: result?.success ?? false,
    output_path: result?.output_path || '',
    message: result?.success
      ? `Project exported successfully to ${result.output_path || 'default location'}.`
      : `Export failed: ${result?.error || 'Unknown error'}`,
  };
}

// =============================================================================
// get_export_info
// =============================================================================

export interface GetExportInfoArgs {
  /** Optional: Specific platform to get info for (e.g., 'Windows', 'Android') */
  platform?: string;
}

export interface ExportPlatformInfo {
  name: string;
  presets: Array<{
    name: string;
    path: string;
    debug: boolean;
    custom_features: string[];
  }>;
  export_path: string;
  includes: string[];
  excludes: string[];
}

export interface GetExportInfoResult {
  platforms: ExportPlatformInfo[];
  message: string;
}

export async function getExportInfo(args: GetExportInfoArgs, bridge: GodotBridge): Promise<GetExportInfoResult> {
  if (!bridge.isConnected) {
    return {
      platforms: [],
      message: 'get_export_info requires Godot editor to be running with the Godot MCP plugin enabled.',
    };
  }
  const result = await bridge.call('export.get_info', {
    platform: args.platform,
  }) as {
    platforms?: Array<{
      name?: string;
      presets?: Array<{
        name?: string;
        path?: string;
        debug?: boolean;
        custom_features?: string[];
      }>;
      export_path?: string;
      includes?: string[];
      excludes?: string[];
    }>;
  };
  const platforms: ExportPlatformInfo[] = (result?.platforms || []).map((p) => ({
    name: p.name || '',
    presets: (p.presets || []).map((pr) => ({
      name: pr.name || '',
      path: pr.path || '',
      debug: pr.debug || false,
      custom_features: pr.custom_features || [],
    })),
    export_path: p.export_path || '',
    includes: p.includes || [],
    excludes: p.excludes || [],
  }));
  return {
    platforms,
    message: `Export info retrieved for ${platforms.length} platform(s).`,
  };
}
