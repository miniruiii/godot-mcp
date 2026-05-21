import type { GodotBridge } from '../godot-bridge.js';

// =============================================================================
// tilemapSetCell
// =============================================================================

export interface TilemapSetCellArgs {
  node_path: string;
  layer?: number;
  x: number;
  y: number;
  tile_id: number;
}

export interface TilemapSetCellResult {
  success: boolean;
  message: string;
}

export async function tilemapSetCell(args: TilemapSetCellArgs, bridge: GodotBridge): Promise<TilemapSetCellResult> {
  if (!bridge.isConnected) {
    return { success: false, message: 'tilemap.set_cell requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  await bridge.call('tilemap.set_cell', {
    node_path: args.node_path,
    layer: args.layer,
    x: args.x,
    y: args.y,
    tile_id: args.tile_id,
  });
  return { success: true, message: 'Tilemap cell set via Godot editor.' };
}

// =============================================================================
// tilemapGetCell
// =============================================================================

export interface TilemapGetCellArgs {
  node_path: string;
  layer?: number;
  x: number;
  y: number;
}

export interface TilemapGetCellResult {
  tile_id: number;
  message: string;
}

export async function tilemapGetCell(args: TilemapGetCellArgs, bridge: GodotBridge): Promise<TilemapGetCellResult> {
  if (!bridge.isConnected) {
    return { tile_id: -1, message: 'tilemap.get_cell requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  const result = await bridge.call('tilemap.get_cell', {
    node_path: args.node_path,
    layer: args.layer,
    x: args.x,
    y: args.y,
  }) as { tile_id?: number };
  return { tile_id: result?.tile_id ?? -1, message: 'Tilemap cell retrieved via Godot editor.' };
}

// =============================================================================
// tilemapClear
// =============================================================================

export interface TilemapClearArgs {
  node_path: string;
  layer?: number;
}

export interface TilemapClearResult {
  success: boolean;
  message: string;
}

export async function tilemapClear(args: TilemapClearArgs, bridge: GodotBridge): Promise<TilemapClearResult> {
  if (!bridge.isConnected) {
    return { success: false, message: 'tilemap.clear requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  await bridge.call('tilemap.clear', {
    node_path: args.node_path,
    layer: args.layer,
  });
  return { success: true, message: 'Tilemap cleared via Godot editor.' };
}

// =============================================================================
// tilemapGetInfo
// =============================================================================

export interface TilemapGetInfoArgs {
  node_path: string;
}

export interface TilemapCellSize {
  x: number;
  y: number;
}

export interface TilemapGetInfoResult {
  cell_size: TilemapCellSize;
  quadrants_per_chunk: number;
  tile_set_path: string;
  layers: number;
}

export async function tilemapGetInfo(args: TilemapGetInfoArgs, bridge: GodotBridge): Promise<TilemapGetInfoResult> {
  if (!bridge.isConnected) {
    return { cell_size: { x: 0, y: 0 }, quadrants_per_chunk: 0, tile_set_path: '', layers: 0 };
  }
  const result = await bridge.call('tilemap.get_info', {
    node_path: args.node_path,
  }) as {
    cell_size?: TilemapCellSize;
    quadrants_per_chunk?: number;
    tile_set_path?: string;
    layers?: number;
  };
  return {
    cell_size: result?.cell_size || { x: 0, y: 0 },
    quadrants_per_chunk: result?.quadrants_per_chunk ?? 0,
    tile_set_path: result?.tile_set_path || '',
    layers: result?.layers ?? 0,
  };
}

// =============================================================================
// tilemapGetUsedCells
// =============================================================================

export interface TilemapGetUsedCellsArgs {
  node_path: string;
  layer?: number;
}

export interface TilemapCellPosition {
  x: number;
  y: number;
}

export interface TilemapGetUsedCellsResult {
  cells: TilemapCellPosition[];
  message: string;
}

export async function tilemapGetUsedCells(args: TilemapGetUsedCellsArgs, bridge: GodotBridge): Promise<TilemapGetUsedCellsResult> {
  if (!bridge.isConnected) {
    return { cells: [], message: 'tilemap.get_used_cells requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  const result = await bridge.call('tilemap.get_used_cells', {
    node_path: args.node_path,
    layer: args.layer,
  }) as { cells?: TilemapCellPosition[] };
  return { cells: result?.cells || [], message: 'Tilemap used cells retrieved via Godot editor.' };
}

// =============================================================================
// tilemapFillRect
// =============================================================================

export interface TilemapFillRectArgs {
  node_path: string;
  layer?: number;
  x: number;
  y: number;
  width: number;
  height: number;
  tile_id: number;
}

export interface TilemapFillRectResult {
  success: boolean;
  cells_filled: number;
  message: string;
}

export async function tilemapFillRect(args: TilemapFillRectArgs, bridge: GodotBridge): Promise<TilemapFillRectResult> {
  if (!bridge.isConnected) {
    return { success: false, cells_filled: 0, message: 'tilemap.fill_rect requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  const result = await bridge.call('tilemap.fill_rect', {
    node_path: args.node_path,
    layer: args.layer,
    x: args.x,
    y: args.y,
    width: args.width,
    height: args.height,
    tile_id: args.tile_id,
  }) as { cells_filled?: number };
  return { success: true, cells_filled: result?.cells_filled ?? 0, message: 'Tilemap rectangle filled via Godot editor.' };
}