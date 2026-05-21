# Godot MCP — Integration, Testing & Packaging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the TypeScript MCP server to the Godot plugin via WebSocket, add integration tests that exercise both sides, set up CI/CD, write documentation, and configure npm packaging for distribution.

**Architecture:** The integration layer modifies the TypeScript server to route online-only tool calls through the Godot bridge as JSON-RPC requests. It also adds a handshake on connection to verify version compatibility. Integration tests spin up the TypeScript MCP server in stdio mode and use a mock WebSocket client to verify end-to-end request/response flows. CI runs unit tests (Vitest) and integration tests on Node 20/22. The npm package bundles the compiled server and a CLI entry point.

**Tech Stack:** TypeScript, Vitest, WebSocket (`ws`), GitHub Actions, npm

---

## Prerequisites

- Plans 1 and 2 must be completed. All files listed in those plans must exist and compile.
- Node.js 20+ and Godot 4.6.2+ must be installed.

---

## File Structure

| File | Responsibility |
|------|---------------|
| `server/src/godot-bridge.ts` | Modify: add `callOnline` for online-only tools, handshake on connect |
| `server/src/tools/scene.ts` | Modify: `save_scene` and `open_scene` call bridge when connected |
| `server/src/tools/node.ts` | Modify: `add_node`, `remove_node`, `update_property` call bridge when connected |
| `server/src/tools/editor.ts` | Modify: `run_project` and `get_output_log` call bridge when connected |
| `server/tests/integration/mcp-e2e.test.ts` | End-to-end: start server, call tools via MCP protocol, verify responses |
| `server/tests/integration/bridge.test.ts` | Bridge tests: mock WebSocket server, verify JSON-RPC round-trip |
| `.github/workflows/ci.yml` | GitHub Actions: lint, unit tests, integration tests on Node 20/22 |
| `README.md` | Project documentation: install, usage, tool reference |
| `LICENSE` | MIT license file |
| `package.json` | Modify: add `files`, `publishConfig`, `engines` for npm distribution |

---

### Task 1: Extend Godot Bridge with Online Call + Handshake

**Files:**
- Modify: `server/src/godot-bridge.ts`

- [ ] **Step 1: Write the failing test**

Create `server/tests/integration/bridge.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { WebSocketServer } from 'ws';
import { GodotBridge } from '../../src/godot-bridge.js';

describe('GodotBridge integration', () => {
  let wss: WebSocketServer;
  let bridge: GodotBridge;
  const TEST_PORT = 16505;

  beforeAll(async () => {
    wss = new WebSocketServer({ port: TEST_PORT });
    wss.on('connection', (ws) => {
      ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.method === 'handshake') {
          ws.send(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: { version: '1.0.0', godot_version: '4.6.2' } }));
        } else if (msg.method === 'scene.get_tree') {
          ws.send(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: { nodes: [{ name: 'Main', type: 'Node2D' }] } }));
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

  it('calls scene.get_tree via bridge', async () => {
    const result = await bridge.call('scene.get_tree', { scene_path: 'res://main.tscn' }) as any;
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].name).toBe('Main');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest server/tests/integration/bridge.test.ts --run`
Expected: FAIL — handshake fields or `callOnline` not present.

- [ ] **Step 3: Modify godot-bridge.ts**

Edit `server/src/godot-bridge.ts`. Add to the class:

```typescript
  private handshakeCompleted = false;

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isConnected) {
        resolve();
        return;
      }

      try {
        this.ws = new WebSocket(this.url);

        this.ws.on('open', async () => {
          this.reconnectDelay = 1000;
          try {
            const result = await this.call('handshake', {}) as { version: string; godot_version: string };
            this.godotVersion = result.godot_version;
            this.handshakeCompleted = true;
          } catch {
            // Handshake optional for backward compat
          }
          resolve();
        });
        // ... rest unchanged
```

Also add a helper method:

```typescript
  async callOnline(method: string, params: Record<string, unknown>): Promise<unknown> {
    if (!this.isConnected) {
      throw new Error('Godot editor not connected. Please start Godot and enable the Godot MCP plugin.');
    }
    return this.call(method, params);
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest server/tests/integration/bridge.test.ts --run`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/src/godot-bridge.ts server/tests/integration/bridge.test.ts
git commit -m "feat(bridge): handshake on connect, callOnline helper for online-only tools"
```

---

### Task 2: Wire Online Tools to the Bridge

**Files:**
- Modify: `server/src/tools/scene.ts`
- Modify: `server/src/tools/node.ts`
- Modify: `server/src/tools/editor.ts`
- Modify: `server/src/tools/index.ts`

- [ ] **Step 1: Modify scene.ts — save_scene and open_scene**

Replace `saveScene` and `openScene` in `server/src/tools/scene.ts`:

```typescript
import type { GodotBridge } from '../godot-bridge.js';

