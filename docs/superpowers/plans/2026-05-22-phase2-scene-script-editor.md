# Phase 2: Scene/Script/Editor 工具实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 26 个工具（Scene 9 + Script 8 + Editor 9），覆盖场景管理、脚本工具、编辑器操作

**Architecture:**
- Godot 插件扩展 `scene_editor.gd`（Scene 工具）、`script_editor.gd`（Script 工具）、`project_editor.gd`（Editor 工具）
- MCP 服务端扩展 `scene.ts`、`script.ts`、`editor.ts`
- RPC 路由更新 `rpc_handler.gd` 添加新的路由前缀

**Tech Stack:** TypeScript, GDScript, WebSocket, JSON-RPC 2.0

---

## File Structure

```
addons/godot_mcp/
├── editors/
│   ├── scene_editor.gd       (EXTEND - add Scene 9 tools)
│   ├── script_editor.gd     (EXTEND - add Script 4 tools)
│   └── project_editor.gd    (EXTEND - add Editor 7 tools)
├── rpc_handler.gd           (EXTEND - add scene.*, script.*, project.* routes)
└── plugin.gd                 (existing)

server/src/
├── tools/
│   ├── scene.ts             (EXTEND - add Scene 6 tools)
│   ├── script.ts            (EXTEND - add Script 2 tools)
│   ├── editor.ts            (EXTEND - add Editor 6 tools)
│   ├── index.ts             (EXTEND - register 26 new tools)
│   └── ...                  (existing)
└── godot-bridge.js          (existing)
```

---

## Task 1: 扩展 scene_editor.gd（新增6个Scene工具）

**Files:**
- Modify: `addons/godot_mcp/editors/scene_editor.gd`

- [ ] **Step 1: 在 scene_editor.gd 末尾添加 6 个新工具**

```gdscript
# === Phase 2 Scene Extensions ===

func get_scene_file_content(params: Dictionary) -> Dictionary:
    var scene_path = params.get("scene_path", "")
    if scene_path == "":
        return { "error": { "code": ERR_INVALID_PARAMS, "message": "Missing scene_path" } }
    var full_path = _resolve_scene_path(scene_path)
    if not FileAccess.file_exists(full_path):
        return { "error": { "code": ERR_FILE_NOT_FOUND, "message": "Scene not found: " + scene_path } }
    var file = FileAccess.open(full_path, FileAccess.READ)
    if file == null:
        return { "error": { "code": ERR_FILE_ACCESS, "message": "Cannot open file" } }
    var content = file.get_as_text()
    file.close()
    return { "result": { "content": content, "path": scene_path } }

func delete_scene(params: Dictionary) -> Dictionary:
    var scene_path = params.get("scene_path", "")
    if scene_path == "":
        return { "error": { "code": ERR_INVALID_PARAMS, "message": "Missing scene_path" } }
    var full_path = _resolve_scene_path(scene_path)
    if not FileAccess.file_exists(full_path):
        return { "error": { "code": ERR_FILE_NOT_FOUND, "message": "Scene not found: " + scene_path } }
    var dir = DirAccess.open(full_path.get_base_dir())
    if dir == null or dir.remove(full_path) != OK:
        return { "error": { "code": ERR_DELETE_FAILED, "message": "Failed to delete scene" } }
    return { "result": { "deleted": true, "path": scene_path } }

func add_scene_instance(params: Dictionary) -> Dictionary:
    var scene_path = params.get("scene_path", "")
    var parent_path = params.get("parent_path", "")
    var instance_name = params.get("name", "")
    if scene_path == "" or parent_path == "":
        return { "error": { "code": ERR_INVALID_PARAMS, "message": "Missing required params" } }
    var scene_file = load(scene_path)
    if scene_file == null:
        return { "error": { "code": ERR_INVALID_SCENE, "message": "Cannot load scene: " + scene_path } }
    var parent = _find_node_by_path(parent_path)
    if parent == null:
        return { "error": { "code": ERR_NODE_NOT_FOUND, "message": "Parent not found: " + parent_path } }
    var instance = scene_file.instantiate()
    instance.name = instance_name if instance_name != "" else scene_file.get_state().get_node_name(0)
    parent.add_child(instance)
    _record_undo("Add Scene Instance", parent, instance)
    return { "result": { "added": true, "path": parent_path + "/" + instance.name } }

func play_scene(params: Dictionary) -> Dictionary:
    var scene_path = params.get("scene_path", "")
    if scene_path != "":
        get_tree().change_scene_to_file(scene_path)
    get_tree().paused = false
    return { "result": { "playing": true } }

func stop_scene(params: Dictionary) -> Dictionary:
    get_tree().paused = true
    return { "result": { "stopped": true } }

func get_signals(params: Dictionary) -> Dictionary:
    var node_path = params.get("node_path", "")
    var target = _find_node_by_path(node_path)
    if target == null:
        return { "error": { "code": ERR_NODE_NOT_FOUND, "message": "Node not found: " + node_path } }
    var signals = []
    for sig in target.get_signal_list():
        var connections = []
        for conn in target.get_signal_connection_list(sig.get("name", "")):
            connections.append({
                "signal": sig.get("name", ""),
                "target": conn.get("target", null),
                "method": conn.get("method", ""),
                "flags": conn.get("flags", 0)
            })
        signals.append({ "signal": sig.get("name", ""), "connections": connections })
    return { "result": { "signals": signals } }
```

