import type { GodotBridge } from '../godot-bridge.js';

// Tool 1: getGameSceneTree
export interface GetGameSceneTreeArgs {
  max_depth?: number;
}

export interface GameSceneTreeNode {
  name: string;
  type: string;
  path: string;
}

export interface GetGameSceneTreeSuccess {
  nodes: GameSceneTreeNode[];
  scene_path: string;
  node_count: number;
  truncated: boolean;
}

export interface OfflineResult {
  offline: true;
  message: string;
}

export type GetGameSceneTreeResult = GetGameSceneTreeSuccess | OfflineResult;

export async function getGameSceneTree(args: GetGameSceneTreeArgs, _projectRoot: string, bridge: GodotBridge): Promise<GetGameSceneTreeResult> {
  if (!bridge.isConnected) {
    return { offline: true, message: 'get_game_scene_tree requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  return await bridge.call('game.get_tree', { max_depth: args.max_depth }) as GetGameSceneTreeSuccess;
}

// Tool 2: getGameNodeProperties
export interface GetGameNodePropertiesArgs {
  node_path: string;
}

export interface GetGameNodePropertiesSuccess {
  name: string;
  type: string;
  path: string;
  properties: Record<string, string>;
}

export type GetGameNodePropertiesResult = GetGameNodePropertiesSuccess | OfflineResult;

export async function getGameNodeProperties(args: GetGameNodePropertiesArgs, _projectRoot: string, bridge: GodotBridge): Promise<GetGameNodePropertiesResult> {
  if (!bridge.isConnected) {
    return { offline: true, message: 'get_game_node_properties requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  return await bridge.call('game.get_node_properties', { node_path: args.node_path }) as GetGameNodePropertiesSuccess;
}

// Tool 3: setGameNodeProperty
export interface SetGameNodePropertyArgs {
  node_path: string;
  property: string;
  value: unknown;
}

export interface SetGameNodePropertySuccess {
  updated: boolean;
  property: string;
  value: string;
}

export type SetGameNodePropertyResult = SetGameNodePropertySuccess | OfflineResult;

export async function setGameNodeProperty(args: SetGameNodePropertyArgs, _projectRoot: string, bridge: GodotBridge): Promise<SetGameNodePropertyResult> {
  if (!bridge.isConnected) {
    return { offline: true, message: 'set_game_node_property requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  return await bridge.call('game.set_node_property', { node_path: args.node_path, property: args.property, value: args.value }) as SetGameNodePropertySuccess;
}

// Tool 4: executeGameScript
export interface ExecuteGameScriptArgs {
  code: string;
}

export interface ExecuteGameScriptSuccess {
  executed: boolean;
}

export type ExecuteGameScriptResult = ExecuteGameScriptSuccess | OfflineResult;

export async function executeGameScript(args: ExecuteGameScriptArgs, _projectRoot: string, bridge: GodotBridge): Promise<ExecuteGameScriptResult> {
  if (!bridge.isConnected) {
    return { offline: true, message: 'execute_game_script requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  return await bridge.call('game.execute_script', { code: args.code }) as ExecuteGameScriptSuccess;
}

// Tool 5: findNodesByScript
export interface FindNodesByScriptArgs {
  script_path: string;
}

export interface GameNodeRef {
  name: string;
  type: string;
  path: string;
}

export interface FindNodesByScriptSuccess {
  nodes: GameNodeRef[];
}

export type FindNodesByScriptResult = FindNodesByScriptSuccess | OfflineResult;

export async function findNodesByScript(args: FindNodesByScriptArgs, _projectRoot: string, bridge: GodotBridge): Promise<FindNodesByScriptResult> {
  if (!bridge.isConnected) {
    return { offline: true, message: 'find_nodes_by_script requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  return await bridge.call('game.find_nodes_by_script', { script_path: args.script_path }) as FindNodesByScriptSuccess;
}

// Tool 6: getAutoload
export interface GetAutoloadArgs {
  name: string;
}

export interface GetAutoloadSuccess {
  name: string;
  path: string;
}

export type GetAutoloadResult = GetAutoloadSuccess | OfflineResult;

export async function getAutoload(args: GetAutoloadArgs, _projectRoot: string, bridge: GodotBridge): Promise<GetAutoloadResult> {
  if (!bridge.isConnected) {
    return { offline: true, message: 'get_autoload requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  return await bridge.call('game.get_autoload', { name: args.name }) as GetAutoloadSuccess;
}

// Tool 7: batchGetProperties
export interface BatchGetPropertiesArgs {
  node_paths: string[];
}

export interface BatchNodeResult {
  path: string;
  properties?: Record<string, string>;
  error?: string;
}

export interface BatchGetPropertiesSuccess {
  nodes: BatchNodeResult[];
}

export type BatchGetPropertiesResult = BatchGetPropertiesSuccess | OfflineResult;

export async function batchGetProperties(args: BatchGetPropertiesArgs, _projectRoot: string, bridge: GodotBridge): Promise<BatchGetPropertiesResult> {
  if (!bridge.isConnected) {
    return { offline: true, message: 'batch_get_properties requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  return await bridge.call('game.batch_get_properties', { node_paths: args.node_paths }) as BatchGetPropertiesSuccess;
}

// Tool 8: findUiElements
export interface FindUiElementsArgs {
  type?: string;
  text?: string;
}

export interface UiElementRef {
  name: string;
  type: string;
  path: string;
  text: string;
}

export interface FindUiElementsSuccess {
  elements: UiElementRef[];
}

export type FindUiElementsResult = FindUiElementsSuccess | OfflineResult;

export async function findUiElements(args: FindUiElementsArgs, _projectRoot: string, bridge: GodotBridge): Promise<FindUiElementsResult> {
  if (!bridge.isConnected) {
    return { offline: true, message: 'find_ui_elements requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  return await bridge.call('game.find_ui_elements', { type: args.type, text: args.text }) as FindUiElementsSuccess;
}

// Tool 9: clickButtonByText
export interface ClickButtonByTextArgs {
  text: string;
}

export interface ClickButtonByTextSuccess {
  clicked: boolean;
  button_path: string;
}

export type ClickButtonByTextResult = ClickButtonByTextSuccess | OfflineResult;

export async function clickButtonByText(args: ClickButtonByTextArgs, _projectRoot: string, bridge: GodotBridge): Promise<ClickButtonByTextResult> {
  if (!bridge.isConnected) {
    return { offline: true, message: 'click_button_by_text requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  return await bridge.call('game.click_button_by_text', { text: args.text }) as ClickButtonByTextSuccess;
}

// Tool 10: waitForNode
export interface WaitForNodeArgs {
  node_path: string;
  timeout_ms?: number;
}

export interface WaitForNodeSuccess {
  found: boolean;
  node_path: string;
}

export type WaitForNodeResult = WaitForNodeSuccess | OfflineResult;

export async function waitForNode(args: WaitForNodeArgs, _projectRoot: string, bridge: GodotBridge): Promise<WaitForNodeResult> {
  if (!bridge.isConnected) {
    return { offline: true, message: 'wait_for_node requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  return await bridge.call('game.wait_for_node', { node_path: args.node_path, timeout_ms: args.timeout_ms }) as WaitForNodeSuccess;
}

// Tool 11: findNearbyNodes
export interface FindNearbyNodesArgs {
  node_path: string;
  distance?: number;
}

export interface NearbyNodeRef {
  name: string;
  type: string;
  path: string;
  distance: number;
}

export interface FindNearbyNodesSuccess {
  nodes: NearbyNodeRef[];
}

export type FindNearbyNodesResult = FindNearbyNodesSuccess | OfflineResult;

export async function findNearbyNodes(args: FindNearbyNodesArgs, _projectRoot: string, bridge: GodotBridge): Promise<FindNearbyNodesResult> {
  if (!bridge.isConnected) {
    return { offline: true, message: 'find_nearby_nodes requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  return await bridge.call('game.find_nearby_nodes', { node_path: args.node_path, distance: args.distance }) as FindNearbyNodesSuccess;
}

// Tool 12: navigateTo
export interface NavigateToArgs {
  node_path: string;
  target: string;
}

export interface NavigateToSuccess {
  navigating: boolean;
  target: string;
}

export type NavigateToResult = NavigateToSuccess | OfflineResult;

export async function navigateTo(args: NavigateToArgs, _projectRoot: string, bridge: GodotBridge): Promise<NavigateToResult> {
  if (!bridge.isConnected) {
    return { offline: true, message: 'navigate_to requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  return await bridge.call('game.navigate_to', { node_path: args.node_path, target: args.target }) as NavigateToSuccess;
}

// Tool 14: getGameNodeProperty
export interface GetGameNodePropertyArgs {
  node_path: string;
  property: string;
}

export interface GetGameNodePropertySuccess {
  property: string;
  value: string;
}

export type GetGameNodePropertyResult = GetGameNodePropertySuccess | OfflineResult;

export async function getGameNodeProperty(args: GetGameNodePropertyArgs, _projectRoot: string, bridge: GodotBridge): Promise<GetGameNodePropertyResult> {
  if (!bridge.isConnected) {
    return { offline: true, message: 'get_game_node_property requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  return await bridge.call('game.get_game_node_property', { node_path: args.node_path, property: args.property }) as GetGameNodePropertySuccess;
}

// Tool 15: captureFrames
export interface CaptureFramesArgs {
  count?: number;
}

export interface CaptureFramesSuccess {
  captured: number;
  format: string;
  data: string;
}

export type CaptureFramesResult = CaptureFramesSuccess | OfflineResult;

export async function captureFrames(args: CaptureFramesArgs, _projectRoot: string, bridge: GodotBridge): Promise<CaptureFramesResult> {
  if (!bridge.isConnected) {
    return { offline: true, message: 'capture_frames requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  return await bridge.call('game.capture_frames', { count: args.count }) as CaptureFramesSuccess;
}

// Tool 16: monitorProperties
export interface MonitorPropertiesArgs {
  node_path: string;
  properties: string[];
}

export interface MonitorPropertiesSuccess {
  node_path: string;
  values: Record<string, string | null>;
}

export type MonitorPropertiesResult = MonitorPropertiesSuccess | OfflineResult;

export async function monitorProperties(args: MonitorPropertiesArgs, _projectRoot: string, bridge: GodotBridge): Promise<MonitorPropertiesResult> {
  if (!bridge.isConnected) {
    return { offline: true, message: 'monitor_properties requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  return await bridge.call('game.monitor_properties', { node_path: args.node_path, properties: args.properties }) as MonitorPropertiesSuccess;
}

// Tool 17: startRecording
export interface StartRecordingArgs {}

export interface StartRecordingSuccess {
  recording: boolean;
}

export type StartRecordingResult = StartRecordingSuccess | OfflineResult;

export async function startRecording(_args: StartRecordingArgs, _projectRoot: string, bridge: GodotBridge): Promise<StartRecordingResult> {
  if (!bridge.isConnected) {
    return { offline: true, message: 'start_recording requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  return await bridge.call('game.start_recording', {}) as StartRecordingSuccess;
}

// Tool 18: stopRecording
export interface StopRecordingArgs {}

export interface StopRecordingSuccess {
  stopped: boolean;
  frames_recorded: number;
}

export type StopRecordingResult = StopRecordingSuccess | OfflineResult;

export async function stopRecording(_args: StopRecordingArgs, _projectRoot: string, bridge: GodotBridge): Promise<StopRecordingResult> {
  if (!bridge.isConnected) {
    return { offline: true, message: 'stop_recording requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  return await bridge.call('game.stop_recording', {}) as StopRecordingSuccess;
}

// Tool 19: replayRecording
export interface ReplayRecordingArgs {
  data: unknown;
}

export interface ReplayRecordingSuccess {
  replayed: boolean;
  frame_count: number;
}

export type ReplayRecordingResult = ReplayRecordingSuccess | OfflineResult;

export async function replayRecording(args: ReplayRecordingArgs, _projectRoot: string, bridge: GodotBridge): Promise<ReplayRecordingResult> {
  if (!bridge.isConnected) {
    return { offline: true, message: 'replay_recording requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  return await bridge.call('game.replay_recording', { data: args.data }) as ReplayRecordingSuccess;
}