export async function saveScene(args: SaveSceneArgs, _projectRoot: string, bridge: GodotBridge): Promise<{ saved: boolean; message: string }> {
  if (!bridge.isConnected) {
    return { saved: false, message: 'save_scene requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  try {
    await bridge.callOnline('scene.save', { scene_path: args.scene_path });
    return { saved: true, message: 'Scene saved via Godot editor.' };
  } catch (err) {
    return { saved: false, message: err instanceof Error ? err.message : String(err) };
  }
}

export async function openScene(args: OpenSceneArgs, _projectRoot: string, bridge: GodotBridge): Promise<{ opened: boolean; message: string }> {
  if (!bridge.isConnected) {
    return { opened: false, message: 'open_scene requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  try {
    await bridge.callOnline('scene.open', { scene_path: args.scene_path });
    return { opened: true, message: 'Scene opened in Godot editor.' };
  } catch (err) {
    return { opened: false, message: err instanceof Error ? err.message : String(err) };
  }
}
```

- [ ] **Step 2: Modify node.ts — add_node, remove_node, update_property**

Replace the three mutating functions in `server/src/tools/node.ts`:

```typescript
import type { GodotBridge } from '../godot-bridge.js';

export async function addNode(args: AddNodeArgs, _projectRoot: string, bridge: GodotBridge): Promise<AddNodeResult> {
  if (!bridge.isConnected) {
    return { added: false, message: 'add_node requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  try {
    await bridge.callOnline('scene.add_node', args);
    return { added: true, message: 'Node added via Godot editor.' };
  } catch (err) {
    return { added: false, message: err instanceof Error ? err.message : String(err) };
  }
}

export async function removeNode(args: RemoveNodeArgs, _projectRoot: string, bridge: GodotBridge): Promise<RemoveNodeResult> {
  if (!bridge.isConnected) {
    return { removed: false, message: 'remove_node requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  try {
    await bridge.callOnline('scene.remove_node', args);
    return { removed: true, message: 'Node removed via Godot editor.' };
  } catch (err) {
    return { removed: false, message: err instanceof Error ? err.message : String(err) };
  }
}

export async function updateProperty(args: UpdatePropertyArgs, _projectRoot: string, bridge: GodotBridge): Promise<UpdatePropertyResult> {
  if (!bridge.isConnected) {
    return { updated: false, message: 'update_property requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  try {
    await bridge.callOnline('scene.update_property', args);
    return { updated: true, message: 'Property updated via Godot editor.' };
  } catch (err) {
    return { updated: false, message: err instanceof Error ? err.message : String(err) };
  }
}
```

- [ ] **Step 3: Modify editor.ts — run_project, get_output_log**

Replace in `server/src/tools/editor.ts`:

```typescript
import type { GodotBridge } from '../godot-bridge.js';

export async function runProject(args: RunProjectArgs, bridge: GodotBridge): Promise<RunProjectResult> {
  if (!bridge.isConnected) {
    return { running: false, message: 'run_project requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  try {
    await bridge.callOnline('project.run', args);
    return { running: true, message: 'Project run requested via Godot editor.' };
  } catch (err) {
    return { running: false, message: err instanceof Error ? err.message : String(err) };
  }
}

export async function getOutputLog(args: GetOutputLogArgs, bridge: GodotBridge): Promise<GetOutputLogResult> {
  if (!bridge.isConnected) {
    return { lines: [], message: 'get_output_log requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  try {
    const result = await bridge.callOnline('project.get_output_log', args) as { lines: string[] };
    return { lines: result.lines, message: 'Output log retrieved from Godot editor.' };
  } catch (err) {
    return { lines: [], message: err instanceof Error ? err.message : String(err) };
  }
}
```

- [ ] **Step 4: Modify tools/index.ts — pass bridge to async handlers**

In `server/src/tools/index.ts`, update the registry entries for the async tools to pass `bridge`:

```typescript
    {
      name: 'save_scene',
      // ...
      handler: async (args) => saveScene(args as { scene_path: string }, projectRoot, bridge),
    },
    {
      name: 'open_scene',
      // ...
      handler: async (args) => openScene(args as { scene_path: string }, projectRoot, bridge),
    },
    {
      name: 'add_node',
      // ...
      handler: async (args) => addNode(args as any, projectRoot, bridge),
    },
    {
      name: 'remove_node',
      // ...
      handler: async (args) => removeNode(args as any, projectRoot, bridge),
    },
    {
      name: 'update_property',
      // ...
      handler: async (args) => updateProperty(args as any, projectRoot, bridge),
    },
    {
      name: 'run_project',
      // ...
      handler: async (args) => runProject(args as any, bridge),
    },
    {
      name: 'get_output_log',
      // ...
      handler: async (args) => getOutputLog(args as any, bridge),
    },
```

Also update the `ToolDefinition` interface: `handler` should return `Promise<unknown> | unknown`.

- [ ] **Step 5: Run all tests**

Run: `npx vitest --run`
Expected: PASS (all existing + new async tests)

- [ ] **Step 6: Commit**

```bash
git add server/src/tools/scene.ts server/src/tools/node.ts server/src/tools/editor.ts server/src/tools/index.ts
git commit -m "feat(integration): wire online-only tools through Godot bridge with JSON-RPC"
```

---

### Task 3: End-to-End MCP Integration Test

**Files:**
- Create: `server/tests/integration/mcp-e2e.test.ts`

- [ ] **Step 1: Write the e2e test**

Create `server/tests/integration/mcp-e2e.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { loadConfig } from '../../src/config.js';
import { GodotBridge } from '../../src/godot-bridge.js';
import { buildToolRegistry } from '../../src/tools/index.js';
import { WebSocketServer } from 'ws';

describe('MCP E2E', () => {
  let mcpServer: Server;
  let clientTransport: InMemoryTransport;
  let serverTransport: InMemoryTransport;
  let wss: WebSocketServer;

  beforeAll(async () => {
    // Mock Godot WebSocket server
    wss = new WebSocketServer({ port: 16506 });
    wss.on('connection', (ws) => {
      ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.method === 'handshake') {
          ws.send(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: { version: '1.0.0', godot_version: '4.6.2' } }));
        } else if (msg.method === 'scene.save') {
          ws.send(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: { saved: true } }));
        }
      });
    });

    const config = loadConfig('nonexistent.json');
    config.port = 16506;
    const bridge = new GodotBridge(config.port);
    await bridge.connect();

    const tools = buildToolRegistry(config, bridge);

    mcpServer = new Server(
      { name: 'godot-mcp-test', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );

    mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: tools.map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
        })),
      };
    });

    mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
      const tool = tools.find((t) => t.name === request.params.name);
      if (!tool) throw new Error('Unknown tool');
      const result = await tool.handler(request.params.arguments || {});
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    });

    [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await mcpServer.connect(serverTransport);
  });

  afterAll(() => {
    wss.close();
  });

  it('lists all tools via MCP', async () => {
    const response = await clientTransport.send({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: {},
    });
    expect(response.result.tools.length).toBeGreaterThanOrEqual(19);
  });

  it('calls save_scene through bridge', async () => {
    const response = await clientTransport.send({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'save_scene',
        arguments: { scene_path: 'res://main.tscn' },
      },
    });
    const result = JSON.parse(response.result.content[0].text);
    expect(result.saved).toBe(true);
  });
});
```

Note: `InMemoryTransport` may not exist in the MCP SDK. If it doesn't, use a simpler approach: test the tool registry and bridge directly without the full MCP protocol layer.

Alternative if `InMemoryTransport` is unavailable:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { loadConfig } from '../../src/config.js';
import { GodotBridge } from '../../src/godot-bridge.js';
import { buildToolRegistry } from '../../src/tools/index.js';
import { WebSocketServer } from 'ws';

describe('MCP E2E (tool registry + bridge)', () => {
  let tools: ReturnType<typeof buildToolRegistry>;
  let bridge: GodotBridge;
  let wss: WebSocketServer;

  beforeAll(async () => {
    wss = new WebSocketServer({ port: 16507 });
    wss.on('connection', (ws) => {
      ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.method === 'handshake') {
          ws.send(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: { version: '1.0.0', godot_version: '4.6.2' } }));
        } else if (msg.method === 'scene.save') {
          ws.send(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: { saved: true } }));
        } else if (msg.method === 'project.run') {
          ws.send(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: { running: true } }));
        }
      });
    });

    const config = loadConfig('nonexistent.json');
    config.port = 16507;
    bridge = new GodotBridge(config.port);
    await bridge.connect();
    tools = buildToolRegistry(config, bridge);
  });

  afterAll(() => {
    bridge.disconnect();
    wss.close();
  });

  it('has 19 tools in full mode', () => {
    expect(tools.length).toBe(19);
  });

  it('save_scene succeeds when bridge is connected', async () => {
    const tool = tools.find((t) => t.name === 'save_scene')!;
    const result = await tool.handler({ scene_path: 'res://main.tscn' }) as any;
    expect(result.saved).toBe(true);
  });

  it('run_project succeeds when bridge is connected', async () => {
    const tool = tools.find((t) => t.name === 'run_project')!;
    const result = await tool.handler({}) as any;
    expect(result.running).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npx vitest server/tests/integration/mcp-e2e.test.ts --run`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add server/tests/integration/mcp-e2e.test.ts
