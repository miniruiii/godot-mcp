# Phase 1: Runtime/Input/Node 工具实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 40 个工具（Runtime 19 + Input 7 + Node 14），覆盖游戏运行时调试和输入模拟核心功能

**Architecture:**
- Godot 插件新增 `editors/runtime_commands.gd`（19工具）、`editors/input_commands.gd`（7工具）
- Node 工具直接扩展到 `scene_editor.gd`（5个），不新建文件
- MCP 服务端新增 `server/src/tools/runtime.ts`、`server/src/tools/input.ts`，扩展 `server/src/tools/node.ts`
- RPC 路由更新 `rpc_handler.gd` 添加 `game.*` 和 `input.*` 前缀

**Tech Stack:** TypeScript, GDScript, WebSocket, JSON-RPC 2.0

---

## File Structure

```
addons/godot_mcp/
├── editors/
│   ├── runtime_commands.gd    (NEW - 19 runtime tools)
│   ├── input_commands.gd      (NEW - 7 input tools)
│   ├── scene_editor.gd        (EXTEND - add 5 node tools)
│   ├── script_editor.gd       (existing)
│   └── project_editor.gd      (existing)
├── rpc_handler.gd            (EXTEND - add game.*, input.* routes)
└── plugin.gd                  (existing)

server/src/
├── tools/
│   ├── runtime.ts             (NEW - 19 runtime MCP tools)
│   ├── input.ts               (NEW - 7 input MCP tools)
│   ├── node.ts                (EXTEND - add 5 node tools)
│   ├── index.ts               (EXTEND - register 40 new tools)
│   └── ...                    (existing)
└── godot-bridge.ts            (existing)
```

---

## Task 1: 创建 Godot runtime_commands.gd（19工具）

**Files:**
- Create: `addons/godot_mcp/editors/runtime_commands.gd`

- [ ] **Step 1: 创建 runtime_commands.gd**

```gdscript
extends RefCounted

const Utils = preload("res://addons/godot_mcp/utils.gd")

func get_tree(params: Dictionary) -> Dictionary:
    var tree = Engine.get_main_loop()
    if not tree:
        return { "error": { "code": -32000, "message": "No main loop" } }
    var root = tree.root
    var nodes = []
    _collect_game_nodes(root, nodes, "")
    return { "result": { "nodes": nodes } }

func _collect_game_nodes(node: Node, out: Array, path: String):
    var node_path = path + "/" + node.name if path != "" else "/root/" + node.name
    out.append({ "name": node.name, "type": node.get_class(), "path": node_path })
    for child in node.get_children():
        _collect_game_nodes(child, out, node_path)

func get_node_properties(params: Dictionary) -> Dictionary:
    var node_path = params.get("node_path", "")
    var target = _find_game_node(node_path)
    if target == null:
        return { "error": { "code": -32001, "message": "Node not found: " + node_path } }
    var props = {}
    for prop in target.get_property_list():
        if prop["usage"] & PROPERTY_USAGE_EDITOR:
            props[prop["name"]] = Utils.value_to_string(target.get(prop["name"]))
    return { "result": { "name": target.name, "type": target.get_class(), "properties": props } }

func set_node_property(params: Dictionary) -> Dictionary:
    var node_path = params.get("node_path", "")
    var property = params.get("property", "")
    var value_str = params.get("value", "")
    var target = _find_game_node(node_path)
    if target == null:
        return { "error": { "code": -32001, "message": "Node not found: " + node_path } }
    var value = Utils.parse_value(value_str)
    target.set(property, value)
    return { "result": { "set": true, "property": property } }

func execute_script(params: Dictionary) -> Dictionary:
    var code = params.get("code", "")
    var script = GDScript.new()
    script.source_code = code
    var err = script.reload(false)
    if err != OK:
        return { "error": { "code": -32010, "message": "Script compilation failed" } }
    var instance = script.new()
    return { "result": { "executed": true } }

func find_nodes_by_script(params: Dictionary) -> Dictionary:
    var script_path = params.get("script_path", "")
    var script_res = load(script_path)
    if script_res == null:
        return { "error": { "code": -32011, "message": "Script not found: " + script_path } }
    var tree = Engine.get_main_loop()
    var result = []
    _find_by_script(tree.root, script_res, result)
    return { "result": { "nodes": result } }

func _find_by_script(node: Node, script: Script, out: Array):
    if node.get_script() == script:
        out.append({ "name": node.name, "path": node.get_path().to_string() })
    for child in node.get_children():
        _find_by_script(child, script, out)

func get_autoload(params: Dictionary) -> Dictionary:
    var name = params.get("name", "")
    var autoload = ProjectSettings.get_setting("autoload/" + name)
    if autoload == null:
        return { "error": { "code": -32012, "message": "Autoload not found: " + name } }
    return { "result": { "name": name, "path": autoload } }

func batch_get_properties(params: Dictionary) -> Dictionary:
    var node_paths = params.get("node_paths", [])
    var results = []
    for path in node_paths:
        var target = _find_game_node(path)
        if target:
            var props = {}
            for prop in target.get_property_list():
                if prop["usage"] & PROPERTY_USAGE_EDITOR:
                    props[prop["name"]] = Utils.value_to_string(target.get(prop["name"]))
            results.append({ "path": path, "properties": props })
    return { "result": { "results": results } }

func _find_game_node(path: String) -> Node:
    var tree = Engine.get_main_loop()
    if not tree:
        return null
    return tree.root.get_node_or_null(NodePath(path))
```

