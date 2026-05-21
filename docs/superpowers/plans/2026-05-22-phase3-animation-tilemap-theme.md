# Phase 3: Animation/TileMap/Theme-UI 工具实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 18 个工具（Animation 6 + TileMap 6 + Theme-UI 6），覆盖视觉内容编辑

**Architecture:**
- Godot 插件新增 `editors/animation_commands.gd`、`editors/tilemap_commands.gd`、`editors/theme_commands.gd`
- MCP 服务端新增 `server/src/tools/animation.ts`、`server/src/tools/tilemap.ts`、`server/src/tools/theme.ts`
- RPC 路由更新 `rpc_handler.gd` 添加 `animation.*`、`tilemap.*`、`theme.*` 前缀

**Tech Stack:** TypeScript, GDScript, WebSocket, JSON-RPC 2.0

---

## File Structure

```
addons/godot_mcp/
├── editors/
│   ├── animation_commands.gd    (NEW - 6 animation tools)
│   ├── tilemap_commands.gd     (NEW - 6 tilemap tools)
│   └── theme_commands.gd       (NEW - 6 theme/ui tools)
├── rpc_handler.gd               (EXTEND - add animation.*, tilemap.*, theme.* routes)
└── plugin.gd                    (existing)

server/src/
├── tools/
│   ├── animation.ts            (NEW - 6 animation MCP tools)
│   ├── tilemap.ts               (NEW - 6 tilemap MCP tools)
│   ├── theme.ts                 (NEW - 6 theme/ui MCP tools)
│   ├── index.ts                 (EXTEND - register 18 new tools)
│   └── ...                      (existing)
└── godot-bridge.js              (existing)
```

---

## Task 1: 创建 Godot animation_commands.gd（6工具）

**Files:**
- Create: `addons/godot_mcp/editors/animation_commands.gd`

- [ ] **Step 1: 创建 animation_commands.gd**

```gdscript
extends RefCounted

func list_animations(params: Dictionary) -> Dictionary:
    var node_path = params.get("node_path", "")
    var anim_player = _find_node_by_path(node_path)
    if anim_player == null:
        return { "error": { "code": -32602, "message": "AnimationPlayer not found: " + node_path } }
    if not anim_player.has_method("get_animation_list"):
        return { "error": { "code": -32000, "message": "Node is not AnimationPlayer" } }
    var animations = anim_player.get_animation_list()
    var result = []
    for anim in animations:
        result.append({ "name": anim, "duration": anim_player.get_animation(anim).length })
    return { "result": { "animations": result } }

func create_animation(params: Dictionary) -> Dictionary:
    var node_path = params.get("node_path", "")
    var anim_name = params.get("name", "")
    var anim_player = _find_node_by_path(node_path)
    if anim_player == null:
        return { "error": { "code": -32602, "message": "AnimationPlayer not found" } }
    var new_anim = Animation.new()
    anim_player.add_animation(anim_name, new_anim)
    return { "result": { "created": true, "name": anim_name } }

func add_animation_track(params: Dictionary) -> Dictionary:
    var node_path = params.get("node_path", "")
    var anim_name = params.get("animation", "")
    var track_path = params.get("track_path", "")
    var anim_player = _find_node_by_path(node_path)
    if anim_player == null:
        return { "error": { "code": -32602, "message": "AnimationPlayer not found" } }
    var anim = anim_player.get_animation(anim_name)
    if anim == null:
        return { "error": { "code": -32001, "message": "Animation not found: " + anim_name } }
    var track_idx = anim.add_track(Animation.TYPE_VALUE)
    anim.track_path = track_path
    return { "result": { "track_index": track_idx, "animation": anim_name } }

func set_animation_keyframe(params: Dictionary) -> Dictionary:
    var node_path = params.get("node_path", "")
    var anim_name = params.get("animation", "")
    var track_index = params.get("track_index", 0)
    var time = params.get("time", 0.0)
    var value = params.get("value", "")
    var property = params.get("property", "")
    var anim_player = _find_node_by_path(node_path)
    if anim_player == null:
        return { "error": { "code": -32602, "message": "AnimationPlayer not found" } }
    var anim = anim_player.get_animation(anim_name)
    if anim == null:
        return { "error": { "code": -32001, "message": "Animation not found" } }
    anim.track_set_key_value(track_index, 0, _parse_value(value))
    return { "result": { "set": true, "time": time } }

func get_animation_info(params: Dictionary) -> Dictionary:
    var node_path = params.get("node_path", "")
    var anim_name = params.get("animation", "")
    var anim_player = _find_node_by_path(node_path)
    if anim_player == null:
        return { "error": { "code": -32602, "message": "AnimationPlayer not found" } }
    var anim = anim_player.get_animation(anim_name)
    if anim == null:
        return { "error": { "code": -32001, "message": "Animation not found" } }
    return { "result": { "name": anim_name, "length": anim.length, "tracks": anim.get_track_count() } }

func remove_animation(params: Dictionary) -> Dictionary:
    var node_path = params.get("node_path", "")
    var anim_name = params.get("animation", "")
    var anim_player = _find_node_by_path(node_path)
    if anim_player == null:
        return { "error": { "code": -32602, "message": "AnimationPlayer not found" } }
    anim_player.remove_animation(anim_name)
    return { "result": { "removed": true, "name": anim_name } }

func _find_node_by_path(path: String) -> Node:
    return get_tree().root.get_node_or_null(NodePath(path))

func _parse_value(value_str: String):
    if value_str == "true":
        return true
    elif value_str == "false":
        return false
    elif value_str.begins_with("Vector2("):
        var parts = value_str.substr(8, value_str.length() - 9).split(",")
        return Vector2(float(parts[0]), float(parts[1]))
    elif value_str.begins_with("Color("):
        var parts = value_str.substr(7, value_str.length() - 8).split(",")
        return Color(float(parts[0]), float(parts[1]), float(parts[2]), float(parts[3]))
    return value_str
```

