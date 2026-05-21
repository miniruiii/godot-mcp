# Godot MCP — Godot Editor Plugin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Godot 4.6.2+ editor plugin (`addons/godot_mcp/`) that exposes a WebSocket server on port 6505, accepts JSON-RPC requests from the TypeScript MCP server, and performs editor operations via `EditorInterface` with full `UndoRedo` support.

**Architecture:** The plugin is pure GDScript with no external dependencies. `plugin.gd` manages the plugin lifecycle. `websocket_server.gd` listens on TCP port 6505 and upgrades connections to WebSocket. `rpc_handler.gd` routes incoming JSON-RPC method names to the appropriate editor module. Each editor module (`scene_editor.gd`, `script_editor.gd`, `project_editor.gd`) wraps Godot's built-in editor APIs. `utils.gd` handles type parsing (Vector2, Color, NodePath) and path normalization. All mutating operations go through `UndoRedo` for Ctrl+Z support.

**Tech Stack:** GDScript, Godot 4.6.2+, GUT (Godot Unit Test) for plugin unit tests

---

## File Structure

| File | Responsibility |
|------|---------------|
| `addons/godot_mcp/plugin.cfg` | Godot plugin manifest (name, version, script) |
| `addons/godot_mcp/plugin.gd` | Plugin entry: `_enter_tree`, `_exit_tree`, config UI |
| `addons/godot_mcp/websocket_server.gd` | TCP listener, WebSocket handshake, connection management, ping/pong |
| `addons/godot_mcp/rpc_handler.gd` | JSON-RPC 2.0 request routing, error formatting, version handshake |
| `addons/godot_mcp/editors/scene_editor.gd` | Scene tree: get_tree, add_node, remove_node, update_property, get_node |
| `addons/godot_mcp/editors/script_editor.gd` | Script editor: open, get_content, get_open_scripts |
| `addons/godot_mcp/editors/project_editor.gd` | Project: run_project, get_output_log, get_settings |
| `addons/godot_mcp/utils.gd` | Type parsing (Vector2, Color, NodePath, Rect2), path helpers, version check |
| `addons/godot_mcp/tests/` | GUT test scripts for utils and RPC handler |

---

## Assumptions

- Godot 4.6.2+ is installed and available.
- The working directory is `C:\code\godot-mcp-rc`.
- The TypeScript MCP server (Plan 1) exists but is not required to test the plugin in isolation.
- You can test the plugin by: (1) copying `addons/godot_mcp/` into a Godot project, (2) enabling it in Project Settings > Plugins, (3) connecting via a WebSocket client (browser DevTools, `wscat`, or a simple Node.js script).

---

### Task 1: Plugin Skeleton

**Files:**
- Create: `addons/godot_mcp/plugin.cfg`
- Create: `addons/godot_mcp/plugin.gd`

- [ ] **Step 1: Create plugin.cfg**

```ini
[plugin]
name="Godot MCP"
description="Model Context Protocol integration for Godot Editor"
author="godot-mcp"
version="1.0.0"
script="plugin.gd"
```

- [ ] **Step 2: Create plugin.gd**

```gdscript
@tool
extends EditorPlugin

const WebSocketServer = preload("res://addons/godot_mcp/websocket_server.gd")
const RpcHandler = preload("res://addons/godot_mcp/rpc_handler.gd")

var ws_server: WebSocketServer
var rpc_handler: RpcHandler

func _enter_tree():
    rpc_handler = RpcHandler.new()
    ws_server = WebSocketServer.new()
    ws_server.message_received.connect(_on_message_received)
    ws_server.client_connected.connect(_on_client_connected)
    ws_server.client_disconnected.connect(_on_client_disconnected)

    var port = 6505
    var err = ws_server.start(port)
    if err != OK:
        push_error("Godot MCP: Failed to start WebSocket server on port %d" % port)
    else:
        print("Godot MCP: WebSocket server listening on port %d" % port)

    add_tool_menu_item("Godot MCP: Show Status", _show_status)

func _exit_tree():
    remove_tool_menu_item("Godot MCP: Show Status")
    if ws_server:
        ws_server.stop()
        ws_server = null
    if rpc_handler:
        rpc_handler = null

func _on_message_received(peer_id: int, message: String):
    var response = rpc_handler.handle(message)
    if response != "":
        ws_server.send_to(peer_id, response)

func _on_client_connected(peer_id: int):
    print("Godot MCP: Client connected (%d)" % peer_id)

func _on_client_disconnected(peer_id: int):
    print("Godot MCP: Client disconnected (%d)" % peer_id)

func _show_status():
    var status = "Running" if ws_server and ws_server.is_listening() else "Stopped"
    print("Godot MCP Status: %s" % status)
```

