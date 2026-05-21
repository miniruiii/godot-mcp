import type { GodotBridge } from '../godot-bridge.js';

// =============================================================================
// simulateKey
// =============================================================================

export interface SimulateKeyArgs {
  keycode: string;
  pressed: boolean;
  modifiers?: string[];
}

export interface SimulateKeyResult {
  success: boolean;
  message: string;
}

export async function simulateKey(args: SimulateKeyArgs, bridge: GodotBridge): Promise<SimulateKeyResult> {
  if (!bridge.isConnected) {
    return { success: false, message: 'simulate_key requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  await bridge.call('input.simulate_key', {
    keycode: args.keycode,
    pressed: args.pressed,
    modifiers: args.modifiers ?? [],
  });
  return { success: true, message: 'Key simulated via Godot editor.' };
}

// =============================================================================
// simulateMouseClick
// =============================================================================

export interface SimulateMouseClickArgs {
  position: { x: number; y: number };
  button: number;
  pressed: boolean;
}

export interface SimulateMouseClickResult {
  success: boolean;
  message: string;
}

export async function simulateMouseClick(args: SimulateMouseClickArgs, bridge: GodotBridge): Promise<SimulateMouseClickResult> {
  if (!bridge.isConnected) {
    return { success: false, message: 'simulate_mouse_click requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  await bridge.call('input.simulate_mouse_click', {
    position: args.position,
    button: args.button,
    pressed: args.pressed,
  });
  return { success: true, message: 'Mouse click simulated via Godot editor.' };
}

// =============================================================================
// simulateMouseMove
// =============================================================================

export interface SimulateMouseMoveArgs {
  position: { x: number; y: number };
}

export interface SimulateMouseMoveResult {
  success: boolean;
  message: string;
}

export async function simulateMouseMove(args: SimulateMouseMoveArgs, bridge: GodotBridge): Promise<SimulateMouseMoveResult> {
  if (!bridge.isConnected) {
    return { success: false, message: 'simulate_mouse_move requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  await bridge.call('input.simulate_mouse_move', {
    position: args.position,
  });
  return { success: true, message: 'Mouse move simulated via Godot editor.' };
}

// =============================================================================
// simulateAction
// =============================================================================

export interface SimulateActionArgs {
  action: string;
  pressed: boolean;
}

export interface SimulateActionResult {
  success: boolean;
  message: string;
}

export async function simulateAction(args: SimulateActionArgs, bridge: GodotBridge): Promise<SimulateActionResult> {
  if (!bridge.isConnected) {
    return { success: false, message: 'simulate_action requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  await bridge.call('input.simulate_action', {
    action: args.action,
    pressed: args.pressed,
  });
  return { success: true, message: 'Action simulated via Godot editor.' };
}

// =============================================================================
// simulateSequence
// =============================================================================

export interface SimulateSequenceArgs {
  events: Array<Record<string, unknown>>;
}

export interface SimulateSequenceResult {
  success: boolean;
  message: string;
}

export async function simulateSequence(args: SimulateSequenceArgs, bridge: GodotBridge): Promise<SimulateSequenceResult> {
  if (!bridge.isConnected) {
    return { success: false, message: 'simulate_sequence requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  await bridge.call('input.simulate_sequence', {
    events: args.events,
  });
  return { success: true, message: 'Input sequence simulated via Godot editor.' };
}

// =============================================================================
// getInputActions
// =============================================================================

export interface GetInputActionsArgs {
  // No arguments required
}

export interface GetInputActionsResult {
  actions: string[];
}

export async function getInputActions(_args: GetInputActionsArgs, bridge: GodotBridge): Promise<GetInputActionsResult> {
  if (!bridge.isConnected) {
    return { actions: [] };
  }
  const result = await bridge.call('input.get_input_actions', {}) as { actions: string[] };
  return { actions: result.actions };
}

// =============================================================================
// setInputAction
// =============================================================================

export interface SetInputActionArgs {
  action: string;
  event: Record<string, unknown>;
}

export interface SetInputActionResult {
  success: boolean;
  message: string;
}

export async function setInputAction(args: SetInputActionArgs, bridge: GodotBridge): Promise<SetInputActionResult> {
  if (!bridge.isConnected) {
    return { success: false, message: 'set_input_action requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  await bridge.call('input.set_input_action', {
    action: args.action,
    event: args.event,
  });
  return { success: true, message: 'Input action set via Godot editor.' };
}
