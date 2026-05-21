import { describe, it, expect } from 'vitest';
import { loadConfig, Config } from '../src/config.js';

describe('loadConfig', () => {
  it('returns defaults when no file exists', () => {
    const cfg = loadConfig('nonexistent.json');
    expect(cfg.port).toBe(6505);
    expect(cfg.mode).toBe('full');
    expect(cfg.project_path).toBe('./');
    expect(cfg.log_level).toBe('info');
  });

  it('loads valid settings from file', () => {
    const cfg = loadConfig('./settings.json');
    expect(cfg.port).toBe(6505);
    expect(cfg.mode).toBe('full');
  });

  it('overrides with environment variables', () => {
    process.env.GODOT_MCP_PORT = '7000';
    process.env.GODOT_MCP_MODE = 'lite';
    const cfg = loadConfig('nonexistent.json');
    expect(cfg.port).toBe(7000);
    expect(cfg.mode).toBe('lite');
    delete process.env.GODOT_MCP_PORT;
    delete process.env.GODOT_MCP_MODE;
  });

  it('clamps mode to allowed values', () => {
    process.env.GODOT_MCP_MODE = 'invalid';
    const cfg = loadConfig('nonexistent.json');
    expect(cfg.mode).toBe('full');
    delete process.env.GODOT_MCP_MODE;
  });
});
