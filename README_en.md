# Godot MCP

A fully open-source Model Context Protocol (MCP) implementation for Godot 4.6.2+. Connect AI assistants (Claude, Cursor, VS Code Copilot) to your Godot projects for intelligent code and scene editing.

## Features

- **Dual-mode operation**: Works offline (file system) or online (live Godot editor via WebSocket)
- **133 built-in tools**: Project exploration, scene editing, script management, node manipulation, runtime introspection, input simulation, and project execution
- **Three run modes**: Full, Lite, Minimal — adapt to your AI client's context limits
- **Secure**: Path restrictions prevent directory traversal; WebSocket bound to localhost only
- **UndoRedo support**: All editor modifications go through Godot's undo system

## Quick Start

### Install MCP Server

```bash
npm install -g godot-mcp
```

Or run without installing:

```bash
npx godot-mcp
```

### Install Godot Editor Plugin

1. Copy `addons/godot_mcp/` into your Godot project's `addons/` folder
2. Open **Project Settings > Plugins**
3. Enable "Godot MCP"

### Configure AI Clients

#### Claude Desktop

Edit `claude_desktop_config.json`:

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

## CLI Options

```bash
godot-mcp [options]

Options:
  --mode <full|lite|minimal>  Run mode (default: full)
  --port <number>             WebSocket port (default: 6505)
  --log-level <level>        Log level: debug, info, warn, error (default: info)
  --help, -h                  Show this help
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GODOT_MCP_MODE` | Run mode | `full` |
| `GODOT_MCP_PORT` | WebSocket port | `6505` |
| `GODOT_MCP_PROJECT_PATH` | Godot project path | `./` |
| `GODOT_MCP_LOG_LEVEL` | Log level | `info` |

## Tools Reference

### Project Tools (All Modes)
- `list_project_files` — List project files, filter by extension
- `read_project_settings` — Read project.godot settings
- `get_project_info` — Get engine version and rendering backend

### Scene Tools (All Modes)
- `read_scene` — Parse .tscn into structured node tree
- `create_scene` — Create a new scene file

### Scene Tools (Online)
- `save_scene` — Save current scene
- `open_scene` — Open scene in editor
- `add_node` — Add node to scene
- `remove_node` — Remove node
- `update_property` — Modify node property

### Node Tools (All Modes)
- `get_scene_tree` — Get full node tree
- `get_node` — Get single node details

### Script Tools (All Modes)
- `create_script` — Create .gd or .cs file
- `read_script` — Read script content
- `edit_script` — Edit by full replacement or line range

### Editor Tools (Online)
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

## Development

```bash
npm install
npm run build    # Compile TypeScript
npm test         # Run tests (vitest run)
```

## License

MIT