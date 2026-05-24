import { readdirSync, statSync, readFileSync, existsSync } from 'fs';
import { join, relative, resolve } from 'path';
import type { GodotBridge } from '../godot-bridge.js';

function resolveProjectRoot(rawPath: string): string {
  const base = resolve(rawPath);
  // If project.godot exists at the configured path, use it directly
  if (existsSync(join(base, 'project.godot'))) {
    return base;
  }
  // Try to find project.godot in subdirectories (up to 2 levels deep)
  try {
    for (const entry of readdirSync(base)) {
      const level1 = join(base, entry);
      if (!statSync(level1).isDirectory()) continue;
      if (existsSync(join(level1, 'project.godot'))) {
        return level1;
      }
      for (const sub of readdirSync(level1)) {
        const level2 = join(level1, sub);
        if (statSync(level2).isDirectory() && existsSync(join(level2, 'project.godot'))) {
          return level2;
        }
      }
    }
  } catch {
    // Ignore read errors and fall back to original path
  }
  return base;
}

export interface ListFilesArgs {
  extension?: string;
}

export interface ProjectFilesResult {
  files: string[];
  count: number;
}

export function listProjectFiles(args: ListFilesArgs, projectRoot: string): ProjectFilesResult {
  const files: string[] = [];

  function walk(dir: string) {
    for (const entry of readdirSync(dir)) {
      if (entry === 'node_modules' || entry === '.git' || entry === 'dist') continue;
      const full = join(dir, entry);
      const stat = statSync(full);
      if (stat.isDirectory()) {
        walk(full);
      } else {
        const rel = relative(projectRoot, full).replace(/\\/g, '/');
        if (!args.extension || rel.endsWith(args.extension)) {
          files.push(rel);
        }
      }
    }
  }

  walk(projectRoot);
  return { files, count: files.length };
}

export interface ProjectSettingsResult {
  name: string;
  features: string[];
  rendering: string;
}

export function readProjectSettings(_args: Record<string, unknown>, projectRoot: string): ProjectSettingsResult {
  const root = resolveProjectRoot(projectRoot);
  const path = join(root, 'project.godot');
  if (!existsSync(path)) {
    throw new Error('project.godot not found');
  }

  const content = readFileSync(path, 'utf-8');
  // Godot 4.x uses either config/name="..." or [application] section with name="..."
  const nameMatch = content.match(/(?:^|\n)(?:config\/)?name="([^"]+)"/m);
  const featuresMatch = content.match(/config\/features=PackedStringArray\(([^)]+)\)/);
  const renderingMatch = content.match(/renderer\/rendering_method="([^"]+)"/);

  const features = featuresMatch
    ? featuresMatch[1].split(',').map((f) => f.trim().replace(/"/g, '')).filter(Boolean)
    : [];

  return {
    name: nameMatch ? nameMatch[1] : 'Unknown',
    features,
    rendering: renderingMatch ? renderingMatch[1] : 'Unknown',
  };
}

export interface ProjectInfoResult {
  engine: string;
  engineVersion: string;
  rendering: string;
}

export function getProjectInfo(_args: Record<string, unknown>, projectRoot: string): ProjectInfoResult {
  const settings = readProjectSettings({}, projectRoot);
  const godotVersion = settings.features.find((f) => /^\d+\.\d+/.test(f)) || '4.x';

  return {
    engine: 'Godot',
    engineVersion: godotVersion,
    rendering: settings.rendering,
  };
}

export async function uidToProjectPath(args: { uid: string }, bridge: GodotBridge): Promise<{ uid: string; path: string }> {
  return bridge.call('project.uid_to_path', args) as Promise<{ uid: string; path: string }>;
}

export async function projectPathToUid(args: { path: string }, bridge: GodotBridge): Promise<{ path: string; uid: string }> {
  return bridge.call('project.path_to_uid', args) as Promise<{ path: string; uid: string }>;
}

export async function rescanResources(_args: Record<string, unknown>, bridge: GodotBridge): Promise<{ scanned: boolean }> {
  return bridge.call('project.rescan_resources', _args) as Promise<{ scanned: boolean }>;
}

export async function removeUid(args: { uid: string }, bridge: GodotBridge): Promise<{ uid: string; path: string; removed: boolean }> {
  return bridge.call('project.remove_uid', args) as Promise<{ uid: string; path: string; removed: boolean }>;
}