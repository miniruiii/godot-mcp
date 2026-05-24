# Godot MCP

[![npm version](https://img.shields.io/npm/v/@minirui/godot-mcp)](https://www.npmjs.com/package/@minirui/godot-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Godot 4.6](https://img.shields.io/badge/Godot-4.6.2+-478CBF)](https://godotengine.org)

> Connect AI assistants to Godot 4.6.2+ via the [Model Context Protocol](https://modelcontextprotocol.io/).

Godot MCP is a fully open-source MCP server and editor plugin that bridges AI clients (Claude, Cursor, VS Code Copilot, etc.) with your Godot projects. It provides **56 tools** across 8 categories, operating in both **offline** (file system) and **online** (live Godot editor) modes.

[中文文档](README_zh.md)

---

## Features

- **Dual-Mode Operation**
  - **Offline**: Works with file system only — parse scenes, read scripts, list files.
  - **Online**: Full integration with live Godot editor via WebSocket — edit scenes, run project, inspect runtime state.

- **56 Built-in Tools**
  - **Project**: File listing, settings, metadata, UID conversion, resource scanning, UID removal
  - **Scene**: Read/parse `.tscn`, create, save, open scenes
  - **Node**: Tree introspection, add/remove/duplicate/move/rename nodes, signal wiring, group management
  - **Script**: Create, read, edit GDScript/C# files
  - **Editor**: Run project, fetch output logs
  - **File**: Read/write any project file
  - **Game** (runtime): Scene tree introspection, property manipulation, script execution, UI interaction, frame capture, input recording/replay
  - **Input**: Key/mouse/action simulation

- **CLI + MCP Dual Entry**
  - Use as a traditional **MCP server** with AI clients
  - Or use as a standalone **CLI tool** for scripting and automation

- **Safe & Reversible**
  - Path traversal protection
  - WebSocket bound to localhost only
  - All editor mutations go through Godot's native Undo/Redo system

---

## Quick Start

### 1. Install the MCP Server

```bash
npm install -g @minirui/godot-mcp
```

Or run without installing:

```bash
npx @minirui/godot-mcp
```

### 2. Install the Godot Editor Plugin

1. Copy the `addons/godot_mcp/` folder into your Godot project's `addons/` directory.
2. Open **Project > Project Settings > Plugins**.
3. Enable **"Godot MCP"**.

The plugin starts a WebSocket server on port `6505` (configurable).

### 3. Configure Your AI Client

#### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "godot": {
      "command": "npx",
      "args": ["@minirui/godot-mcp"]
    }
  }
}
```

#### Cursor / VS Code Copilot

Add to your MCP settings:

```json
{
  "mcpServers": {
    "godot": {
      "command": "npx",
      "args": ["@minirui/godot-mcp"]
    }
  }
}
```

---

## CLI Usage

Godot MCP also works as a standalone CLI tool, useful for scripting and CI/CD.

```bash
# Show all available commands
godot-mcp

# Project commands (offline)
godot-mcp project list-files --extension .gd
godot-mcp project settings
godot-mcp project info

# UID and resource commands (requires Godot editor)
godot-mcp project uid-to-path --uid uid://abc123
godot-mcp project path-to-uid --path res://scripts/main.gd
godot-mcp project rescan
godot-mcp project remove-uid --uid uid://abc123

# Scene commands (offline)
godot-mcp scene read --scene-path res://main.tscn
godot-mcp scene create --scene-path res://new.tscn --root-type Node2D --root-name Root

# Node commands (requires Godot editor)
godot-mcp node tree --scene-path res://main.tscn
godot-mcp node add --scene-path res://main.tscn --parent-path /root/Main --node-type Sprite2D --node-name Player

# Game commands (requires running game)
godot-mcp game tree --max-depth 3
godot-mcp game execute --code "1 + 1"
godot-mcp game execute --code $'extends Node2D\nfunc _ready():\n    print(\"Hello\")'
godot-mcp game capture

# Input simulation
godot-mcp input key --keycode 65 --pressed true
godot-mcp input mouse-click --button-index 1 --position-x 100 --position-y 200
```

Use `--help` at any level for details:

```bash
godot-mcp project --help
godot-mcp game execute --help
```

---

## Configuration

Create a `settings.json` in your working directory:

```json
{
  "port": 6505,
  "mode": "full",
  "project_path": "./",
  "log_level": "info"
}
```

Or use environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `GODOT_MCP_PORT` | WebSocket port | `6505` |
| `GODOT_MCP_MODE` | Tool set: `full` / `lite` / `minimal` | `full` |
| `GODOT_MCP_PROJECT_PATH` | Path to Godot project | `./` |
| `GODOT_MCP_LOG_LEVEL` | Log verbosity | `info` |

### Modes

| Mode | Tools | Use Case |
|------|-------|----------|
| `full` | All 56 tools | AI clients with large context windows |
| `lite` | 39 tools | Balanced context usage |
| `minimal` | 12 tools | Highly constrained contexts |

---

## Architecture

```
┌─────────────┐      stdio/MCP      ┌──────────────────┐      WebSocket/JSON-RPC      ┌─────────────┐
│  AI Client  │ ◄──────────────────► │  TypeScript Server │ ◄────────────────────────► │ Godot Plugin │
│ (Claude etc)│                      │   (godot-mcp)      │                            │  (GDScript)  │
└─────────────┘                      └──────────────────┘                            └─────────────┘
                                              │
                                              ▼
                                       ┌─────────────┐
                                       │ File System │
                                       │ (.tscn, .gd)│
                                       └─────────────┘
```

- **TypeScript Server**: MCP protocol handler, CLI entry point, file parser, WebSocket client.
- **Godot Plugin**: WebSocket server, RPC router, editor command executor, runtime inspector.

---

## Development

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run tests
npm test

# Watch mode
npm run dev
```

### Project Structure

```
godot-mcp/
├── addons/godot_mcp/          # Godot editor plugin (GDScript)
│   ├── plugin.gd              # Plugin entry point
│   ├── rpc_handler.gd         # JSON-RPC request router
│   ├── websocket_server.gd    # WebSocket peer manager
│   └── editors/               # Tool implementations
│       ├── scene_editor.gd
│       ├── script_editor.gd
│       ├── runtime_commands.gd
│       └── input_commands.gd
├── server/src/                # TypeScript MCP server
│   ├── cli.ts / tool-cli.ts   # CLI entry points
│   ├── server.ts              # MCP server entry
│   ├── godot-bridge.ts        # WebSocket client
│   └── tools/                 # Tool handlers
│       ├── project.ts
│       ├── scene.ts
│       ├── node.ts
│       ├── runtime.ts
│       └── ...
├── dist/                      # Compiled JavaScript
├── settings.json              # Server configuration
└── package.json
```

---

## Contributing

Contributions are welcome! Please open an issue or pull request.

## License

MIT
