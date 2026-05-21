import type { GodotBridge } from '../godot-bridge.js';
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { resolve, relative, isAbsolute, normalize, extname } from 'path';
import { readFileTool, validateProjectPath } from './file.js';
import { writeFileTool } from './file.js';

// =============================================================================
// get_filesystem_tree
// =============================================================================

export interface GetFilesystemTreeArgs {
  path?: string;
  max_depth?: number;
}

export interface FilesystemTreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FilesystemTreeNode[];
}

export interface GetFilesystemTreeResult {
  tree: FilesystemTreeNode;
  total_files: number;
  total_directories: number;
  message: string;
}

function buildTree(dirPath: string, currentDepth: number, maxDepth: number): FilesystemTreeNode {
  const name = dirPath.split(/[/\\]/).pop() || dirPath;
  const node: FilesystemTreeNode = {
    name,
    path: dirPath,
    type: 'directory',
    children: [],
  };

  if (currentDepth >= maxDepth) {
    return node;
  }

  try {
    const entries = readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      // Skip hidden files and common ignored directories
      if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'tmp') {
        continue;
      }

      const fullPath = resolve(dirPath, entry.name);
      if (entry.isDirectory()) {
        node.children!.push(buildTree(fullPath, currentDepth + 1, maxDepth));
      } else {
        node.children!.push({
          name: entry.name,
          path: fullPath,
          type: 'file',
        });
      }
    }
  } catch {
    // Skip directories that can't be read
  }

  return node;
}

function countTreeContents(node: FilesystemTreeNode): { files: number; dirs: number } {
  let files = 0;
  let dirs = 0;

  if (node.type === 'directory') {
    dirs++;
    if (node.children) {
      for (const child of node.children) {
        const childCounts = countTreeContents(child);
        files += childCounts.files;
        dirs += childCounts.dirs;
      }
    }
  } else {
    files++;
  }

  return { files, dirs };
}

export async function getFilesystemTree(args: GetFilesystemTreeArgs, bridge: GodotBridge, projectRoot: string): Promise<GetFilesystemTreeResult> {
  if (bridge.isConnected) {
    const result = await bridge.call('utility.filesystem_tree', {
      path: args.path || 'res://',
      max_depth: args.max_depth || 3,
    }) as { tree?: FilesystemTreeNode; total_files?: number; total_directories?: number };
    return {
      tree: result?.tree || { name: 'root', path: '', type: 'directory', children: [] },
      total_files: result?.total_files || 0,
      total_directories: result?.total_directories || 0,
      message: 'Filesystem tree retrieved via Godot editor.',
    };
  }

  // Offline fallback: read from filesystem
  const targetPath = args.path
    ? resolve(projectRoot, args.path.replace('res://', ''))
    : projectRoot;

  if (!existsSync(targetPath)) {
    return {
      tree: { name: 'root', path: targetPath, type: 'directory', children: [] },
      total_files: 0,
      total_directories: 0,
      message: `Path not found: ${args.path || 'res://'}`,
    };
  }

  const maxDepth = args.max_depth ?? 3;
  const tree = buildTree(targetPath, 0, maxDepth);
  const counts = countTreeContents(tree);

  return {
    tree,
    total_files: counts.files,
    total_directories: counts.dirs,
    message: 'Filesystem tree retrieved from project directory.',
  };
}

// =============================================================================
// search_files
// =============================================================================

export interface SearchFilesArgs {
  query: string;
  path?: string;
  file_filter?: string;
  case_sensitive?: boolean;
  max_results?: number;
}

export interface SearchMatch {
  file: string;
  line: number;
  content: string;
  match_range: { start: number; end: number };
}

export interface SearchFilesResult {
  matches: SearchMatch[];
  total_matches: number;
  files_searched: number;
  message: string;
}