---

## Task 2: 创建 Godot tilemap_commands.gd（6工具）

**Files:**
- Create: `addons/godot_mcp/editors/tilemap_commands.gd`

- [ ] **Step 1: 创建 tilemap_commands.gd**

```gdscript
extends RefCounted

func tilemap_set_cell(params: Dictionary) -> Dictionary:
    var node_path = params.get("node_path", "")
    var layer = params.get("layer", 0)
    var x = params.get("x", 0)
    var y = params.get("y", 0)
    var tile_id = params.get("tile_id", -1)
    var tilemap = _find_node_by_path(node_path)
    if tilemap == null:
        return { "error": { "code": -32602, "message": "TileMap not found" } }
    tilemap.set_cell(layer, Vector2i(x, y), tile_id)
    return { "result": { "set": true, "position": { "x": x, "y": y } } }

func tilemap_get_cell(params: Dictionary) -> Dictionary:
    var node_path = params.get("node_path", "")
    var layer = params.get("layer", 0)
    var x = params.get("x", 0)
    var y = params.get("y", 0)
    var tilemap = _find_node_by_path(node_path)
    if tilemap == null:
        return { "error": { "code": -32602, "message": "TileMap not found" } }
    var cell = tilemap.get_cell(layer, Vector2i(x, y))
    return { "result": { "tile_id": cell, "position": { "x": x, "y": y } } }

func tilemap_clear(params: Dictionary) -> Dictionary:
    var node_path = params.get("node_path", "")
    var layer = params.get("layer", -1)
    var tilemap = _find_node_by_path(node_path)
    if tilemap == null:
        return { "error": { "code": -32602, "message": "TileMap not found" } }
    if layer < 0:
        tilemap.clear()
    else:
        tilemap.clear_layer(layer)
    return { "result": { "cleared": true } }

func tilemap_get_info(params: Dictionary) -> Dictionary:
    var node_path = params.get("node_path", "")
    var tilemap = _find_node_by_path(node_path)
    if tilemap == null:
        return { "error": { "code": -32602, "message": "TileMap not found" } }
    return { "result": {
        "layers": tilemap.get_layers_count(),
        "size": { "x": tilemap.get_size().x, "y": tilemap.get_size().y },
        "cell_size": { "x": tilemap.cell_size.x, "y": tilemap.cell_size.y }
    } }

func tilemap_get_used_cells(params: Dictionary) -> Dictionary:
    var node_path = params.get("node_path", "")
    var layer = params.get("layer", 0)
    var tilemap = _find_node_by_path(node_path)
    if tilemap == null:
        return { "error": { "code": -32602, "message": "TileMap not found" } }
    var cells = tilemap.get_used_cells(layer)
    var result = []
    for cell in cells:
        result.append({ "x": cell.x, "y": cell.y })
    return { "result": { "cells": result } }

func tilemap_fill_rect(params: Dictionary) -> Dictionary:
    var node_path = params.get("node_path", "")
    var layer = params.get("layer", 0)
    var x = params.get("x", 0)
    var y = params.get("y", 0)
    var width = params.get("width", 1)
    var height = params.get("height", 1)
    var tile_id = params.get("tile_id", 0)
    var tilemap = _find_node_by_path(node_path)
    if tilemap == null:
        return { "error": { "code": -32602, "message": "TileMap not found" } }
    for i in range(width):
        for j in range(height):
            tilemap.set_cell(layer, Vector2i(x + i, y + j), tile_id)
    return { "result": { "filled": true, "rect": { "x": x, "y": y, "w": width, "h": height } } }

func _find_node_by_path(path: String) -> Node:
    return get_tree().root.get_node_or_null(NodePath(path))
```

