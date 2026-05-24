# UID Conversion Tools Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two MCP tools — `uid_to_project_path` and `project_path_to_uid` — for converting between Godot UIDs and `res://` paths.

**Architecture:** Godot-side implementation in `project_editor.gd` exposing two methods via RPC routing, called from Node.js via WebSocket bridge. Both tools are bridge-dependent (no offline fallback).

**Tech Stack:** GDScript (Godot 4.x `ResourceUID`/`ResourceLoader` API), TypeScript (Node.js server), WebSocket bridge

---

## File Structure

| File | Responsibility |
|------|----------------|
| `addons/godot_mcp/editors/project_editor.gd` | Godot-side implementation of `_uid_to_project_path` / `_project_path_to_uid` |
| `addons/godot_mcp/rpc_handler.gd` | RPC method routing for `project.uid_to_path` / `project.path_to_uid` |
| `server/src/tools/project.ts` | Node.js-side TS wrappers calling bridge |
| `server/src/tools/index.ts` | Tool definition registration |
| `server/src/tool-cli.ts` | CLI command mappings |

---

### Task 1: Add GDScript methods to `project_editor.gd`

**Files:**
- Modify: `addons/godot_mcp/editors/project_editor.gd`

- [ ] **Step 1: Add `_uid_to_project_path` method**

Append before the closing `}` of the file:

```gdscript
func _uid_to_project_path(params: Dictionary) -> Dictionary:
    var uid_str = params.get("uid", "")
    if uid_str == "":
        return { "error": { "code": -32602, "message": "Missing uid parameter" } }
    var uid = ResourceUID.text_to_id(uid_str)
    if uid == ResourceUID.INVALID_ID:
        return { "error": { "code": -32602, "message": "Invalid UID format: %s" % uid_str } }
    if not ResourceUID.has_id(uid):
        return { "error": { "code": -404, "message": "UID '%s' not found" % uid_str } }
    var path = ResourceUID.get_id_path(uid)
    return { "result": { "uid": uid_str, "path": path } }


func _project_path_to_uid(params: Dictionary) -> Dictionary:
    var path = params.get("path", "")
    if path == "":
        return { "error": { "code": -32602, "message": "Missing path parameter" } }
    if not ResourceLoader.exists(path):
        return { "error": { "code": -404, "message": "Resource not found: %s" % path } }
    var uid = ResourceLoader.get_resource_uid(path)
    if uid == ResourceUID.INVALID_ID:
        return { "error": { "code": -32001, "message": "No UID assigned to '%s'" % path } }
    var uid_str = ResourceUID.id_to_text(uid)
    return { "result": { "path": path, "uid": uid_str } }
```

- [ ] **Step 2: Commit**

```bash
git add addons/godot_mcp/editors/project_editor.gd
git commit -m "feat: add uid_to_project_path and project_path_to_uid in project_editor"
```

---

### Task 2: Add RPC routes to `rpc_handler.gd`

**Files:**
- Modify: `addons/godot_mcp/rpc_handler.gd` — add two entries in `_route()` match block

- [ ] **Step 1: Add routing entries**

Find the match block in `_route()`. Add these two cases before the default `_:` case:

```gdscript
"project.uid_to_path":
    return project_editor_inst._uid_to_project_path(params)
"project.path_to_uid":
    return project_editor_inst._project_path_to_uid(params)
```

Route placement: after `"project.get_info"` line and before the `# game.* routes` comment.

- [ ] **Step 2: Commit**

```bash
git add addons/godot_mcp/rpc_handler.gd
git commit -m "feat: route project.uid_to_path and project.path_to_uid RPC calls"
```

---

### Task 3: Add TS functions to `server/src/tools/project.ts`

**Files:**
- Modify: `server/src/tools/project.ts` — add two exported functions

- [ ] **Step 1: Add TS functions**

Append at the end of `project.ts`:

