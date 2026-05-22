# Godot MCP

[🇺🇸 English](README_en.md) · [🇨🇳 简体中文](README_zh.md)

---

## 🌐 Language / 语言

| Language | Readme |
|----------|--------|
| 🇺🇸 English | [README_en.md](README_en.md) |
| 🇨🇳 简体中文 | [README_zh.md](README_zh.md) |

---

## 🇺🇸 Quick Overview

A fully open-source MCP implementation for Godot 4.6.2+. Connect AI assistants to your Godot projects.

**Features:** 50 tools · Dual-mode (offline/online) · Full/Lite/Minimal modes · UndoRedo support

```bash
# Install
npm install -g godot-mcp

# Run
npx godot-mcp
```

**Tools:** `list_project_files` · `read_scene` · `create_script` · `edit_script` · `get_node` · `run_project` · and 44 more.

**License:** MIT

---

## 🇨🇳 快速概览

开源的 Godot 4.6.2+ MCP 实现。连接 AI 助手到你的 Godot 项目。

**功能：** 50 个工具 · 双模式（离线/在线）· 三种运行模式 · UndoRedo 支持

```bash
# 安装
npm install -g godot-mcp

# 运行
npx godot-mcp
```

**工具：** `list_project_files` · `read_scene` · `create_script` · `edit_script` · `get_node` · `run_project` · 等共 50 个。

**协议：** MIT

---

## 🛠️ Tools Reference / 工具参考

### Project / 项目
`list_project_files` · `read_project_settings` · `get_project_info`

### Scene / 场景
`read_scene` · `create_scene` · `save_scene` · `open_scene` · `add_node` · `remove_node` · `update_property`

### Node / 节点
`get_scene_tree` · `get_node` · `duplicate_node` · `move_node` · `connect_signal` · `disconnect_signal` · `get_node_groups` · `set_node_groups` · `find_nodes_in_group` · `rename_node`

### Script / 脚本
`create_script` · `read_script` · `edit_script`

### Editor / 编辑器
`run_project` · `get_output_log`

### File / 文件
`read_file` · `write_file`

### Runtime / 运行时
`get_game_scene_tree` · `get_game_node_properties` · `set_game_node_property` · `execute_game_script` · `find_nodes_by_script` · `get_autoload` · `batch_get_properties` · `find_ui_elements` · `click_button_by_text` · `wait_for_node` · `find_nearby_nodes` · `navigate_to` · `get_game_node_property` · `capture_frames` · `monitor_properties` · `start_recording` · `stop_recording` · `replay_recording`

### Input / 输入
`simulate_key` · `simulate_mouse_click` · `simulate_mouse_move` · `simulate_action` · `simulate_sequence` · `get_input_actions` · `set_input_action`