function searchInDirectory(
  dirPath: string,
  query: string,
  fileFilter: string | undefined,
  caseSensitive: boolean,
  maxResults: number,
  currentResults: SearchMatch[],
  projectRoot: string
): number {
  if (currentResults.length >= maxResults) {
    return currentResults.length;
  }

  try {
    const entries = readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (currentResults.length >= maxResults) {
        break;
      }

      if (entry.name.startsWith('.') || entry.name === 'node_modules') {
        continue;
      }

      const fullPath = resolve(dirPath, entry.name);
      if (entry.isDirectory()) {
        searchInDirectory(fullPath, query, fileFilter, caseSensitive, maxResults, currentResults, projectRoot);
      } else if (entry.isFile()) {
        // Apply file filter if specified
        if (fileFilter) {
          const ext = extname(entry.name);
          const filterPatterns = fileFilter.split(',').map(p => p.trim());
          if (!filterPatterns.some(pattern => {
            if (pattern.startsWith('*')) {
              return ext === pattern.slice(1);
            }
            return entry.name === pattern;
          })) {
            continue;
          }
        }

        try {
          const content = readFileSync(fullPath, 'utf-8');
          const lines = content.split('\n');
          const searchQuery = caseSensitive ? query : query.toLowerCase();
          const searchContent = caseSensitive ? content : content.toLowerCase();

          let searchIndex = 0;
          while (searchIndex < searchContent.length && currentResults.length < maxResults) {
            const matchPos = searchContent.indexOf(searchQuery, searchIndex);
            if (matchPos === -1) break;

            const lineNumber = content.substring(0, matchPos).split('\n').length;
            const lineStart = content.lastIndexOf('\n', matchPos) + 1;
            const lineEnd = content.indexOf('\n', matchPos);
            const lineContent = content.substring(lineStart, lineEnd === -1 ? content.length : lineEnd);

            currentResults.push({
              file: relative(projectRoot, fullPath).replace(/\\/g, '/'),
              line: lineNumber,
              content: lineContent.trim(),
              match_range: { start: matchPos - lineStart, end: matchPos - lineStart + query.length },
            });

            searchIndex = matchPos + 1;
          }
        } catch {
          // Skip files that can't be read
        }
      }
    }
  } catch {
    // Skip directories that can't be read
  }

  return currentResults.length;
}

export async function searchFiles(args: SearchFilesArgs, bridge: GodotBridge, projectRoot: string): Promise<SearchFilesResult> {
  if (bridge.isConnected) {
    const result = await bridge.call('utility.search_files', {
      query: args.query,
      path: args.path || 'res://',
      file_filter: args.file_filter,
      case_sensitive: args.case_sensitive ?? false,
      max_results: args.max_results || 100,
    }) as { matches?: SearchMatch[]; total_matches?: number; files_searched?: number };
    return {
      matches: result?.matches || [],
      total_matches: result?.total_matches || 0,
      files_searched: result?.files_searched || 0,
      message: 'Search completed via Godot editor.',
    };
  }

  // Offline fallback: search filesystem directly
  const targetPath = args.path
    ? resolve(projectRoot, args.path.replace('res://', ''))
    : projectRoot;

  if (!existsSync(targetPath)) {
    return {
      matches: [],
      total_matches: 0,
      files_searched: 0,
      message: `Path not found: ${args.path || 'res://'}`,
    };
  }

  const matches: SearchMatch[] = [];
  const maxResults = args.max_results || 100;
  searchInDirectory(
    targetPath,
    args.query,
    args.file_filter,
    args.case_sensitive ?? false,
    maxResults,
    matches,
    projectRoot
  );

  return {
    matches,
    total_matches: matches.length,
    files_searched: 1, // Approximate
    message: `Search completed in project directory. Found ${matches.length} matches.`,
  };
}

// =============================================================================
// get_project_settings
// =============================================================================

export interface GetProjectSettingsArgs {
  section?: string;
}

export interface ProjectSetting {
  name: string;
  value: string | number | boolean;
  type: string;
}

export interface GetProjectSettingsResult {
  settings: ProjectSetting[];
  total_count: number;
  message: string;
}

function parseProjectGodot(content: string): ProjectSetting[] {
  const settings: ProjectSetting[] = [];
  const lines = content.split('\n');
  let currentSection = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('[')) {
      currentSection = trimmed.replace(/[\[\]]/g, '');
      continue;
    }

    if (trimmed.startsWith('#') || trimmed.startsWith(';') || trimmed === '') {
      continue;
    }

    const match = trimmed.match(/^([\w\/]+)\s*=\s*(.+)$/);
    if (match) {
      const name = match[1];
      let value: string | number | boolean = match[2];
      let type = 'string';

      // Parse value type
      if (value === 'true' || value === 'false') {
        value = value === 'true';
        type = 'bool';
      } else if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
        type = 'string';
      } else if (!isNaN(parseFloat(value))) {
        value = parseFloat(value);
        type = 'float';
      }

      settings.push({ name: `${currentSection}/${name}`, value, type });
    }
  }

  return settings;
}

