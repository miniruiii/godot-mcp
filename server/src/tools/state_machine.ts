import type { GodotBridge } from '../godot-bridge.js';

// =============================================================================
// remove_state_machine_state
// =============================================================================

export interface RemoveStateMachineStateArgs {
  node_path: string;
  state_name: string;
}

export interface RemoveStateMachineStateResult {
  removed: boolean;
  node_path: string;
  state_name: string;
  message: string;
}

export async function removeStateMachineState(args: RemoveStateMachineStateArgs, bridge: GodotBridge): Promise<RemoveStateMachineStateResult> {
  if (!bridge.isConnected) {
    return {
      removed: false,
      node_path: args.node_path,
      state_name: args.state_name,
      message: 'remove_state_machine_state requires Godot editor to be running with the Godot MCP plugin enabled.',
    };
  }
  const result = await bridge.call('statemachine.remove_state', {
    node_path: args.node_path,
    state_name: args.state_name,
  }) as { removed?: boolean };
  return {
    removed: result?.removed ?? true,
    node_path: args.node_path,
    state_name: args.state_name,
    message: `State '${args.state_name}' removed from AnimationTree state machine via Godot editor.`,
  };
}

// =============================================================================
// add_state_machine_transition
// =============================================================================

export interface AddStateMachineTransitionArgs {
  node_path: string;
  from_state: string;
  to_state: string;
  priority?: number;
  auto_advance?: boolean;
}

export interface AddStateMachineTransitionResult {
  added: boolean;
  node_path: string;
  from_state: string;
  to_state: string;
  transition_index: number;
  message: string;
}

export async function addStateMachineTransition(args: AddStateMachineTransitionArgs, bridge: GodotBridge): Promise<AddStateMachineTransitionResult> {
  if (!bridge.isConnected) {
    return {
      added: false,
      node_path: args.node_path,
      from_state: args.from_state,
      to_state: args.to_state,
      transition_index: -1,
      message: 'add_state_machine_transition requires Godot editor to be running with the Godot MCP plugin enabled.',
    };
  }
  const result = await bridge.call('statemachine.add_transition', {
    node_path: args.node_path,
    from_state: args.from_state,
    to_state: args.to_state,
    priority: args.priority,
    auto_advance: args.auto_advance,
  }) as { added?: boolean; transition_index?: number };
  return {
    added: result?.added ?? true,
    node_path: args.node_path,
    from_state: args.from_state,
    to_state: args.to_state,
    transition_index: result?.transition_index ?? 0,
    message: `Transition from '${args.from_state}' to '${args.to_state}' added to AnimationTree state machine via Godot editor.`,
  };
}

// =============================================================================
// remove_state_machine_transition
// =============================================================================

export interface RemoveStateMachineTransitionArgs {
  node_path: string;
  from_state: string;
  to_state: string;
}

export interface RemoveStateMachineTransitionResult {
  removed: boolean;
  node_path: string;
  from_state: string;
  to_state: string;
  message: string;
}

export async function removeStateMachineTransition(args: RemoveStateMachineTransitionArgs, bridge: GodotBridge): Promise<RemoveStateMachineTransitionResult> {
  if (!bridge.isConnected) {
    return {
      removed: false,
      node_path: args.node_path,
      from_state: args.from_state,
      to_state: args.to_state,
      message: 'remove_state_machine_transition requires Godot editor to be running with the Godot MCP plugin enabled.',
    };
  }
  const result = await bridge.call('statemachine.remove_transition', {
    node_path: args.node_path,
    from_state: args.from_state,
    to_state: args.to_state,
  }) as { removed?: boolean };
  return {
    removed: result?.removed ?? true,
    node_path: args.node_path,
    from_state: args.from_state,
    to_state: args.to_state,
    message: `Transition from '${args.from_state}' to '${args.to_state}' removed from AnimationTree state machine via Godot editor.`,
  };
}