import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadConfig } from '../src/config.js';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';

describe('loadConfig', () => {
  const TEST_CONFIG = join(process.cwd(), 'test-config.json');
  const envKeys = ['GODOT_MCP_PORT', 'GODOT_MCP_MODE', 'GODOT_MCP_PROJECT_PATH', 'GODOT_MCP_LOG_LEVEL'];
  const originalEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of envKeys) {
      originalEnv[key] = process.env[key];
    }
  });

  afterEach(() => {
    for (const key of envKeys) {
      if (originalEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalEnv[key];
      }
    }
    try { unlinkSync(TEST_CONFIG); } catch { /* ignore */ }
  });

  it('returns defaults when no file exists', () => {
    const cfg = loadConfig('nonexistent.json');
    expect(cfg.port).toBe(6505);
    expect(cfg.mode).toBe('full');
    expect(cfg.project_path).toBe('./');
    expect(cfg.log_level).toBe('info');
  });

  it('loads valid settings from file', () => {
    writeFileSync(TEST_CONFIG, JSON.stringify({ port: 7000, mode: 'lite', project_path: './game', log_level: 'debug' }));
    const cfg = loadConfig(TEST_CONFIG);
    expect(cfg.port).toBe(7000);
    expect(cfg.mode).toBe('lite');
    expect(cfg.project_path).toBe('./game');
    expect(cfg.log_level).toBe('debug');
  });

  it('overrides with environment variables', () => {
    process.env.GODOT_MCP_PORT = '7000';
    process.env.GODOT_MCP_MODE = 'lite';
    const cfg = loadConfig('nonexistent.json');
    expect(cfg.port).toBe(7000);
    expect(cfg.mode).toBe('lite');
  });

  it('clamps mode to allowed values', () => {
    process.env.GODOT_MCP_MODE = 'invalid';
    const cfg = loadConfig('nonexistent.json');
    expect(cfg.mode).toBe('full');
  });

  it('falls back on invalid port', () => {
    process.env.GODOT_MCP_PORT = 'abc';
    const cfg = loadConfig('nonexistent.json');
    expect(cfg.port).toBe(6505);
  });

  it('falls back on out-of-range port', () => {
    process.env.GODOT_MCP_PORT = '99999';
    const cfg = loadConfig('nonexistent.json');
    expect(cfg.port).toBe(6505);
  });

  it('clamps log_level to allowed values', () => {
    process.env.GODOT_MCP_LOG_LEVEL = 'verbose';
    const cfg = loadConfig('nonexistent.json');
    expect(cfg.log_level).toBe('info');
  });

  it('falls back on malformed JSON', () => {
    writeFileSync(TEST_CONFIG, 'not json');
    const cfg = loadConfig(TEST_CONFIG);
    expect(cfg.port).toBe(6505);
    expect(cfg.mode).toBe('full');
  });
});
