# Godot MCP — 开源设计文档

## 概述

Godot MCP 是一个完全开源的 Model Context Protocol 实现，让 AI 助手（Claude、Cursor、VS Code Copilot 等）能够深度理解和操作 Godot 4.6.2+ 项目。它提供双模式运行能力：离线时通过文件系统操作项目资源，Godot 编辑器启动后解锁实时编辑器通信。

本项目定位为现有闭源商业方案的完全开源替代，代码、文档、构建流程全部公开。

## 目标

- 让 AI 助手能够读取、理解、修改 Godot 项目文件（`.tscn`、`.gd`、`.cs`、`.tres` 等）
- 让 AI 助手能够与运行中的 Godot 编辑器实时交互（操作场景树、修改属性、运行项目等）
- 保持架构简单清晰，便于社区贡献和二次开发
- 第一版聚焦核心功能，后续迭代扩展

## 非目标

- 不支持 Godot 3.x 或 4.6.2 以下版本
- 第一版不覆盖 3D 工具、Animation、Shader、Navigation 等高级功能
- 不替代 Godot 的内置脚本编辑器或调试器

## 架构

```
┌─────────────┐     MCP/stdio     ┌─────────────────────┐     WebSocket      ┌─────────────────────┐
│  Claude/    │ ◄──────────────► │  TypeScript Server  │ ◄────────────────► │ Godot Editor Plugin │
│  Cursor/    │                   │                     │   (port 6505)      │    (GDScript)       │
│  VS Code    │                   │  • Tool Registry    │                    │                     │
└─────────────┘                   │  • File Operations  │                    │  • Editor API Wrap  │
                                  │  • WS Client        │                    │  • JSON-RPC Handler │
                                  │  • Config/CLI       │                    │  • UndoRedo Support │
                                  └──────────┬──────────┘                    └─────────────────────┘
                                             │
                                             ▼
                                    ┌─────────────────┐
                                    │   File System   │
                                    │  (.tscn, .gd)   │
                                    └─────────────────┘
```

**核心设计原则**：
- **双模式运行**：离线时仅用文件系统工具，Godot 启动后解锁全部编辑器工具
- **模式分级**：支持 Full / Lite / Minimal 模式，适配不同客户端的上下文限制
- **单仓库**：TypeScript 服务器 + Godot 插件放在同一个 Git 仓库，版本同步管理
- **透明降级**：在线/离线切换对 AI 透明，服务器内部自动路由

## 组件详细设计

### 组件 A：TypeScript MCP 服务器 (`server/`)

**技术栈**：TypeScript + `@modelcontextprotocol/sdk` + `ws`

| 模块 | 文件 | 职责 |
|------|------|------|
| 协议入口 | `src/server.ts` | MCP stdio 传输初始化，工具注册，请求路由 |
| 工具集 | `src/tools/` | 按类别组织的工具实现，每类别一个子目录 |
| 编辑器桥接 | `src/godot-bridge.ts` | WebSocket 客户端，连接管理，心跳，自动重连 |
| 文件解析 | `src/file-parser.ts` | 解析 `.tscn`、`.gd`、`.tres` 为结构化数据 |
| 配置 | `src/config.ts` | 加载 `settings.json`，支持环境变量覆盖 |
| CLI | `src/cli.ts` | 命令行参数解析（模式选择、端口指定、日志级别）|

**工具分类（第一版）**：

| 类别 | 工具 | 模式 |
|------|------|------|
| `project` | `list_project_files`, `read_project_settings`, `get_project_info` | Full/Lite/Min |
| `scene` | `read_scene`, `create_scene`, `save_scene`, `open_scene` | Full/Lite/Min |
| `node` | `get_scene_tree`, `add_node`, `remove_node`, `update_property`, `get_node` | Full/Lite |
| `script` | `create_script`, `read_script`, `edit_script` | Full/Lite/Min |
| `editor` | `run_project`, `get_output_log` | Full/Lite |
| `file` | `read_file`, `write_file` | Full/Lite/Min |

### 组件 B：Godot 编辑器插件 (`addons/godot_mcp/`)

**技术栈**：纯 GDScript，兼容 Godot 4.6.2+