---

## Task 2: 扩展 script_editor.gd（新增4个Script工具）

**Files:**
- Modify: `addons/godot_mcp/editors/script_editor.gd`

- [ ] **Step 1: 在 script_editor.gd 末尾添加 4 个新工具**

```gdscript
# === Phase 2 Script Extensions ===

func list_scripts(params: Dictionary) -> Dictionary:
    var result = []
    var project_path = ProjectSettings.get_setting("application/config/name", "")
    _scan_scripts_recursive("res://", result)
    return { "result": { "scripts": result } }

func _scan_scripts_recursive(dir: String, out: Array):
    var d = DirAccess.open(dir)
    if d == null:
        return
    d.list_dir_begin()
    var file_name = d.get_next()
    while file_name != "":
        if d.current_is_dir():
            if not file_name.begins_with("."):
                _scan_scripts_recursive(dir.plus_file(file_name), out)
        elif file_name.ends_with(".gd") or file_name.ends_with(".cs"):
            var script_path = dir.plus_file(file_name)
            var script_res = load(script_path)
            out.append({
                "path": script_path,
                "class_name": script_res.get_instance_base_type() if script_res else "",
                "name": file_name
            })
        file_name = d.get_next()
    d.list_dir_end()

func attach_script(params: Dictionary) -> Dictionary:
    var node_path = params.get("node_path", "")
    var script_path = params.get("script_path", "")
    if node_path == "" or script_path == "":
        return { "error": { "code": ERR_INVALID_PARAMS, "message": "Missing required params" } }
    var target = _find_node_by_path(node_path)
    if target == null:
        return { "error": { "code": ERR_NODE_NOT_FOUND, "message": "Node not found: " + node_path } }
    var script = load(script_path)
    if script == null:
        return { "error": { "code": ERR_SCRIPT_NOT_FOUND, "message": "Script not found: " + script_path } }
    target.set_script(script)
    return { "result": { "attached": true, "node_path": node_path, "script_path": script_path } }

func validate_script(params: Dictionary) -> Dictionary:
    var script_path = params.get("script_path", "")
    var code = params.get("code", "")
    var script = GDScript.new()
    if script_path != "":
        script.source_code = FileAccess.open(script_path, FileAccess.READ).get_as_text()
    elif code != "":
        script.source_code = code
    else:
        return { "error": { "code": ERR_INVALID_PARAMS, "message": "Missing script_path or code" } }
    var err = script.reload(false)
    if err != OK:
        return { "result": { "valid": false, "error": "Script compilation failed" } }
    return { "result": { "valid": true } }

func search_in_files(params: Dictionary) -> Dictionary:
    var search_text = params.get("text", "")
    var extensions = params.get("extensions", [".gd", ".tscn", ".json"])
    var case_sensitive = params.get("case_sensitive", false)
    var results = []
    _search_recursive("res://", search_text, extensions, case_sensitive, results)
    return { "result": { "matches": results } }

func _search_recursive(dir: String, text: String, exts: Array, case_sensitive: bool, out: Array):
    var d = DirAccess.open(dir)
    if d == null:
        return
    d.list_dir_begin()
    var file_name = d.get_next()
    while file_name != "":
        if d.current_is_dir():
            if not file_name.begins_with("."):
                _search_recursive(dir.plus_file(file_name), text, exts, case_sensitive, out)
        else:
            var should_search = false
            for ext in exts:
                if file_name.ends_with(ext):
                    should_search = true
                    break
            if should_search:
                var full_path = dir.plus_file(file_name)
                var file = FileAccess.open(full_path, FileAccess.READ)
                if file:
                    var line_num = 0
                    while not file.eof_reached():
                        line_num += 1
                        var line = file.get_line()
                        var search_in = line if case_sensitive else line.to_lower()
                        var search_for = text if case_sensitive else text.to_lower()
                        if search_in.find(search_for) != -1:
                            out.append({ "file": full_path, "line": line_num, "content": line.strip_edges() })
                    file.close()
        file_name = d.get_next()
    d.list_dir_end()
```

