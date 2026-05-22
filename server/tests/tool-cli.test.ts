import { describe, it, expect } from 'vitest';
import { parseCliFlags, kebabToCamel, COMMAND_MAP } from '../src/tool-cli.js';
import { buildToolRegistry, getToolGroups } from '../src/tools/index.js';
import { GodotBridge } from '../src/godot-bridge.js';
import { loadConfig } from '../src/config.js';

describe('kebabToCamel', () => {
  it('converts single hyphen', () => {
    expect(kebabToCamel('node-path')).toBe('nodePath');
  });

  it('converts multiple hyphens', () => {
    expect(kebabToCamel('max-depth')).toBe('maxDepth');
  });

  it('leaves plain lowercase unchanged', () => {
    expect(kebabToCamel('path')).toBe('path');
  });
});

describe('parseCliFlags', () => {
  it('parses string value', () => {
    const result = parseCliFlags(['--path', 'res://main.tscn']);
    expect(result).toEqual({ path: 'res://main.tscn' });
  });

  it('parses JSON object value', () => {
    const result = parseCliFlags(['--position', '{"x":100,"y":200}']);
    expect(result).toEqual({ position: { x: 100, y: 200 } });
  });

  it('parses JSON array value', () => {
    const result = parseCliFlags(['--node-paths', '["/root/A","/root/B"]']);
    expect(result).toEqual({ nodePaths: ['/root/A', '/root/B'] });
  });

  it('parses boolean flag without value', () => {
    const result = parseCliFlags(['--pressed']);
    expect(result).toEqual({ pressed: true });
  });

  it('converts kebab-case to camelCase', () => {
    const result = parseCliFlags(['--node-path', '/root/Main']);
    expect(result).toEqual({ nodePath: '/root/Main' });
  });

  it('converts kebab-case with multiple words', () => {
    const result = parseCliFlags(['--max-depth', '3']);
    expect(result).toEqual({ maxDepth: 3 });
  });

  it('ignores non-flag arguments', () => {
    const result = parseCliFlags(['some-arg', '--path', 'test']);
    expect(result).toEqual({ path: 'test' });
  });

  it('parses mixed types', () => {
    const result = parseCliFlags([
      '--path', 'res://main.tscn',
      '--max-depth', '3',
      '--pressed',
    ]);
    expect(result).toEqual({
      path: 'res://main.tscn',
      maxDepth: 3,
      pressed: true,
    });
  });

  it('parses numeric string as number via JSON.parse', () => {
    const result = parseCliFlags(['--count', '42']);
    expect(result).toEqual({ count: 42 });
  });
});

describe('COMMAND_MAP', () => {
  it('has every tool mapped', () => {
    const bridge = new GodotBridge(6505);
    const config = loadConfig('nonexistent.json');
    const tools = buildToolRegistry(config, bridge);
    const mapValues = Object.values(COMMAND_MAP);

    for (const tool of tools) {
      expect(mapValues).toContain(tool.name);
    }
  });

  it('has no duplicate tool names', () => {
    const mapValues = Object.values(COMMAND_MAP);
    const unique = new Set(mapValues);
    expect(unique.size).toBe(mapValues.length);
  });

  it('has no duplicate CLI commands', () => {
    const mapKeys = Object.keys(COMMAND_MAP);
    const unique = new Set(mapKeys);
    expect(unique.size).toBe(mapKeys.length);
  });
});

describe('getToolGroups', () => {
  it('groups match COMMAND_MAP groups', () => {
    const bridge = new GodotBridge(6505);
    const config = loadConfig('nonexistent.json');
    const tools = buildToolRegistry(config, bridge);
    const groups = getToolGroups(tools);

    for (const [cliCmd, toolName] of Object.entries(COMMAND_MAP)) {
      const groupName = cliCmd.split(' ')[0];
      const groupTools = groups[groupName] || [];
      const found = groupTools.find(t => t.name === toolName);
      expect(found).toBeTruthy();
    }
  });
});