| 文件 | 职责 |
|------|------|
| `plugin.gd` | 插件入口，生命周期管理（启用/禁用），配置面板 |
| `websocket_server.gd` | WebSocket 服务器，端口监听，连接管理 |
| `rpc_handler.gd` | JSON-RPC 请求路由，分发到对应编辑器模块 |
| `editors/scene_editor.gd` | 场景树操作（获取、修改、添加、删除节点）|
| `editors/script_editor.gd` | 脚本编辑器交互（打开、获取内容、执行代码）|
| `editors/project_editor.gd` | 项目设置、运行控制、输出日志获取 |
| `utils.gd` | 类型转换（Vector2/Color/NodePath 字符串解析）、路径处理、版本检查 |

**关键实现细节**：
- **UndoRedo**：所有修改性操作必须通过 Godot 的 `UndoRedo` 系统，支持 Ctrl+Z
- **类型自动解析**：`"Vector2(100, 200)"`、`"#ff0000"`、`"@NodePath(^\"../Player\")"` 自动转换为 Godot 类型
- **心跳保活**：10 秒一次 ping/pong，超时 30 秒视为断开
- **自动重连**：服务器端指数退避重连（1s → 2s → 4s → ... → 60s max）

### 组件 C：配置与分发

**配置文件 `settings.json`**：
```json
{
  "port": 6505,
  "mode": "full",
  "project_path": "./",
  "log_level": "info"
}
```

**分发方式**：
- **npm 包**：`npm install -g godot-mcp`，通过 npx 运行
- **预编译二进制**（可选）：使用 `pkg` 打包为单文件可执行文件，无需 Node.js 环境
- **Godot Asset Library**：插件通过官方资源库分发，或手动复制 `addons/godot_mcp/`

## 通信协议

### MCP 层（AI ↔ TypeScript 服务器）

- 传输：`stdio`
- 协议：Model Context Protocol
- 工具发现：运行时动态注册，支持 `list_changed` 通知

### 内部层（TypeScript 服务器 ↔ Godot 插件）

- 传输：WebSocket
- 端口：6505（可配置），自动探测 6505-6509 避免冲突
- 协议：JSON-RPC 2.0

**请求格式**：
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "scene.get_tree",
  "params": { "scene_path": "res://main.tscn" }
}
```

**响应格式**：
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "nodes": [
      { "name": "Player", "type": "CharacterBody2D", "path": "/root/Main/Player" }
    ]
  }
}
```