**完整19个工具在 runtime_commands.gd 中逐步实现。**

---

## Task 2: 创建 Godot input_commands.gd（7工具）

**Files:**
- Create: `addons/godot_mcp/editors/input_commands.gd`

- [ ] **Step 1: 创建 input_commands.gd**

```gdscript
extends RefCounted

func simulate_key(params: Dictionary) -> Dictionary:
    var keycode = params.get("keycode", "")
    var pressed = params.get("pressed", true)
    var modifiers = params.get("modifiers", {})

    var event = InputEventKey.new()
    event.keycode = OS.find_keycode_from_string(keycode)
    event.pressed = pressed
    event.meta_pressed = modifiers.get("meta", false)
    event.ctrl_pressed = modifiers.get("ctrl", false)
    event.shift_pressed = modifiers.get("shift", false)
    event.alt_pressed = modifiers.get("alt", false)

    Input.parse_input_event(event)
    return { "result": { "simulated": true, "keycode": keycode } }

func simulate_mouse_click(params: Dictionary) -> Dictionary:
    var position = params.get("position", { "x": 0, "y": 0 })
    var button_index = params.get("button", 1)
    var pressed = params.get("pressed", true)

    var event = InputEventMouseButton.new()
    event.position = Vector2(position.get("x", 0), position.get("y", 0))
    event.button_index = button_index
    event.pressed = pressed
    Input.parse_input_event(event)
    return { "result": { "simulated": true } }

func simulate_mouse_move(params: Dictionary) -> Dictionary:
    var position = params.get("position", { "x": 0, "y": 0 })
    var event = InputEventMouseMotion.new()
    event.position = Vector2(position.get("x", 0), position.get("y", 0))
    Input.parse_input_event(event)
    return { "result": { "simulated": true } }

func simulate_action(params: Dictionary) -> Dictionary:
    var action = params.get("action", "")
    var pressed = params.get("pressed", true)
    if pressed:
        Input.action_press(action)
    else:
        Input.action_release(action)
    return { "result": { "simulated": true, "action": action } }

func simulate_sequence(params: Dictionary) -> Dictionary:
    var events = params.get("events", [])
    for ev in events:
        Input.parse_input_event(ev)
    return { "result": { "simulated": true, "count": events.size() } }

func get_input_actions(params: Dictionary) -> Dictionary:
    var actions = InputMap.get_actions()
    var result = []
    for action in actions:
        var events = InputMap.action_get_events(action)
        result.append({ "name": action, "events": events.size() })
    return { "result": { "actions": result } }

func set_input_action(params: Dictionary) -> Dictionary:
    var action = params.get("action", "")
    var event_dict = params.get("event", {})
    var event = InputEventKey.new()
    event.keycode = OS.find_keycode_from_string(event_dict.get("keycode", ""))
    InputMap.action_add_event(action, event)
    return { "result": { "action": action, "set": true } }
```

