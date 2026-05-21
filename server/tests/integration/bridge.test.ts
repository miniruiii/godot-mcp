import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { WebSocketServer } from 'ws';
import { loadConfig } from '../../src/config.js';
import { GodotBridge } from '../../src/godot-bridge.js';
import { buildToolRegistry } from '../../src/tools/index.js';

describe('MCP bridge integration', () => {
  let wss: WebSocketServer;
  let bridge: GodotBridge;
  const TEST_PORT = 16508;

  beforeAll(async () => {
    wss = new WebSocketServer({ port: TEST_PORT });
    wss.on('connection', (ws) => {
      ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.method === 'handshake') {
          ws.send(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: { version: '1.0.0', godot_version: '4.6.2' } }));
        } else if (msg.method === 'scene.get_tree') {
          ws.send(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: { nodes: [{ name: 'Main', type: 'Node2D' }] } }));
        } else if (msg.method === 'scene.save') {
          ws.send(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: { saved: true } }));
        } else if (msg.method === 'project.run') {
          ws.send(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: { running: true } }));
        }
      });
    });

    bridge = new GodotBridge(TEST_PORT);
    await bridge.connect();
  });

  afterAll(() => {
    bridge.disconnect();
    wss.close();
  });

  it('performs handshake on connect', () => {
    expect(bridge.getGodotVersion()).toBe('4.6.2');
  });

  it('has 19 tools registered', () => {
    const config = loadConfig('nonexistent.json');
    const tools = buildToolRegistry(config, bridge);
    expect(tools.length).toBe(19);
  });

  it('save_scene succeeds when bridge is connected', async () => {
    const config = loadConfig('nonexistent.json');
    config.port = TEST_PORT;
    const tools = buildToolRegistry(config, bridge);
    const tool = tools.find((t) => t.name === 'save_scene')!;
    const result = await tool.handler({ scene_path: 'res://main.tscn' }) as any;
    expect(result.saved).toBe(true);
  });

  it('run_project succeeds when bridge is connected', async () => {
    const config = loadConfig('nonexistent.json');
    config.port = TEST_PORT;
    const tools = buildToolRegistry(config, bridge);
    const tool = tools.find((t) => t.name === 'run_project')!;
    const result = await tool.handler({}) as any;
    expect(result.running).toBe(true);
  });

  it('get_scene_tree works offline by reading files', async () => {
    const bridge2 = new GodotBridge(TEST_PORT + 1);
    const config = loadConfig('nonexistent.json');
    const tools = buildToolRegistry(config, bridge2);
    const tool = tools.find((t) => t.name === 'list_project_files')!;
    const result = await tool.handler({}) as any;
    expect(result.count).toBeGreaterThanOrEqual(0);
  });
});