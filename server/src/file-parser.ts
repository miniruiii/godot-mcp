import { readFileSync } from 'fs';

export interface SceneNode {
  name: string;
  type: string;
  parent?: string;
  properties: Record<string, string>;
}

export interface ExtResource {
  type: string;
  path: string;
  id: string;
}

export interface SubResource {
  type: string;
  id: string;
  properties: Record<string, string>;
}

export interface ParsedScene {
  format: number;
  nodes: SceneNode[];
  extResources: ExtResource[];
  subResources: SubResource[];
}

export interface GodotFile {
  content: string;
  language?: string;
}

export function parseTscn(content: string): ParsedScene {
  const scene: ParsedScene = { format: 3, nodes: [], extResources: [], subResources: [] };
  const lines = content.split('\n');
  let currentNode: SceneNode | null = null;
  let currentSubRes: SubResource | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trimEnd();
    const trimmed = line.trim();

    if (trimmed.startsWith('[gd_scene')) {
      const formatMatch = trimmed.match(/format=(\d+)/);
      if (formatMatch) scene.format = parseInt(formatMatch[1], 10);
      currentNode = null;
      currentSubRes = null;
    } else if (trimmed.startsWith('[ext_resource')) {
      const typeMatch = trimmed.match(/type="([^"]+)"/);
      const pathMatch = trimmed.match(/path="([^"]+)"/);
      const idMatch = trimmed.match(/id="([^"]+)"/);
      if (typeMatch && pathMatch && idMatch) {
        scene.extResources.push({
          type: typeMatch[1],
          path: pathMatch[1],
          id: idMatch[1],
        });
      }
      currentNode = null;
      currentSubRes = null;
    } else if (trimmed.startsWith('[sub_resource')) {
      const typeMatch = trimmed.match(/type="([^"]+)"/);
      const idMatch = trimmed.match(/id="([^"]+)"/);
      if (typeMatch && idMatch) {
        currentSubRes = { type: typeMatch[1], id: idMatch[1], properties: {} };
        scene.subResources.push(currentSubRes);
      }
      currentNode = null;
    } else if (trimmed.startsWith('[node')) {
      const nameMatch = trimmed.match(/name="([^"]+)"/);
      const typeMatch = trimmed.match(/type="([^"]+)"/);
      const parentMatch = trimmed.match(/parent="([^"]+)"/);
      if (nameMatch && typeMatch) {
        currentNode = {
          name: nameMatch[1],
          type: typeMatch[1],
          parent: parentMatch ? parentMatch[1] : undefined,
          properties: {},
        };
        scene.nodes.push(currentNode);
      }
      currentSubRes = null;
    } else if (trimmed.startsWith('[')) {
      currentNode = null;
      currentSubRes = null;
    } else if (currentNode && trimmed.includes('=')) {
      const eqIdx = trimmed.indexOf('=');
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim();
      currentNode.properties[key] = value;
    } else if (currentSubRes && trimmed.includes('=')) {
      const eqIdx = trimmed.indexOf('=');
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim();
      currentSubRes.properties[key] = value;
    }
  }

  return scene;
}

export function computeNodePaths(nodes: SceneNode[]): string[] {
  const paths: string[] = [];
  const pathMap = new Map<string, string>();
  let rootPath = '';

  for (const node of nodes) {
    let path: string;
    if (!node.parent) {
      path = `/root/${node.name}`;
      rootPath = path;
    } else if (node.parent === '.') {
      path = rootPath ? `${rootPath}/${node.name}` : `/root/${node.name}`;
    } else {
      const parentPath = pathMap.get(node.parent);
      path = parentPath ? `${parentPath}/${node.name}` : `/root/${node.parent}/${node.name}`;
    }
    paths.push(path);
    pathMap.set(node.name, path);
  }

  return paths;
}

export function readGodotFile(filePath: string): GodotFile {
  let content: string;
  try {
    content = readFileSync(filePath, 'utf-8');
  } catch (err) {
    throw new Error(`Failed to read file ${filePath}: ${err instanceof Error ? err.message : err}`);
  }
  const ext = filePath.split('.').pop()?.toLowerCase();
  let language: string | undefined;

  switch (ext) {
    case 'gd':
      language = 'gdscript';
      break;
    case 'cs':
      language = 'csharp';
      break;
    case 'tscn':
    case 'tres':
      language = 'godot-resource';
      break;
  }

  return { content, language };
}