---

## Task 3: 扩展 project_editor.gd（新增7个Editor工具）

**Files:**
- Modify: `addons/godot_mcp/editors/project_editor.gd`

- [ ] **Step 1: 在 project_editor.gd 末尾添加 7 个新工具**

```gdscript
# === Phase 2 Editor Extensions ===

func get_editor_errors(params: Dictionary) -> Dictionary:
    var errors = []
    var console = EditorInterface.get_base_control().get_node_or_null("OutputConsole")
    if console:
        for msg in console.get_documentation_errors():
            errors.append(msg)
    return { "result": { "errors": errors } }

func get_editor_screenshot(params: Dictionary) -> Dictionary:
    var viewport = EditorInterface.get_editor_viewport().get_viewport()
    var img = viewport.get_texture().get_image()
    var encoded = img.save_png_to_buffer()
    return { "result": { "screenshot": encoded, "width": img.get_width(), "height": img.get_height() } }

func get_game_screenshot(params: Dictionary) -> Dictionary:
    var viewport = get_tree().root.get_viewport()
    var img = viewport.get_texture().get_image()
    var encoded = img.save_png_to_buffer()
    return { "result": { "screenshot": encoded, "width": img.get_width(), "height": img.get_height() } }

func execute_editor_script(params: Dictionary) -> Dictionary:
    var code = params.get("code", "")
    if code == "":
        return { "error": { "code": ERR_INVALID_PARAMS, "message": "Missing code" } }
    var script = GDScript.new()
    script.source_code = code
    var err = script.reload(false)
    if err != OK:
        return { "error": { "code": ERR_SCRIPT_COMPILATION, "message": "Script compilation failed" } }
    var instance = script.new()
    return { "result": { "executed": true } }

func clear_output(params: Dictionary) -> Dictionary:
    var console = EditorInterface.get_base_control().get_node_or_null("OutputConsole")
    if console:
        console.clear()
    return { "result": { "cleared": true } }

func reload_plugin(params: Dictionary) -> Dictionary:
    var plugin = Engine.get_singleton("GodotMCP")
    if plugin and plugin.has_method("reload"):
        plugin.reload()
    return { "result": { "reloaded": true } }

func reload_project(params: Dictionary) -> Dictionary:
    ProjectSettings.save()
    ResourceLoader.reload_global_resources()
    return { "result": { "reloaded": true } }
```

---

## Task 4: 更新 rpc_handler.gd 添加新路由

**Files:**
- Modify: `addons/godot_mcp/rpc_handler.gd`

- [ ] **Step 1: 在 match 语句中添加 scene.*, script.*, editor.* 路由**

```gdscript
# Scene routes (12 total: existing 6 + new 6)
"scene.get_file_content":
    return scene_editor_inst.get_scene_file_content(params)
"scene.delete":
    return scene_editor_inst.delete_scene(params)
"scene.add_instance":
    return scene_editor_inst.add_scene_instance(params)
"scene.play":
    return scene_editor_inst.play_scene(params)
"scene.stop":
    return scene_editor_inst.stop_scene(params)
"scene.get_signals":
    return scene_editor_inst.get_signals(params)

# Script routes (5 total: existing 1 + new 4)
"script.list":
    return script_editor_inst.list_scripts(params)
"script.attach":
    return script_editor_inst.attach_script(params)
"script.validate":
    return script_editor_inst.validate_script(params)
"script.search":
    return script_editor_inst.search_in_files(params)

# Editor routes (5 total: existing 1 + new 4)
"editor.get_errors":
    return project_editor_inst.get_editor_errors(params)
"editor.get_screenshot":
    return project_editor_inst.get_editor_screenshot(params)
"editor.get_game_screenshot":
    return project_editor_inst.get_game_screenshot(params)
"editor.execute_script":
    return project_editor_inst.execute_editor_script(params)
"editor.clear_output":
    return project_editor_inst.clear_output(params)
"editor.reload_plugin":
    return project_editor_inst.reload_plugin(params)
"editor.reload_project":
    return project_editor_inst.reload_project(params)
```

