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

function unescapeTemplate(content: string): string {
  return content.replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t').replace(/\\\\/g, '\\');
}

export function createScript(args: CreateScriptArgs, projectRoot: string): CreateScriptResult {
  const resolved = validateProjectPath(args.script_path, projectRoot);
  if (existsSync(resolved)) {
    throw new Error(`Script already exists: ${args.script_path}`);
  }

  const extendsType = args.extends_type || 'Node';
  const template = args.template ? unescapeTemplate(args.template) : null;
  const content = template || `extends ${extendsType}


# Called when the node enters the scene tree for the first time.
func _ready() -> void:
\tpass # Replace with function body.


# Called every frame. 'delta' is the elapsed time since the previous frame.
func _process(delta: float) -> void:
\tpass
`;

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
  if (!args.replacement) {
    throw new Error(`Missing required parameter: replacement`);
  }

  const content = readFileSync(resolved, 'utf-8');
  const lines = content.split('\n');
  const unescapedReplacement = args.replacement.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\\\/g, '\\');

  if (args.start_line !== undefined && args.end_line !== undefined) {
    const start = Math.max(0, args.start_line - 1);
    const end = Math.min(lines.length, args.end_line);
    const newLines = unescapedReplacement.split('\n');
    lines.splice(start, end - start, ...newLines);
  } else {
    lines.length = 0;
    lines.push(...unescapedReplacement.split('\n'));
  }

  const newContent = lines.join('\n');
  writeFileSync(resolved, newContent, 'utf-8');

  return {
    path: args.script_path,
    linesChanged: Math.abs((args.end_line ?? lines.length) - (args.start_line ?? 1)) + 1,
  };
}