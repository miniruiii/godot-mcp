# CLI Mode Design

> **Goal:** Add a CLI interface to godot-mcp so AI agents can invoke tools directly via command line, while preserving the existing MCP Server mode for Claude Desktop compatibility.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    godot-mcp (npm package)                   │
│                                                              │
│  ┌─────────────┐        ┌─────────────────┐                 │
│  │  cli.ts     │        │  server.ts      │                 │
│  │  (CLI entry)│        │  (MCP entry)    │                 │
│  └──────┬──────┘        └────────┬────────┘                 │
│         │                        │                           │
│         └──────────┬─────────────┘                           │
│                    │                                          │
│         ┌──────────▼──────────┐                              │
│         │   GodotExecutor     │                              │
│         │   (shared core)     │                              │
│         └──────────┬──────────┘                              │
│                    │                                         │
│              WebSocket (port 6505)                           │
│                    │                                         │
│         ┌──────────▼──────────┐                              │
│         │   Godot Plugin      │                              │
│         │   (unchanged)       │                              │
│         └─────────────────────┘                              │
└─────────────────────────────────────────────────────────────┘
```

## Design Decisions

### 1. Command Naming

Use hierarchical names: `<group>.<command>`

| Group | Commands |
|-------|----------|
| `project` | `list-files`, `settings`, `info` |
| `scene` | `read`, `create`, `save`, `open` |
| `node` | `get`, `add`, `remove`, `duplicate`, `move`, `update` |
| `script` | `create`, `read`, `edit` |
| `editor` | `run`, `logs` |
| `game` | `tree`, `properties`, `set-property`, `execute`, `capture`, `find-ui`, `click` |
| `input` | `key`, `mouse-click`, `mouse-move`, `action`, `actions` |

### 2. Output Format

**Default:** JSON (for agent consumption)

```bash
$ godot-mcp project list-files
{"files":["main.tscn","player.gd","..."]}

$ godot-mcp game tree --max-depth 2
{"nodes":[{"name":"Main","type":"Node2D","path":"/root/Main"}],"scene_path":"res://main.tscn"}
```

**With `--pretty`:** Formatted JSON

### 3. Error Handling

Exit code non-zero on error. Error output to stderr in JSON:

```json
{"error":"Node not found: /root/Player","code":-32001}
```

### 4. Help System

Progressive discovery (like reference project):

```bash
$ godot-mcp --help              # List all groups
$ godot-mcp node --help         # List commands in group
$ godot-mcp node add --help     # Show command options
```

## File Changes

### New Files

- `server/src/core/executor.ts` — Unified execution layer
- `server/src/core/command-registry.ts` — Command registration and routing
- `server/src/cli.ts` — CLI entry point with argument parsing

### Modified Files

- `server/src/server.ts` — Refactor to use GodotExecutor
- `server/src/tools/index.ts` — Extract tool handlers to registry
- `package.json` — Add `bin` entries for both modes

## Core Interface

```typescript
// core/executor.ts
export interface ExecuteOptions {
  method: string;
  params: Record<string, unknown>;
  timeout?: number;
}

export class GodotExecutor {
  constructor(bridge: GodotBridge);
  async execute(options: ExecuteOptions): Promise<unknown>;
}

// core/command-registry.ts
export interface CommandDefinition {
  name: string;           // e.g. "node.add"
  group: string;          // e.g. "node"
  command: string;        // e.g. "add"
  description: string;
  params: ParamDefinition[];
  handler: (params: Record<string, unknown>) => Promise<unknown>;
}

export class CommandRegistry {
  register(cmd: CommandDefinition): void;
  getCommand(name: string): CommandDefinition | undefined;
  getGroups(): string[];
  getCommandsInGroup(group: string): CommandDefinition[];
}
```

## CLI Usage Examples

```bash
# Install globally
npm install -g godot-mcp

# MCP mode (for Claude Desktop)
godot-mcp-server

# CLI mode (for Claude Code / any agent)
godot-mcp project info
godot-mcp scene read --path res://main.tscn
godot-mcp node add --parent /root --type CharacterBody2D --name Player
godot-mcp game tree --max-depth 3
godot-mcp input key --keycode Space --pressed true
```

## Godot Plugin — No Changes Required

The existing Godot plugin already exposes JSON-RPC 2.0 over WebSocket. Both CLI and MCP modes connect to the same endpoint.

## Migration Path

1. Extract `GodotExecutor` from current `server.ts`
2. Migrate tool handlers from `tools/index.ts` to `CommandRegistry`
3. Add `cli.ts` entry point
4. Update `package.json` with dual `bin` entries
5. Test both modes

## Open Questions

1. Should offline tools (file reading) skip WebSocket connection entirely?
2. Should CLI support batch execution (`--batch file.json`)?
3. Should we add shell completion scripts?