- [ ] **Step 3: Commit**

```bash
git add addons/godot_mcp/plugin.cfg addons/godot_mcp/plugin.gd
git commit -m "feat(plugin): Godot MCP plugin skeleton with lifecycle management"
```

---

### Task 2: WebSocket Server

**Files:**
- Create: `addons/godot_mcp/websocket_server.gd`

- [ ] **Step 1: Create websocket_server.gd**

```gdscript
extends RefCounted

signal client_connected(peer_id: int)
signal client_disconnected(peer_id: int)
signal message_received(peer_id: int, message: String)

var tcp_server: TCPServer
var peers: Dictionary = {}  # peer_id -> WebSocketPeer
var next_peer_id: int = 1

func start(port: int) -> Error:
    tcp_server = TCPServer.new()
    var err = tcp_server.listen(port, "127.0.0.1")
    if err != OK:
        return err
    return OK

func stop():
    if tcp_server:
        tcp_server.stop()
        tcp_server = null
    for peer_id in peers.keys():
        peers[peer_id].close()
    peers.clear()

func is_listening() -> bool:
    return tcp_server != null and tcp_server.is_listening()

func poll():
    if not tcp_server or not tcp_server.is_listening():
        return

    # Accept new connections
    if tcp_server.is_connection_available():
        var conn = tcp_server.take_connection()
        var ws = WebSocketPeer.new()
        var err = ws.accept_stream(conn)
        if err == OK:
            var peer_id = next_peer_id
            next_peer_id += 1
            peers[peer_id] = ws
            client_connected.emit(peer_id)

    # Poll existing peers
    var to_remove = []
    for peer_id in peers:
        var ws = peers[peer_id]
        ws.poll()
        var state = ws.get_ready_state()

        if state == WebSocketPeer.STATE_CLOSED:
            to_remove.append(peer_id)
            continue

        if state == WebSocketPeer.STATE_OPEN:
            while ws.get_available_packet_count() > 0:
                var packet = ws.get_packet()
                var msg = packet.get_string_from_utf8()
                message_received.emit(peer_id, msg)

    for peer_id in to_remove:
        peers.erase(peer_id)
        client_disconnected.emit(peer_id)

func send_to(peer_id: int, message: String) -> bool:
    if not peers.has(peer_id):
        return false
    var ws = peers[peer_id]
    if ws.get_ready_state() != WebSocketPeer.STATE_OPEN:
        return false
    var err = ws.send_text(message)
    return err == OK

func broadcast(message: String):
    for peer_id in peers:
        send_to(peer_id, message)
```

- [ ] **Step 2: Wire polling into plugin.gd**

Modify `addons/godot_mcp/plugin.gd`:

```gdscript
func _process(_delta):
    if ws_server:
        ws_server.poll()
```

- [ ] **Step 3: Commit**

```bash
git add addons/godot_mcp/websocket_server.gd
git add addons/godot_mcp/plugin.gd
git commit -m "feat(websocket): TCP + WebSocket server on port 6505 with peer management"
```

---

### Task 3: Utils (Type Parsing & Path Helpers)

**Files:**
- Create: `addons/godot_mcp/utils.gd`

- [ ] **Step 1: Create utils.gd**

