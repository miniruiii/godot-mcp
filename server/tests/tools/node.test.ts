import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getSceneTree, getNode, addNode, removeNode, updateProperty } from '../../src/tools/node.js';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';

describe('node tools', () => {
  const projectRoot = join(process.cwd(), 'test-project');

  beforeEach(() => {
    rmSync(projectRoot, { recursive: true, force: true });
    mkdirSync(projectRoot, { recursive: true });
    mkdirSync(join(projectRoot, 'scenes'), { recursive: true });
    writeFileSync(join(projectRoot, 'scenes', 'main.tscn'),
      `[gd_scene load_steps=1 format=3]
[node name="Main" type="Node2D"]
[node name="Player" type="CharacterBody2D" parent="."]
position = Vector2(100, 200)
`);
  });

  afterEach(() => {
    rmSync(projectRoot, { recursive: true, force: true });
  });

  it('gets scene tree from file (offline)', () => {
    const result = getSceneTree({ scene_path: 'res://scenes/main.tscn' }, projectRoot, false);
    expect(result.nodes).toHaveLength(2);
    expect(result.nodes[0].name).toBe('Main');
  });

  it('gets single node details from file (offline)', () => {
    const result = getNode({ scene_path: 'res://scenes/main.tscn', node_path: '/root/Main/Player' }, projectRoot, false);
    expect(result.name).toBe('Player');
    expect(result.properties.position).toBe('Vector2(100, 200)');
  });

  it('add_node returns offline error when not connected', async () => {
    const result = await addNode({ scene_path: 'res://scenes/main.tscn', parent_path: '/root/Main', node_type: 'Sprite2D', node_name: 'Sprite' }, projectRoot, false);
    expect(result.offline).toBe(true);
    expect(result.added).toBe(false);
    expect(result.message).toContain('Godot editor');
  });

  it('remove_node returns offline error when not connected', async () => {
    const result = await removeNode({ scene_path: 'res://scenes/main.tscn', node_path: '/root/Main/Player' }, projectRoot, false);
    expect(result.offline).toBe(true);
    expect(result.removed).toBe(false);
    expect(result.message).toContain('Godot editor');
  });

  it('update_property returns offline error when not connected', async () => {
    const result = await updateProperty({ scene_path: 'res://scenes/main.tscn', node_path: '/root/Main/Player', property: 'position', value: 'Vector2(50, 50)' }, projectRoot, false);
    expect(result.offline).toBe(true);
    expect(result.updated).toBe(false);
    expect(result.message).toContain('Godot editor');
  });

  it('throws when node not found', () => {
    expect(() => getNode({ scene_path: 'res://scenes/main.tscn', node_path: '/root/Main/Missing' }, projectRoot, false)).toThrow('Node not found');
  });
});