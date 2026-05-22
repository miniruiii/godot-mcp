import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, relative, isAbsolute, normalize } from 'path';

export interface ReadFileArgs {
  path: string;
}

export interface WriteFileArgs {
  path: string;
  content: string;
}

export interface FileResult {
  content: string;
  size: number;
}

export function validateProjectPath(filePath: string, projectRoot: string): string {
  let resolved: string;

  if (filePath.startsWith('res://')) {
    resolved = resolve(projectRoot, filePath.slice(6));
  } else if (isAbsolute(filePath)) {
    resolved = normalize(filePath);
  } else {
    resolved = resolve(projectRoot, filePath);
  }

  const rel = relative(resolve(projectRoot), resolved);
  if (rel.startsWith('..') || rel.startsWith('.' + '..')) {
    throw new Error(`Path outside project root: ${filePath}`);
  }

  return resolved;
}

export function readFileTool(args: ReadFileArgs, projectRoot: string): FileResult {
  const resolved = validateProjectPath(args.path, projectRoot);
  if (!existsSync(resolved)) {
    throw new Error(`File not found: ${args.path}`);
  }
  const content = readFileSync(resolved, 'utf-8');
  return { content, size: Buffer.byteLength(content) };
}

function unescapeContent(content: string): string {
  return content
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\r/g, '\r')
    .replace(/\\\\/g, '\\');
}

export function writeFileTool(args: WriteFileArgs, projectRoot: string): { bytesWritten: number } {
  const resolved = validateProjectPath(args.path, projectRoot);
  const unescaped = unescapeContent(args.content);
  writeFileSync(resolved, unescaped, 'utf-8');
  return { bytesWritten: Buffer.byteLength(unescaped) };
}