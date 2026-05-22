import type { GodotBridge } from '../godot-bridge.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { parseTscn, computeNodePaths, type SceneNode } from '../file-parser.js';
import { validateProjectPath } from './file.js';

export interface ReadSceneArgs {
  scene_path: string;
}

export interface SceneNodeResult {
  name: string;
  type: string;
  path: string;
  properties: Record<string, string>;
  children: SceneNodeResult[];
}

export interface ReadSceneResult {
  root: SceneNodeResult;
  nodeCount: number;
}

export function readScene(args: ReadSceneArgs, projectRoot: string): ReadSceneResult {
  const resolved = validateProjectPath(args.scene_path, projectRoot);
  if (!existsSync(resolved)) {
    throw new Error(`Scene not found: ${args.scene_path}`);
  }

  const content = readFileSync(resolved, 'utf-8');
  const parsed = parseTscn(content);
  const paths = computeNodePaths(parsed.nodes);

  const nodeMap = new Map<string, SceneNodeResult>();
  const rootNodes: SceneNodeResult[] = [];

  for (let i = 0; i < parsed.nodes.length; i++) {
    const node = parsed.nodes[i];
    const path = paths[i];
    const result: SceneNodeResult = {
      name: node.name,
      type: node.type,
      path,
      properties: node.properties,
      children: [],
    };
    nodeMap.set(path, result);

    if (!node.parent) {
      // Root node (no parent attribute)
      rootNodes.push(result);
    } else if (node.parent === '.') {
      // Child of root — add to the first root node found
      if (rootNodes.length > 0) {
        rootNodes[rootNodes.length - 1].children.push(result);
      } else {
        rootNodes.push(result);
      }
    } else {
      // Named parent — find and attach
      const parentPath = paths.find((p) => p.endsWith(`/${node.parent}`));
      if (parentPath) {
        const parent = nodeMap.get(parentPath);
        if (parent) parent.children.push(result);
      }
    }
  }

  return {
    root: rootNodes[0] || { name: '', type: '', path: '', properties: {}, children: [] },
    nodeCount: parsed.nodes.length,
  };
}

export interface CreateSceneArgs {
  scene_path: string;
  root_type: string;
  root_name: string;
}

export interface CreateSceneResult {
  path: string;
  created: boolean;
}

export function createScene(args: CreateSceneArgs, projectRoot: string): CreateSceneResult {
  const resolved = validateProjectPath(args.scene_path, projectRoot);
  if (existsSync(resolved)) {
    throw new Error(`Scene already exists: ${args.scene_path}`);
  }

  const content = `[gd_scene load_steps=1 format=3]

[node name="${args.root_name}" type="${args.root_type}"]
`;

  writeFileSync(resolved, content, 'utf-8');
  return { path: args.scene_path, created: true };
}

export interface SaveSceneArgs {
  scene_path: string;
}

export interface SaveSceneResult {
  saved: boolean;
  message: string;
}

export async function saveScene(args: SaveSceneArgs, projectRoot: string, bridge: GodotBridge): Promise<SaveSceneResult> {
  if (!bridge.isConnected) {
    return { saved: false, message: 'save_scene requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  await bridge.call('scene.open', { scene_path: args.scene_path } as Record<string, unknown>);
  await bridge.call('scene.save', { scene_path: args.scene_path } as Record<string, unknown>);
  return { saved: true, message: 'Scene saved via Godot editor.' };
}

export interface OpenSceneArgs {
  scene_path: string;
}

export interface OpenSceneResult {
  opened: boolean;
  message: string;
}

export function openScene(args: OpenSceneArgs, projectRoot: string, bridge: GodotBridge): OpenSceneResult {
  if (!bridge.isConnected) {
    return { opened: false, message: 'open_scene requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  bridge.call('scene.open', { scene_path: args.scene_path } as Record<string, unknown>);
  return { opened: true, message: 'Scene opened in Godot editor.' };
}