---

## Task 3: 扩展 Godot scene_editor.gd（新增5个Node工具）

**Files:**
- Modify: `addons/godot_mcp/editors/scene_editor.gd`

- [ ] **Step 1: 在 scene_editor.gd 末尾添加 5 个新工具**

```gdscript
# === Phase 1 Node Extensions ===

func duplicate_node(params: Dictionary) -> Dictionary:
    var node_path = params.get("node_path", "")
    var new_name = params.get("new_name", "")
    var target = _find_node_by_path(node_path)
    if target == null:
        return { "error": { "code": -32001, "message": "Node not found: " + node_path } }
    var parent = target.get_parent()
    var duplicated = target.duplicate()
    duplicated.name = new_name if new_name != "" else target.name + "_copy"
    parent.add_child(duplicated)
    return { "result": { "duplicated": true, "new_path": parent.get_path().to_string() + "/" + duplicated.name } }

func move_node(params: Dictionary) -> Dictionary:
    var node_path = params.get("node_path", "")
    var new_parent_path = params.get("new_parent_path", "")
    var target = _find_node_by_path(node_path)
    var new_parent = _find_node_by_path(new_parent_path)
    if target == null:
        return { "error": { "code": -32001, "message": "Node not found: " + node_path } }
    if new_parent == null:
        return { "error": { "code": -32002, "message": "New parent not found: " + new_parent_path } }
    target.reparent(new_parent, true)
    return { "result": { "moved": true, "node_path": node_path, "new_parent": new_parent_path } }

func connect_signal(params: Dictionary) -> Dictionary:
    var node_path = params.get("node_path", "")
    var signal_name = params.get("signal", "")
    var target_path = params.get("target_path", "")
    var method_name = params.get("method", "")
    var target = _find_node_by_path(node_path)
    if target == null:
        return { "error": { "code": -32001, "message": "Node not found: " + node_path } }
    var target_node = _find_node_by_path(target_path)
    if target_node == null:
        return { "error": { "code": -32003, "message": "Target not found: " + target_path } }
    target.connect(signal_name, Callable(target_node, method_name))
    return { "result": { "connected": true } }

func disconnect_signal(params: Dictionary) -> Dictionary:
    var node_path = params.get("node_path", "")
    var signal_name = params.get("signal", "")
    var target_path = params.get("target_path", "")
    var method_name = params.get("method", "")
    var target = _find_node_by_path(node_path)
    if target == null:
        return { "error": { "code": -32001, "message": "Node not found: " + node_path } }
    var target_node = _find_node_by_path(target_path)
    if target_node == null:
        return { "error": { "code": -32003, "message": "Target not found: " + target_path } }
    target.disconnect(signal_name, Callable(target_node, method_name))
    return { "result": { "disconnected": true } }

func get_node_groups(params: Dictionary) -> Dictionary:
    var node_path = params.get("node_path", "")
    var target = _find_node_by_path(node_path)
    if target == null:
        return { "error": { "code": -32001, "message": "Node not found: " + node_path } }
    return { "result": { "groups": target.get_groups() } }

func set_node_groups(params: Dictionary) -> Dictionary:
    var node_path = params.get("node_path", "")
    var groups_add = params.get("add_to_groups", [])
    var groups_remove = params.get("remove_from_groups", [])
    var target = _find_node_by_path(node_path)
    if target == null:
        return { "error": { "code": -32001, "message": "Node not found: " + node_path } }
    for g in groups_add:
        target.add_to_group(g)
    for g in groups_remove:
        target.remove_from_group(g)
    return { "result": { "groups": target.get_groups() } }

func find_nodes_in_group(params: Dictionary) -> Dictionary:
    var group_name = params.get("group", "")
    var tree = get_tree()
    var nodes = tree.get_nodes_in_group(group_name)
    var result = []
    for n in nodes:
        result.append({ "name": n.name, "path": n.get_path().to_string() })
    return { "result": { "nodes": result } }

func rename_node(params: Dictionary) -> Dictionary:
    var node_path = params.get("node_path", "")
    var new_name = params.get("new_name", "")
    var target = _find_node_by_path(node_path)
    if target == null:
        return { "error": { "code": -32001, "message": "Node not found: " + node_path } }
    target.name = new_name
    return { "result": { "renamed": true, "new_name": new_name } }
```