```typescript
export async function uidToProjectPath(args: { uid: string }, bridge: GodotBridge): Promise<{ uid: string; path: string }> {
  return bridge.call('project.uid_to_path', args) as Promise<{ uid: string; path: string }>;
}

export async function projectPathToUid(args: { path: string }, bridge: GodotBridge): Promise<{ path: string; uid: string }> {
  return bridge.call('project.path_to_uid', args) as Promise<{ path: string; uid: string }>;
}
```

Also add the import for `GodotBridge` if not already present:
```typescript
import type { GodotBridge } from '../godot-bridge.js';
```

- [ ] **Step 2: Commit**

```bash
git add server/src/tools/project.ts
git commit -m "feat: add uidToProjectPath and projectPathToUid TS wrappers"
```

---

### Task 4: Register tool definitions in `server/src/tools/index.ts`

**Files:**
- Modify: `server/src/tools/index.ts`
  - Add imports for the two new functions
  - Register 2 tool definitions in `buildToolRegistry()`

- [ ] **Step 1: Update import**

Find the `import { readProjectSettings, ... }` line and add the new functions:
```typescript
import { readProjectSettings, readProjectSettings, getProjectInfo } from './project.js';
```
should become:
```typescript
import { readProjectSettings, getProjectInfo, uidToProjectPath, projectPathToUid } from './project.js';
```

- [ ] **Step 2: Add tool definitions**

Find the `get_project_info` tool definition in `buildToolRegistry()`. Add these two after it (before `read_scene`):

```typescript
{
  name: 'uid_to_project_path',
  group: 'project',
  description: 'Convert a UID to its res:// path',
  inputSchema: {
    type: 'object',
    properties: { uid: { type: 'string', description: 'The UID to convert (e.g. uid://j458wps55wo0)' } },
    required: ['uid'],
  },
  handler: (args: Record<string, unknown>) => uidToProjectPath(args as { uid: string }, bridge),
},
{
  name: 'project_path_to_uid',
  group: 'project',
  description: 'Convert a res:// path to its UID',
  inputSchema: {
    type: 'object',
    properties: { path: { type: 'string', description: 'The resource path (e.g. res://scripts/main.gd)' } },
    required: ['path'],
  },
  handler: (args: Record<string, unknown>) => projectPathToUid(args as { path: string }, bridge),
},
```

- [ ] **Step 3: Commit**

```bash
git add server/src/tools/index.ts
git commit -m "feat: register uid_to_project_path and project_path_to_uid tools"
```

---

### Task 5: Add CLI command mappings in `server/src/tool-cli.ts`

**Files:**
- Modify: `server/src/tool-cli.ts` — add entries to `COMMAND_MAP`

- [ ] **Step 1: Add mappings**

Add two entries to `COMMAND_MAP`:

```typescript
'project uid-to-path': 'uid_to_project_path',
'project path-to-uid': 'project_path_to_uid',
```

Placement: after `'project info': 'get_project_info'` line.

- [ ] **Step 2: Commit**

```bash
git add server/src/tool-cli.ts
git commit -m "feat: add CLI commands for uid-to-path and path-to-uid"
```

---

## Spec Coverage Check

| Spec item | Task |
|-----------|------|
| `_uid_to_project_path` GDScript | Task 1 |
| `_project_path_to_uid` GDScript | Task 1 |
| RPC routes | Task 2 |
| TS wrappers | Task 3 |
| Tool definitions | Task 4 |
| CLI mappings | Task 5 |
| Bridge-dependent (no offline) | enforced by design |
| Error codes | Task 1 |

No gaps found.

## Self-Review

- All steps show actual code — no "TBD" or "implement later"
- File paths are exact (matching existing files in the repo)
- Method signatures in Task 3 use `bridge: GodotBridge` (imported in project.ts at Task 3 Step 1)
- CLI commands use kebab-case (`uid-to-path`, `path-to-uid`) matching existing `tool-cli.ts` patterns
- Error codes (`-32602`, `-404`, `-32001`) match godot-mcp-pro convention
- TypeScript uses `Promise<>` async wrapper matching all other bridge call patterns in the codebase