import type { GodotBridge } from '../godot-bridge.js';

// =============================================================================
// create_animation_tree
// =============================================================================

export interface CreateAnimationTreeArgs {
  parent_path: string;
  tree_name: string;
  root_type: 'node' | 'animation' | 'state_machine';
  root_node_path?: string;
}

export interface CreateAnimationTreeResult {
  created: boolean;
  tree_path: string;
  message: string;
}

export async function createAnimationTree(args: CreateAnimationTreeArgs, bridge: GodotBridge): Promise<CreateAnimationTreeResult> {
  if (!bridge.isConnected) {
    return {
      created: false,
      tree_path: '',
      message: 'create_animation_tree requires Godot editor to be running with the Godot MCP plugin enabled.',
    };
  }
  const result = await bridge.call('animtree.create', {
    parent_path: args.parent_path,
    tree_name: args.tree_name,
    root_type: args.root_type,
    root_node_path: args.root_node_path,
  }) as { tree_path?: string };
  return {
    created: true,
    tree_path: result?.tree_path || `${args.parent_path}/${args.tree_name}`,
    message: `AnimationTree '${args.tree_name}' created via Godot editor.`,
  };
}

// =============================================================================
// get_animation_tree_structure
// =============================================================================

export interface AnimationInfo {
  name: string;
  length: number;
  loop: boolean;
  has_seamless: boolean;
}

export interface StateMachineNodeInfo {
  name: string;
  type: 'state' | 'transition';
  next_node?: string;
  auto_advance?: boolean;
}

export interface GetAnimationTreeStructureArgs {
  tree_path: string;
}

export interface GetAnimationTreeStructureResult {
  root_type: string;
  root_node_path: string;
  animations: AnimationInfo[];
  state_machine_nodes: StateMachineNodeInfo[];
  parameters: string[];
  message: string;
}

export async function getAnimationTreeStructure(args: GetAnimationTreeStructureArgs, bridge: GodotBridge): Promise<GetAnimationTreeStructureResult> {
  if (!bridge.isConnected) {
    return {
      root_type: '',
      root_node_path: '',
      animations: [],
      state_machine_nodes: [],
      parameters: [],
      message: 'get_animation_tree_structure requires Godot editor to be running with the Godot MCP plugin enabled.',
    };
  }
  const result = await bridge.call('animtree.get_structure', {
    tree_path: args.tree_path,
  }) as {
    root_type?: string;
    root_node_path?: string;
    animations?: AnimationInfo[];
    state_machine_nodes?: StateMachineNodeInfo[];
    parameters?: string[];
  };
  return {
    root_type: result?.root_type || '',
    root_node_path: result?.root_node_path || '',
    animations: result?.animations || [],
    state_machine_nodes: result?.state_machine_nodes || [],
    parameters: result?.parameters || [],
    message: 'AnimationTree structure retrieved via Godot editor.',
  };
}

// =============================================================================
// set_tree_parameter
// =============================================================================

export interface SetTreeParameterArgs {
  tree_path: string;
  parameter_path: string;
  value: number | boolean | string | number[] | { x?: number; y?: number; z?: number; w?: number };
}

export interface SetTreeParameterResult {
  success: boolean;
  message: string;
}

export async function setTreeParameter(args: SetTreeParameterArgs, bridge: GodotBridge): Promise<SetTreeParameterResult> {
  if (!bridge.isConnected) {
    return {
      success: false,
      message: 'set_tree_parameter requires Godot editor to be running with the Godot MCP plugin enabled.',
    };
  }
  await bridge.call('animtree.set_parameter', {
    tree_path: args.tree_path,
    parameter_path: args.parameter_path,
    value: args.value,
  });
  return {
    success: true,
    message: `AnimationTree parameter '${args.parameter_path}' set via Godot editor.`,
  };
}

// =============================================================================
// add_state_machine_state
// =============================================================================

export interface AddStateMachineStateArgs {
  tree_path: string;
  state_name: string;
  state_type: 'state' | 'one_shot' | 'blend';
  position?: { x?: number; y?: number };
}

export interface AddStateMachineStateResult {
  added: boolean;
  state_name: string;
  message: string;
}

export async function addStateMachineState(args: AddStateMachineStateArgs, bridge: GodotBridge): Promise<AddStateMachineStateResult> {
  if (!bridge.isConnected) {
    return {
      added: false,
      state_name: '',
      message: 'add_state_machine_state requires Godot editor to be running with the Godot MCP plugin enabled.',
    };
  }
  const result = await bridge.call('animtree.add_state', {
    tree_path: args.tree_path,
    state_name: args.state_name,
    state_type: args.state_type,
    position: args.position,
  }) as { state_name?: string };
  return {
    added: true,
    state_name: result?.state_name || args.state_name,
    message: `State '${args.state_name}' added to AnimationTree state machine via Godot editor.`,
  };
}
