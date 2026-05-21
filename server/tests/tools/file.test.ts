import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { validateProjectPath, readFileTool, writeFileTool } from '../../src/tools/file.js';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';

describe('validateProjectPath', () => {
  const projectRoot = join(process.cwd(), 'test-project');

  beforeEach(() => {
    rmSync(projectRoot, { recursive: true, force: true });
    mkdirSync(projectRoot, { recursive: true });
  });

  afterEach(() => {
    rmSync(projectRoot, { recursive: true, force: true });
  });

  it('allows paths inside project root', () => {
    const result = validateProjectPath('res://player.gd', projectRoot);
    expect(result).toContain('test-project');
  });

  it('rejects paths with ..', () => {
    expect(() => validateProjectPath('res://../../etc/passwd', projectRoot)).toThrow('outside project');
  });

  it('rejects absolute paths outside project', () => {
    expect(() => validateProjectPath('/etc/passwd', projectRoot)).toThrow('outside project');
  });

  it('converts res:// to project root', () => {
    const result = validateProjectPath('res://scenes/main.tscn', projectRoot);
    expect(result).toContain(join('test-project', 'scenes', 'main.tscn'));
  });
});

describe('readFileTool', () => {
  const projectRoot = join(process.cwd(), 'test-project');

  beforeEach(() => {
    mkdirSync(projectRoot, { recursive: true });
  });

  afterEach(() => {
    rmSync(projectRoot, { recursive: true, force: true });
  });

  it('reads a file inside project', () => {
    writeFileSync(join(projectRoot, 'hello.gd'), 'extends Node');
    const result = readFileTool({ path: 'res://hello.gd' }, projectRoot);
    expect(result.content).toBe('extends Node');
  });

  it('throws for missing file', () => {
    expect(() => readFileTool({ path: 'res://missing.gd' }, projectRoot)).toThrow('File not found');
  });
});

describe('writeFileTool', () => {
  const projectRoot = join(process.cwd(), 'test-project');

  beforeEach(() => {
    mkdirSync(projectRoot, { recursive: true });
  });

  afterEach(() => {
    rmSync(projectRoot, { recursive: true, force: true });
  });

  it('writes a file and returns byte count', () => {
    const result = writeFileTool({ path: 'res://new.gd', content: 'extends Node' }, projectRoot);
    expect(result.bytesWritten).toBeGreaterThan(0);
  });
});