# MCP 全链路统一日志设计

> **目标：** 所有 MCP 工具请求（在线 + 离线）的详细执行日志集中输出到 Godot 编辑器输出面板。

---

## 背景

当前日志现状：
- `rpc_handler.gd` 仅打印路由层摘要 `[MCP] → method` / `[MCP] ← OK method`
- Godot 端在线工具内部无详细执行日志
- TS 端离线工具（`read_scene`, `create_script` 等）的日志仅在 TS console 中，Godot 面板不可见
- 用户无法通过 `get_output_log` 获取完整的 MCP 活动轨迹

---

## 设计原则

1. **统一出口**：所有日志最终都出现在 Godot 输出面板
2. **完整参数**：记录工具名 + 完整请求参数 + 响应摘要
3. **可配置**：通过 `debug_mode` 开关控制日志输出，支持未来扩展多级别
4. **不丢离线**：离线工具的日志通过 WebSocket 补发到 Godot

---

## 架构变更

### 1. Godot 端 — 新增 `log.print` 路由

**文件：** `rpc_handler.gd`

新增路由：
```gdscript
"log.print":
    return project_editor_inst.print_log(params)
```

**文件：** `project_editor.gd`

新增属性与方法：
```gdscript
var debug_mode: bool = true
var max_log_param_length: int = 0  # 0 = 不截断

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

### 2. Godot 端 — 在线工具内部加详细日志

**文件：** `scene_editor.gd`, `script_editor.gd`, `project_editor.gd`, `runtime_commands.gd`, `input_commands.gd`

在每个公开函数的入口和出口处加日志：

```gdscript
# 入口日志
print("[MCP] add_node: parent_path=%s node_type=%s node_name=%s" % [parent_path, node_type, node_name])

# ... 执行逻辑 ...

# 出口日志
print("[MCP] add_node → added=true node_path=%s" % (parent_path + "/" + node_name))
```

### 3. TS 端 — 统一日志封装

**文件：** 新建 `server/src/tools/log.ts`

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
      // 忽略日志发送失败
    }
  }
}

export function formatArgs(args: Record<string, unknown>): string {
  try {
    const json = JSON.stringify(args);
    return json;
  } catch {
    return '[unserializable args]';
  }
}
```

### 4. TS 端 — 为所有 handler 包装日志

**文件：** `server/src/tools/index.ts`

在 `buildToolRegistry` 中，为每个 tool 的 handler 包装前后日志：

```typescript
import { mcpLog, formatArgs } from './log.js';

// 在 buildToolRegistry 中
return tools.map(tool => ({
  ...tool,
  handler: async (args: Record<string, unknown>) => {
    const startTime = Date.now();
    await mcpLog(`${tool.name} → ${formatArgs(args)}`, 'debug');
    try {
      const result = await tool.handler(args);
      const elapsed = Date.now() - startTime;
      await mcpLog(`${tool.name} ← OK (${elapsed}ms)`, 'debug');
      return result;
    } catch (err) {
      const elapsed = Date.now() - startTime;
      await mcpLog(`${tool.name} ← ERROR: ${err instanceof Error ? err.message : String(err)} (${elapsed}ms)`, 'debug');
      throw err;
    }
  },
}));
```

**文件：** `server/src/godot-bridge.ts`

在 `connect()` 成功后调用 `setLogBridge(this)`，确保日志通道就绪。

### 5. 参数截断配置（可选）

**文件：** `server/src/config.ts`

新增配置项：
```typescript
export interface Config {
  // ... existing fields
  log_max_param_length?: number;  // 0 = 不截断
}
```

**文件：** `server/src/tools/log.ts`

```typescript
export function formatArgs(args: Record<string, unknown>, maxLength = 0): string {
  let json = JSON.stringify(args);
  if (maxLength > 0 && json.length > maxLength) {
    json = json.slice(0, maxLength) + `...(truncated ${json.length - maxLength} chars)`;
  }
  return json;
}
```

---

## 日志输出示例

### 在线工具（add_node）
```
[MCP] add_node → {"scene_path":"main.tscn","parent_path":"/root/Main","node_type":"Sprite2D","node_name":"Hero"}
[MCP] add_node: parent_path=/root/Main node_type=Sprite2D node_name=Hero
[MCP] add_node → added=true node_path=/root/Main/Hero
[MCP] add_node ← OK (45ms)
```

### 离线工具（read_scene）
```
[MCP] read_scene → {"scene_path":"main.tscn"}
[MCP] read_scene ← OK (12ms)
```

---

## 文件变更清单

| 文件 | 变更 |
|------|------|
| `server/src/tools/log.ts` | **新建**：日志辅助函数 |
| `server/src/tools/index.ts` | **修改**：为所有 handler 包装日志 |
| `server/src/godot-bridge.ts` | **修改**：连接成功后设置日志 bridge |
| `server/src/config.ts` | **修改**：新增 `log_max_param_length` 配置 |
| `addons/godot_mcp/editors/project_editor.gd` | **修改**：新增 `print_log`, `debug_mode` |
| `addons/godot_mcp/rpc_handler.gd` | **修改**：新增 `"log.print"` 路由 |
| `addons/godot_mcp/editors/scene_editor.gd` | **修改**：各函数入口/出口加详细日志 |
| `addons/godot_mcp/editors/script_editor.gd` | **修改**：各函数入口/出口加详细日志 |
| `addons/godot_mcp/editors/project_editor.gd` | **修改**：各函数入口/出口加详细日志 |
| `addons/godot_mcp/editors/runtime_commands.gd` | **修改**：各函数入口/出口加详细日志 |
| `addons/godot_mcp/editors/input_commands.gd` | **修改**：各函数入口/出口加详细日志 |

---

## 风险与注意事项

1. **性能**：频繁打印大参数可能影响性能，建议保留 `debug_mode` 开关
2. **循环引用**：`JSON.stringify` 对大对象可能失败，需加 `try/catch`
3. **Godot 未连接**：离线模式下日志仅存在于 TS console，这是预期行为
4. **日志膨胀**：`get_output_log` 的内存缓冲区可能快速增长，保持 1000 行上限
