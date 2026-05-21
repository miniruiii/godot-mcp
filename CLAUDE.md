# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Godot MCP is an open-source Model Context Protocol (MCP) server for Godot 4.6.2+. It connects AI assistants to Godot projects through two integrated components:

1. **TypeScript MCP Server** (`server/`): Handles MCP stdio communication with AI clients
2. **Godot Editor Plugin** (`addons/godot_mcp/`): GDScript plugin that runs inside Godot editor, exposing engine APIs via WebSocket

Communication flows: AI Client → MCP/stdio → TypeScript Server → WebSocket/JSON-RPC → Godot Plugin → Godot Engine

## Common Commands

```bash
npm run build      # Compile TypeScript to dist/
npm run dev        # Watch mode for development
npm test           # Run all tests (vitest)
npm run start      # Start MCP server (node dist/server.js)
```

## Architecture

### MCP Server (`server/src/`)

- `server.ts` - Entry point, initializes MCP server and WebSocket bridge
- `godot-bridge.ts` - WebSocket client connecting to Godot plugin (port 6505)
- `cli.ts` - CLI argument parsing
- `config.ts` - Configuration loading
- `tools/` - Tool implementations organized by domain:
  - `index.ts` - Tool registry (69 tools currently)
  - `runtime.ts`, `input.ts` - Runtime/input tools (Phase 1)
  - `scene.ts`, `script.ts`, `editor.ts` - Scene/script/editor tools (Phase 2)
  - `node.ts`, `project.ts`, `file.ts`, `editor.ts` - Base tools

### Godot Plugin (`addons/godot_mcp/`)

- `rpc_handler.gd` - Routes JSON-RPC calls to handler classes
- `plugin.gd` - Godot plugin entry point
- `websocket_server.gd` - WebSocket server (port 6505)
- `utils.gd` - Utility functions (error codes, engine info)
- `editors/` - Handler classes for different tool categories:
  - `scene_editor.gd` - Scene manipulation tools
  - `script_editor.gd` - Script tools
  - `project_editor.gd` - Editor/project tools
  - `runtime_commands.gd` - Runtime introspection tools (Phase 1)
  - `input_commands.gd` - Input simulation tools (Phase 1)

### RPC Routing Pattern

The plugin uses method prefixes to route calls:
- `scene.*` → scene_editor.gd
- `script.*` → script_editor.gd
- `project.*` → project_editor.gd
- `game.*` → runtime_commands.gd (runtime introspection)
- `input.*` → input_commands.gd (input simulation)
- `node.*` → scene_editor.gd (node manipulation)

### Dual-Mode Design

Tools work in two modes:
- **Offline**: File system operations (read_scene, create_script, etc.)
- **Online**: Godot editor operations via WebSocket bridge (add_node, run_project, etc.)

When `bridge.isConnected` is false, tools return offline fallback responses.

## Expansion Plan

Implementation follows 8-phase plan in `docs/superpowers/`:

| Phase | Category | Tools | Status |
|-------|----------|-------|--------|
| 1 | Runtime/Input/Node | 40 | Complete |
| 2 | Scene/Script/Editor | 26 | Complete |
| 3 | Animation/TileMap/Theme-UI | 18 | Pending |
| 4-8 | Remaining categories | ~100 | Pending |

Plans stored in `docs/superpowers/plans/YYYY-MM-DD-*.md`, specs in `docs/superpowers/specs/`.

## Testing

Tests are in `server/tests/` using vitest. Integration tests mock WebSocket server on port 16508. Run single test file with: `npx vitest run tests/tools/node.test.ts`

## Key Files

- `rpc_handler.gd` - Start here to understand plugin routing
- `godot-bridge.ts` - Start here to understand server-plugin communication
- `server/src/tools/index.ts` - Tool registry and definitions