# MCP Unified Logging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Route all MCP tool request logs (online + offline) to the Godot editor output panel with `[MCP]` prefix, full parameters, and a configurable `debug_mode` switch.

**Architecture:** Add a `log.print` JSON-RPC route in the Godot plugin to receive logs from the TS server. The TS side wraps every tool handler to print `→ tool(args)` before and `← result` after, sending both to Godot via WebSocket when connected. Godot-side editor functions also print their internal execution details.

**Tech Stack:** TypeScript, GDScript (Godot 4.6.2+), WebSocket, JSON-RPC 2.0

---

## File Map

| File | Responsibility |
|------|---------------|
| `server/src/tools/log.ts` | **New.** TS-side logging helper: `mcpLog()`, `formatArgs()`, bridge ref management. |
| `server/src/config.ts` | Add `log_max_param_length` to `Config` interface and defaults. |
| `server/src/godot-bridge.ts` | Call `setLogBridge(this)` after successful handshake. |
| `server/src/tools/index.ts` | Wrap every tool handler with before/after logging. |
| `addons/godot_mcp/editors/project_editor.gd` | Add `debug_mode`, `print_log()`, and execution logs for `run_project`/`get_output_log`/`get_settings`. |
| `addons/godot_mcp/rpc_handler.gd` | Add `"log.print"` route. |
| `addons/godot_mcp/editors/scene_editor.gd` | Add entry/exit logs for all 11 mutation/query functions. |
| `addons/godot_mcp/editors/script_editor.gd` | Add entry/exit logs for `open_script`, `get_content`, `get_open_scripts`. |
| `addons/godot_mcp/editors/runtime_commands.gd` | Add entry/exit logs for all 19 runtime functions. |
| `addons/godot_mcp/editors/input_commands.gd` | Add entry/exit logs for all 7 input functions. |

---

### Task 1: TS Logging Helper (`log.ts`)

**Files:**
- Create: `server/src/tools/log.ts`

- [ ] **Step 1: Write `log.ts`**

```typescript
import type { GodotBridge } from '../godot-bridge.js';

let bridgeRef: GodotBridge | null = null;

export function setLogBridge(bridge: GodotBridge): void {
  bridgeRef = bridge;
}

export async function mcpLog(message: string, level = 'debug'): Promise<void> {
  const line = `[MCP] ${message}`;
  console.log(line);
  if (bridgeRef?.isConnected) {
    try {
      await bridgeRef.call('log.print', { message, level });
    } catch {
      // Ignore log delivery failures
    }
  }
}

export function formatArgs(args: Record<string, unknown>, maxLength = 0): string {
  try {
    let json = JSON.stringify(args);
    if (maxLength > 0 && json.length > maxLength) {
      json = json.slice(0, maxLength) + `...(truncated ${json.length - maxLength} chars)`;
    }
    return json;
  } catch {
    return '[unserializable args]';
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run build`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add server/src/tools/log.ts
git commit -m "feat(ts): add MCP logging helper with Godot bridge integration

Rui <veryrui@gmail.com>"
```

---

### Task 2: Config — Add `log_max_param_length`

**Files:**
- Modify: `server/src/config.ts:6-11` (Config interface)
- Modify: `server/src/config.ts:13-18` (DEFAULTS)
- Modify: `server/src/config.ts:47-52` (return object)

- [ ] **Step 1: Add field to Config interface**

```typescript
export interface Config {
  port: number;
  mode: RunMode;
  project_path: string;
  log_level: string;
  log_max_param_length: number;
}
```

- [ ] **Step 2: Add default**

```typescript
const DEFAULTS: Config = {
  port: 6505,
  mode: 'full',
  project_path: './',
  log_level: 'info',
  log_max_param_length: 0,
};
```

- [ ] **Step 3: Parse and return the new field**

In `loadConfig`, before the return statement, add:

```typescript
  const rawMaxLen = envOrFile('GODOT_MCP_LOG_MAX_PARAM_LENGTH', fileConfig.log_max_param_length, DEFAULTS.log_max_param_length);
  let log_max_param_length = parseInt(rawMaxLen.toString(), 10);
  if (isNaN(log_max_param_length) || log_max_param_length < 0) {
    log_max_param_length = DEFAULTS.log_max_param_length;
  }