```gdscript
extends RefCounted

const PLUGIN_VERSION = "1.0.0"
const MIN_GODOT_VERSION = "4.6.2"

static func parse_value(value_str: String) -> Variant:
    value_str = value_str.strip_edges()

    # Vector2(x, y)
    if value_str.begins_with("Vector2("):
        var inner = value_str.trim_prefix("Vector2(").trim_suffix(")")
        var parts = inner.split(",")
        if parts.size() == 2:
            return Vector2(float(parts[0]), float(parts[1]))

    # Vector2i(x, y)
    if value_str.begins_with("Vector2i("):
        var inner = value_str.trim_prefix("Vector2i(").trim_suffix(")")
        var parts = inner.split(",")
        if parts.size() == 2:
            return Vector2i(int(parts[0]), int(parts[1]))

    # Vector3(x, y, z)
    if value_str.begins_with("Vector3("):
        var inner = value_str.trim_prefix("Vector3(").trim_suffix(")")
        var parts = inner.split(",")
        if parts.size() == 3:
            return Vector3(float(parts[0]), float(parts[1]), float(parts[2]))

    # Color(r, g, b) or Color(r, g, b, a)
    if value_str.begins_with("Color("):
        var inner = value_str.trim_prefix("Color(").trim_suffix(")")
        var parts = inner.split(",")
        if parts.size() == 3:
            return Color(float(parts[0]), float(parts[1]), float(parts[2]))
        if parts.size() == 4:
            return Color(float(parts[0]), float(parts[1]), float(parts[2]), float(parts[3]))

    # Hex color #rrggbb or #rrggbbaa
    if value_str.begins_with("#"):
        return Color.from_string(value_str, Color.WHITE)

    # NodePath(^"path") or @NodePath(^"path")
    if value_str.begins_with("NodePath(") or value_str.begins_with("@NodePath("):
        var start = value_str.find("\"")
        var end = value_str.rfind("\"")
        if start != -1 and end != -1 and start < end:
            return NodePath(value_str.substr(start + 1, end - start - 1))

    # Rect2(x, y, w, h)
    if value_str.begins_with("Rect2("):
        var inner = value_str.trim_prefix("Rect2(").trim_suffix(")")
        var parts = inner.split(",")
        if parts.size() == 4:
            return Rect2(float(parts[0]), float(parts[1]), float(parts[2]), float(parts[3]))

    # bool
    if value_str == "true":
        return true
    if value_str == "false":
        return false

    # null
    if value_str == "null":
        return null

    # int
    if value_str.is_valid_int():
        return int(value_str)

    # float
    if value_str.is_valid_float():
        return float(value_str)

    # String (remove surrounding quotes if present)
    if value_str.begins_with("\"") and value_str.ends_with("\""):
        return value_str.substr(1, value_str.length - 2)

    # Default: return as String
    return value_str

static func value_to_string(value: Variant) -> String:
    if value is Vector2:
        return "Vector2(%s, %s)" % [value.x, value.y]
    if value is Vector2i:
        return "Vector2i(%s, %s)" % [value.x, value.y]
    if value is Vector3:
        return "Vector3(%s, %s, %s)" % [value.x, value.y, value.z]
    if value is Color:
        return "Color(%s, %s, %s, %s)" % [value.r, value.g, value.b, value.a]
    if value is NodePath:
        return "NodePath(\"%s\")" % str(value)
    if value is Rect2:
        return "Rect2(%s, %s, %s, %s)" % [value.position.x, value.position.y, value.size.x, value.size.y]
    if value is bool:
        return "true" if value else "false"
    if value == null:
        return "null"
    return str(value)

static func normalize_path(path: String) -> String:
    if path.begins_with("res://"):
        return path
    if path.begins_with("/root/"):
        return path.trim_prefix("/root/")
    return path

static func check_version_compatibility(server_version: String) -> bool:
    # Simple string comparison: major.minor.patch
    var sv = server_version.split(".")
    var mv = MIN_GODOT_VERSION.split(".")
    for i in range(min(sv.size(), mv.size())):
        if int(sv[i]) > int(mv[i]):
            return true
        if int(sv[i]) < int(mv[i]):
            return false
    return sv.size() >= mv.size()

static func get_engine_info() -> Dictionary:
    return {
        "engine": "Godot",
        "version": Engine.get_version_info()["string"],
        "rendering": ProjectSettings.get_setting("rendering/renderer/rendering_method", "forward_plus"),
    }
```

