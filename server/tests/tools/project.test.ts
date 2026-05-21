import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { listProjectFiles, readProjectSettings, getProjectInfo } from '../../src/tools/project.js';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';

describe('project tools', () => {
  const projectRoot = join(process.cwd(), 'test-project');

  beforeEach(() => {
    rmSync(projectRoot, { recursive: true, force: true });
    mkdirSync(projectRoot, { recursive: true });
    mkdirSync(join(projectRoot, 'scenes'), { recursive: true });
    writeFileSync(join(projectRoot, 'project.godot'),
      `[application]\nconfig/name="Test"\nconfig/features=PackedStringArray("4.2", "Forward Plus")\n\n[rendering]\nrenderer/rendering_method="forward_plus"`);
    writeFileSync(join(projectRoot, 'scenes', 'main.tscn'), '[gd_scene]');
    writeFileSync(join(projectRoot, 'player.gd'), 'extends Node2D');
  });

  afterEach(() => {
    rmSync(projectRoot, { recursive: true, force: true });
  });

  it('lists project files recursively', () => {
    const result = listProjectFiles({}, projectRoot);
    expect(result.files.length).toBeGreaterThanOrEqual(3);
    expect(result.files.some((f: string) => f.endsWith('main.tscn'))).toBe(true);
  });

  it('filters by extension', () => {
    const result = listProjectFiles({ extension: '.gd' }, projectRoot);
    expect(result.files.every((f: string) => f.endsWith('.gd'))).toBe(true);
  });

  it('reads project.godot settings', () => {
    const result = readProjectSettings({}, projectRoot);
    expect(result.name).toBe('Test');
    expect(result.features).toContain('4.2');
  });

  it('gets project info', () => {
    const result = getProjectInfo({}, projectRoot);
    expect(result.engine).toBe('Godot');
    expect(result.rendering).toBe('forward_plus');
  });
});