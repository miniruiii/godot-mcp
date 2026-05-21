import { describe, it, expect } from 'vitest';
import { parseTscn, computeNodePaths, readGodotFile } from '../src/file-parser.js';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

describe('parseTscn', () => {
  it('parses a simple scene with root and child', () => {
    const content = `[gd_scene load_steps=2 format=3 uid="uid://abc"]

[ext_resource type="Script" path="res://player.gd" id="1_abcd"]

[node name="Main" type="Node2D"]

[node name="Player" type="CharacterBody2D" parent="."]
position = Vector2(100, 200)
script = ExtResource("1_abcd")
`;
    const scene = parseTscn(content);
    expect(scene.format).toBe(3);
    expect(scene.nodes).toHaveLength(2);
    expect(scene.nodes[0].name).toBe('Main');
    expect(scene.nodes[0].type).toBe('Node2D');
    expect(scene.nodes[1].name).toBe('Player');
    expect(scene.nodes[1].type).toBe('CharacterBody2D');
    expect(scene.nodes[1].properties.position).toBe('Vector2(100, 200)');
    expect(scene.extResources).toHaveLength(1);
    expect(scene.extResources[0].path).toBe('res://player.gd');
  });

  it('returns empty scene for invalid content', () => {
    const scene = parseTscn('not a scene file');
    expect(scene.nodes).toHaveLength(0);
  });
});

describe('computeNodePaths', () => {
  it('computes full paths for nested nodes', () => {
    const nodes = [
      { name: 'Main', type: 'Node2D', parent: undefined, properties: {} },
      { name: 'Player', type: 'CharacterBody2D', parent: '.', properties: {} },
      { name: 'Sprite', type: 'Sprite2D', parent: 'Player', properties: {} },
    ];
    const paths = computeNodePaths(nodes);
    expect(paths[0]).toBe('/root/Main');
    expect(paths[1]).toBe('/root/Main/Player');
    expect(paths[2]).toBe('/root/Main/Player/Sprite');
  });
});

describe('readGodotFile', () => {
  const testDir = join(process.cwd(), 'test-project');

  it('reads a .gd file', () => {
    mkdirSync(testDir, { recursive: true });
    writeFileSync(join(testDir, 'test.gd'), 'extends Node2D\n\nfunc _ready():\n    pass');
    const result = readGodotFile(join(testDir, 'test.gd'));
    expect(result.content).toContain('extends Node2D');
    expect(result.language).toBe('gdscript');
    rmSync(testDir, { recursive: true, force: true });
  });
});