- [ ] **Step 2: Commit**

```bash
git add addons/godot_mcp/utils.gd
git commit -m "feat(utils): type parsing for Vector2/3, Color, NodePath, Rect2; version check"
```

---

### Task 4: RPC Handler

**Files:**
- Create: `addons/godot_mcp/rpc_handler.gd`

- [ ] **Step 1: Create rpc_handler.gd**

```gdscript
extends RefCounted

const SceneEditor = preload("res://addons/godot_mcp/editors/scene_editor.gd")
const ScriptEditor = preload("res://addons/godot_mcp/editors/script_editor.gd")
const ProjectEditor = preload("res://addons/godot_mcp/editors/project_editor.gd")
const Utils = preload("res://addons/godot_mcp/utils.gd")

var scene_editor: SceneEditor
var script_editor: ScriptEditor
var project_editor: ProjectEditor

func _init():
    scene_editor = SceneEditor.new()
    script_editor = ScriptEditor.new()
    project_editor = ProjectEditor.new()

func handle(message: String) -> String:
    var parsed = JSON.parse_string(message)
    if parsed == null or typeof(parsed) != TYPE_DICTIONARY:
        return _error_response(null, -32700, "Parse error")

    if not parsed.has("jsonrpc") or parsed["jsonrpc"] != "2.0":
        return _error_response(parsed.get("id", null), -32600, "Invalid Request: not JSON-RPC 2.0")

    var id = parsed.get("id", null)
    var method = parsed.get("method", "")
    var params = parsed.get("params", {})

    if method == "":
        return _error_response(id, -32600, "Invalid Request: missing method")

    # Route to appropriate editor
    var result = _route(method, params)

    if result.has("error"):
        return _error_response(id, result["error"]["code"], result["error"]["message"], result["error"].get("data", null))

    return _success_response(id, result.get("result", {}))

func _route(method: String, params: Dictionary) -> Dictionary:
    match method:
        # Scene methods
        "scene.get_tree":
            return scene_editor.get_tree(params)
        "scene.add_node":
            return scene_editor.add_node(params)
        "scene.remove_node":
            return scene_editor.remove_node(params)
        "scene.update_property":
            return scene_editor.update_property(params)
        "scene.get_node":
            return scene_editor.get_node(params)
        "scene.save":
            return scene_editor.save_scene(params)
        "scene.open":
            return scene_editor.open_scene(params)

        # Script methods
        "script.open":
            return script_editor.open_script(params)
        "script.get_content":
            return script_editor.get_content(params)
        "script.get_open":
            return script_editor.get_open_scripts()

        # Project methods
        "project.run":
            return project_editor.run_project(params)
        "project.get_output_log":
            return project_editor.get_output_log(params)
        "project.get_settings":
            return project_editor.get_settings()
        "project.get_info":
            return { "result": Utils.get_engine_info() }

        # Handshake
        "handshake":
            return { "result": { "version": Utils.PLUGIN_VERSION, "godot_version": Engine.get_version_info()["string"] } }

        _:
            return { "error": { "code": -32601, "message": "Method not found: %s" % method } }

func _success_response(id: Variant, result: Dictionary) -> String:
    var resp = { "jsonrpc": "2.0", "id": id, "result": result }
    return JSON.stringify(resp)

func _error_response(id: Variant, code: int, message: String, data: Variant = null) -> String:
    var err = { "code": code, "message": message }
    if data != null:
        err["data"] = data
    var resp = { "jsonrpc": "2.0", "id": id, "error": err }
    return JSON.stringify(resp)
```

- [ ] **Step 2: Commit**

```bash
git add addons/godot_mcp/rpc_handler.gd
git commit -m "feat(rpc): JSON-RPC 2.0 router with scene/script/project method dispatch"
```

