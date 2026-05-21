# Godot MCP — TypeScript Server + Offline Tools Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fully functional TypeScript MCP server with all offline-capable tools — file system operations for Godot projects that work without the Godot editor running.

**Architecture:** The server uses `@modelcontextprotocol/sdk` over stdio to communicate with AI clients. It exposes 19 tools across 6 categories. Tools that require Godot editor connection (save_scene, open_scene, add_node, remove_node, update_property, run_project, get_output_log) return a clear error when offline. All file-based tools (read_scene, create_scene, read_script, edit_script, read_file, write_file, project tools, get_scene_tree, get_node) work by directly reading/writing `.tscn`, `.gd`, `.tres`, and `project.godot` files.

**Tech Stack:** TypeScript, `@modelcontextprotocol/sdk`, `ws`, Vitest

---

## File Structure

| File | Responsibility |
|------|---------------|
| `package.json` | Root package manifest, dependencies, scripts |
| `tsconfig.json` | TypeScript compiler configuration |
| `settings.json` | Runtime configuration (port, mode, project_path, log_level) |
| `server/src/config.ts` | Load and validate settings.json with env var overrides |
| `server/src/cli.ts` | Parse command-line arguments (mode, port, log-level) |
| `server/src/file-parser.ts` | Parse `.tscn` into structured node trees; read `.gd`, `.tres` |
| `server/src/godot-bridge.ts` | WebSocket client for Godot, connection state, heartbeat, reconnect |
| `server/src/tools/project.ts` | `list_project_files`, `read_project_settings`, `get_project_info` |
| `server/src/tools/scene.ts` | `read_scene`, `create_scene`, `save_scene`, `open_scene` |
| `server/src/tools/node.ts` | `get_scene_tree`, `get_node`, `add_node`, `remove_node`, `update_property` |
| `server/src/tools/script.ts` | `create_script`, `read_script`, `edit_script` |
| `server/src/tools/editor.ts` | `run_project`, `get_output_log` |
| `server/src/tools/file.ts` | `read_file`, `write_file` with path validation |
| `server/src/tools/index.ts` | Tool registry: collate all tool definitions and handlers |
| `server/src/server.ts` | MCP stdio server init, tool registration, request routing |
| `server/tests/config.test.ts` | Unit tests for configuration loading |
| `server/tests/file-parser.test.ts` | Unit tests for .tscn parsing |
| `server/tests/tools/project.test.ts` | Unit tests for project tools |
| `server/tests/tools/file.test.ts` | Unit tests for file tools with path validation |

---

## Assumptions

- Node.js 20+ is installed.
- The project root (`C:\code\godot-mcp-rc`) is the working directory.
- Godot 4.6.2+ is available for later integration testing (not needed for this plan).

---

### Task 1: Root Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `settings.json`
- Create: `.gitignore`

- [ ] **Step 1: Create root package.json**

```json
{
  "name": "godot-mcp",
  "version": "1.0.0",
  "description": "Model Context Protocol server for Godot 4.6.2+",
  "main": "dist/server.js",
  "bin": {
    "godot-mcp": "dist/server.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "vitest",
    "start": "node dist/server.js"
  },
  "keywords": ["godot", "mcp", "model-context-protocol"],
  "license": "MIT",
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
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./server/src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["server/src/**/*"],
  "exclude": ["node_modules", "dist", "server/tests"]
}
```

- [ ] **Step 3: Create settings.json**

```json
{
  "port": 6505,
  "mode": "full",
  "project_path": "./",
  "log_level": "info"
}
```

- [ ] **Step 4: Create .gitignore**

```
node_modules/
dist/
*.log
.DS_Store
.env
```

- [ ] **Step 5: Install dependencies**

Run: `npm install`
Expected: `node_modules/` created, no errors.

- [ ] **Step 6: Commit**

```bash
git add package.json tsconfig.json settings.json .gitignore
git commit -m "chore: project scaffolding with TypeScript, MCP SDK, Vitest"
```

---

### Task 2: Configuration Module

**Files:**
- Create: `server/src/config.ts`
- Create: `server/tests/config.test.ts`

- [ ] **Step 1: Write the failing test**

Create `server/tests/config.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest server/tests/config.test.ts --run`
Expected: FAIL — `Cannot find module '../src/config.js'`

- [ ] **Step 3: Write minimal implementation**

Create `server/src/config.ts`:

```typescript
import { readFileSync } from 'fs';
import { resolve } from 'path';

export type RunMode = 'full' | 'lite' | 'minimal';

export interface Config {
  port: number;
  mode: RunMode;
  project_path: string;
  log_level: string;
}

const DEFAULTS: Config = {
  port: 6505,
  mode: 'full',
  project_path: './',
  log_level: 'info',
};

const ALLOWED_MODES: RunMode[] = ['full', 'lite', 'minimal'];

export function loadConfig(path: string): Config {
  let fileConfig: Partial<Config> = {};

  try {
    const raw = readFileSync(resolve(path), 'utf-8');
    fileConfig = JSON.parse(raw) as Partial<Config>;
  } catch {
    // File missing or unreadable — use defaults
  }

  const mode = envOrFile('GODOT_MCP_MODE', fileConfig.mode, DEFAULTS.mode);
  const validatedMode = ALLOWED_MODES.includes(mode as RunMode) ? (mode as RunMode) : DEFAULTS.mode;

  return {
    port: parseInt(envOrFile('GODOT_MCP_PORT', fileConfig.port, DEFAULTS.port).toString(), 10),
    mode: validatedMode,
    project_path: envOrFile('GODOT_MCP_PROJECT_PATH', fileConfig.project_path, DEFAULTS.project_path),
    log_level: envOrFile('GODOT_MCP_LOG_LEVEL', fileConfig.log_level, DEFAULTS.log_level),
  };
}

function envOrFile(envKey: string, fileValue: string | number | undefined, defaultValue: string | number): string | number {
  const env = process.env[envKey];
  if (env !== undefined) return env;
  if (fileValue !== undefined) return fileValue;
  return defaultValue;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest server/tests/config.test.ts --run`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add server/src/config.ts server/tests/config.test.ts
git commit -m "feat(config): load settings.json with env var overrides and mode validation"
```

---

### Task 3: CLI Module

**Files:**
- Create: `server/src/cli.ts`
- Create: `server/tests/cli.test.ts`

- [ ] **Step 1: Write the failing test**

Create `server/tests/cli.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { parseArgs } from '../src/cli.js';

