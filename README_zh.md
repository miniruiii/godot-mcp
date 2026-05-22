# Godot MCP

开源的 Model Context Protocol (MCP) 实现，让 AI 助手（Claude、Cursor、VS Code Copilot 等）能够深度理解和操作 Godot 4.6.2+ 项目。

## 功能特性

- **双模式运行**：离线时通过文件系统操作，Godot 编辑器启动后解锁实时通信
- **50 个内置工具**：覆盖项目探索、场景编辑、脚本管理、节点操作、运行时内省、输入模拟、项目运行
- **三种运行模式**：Full / Lite / Minimal，适配不同 AI 客户端的上下文限制
- **安全可靠**：路径限制防止目录遍历攻击；WebSocket 仅绑定本地
- **UndoRedo 支持**：所有编辑器修改通过 Godot 内置撤销系统

## 快速开始

### 安装 MCP 服务器

```bash
npm install -g godot-mcp
```

或直接运行：

```bash
npx godot-mcp
```

### 安装 Godot 编辑器插件

1. 将 `addons/godot_mcp/` 复制到你的 Godot 项目中的 `addons/` 目录
2. 打开 **项目设置 > 插件**
3. 启用 "Godot MCP"

### 配置 AI 客户端

#### Claude Desktop

编辑 `claude_desktop_config.json`：

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

## CLI 参数

```bash
godot-mcp [选项]

选项：
  --mode <full|lite|minimal>  运行模式（默认：full）
  --port <端口号>              WebSocket 端口（默认：6505）
  --log-level <级别>           日志级别：debug, info, warn, error（默认：info）
  --help, -h                   显示帮助
```

### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `GODOT_MCP_MODE` | 运行模式 | `full` |
| `GODOT_MCP_PORT` | WebSocket 端口 | `6505` |
| `GODOT_MCP_PROJECT_PATH` | Godot 项目路径 | `./` |
| `GODOT_MCP_LOG_LEVEL` | 日志级别 | `info` |

## 工具参考

### 项目工具（所有模式）
- `list_project_files` — 列出项目文件
- `read_project_settings` — 读取 project.godot 配置
- `get_project_info` — 获取引擎版本和渲染后端

### 场景工具（所有模式）
- `read_scene` — 解析 .tscn 为节点树
- `create_scene` — 创建新场景

### 场景工具（在线）
- `save_scene` — 保存场景
- `open_scene` — 打开场景
- `add_node` — 添加节点
- `remove_node` — 删除节点
- `update_property` — 修改节点属性

### 节点工具（所有模式）
- `get_scene_tree` — 获取完整节点树
- `get_node` — 获取单个节点详情

### 节点编辑工具（在线）
- `duplicate_node` — 复制节点
- `move_node` — 移动节点到新父节点
- `connect_signal` — 连接信号到方法
- `disconnect_signal` — 断开信号连接
- `get_node_groups` — 获取节点所属分组
- `set_node_groups` — 添加/移除节点分组
- `find_nodes_in_group` — 查找分组中的所有节点
- `rename_node` — 重命名节点

### 脚本工具（所有模式）
- `create_script` — 创建脚本
- `read_script` — 读取脚本
- `edit_script` — 编辑脚本（全量替换或行范围）

### 编辑器工具（在线）
- `run_project` — 运行项目
- `get_output_log` — 获取输出日志

### 文件工具（所有模式）
- `read_file` — 读取文件
- `write_file` — 写入文件

### 运行时工具（在线）
- `get_game_scene_tree` — 获取运行中游戏的场景树（支持 `max_depth` 限制返回深度，避免数据过大）
- `get_game_node_properties` — 获取游戏节点所有属性
- `set_game_node_property` — 设置游戏节点属性
- `execute_game_script` — 在运行游戏中执行 GDScript（实例化脚本，如存在 `_ready()` 则调用）
- `find_nodes_by_script` — 按脚本查找节点
- `get_autoload` — 获取自动加载单例
- `batch_get_properties` — 批量获取多个节点属性
- `find_ui_elements` — 按类型或文本查找 UI 元素
- `click_button_by_text` — 点击指定文本的按钮
- `wait_for_node` — 等待节点出现
- `find_nearby_nodes` — 查找附近节点（需要 2D/3D 位置节点）
- `navigate_to` — 设置 NavigationAgent 导航目标
- `get_game_node_property` — 获取单个属性值
- `capture_frames` — 捕获视口帧（需要游戏视口处于活动状态）
- `monitor_properties` — 监控属性变化
- `start_recording` — 开始录制输入
- `stop_recording` — 停止录制并获取数据
- `replay_recording` — 回放录制的输入

### 输入模拟工具（在线）
- `simulate_key` — 模拟键盘按键
- `simulate_mouse_click` — 模拟鼠标点击
- `simulate_mouse_move` — 模拟鼠标移动
- `simulate_action` — 模拟输入动作
- `simulate_sequence` — 模拟输入序列
- `get_input_actions` — 获取所有输入动作
- `set_input_action` — 添加/修改输入动作

## 测试结果

| 类别 | 通过 | 说明 |
|------|------|------|
| Project (5) | 5/5 | 全部通过 |
| Scene (8) | 8/8 | 全部通过 |
| Script (3) | 3/3 | 全部通过 |
| Node (8) | 8/8 | 全部通过 |
| Input (7) | 7/7 | 全部通过 |
| Runtime (19) | 17/19 | `capture_frames` 需要活动视口；`find_nearby_nodes`/`navigate_to` 需要特定节点类型 |
| **总计** | **48/50** | **通过率 96%** |

## 架构

```
AI 客户端 <-- MCP/stdio --> TypeScript 服务器 <-- WebSocket/JSON-RPC --> Godot 插件
                                      |
                                      v
                                 文件系统
```

## 开发

```bash
npm install
npm run build    # 编译 TypeScript
npm test         # 运行测试
```

## 协议

MIT