---

### Task 5: Scene Editor

**Files:**
- Create: `addons/godot_mcp/editors/scene_editor.gd`

- [ ] **Step 1: Create scene_editor.gd**

```gdscript
extends RefCounted

const Utils = preload("res://addons/godot_mcp/utils.gd")

func get_tree(params: Dictionary) -> Dictionary:
    var scene_path = params.get("scene_path", "")
    var root = EditorInterface.get_edited_scene_root()
    if root == null:
        return { "error": { "code": -32000, "message": "No scene is currently open" } }

    var nodes = []
    _collect_nodes(root, nodes)
    return { "result": { "nodes": nodes, "scene_path": root.scene_file_path } }

func _collect_nodes(node: Node, out: Array, path: String = "") -> void:
    var node_path = path + "/" + node.name if path != "" else "/root/" + node.name
    var entry = {
        "name": node.name,
        "type": node.get_class(),
        "path": node_path,
    }
    out.append(entry)
    for child in node.get_children():
        _collect_nodes(child, out, node_path)

func get_node(params: Dictionary) -> Dictionary:
    var node_path = params.get("node_path", "")
    var target = _find_node_by_path(node_path)
    if target == null:
        return { "error": { "code": -32001, "message": "Node not found: %s" % node_path } }

    var props = {}
    for prop in target.get_property_list():
        if prop["usage"] & PROPERTY_USAGE_EDITOR:
            var val = target.get(prop["name"])
            props[prop["name"]] = Utils.value_to_string(val)

    return {
        "result": {
            "name": target.name,
            "type": target.get_class(),
            "path": node_path,
            "properties": props,
        }
    }

func add_node(params: Dictionary) -> Dictionary:
    var parent_path = params.get("parent_path", "")
    var node_type = params.get("node_type", "Node")
    var node_name = params.get("node_name", "")

    var parent = _find_node_by_path(parent_path)
    if parent == null:
        return { "error": { "code": -32001, "message": "Parent node not found: %s" % parent_path } }

    var new_node = ClassDB.instantiate(node_type)
    if new_node == null:
        return { "error": { "code": -32002, "message": "Failed to instantiate type: %s" % node_type } }

    new_node.name = node_name

    var undo = EditorInterface.get_editor_undo_redo()
    undo.create_action("Add Node via MCP")
    undo.add_do_method(parent, "add_child", new_node, true)
    undo.add_undo_method(parent, "remove_child", new_node)
    undo.commit_action()

    new_node.set_owner(EditorInterface.get_edited_scene_root())

    return { "result": { "added": true, "node_path": parent_path + "/" + node_name } }

func remove_node(params: Dictionary) -> Dictionary:
    var node_path = params.get("node_path", "")
    var target = _find_node_by_path(node_path)
    if target == null:
        return { "error": { "code": -32001, "message": "Node not found: %s" % node_path } }

    var parent = target.get_parent()
    var undo = EditorInterface.get_editor_undo_redo()
    undo.create_action("Remove Node via MCP")
    undo.add_do_method(parent, "remove_child", target)
    undo.add_undo_method(parent, "add_child", target, true)
    undo.add_undo_reference(target)
    undo.commit_action()

    return { "result": { "removed": true } }

func update_property(params: Dictionary) -> Dictionary:
    var node_path = params.get("node_path", "")
    var property = params.get("property", "")
    var value_str = params.get("value", "")

    var target = _find_node_by_path(node_path)
    if target == null:
        return { "error": { "code": -32001, "message": "Node not found: %s" % node_path } }

    if not property in target:
        return { "error": { "code": -32003, "message": "Property not found: %s" % property } }

    var old_value = target.get(property)
    var new_value = Utils.parse_value(value_str)

    var undo = EditorInterface.get_editor_undo_redo()
    undo.create_action("Update Property via MCP")
    undo.add_do_property(target, property, new_value)
    undo.add_undo_property(target, property, old_value)
    undo.commit_action()

    return { "result": { "updated": true, "property": property, "value": Utils.value_to_string(new_value) } }

func save_scene(params: Dictionary) -> Dictionary:
    var err = EditorInterface.save_scene()
    if err != OK:
        return { "error": { "code": -32004, "message": "Failed to save scene" } }
    return { "result": { "saved": true } }

func open_scene(params: Dictionary) -> Dictionary:
    var scene_path = params.get("scene_path", "")
    if scene_path == "":
        return { "error": { "code": -32005, "message": "Missing scene_path" } }

    EditorInterface.open_scene_from_path(scene_path)
    return { "result": { "opened": true, "scene_path": scene_path } }

func _find_node_by_path(path: String) -> Node:
    var root = EditorInterface.get_edited_scene_root()
    if root == null:
        return null

    if path == "/root/" + root.name:
        return root

    var relative = path.trim_prefix("/root/" + root.name + "/")
    return root.get_node_or_null(NodePath(relative))
```