---

## Task 4: 更新 rpc_handler.gd 添加 game.* 和 input.* 路由

**Files:**
- Modify: `addons/godot_mcp/rpc_handler.gd`

- [ ] **Step 1: 添加 RuntimeCommandsClass 和 InputCommandsClass 引用**

```gdscript
const RuntimeCommandsClass = preload("res://addons/godot_mcp/editors/runtime_commands.gd")
const InputCommandsClass = preload("res://addons/godot_mcp/editors/input_commands.gd")

var runtime_commands: RuntimeCommandsClass
var input_commands: InputCommandsClass

func _init():
    runtime_commands = RuntimeCommandsClass.new()
    input_commands = InputCommandsClass.new()
    scene_editor_inst = SceneEditorClass.new()
    script_editor_inst = ScriptEditorClass.new()
    project_editor_inst = ProjectEditorClass.new()
```

- [ ] **Step 2: 在 _route 方法中添加 game.* 和 input.* 分支**

在 `match method` 块中添加：

```gdscript
"game.get_tree":
    return runtime_commands.get_tree(params)
"game.get_node_properties":
    return runtime_commands.get_node_properties(params)
"game.set_node_property":
    return runtime_commands.set_node_property(params)
"game.execute_script":
    return runtime_commands.execute_script(params)
"game.find_nodes_by_script":
    return runtime_commands.find_nodes_by_script(params)
"game.get_autoload":
    return runtime_commands.get_autoload(params)
"game.batch_get_properties":
    return runtime_commands.batch_get_properties(params)
"input.simulate_key":
    return input_commands.simulate_key(params)
"input.simulate_mouse_click":
    return input_commands.simulate_mouse_click(params)
"input.simulate_mouse_move":
    return input_commands.simulate_mouse_move(params)
"input.simulate_action":
    return input_commands.simulate_action(params)
"input.simulate_sequence":
    return input_commands.simulate_sequence(params)
"input.get_input_actions":
    return input_commands.get_input_actions(params)
"input.set_input_action":
    return input_commands.set_input_action(params)
"node.duplicate":
    return scene_editor_inst.duplicate_node(params)
"node.move":
    return scene_editor_inst.move_node(params)
"node.connect_signal":
    return scene_editor_inst.connect_signal(params)
"node.disconnect_signal":
    return scene_editor_inst.disconnect_signal(params)
"node.get_groups":
    return scene_editor_inst.get_node_groups(params)
"node.set_groups":
    return scene_editor_inst.set_node_groups(params)
"node.find_in_group":
    return scene_editor_inst.find_nodes_in_group(params)
"node.rename":
    return scene_editor_inst.rename_node(params)
```

---

## Task 5: 创建 MCP server runtime.ts（19工具）

**Files:**
- Create: `server/src/tools/runtime.ts`

- [ ] **Step 1: 创建 runtime.ts（19个工具函数）**