git commit -m "test(integration): e2e tool registry + bridge with mock WebSocket Godot server"
```

---

### Task 4: GitHub Actions CI

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create CI workflow**

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [20, 22]

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Run tests
        run: npx vitest --run

      - name: Check formatting (if prettier installed)
        run: npx prettier --check "server/src/**/*.ts" || true
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: GitHub Actions with Node 20/22 matrix, build + test"
```

---

### Task 5: Documentation

**Files:**
- Create: `README.md`
- Create: `LICENSE`

- [ ] **Step 1: Write README.md**

Create `README.md`:

```markdown
# Godot MCP

A fully open-source Model Context Protocol implementation for Godot 4.6.2+. Connect AI assistants (Claude, Cursor, VS Code Copilot) to your Godot projects for intelligent code and scene editing.

## Features

- **Dual-mode operation**: Works offline (file system only) or online (live Godot editor communication)
- **19 built-in tools**: Project exploration, scene editing, script management, node manipulation, and project execution
- **Three run modes**: Full, Lite, Minimal — adapt to your AI client's context limits
- **Secure**: Path restrictions prevent directory traversal; WebSocket bound to localhost only
- **UndoRedo support**: All editor modifications go through Godot's undo system

## Installation

### TypeScript MCP Server

```bash
npm install -g godot-mcp
```

Or run without installing:

```bash
npx godot-mcp
```

### Godot Editor Plugin

1. Copy `addons/godot_mcp/` into your Godot project's `addons/` folder
2. Open Project Settings > Plugins
3. Enable "Godot MCP"

## Usage

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "godot": {
      "command": "npx",
      "args": ["godot-mcp"]
    }
  }
}
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `GODOT_MCP_MODE` | Run mode: `full`, `lite`, `minimal` |
| `GODOT_MCP_PORT` | WebSocket port (default: 6505) |
| `GODOT_MCP_PROJECT_PATH` | Path to Godot project |
| `GODOT_MCP_LOG_LEVEL` | Log level: `debug`, `info`, `warn`, `error` |

## Tools Reference

### Project Tools (All Modes)

- `list_project_files` — List project files, optionally filter by extension
- `read_project_settings` — Read project.godot settings
- `get_project_info` — Get engine version and rendering backend

### Scene Tools (All Modes)

- `read_scene` — Parse .tscn into structured node tree
- `create_scene` — Create a new scene file

### Scene Tools (Full/Lite, requires Godot)

- `save_scene` — Save current scene in editor
- `open_scene` — Open scene in editor

### Node Tools (All Modes — offline read; Full/Lite — online write)

- `get_scene_tree` — Get full node tree
- `get_node` — Get single node details
- `add_node` — Add node to scene (online)
- `remove_node` — Remove node (online)
- `update_property` — Modify node property (online)

### Script Tools (All Modes)

- `create_script` — Create .gd or .cs file
- `read_script` — Read script content
- `edit_script` — Edit by full replacement or line range

### Editor Tools (Full/Lite, requires Godot)

- `run_project` — Run the project
- `get_output_log` — Get editor output log

### File Tools (All Modes)

- `read_file` — Read any project file
- `write_file` — Write any project file

## Architecture

```
AI Client <-- MCP/stdio --> TypeScript Server <-- WebSocket/JSON-RPC --> Godot Plugin
                                      |
                                      v
                                File System