```

Update the return object:

```typescript
  return {
    port,
    mode: validatedMode,
    project_path: String(envOrFile('GODOT_MCP_PROJECT_PATH', fileConfig.project_path, DEFAULTS.project_path)),
    log_level: validatedLogLevel,
    log_max_param_length,
  };
```

- [ ] **Step 4: Build and commit**

Run: `npm run build`
Expected: No errors.

```bash
git add server/src/config.ts
git commit -m "feat(config): add log_max_param_length setting

Rui <veryrui@gmail.com>"
```

---

### Task 3: GodotBridge — Wire Log Bridge on Connect

**Files:**
- Modify: `server/src/godot-bridge.ts:1` (import)
- Modify: `server/src/godot-bridge.ts:55-57` (after handshake)

- [ ] **Step 1: Import `setLogBridge`**

Add at the top of `godot-bridge.ts`:

```typescript
import { setLogBridge } from './tools/log.js';
```

- [ ] **Step 2: Call `setLogBridge` after successful handshake**

In the `ws.on('open', ...)` handler, after `this.godotVersion = result.godot_version;`:

```typescript
            this.godotVersion = result.godot_version;
            setLogBridge(this);
```

- [ ] **Step 3: Build and commit**

Run: `npm run build`
Expected: No errors.

```bash
git add server/src/godot-bridge.ts
git commit -m "feat(bridge): wire logging bridge on Godot connect

