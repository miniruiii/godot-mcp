import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve, isAbsolute, normalize } from 'path';
import type { GodotBridge } from '../godot-bridge.js';

// =============================================================================
// create_shader
// =============================================================================

export interface CreateShaderArgs {
  path: string;
  shader_type?: 'visual' | 'text';
  name?: string;
}

export interface CreateShaderResult {
  created: boolean;
  path: string;
  message: string;
}

function getDefaultShaderCode(shaderType: 'visual' | 'text' = 'text'): string {
  if (shaderType === 'visual') {
    return `shader_type visual;

render_mode blend_mix;

fragment(". *") {
}
`;
  }
  return `shader_type canvas_item;

void fragment() {
  // Called for every pixel the shader is used on.
}
`;
}

export async function createShader(args: CreateShaderArgs, bridge: GodotBridge, projectRoot: string): Promise<CreateShaderResult> {
  const shaderType = args.shader_type || 'text';
  const resolved = resolveShaderPath(args.path, projectRoot);

  if (existsSync(resolved)) {
    return { created: false, path: args.path, message: `Shader file already exists: ${args.path}` };
  }

  if (bridge.isConnected) {
    const result = await bridge.call('shader.create', {
      path: args.path,
      shader_type: shaderType,
      name: args.name,
    }) as { path?: string };
    return {
      created: true,
      path: result?.path || args.path,
      message: `Shader created via Godot editor.`,
    };
  }

  // Offline fallback: create file with template
  const template = getDefaultShaderCode(shaderType);
  writeFileSync(resolved, template, 'utf-8');
  return {
    created: true,
    path: args.path,
    message: `Shader file created at ${args.path}.`,
  };
}

// =============================================================================
// read_shader
// =============================================================================

export interface ReadShaderArgs {
  path: string;
}

export interface ReadShaderResult {
  content: string;
  size: number;
  message: string;
}

export async function readShader(args: ReadShaderArgs, bridge: GodotBridge, projectRoot: string): Promise<ReadShaderResult> {
  const resolved = resolveShaderPath(args.path, projectRoot);

  if (bridge.isConnected) {
    const result = await bridge.call('shader.read', {
      path: args.path,
    }) as { content?: string; size?: number };
    return {
      content: result?.content || '',
      size: result?.size ?? 0,
      message: 'Shader content retrieved via Godot editor.',
    };
  }

  // Offline fallback: read from file system
  if (!existsSync(resolved)) {
    return { content: '', size: 0, message: `Shader file not found: ${args.path}` };
  }
  const content = readFileSync(resolved, 'utf-8');
  return {
    content,
    size: Buffer.byteLength(content),
    message: `Shader content retrieved from file system.`,
  };
}

// =============================================================================
// edit_shader
// =============================================================================

export interface EditShaderArgs {
  path: string;
  content?: string;
  start_line?: number;
  end_line?: number;
}

export interface EditShaderResult {
  edited: boolean;
  path: string;
  message: string;
}

export async function editShader(args: EditShaderArgs, bridge: GodotBridge, projectRoot: string): Promise<EditShaderResult> {
  if (!args.content && (args.start_line === undefined || args.end_line === undefined)) {
    return { edited: false, path: args.path, message: 'Either content or line range (start_line, end_line) must be provided.' };
  }

  if (bridge.isConnected) {
    const result = await bridge.call('shader.edit', {
      path: args.path,
      content: args.content,
      start_line: args.start_line,
      end_line: args.end_line,
    }) as { edited?: boolean };
    return {
      edited: result?.edited ?? true,
      path: args.path,
      message: 'Shader edited via Godot editor.',
    };
  }

  // Offline fallback: file system edit
  const resolved = resolveShaderPath(args.path, projectRoot);
  if (!existsSync(resolved)) {
    return { edited: false, path: args.path, message: `Shader file not found: ${args.path}` };
  }

  let fileContent = readFileSync(resolved, 'utf-8');

  if (args.start_line !== undefined && args.end_line !== undefined) {
    const lines = fileContent.split('\n');
    const start = Math.max(0, args.start_line - 1);
    const end = Math.min(lines.length, args.end_line);
    if (args.content) {
      lines.splice(start, end - start, args.content);
      fileContent = lines.join('\n');
    } else {
      return { edited: false, path: args.path, message: 'Content must be provided when using line range.' };
    }
  } else if (args.content) {
    fileContent = args.content;
  }

  writeFileSync(resolved, fileContent, 'utf-8');
  return {
    edited: true,
    path: args.path,
    message: `Shader edited at ${args.path}.`,
  };
}

// =============================================================================
// assign_shader_material
// =============================================================================

export interface AssignShaderMaterialArgs {
  node_path: string;
  shader_path: string;
  material_name?: string;
}

export interface AssignShaderMaterialResult {
  assigned: boolean;
  node_path: string;
  material_path: string;
  message: string;
}

export async function assignShaderMaterial(args: AssignShaderMaterialArgs, bridge: GodotBridge): Promise<AssignShaderMaterialResult> {
  if (!bridge.isConnected) {
    return { assigned: false, node_path: '', material_path: '', message: 'assign_shader_material requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  const result = await bridge.call('shader.assign_material', {
    node_path: args.node_path,
    shader_path: args.shader_path,
    material_name: args.material_name,
  }) as { node_path?: string; material_path?: string };
  return {
    assigned: true,
    node_path: result?.node_path || args.node_path,
    material_path: result?.material_path || '',
    message: `ShaderMaterial assigned to ${args.node_path} via Godot editor.`,
  };
}

// =============================================================================
// set_shader_param
// =============================================================================

export interface SetShaderParamArgs {
  node_path: string;
  param_name: string;
  param_value: number | boolean | number[] | { x?: number; y?: number; z?: number; w?: number };
}

export interface SetShaderParamResult {
  success: boolean;
  message: string;
}

export async function setShaderParam(args: SetShaderParamArgs, bridge: GodotBridge): Promise<SetShaderParamResult> {
  if (!bridge.isConnected) {
    return { success: false, message: 'set_shader_param requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  await bridge.call('shader.set_param', {
    node_path: args.node_path,
    param_name: args.param_name,
    param_value: args.param_value,
  });
  return { success: true, message: `Shader parameter '${args.param_name}' set via Godot editor.` };
}

// =============================================================================
// get_shader_params
// =============================================================================

export interface ShaderUniformInfo {
  name: string;
  type: string;
  default_value?: string;
}

export interface GetShaderParamsArgs {
  node_path: string;
}

export interface GetShaderParamsResult {
  uniforms: ShaderUniformInfo[];
  message: string;
}

export async function getShaderParams(args: GetShaderParamsArgs, bridge: GodotBridge): Promise<GetShaderParamsResult> {
  if (!bridge.isConnected) {
    return { uniforms: [], message: 'get_shader_params requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  const result = await bridge.call('shader.get_params', {
    node_path: args.node_path,
  }) as { uniforms?: ShaderUniformInfo[] };
  return {
    uniforms: result?.uniforms || [],
    message: 'Shader uniforms retrieved via Godot editor.',
  };
}

// =============================================================================
// Helpers
// =============================================================================

function resolveShaderPath(filePath: string, projectRoot: string): string {
  if (filePath.startsWith('res://')) {
    return resolve(projectRoot, filePath.slice(6));
  }
  if (isAbsolute(filePath)) {
    return normalize(filePath);
  }
  return resolve(projectRoot, filePath);
}