import type { GodotBridge } from '../godot-bridge.js';

// =============================================================================
// set_blend_tree_node
// =============================================================================

export interface SetBlendTreeNodeArgs {
  animation_tree_path: string;
  node_name: string;
  node_type: 'BlendTreeNode' | 'AnimationNodeBlendTree' | 'AnimationNodeOneShot' | 'AnimationNodeBlendSpace1D' | 'AnimationNodeBlendSpace2D' | 'AnimationNodeStateMachine' | 'AnimationNodeStateMachineBase';
  position?: { x: number; y: number };
  parameters?: Record<string, number | boolean | string>;
}

export interface SetBlendTreeNodeResult {
  success: boolean;
  node_name: string;
  animation_tree_path: string;
  message: string;
}

export async function setBlendTreeNode(args: SetBlendTreeNodeArgs, bridge: GodotBridge): Promise<SetBlendTreeNodeResult> {
  if (!bridge.isConnected) {
    return {
      success: false,
      node_name: args.node_name,
      animation_tree_path: args.animation_tree_path,
      message: 'set_blend_tree_node requires Godot editor to be running with the Godot MCP plugin enabled.',
    };
  }
  const result = await bridge.call('blendtree.set_node', {
    animation_tree_path: args.animation_tree_path,
    node_name: args.node_name,
    node_type: args.node_type,
    position: args.position,
    parameters: args.parameters,
  }) as { success?: boolean; node_name?: string };
  return {
    success: result?.success ?? true,
    node_name: result?.node_name || args.node_name,
    animation_tree_path: args.animation_tree_path,
    message: `BlendTree node '${args.node_name}' configured via Godot editor.`,
  };
}