export async function getProjectSettings(args: GetProjectSettingsArgs, bridge: GodotBridge, projectRoot: string): Promise<GetProjectSettingsResult> {
  if (bridge.isConnected) {
    const result = await bridge.call('utility.get_project_settings', {
      section: args.section,
    }) as { settings?: ProjectSetting[]; total_count?: number };
    return {
      settings: result?.settings || [],
      total_count: result?.total_count || 0,
      message: 'Project settings retrieved via Godot editor.',
    };
  }

  // Offline fallback: read project.godot directly
  const projectFile = resolve(projectRoot, 'project.godot');
  if (!existsSync(projectFile)) {
    return {
      settings: [],
      total_count: 0,
      message: 'project.godot not found in project root.',
    };
  }

  const content = readFileSync(projectFile, 'utf-8');
  let settings = parseProjectGodot(content);

  // Filter by section if specified
  if (args.section) {
    const sectionPrefix = args.section.replace(/[\[\]]/g, '') + '/';
    settings = settings.filter(s => s.name.startsWith(sectionPrefix));
  }

  return {
    settings,
    total_count: settings.length,
    message: `Project settings retrieved from project.godot. Found ${settings.length} settings.`,
  };
}

// =============================================================================
// set_project_setting
// =============================================================================

export interface SetProjectSettingArgs {
  name: string;
  value: string | number | boolean;
  type?: 'string' | 'int' | 'float' | 'bool';
}

export interface SetProjectSettingResult {
  success: boolean;
  name: string;
  previous_value?: string | number | boolean;
  message: string;
}

export async function setProjectSetting(args: SetProjectSettingArgs, bridge: GodotBridge, projectRoot: string): Promise<SetProjectSettingResult> {
  if (bridge.isConnected) {
    const result = await bridge.call('utility.set_project_setting', {
      name: args.name,
      value: args.value,
      type: args.type,
    }) as { success?: boolean; previous_value?: string | number | boolean };
    return {
      success: result?.success ?? true,
      name: args.name,
      previous_value: result?.previous_value,
      message: `Project setting '${args.name}' updated via Godot editor.`,
    };
  }

  // Offline fallback: directly modify project.godot
  const projectFile = resolve(projectRoot, 'project.godot');
  if (!existsSync(projectFile)) {
    return {
      success: false,
      name: args.name,
      message: 'project.godot not found in project root.',
    };
  }

  const content = readFileSync(projectFile, 'utf-8');
  const lines = content.split('\n');
  const settingName = args.name.includes('/') ? args.name.split('/').pop()! : args.name;

  // Find section for the setting
  let targetSection = '';
  const settingParts = args.name.split('/');
  if (settingParts.length > 1) {
    targetSection = settingParts.slice(0, -1).join('/');
  }

  let inTargetSection = targetSection === '';
  let found = false;
  let previousValue: string | number | boolean | undefined;
  const newLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Track section
    if (trimmed.startsWith('[')) {
      const sectionName = trimmed.replace(/[\[\]]/g, '');
      inTargetSection = targetSection === '' ? true : sectionName === targetSection;
      newLines.push(line);
      continue;
    }

    if (!inTargetSection) {
      newLines.push(line);
      continue;
    }

    // Check if this is a comment or empty line
    if (trimmed.startsWith('#') || trimmed.startsWith(';') || trimmed === '') {
      newLines.push(line);
      continue;
    }

    // Check if this line matches our setting
    const match = trimmed.match(/^([\w\/]+)\s*=\s*(.+)$/);
    if (match && match[1] === args.name) {
      found = true;
      previousValue = match[2];

      // Format value based on type
      let valueStr: string;
      switch (args.type) {
        case 'int':
          valueStr = String(Math.floor(Number(args.value)));
          break;
        case 'float':
          valueStr = String(Number(args.value));
          break;
        case 'bool':
          valueStr = args.value ? 'true' : 'false';
          break;
        case 'string':
        default:
          valueStr = `"${args.value}"`;
          break;
      }

      // Replace with new value, preserving indentation
      const indent = line.match(/^\s*/)?.[0] || '';
      newLines.push(`${indent}${settingName}=${valueStr}`);
    } else {
      newLines.push(line);
    }
  }

  if (!found) {
    // Add new setting
    let insertIndex = lines.length;
    if (targetSection) {
      // Find end of section
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith(`[${targetSection}]`)) {
          insertIndex = i + 1;
          // Find first non-comment, non-empty line in section or next section
          while (insertIndex < lines.length) {
            const nextLine = lines[insertIndex].trim();
            if (nextLine === '' || nextLine.startsWith('#') || nextLine.startsWith(';')) {
              insertIndex++;
            } else if (nextLine.startsWith('[')) {
              break;
            } else {
              // Found first setting, insert before it
              break;
            }
          }
          break;
        }
      }
    }

    const indent = lines[insertIndex - 1]?.match(/^\s*/)?.[0] || '  ';
    const valueStr = args.type === 'string' ? `"${args.value}"` : String(args.value);
    newLines.splice(insertIndex, 0, `${indent}${settingName}=${valueStr}`);
  }

  try {
    // Create backup
    const backupFile = projectFile + '.bak';
    writeFileSync(backupFile, content, 'utf-8');

    // Write modified content
    writeFileSync(projectFile, newLines.join('\n'), 'utf-8');

    return {
      success: true,
      name: args.name,
      previous_value: previousValue,
      message: `Project setting '${args.name}' updated in project.godot.`,
    };
  } catch (err) {
    return {
      success: false,
      name: args.name,
      message: `Failed to update project.godot: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

// =============================================================================
// uid_to_project_path
// =============================================================================

export interface UidToProjectPathArgs {
  uid: string;
}

export interface UidToProjectPathResult {
  uid: string;
  project_path: string;
  exists: boolean;
  message: string;
}

export async function uidToProjectPath(args: UidToProjectPathArgs, bridge: GodotBridge, projectRoot: string): Promise<UidToProjectPathResult> {
  if (bridge.isConnected) {
    const result = await bridge.call('utility.uid_to_project_path', {
      uid: args.uid,
    }) as { project_path?: string; exists?: boolean };
    return {
      uid: args.uid,
      project_path: result?.project_path || '',
      exists: result?.exists ?? false,
      message: 'UID converted to project path via Godot editor.',
    };
  }

  // Offline fallback: look up UID in project.godot
  if (!args.uid.startsWith('uid://')) {
    return {
      uid: args.uid,
      project_path: '',
      exists: false,
      message: `Invalid UID format: ${args.uid}. Expected format: uid://...`,
    };
  }

  const projectFile = resolve(projectRoot, 'project.godot');
  if (!existsSync(projectFile)) {
    return {
      uid: args.uid,
      project_path: '',
      exists: false,
      message: 'project.godot not found in project root.',
    };
  }

  const content = readFileSync(projectFile, 'utf-8');

  // Look for uid:// mapping in project.godot
  // Format is typically: [remaps] uid://XXXX/path="path"
  const uidPattern = new RegExp(`uid://\\w+.*?="${args.uid.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^"]+)"`, 'i');
  const match = content.match(uidPattern);

  if (match) {
    const path = match[1];
    return {
      uid: args.uid,
      project_path: path,
      exists: existsSync(resolve(projectRoot, path.replace('res://', ''))),
      message: `UID ${args.uid} maps to ${path}`,
    };
  }

  return {
    uid: args.uid,
    project_path: '',
    exists: false,
    message: `UID ${args.uid} not found in project.godot remaps.`,
  };
}

