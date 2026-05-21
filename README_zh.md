# Godot MCP

开源的 Model Context Protocol (MCP) 实现，让 AI 助手（Claude、Cursor、VS Code Copilot 等）能够深度理解和操作 Godot 4.6.2+ 项目。

## 功能特性

- **双模式运行**：离线时通过文件系统操作，Godot 编辑器启动后解锁实时通信
- **19 个内置工具**：覆盖项目探索、场景编辑、脚本管理、节点操作、项目运行
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
- `get_project_info` — 获取引擎版本

### 场景工具（所有模式）
- `read_scene` — 解析 .tscn 为节点树
- `create_scene` — 创建新场景

### 场景工具（在线）
- `save_scene` — 保存场景
- `open_scene` — 打开场景
- `add_node` — 添加节点
- `remove_node` — 删除节点
- `update_property` — 修改属性

### 节点工具（所有模式）
- `get_scene_tree` — 获取节点树
- `get_node` — 获取节点详情

### 脚本工具（所有模式）
- `create_script` — 创建脚本
- `read_script` — 读取脚本
- `edit_script` — 编辑脚本

### 编辑器工具（在线）
- `run_project` — 运行项目
- `get_output_log` — 获取输出日志

### 文件工具（所有模式）
- `read_file` — 读取文件
- `write_file` — 写入文件

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