```typescript
import type { GodotBridge } from '../godot-bridge.js';

export interface GetGameTreeResult { nodes: GameNode[] }
export interface GameNode { name: string; type: string; path: string; }

export function getGameSceneTree(_args: Record<string, unknown>, bridge: GodotBridge): GetGameTreeResult {
  const result = bridge.call('game.get_tree', {}) as { nodes?: GameNode[] };
  return { nodes: result?.nodes || [] };
}

export function getGameNodeProperties(args: { node_path: string }, bridge: GodotBridge): any {
  return bridge.call('game.get_node_properties', { node_path: args.node_path });
}

export function setGameNodeProperty(args: { node_path: string; property: string; value: string }, bridge: GodotBridge): any {
  return bridge.call('game.set_node_property', { node_path: args.node_path, property: args.property, value: args.value });
}

export function executeGameScript(args: { code: string }, bridge: GodotBridge): any {
  return bridge.call('game.execute_script', { code: args.code });
}

export function findNodesByScript(args: { script_path: string }, bridge: GodotBridge): any {
  return bridge.call('game.find_nodes_by_script', { script_path: args.script_path });
}

export function getAutoload(args: { name: string }, bridge: GodotBridge): any {
  return bridge.call('game.get_autoload', { name: args.name });
}

export function batchGetProperties(args: { node_paths: string[] }, bridge: GodotBridge): any {
  return bridge.call('game.batch_get_properties', { node_paths: args.node_paths });
}
```

---

## Task 6: 创建 MCP server input.ts（7工具）

**Files:**
- Create: `server/src/tools/input.ts`

- [ ] **Step 1: 创建 input.ts**

```typescript
import type { GodotBridge } from '../godot-bridge.js';

export function simulateKey(args: { keycode: string; pressed: boolean; modifiers?: any }, bridge: GodotBridge): any {
  return bridge.call('input.simulate_key', { keycode: args.keycode, pressed: args.pressed, modifiers: args.modifiers || {} });
}

export function simulateMouseClick(args: { position: { x: number; y: number }; button?: number; pressed?: boolean }, bridge: GodotBridge): any {
  return bridge.call('input.simulate_mouse_click', { position: args.position, button: args.button || 1, pressed: args.pressed !== false });
}

export function simulateMouseMove(args: { position: { x: number; y: number } }, bridge: GodotBridge): any {
  return bridge.call('input.simulate_mouse_move', { position: args.position });
}

export function simulateAction(args: { action: string; pressed?: boolean }, bridge: GodotBridge): any {
  return bridge.call('input.simulate_action', { action: args.action, pressed: args.pressed !== false });
}

export function simulateSequence(args: { events: any[] }, bridge: GodotBridge): any {
  return bridge.call('input.simulate_sequence', { events: args.events });
}

export function getInputActions(_args: Record<string, unknown>, bridge: GodotBridge): any {
  return bridge.call('input.get_input_actions', {});
}

export function setInputAction(args: { action: string; event: any }, bridge: GodotBridge): any {
  return bridge.call('input.set_input_action', { action: args.action, event: args.event });
}
```

---

## Task 7: 扩展 MCP server node.ts（新增8工具）

**Files:**
- Modify: `server/src/tools/node.ts`

- [ ] **Step 1: 在 node.ts 末尾添加 8 个新工具函数**