Rui <veryrui@gmail.com>"
```

---

### Task 4: Wrap All Tool Handlers with Logging

**Files:**
- Modify: `server/src/tools/index.ts:1` (import)
- Modify: `server/src/tools/index.ts:31` (`buildToolRegistry` signature and body)

- [ ] **Step 1: Add import**

Add at the top:

```typescript
import { mcpLog, formatArgs } from './log.js';
```

- [ ] **Step 2: Wrap handlers in `buildToolRegistry`**

Replace the `return [` array with a wrapper that logs every call. The simplest approach is to wrap the array at the end:

After the `return [` ... `];` block, change to:

```typescript
  const tools = [
    // ... existing tool definitions unchanged ...
  ];

  return tools.map((tool) => ({
    ...tool,
    handler: async (args: Record<string, unknown>) => {
      const startTime = Date.now();
      const paramStr = formatArgs(args, config.log_max_param_length);
      await mcpLog(`${tool.name} → ${paramStr}`, 'debug');
      try {
        const result = await tool.handler(args);
        const elapsed = Date.now() - startTime;
        await mcpLog(`${tool.name} ← OK (${elapsed}ms)`, 'debug');
        return result;
      } catch (err) {
        const elapsed = Date.now() - startTime;
        const msg = err instanceof Error ? err.message : String(err);
        await mcpLog(`${tool.name} ← ERROR: ${msg} (${elapsed}ms)`, 'debug');
        throw err;
      }
    },
  }));
```

Important: The `config` parameter is already available in `buildToolRegistry`, so `config.log_max_param_length` can be used directly.

- [ ] **Step 3: Build and commit**

Run: `npm run build`
Expected: No errors.

```bash
git add server/src/tools/index.ts
git commit -m "feat(tools): wrap all handlers with MCP request/response logging

Rui <veryrui@gmail.com>"
```

---

### Task 5: Godot Plugin — `print_log` + `debug_mode`

**Files:**
- Modify: `addons/godot_mcp/editors/project_editor.gd:1-9` (after `extends RefCounted`)

- [ ] **Step 1: Add `debug_mode` and `print_log`**

Insert after line 1 (`extends RefCounted`):

```gdscript
var debug_mode: bool = true

func print_log(params: Dictionary) -> Dictionary:
    var message = params.get("message", "")
    var level = params.get("level", "debug")

    if level == "debug" and not debug_mode:
        return { "result": { "printed": false } }

    var line = "[MCP] %s" % message
    print(line)
    append_log(line)
    return { "result": { "printed": true } }
```

- [ ] **Step 2: Add execution logs to existing functions**

Add entry logs to `run_project`, `get_output_log`, and `get_settings`:

**`run_project`:** After `var scene_path = params.get("scene_path", "")`, add:
```gdscript
    print("[MCP] run_project: scene_path=%s" % scene_path)
```

**`get_output_log`:** After `var lines_requested = params.get("lines", 100)`, add:
```gdscript
    print("[MCP] get_output_log: lines=%d" % lines_requested)
```

**`get_settings`:** At the top of the function, add:
```gdscript
    print("[MCP] get_settings")
```

- [ ] **Step 3: Commit**

```bash
git add addons/godot_mcp/editors/project_editor.gd
git commit -m "feat(godot): add print_log route and debug_mode, log project_editor calls

Rui <veryrui@gmail.com>"
```

---

### Task 6: Godot Plugin — Add `"log.print"` Route

**Files:**
- Modify: `addons/godot_mcp/rpc_handler.gd:148-150` (before the `_` wildcard)

- [ ] **Step 1: Add route**

Before the `_:` wildcard case in `_route`, add:

```gdscript
        "log.print":
            return project_editor_inst.print_log(params)
```

- [ ] **Step 2: Commit**

```bash
git add addons/godot_mcp/rpc_handler.gd
git commit -m "feat(godot): add log.print JSON-RPC route

Rui <veryrui@gmail.com>"
```

---

### Task 7: Scene Editor — Execution Logs

**Files:**
- Modify: `addons/godot_mcp/editors/scene_editor.gd`

Add `[MCP]` print statements to every public function's entry point. Use `print()` directly (these are internal Godot logs, not routed through `log.print`).

- [ ] **Step 1: Add logs to each function**

**`get_tree`:**
```gdscript
func get_tree(params: Dictionary) -> Dictionary:
    print("[MCP] get_tree")
```

**`get_node`:**
```gdscript
func get_node(params: Dictionary) -> Dictionary:
    print("[MCP] get_node: node_path=%s" % params.get("node_path", ""))
```

**`add_node`:**
```gdscript
func add_node(params: Dictionary) -> Dictionary:
    var parent_path = params.get("parent_path", "")
    var node_type = params.get("node_type", "")
    var node_name = params.get("node_name", "")
    print("[MCP] add_node: parent_path=%s node_type=%s node_name=%s" % [parent_path, node_type, node_name])
```

**`remove_node`:**
```gdscript
func remove_node(params: Dictionary) -> Dictionary:
    print("[MCP] remove_node: node_path=%s" % params.get("node_path", ""))
```

**`update_property`:**
```gdscript
func update_property(params: Dictionary) -> Dictionary:
    print("[MCP] update_property: node_path=%s property=%s" % [params.get("node_path", ""), params.get("property", "")])
```

**`save_scene`:**
```gdscript
func save_scene(params: Dictionary) -> Dictionary:
    print("[MCP] save_scene")
```

**`open_scene`:**
```gdscript
func open_scene(params: Dictionary) -> Dictionary:
    print("[MCP] open_scene: scene_path=%s" % params.get("scene_path", ""))
```

**`duplicate_node`:**
```gdscript
func duplicate_node(params: Dictionary) -> Dictionary:
    print("[MCP] duplicate_node: node_path=%s new_name=%s" % [params.get("node_path", ""), params.get("new_name", "")])
```

**`move_node`:**
```gdscript
func move_node(params: Dictionary) -> Dictionary:
    print("[MCP] move_node: node_path=%s new_parent=%s" % [params.get("node_path", ""), params.get("new_parent_path", "")])
```

**`connect_signal`:**
```gdscript
func connect_signal(params: Dictionary) -> Dictionary:
    print("[MCP] connect_signal: node_path=%s signal=%s target=%s method=%s" % [params.get("node_path", ""), params.get("signal", ""), params.get("target_path", ""), params.get("method", "")])
```

**`disconnect_signal`:**
```gdscript
func disconnect_signal(params: Dictionary) -> Dictionary:
    print("[MCP] disconnect_signal: node_path=%s signal=%s target=%s method=%s" % [params.get("node_path", ""), params.get("signal", ""), params.get("target_path", ""), params.get("method", "")])
```

**`rename_node`:**
```gdscript
func rename_node(params: Dictionary) -> Dictionary:
    print("[MCP] rename_node: node_path=%s new_name=%s" % [params.get("node_path", ""), params.get("new_name", "")])
```

**`get_node_groups`:**
```gdscript
func get_node_groups(params: Dictionary) -> Dictionary:
    print("[MCP] get_node_groups: node_path=%s" % params.get("node_path", ""))
```

**`set_node_groups`:**
```gdscript
func set_node_groups(params: Dictionary) -> Dictionary:
    print("[MCP] set_node_groups: node_path=%s add=%s remove=%s" % [params.get("node_path", ""), params.get("add_to_groups", []), params.get("remove_from_groups", [])])
```

**`find_nodes_in_group`:**
```gdscript
func find_nodes_in_group(params: Dictionary) -> Dictionary:
    print("[MCP] find_nodes_in_group: group=%s" % params.get("group", ""))
```

- [ ] **Step 2: Commit**

```bash
git add addons/godot_mcp/editors/scene_editor.gd
git commit -m "feat(godot): add [MCP] execution logs to all scene_editor functions

Rui <veryrui@gmail.com>"
```

---

### Task 8: Script Editor — Execution Logs

**Files:**
- Modify: `addons/godot_mcp/editors/script_editor.gd`

- [ ] **Step 1: Add logs**

**`open_script`:**
```gdscript
func open_script(params: Dictionary) -> Dictionary:
    print("[MCP] open_script: script_path=%s" % params.get("script_path", ""))
```

**`get_content`:**
```gdscript
func get_content(params: Dictionary) -> Dictionary:
    print("[MCP] get_content: script_path=%s" % params.get("script_path", ""))
```

**`get_open_scripts`:**
```gdscript
func get_open_scripts() -> Dictionary:
    print("[MCP] get_open_scripts")
```

- [ ] **Step 2: Commit**

```bash
git add addons/godot_mcp/editors/script_editor.gd
git commit -m "feat(godot): add [MCP] execution logs to script_editor functions

Rui <veryrui@gmail.com>"
```

---

### Task 9: Runtime Commands — Execution Logs

**Files:**
- Modify: `addons/godot_mcp/editors/runtime_commands.gd`

Add `print("[MCP] ...")` at the top of every public function:

- [ ] **Step 1: Add logs to all 19 functions**

```gdscript
func get_tree(params: Dictionary) -> Dictionary:
    print("[MCP] game.get_tree")
    ...

func get_node_properties(params: Dictionary) -> Dictionary:
    print("[MCP] game.get_node_properties: node_path=%s" % params.get("node_path", ""))
    ...

func set_node_property(params: Dictionary) -> Dictionary:
    print("[MCP] game.set_node_property: node_path=%s property=%s" % [params.get("node_path", ""), params.get("property", "")])
    ...

func execute_script(params: Dictionary) -> Dictionary:
    print("[MCP] game.execute_script")
    ...

func find_nodes_by_script(params: Dictionary) -> Dictionary:
    print("[MCP] game.find_nodes_by_script: script_path=%s" % params.get("script_path", ""))
    ...

func get_autoload(params: Dictionary) -> Dictionary:
    print("[MCP] game.get_autoload: name=%s" % params.get("name", ""))
    ...

func batch_get_properties(params: Dictionary) -> Dictionary:
    print("[MCP] game.batch_get_properties: node_paths=%s" % params.get("node_paths", []))
    ...

func find_ui_elements(params: Dictionary) -> Dictionary:
    print("[MCP] game.find_ui_elements: type=%s text=%s" % [params.get("type", ""), params.get("text", "")])
    ...

func click_button_by_text(params: Dictionary) -> Dictionary:
    print("[MCP] game.click_button_by_text: text=%s" % params.get("text", ""))
    ...

func wait_for_node(params: Dictionary) -> Dictionary:
    print("[MCP] game.wait_for_node: node_path=%s timeout=%d" % [params.get("node_path", ""), params.get("timeout_ms", 5000)])
    ...

func find_nearby_nodes(params: Dictionary) -> Dictionary:
    print("[MCP] game.find_nearby_nodes: origin=%s max_distance=%s" % [params.get("origin_path", ""), params.get("max_distance", 100.0)])
    ...

func navigate_to(params: Dictionary) -> Dictionary:
    print("[MCP] game.navigate_to: node_path=%s target=%s" % [params.get("node_path", ""), params.get("target", "")])
    ...

func get_game_node_property(params: Dictionary) -> Dictionary:
    print("[MCP] game.get_game_node_property: node_path=%s property=%s" % [params.get("node_path", ""), params.get("property", "")])
    ...

func capture_frames(params: Dictionary) -> Dictionary:
    print("[MCP] game.capture_frames: count=%d" % params.get("count", 1))
    ...

func monitor_properties(params: Dictionary) -> Dictionary:
    print("[MCP] game.monitor_properties: node_path=%s properties=%s" % [params.get("node_path", ""), params.get("properties", [])])
    ...

func start_recording(params: Dictionary) -> Dictionary:
    print("[MCP] game.start_recording")
    ...

func stop_recording(params: Dictionary) -> Dictionary:
    print("[MCP] game.stop_recording")
    ...

func replay_recording(params: Dictionary) -> Dictionary:
    print("[MCP] game.replay_recording: frames=%d" % params.get("data", []).size())
    ...
```

- [ ] **Step 2: Commit**

```bash
git add addons/godot_mcp/editors/runtime_commands.gd
git commit -m "feat(godot): add [MCP] execution logs to all runtime_commands functions

Rui <veryrui@gmail.com>"
```

---

### Task 10: Input Commands — Execution Logs

**Files:**
- Modify: `addons/godot_mcp/editors/input_commands.gd`

- [ ] **Step 1: Add logs to all 7 functions**

```gdscript
func simulate_key(params: Dictionary) -> Dictionary:
    print("[MCP] input.simulate_key: keycode=%s pressed=%s" % [params.get("keycode", ""), params.get("pressed", true)])
    ...

func simulate_mouse_click(params: Dictionary) -> Dictionary:
    print("[MCP] input.simulate_mouse_click: position=(%s,%s) button=%d pressed=%s" % [params.get("position", {}).get("x", 0), params.get("position", {}).get("y", 0), params.get("button", 1), params.get("pressed", true)])
    ...

func simulate_mouse_move(params: Dictionary) -> Dictionary:
    print("[MCP] input.simulate_mouse_move: position=(%s,%s)" % [params.get("position", {}).get("x", 0), params.get("position", {}).get("y", 0)])
    ...

func simulate_action(params: Dictionary) -> Dictionary:
    print("[MCP] input.simulate_action: action=%s pressed=%s" % [params.get("action", ""), params.get("pressed", true)])
    ...

func simulate_sequence(params: Dictionary) -> Dictionary:
    print("[MCP] input.simulate_sequence: events=%d" % params.get("events", []).size())
    ...

func get_input_actions(params: Dictionary) -> Dictionary:
    print("[MCP] input.get_input_actions")
    ...

func set_input_action(params: Dictionary) -> Dictionary:
    print("[MCP] input.set_input_action: action=%s" % params.get("action", ""))
    ...
```

- [ ] **Step 2: Commit**

```bash
git add addons/godot_mcp/editors/input_commands.gd
git commit -m "feat(godot): add [MCP] execution logs to all input_commands functions

Rui <veryrui@gmail.com>"
```

---

### Task 11: Build and Final Test

**Files:**
- All TS files already committed

- [ ] **Step 1: Full TypeScript build**

Run: `npm run build`
Expected: `tsc` exits with code 0, no output.

- [ ] **Step 2: Verify no stale dist files**

Run: `git status`
Expected: Working tree clean (or only untracked files).

- [ ] **Step 3: Push all commits**

```bash
git push origin phase1-runtime-input-node
```

---

## Spec Coverage Check

| Spec Requirement | Implementing Task |
|-------------------|-------------------|
| TS `log.ts` helper with `mcpLog`, `formatArgs`, bridge ref | Task 1 |
| `log_max_param_length` config | Task 2 |
| `setLogBridge` called on connect | Task 3 |
| Wrap all 52 tool handlers with before/after logs | Task 4 |
| Godot `debug_mode` switch | Task 5 |
| Godot `log.print` route | Task 5 + 6 |
| Godot scene_editor detailed logs | Task 7 |
| Godot script_editor detailed logs | Task 8 |
| Godot project_editor detailed logs | Task 5 |
| Godot runtime_commands detailed logs | Task 9 |
| Godot input_commands detailed logs | Task 10 |

**No gaps. No placeholders found.**