---

## Task 3: 创建 Godot theme_commands.gd（6工具）

**Files:**
- Create: `addons/godot_mcp/editors/theme_commands.gd`

- [ ] **Step 1: 创建 theme_commands.gd**

```gdscript
extends RefCounted

func create_theme(params: Dictionary) -> Dictionary:
    var theme = Theme.new()
    return { "result": { "created": true } }

func set_theme_color(params: Dictionary) -> Dictionary:
    var node_path = params.get("node_path", "")
    var color_section = params.get("section", "BasicColors")
    var color_name = params.get("name", "")
    var color_value = params.get("value", "#ffffff")
    var control = _find_node_by_path(node_path)
    if control == null:
        return { "error": { "code": -32602, "message": "Control node not found" } }
    var color = Color(color_value)
    control.add_theme_color_override(color_name, color)
    return { "result": { "set": true, "color": color_name } }

func set_theme_constant(params: Dictionary) -> Dictionary:
    var node_path = params.get("node_path", "")
    var constant_name = params.get("name", "")
    var value = params.get("value", 0)
    var control = _find_node_by_path(node_path)
    if control == null:
        return { "error": { "code": -32602, "message": "Control node not found" } }
    control.add_theme_constant_override(constant_name, value)
    return { "result": { "set": true, "constant": constant_name } }

func set_theme_font_size(params: Dictionary) -> Dictionary:
    var node_path = params.get("node_path", "")
    var font_name = params.get("name", "")
    var size = params.get("size", 16)
    var control = _find_node_by_path(node_path)
    if control == null:
        return { "error": { "code": -32602, "message": "Control node not found" } }
    control.add_theme_font_size_override(font_name, size)
    return { "result": { "set": true, "font_size": size } }

func set_theme_stylebox(params: Dictionary) -> Dictionary:
    var node_path = params.get("node_path", "")
    var stylebox_name = params.get("name", "")
    var stylebox_type = params.get("type", "normal")
    var color_value = params.get("color", "#808080")
    var control = _find_node_by_path(node_path)
    if control == null:
        return { "error": { "code": -32602, "message": "Control node not found" } }
    var style = StyleBoxFlat.new()
    style.bg_color = Color(color_value)
    control.add_theme_stylebox_override(stylebox_name, style)
    return { "result": { "set": true, "stylebox": stylebox_name } }

func get_theme_info(params: Dictionary) -> Dictionary:
    var node_path = params.get("node_path", "")
    var control = _find_node_by_path(node_path)
    if control == null:
        return { "error": { "code": -32602, "message": "Control node not found" } }
    var theme = control.theme
    if theme == null:
        return { "result": { "has_theme": false } }
    return { "result": { "has_theme": true, "types": theme.get_type_list() } }

func _find_node_by_path(path: String) -> Node:
    return get_tree().root.get_node_or_null(NodePath(path))
```

---

## Task 4: 更新 rpc_handler.gd 添加新路由

**Files:**
- Modify: `addons/godot_mcp/rpc_handler.gd`

- [ ] **Step 1: 添加动画、tilemap、theme 的 preload 和实例**

```gdscript
const AnimationCommandsClass = preload("res://addons/godot_mcp/editors/animation_commands.gd")
const TilemapCommandsClass = preload("res://addons/godot_mcp/editors/tilemap_commands.gd")
const ThemeCommandsClass = preload("res://addons/godot_mcp/editors/theme_commands.gd")

var animation_commands: AnimationCommandsClass
var tilemap_commands: TilemapCommandsClass
var theme_commands: ThemeCommandsClass

func _init():
    # ... existing instances ...
    animation_commands = AnimationCommandsClass.new()
    tilemap_commands = TilemapCommandsClass.new()
    theme_commands = ThemeCommandsClass.new()
```

- [ ] **Step 2: 在 match 语句中添加路由**

