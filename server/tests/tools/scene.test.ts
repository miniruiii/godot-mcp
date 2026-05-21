import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readScene, createScene, saveScene } from '../../src/tools/scene.js';
import { mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';

describe('scene tools', () => {
  const projectRoot = join(process.cwd(), 'test-project');

  beforeEach(() => {
    rmSync(projectRoot, { recursive: true, force: true });
    mkdirSync(projectRoot, { recursive: true });
    mkdirSync(join(projectRoot, 'scenes'), { recursive: true });
    writeFileSync(join(projectRoot, 'scenes', 'main.tscn'),
      `[gd_scene load_steps=2 format=3]
[node name="Main" type="Node2D"]
[node name="Player" type="CharacterBody2D" parent="."]
position = Vector2(100, 200)
`);
  });

  afterEach(() => {
    rmSync(projectRoot, { recursive: true, force: true });
  });

  it('reads scene as structured tree', () => {
    const result = readScene({ scene_path: 'res://scenes/main.tscn' }, projectRoot);
    expect(result.root.name).toBe('Main');
    expect(result.root.type).toBe('Node2D');
    expect(result.root.children).toHaveLength(1);
    expect(result.root.children[0].name).toBe('Player');
  });

  it('creates a new scene file', () => {
    createScene({ scene_path: 'res://scenes/new.tscn', root_type: 'Node3D', root_name: 'World' }, projectRoot);
    const path = join(projectRoot, 'scenes', 'new.tscn');
    expect(existsSync(path)).toBe(true);
    const content = readFileSync(path, 'utf-8');
    expect(content).toContain('[gd_scene');
    expect(content).toContain('Node3D');
  });

  it('throws when scene not found', () => {
    expect(() => readScene({ scene_path: 'res://scenes/missing.tscn' }, projectRoot)).toThrow('Scene not found');
  });

  it('save_scene returns offline error when not connected', () => {
    const result = saveScene({ scene_path: 'res://scenes/main.tscn' }, projectRoot, false);
    expect(result.saved).toBe(false);
    expect(result.message).toContain('Godot editor');
  });
});