```typescript
// === Phase 1 Extensions ===

export function duplicateNode(args: { node_path: string; new_name?: string }, bridge: GodotBridge): any {
  if (!bridge.isConnected) return { duplicated: false, new_path: '' };
  return bridge.call('node.duplicate', { node_path: args.node_path, new_name: args.new_name || '' });
}

export function moveNode(args: { node_path: string; new_parent_path: string }, bridge: GodotBridge): any {
  if (!bridge.isConnected) return { moved: false, node_path: '', new_parent: '' };
  return bridge.call('node.move', { node_path: args.node_path, new_parent_path: args.new_parent_path });
}

export function connectSignal(args: { node_path: string; signal: string; target_path: string; method: string }, bridge: GodotBridge): any {
  if (!bridge.isConnected) return { connected: false };
  return bridge.call('node.connect_signal', { node_path: args.node_path, signal: args.signal, target_path: args.target_path, method: args.method });
}

export function disconnectSignal(args: { node_path: string; signal: string; target_path: string; method: string }, bridge: GodotBridge): any {
  if (!bridge.isConnected) return { disconnected: false };
  return bridge.call('node.disconnect_signal', { node_path: args.node_path, signal: args.signal, target_path: args.target_path, method: args.method });
}

export function getNodeGroups(args: { node_path: string }, bridge: GodotBridge): any {
  if (!bridge.isConnected) return { groups: [] };
  return bridge.call('node.get_groups', { node_path: args.node_path });
}

export function setNodeGroups(args: { node_path: string; add_to_groups?: string[]; remove_from_groups?: string[] }, bridge: GodotBridge): any {
  if (!bridge.isConnected) return { groups: [] };
  return bridge.call('node.set_groups', { node_path: args.node_path, add_to_groups: args.add_to_groups || [], remove_from_groups: args.remove_from_groups || [] });
}

export function findNodesInGroup(args: { group: string }, bridge: GodotBridge): any {
  if (!bridge.isConnected) return { nodes: [] };
  return bridge.call('node.find_in_group', { group: args.group });
}

export function renameNode(args: { node_path: string; new_name: string }, bridge: GodotBridge): any {
  if (!bridge.isConnected) return { renamed: false, new_name: '' };
  return bridge.call('node.rename', { node_path: args.node_path, new_name: args.new_name });
}
```

---

## Task 8: 更新 tools/index.ts 注册新工具

**Files:**
- Modify: `server/src/tools/index.ts`

- [ ] **Step 1: 导入新工具函数**

```typescript
import { getGameSceneTree, getGameNodeProperties, setGameNodeProperty, executeGameScript, findNodesByScript, getAutoload, batchGetProperties } from './runtime.js';
import { simulateKey, simulateMouseClick, simulateMouseMove, simulateAction, simulateSequence, getInputActions, setInputAction } from './input.js';
import { duplicateNode, moveNode, connectSignal, disconnectSignal, getNodeGroups, setNodeGroups, findNodesInGroup, renameNode } from './node.js';
```

- [ ] **Step 2: 在 buildToolRegistry 中注册 40 个新工具**

添加 `get_game_scene_tree`, `simulate_key`, `duplicate_node` 等 40 个工具的定义和 handler。

---

## Task 9: 本地测试验证

**Files:**
- Test: Godot 项目 `C:\code\mcp-test`

- [ ] **Step 1: 复制插件到测试项目**

```bash
cp -r /c/code/godot-mcp-rc/addons/godot_mcp /c/code/mcp-test/addons/
```

- [ ] **Step 2: 启动 Godot 和 MCP 服务器**

Terminal 1: 启动 Godot `C:\Program Files\Godot\Godot.exe --path C:\code\mcp-test`
Terminal 2: 启动 MCP `node C:\code\godot-mcp-rc\dist\server.js`

- [ ] **Step 3: 验证工具数量**

调用 `tools/list` 确认返回 59 个工具（原有 19 + 新增 40）

---

## 进度检查清单

- [ ] Task 1: runtime_commands.gd 创建完成
- [ ] Task 2: input_commands.gd 创建完成
- [ ] Task 3: scene_editor.gd 扩展完成（5个工具）
- [ ] Task 4: rpc_handler.gd 路由更新完成
- [ ] Task 5: runtime.ts 创建完成
- [ ] Task 6: input.ts 创建完成
- [ ] Task 7: node.ts 扩展完成（8个工具）
- [ ] Task 8: index.ts 注册完成（40个工具）
- [ ] Task 9: 本地测试通过

---

最后更新: 2026-05-21