---

## Task 5: 扩展 MCP server scene.ts（新增6个工具）

**Files:**
- Modify: `server/src/tools/scene.ts`

- [ ] **Step 1: 添加 6 个新工具函数**

```typescript
// === Phase 2 Scene Extensions ===

export async function getSceneFileContent(args: { scene_path: string }, projectRoot: string, bridge: GodotBridge): Promise<any> {
  if (!bridge.isConnected) {
    return { error: true, message: 'get_scene_file_content requires Godot editor' };
  }
  return await bridge.call('scene.get_file_content', { scene_path: args.scene_path });
}

export async function deleteScene(args: { scene_path: string }, projectRoot: string, bridge: GodotBridge): Promise<any> {
  if (!bridge.isConnected) {
    return { deleted: false, message: 'delete_scene requires Godot editor' };
  }
  return await bridge.call('scene.delete', { scene_path: args.scene_path });
}

export async function addSceneInstance(args: { scene_path: string; parent_path: string; name?: string }, projectRoot: string, bridge: GodotBridge): Promise<any> {
  if (!bridge.isConnected) {
    return { added: false, message: 'add_scene_instance requires Godot editor' };
  }
  return await bridge.call('scene.add_instance', { scene_path: args.scene_path, parent_path: args.parent_path, name: args.name || '' });
}

export async function playScene(args: { scene_path?: string }, projectRoot: string, bridge: GodotBridge): Promise<any> {
  if (!bridge.isConnected) {
    return { playing: false, message: 'play_scene requires Godot editor' };
  }
  return await bridge.call('scene.play', { scene_path: args.scene_path || '' });
}

export async function stopScene(args: Record<string, unknown>, projectRoot: string, bridge: GodotBridge): Promise<any> {
  if (!bridge.isConnected) {
    return { stopped: false, message: 'stop_scene requires Godot editor' };
  }
  return await bridge.call('scene.stop', {});
}

export async function getSignals(args: { node_path: string }, projectRoot: string, bridge: GodotBridge): Promise<any> {
  if (!bridge.isConnected) {
    return { signals: [], message: 'get_signals requires Godot editor' };
  }
  return await bridge.call('scene.get_signals', { node_path: args.node_path });
}
```

---

## Task 6: 扩展 MCP server script.ts（新增4个工具）

**Files:**
- Modify: `server/src/tools/script.ts`

- [ ] **Step 1: 添加 4 个新工具函数**

```typescript
// === Phase 2 Script Extensions ===

export async function listScripts(args: Record<string, unknown>, projectRoot: string, bridge: GodotBridge): Promise<any> {
  if (!bridge.isConnected) {
    return { scripts: [], message: 'list_scripts requires Godot editor' };
  }
  return await bridge.call('script.list', {});
}

export async function attachScript(args: { node_path: string; script_path: string }, projectRoot: string, bridge: GodotBridge): Promise<any> {
  if (!bridge.isConnected) {
    return { attached: false, message: 'attach_script requires Godot editor' };
  }
  return await bridge.call('script.attach', { node_path: args.node_path, script_path: args.script_path });
}

export async function validateScript(args: { script_path?: string; code?: string }, projectRoot: string, bridge: GodotBridge): Promise<any> {
  if (!bridge.isConnected) {
    return { valid: false, message: 'validate_script requires Godot editor' };
  }
  return await bridge.call('script.validate', { script_path: args.script_path || '', code: args.code || '' });
}

export async function searchInFiles(args: { text: string; extensions?: string[]; case_sensitive?: boolean }, projectRoot: string, bridge: GodotBridge): Promise<any> {
  if (!bridge.isConnected) {
    return { matches: [], message: 'search_in_files requires Godot editor' };
  }
  return await bridge.call('script.search', { text: args.text, extensions: args.extensions || ['.gd', '.tscn', '.json'], case_sensitive: args.case_sensitive || false });
}
```

