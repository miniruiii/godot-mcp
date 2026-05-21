import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GodotBridge } from '../src/godot-bridge.js';

describe('GodotBridge', () => {
  let bridge: GodotBridge;

  beforeEach(() => {
    bridge = new GodotBridge(6505);
  });

  afterEach(() => {
    bridge.disconnect();
  });

  it('starts disconnected', () => {
    expect(bridge.isConnected).toBe(false);
  });

  it('returns correct port and URL', () => {
    expect(bridge.getUrl()).toBe('ws://127.0.0.1:6505');
  });

  it('call throws when disconnected', async () => {
    await expect(bridge.call('scene.get_tree', {})).rejects.toThrow('Godot editor not connected');
  });

  it('returns version', () => {
    expect(bridge.getVersion()).toBe('1.0.0');
  });
});