// =============================================================================
// project_path_to_uid
// =============================================================================

export interface ProjectPathToUidArgs {
  project_path: string;
}

export interface ProjectPathToUidResult {
  project_path: string;
  uid: string;
  exists: boolean;
  message: string;
}

export async function projectPathToUid(args: ProjectPathToUidArgs, bridge: GodotBridge, projectRoot: string): Promise<ProjectPathToUidResult> {
  if (bridge.isConnected) {
    const result = await bridge.call('utility.project_path_to_uid', {
      project_path: args.project_path,
    }) as { uid?: string; exists?: boolean };
    return {
      project_path: args.project_path,
      uid: result?.uid || '',
      exists: result?.exists ?? false,
      message: 'Project path converted to UID via Godot editor.',
    };
  }

  // Offline fallback: look up path in project.godot
  const projectFile = resolve(projectRoot, 'project.godot');
  if (!existsSync(projectFile)) {
    return {
      project_path: args.project_path,
      uid: '',
      exists: false,
      message: 'project.godot not found in project root.',
    };
  }

  const content = readFileSync(projectFile, 'utf-8');
  const normalizedPath = args.project_path.replace(/\\/g, '/');

  // Look for path mapping in project.godot remaps
  // Format is typically: [remaps] uid://XXXX/path="res://path"
  const pathPattern = new RegExp(`(uid://\\w+)\\s*="${normalizedPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'i');
  const match = content.match(pathPattern);

  if (match) {
    return {
      project_path: args.project_path,
      uid: match[1],
      exists: true,
      message: `Path ${args.project_path} maps to UID ${match[1]}`,
    };
  }

  // If path starts with res:// and has no UID mapping, try to construct expected UID
  if (normalizedPath.startsWith('res://')) {
    return {
      project_path: args.project_path,
      uid: '',
      exists: false,
      message: `Path ${args.project_path} not found in project.godot remaps.`,
    };
  }

  return {
    project_path: args.project_path,
    uid: '',
    exists: false,
    message: `Path ${args.project_path} not found in project.godot remaps.`,
  };
}