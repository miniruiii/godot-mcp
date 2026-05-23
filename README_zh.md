# Godot MCP

[![npm version](https://img.shields.io/npm/v/godot-mcp)](https://www.npmjs.com/package/godot-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Godot 4.6](https://img.shields.io/badge/Godot-4.6.2+-478CBF)](https://godotengine.org)

> 通过 [Model Context Protocol](https://modelcontextprotocol.io/) 将 AI 助手连接到 Godot 4.6.2+ 项目。

Godot MCP 是一个完全开源的 MCP 服务器和编辑器插件，为 AI 客户端（Claude、Cursor、VS Code Copilot 等）与 Godot 项目之间搭建桥梁。提供 **52 个工具**，涵盖 8 大类别，支持**离线**（文件系统）和**在线**（Godot 编辑器实时通信）双模式运行。

[English](README.md)

---

## 功能特性

- **双模式运行**
  - **离线模式**：仅通过文件系统操作 —— 解析场景、读取脚本、列出文件。
  - **在线模式**：通过 WebSocket 与 Godot 编辑器深度集成 —— 编辑场景、运行项目、检查运行时状态。

- **52 个内置工具**
  - **Project（项目）**：文件列表、设置读取、元数据
  - **Scene（场景）**：读取/解析 `.tscn`、创建、保存、打开场景
  - **Node（节点）**：节点树查看、增删改查、复制/移动/重命名、信号连接、分组管理
  - **Script（脚本）**：创建、读取、编辑 GDScript/C# 文件
  - **Editor（编辑器）**：运行项目、获取输出日志
  - **File（文件）**：读写任意项目文件
  - **Game（运行时）**：场景树内省、属性操作、脚本执行、UI 交互、帧捕获、输入录制/回放
  - **Input（输入）**：键盘/鼠标/动作模拟

- **CLI + MCP 双入口**
  - 作为传统 **MCP 服务器**与 AI 客户端配合使用
  - 或作为独立 **CLI 工具**用于脚本和自动化

- **安全可撤销**
  - 路径遍历保护
  - WebSocket 仅绑定本地地址
  - 所有编辑器修改均通过 Godot 原生撤销系统执行

---

## 快速开始

### 1. 安装 MCP 服务器

```bash
npm install -g godot-mcp
```

或直接运行：

```bash
npx godot-mcp
```

### 2. 安装 Godot 编辑器插件

1. 将 `addons/godot_mcp/` 文件夹复制到你的 Godot 项目的 `addons/` 目录中。
2. 打开 **项目 > 项目设置 > 插件**。
3. 启用 **"Godot MCP"**。

插件会在端口 `6505`（可配置）启动 WebSocket 服务器。

### 3. 配置 AI 客户端

#### Claude Desktop

编辑 `~/Library/Application Support/Claude/claude_desktop_config.json`（macOS）或 `%APPDATA%\Claude\claude_desktop_config.json`（Windows）：

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

#### Cursor / VS Code Copilot

添加到 MCP 设置：

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

---

## CLI 使用

Godot MCP 也可以作为独立 CLI 工具使用，适用于脚本编写和 CI/CD。

```bash
# 显示所有可用命令
godot-mcp

# Project 命令（离线）
godot-mcp project list-files --extension .gd
godot-mcp project settings
godot-mcp project info

# Scene 命令（离线）
godot-mcp scene read --scene-path res://main.tscn
godot-mcp scene create --scene-path res://new.tscn --root-type Node2D --root-name Root

# Node 命令（需要 Godot 编辑器）
godot-mcp node tree --scene-path res://main.tscn
godot-mcp node add --scene-path res://main.tscn --parent-path /root/Main --node-type Sprite2D --node-name Player

# Game 命令（需要运行中的游戏）
godot-mcp game tree --max-depth 3
godot-mcp game execute --code "1 + 1"
godot-mcp game execute --code $'extends Node2D\nfunc _ready():\n    print(\"Hello\")'
godot-mcp game capture

# 输入模拟
godot-mcp input key --keycode 65 --pressed true
godot-mcp input mouse-click --button-index 1 --position-x 100 --position-y 200
```

在任何层级使用 `--help` 查看详情：

```bash
godot-mcp project --help
godot-mcp game execute --help
```

---

## 配置

在工作目录创建 `settings.json`：

```json
{
  "port": 6505,
  "mode": "full",
  "project_path": "./",
  "log_level": "info"
}
```

或使用环境变量：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `GODOT_MCP_PORT` | WebSocket 端口 | `6505` |
| `GODOT_MCP_MODE` | 工具集：`full` / `lite` / `minimal` | `full` |
| `GODOT_MCP_PROJECT_PATH` | Godot 项目路径 | `./` |
| `GODOT_MCP_LOG_LEVEL` | 日志级别 | `info` |

### 运行模式

| 模式 | 工具数量 | 适用场景 |
|------|---------|---------|
| `full` | 全部 52 个 | 大上下文窗口的 AI 客户端 |
| `lite` | 35 个 | 平衡上下文占用 |
| `minimal` | 12 个 | 上下文受限的场景 |

---

## 架构

```
┌─────────────┐      stdio/MCP      ┌──────────────────┐      WebSocket/JSON-RPC      ┌─────────────┐
│  AI 客户端   │ ◄──────────────────► │  TypeScript 服务器  │ ◄────────────────────────► │ Godot 插件   │
│(Claude 等)  │                      │   (godot-mcp)      │                            │  (GDScript)  │
└─────────────┘                      └──────────────────┘                            └─────────────┘
                                              │
                                              ▼
                                       ┌─────────────┐
                                       │  文件系统    │
                                       │(.tscn, .gd) │
                                       └─────────────┘
```

- **TypeScript 服务器**：MCP 协议处理器、CLI 入口、文件解析器、WebSocket 客户端。
- **Godot 插件**：WebSocket 服务器、RPC 路由器、编辑器命令执行器、运行时检查器。

---

## 开发

```bash
# 安装依赖
npm install

# 编译 TypeScript
npm run build

# 运行测试
npm test

# 监听模式
npm run dev
```

### 项目结构

```
godot-mcp/
├── addons/godot_mcp/          # Godot 编辑器插件（GDScript）
│   ├── plugin.gd              # 插件入口
│   ├── rpc_handler.gd         # JSON-RPC 请求路由器
│   ├── websocket_server.gd    # WebSocket 连接管理
│   └── editors/               # 工具实现
│       ├── scene_editor.gd
│       ├── script_editor.gd
│       ├── runtime_commands.gd
│       └── input_commands.gd
├── server/src/                # TypeScript MCP 服务器
│   ├── cli.ts / tool-cli.ts   # CLI 入口
│   ├── server.ts              # MCP 服务器入口
│   ├── godot-bridge.ts        # WebSocket 客户端
│   └── tools/                 # 工具处理器
│       ├── project.ts
│       ├── scene.ts
│       ├── node.ts
│       ├── runtime.ts
│       └── ...
├── dist/                      # 编译后的 JavaScript
├── settings.json              # 服务器配置
└── package.json
```

---

## 贡献

欢迎提交 Issue 和 Pull Request！

## 协议

MIT