```gdscript
# Animation routes
"animation.list":
    return animation_commands.list_animations(params)
"animation.create":
    return animation_commands.create_animation(params)
"animation.add_track":
    return animation_commands.add_animation_track(params)
"animation.set_keyframe":
    return animation_commands.set_animation_keyframe(params)
"animation.get_info":
    return animation_commands.get_animation_info(params)
"animation.remove":
    return animation_commands.remove_animation(params)

# TileMap routes
"tilemap.set_cell":
    return tilemap_commands.tilemap_set_cell(params)
"tilemap.get_cell":
    return tilemap_commands.tilemap_get_cell(params)
"tilemap.clear":
    return tilemap_commands.tilemap_clear(params)
"tilemap.get_info":
    return tilemap_commands.tilemap_get_info(params)
"tilemap.get_used_cells":
    return tilemap_commands.tilemap_get_used_cells(params)
"tilemap.fill_rect":
    return tilemap_commands.tilemap_fill_rect(params)

# Theme routes
"theme.create":
    return theme_commands.create_theme(params)
"theme.set_color":
    return theme_commands.set_theme_color(params)
"theme.set_constant":
    return theme_commands.set_theme_constant(params)
"theme.set_font_size":
    return theme_commands.set_theme_font_size(params)
"theme.set_stylebox":
    return theme_commands.set_theme_stylebox(params)
"theme.get_info":
    return theme_commands.get_theme_info(params)
```

---

## Task 5: 创建 MCP server animation.ts

**Files:**
- Create: `server/src/tools/animation.ts`

- [ ] **Step 1: 创建 animation.ts**

```typescript
import type { GodotBridge } from '../godot-bridge.js';

export async function listAnimations(args: { node_path: string }, projectRoot: string, bridge: GodotBridge): Promise<any> {
  if (!bridge.isConnected) {
    return { animations: [], message: 'list_animations requires Godot editor' };
  }
  return await bridge.call('animation.list', { node_path: args.node_path });
}

export async function createAnimation(args: { node_path: string; name: string }, projectRoot: string, bridge: GodotBridge): Promise<any> {
  if (!bridge.isConnected) {
    return { created: false, message: 'create_animation requires Godot editor' };
  }
  return await bridge.call('animation.create', { node_path: args.node_path, name: args.name });
}

export async function addAnimationTrack(args: { node_path: string; animation: string; track_path: string }, projectRoot: string, bridge: GodotBridge): Promise<any> {
  if (!bridge.isConnected) {
    return { track_index: -1, message: 'add_animation_track requires Godot editor' };
  }
  return await bridge.call('animation.add_track', args);
}

export async function setAnimationKeyframe(args: { node_path: string; animation: string; track_index: number; time: number; value: string }, projectRoot: string, bridge: GodotBridge): Promise<any> {
  if (!bridge.isConnected) {
    return { set: false, message: 'set_animation_keyframe requires Godot editor' };
  }
  return await bridge.call('animation.set_keyframe', args);
}

export async function getAnimationInfo(args: { node_path: string; animation: string }, projectRoot: string, bridge: GodotBridge): Promise<any> {
  if (!bridge.isConnected) {
    return { error: true, message: 'get_animation_info requires Godot editor' };
  }
  return await bridge.call('animation.get_info', args);
}

export async function removeAnimation(args: { node_path: string; animation: string }, projectRoot: string, bridge: GodotBridge): Promise<any> {
  if (!bridge.isConnected) {
    return { removed: false, message: 'remove_animation requires Godot editor' };
  }
  return await bridge.call('animation.remove', args);
}
```

---

## Task 6: 创建 MCP server tilemap.ts

**Files:**
- Create: `server/src/tools/tilemap.ts`

- [ ] **Step 1: 创建 tilemap.ts**

```typescript
import type { GodotBridge } from '../godot-bridge.js';

export async function tilemapSetCell(args: { node_path: string; layer?: number; x: number; y: number; tile_id: number }, projectRoot: string, bridge: GodotBridge): Promise<any> {
  if (!bridge.isConnected) {
    return { set: false, message: 'tilemap_set_cell requires Godot editor' };
  }
  return await bridge.call('tilemap.set_cell', args);
}

export async function tilemapGetCell(args: { node_path: string; layer?: number; x: number; y: number }, projectRoot: string, bridge: GodotBridge): Promise<any> {
  if (!bridge.isConnected) {
    return { tile_id: -1, message: 'tilemap_get_cell requires Godot editor' };
  }
  return await bridge.call('tilemap.get_cell', args);
}

export async function tilemapClear(args: { node_path: string; layer?: number }, projectRoot: string, bridge: GodotBridge): Promise<any> {
  if (!bridge.isConnected) {
    return { cleared: false, message: 'tilemap_clear requires Godot editor' };
  }
  return await bridge.call('tilemap.clear', args);
}

export async function tilemapGetInfo(args: { node_path: string }, projectRoot: string, bridge: GodotBridge): Promise<any> {
  if (!bridge.isConnected) {
    return { error: true, message: 'tilemap_get_info requires Godot editor' };
  }
  return await bridge.call('tilemap.get_info', args);
}

export async function tilemapGetUsedCells(args: { node_path: string; layer?: number }, projectRoot: string, bridge: GodotBridge): Promise<any> {
  if (!bridge.isConnected) {
    return { cells: [], message: 'tilemap_get_used_cells requires Godot editor' };
  }
  return await bridge.call('tilemap.get_used_cells', args);
}

export async function tilemapFillRect(args: { node_path: string; layer?: number; x: number; y: number; width: number; height: number; tile_id: number }, projectRoot: string, bridge: GodotBridge): Promise<any> {
  if (!bridge.isConnected) {
    return { filled: false, message: 'tilemap_fill_rect requires Godot editor' };
  }
  return await bridge.call('tilemap.fill_rect', args);
}
```

