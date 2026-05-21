import { readdirSync, statSync, readFileSync, existsSync } from 'fs';
import { join, relative } from 'path';

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
  const path = join(projectRoot, 'project.godot');
  if (!existsSync(path)) {
    throw new Error('project.godot not found');
  }

  const content = readFileSync(path, 'utf-8');
  const nameMatch = content.match(/config\/name="([^"]+)"/);
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