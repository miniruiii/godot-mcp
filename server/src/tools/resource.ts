import type { GodotBridge } from '../godot-bridge.js';

// =============================================================================
// read_resource
// =============================================================================

export interface ReadResourceArgs {
  path: string;
}

export interface ResourceProperty {
  name: string;
  type: string;
  value: string;
}

export interface ReadResourceResult {
  exists: boolean;
  path: string;
  resource_type: string;
  properties: ResourceProperty[];
  message: string;
}

export async function readResource(args: ReadResourceArgs, bridge: GodotBridge): Promise<ReadResourceResult> {
  if (!bridge.isConnected) {
    return { exists: false, path: args.path, resource_type: '', properties: [], message: 'read_resource requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  const result = await bridge.call('resource.read', { path: args.path }) as {
    exists?: boolean;
    resource_type?: string;
    properties?: ResourceProperty[];
  };
  return {
    exists: result?.exists ?? false,
    path: args.path,
    resource_type: result?.resource_type || '',
    properties: result?.properties || [],
    message: result?.exists ? 'Resource read via Godot editor.' : 'Resource not found.',
  };
}

// =============================================================================
// edit_resource
// =============================================================================

export interface EditResourceArgs {
  path: string;
  property: string;
  value: string;
}

export interface EditResourceResult {
  success: boolean;
  path: string;
  property: string;
  message: string;
}

export async function editResource(args: EditResourceArgs, bridge: GodotBridge): Promise<EditResourceResult> {
  if (!bridge.isConnected) {
    return { success: false, path: args.path, property: args.property, message: 'edit_resource requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  await bridge.call('resource.edit', {
    path: args.path,
    property: args.property,
    value: args.value,
  });
  return { success: true, path: args.path, property: args.property, message: 'Resource property edited via Godot editor.' };
}

// =============================================================================
// create_resource
// =============================================================================

export interface CreateResourceArgs {
  path: string;
  resource_type?: string;
}

export interface CreateResourceResult {
  created: boolean;
  path: string;
  resource_type: string;
  message: string;
}

export async function createResource(args: CreateResourceArgs, bridge: GodotBridge): Promise<CreateResourceResult> {
  if (!bridge.isConnected) {
    return { created: false, path: args.path, resource_type: args.resource_type || '', message: 'create_resource requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  const result = await bridge.call('resource.create', {
    path: args.path,
    resource_type: args.resource_type,
  }) as { created?: boolean; resource_type?: string };
  return {
    created: result?.created ?? true,
    path: args.path,
    resource_type: result?.resource_type || args.resource_type || '',
    message: 'Resource created via Godot editor.',
  };
}

// =============================================================================
// get_resource_preview
// =============================================================================

export interface GetResourcePreviewArgs {
  path: string;
}

export interface GetResourcePreviewResult {
  exists: boolean;
  path: string;
  preview_path: string;
  preview_type: string;
  message: string;
}

export async function getResourcePreview(args: GetResourcePreviewArgs, bridge: GodotBridge): Promise<GetResourcePreviewResult> {
  if (!bridge.isConnected) {
    return { exists: false, path: args.path, preview_path: '', preview_type: '', message: 'get_resource_preview requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  const result = await bridge.call('resource.get_preview', { path: args.path }) as {
    exists?: boolean;
    preview_path?: string;
    preview_type?: string;
  };
  return {
    exists: result?.exists ?? false,
    path: args.path,
    preview_path: result?.preview_path || '',
    preview_type: result?.preview_type || '',
    message: result?.exists ? 'Resource preview retrieved via Godot editor.' : 'Resource not found.',
  };
}

// =============================================================================
// add_autoload
// =============================================================================

export interface AddAutoloadArgs {
  name: string;
  path: string;
}

export interface AddAutoloadResult {
  success: boolean;
  name: string;
  path: string;
  message: string;
}

export async function addAutoload(args: AddAutoloadArgs, bridge: GodotBridge): Promise<AddAutoloadResult> {
  if (!bridge.isConnected) {
    return { success: false, name: args.name, path: args.path, message: 'add_autoload requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  await bridge.call('resource.add_autoload', {
    name: args.name,
    path: args.path,
  });
  return { success: true, name: args.name, path: args.path, message: 'Autoload singleton added via Godot editor.' };
}

// =============================================================================
// remove_autoload
// =============================================================================

export interface RemoveAutoloadArgs {
  name: string;
}

export interface RemoveAutoloadResult {
  success: boolean;
  name: string;
  message: string;
}

export async function removeAutoload(args: RemoveAutoloadArgs, bridge: GodotBridge): Promise<RemoveAutoloadResult> {
  if (!bridge.isConnected) {
    return { success: false, name: args.name, message: 'remove_autoload requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  await bridge.call('resource.remove_autoload', { name: args.name });
  return { success: true, name: args.name, message: 'Autoload singleton removed via Godot editor.' };
}