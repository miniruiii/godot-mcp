import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createScript, readScript, editScript } from '../../src/tools/script.js';
import { mkdirSync, writeFileSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';

describe('script tools', () => {
  const projectRoot = join(process.cwd(), 'test-project');

  beforeEach(() => {
    rmSync(projectRoot, { recursive: true, force: true });
    mkdirSync(projectRoot, { recursive: true });
  });

  afterEach(() => {
    rmSync(projectRoot, { recursive: true, force: true });
  });

  it('creates a GDScript file', () => {
    const result = createScript({ script_path: 'res://player.gd', extends_type: 'CharacterBody2D' }, projectRoot);
    expect(result.created).toBe(true);
    const content = readFileSync(join(projectRoot, 'player.gd'), 'utf-8');
    expect(content).toContain('extends CharacterBody2D');
  });

  it('reads a script file', () => {
    createScript({ script_path: 'res://enemy.gd', extends_type: 'Node2D' }, projectRoot);
    const result = readScript({ script_path: 'res://enemy.gd' }, projectRoot);
    expect(result.content).toContain('extends Node2D');
    expect(result.language).toBe('gdscript');
  });

  it('edits a script by full replacement', () => {
    createScript({ script_path: 'res://test.gd', extends_type: 'Node' }, projectRoot);
    editScript({ script_path: 'res://test.gd', replacement: 'extends Node\n\nfunc _ready():\n    pass' }, projectRoot);
    const content = readFileSync(join(projectRoot, 'test.gd'), 'utf-8');
    expect(content).toContain('func _ready()');
  });

  it('edits a script by line range', () => {
    writeFileSync(join(projectRoot, 'range.gd'), 'extends Node\n\nfunc _ready():\n    pass\n');
    editScript({ script_path: 'res://range.gd', start_line: 2, end_line: 2, replacement: '\nclass_name MyClass\n' }, projectRoot);
    const content = readFileSync(join(projectRoot, 'range.gd'), 'utf-8');
    expect(content).toContain('class_name MyClass');
  });

  it('throws when script not found', () => {
    expect(() => readScript({ script_path: 'res://missing.gd' }, projectRoot)).toThrow('Script not found');
  });
});