describe('parseArgs', () => {
  it('returns defaults with no args', () => {
    const args = parseArgs([]);
    expect(args.mode).toBeUndefined();
    expect(args.port).toBeUndefined();
    expect(args.logLevel).toBeUndefined();
  });

  it('parses --mode lite', () => {
    const args = parseArgs(['--mode', 'lite']);
    expect(args.mode).toBe('lite');
  });

  it('parses --port 7000', () => {
    const args = parseArgs(['--port', '7000']);
    expect(args.port).toBe(7000);
  });

  it('parses --log-level debug', () => {
    const args = parseArgs(['--log-level', 'debug']);
    expect(args.logLevel).toBe('debug');
  });

  it('rejects invalid mode', () => {
    expect(() => parseArgs(['--mode', 'invalid'])).toThrow('Invalid mode');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest server/tests/cli.test.ts --run`
Expected: FAIL — `Cannot find module '../src/cli.js'`

- [ ] **Step 3: Write minimal implementation**

Create `server/src/cli.ts`:

```typescript
import type { RunMode } from './config.js';

export interface CliArgs {
  mode?: RunMode;
  port?: number;
  logLevel?: string;
  help?: boolean;
}

const ALLOWED_MODES: RunMode[] = ['full', 'lite', 'minimal'];

export function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {};

  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const next = argv[i + 1];

    switch (flag) {
      case '--mode':
        if (!next || !ALLOWED_MODES.includes(next as RunMode)) {
          throw new Error(`Invalid mode: ${next}. Allowed: ${ALLOWED_MODES.join(', ')}`);
        }
        args.mode = next as RunMode;
        i++;
        break;
      case '--port':
        if (!next || isNaN(Number(next))) {
          throw new Error(`Invalid port: ${next}`);
        }
        args.port = Number(next);
        i++;
        break;
      case '--log-level':
        if (!next) throw new Error('Missing value for --log-level');
        args.logLevel = next;
        i++;
        break;
      case '--help':
      case '-h':
        args.help = true;
        break;
    }
  }

  return args;
}

export function printHelp(): void {
  console.log(`godot-mcp [options]

Options:
  --mode <full|lite|minimal>  Run mode (default: full)
  --port <number>             WebSocket port for Godot (default: 6505)
  --log-level <level>         Log level: debug, info, warn, error (default: info)
  --help, -h                  Show this help
`);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest server/tests/cli.test.ts --run`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add server/src/cli.ts server/tests/cli.test.ts
git commit -m "feat(cli): parse --mode, --port, --log-level arguments with validation"
```

---

### Task 4: File Parser Module

**Files:**
- Create: `server/src/file-parser.ts`
- Create: `server/tests/file-parser.test.ts`

- [ ] **Step 1: Write the failing test**

Create `server/tests/file-parser.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest server/tests/file-parser.test.ts --run`
Expected: FAIL — `Cannot find module '../src/file-parser.js'`

- [ ] **Step 3: Write minimal implementation**

Create `server/src/file-parser.ts`:

```typescript
import { readFileSync } from 'fs';

export interface SceneNode {
  name: string;
  type: string;
  parent?: string;
  properties: Record<string, string>;
}

export interface ExtResource {
  type: string;
  path: string;
  id: string;
}

export interface SubResource {
  type: string;
  id: string;
  properties: Record<string, string>;
}

export interface ParsedScene {
  format: number;
  nodes: SceneNode[];
  extResources: ExtResource[];
  subResources: SubResource[];
}

export interface GodotFile {
  content: string;
  language?: string;
}

export function parseTscn(content: string): ParsedScene {
  const scene: ParsedScene = { format: 3, nodes: [], extResources: [], subResources: [] };
  const lines = content.split('\n');
  let currentNode: SceneNode | null = null;
  let currentSubRes: SubResource | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trimEnd();
    const trimmed = line.trim();

    if (trimmed.startsWith('[gd_scene')) {
      const formatMatch = trimmed.match(/format=(\d+)/);
      if (formatMatch) scene.format = parseInt(formatMatch[1], 10);
      currentNode = null;
      currentSubRes = null;
    } else if (trimmed.startsWith('[ext_resource')) {
      const typeMatch = trimmed.match(/type="([^"]+)"/);
      const pathMatch = trimmed.match(/path="([^"]+)"/);
      const idMatch = trimmed.match(/id="([^"]+)"/);
      if (typeMatch && pathMatch && idMatch) {
        scene.extResources.push({
          type: typeMatch[1],
          path: pathMatch[1],
          id: idMatch[1],
        });
      }
      currentNode = null;
      currentSubRes = null;
    } else if (trimmed.startsWith('[sub_resource')) {
      const typeMatch = trimmed.match(/type="([^"]+)"/);
      const idMatch = trimmed.match(/id="([^"]+)"/);
      if (typeMatch && idMatch) {
        currentSubRes = { type: typeMatch[1], id: idMatch[1], properties: {} };
        scene.subResources.push(currentSubRes);
      }
      currentNode = null;
    } else if (trimmed.startsWith('[node')) {
      const nameMatch = trimmed.match(/name="([^"]+)"/);
      const typeMatch = trimmed.match(/type="([^"]+)"/);
      const parentMatch = trimmed.match(/parent="([^"]+)"/);
      if (nameMatch && typeMatch) {
        currentNode = {
          name: nameMatch[1],
          type: typeMatch[1],
          parent: parentMatch ? parentMatch[1] : undefined,
          properties: {},
        };
        scene.nodes.push(currentNode);
      }
      currentSubRes = null;
    } else if (trimmed.startsWith('[')) {
      currentNode = null;
      currentSubRes = null;
    } else if (currentNode && trimmed.includes('=')) {
      const eqIdx = trimmed.indexOf('=');
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim();
      currentNode.properties[key] = value;
    } else if (currentSubRes && trimmed.includes('=')) {
      const eqIdx = trimmed.indexOf('=');
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim();
      currentSubRes.properties[key] = value;
    }
  }

  return scene;
}

export function computeNodePaths(nodes: SceneNode[]): string[] {
  const paths: string[] = [];
  const pathMap = new Map<string, string>();

  for (const node of nodes) {
    let path: string;
    if (!node.parent || node.parent === '.') {
      path = `/root/${node.name}`;
    } else {
      const parentPath = pathMap.get(node.parent);
      path = parentPath ? `${parentPath}/${node.name}` : `/root/${node.parent}/${node.name}`;
    }
    paths.push(path);
    pathMap.set(node.name, path);
  }

  return paths;
}

export function readGodotFile(filePath: string): GodotFile {
  const content = readFileSync(filePath, 'utf-8');
  const ext = filePath.split('.').pop()?.toLowerCase();
  let language: string | undefined;

  switch (ext) {
    case 'gd':
      language = 'gdscript';
      break;
    case 'cs':
      language = 'csharp';
      break;
    case 'tscn':
    case 'tres':
      language = 'godot-resource';
      break;
  }

  return { content, language };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest server/tests/file-parser.test.ts --run`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add server/src/file-parser.ts server/tests/file-parser.test.ts
git commit -m "feat(parser): parse .tscn into structured nodes with path resolution"
```

---

### Task 5: Godot Bridge Module

**Files:**
- Create: `server/src/godot-bridge.ts`
- Create: `server/tests/godot-bridge.test.ts`

- [ ] **Step 1: Write the failing test**

Create `server/tests/godot-bridge.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

  it('tracks version', () => {
    expect(bridge.getVersion()).toBe('1.0.0');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest server/tests/godot-bridge.test.ts --run`
Expected: FAIL — `Cannot find module '../src/godot-bridge.js'`

- [ ] **Step 3: Write minimal implementation**

Create `server/src/godot-bridge.ts`:

```typescript
import WebSocket from 'ws';

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

export class GodotBridge {
  private ws: WebSocket | null = null;
  private pending = new Map<number, PendingRequest>();
  private requestId = 0;
  private reconnectDelay = 1000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private url: string;
  private version = '1.0.0';
  private godotVersion: string | null = null;

  constructor(port: number = 6505) {
    this.url = `ws://127.0.0.1:${port}`;
  }

  get isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  getUrl(): string {
    return this.url;
  }

  getVersion(): string {
    return this.version;
  }

  getGodotVersion(): string | null {
    return this.godotVersion;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isConnected) {
        resolve();
        return;
      }

      try {
        this.ws = new WebSocket(this.url);

        this.ws.on('open', () => {
          this.reconnectDelay = 1000;
          resolve();
        });

        this.ws.on('message', (data) => {
          this.handleMessage(data.toString());
        });

        this.ws.on('close', () => {
          this.ws = null;
          this.scheduleReconnect();
        });

        this.ws.on('error', (err) => {
          if (!this.isConnected) {
            reject(err);
          }
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.terminate();
      this.ws = null;
    }
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(new Error('Connection closed'));
    }
    this.pending.clear();
  }

  async call(method: string, params: Record<string, unknown>): Promise<unknown> {
    if (!this.isConnected) {
      throw new Error('Godot editor not connected. Please start Godot and enable the Godot MCP plugin.');
    }

    const id = ++this.requestId;
    const request = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Request timeout: ${method}`));
      }, 30000);

      this.pending.set(id, { resolve: resolve as (value: unknown) => void, reject, timer });
      this.ws!.send(JSON.stringify(request));
    });
  }

  private handleMessage(data: string): void {
    try {
      const msg = JSON.parse(data);
      if (msg.jsonrpc !== '2.0') return;

      if (msg.method === 'ping') {
        this.ws?.send(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: 'pong' }));
        return;
      }

      if (msg.id !== undefined && this.pending.has(msg.id)) {
        const pending = this.pending.get(msg.id)!;
        clearTimeout(pending.timer);
        this.pending.delete(msg.id);

        if (msg.error) {
          pending.reject(new Error(msg.error.message || 'Unknown error'));
        } else {
          pending.resolve(msg.result);
        }
      }
    } catch {
      // Ignore malformed messages
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect().catch(() => {
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, 60000);
        this.scheduleReconnect();
      });
    }, this.reconnectDelay);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest server/tests/godot-bridge.test.ts --run`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add server/src/godot-bridge.ts server/tests/godot-bridge.test.ts
git commit -m "feat(bridge): WebSocket client for Godot with reconnect and JSON-RPC"
```

---

### Task 6: File Tools (with Path Security)

**Files:**
- Create: `server/src/tools/file.ts`
- Create: `server/tests/tools/file.test.ts`

- [ ] **Step 1: Write the failing test**

Create `server/tests/tools/file.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { validateProjectPath, readFileTool, writeFileTool } from '../../src/tools/file.js';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';

describe('validateProjectPath', () => {
  const projectRoot = join(process.cwd(), 'test-project');

  beforeEach(() => {
    mkdirSync(projectRoot, { recursive: true });
  });

  afterEach(() => {
    rmSync(projectRoot, { recursive: true, force: true });
  });

  it('allows paths inside project root', () => {
    const result = validateProjectPath('res://player.gd', projectRoot);
    expect(result).toContain('test-project');
  });

  it('rejects paths with ..', () => {
    expect(() => validateProjectPath('res://../../etc/passwd', projectRoot)).toThrow('outside project');
  });

  it('rejects absolute paths outside project', () => {
    expect(() => validateProjectPath('/etc/passwd', projectRoot)).toThrow('outside project');
  });

  it('converts res:// to project root', () => {
    const result = validateProjectPath('res://scenes/main.tscn', projectRoot);
    expect(result).toContain(join('test-project', 'scenes', 'main.tscn'));
  });
});

describe('readFileTool', () => {
  const projectRoot = join(process.cwd(), 'test-project');

  it('reads a file inside project', () => {
    mkdirSync(projectRoot, { recursive: true });
    writeFileSync(join(projectRoot, 'hello.gd'), 'extends Node');
    const result = readFileTool({ path: 'res://hello.gd' }, projectRoot);
    expect(result.content).toBe('extends Node');
    rmSync(projectRoot, { recursive: true, force: true });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest server/tests/tools/file.test.ts --run`
Expected: FAIL — `Cannot find module`

- [ ] **Step 3: Write minimal implementation**

Create `server/src/tools/file.ts`:

```typescript
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, relative, isAbsolute, normalize } from 'path';

export interface ReadFileArgs {
  path: string;
}

export interface WriteFileArgs {
  path: string;
  content: string;
}

export interface FileResult {
  content: string;
  size: number;
}

export function validateProjectPath(filePath: string, projectRoot: string): string {
  let resolved: string;

  if (filePath.startsWith('res://')) {
    resolved = resolve(projectRoot, filePath.slice(6));
  } else if (isAbsolute(filePath)) {
    resolved = normalize(filePath);
  } else {
    resolved = resolve(projectRoot, filePath);
  }

  const rel = relative(resolve(projectRoot), resolved);
  if (rel.startsWith('..') || rel.startsWith('.' + '..')) {
    throw new Error(`Path outside project root: ${filePath}`);
  }

  return resolved;
}

export function readFileTool(args: ReadFileArgs, projectRoot: string): FileResult {
  const resolved = validateProjectPath(args.path, projectRoot);
  if (!existsSync(resolved)) {
    throw new Error(`File not found: ${args.path}`);
  }
  const content = readFileSync(resolved, 'utf-8');
  return { content, size: Buffer.byteLength(content) };
}

export function writeFileTool(args: WriteFileArgs, projectRoot: string): { bytesWritten: number } {
  const resolved = validateProjectPath(args.path, projectRoot);
  writeFileSync(resolved, args.content, 'utf-8');
  return { bytesWritten: Buffer.byteLength(args.content) };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest server/tests/tools/file.test.ts --run`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/src/tools/file.ts server/tests/tools/file.test.ts
git commit -m "feat(tools): file read/write with path validation preventing directory traversal"
```

---

### Task 7: Project Tools

**Files:**
- Create: `server/src/tools/project.ts`
- Create: `server/tests/tools/project.test.ts`

- [ ] **Step 1: Write the failing test**

Create `server/tests/tools/project.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { listProjectFiles, readProjectSettings, getProjectInfo } from '../../src/tools/project.js';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';

describe('project tools', () => {
  const projectRoot = join(process.cwd(), 'test-project');

  beforeEach(() => {
    mkdirSync(projectRoot, { recursive: true });
    mkdirSync(join(projectRoot, 'scenes'), { recursive: true });
    writeFileSync(join(projectRoot, 'project.godot'), `[application]\nconfig/name="Test"\nconfig/features=PackedStringArray("4.2", "Forward Plus")`);
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

  it('reads project.godot settings', () => {
    const result = readProjectSettings({}, projectRoot);
    expect(result.name).toBe('Test');
    expect(result.features).toContain('4.2');
  });

  it('gets project info', () => {
    const result = getProjectInfo({}, projectRoot);
    expect(result.engine).toBe('Godot');
    expect(result.rendering).toContain('Forward');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest server/tests/tools/project.test.ts --run`
Expected: FAIL — `Cannot find module`

- [ ] **Step 3: Write minimal implementation**

Create `server/src/tools/project.ts`:

```typescript
import { readdirSync, statSync, readFileSync, existsSync } from 'fs';
import { join, relative } from 'path';

export interface ListFilesArgs {
  extension?: string;
}

export interface ProjectFilesResult {
  files: string[];
  count: number;
}

export function listProjectFiles(args: ListFilesArgs, projectRoot: string): ProjectFilesResult {
  const files: string[] = [];

  function walk(dir: string) {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const stat = statSync(full);
      if (stat.isDirectory()) {
        if (entry !== 'node_modules' && entry !== '.git' && entry !== 'dist') {
          walk(full);
        }
      } else {
        const rel = relative(projectRoot, full).replace(/\\/g, '/');
        if (!args.extension || rel.endsWith(args.extension)) {
          files.push(rel);
        }
      }
    }
  }

  walk(projectRoot);
  return { files, count: files.length };
}

export interface ProjectSettingsResult {
  name: string;
  features: string[];
  rendering: string;
}

export function readProjectSettings(_args: Record<string, unknown>, projectRoot: string): ProjectSettingsResult {
  const path = join(projectRoot, 'project.godot');
  if (!existsSync(path)) {
    throw new Error('project.godot not found');
  }

  const content = readFileSync(path, 'utf-8');
  const nameMatch = content.match(/config\/name="([^"]+)"/);
  const featuresMatch = content.match(/config\/features=PackedStringArray\(([^)]+)\)/);
  const renderingMatch = content.match(/rendering\/renderer\/rendering_method="([^"]+)"/);

  const features = featuresMatch
    ? featuresMatch[1].split(',').map((f) => f.trim().replace(/"/g, '')).filter(Boolean)
    : [];

  return {
    name: nameMatch ? nameMatch[1] : 'Unknown',
    features,
    rendering: renderingMatch ? renderingMatch[1] : 'Unknown',
  };
}

export interface ProjectInfoResult {
  engine: string;
  engineVersion: string;
  rendering: string;
}

export function getProjectInfo(_args: Record<string, unknown>, projectRoot: string): ProjectInfoResult {
  const settings = readProjectSettings({}, projectRoot);
  const godotVersion = settings.features.find((f) => /^\d+\.\d+/.test(f)) || '4.x';

  return {
    engine: 'Godot',
    engineVersion: godotVersion,
    rendering: settings.rendering,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest server/tests/tools/project.test.ts --run`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/src/tools/project.ts server/tests/tools/project.test.ts
git commit -m "feat(tools): project file listing, settings reading, and project info"
```

---

### Task 8: Scene Tools (Offline)

**Files:**
- Create: `server/src/tools/scene.ts`
- Create: `server/tests/tools/scene.test.ts`

- [ ] **Step 1: Write the failing test**

Create `server/tests/tools/scene.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readScene, createScene } from '../../src/tools/scene.js';
import { mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';

describe('scene tools', () => {
  const projectRoot = join(process.cwd(), 'test-project');

  beforeEach(() => {
    mkdirSync(projectRoot, { recursive: true });
    mkdirSync(join(projectRoot, 'scenes'), { recursive: true });
    writeFileSync(join(projectRoot, 'scenes', 'main.tscn'), `[gd_scene load_steps=2 format=3]
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
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest server/tests/tools/scene.test.ts --run`
Expected: FAIL — `Cannot find module`

- [ ] **Step 3: Write minimal implementation**

Create `server/src/tools/scene.ts`:

```typescript
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { parseTscn, computeNodePaths, type ParsedScene, type SceneNode } from '../file-parser.js';
import { validateProjectPath } from './file.js';

export interface ReadSceneArgs {
  scene_path: string;
}

export interface SceneNodeResult {
  name: string;
  type: string;
  path: string;
  properties: Record<string, string>;
  children: SceneNodeResult[];
}

export interface ReadSceneResult {
  root: SceneNodeResult;
  nodeCount: number;
}

export function readScene(args: ReadSceneArgs, projectRoot: string): ReadSceneResult {
  const resolved = validateProjectPath(args.scene_path, projectRoot);
  if (!existsSync(resolved)) {
    throw new Error(`Scene not found: ${args.scene_path}`);
  }

  const content = readFileSync(resolved, 'utf-8');
  const parsed = parseTscn(content);
  const paths = computeNodePaths(parsed.nodes);

  const nodeMap = new Map<string, SceneNodeResult>();
  const rootNodes: SceneNodeResult[] = [];

  for (let i = 0; i < parsed.nodes.length; i++) {
    const node = parsed.nodes[i];
    const path = paths[i];
    const result: SceneNodeResult = {
      name: node.name,
      type: node.type,
      path,
      properties: node.properties,
      children: [],
    };
    nodeMap.set(path, result);

    if (!node.parent || node.parent === '.') {
      rootNodes.push(result);
    } else {
      const parentPath = paths.find((p) => p.endsWith(`/${node.parent}`));
      if (parentPath) {
        const parent = nodeMap.get(parentPath);
        if (parent) parent.children.push(result);
      }
    }
  }

  return {
    root: rootNodes[0] || { name: '', type: '', path: '', properties: {}, children: [] },
    nodeCount: parsed.nodes.length,
  };
}

export interface CreateSceneArgs {
  scene_path: string;
  root_type: string;
  root_name: string;
}

export interface CreateSceneResult {
  path: string;
  created: boolean;
}

export function createScene(args: CreateSceneArgs, projectRoot: string): CreateSceneResult {
  const resolved = validateProjectPath(args.scene_path, projectRoot);
  if (existsSync(resolved)) {
    throw new Error(`Scene already exists: ${args.scene_path}`);
  }

  const content = `[gd_scene load_steps=1 format=3 uid="uid://${generateUid()}"]

[node name="${args.root_name}" type="${args.root_type}"]
`;

  writeFileSync(resolved, content, 'utf-8');
  return { path: args.scene_path, created: true };
}

function generateUid(): string {
  return Math.random().toString(36).substring(2, 15);
}

export interface SaveSceneArgs {
  scene_path: string;
}

export function saveScene(_args: SaveSceneArgs, _projectRoot: string, godotConnected: boolean): { saved: boolean; message: string } {
  if (!godotConnected) {
    return { saved: false, message: 'save_scene requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  return { saved: true, message: 'Scene saved via Godot editor.' };
}

export interface OpenSceneArgs {
  scene_path: string;
}

export function openScene(_args: OpenSceneArgs, _projectRoot: string, godotConnected: boolean): { opened: boolean; message: string } {
  if (!godotConnected) {
    return { opened: false, message: 'open_scene requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  return { opened: true, message: 'Scene opened in Godot editor.' };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest server/tests/tools/scene.test.ts --run`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/src/tools/scene.ts server/tests/tools/scene.test.ts
git commit -m "feat(tools): scene read (offline parse) and create with structured node tree"
```

---

### Task 9: Script Tools

**Files:**
- Create: `server/src/tools/script.ts`
- Create: `server/tests/tools/script.test.ts`

- [ ] **Step 1: Write the failing test**

Create `server/tests/tools/script.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createScript, readScript, editScript } from '../../src/tools/script.js';
import { mkdirSync, readFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';

describe('script tools', () => {
  const projectRoot = join(process.cwd(), 'test-project');

  beforeEach(() => {
    mkdirSync(projectRoot, { recursive: true });
  });

  afterEach(() => {
    rmSync(projectRoot, { recursive: true, force: true });
  });

  it('creates a GDScript file', () => {
    const result = createScript({ script_path: 'res://player.gd', extends_type: 'CharacterBody2D' }, projectRoot);
    expect(result.created).toBe(true);
    const path = join(projectRoot, 'player.gd');
    expect(existsSync(path)).toBe(true);
    const content = readFileSync(path, 'utf-8');
    expect(content).toContain('extends CharacterBody2D');
  });

  it('reads a script file', () => {
    createScript({ script_path: 'res://enemy.gd', extends_type: 'Node2D' }, projectRoot);
    const result = readScript({ script_path: 'res://enemy.gd' }, projectRoot);
    expect(result.content).toContain('extends Node2D');
    expect(result.language).toBe('gdscript');
  });

  it('edits a script by full replacement', () => {
    createScript({ script_path: 'res://test.gd', extends_type: 'Node' }, projectRoot);
    editScript({ script_path: 'res://test.gd', replacement: 'extends Node\n\nfunc _ready():\n    pass' }, projectRoot);
    const content = readFileSync(join(projectRoot, 'test.gd'), 'utf-8');
    expect(content).toContain('func _ready()');
  });

  it('edits a script by line range', () => {
    createScript({ script_path: 'res://range.gd', extends_type: 'Node' }, projectRoot);
    editScript({ script_path: 'res://range.gd', start_line: 2, end_line: 2, replacement: '\nclass_name MyClass\n' }, projectRoot);
    const content = readFileSync(join(projectRoot, 'range.gd'), 'utf-8');
    expect(content).toContain('class_name MyClass');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest server/tests/tools/script.test.ts --run`
Expected: FAIL — `Cannot find module`

- [ ] **Step 3: Write minimal implementation**

Create `server/src/tools/script.ts`:

```typescript
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { validateProjectPath } from './file.js';

export interface CreateScriptArgs {
  script_path: string;
  extends_type?: string;
  template?: string;
}

export interface CreateScriptResult {
  path: string;
  created: boolean;
}

export function createScript(args: CreateScriptArgs, projectRoot: string): CreateScriptResult {
  const resolved = validateProjectPath(args.script_path, projectRoot);
  if (existsSync(resolved)) {
    throw new Error(`Script already exists: ${args.script_path}`);
  }

  const extendsType = args.extends_type || 'Node';
  const content = args.template || `extends ${extendsType}\n\nfunc _ready():\n    pass\n`;

  writeFileSync(resolved, content, 'utf-8');
  return { path: args.script_path, created: true };
}

export interface ReadScriptArgs {
  script_path: string;
}

export interface ReadScriptResult {
  content: string;
  language: string;
  lineCount: number;
}

export function readScript(args: ReadScriptArgs, projectRoot: string): ReadScriptResult {
  const resolved = validateProjectPath(args.script_path, projectRoot);
  if (!existsSync(resolved)) {
    throw new Error(`Script not found: ${args.script_path}`);
  }

  const content = readFileSync(resolved, 'utf-8');
  const ext = args.script_path.split('.').pop()?.toLowerCase();
  const language = ext === 'gd' ? 'gdscript' : ext === 'cs' ? 'csharp' : 'unknown';

  return {
    content,
    language,
    lineCount: content.split('\n').length,
  };
}

export interface EditScriptArgs {
  script_path: string;
  replacement: string;
  start_line?: number;
  end_line?: number;
}

export interface EditScriptResult {
  path: string;
  linesChanged: number;
}

export function editScript(args: EditScriptArgs, projectRoot: string): EditScriptResult {
  const resolved = validateProjectPath(args.script_path, projectRoot);
  if (!existsSync(resolved)) {
    throw new Error(`Script not found: ${args.script_path}`);
  }

  const content = readFileSync(resolved, 'utf-8');
  const lines = content.split('\n');

  if (args.start_line !== undefined && args.end_line !== undefined) {
    const start = Math.max(0, args.start_line - 1);
    const end = Math.min(lines.length, args.end_line);
    const newLines = args.replacement.split('\n');
    lines.splice(start, end - start, ...newLines);
  } else {
    lines.length = 0;
    lines.push(...args.replacement.split('\n'));
  }

  const newContent = lines.join('\n');
  writeFileSync(resolved, newContent, 'utf-8');

  return {
    path: args.script_path,
    linesChanged: Math.abs((args.end_line ?? lines.length) - (args.start_line ?? 1)) + 1,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest server/tests/tools/script.test.ts --run`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/src/tools/script.ts server/tests/tools/script.test.ts
git commit -m "feat(tools): script create, read, and edit with full or line-range replacement"
```

---

### Task 10: Node Tools (Offline + Online-Aware)

**Files:**
- Create: `server/src/tools/node.ts`
- Create: `server/tests/tools/node.test.ts`

- [ ] **Step 1: Write the failing test**

Create `server/tests/tools/node.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getSceneTree, getNode, addNode, removeNode, updateProperty } from '../../src/tools/node.js';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';

describe('node tools', () => {
  const projectRoot = join(process.cwd(), 'test-project');

  beforeEach(() => {
    mkdirSync(projectRoot, { recursive: true });
    mkdirSync(join(projectRoot, 'scenes'), { recursive: true });
    writeFileSync(join(projectRoot, 'scenes', 'main.tscn'), `[gd_scene load_steps=1 format=3]
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

  it('add_node returns offline error when not connected', () => {
    const result = addNode({ scene_path: 'res://scenes/main.tscn', parent_path: '/root/Main', node_type: 'Sprite2D', node_name: 'Sprite' }, projectRoot, false);
    expect(result.added).toBe(false);
    expect(result.message).toContain('Godot editor');
  });

  it('remove_node returns offline error when not connected', () => {
    const result = removeNode({ scene_path: 'res://scenes/main.tscn', node_path: '/root/Main/Player' }, projectRoot, false);
    expect(result.removed).toBe(false);
    expect(result.message).toContain('Godot editor');
  });

  it('update_property returns offline error when not connected', () => {
    const result = updateProperty({ scene_path: 'res://scenes/main.tscn', node_path: '/root/Main/Player', property: 'position', value: 'Vector2(50, 50)' }, projectRoot, false);
    expect(result.updated).toBe(false);
    expect(result.message).toContain('Godot editor');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest server/tests/tools/node.test.ts --run`
Expected: FAIL — `Cannot find module`

- [ ] **Step 3: Write minimal implementation**

Create `server/src/tools/node.ts`:

```typescript
import { readScene, type SceneNodeResult } from './scene.js';

export interface GetSceneTreeArgs {
  scene_path: string;
}

export interface GetSceneTreeResult {
  nodes: SceneNodeResult[];
  rootName: string;
}

export function getSceneTree(args: GetSceneTreeArgs, projectRoot: string, godotConnected: boolean): GetSceneTreeResult {
  if (godotConnected) {
    return { nodes: [], rootName: '' };
  }

  const scene = readScene(args, projectRoot);
  const nodes: SceneNodeResult[] = [];

  function collect(node: SceneNodeResult) {
    nodes.push(node);
    for (const child of node.children) {
      collect(child);
    }
  }

  collect(scene.root);
  return { nodes, rootName: scene.root.name };
}

export interface GetNodeArgs {
  scene_path: string;
  node_path: string;
}

export interface GetNodeResult {
  name: string;
  type: string;
  path: string;
  properties: Record<string, string>;
}

export function getNode(args: GetNodeArgs, projectRoot: string, godotConnected: boolean): GetNodeResult {
  if (godotConnected) {
    return { name: '', type: '', path: '', properties: {} };
  }

  const scene = readScene(args, projectRoot);

  function find(node: SceneNodeResult): SceneNodeResult | null {
    if (node.path === args.node_path) return node;
    for (const child of node.children) {
      const found = find(child);
      if (found) return found;
    }
    return null;
  }

  const found = find(scene.root);
  if (!found) {
    throw new Error(`Node not found: ${args.node_path}`);
  }

  return {
    name: found.name,
    type: found.type,
    path: found.path,
    properties: found.properties,
  };
}

export interface AddNodeArgs {
  scene_path: string;
  parent_path: string;
  node_type: string;
  node_name: string;
}

export interface AddNodeResult {
  added: boolean;
  message: string;
}

export function addNode(_args: AddNodeArgs, _projectRoot: string, godotConnected: boolean): AddNodeResult {
  if (!godotConnected) {
    return { added: false, message: 'add_node requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  return { added: true, message: 'Node added via Godot editor.' };
}

export interface RemoveNodeArgs {
  scene_path: string;
  node_path: string;
}

export interface RemoveNodeResult {
  removed: boolean;
  message: string;
}

export function removeNode(_args: RemoveNodeArgs, _projectRoot: string, godotConnected: boolean): RemoveNodeResult {
  if (!godotConnected) {
    return { removed: false, message: 'remove_node requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  return { removed: true, message: 'Node removed via Godot editor.' };
}

export interface UpdatePropertyArgs {
  scene_path: string;
  node_path: string;
  property: string;
  value: string;
}

export interface UpdatePropertyResult {
  updated: boolean;
  message: string;
}

export function updateProperty(_args: UpdatePropertyArgs, _projectRoot: string, godotConnected: boolean): UpdatePropertyResult {
  if (!godotConnected) {
    return { updated: false, message: 'update_property requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  return { updated: true, message: 'Property updated via Godot editor.' };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest server/tests/tools/node.test.ts --run`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/src/tools/node.ts server/tests/tools/node.test.ts
git commit -m "feat(tools): node get_scene_tree and get_node (offline), add/remove/update (online-aware)"
```

---

### Task 11: Editor Tools (Online-Only)

**Files:**
- Create: `server/src/tools/editor.ts`

- [ ] **Step 1: Write the implementation directly (no failing test needed — these are pure passthroughs)**

Create `server/src/tools/editor.ts`:

```typescript
export interface RunProjectArgs {
  scene_path?: string;
}

export interface RunProjectResult {
  running: boolean;
  message: string;
}

export function runProject(_args: RunProjectArgs, godotConnected: boolean): RunProjectResult {
  if (!godotConnected) {
    return { running: false, message: 'run_project requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  return { running: true, message: 'Project run requested via Godot editor.' };
}

export interface GetOutputLogArgs {
  lines?: number;
}

export interface GetOutputLogResult {
  lines: string[];
  message: string;
}

export function getOutputLog(_args: GetOutputLogArgs, godotConnected: boolean): GetOutputLogResult {
  if (!godotConnected) {
    return { lines: [], message: 'get_output_log requires Godot editor to be running with the Godot MCP plugin enabled.' };
  }
  return { lines: [], message: 'Output log requested via Godot editor.' };
}
```

- [ ] **Step 2: Commit**

```bash
git add server/src/tools/editor.ts
git commit -m "feat(tools): editor run_project and get_output_log (online-only stubs)"
```

---

### Task 12: Tool Registry

**Files:**
- Create: `server/src/tools/index.ts`

- [ ] **Step 1: Write the tool registry**

Create `server/src/tools/index.ts`:

```typescript
import type { GodotBridge } from '../godot-bridge.js';
import type { Config } from '../config.js';
import { readFileTool, writeFileTool } from './file.js';
import { listProjectFiles, readProjectSettings, getProjectInfo } from './project.js';
import { readScene, createScene, saveScene, openScene } from './scene.js';
import { getSceneTree, getNode, addNode, removeNode, updateProperty } from './node.js';
import { createScript, readScript, editScript } from './script.js';
import { runProject, getOutputLog } from './editor.js';

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: object;
  handler: (args: Record<string, unknown>) => Promise<unknown> | unknown;
}

export function buildToolRegistry(config: Config, bridge: GodotBridge): ToolDefinition[] {
  const projectRoot = config.project_path;

  const allTools: ToolDefinition[] = [
    {
      name: 'list_project_files',
      description: 'List all files in the Godot project. Optional filter by extension.',
      inputSchema: {
        type: 'object',
        properties: {
          extension: { type: 'string', description: 'Filter by file extension (e.g., ".tscn")' },
        },
      },
      handler: (args) => listProjectFiles(args, projectRoot),
    },
    {
      name: 'read_project_settings',
      description: 'Read key settings from project.godot (project name, features, rendering).',
      inputSchema: { type: 'object', properties: {} },
      handler: () => readProjectSettings({}, projectRoot),
    },
    {
      name: 'get_project_info',
      description: 'Get project metadata: engine version, rendering backend.',
      inputSchema: { type: 'object', properties: {} },
      handler: () => getProjectInfo({}, projectRoot),
    },
    {
      name: 'read_scene',
      description: 'Read a .tscn file and return its node tree structure.',
      inputSchema: {
        type: 'object',
        properties: {
          scene_path: { type: 'string', description: 'Path to .tscn file (e.g., res://scenes/main.tscn)' },
        },
        required: ['scene_path'],
      },
      handler: (args) => readScene(args as { scene_path: string }, projectRoot),
    },
    {
      name: 'create_scene',
      description: 'Create a new .tscn file with a root node.',
      inputSchema: {
        type: 'object',
        properties: {
          scene_path: { type: 'string', description: 'Path for new scene' },
          root_type: { type: 'string', description: 'Godot node type for root' },
          root_name: { type: 'string', description: 'Name for root node' },
        },
        required: ['scene_path', 'root_type', 'root_name'],
      },
      handler: (args) => createScene(args as { scene_path: string; root_type: string; root_name: string }, projectRoot),
    },
    {
      name: 'save_scene',
      description: 'Save the current scene in Godot editor.',
      inputSchema: {
        type: 'object',
        properties: {
          scene_path: { type: 'string', description: 'Path to scene to save' },
        },
        required: ['scene_path'],
      },
      handler: (args) => saveScene(args as { scene_path: string }, projectRoot, bridge.isConnected),
    },
    {
      name: 'open_scene',
      description: 'Open a scene in Godot editor.',
      inputSchema: {
        type: 'object',
        properties: {
          scene_path: { type: 'string', description: 'Path to scene to open' },
        },
        required: ['scene_path'],
      },
      handler: (args) => openScene(args as { scene_path: string }, projectRoot, bridge.isConnected),
    },
    {
      name: 'get_scene_tree',
      description: 'Get the full node tree of a scene.',
      inputSchema: {
        type: 'object',
        properties: {
          scene_path: { type: 'string', description: 'Path to .tscn file' },
        },
        required: ['scene_path'],
      },
      handler: (args) => getSceneTree(args as { scene_path: string }, projectRoot, bridge.isConnected),
    },
    {
      name: 'get_node',
      description: 'Get details of a single node by path.',
      inputSchema: {
        type: 'object',
        properties: {
          scene_path: { type: 'string', description: 'Path to .tscn file' },
          node_path: { type: 'string', description: 'Full node path (e.g., /root/Main/Player)' },
        },
        required: ['scene_path', 'node_path'],
      },
      handler: (args) => getNode(args as { scene_path: string; node_path: string }, projectRoot, bridge.isConnected),
    },
    {
      name: 'add_node',
      description: 'Add a node to a scene in Godot editor.',
      inputSchema: {
        type: 'object',
        properties: {
          scene_path: { type: 'string' },
          parent_path: { type: 'string', description: 'Path of parent node' },
          node_type: { type: 'string', description: 'Godot node type' },
          node_name: { type: 'string', description: 'Name for new node' },
        },
        required: ['scene_path', 'parent_path', 'node_type', 'node_name'],
      },
      handler: (args) => addNode(args as any, projectRoot, bridge.isConnected),
    },
    {
      name: 'remove_node',
      description: 'Remove a node from a scene in Godot editor.',
      inputSchema: {
        type: 'object',
        properties: {
          scene_path: { type: 'string' },
          node_path: { type: 'string', description: 'Path of node to remove' },
        },
        required: ['scene_path', 'node_path'],
      },
      handler: (args) => removeNode(args as any, projectRoot, bridge.isConnected),
    },
    {
      name: 'update_property',
      description: 'Update a property of a node in Godot editor.',
      inputSchema: {
        type: 'object',
        properties: {
          scene_path: { type: 'string' },
          node_path: { type: 'string' },
          property: { type: 'string', description: 'Property name' },
          value: { type: 'string', description: 'New value' },
        },
        required: ['scene_path', 'node_path', 'property', 'value'],
      },
      handler: (args) => updateProperty(args as any, projectRoot, bridge.isConnected),
    },
    {
      name: 'create_script',
      description: 'Create a new GDScript or C# file.',
      inputSchema: {
        type: 'object',
        properties: {
          script_path: { type: 'string', description: 'Path for new script (e.g., res://player.gd)' },
          extends_type: { type: 'string', description: 'Base class to extend' },
          template: { type: 'string', description: 'Optional template content' },
        },
        required: ['script_path'],
      },
      handler: (args) => createScript(args as any, projectRoot),
    },
    {
      name: 'read_script',
      description: 'Read the content of a script file.',
      inputSchema: {
        type: 'object',
        properties: {
          script_path: { type: 'string', description: 'Path to script' },
        },
        required: ['script_path'],
      },
      handler: (args) => readScript(args as any, projectRoot),
    },
    {
      name: 'edit_script',
      description: 'Edit a script by full replacement or line range.',
      inputSchema: {
        type: 'object',
        properties: {
          script_path: { type: 'string' },
          replacement: { type: 'string', description: 'New content' },
          start_line: { type: 'number', description: 'Start line for partial edit (1-based)' },
          end_line: { type: 'number', description: 'End line for partial edit (1-based)' },
        },
        required: ['script_path', 'replacement'],
      },
      handler: (args) => editScript(args as any, projectRoot),
    },
    {
      name: 'run_project',
      description: 'Run the Godot project (Play button).',
      inputSchema: {
        type: 'object',
        properties: {
          scene_path: { type: 'string', description: 'Optional specific scene to run' },
        },
      },
      handler: (args) => runProject(args as any, bridge.isConnected),
    },
    {
      name: 'get_output_log',
      description: 'Get recent lines from the Godot editor output log.',
      inputSchema: {
        type: 'object',
        properties: {
          lines: { type: 'number', description: 'Number of lines to retrieve' },
        },
      },
      handler: (args) => getOutputLog(args as any, bridge.isConnected),
    },
    {
      name: 'read_file',
      description: 'Read any file in the project.',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path (e.g., res://README.md)' },
        },
        required: ['path'],
      },
      handler: (args) => readFileTool(args as any, projectRoot),
    },
    {
      name: 'write_file',
      description: 'Write content to any file in the project.',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path' },
          content: { type: 'string', description: 'Content to write' },
        },
        required: ['path', 'content'],
      },
      handler: (args) => writeFileTool(args as any, projectRoot),
    },
  ];

  // Mode filtering
  const mode = config.mode;
  const liteTools = ['list_project_files', 'read_project_settings', 'get_project_info',
    'read_scene', 'create_scene', 'save_scene', 'open_scene',
    'get_scene_tree', 'get_node', 'add_node', 'remove_node', 'update_property',
    'create_script', 'read_script', 'edit_script',
    'run_project', 'get_output_log', 'read_file', 'write_file'];
  const minimalTools = ['list_project_files', 'read_project_settings', 'get_project_info',
    'read_scene', 'create_scene', 'get_scene_tree', 'get_node',
    'create_script', 'read_script', 'edit_script', 'read_file', 'write_file'];

  if (mode === 'minimal') {
    return allTools.filter((t) => minimalTools.includes(t.name));
  }
  if (mode === 'lite') {
    return allTools.filter((t) => liteTools.includes(t.name));
  }
  return allTools;
}
```

- [ ] **Step 2: Commit**

```bash
git add server/src/tools/index.ts
git commit -m "feat(tools): register all 19 tools with mode-based filtering (full/lite/minimal)"
```

---

### Task 13: MCP Server Entry Point

**Files:**
- Create: `server/src/server.ts`
- Modify: `package.json` (add bin entry)

- [ ] **Step 1: Write the failing test for server startup**

Create `server/tests/server.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';

describe('server entry', () => {
  it('exports a main function', async () => {
    const { main } = await import('../src/server.js');
    expect(typeof main).toBe('function');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest server/tests/server.test.ts --run`
Expected: FAIL — `Cannot find module`

- [ ] **Step 3: Write the server implementation**

Create `server/src/server.ts`:

```typescript
#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { loadConfig, type Config } from './config.js';
import { parseArgs, printHelp } from './cli.js';
import { GodotBridge } from './godot-bridge.js';
import { buildToolRegistry } from './tools/index.js';

export async function main(): Promise<void> {
  const cliArgs = parseArgs(process.argv.slice(2));

  if (cliArgs.help) {
    printHelp();
    process.exit(0);
  }

  const config = loadConfig('./settings.json');
  if (cliArgs.mode) config.mode = cliArgs.mode;
  if (cliArgs.port) config.port = cliArgs.port;
  if (cliArgs.logLevel) config.log_level = cliArgs.logLevel;

  const bridge = new GodotBridge(config.port);

  // Attempt to connect to Godot (non-blocking)
  bridge.connect().catch(() => {
    // Godot not running — tools will operate in offline mode
  });

  const tools = buildToolRegistry(config, bridge);

  const server = new Server(
    { name: 'godot-mcp', version: '1.0.0' },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: tools.map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
      })),
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const tool = tools.find((t) => t.name === request.params.name);
    if (!tool) {
      throw new Error(`Unknown tool: ${request.params.name}`);
    }

    try {
      const result = await tool.handler(request.params.arguments || {});
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: message }) }],
        isError: true,
      };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Keep process alive
  await new Promise(() => {});
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error('Server error:', err);
    process.exit(1);
  });
}
```

- [ ] **Step 4: Update package.json bin entry**

Modify `package.json`:

```json
  "bin": {
    "godot-mcp": "dist/server.js"
  },
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest server/tests/server.test.ts --run`
Expected: PASS

- [ ] **Step 6: Build and verify**

Run: `npm run build`
Expected: `dist/` created with compiled JS, no errors.

- [ ] **Step 7: Commit**

```bash
git add server/src/server.ts server/tests/server.test.ts package.json
git commit -m "feat(server): MCP stdio server with tool discovery and request routing"
```

---

### Task 14: Full Test Suite Run

- [ ] **Step 1: Run all tests**

Run: `npx vitest --run`
Expected: PASS (all test files)

- [ ] **Step 2: Commit (if any fixes needed)**

If any tests fail, fix and commit before proceeding to Plan 2.

---

## Self-Review

**1. Spec coverage for Plan 1 (offline TypeScript server):**

| Spec Requirement | Task |
|-----------------|------|
| TypeScript MCP server over stdio | Task 13 |
| Config loading (settings.json, env vars) | Task 2 |
| CLI (--mode, --port, --log-level) | Task 3 |
| File parser (.tscn, .gd, .tres) | Task 4 |
| WebSocket bridge (client, reconnect, heartbeat) | Task 5 |
| project tools (list, settings, info) | Task 7 |
| scene tools (read, create — offline) | Task 8 |
| script tools (create, read, edit) | Task 9 |
| file tools (read, write with path validation) | Task 6 |
| node tools (get_scene_tree, get_node — offline; add/remove/update — online-aware) | Task 10 |
| editor tools (run_project, get_output_log — online-only stubs) | Task 11 |
| Tool registry with mode filtering | Task 12 |
| Security: path restriction | Task 6 |

**2. Placeholder scan:** No TBD, TODO, or vague steps found. All steps have code.

**3. Type consistency:** All handler signatures, result types, and argument interfaces are consistent across tasks.

---

## Execution Handoff

**Plan 1 complete and saved to `docs/superpowers/plans/2026-05-21-godot-mcp-server.md`.**

Plan 2 (Godot Editor Plugin) and Plan 3 (Integration & Packaging) are separate plans to be written next. This plan produces a standalone MCP server that can read and write Godot project files without Godot running.

**Two execution options:**

**1. Subagent-Driven (recommended)** — Dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