---

## Task 7: 扩展 MCP server editor.ts（新增4个工具）

**Files:**
- Modify: `server/src/tools/editor.ts`

- [ ] **Step 1: 添加 4 个新工具函数**

```typescript
// === Phase 2 Editor Extensions ===

export async function getEditorErrors(args: Record<string, unknown>, projectRoot: string, bridge: GodotBridge): Promise<any> {
  if (!bridge.isConnected) {
    return { errors: [], message: 'get_editor_errors requires Godot editor' };
  }
  return await bridge.call('editor.get_errors', {});
}

export async function getEditorScreenshot(args: Record<string, unknown>, projectRoot: string, bridge: GodotBridge): Promise<any> {
  if (!bridge.isConnected) {
    return { screenshot: '', message: 'get_editor_screenshot requires Godot editor' };
  }
  return await bridge.call('editor.get_screenshot', {});
}

export async function getGameScreenshot(args: Record<string, unknown>, projectRoot: string, bridge: GodotBridge): Promise<any> {
  if (!bridge.isConnected) {
    return { screenshot: '', message: 'get_game_screenshot requires Godot editor' };
  }
  return await bridge.call('editor.get_game_screenshot', {});
}

export async function executeEditorScript(args: { code: string }, projectRoot: string, bridge: GodotBridge): Promise<any> {
  if (!bridge.isConnected) {
    return { executed: false, message: 'execute_editor_script requires Godot editor' };
  }
  return await bridge.call('editor.execute_script', { code: args.code });
}

export async function clearOutput(args: Record<string, unknown>, projectRoot: string, bridge: GodotBridge): Promise<any> {
  if (!bridge.isConnected) {
    return { cleared: false, message: 'clear_output requires Godot editor' };
  }
  return await bridge.call('editor.clear_output', {});
}

export async function reloadPlugin(args: Record<string, unknown>, projectRoot: string, bridge: GodotBridge): Promise<any> {
  if (!bridge.isConnected) {
    return { reloaded: false, message: 'reload_plugin requires Godot editor' };
  }
  return await bridge.call('editor.reload_plugin', {});
}

export async function reloadProject(args: Record<string, unknown>, projectRoot: string, bridge: GodotBridge): Promise<any> {
  if (!bridge.isConnected) {
    return { reloaded: false, message: 'reload_project requires Godot editor' };
  }
  return await bridge.call('editor.reload_project', {});
}
```

---

## Task 8: 更新 tools/index.ts 注册新工具

**Files:**
- Modify: `server/src/tools/index.ts`

- [ ] **Step 1: 导入新工具函数**

```typescript
import { getSceneFileContent, deleteScene, addSceneInstance, playScene, stopScene, getSignals } from './scene.js';
import { listScripts, attachScript, validateScript, searchInFiles } from './script.js';
import { getEditorErrors, getEditorScreenshot, getGameScreenshot, executeEditorScript, clearOutput, reloadPlugin, reloadProject } from './editor.js';
```

- [ ] **Step 2: 在 buildToolRegistry 中注册 26 个新工具**

---

## Task 9: 本地测试验证

**Files:**
- Test: Godot 项目 `C:\code\mcp-test`

- [ ] **Step 1: 复制插件到测试项目**

- [ ] **Step 2: 验证工具数量**

调用 `tools/list` 确认返回 78 个工具（原有 52 + 新增 26）

---

## 进度检查清单

- [ ] Task 1: scene_editor.gd 扩展完成（6个工具）
- [ ] Task 2: script_editor.gd 扩展完成（4个工具）
- [ ] Task 3: project_editor.gd 扩展完成（7个工具）
- [ ] Task 4: rpc_handler.gd 路由更新完成
- [ ] Task 5: scene.ts 扩展完成（6个工具）
- [ ] Task 6: script.ts 扩展完成（4个工具）
- [ ] Task 7: editor.ts 扩展完成（7个工具）
- [ ] Task 8: index.ts 注册完成（26个工具）
- [ ] Task 9: 本地测试通过

---

最后更新: 2026-05-22