**错误格式**：
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32600,
    "message": "Node not found: /root/Main/Enemy",
    "data": { "suggestion": "Available nodes: Player, Camera2D" }
  }
}
```

## 数据流

### 场景 A：在线模式 — 修改节点属性

1. AI 调用 MCP tool `update_node_property`
2. TypeScript 服务器检查 WebSocket 连接状态
   - 已连接：构造 JSON-RPC 请求，通过 WebSocket 发送到 Godot 插件
   - 未连接：返回错误，提示启动 Godot 并启用插件
3. Godot 插件接收请求，`rpc_handler.gd` 路由到 `scene_editor.gd`
4. `scene_editor.gd` 通过 `EditorInterface` 和 `UndoRedo` 修改节点属性
5. Godot 插件返回操作结果
6. TypeScript 服务器将结果返回给 AI

### 场景 B：离线模式 — 读取场景文件

1. AI 调用 MCP tool `read_scene`
2. TypeScript 服务器检查 Godot 连接状态
   - 未连接：直接读取 `.tscn` 文件，`file-parser.ts` 解析为结构化数据
   - 已连接：优先通过 Godot 获取（更准确的运行时状态）
3. 返回节点树结构

### 场景 C：运行项目

1. AI 调用 MCP tool `run_project`
2. 此工具**必须**在线，直接通过 WebSocket 发送 JSON-RPC 请求
3. Godot 插件调用 `EditorInterface.play_main_scene()`
4. 返回运行状态

## 错误处理与降级策略

| 场景 | 处理策略 |
|------|----------|
| Godot 未运行 | 在线工具返回明确错误；离线工具继续工作 |
| WebSocket 断开 | 自动重连（指数退避）；文件系统工具不受影响 |
| 端口冲突 | 自动探测 6505-6509，使用第一个可用端口 |
| 插件版本不匹配 | 握手时交换版本号，不兼容时返回警告并拒绝连接 |
| 编辑器操作失败 | 通过 JSON-RPC error 返回具体错误；UndoRedo 回滚 |
| 文件解析失败 | 返回原始文本 + 错误位置，AI 不会丢失上下文 |
| Godot 响应超时 | 30 秒超时，返回 timeout 错误 |

## 安全考虑

- **路径限制**：文件操作仅限于项目目录内，禁止访问 `../` 或绝对路径超出项目根目录
- **脚本执行**：`edit_script` 仅修改文件内容，不执行任意代码；Godot 插件端不暴露 `OS.execute` 等危险 API
- **WebSocket 绑定**：默认绑定 `127.0.0.1`，拒绝外部连接
- **配置验证**：`settings.json` 中的路径和端口经过校验，防止恶意配置

## MVP 功能清单（第一版）

| 类别 | 工具 | 描述 | 模式 |
|------|------|------|------|
| `project` | `list_project_files` | 列出项目文件树 | All |
| `project` | `read_project_settings` | 读取 project.godot 关键配置 | All |
| `project` | `get_project_info` | 获取引擎版本、渲染器等 | All |
| `scene` | `read_scene` | 读取 .tscn 为结构化节点树 | All |
| `scene` | `create_scene` | 创建新场景文件 | All |
| `scene` | `save_scene` | 保存当前场景 | Full/Lite |
| `scene` | `open_scene` | 在编辑器中打开场景 | Full/Lite |
| `node` | `get_scene_tree` | 获取当前场景的完整节点树 | All |
| `node` | `add_node` | 在指定路径添加节点 | Full/Lite |
| `node` | `remove_node` | 删除指定节点 | Full/Lite |
| `node` | `update_property` | 修改节点属性 | Full/Lite |
| `node` | `get_node` | 获取单个节点的详细信息 | All |
| `script` | `create_script` | 创建新的 .gd 文件 | All |
| `script` | `read_script` | 读取脚本内容 | All |
| `script` | `edit_script` | 修改脚本内容（基于行号或全文替换）| All |
| `editor` | `run_project` | 运行项目（Play 按钮）| Full/Lite |
| `editor` | `get_output_log` | 获取编辑器输出日志 | Full/Lite |
| `file` | `read_file` | 读取任意项目文件 | All |
| `file` | `write_file` | 写入任意项目文件 | All |

**约 19 个工具**，覆盖 AI 辅助 Godot 开发的核心场景。

## 测试策略

| 层级 | 框架 | 覆盖范围 |
|------|------|----------|
| 单元测试 | Vitest | TypeScript 工具函数、文件解析器、配置加载 |
| 插件单元测试 | GUT (Godot Unit Test) | GDScript 工具函数、类型转换、JSON-RPC 处理 |
| 集成测试 | Vitest + headless Godot | 端到端工具调用（启动 Godot，执行工具，验证结果）|
| CI | GitHub Actions | 矩阵：Node 20/22 × Godot 4.6.2 |

## 开发阶段

| 阶段 | 内容 | 预计时间 |
|------|------|----------|
| Phase 1 | 项目脚手架、TypeScript MCP 服务器框架、Godot 插件骨架 | 1 天 |
| Phase 2 | 文件系统工具（project, scene, script, file 离线模式）| 1 天 |
| Phase 3 | WebSocket 通信、Godot 插件编辑器工具 | 1 天 |
| Phase 4 | 集成测试、文档、npm 打包 | 1 天 |

## 仓库结构

```
godot-mcp/
├── README.md
├── LICENSE
├── package.json
├── tsconfig.json
├── server/
│   ├── src/
│   │   ├── server.ts
│   │   ├── cli.ts
│   │   ├── config.ts
│   │   ├── godot-bridge.ts
│   │   ├── file-parser.ts
│   │   └── tools/
│   │       ├── project.ts
│   │       ├── scene.ts
│   │       ├── node.ts
│   │       ├── script.ts
│   │       ├── editor.ts
│   │       └── file.ts
│   ├── tests/
│   └── package.json
├── addons/
│   └── godot_mcp/
│       ├── plugin.cfg
│       ├── plugin.gd
│       ├── websocket_server.gd
│       ├── rpc_handler.gd
│       ├── editors/
│       │   ├── scene_editor.gd
│       │   ├── script_editor.gd
│       │   └── project_editor.gd
│       └── utils.gd
├── docs/
│   └── USAGE.md
└── settings.json
```

## 参考与对比

| 项目 | 许可 | 服务器技术 | 开源程度 |
|------|------|-----------|----------|
| godot-mcp-pro | 专有 | Node.js（闭源）| 插件开源，服务器闭源付费 |
| **godot-mcp（本项目）** | MIT | TypeScript | **完全开源** |

## 附录：Godot 版本说明

- **最低版本**：Godot 4.6.2
- **测试版本**：Godot 4.6.2、4.6.3（发布时）
- **不兼容版本**：Godot 3.x、4.0-4.6.1（编辑器 API 差异较大）
