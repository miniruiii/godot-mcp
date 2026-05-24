# UID Conversion Tools — Design Spec

## Overview

Add two MCP tools for converting between Godot UIDs (`uid://...`) and `res://` paths:
- `uid_to_project_path` — UID → `res://` conversion
- `project_path_to_uid` — `res://` → UID conversion

## Architecture

```
Node.js (tool-cli.ts / MCP server)
    ↓ bridge.call("project.uid_to_path", {uid})
    ↓ WebSocket (port 6505)
rpc_handler.gd (method routing)
    ↓
project_editor.gd (implementation)
    ↓ Godot API
ResourceUID / ResourceLoader
```

## Endpoints

### `project.uid_to_path`

**GDScript implementation** (`project_editor.gd`):
1. Validate `uid` parameter is non-empty
2. `ResourceUID.text_to_id(uid_str)` → integer ID
3. If `INVALID_ID` → error `-32602 Invalid UID format`
4. If `!ResourceUID.has_id(uid)` → error `-404 UID not found`
5. `ResourceUID.get_id_path(uid)` → return `{ uid, path }`

**Error codes:**
- `-32602` — missing or invalid UID format
- `-404` — UID not found in ResourceUID system

### `project.path_to_uid`

**GDScript implementation** (`project_editor.gd`):
1. Validate `path` parameter is non-empty
2. `ResourceLoader.exists(path)` → if false, error `-404 Resource not found`
3. `ResourceLoader.get_resource_uid(path)` → UID integer
4. If `INVALID_ID` → error `-32001 No UID assigned`
5. `ResourceUID.id_to_text(uid)` → return `{ path, uid }`

**Error codes:**
- `-32602` — missing path
- `-404` — resource not found at path
- `-32001` — resource exists but has no UID assigned

## Files to Modify

| File | Changes |
|------|---------|
| `addons/godot_mcp/editors/project_editor.gd` | Add `_uid_to_project_path()` and `_project_path_to_uid()` |
| `addons/godot_mcp/rpc_handler.gd` | Add `"project.uid_to_path"` and `"project.path_to_uid"` routes |
| `server/src/tools/project.ts` | Add `uidToProjectPath()` and `projectPathToUid()` |
| `server/src/tools/index.ts` | Register 2 tool definitions |
| `server/src/tool-cli.ts` | Add CLI command mappings |

## Tool Definitions

### `uid_to_project_path`
- **group:** `project`
- **input:** `{ uid: string }` (required)
- **output:** `{ uid: string, path: string }`
- **requires bridge:** yes

### `project_path_to_uid`
- **group:** `project`
- **input:** `{ path: string }` (required)
- **output:** `{ path: string, uid: string }`
- **requires bridge:** yes

## CLI Commands

```
project uid-to-path --uid=<uid>
project path-to-uid --path=<path>
```

## Constraints

- Both tools **require bridge connection** — if Godot editor is not connected, return error
- Output format matches godot-mcp-pro naming convention (`uid`/`path` field names)
- No offline fallback — this is intentional (aligned with godot-mcp-pro)