---

## Task 7: 创建 MCP server theme.ts

**Files:**
- Create: `server/src/tools/theme.ts`

- [ ] **Step 1: 创建 theme.ts**

```typescript
import type { GodotBridge } from '../godot-bridge.js';

export async function createTheme(args: Record<string, unknown>, projectRoot: string, bridge: GodotBridge): Promise<any> {
  if (!bridge.isConnected) {
    return { created: false, message: 'create_theme requires Godot editor' };
  }
  return await bridge.call('theme.create', args);
}

export async function setThemeColor(args: { node_path: string; section?: string; name: string; value: string }, projectRoot: string, bridge: GodotBridge): Promise<any> {
  if (!bridge.isConnected) {
    return { set: false, message: 'set_theme_color requires Godot editor' };
  }
  return await bridge.call('theme.set_color', args);
}

export async function setThemeConstant(args: { node_path: string; name: string; value: number }, projectRoot: string, bridge: GodotBridge): Promise<any> {
  if (!bridge.isConnected) {
    return { set: false, message: 'set_theme_constant requires Godot editor' };
  }
  return await bridge.call('theme.set_constant', args);
}

export async function setThemeFontSize(args: { node_path: string; name: string; size: number }, projectRoot: string, bridge: GodotBridge): Promise<any> {
  if (!bridge.isConnected) {
    return { set: false, message: 'set_theme_font_size requires Godot editor' };
  }
  return await bridge.call('theme.set_font_size', args);
}

export async function setThemeStylebox(args: { node_path: string; name: string; type?: string; color?: string }, projectRoot: string, bridge: GodotBridge): Promise<any> {
  if (!bridge.isConnected) {
    return { set: false, message: 'set_theme_stylebox requires Godot editor' };
  }
  return await bridge.call('theme.set_stylebox', args);
}

export async function getThemeInfo(args: { node_path: string }, projectRoot: string, bridge: GodotBridge): Promise<any> {
  if (!bridge.isConnected) {
    return { error: true, message: 'get_theme_info requires Godot editor' };
  }
  return await bridge.call('theme.get_info', args);
}
```

---

## Task 8: 更新 tools/index.ts 注册新工具

**Files:**
- Modify: `server/src/tools/index.ts`

- [ ] **Step 1: 导入新工具函数**

```typescript
import { listAnimations, createAnimation, addAnimationTrack, setAnimationKeyframe, getAnimationInfo, removeAnimation } from './animation.js';
import { tilemapSetCell, tilemapGetCell, tilemapClear, tilemapGetInfo, tilemapGetUsedCells, tilemapFillRect } from './tilemap.js';
import { createTheme, setThemeColor, setThemeConstant, setThemeFontSize, setThemeStylebox, getThemeInfo } from './theme.js';
```

- [ ] **Step 2: 在 buildToolRegistry 中注册 18 个新工具**

---

## Task 9: 本地测试验证

**Files:**
- Test: Godot 项目 `C:\code\mcp-test`

- [ ] **Step 1: 复制插件到测试项目**

- [ ] **Step 2: 验证工具数量**

调用 `tools/list` 确认返回 87 个工具（原有 69 + 新增 18）

---

## 进度检查清单

- [ ] Task 1: animation_commands.gd 创建完成（6个工具）
- [ ] Task 2: tilemap_commands.gd 创建完成（6个工具）
- [ ] Task 3: theme_commands.gd 创建完成（6个工具）
- [ ] Task 4: rpc_handler.gd 路由更新完成
- [ ] Task 5: animation.ts 创建完成（6个工具）
- [ ] Task 6: tilemap.ts 创建完成（6个工具）
- [ ] Task 7: theme.ts 创建完成（6个工具）
- [ ] Task 8: index.ts 注册完成（18个工具）
- [ ] Task 9: 本地测试通过

---

最后更新: 2026-05-22