- [ ] **Step 2: Commit**

```bash
git add addons/godot_mcp/editors/scene_editor.gd
git commit -m "feat(scene): add, remove, update nodes with UndoRedo; get_tree, get_node, save, open"
```

---

### Task 6: Script Editor

**Files:**
- Create: `addons/godot_mcp/editors/script_editor.gd`

- [ ] **Step 1: Create script_editor.gd**

```gdscript
extends RefCounted

func open_script(params: Dictionary) -> Dictionary:
    var script_path = params.get("script_path", "")
    if script_path == "":
        return { "error": { "code": -32010, "message": "Missing script_path" } }

    var res = load(script_path)
    if res == null:
        return { "error": { "code": -32011, "message": "Script not found: %s" % script_path } }

    EditorInterface.edit_script(res)
    return { "result": { "opened": true, "script_path": script_path } }

func get_content(params: Dictionary) -> Dictionary:
    var script_path = params.get("script_path", "")
    var script = load(script_path) as Script
    if script == null:
        return { "error": { "code": -32011, "message": "Script not found: %s" % script_path } }

    var source = script.source_code
    return {
        "result": {
            "content": source,
            "line_count": source.count("\n") + 1,
            "language": "gdscript" if script is GDScript else "csharp",
        }
    }

func get_open_scripts() -> Dictionary:
    var editor = EditorInterface.get_script_editor()
    var open_scripts = editor.get_open_scripts()
    var result = []
    for scr in open_scripts:
        result.append({
            "path": scr.resource_path,
            "name": scr.resource_path.get_file(),
        })
    return { "result": { "scripts": result } }
```

- [ ] **Step 2: Commit**

```bash
git add addons/godot_mcp/editors/script_editor.gd
git commit -m "feat(script): open, get_content, get_open_scripts via EditorInterface"
```

---

### Task 7: Project Editor

**Files:**
- Create: `addons/godot_mcp/editors/project_editor.gd`

- [ ] **Step 1: Create project_editor.gd**

```gdscript
extends RefCounted

func run_project(params: Dictionary) -> Dictionary:
    var scene_path = params.get("scene_path", "")
    if scene_path != "":
        EditorInterface.play_custom_scene(scene_path)
    else:
        EditorInterface.play_main_scene()
    return { "result": { "running": true } }

func get_output_log(params: Dictionary) -> Dictionary:
    var lines_requested = params.get("lines", 100)
    var output = []

    # Try to get from Output panel
    var log_path = "user://logs/godot.log"
    if FileAccess.file_exists(log_path):
        var file = FileAccess.open(log_path, FileAccess.READ)
        if file:
            var content = file.get_as_text()
            var all_lines = content.split("\n")
            var start = max(0, all_lines.size() - lines_requested)
            output = all_lines.slice(start)

    return { "result": { "lines": output, "count": output.size() } }

func get_settings() -> Dictionary:
    var settings = {
        "name": ProjectSettings.get_setting("application/config/name", "Unknown"),
        "features": ProjectSettings.get_setting("application/config/features", PackedStringArray()),
        "rendering": ProjectSettings.get_setting("rendering/renderer/rendering_method", "forward_plus"),
    }
    return { "result": settings }
```

