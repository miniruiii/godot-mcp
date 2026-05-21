import { writeFileSync, readFileSync, existsSync } from 'fs';
import { validateProjectPath } from './file.js';

export interface CreateScriptArgs {
  script_path: string;
  extends_type?: string;
  template?: string;
}

export interface CreateScriptResult {
  path: string;
  created: boolean;
}

export function createScript(args: CreateScriptArgs, projectRoot: string): CreateScriptResult {
  const resolved = validateProjectPath(args.script_path, projectRoot);
  if (existsSync(resolved)) {
    throw new Error(`Script already exists: ${args.script_path}`);
  }

  const extendsType = args.extends_type || 'Node';
  const content = args.template || `extends ${extendsType}\n\nfunc _ready():\n    pass\n`;

  writeFileSync(resolved, content, 'utf-8');
  return { path: args.script_path, created: true };
}

export interface ReadScriptArgs {
  script_path: string;
}

export interface ReadScriptResult {
  content: string;
  language: string;
  lineCount: number;
}

export function readScript(args: ReadScriptArgs, projectRoot: string): ReadScriptResult {
  const resolved = validateProjectPath(args.script_path, projectRoot);
  if (!existsSync(resolved)) {
    throw new Error(`Script not found: ${args.script_path}`);
  }

  const content = readFileSync(resolved, 'utf-8');
  const ext = args.script_path.split('.').pop()?.toLowerCase();
  const language = ext === 'gd' ? 'gdscript' : ext === 'cs' ? 'csharp' : 'unknown';

  return {
    content,
    language,
    lineCount: content.split('\n').length,
  };
}

export interface EditScriptArgs {
  script_path: string;
  replacement: string;
  start_line?: number;
  end_line?: number;
}

export interface EditScriptResult {
  path: string;
  linesChanged: number;
}

export function editScript(args: EditScriptArgs, projectRoot: string): EditScriptResult {
  const resolved = validateProjectPath(args.script_path, projectRoot);
  if (!existsSync(resolved)) {
    throw new Error(`Script not found: ${args.script_path}`);
  }

  const content = readFileSync(resolved, 'utf-8');
  const lines = content.split('\n');

  if (args.start_line !== undefined && args.end_line !== undefined) {
    const start = Math.max(0, args.start_line - 1);
    const end = Math.min(lines.length, args.end_line);
    const newLines = args.replacement.split('\n');
    lines.splice(start, end - start, ...newLines);
  } else {
    lines.length = 0;
    lines.push(...args.replacement.split('\n'));
  }

  const newContent = lines.join('\n');
  writeFileSync(resolved, newContent, 'utf-8');

  return {
    path: args.script_path,
    linesChanged: Math.abs((args.end_line ?? lines.length) - (args.start_line ?? 1)) + 1,
  };
}