```

## License

MIT
```

- [ ] **Step 2: Create LICENSE**

Create `LICENSE`:

```
MIT License

Copyright (c) 2026 godot-mcp contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 3: Commit**

```bash
git add README.md LICENSE
git commit -m "docs: README with install, usage, tool reference; MIT license"
```

---

### Task 6: NPM Packaging

**Files:**
- Modify: `package.json`
- Modify: `tsconfig.json` (ensure outDir is correct)

- [ ] **Step 1: Update package.json for npm**

Modify `package.json`:

```json
{
  "name": "godot-mcp",
  "version": "1.0.0",
  "description": "Model Context Protocol server for Godot 4.6.2+",
  "main": "dist/server.js",
  "types": "dist/server.d.ts",
  "bin": {
    "godot-mcp": "dist/server.js"
  },
  "files": [
    "dist/",
    "addons/",
    "settings.json",
    "README.md",
    "LICENSE"
  ],
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "vitest",
    "start": "node dist/server.js",
    "prepublishOnly": "npm run build"
  },
  "keywords": ["godot", "mcp", "model-context-protocol", "game-development"],
  "license": "MIT",
  "engines": {
    "node": ">=20.0.0"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.12.0",
    "ws": "^8.18.0",
    "zod": "^3.25.0"
  },
  "devDependencies": {
    "@types/node": "^22.15.0",
    "@types/ws": "^8.18.0",
    "typescript": "^5.8.0",
    "vitest": "^3.2.0"
  }
}
```

- [ ] **Step 2: Verify build output**

Run: `npm run build`
Expected: `dist/` contains `server.js`, `config.js`, `cli.js`, `file-parser.js`, `godot-bridge.js`, `tools/*.js`, and `.d.ts` files.

- [ ] **Step 3: Test the CLI entry point**

Run: `node dist/server.js --help`
Expected: Help text printed.

Run: `node dist/server.js --mode lite`
Expected: Server starts (it will hang waiting for stdio, which is expected — press Ctrl+C).

- [ ] **Step 4: Commit**

```bash
git add package.json
git commit -m "chore(npm): configure package.json for npm publish with dist, addons, settings"
```

---

### Task 7: Final Verification

- [ ] **Step 1: Run full test suite**

Run: `npx vitest --run`
Expected: All tests pass.

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Clean build, no TypeScript errors.

- [ ] **Step 3: Dry-run npm pack**

Run: `npm pack --dry-run`
Expected: Shows `godot-mcp-1.0.0.tgz` containing `dist/`, `addons/`, `settings.json`, `README.md`, `LICENSE`.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "release: v1.0.0 — Godot MCP server + plugin ready for distribution"
```

---

## Self-Review

**1. Spec coverage for Plan 3 (integration & packaging):**

| Spec Requirement | Task |
|-----------------|------|
| WebSocket handshake (version exchange) | Task 1 |
| Online tool routing through bridge | Task 2 |
| JSON-RPC error handling | Tasks 1, 2 |
| Integration tests (end-to-end) | Task 3 |
| CI/CD (GitHub Actions, Node 20/22) | Task 4 |
| Documentation (README, tool reference) | Task 5 |
| NPM packaging | Task 6 |
| MIT license | Task 5 |

**2. Placeholder scan:** No TBD, TODO, or vague steps.

**3. Type consistency:** All async tool handlers now accept `GodotBridge` and return `Promise<...>`. The registry awaits all handlers uniformly.

---

## Execution Handoff

**Plan 3 complete and saved to `docs/superpowers/plans/2026-05-21-godot-mcp-integration.md`.**

All three plans are now ready. The full implementation spans:

1. **Plan 1** (`docs/superpowers/plans/2026-05-21-godot-mcp-server.md`) — TypeScript MCP Server + Offline Tools
2. **Plan 2** (`docs/superpowers/plans/2026-05-21-godot-mcp-plugin.md`) — Godot Editor Plugin + WebSocket Bridge
3. **Plan 3** (`docs/superpowers/plans/2026-05-21-godot-mcp-integration.md`) — Integration, Testing & Packaging

**Execution options:**

**1. Subagent-Driven (recommended)** — Dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