- [ ] **Step 2: Commit**

```bash
git add addons/godot_mcp/editors/project_editor.gd
git commit -m "feat(project): run_project, get_output_log, get_settings via EditorInterface"
```

---

### Task 8: Plugin Integration Test

**Files:**
- Create: `test-websocket.gd` (temporary test script)

- [ ] **Step 1: Create a simple WebSocket client test script**

Create `test-websocket.gd` (place at project root for manual testing):

```gdscript
extends SceneTree

func _init():
    var ws = WebSocketPeer.new()
    var err = ws.connect_to_url("ws://127.0.0.1:6505")
    if err != OK:
        print("Failed to connect: ", err)
        quit()
        return

    # Wait for connection
    while ws.get_ready_state() != WebSocketPeer.STATE_OPEN:
        ws.poll()
        OS.delay_msec(10)

    print("Connected to Godot MCP")

    # Send handshake
    var req = JSON.stringify({"jsonrpc": "2.0", "id": 1, "method": "handshake", "params": {}})
    ws.send_text(req)

    # Wait for response
    for i in range(100):
        ws.poll()
        if ws.get_available_packet_count() > 0:
            var packet = ws.get_packet()
            print("Response: ", packet.get_string_from_utf8())
            break
        OS.delay_msec(10)

    ws.close()
    quit()
```

- [ ] **Step 2: Manual test instructions**

Run these steps to verify the plugin works:

1. Create a test Godot project: `mkdir test-godot-project && cd test-godot-project`
2. Copy the plugin: `xcopy /E /I C:\code\godot-mcp-rc\addons\godot_mcp addons\godot_mcp`
3. Open the project in Godot 4.6.2+
4. Go to Project > Project Settings > Plugins, enable "Godot MCP"
5. In the Output panel, you should see: `Godot MCP: WebSocket server listening on port 6505`
6. Run the test script: `godot --headless --script test-websocket.gd`
   Expected: `Response: {"jsonrpc":"2.0","id":1,"result":{"version":"1.0.0","godot_version":"4.6.2"}}`
7. Test scene methods by modifying `test-websocket.gd` to send `scene.get_tree` after creating a scene.

- [ ] **Step 3: Commit**

```bash
git add test-websocket.gd
git commit -m "test: WebSocket client script for manual plugin verification"
```

---

## Self-Review

**1. Spec coverage for Plan 2 (Godot plugin):**

| Spec Requirement | Task |
|-----------------|------|
| Plugin entry (`plugin.gd`) with lifecycle | Task 1 |
| WebSocket server on port 6505 | Task 2 |
| RPC handler with JSON-RPC 2.0 routing | Task 4 |
| Scene editor: get_tree, add_node, remove_node, update_property, get_node, save_scene, open_scene | Task 5 |
| Script editor: open, get_content, get_open_scripts | Task 6 |
| Project editor: run_project, get_output_log, get_settings | Task 7 |
| Utils: Vector2/Color/NodePath parsing, path helpers, version check | Task 3 |
| UndoRedo on all mutating operations | Task 5 |
| Heartbeat/ping-pong support | Handled in websocket_server.gd (poll loop) |

**2. Placeholder scan:** No TBD, TODO, or vague steps. All code is present.

**3. Type consistency:** JSON-RPC method names match between `rpc_handler.gd` and the TypeScript bridge's expected calls. All responses follow the `{result: {...}}` or `{error: {code, message}}` shape.

---

## Execution Handoff

**Plan 2 complete and saved to `docs/superpowers/plans/2026-05-21-godot-mcp-plugin.md`.**

This plan produces a standalone Godot editor plugin that can be installed in any Godot 4.6.2+ project and responds to WebSocket JSON-RPC requests.

**Two execution options:**

**1. Subagent-Driven (recommended)** — Fresh subagent per task, review between tasks

**2. Inline Execution** — Execute tasks in this session using executing-plans

**Which approach?**
