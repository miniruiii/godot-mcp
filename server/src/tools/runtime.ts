import type { GodotBridge } from '../godot-bridge.js';

// Tool 1: getGameSceneTree
export interface GetGameSceneTreeArgs {}

export interface GetGameSceneTreeResult {
  tree?: Record<string, unknown>;
  offline?: boolean;
  message?: string;
}

export async function getGameSceneTree(_args: GetGameSceneTreeArgs, _projectRoot: string, bridge: GodotBridge): Promise<GetGameSceneTreeResult> {
  if (!bridge.isConnected) {
    return { offline: true, message: 'getGameSceneTree requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  return await bridge.call('game.get_tree', {}) as GetGameSceneTreeResult;
}

// Tool 2: getGameNodeProperties
export interface GetGameNodePropertiesArgs {
  node_path: string;
}

export interface GetGameNodePropertiesResult {
  properties?: Record<string, unknown>;
  offline?: boolean;
  message?: string;
}

export async function getGameNodeProperties(args: GetGameNodePropertiesArgs, _projectRoot: string, bridge: GodotBridge): Promise<GetGameNodePropertiesResult> {
  if (!bridge.isConnected) {
    return { offline: true, message: 'getGameNodeProperties requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  return await bridge.call('game.get_node_properties', { node_path: args.node_path }) as GetGameNodePropertiesResult;
}

// Tool 3: setGameNodeProperty
export interface SetGameNodePropertyArgs {
  node_path: string;
  property: string;
  value: unknown;
}

export interface SetGameNodePropertyResult {
  success?: boolean;
  offline?: boolean;
  message?: string;
}

export async function setGameNodeProperty(args: SetGameNodePropertyArgs, _projectRoot: string, bridge: GodotBridge): Promise<SetGameNodePropertyResult> {
  if (!bridge.isConnected) {
    return { offline: true, message: 'setGameNodeProperty requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  return await bridge.call('game.set_node_property', { node_path: args.node_path, property: args.property, value: args.value }) as SetGameNodePropertyResult;
}

// Tool 4: executeGameScript
export interface ExecuteGameScriptArgs {
  code: string;
}

export interface ExecuteGameScriptResult {
  result?: unknown;
  offline?: boolean;
  message?: string;
}

export async function executeGameScript(args: ExecuteGameScriptArgs, _projectRoot: string, bridge: GodotBridge): Promise<ExecuteGameScriptResult> {
  if (!bridge.isConnected) {
    return { offline: true, message: 'executeGameScript requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  return await bridge.call('game.execute_script', { code: args.code }) as ExecuteGameScriptResult;
}

// Tool 5: findNodesByScript
export interface FindNodesByScriptArgs {
  script_path: string;
}

export interface FindNodesByScriptResult {
  nodes?: Array<{ path: string; name: string }>;
  offline?: boolean;
  message?: string;
}

export async function findNodesByScript(args: FindNodesByScriptArgs, _projectRoot: string, bridge: GodotBridge): Promise<FindNodesByScriptResult> {
  if (!bridge.isConnected) {
    return { offline: true, message: 'findNodesByScript requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  return await bridge.call('game.find_nodes_by_script', { script_path: args.script_path }) as FindNodesByScriptResult;
}

// Tool 6: getAutoload
export interface GetAutoloadArgs {
  name: string;
}

export interface GetAutoloadResult {
  autoload?: Record<string, unknown>;
  offline?: boolean;
  message?: string;
}

export async function getAutoload(args: GetAutoloadArgs, _projectRoot: string, bridge: GodotBridge): Promise<GetAutoloadResult> {
  if (!bridge.isConnected) {
    return { offline: true, message: 'getAutoload requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  return await bridge.call('game.get_autoload', { name: args.name }) as GetAutoloadResult;
}

// Tool 7: batchGetProperties
export interface BatchGetPropertiesArgs {
  node_paths: string[];
}

export interface BatchGetPropertiesResult {
  properties?: Record<string, Record<string, unknown>>;
  offline?: boolean;
  message?: string;
}

export async function batchGetProperties(args: BatchGetPropertiesArgs, _projectRoot: string, bridge: GodotBridge): Promise<BatchGetPropertiesResult> {
  if (!bridge.isConnected) {
    return { offline: true, message: 'batchGetProperties requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  return await bridge.call('game.batch_get_properties', { node_paths: args.node_paths }) as BatchGetPropertiesResult;
}

// Tool 8: findUiElements
export interface FindUiElementsArgs {
  type?: string;
  text?: string;
}

export interface FindUiElementsResult {
  elements?: Array<{ path: string; type: string; text?: string }>;
  offline?: boolean;
  message?: string;
}

export async function findUiElements(args: FindUiElementsArgs, _projectRoot: string, bridge: GodotBridge): Promise<FindUiElementsResult> {
  if (!bridge.isConnected) {
    return { offline: true, message: 'findUiElements requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  return await bridge.call('game.find_ui_elements', { type: args.type, text: args.text }) as FindUiElementsResult;
}

// Tool 9: clickButtonByText
export interface ClickButtonByTextArgs {
  text: string;
}

export interface ClickButtonByTextResult {
  clicked?: boolean;
  offline?: boolean;
  message?: string;
}

export async function clickButtonByText(args: ClickButtonByTextArgs, _projectRoot: string, bridge: GodotBridge): Promise<ClickButtonByTextResult> {
  if (!bridge.isConnected) {
    return { offline: true, message: 'clickButtonByText requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  return await bridge.call('game.click_button_by_text', { text: args.text }) as ClickButtonByTextResult;
}

// Tool 10: waitForNode
export interface WaitForNodeArgs {
  node_path: string;
  timeout_ms?: number;
}

export interface WaitForNodeResult {
  found?: boolean;
  offline?: boolean;
  message?: string;
}

export async function waitForNode(args: WaitForNodeArgs, _projectRoot: string, bridge: GodotBridge): Promise<WaitForNodeResult> {
  if (!bridge.isConnected) {
    return { offline: true, message: 'waitForNode requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  return await bridge.call('game.wait_for_node', { node_path: args.node_path, timeout_ms: args.timeout_ms }) as WaitForNodeResult;
}

// Tool 11: findNearbyNodes
export interface FindNearbyNodesArgs {
  node_path: string;
  distance?: number;
}

export interface FindNearbyNodesResult {
  nodes?: Array<{ path: string; name: string; distance: number }>;
  offline?: boolean;
  message?: string;
}

export async function findNearbyNodes(args: FindNearbyNodesArgs, _projectRoot: string, bridge: GodotBridge): Promise<FindNearbyNodesResult> {
  if (!bridge.isConnected) {
    return { offline: true, message: 'findNearbyNodes requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  return await bridge.call('game.find_nearby_nodes', { node_path: args.node_path, distance: args.distance }) as FindNearbyNodesResult;
}

// Tool 12: navigateTo
export interface NavigateToArgs {
  node_path: string;
  target: string;
}

export interface NavigateToResult {
  navigated?: boolean;
  offline?: boolean;
  message?: string;
}

export async function navigateTo(args: NavigateToArgs, _projectRoot: string, bridge: GodotBridge): Promise<NavigateToResult> {
  if (!bridge.isConnected) {
    return { offline: true, message: 'navigateTo requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  return await bridge.call('game.navigate_to', { node_path: args.node_path, target: args.target }) as NavigateToResult;
}

// Tool 13: moveTo
export interface MoveToArgs {
  node_path: string;
  target: string;
}

export interface MoveToResult {
  moved?: boolean;
  offline?: boolean;
  message?: string;
}

export async function moveTo(args: MoveToArgs, _projectRoot: string, bridge: GodotBridge): Promise<MoveToResult> {
  if (!bridge.isConnected) {
    return { offline: true, message: 'moveTo requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  return await bridge.call('game.move_to', { node_path: args.node_path, target: args.target }) as MoveToResult;
}

// Tool 14: getGameNodeProperty
export interface GetGameNodePropertyArgs {
  node_path: string;
  property: string;
}

export interface GetGameNodePropertyResult {
  value?: unknown;
  offline?: boolean;
  message?: string;
}

export async function getGameNodeProperty(args: GetGameNodePropertyArgs, _projectRoot: string, bridge: GodotBridge): Promise<GetGameNodePropertyResult> {
  if (!bridge.isConnected) {
    return { offline: true, message: 'getGameNodeProperty requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  return await bridge.call('game.get_game_node_property', { node_path: args.node_path, property: args.property }) as GetGameNodePropertyResult;
}

// Tool 15: captureFrames
export interface CaptureFramesArgs {
  count?: number;
}

export interface CaptureFramesResult {
  captured?: boolean;
  frames?: string[];
  offline?: boolean;
  message?: string;
}

export async function captureFrames(args: CaptureFramesArgs, _projectRoot: string, bridge: GodotBridge): Promise<CaptureFramesResult> {
  if (!bridge.isConnected) {
    return { offline: true, message: 'captureFrames requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  return await bridge.call('game.capture_frames', { count: args.count }) as CaptureFramesResult;
}

// Tool 16: monitorProperties
export interface MonitorPropertiesArgs {
  node_path: string;
  properties: string[];
}

export interface MonitorPropertiesResult {
  monitoring?: boolean;
  offline?: boolean;
  message?: string;
}

export async function monitorProperties(args: MonitorPropertiesArgs, _projectRoot: string, bridge: GodotBridge): Promise<MonitorPropertiesResult> {
  if (!bridge.isConnected) {
    return { offline: true, message: 'monitorProperties requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  return await bridge.call('game.monitor_properties', { node_path: args.node_path, properties: args.properties }) as MonitorPropertiesResult;
}

// Tool 17: startRecording
export interface StartRecordingArgs {}

export interface StartRecordingResult {
  recording?: boolean;
  offline?: boolean;
  message?: string;
}

export async function startRecording(_args: StartRecordingArgs, _projectRoot: string, bridge: GodotBridge): Promise<StartRecordingResult> {
  if (!bridge.isConnected) {
    return { offline: true, message: 'startRecording requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  return await bridge.call('game.start_recording', {}) as StartRecordingResult;
}

// Tool 18: stopRecording
export interface StopRecordingArgs {}

export interface StopRecordingResult {
  stopped?: boolean;
  data?: unknown;
  offline?: boolean;
  message?: string;
}

export async function stopRecording(_args: StopRecordingArgs, _projectRoot: string, bridge: GodotBridge): Promise<StopRecordingResult> {
  if (!bridge.isConnected) {
    return { offline: true, message: 'stopRecording requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  return await bridge.call('game.stop_recording', {}) as StopRecordingResult;
}

// Tool 19: replayRecording
export interface ReplayRecordingArgs {
  data: unknown;
}

export interface ReplayRecordingResult {
  replayed?: boolean;
  offline?: boolean;
  message?: string;
}

export async function replayRecording(args: ReplayRecordingArgs, _projectRoot: string, bridge: GodotBridge): Promise<ReplayRecordingResult> {
  if (!bridge.isConnected) {
    return { offline: true, message: 'replayRecording requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  return await bridge.call('game.replay_recording', { data: args.data }) as ReplayRecordingResult;
}