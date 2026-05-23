# godot-mcp CLI 手动测试文档

> 适用范围：`feat/cli-mode` 及后续版本
> 测试目标：验证 `godot-mcp` CLI 入口的各项功能（覆盖全部 52 个命令）

---

## 前置条件

- [ ] Node.js >= 20.0 已安装
- [ ] 执行过 `npm install`
- [ ] 执行过 `npm run build`，`dist/tool-cli.js` 存在
- [ ] （可选）Godot 4.6.2+ 项目已打开并启用了 MCP 插件，用于在线工具测试

所有命令均在项目根目录执行。

---

## 一、Help 系统

### TC-01: 无参数时显示总览帮助

```bash
node dist/tool-cli.js
```

**预期结果：**
- 输出 `godot-mcp <group> <command> [options]`
- 列出 8 个分组及其命令数量：
  - `editor (2 commands)`
  - `file (2 commands)`
  - `game (18 commands)`
  - `input (7 commands)`
  - `node (13 commands)`
  - `project (3 commands)`
  - `scene (4 commands)`
  - `script (3 commands)`
- 提示使用 `--help` 查看分组和命令详情
- 退出码为 `0`

**通过标准：** `[ ]`

---

### TC-02: 显式 `--help` 显示总览帮助

```bash
node dist/tool-cli.js --help
node dist/tool-cli.js -h
```

**预期结果：** 与 TC-01 一致

**通过标准：** `[ ]`

---

### TC-03: 分组级 help

```bash
node dist/tool-cli.js project --help
node dist/tool-cli.js node --help
node dist/tool-cli.js scene --help
node dist/tool-cli.js game --help
node dist/tool-cli.js input --help
```

**预期结果：**
- 输出 `godot-mcp <group> <command> [options]`
- 列出该分组下所有命令及描述
- 命令名左对齐，描述在右侧
- 退出码为 `0`

**通过标准：** `[ ]`

---

### TC-04: 命令级 help

```bash
node dist/tool-cli.js file read --help
node dist/tool-cli.js node add --help
node dist/tool-cli.js project info --help
node dist/tool-cli.js game tree --help
node dist/tool-cli.js input key --help
```

**预期结果：**
- 输出 `godot-mcp <group> <command> [options]`
- 显示命令描述
- 列出所有参数选项，含 `--flag <类型>` 和是否 required
- 退出码为 `1`（help 视为提前终止）

**通过标准：** `[ ]`

---

### TC-05: 未知分组 help 报错

```bash
node dist/tool-cli.js unknown --help
```

**预期结果：**
- 输出 `Unknown group: unknown`
- 退出码为 `1`

**通过标准：** `[ ]`

---

## 二、离线工具测试（无需 Godot 连接）

### TC-10: project info

```bash
node dist/tool-cli.js project info
```

**预期结果（在项目根目录）：**
- 返回 JSON，含 `files`、`engine_version` 等字段
- 退出码为 `0`

**预期结果（在非项目目录）：**
- 返回 JSON `{ "error": "project.godot not found" }`
- 退出码为 `1`

**通过标准：** `[ ]`

---

### TC-11: project list-files

```bash
node dist/tool-cli.js project list-files
node dist/tool-cli.js project list-files --extension ts
```

**预期结果：**
- 返回 JSON `{ "files": [...], "count": N }`
- `--extension` 过滤生效，只返回匹配后缀的文件
- 退出码为 `0`

**通过标准：** `[ ]`

---

### TC-12: project settings

```bash
node dist/tool-cli.js project settings
```

**预期结果：**
- 返回 JSON，含 `config_version`、`application/config/name` 等项目配置
- 退出码为 `0`

**通过标准：** `[ ]`

---

### TC-13: file read

```bash
node dist/tool-cli.js file read --path package.json
```

**预期结果：**
- 返回 JSON `{ "content": "...", "size": 1071 }`
- `content` 为文件原始文本内容
- 退出码为 `0`

**通过标准：** `[ ]`

---

### TC-14: file write + read 验证

```bash
node dist/tool-cli.js file write --path test-output.txt --content "hello cli"
node dist/tool-cli.js file read --path test-output.txt
```

**预期结果：**
- `write` 返回 JSON `{ "written": true, "path": "..." }`
- `read` 返回 content 为 `"hello cli"`
- 退出码均为 `0`
- 测试后清理：`rm test-output.txt`

**通过标准：** `[ ]`

---

### TC-15: scene read

```bash
node dist/tool-cli.js scene read --path res://main.tscn
```

**预期结果（在项目根目录且有该场景）：**
- 返回 JSON，含 `root` 节点树结构
- `root.name`、`root.type`、`root.children` 正确
- 退出码为 `0`

**通过标准：** `[ ]`

---

### TC-16: scene create

```bash
node dist/tool-cli.js scene create --path res://test-scene.tscn --type Node2D --name TestRoot
node dist/tool-cli.js scene read --path res://test-scene.tscn
```

**预期结果：**
- `create` 返回 `{ "created": true, "path": "..." }`
- `read` 返回 `root.name === "TestRoot"`，`root.type === "Node2D"`
- 退出码均为 `0`
- 测试后清理：`rm addons/godot_mcp/test-scene.tscn`（或实际路径）

**通过标准：** `[ ]`

---

### TC-17: script read

```bash
node dist/tool-cli.js script read --path res://addons/godot_mcp/plugin.gd
```

**预期结果：**
- 返回 JSON `{ "content": "...", "size": N }`
- 内容为 GDScript 源码文本
- 退出码为 `0`

**通过标准：** `[ ]`

---

## 三、在线工具测试（需要 Godot 编辑器连接）

> 前置：Godot 项目已打开，MCP 插件已启用，WebSocket 端口 6505 可连接

### TC-20: editor run

```bash
node dist/tool-cli.js editor run
```

**预期结果：**
- Godot 项目开始运行（弹出游戏窗口）
- 返回 JSON `{ "running": true }`
- 退出码为 `0`

**通过标准：** `[ ]`

---

### TC-21: editor logs

```bash
node dist/tool-cli.js editor logs --lines 10
```

**预期结果：**
- 返回 JSON `{ "lines": [...] }`
- `lines` 为最近 10 条编辑器输出日志
- 退出码为 `0`

**通过标准：** `[ ]`

---

### TC-22: node tree（在线模式）

```bash
node dist/tool-cli.js node tree --path res://main.tscn
```

**预期结果：**
- 返回 JSON，含 `nodes` 数组
- 节点含 `name`、`type`、`path`、`properties`
- 退出码为 `0`

**通过标准：** `[ ]`

---

### TC-23: node add + remove

```bash
node dist/tool-cli.js node add --path res://main.tscn --parent "/root/Main" --type Sprite2D --name TestSprite
node dist/tool-cli.js node remove --path res://main.tscn --node-path "/root/Main/TestSprite"
```

**预期结果：**
- `add` 返回 `{ "added": true }`
- 场景文件中新增 `TestSprite` 节点
- `remove` 返回 `{ "removed": true }`
- 节点被删除
- 退出码均为 `0`

**通过标准：** `[ ]`

---

### TC-24: node update

```bash
node dist/tool-cli.js node update --path res://main.tscn --node-path "/root/Main/Player" --property position --value "Vector2(200, 300)"
```

**预期结果：**
- 返回 `{ "updated": true }`
- 场景文件中对应节点的 `position` 已更新
- 退出码为 `0`

**通过标准：** `[ ]`

---

### TC-25: node duplicate

```bash
node dist/tool-cli.js node duplicate --path res://main.tscn --node-path "/root/Main/Player" --new-name PlayerCopy
```

**预期结果：**
- 返回 `{ "duplicated": true, "new_path": "..." }`
- 场景中出现 `PlayerCopy` 节点
- 退出码为 `0`

**通过标准：** `[ ]`

---

### TC-26: node move

```bash
node dist/tool-cli.js node move --path res://main.tscn --node-path "/root/Main/PlayerCopy" --new-parent "/root"
```

**预期结果：**
- 返回 `{ "moved": true }`
- 节点父级已变更
- 退出码为 `0`

**通过标准：** `[ ]`

---

### TC-27: node rename

```bash
node dist/tool-cli.js node rename --path res://main.tscn --node-path "/root/PlayerCopy" --new-name Enemy
```

**预期结果：**
- 返回 `{ "renamed": true }`
- 节点名称已变更
- 退出码为 `0`

**通过标准：** `[ ]`

---

### TC-28: node groups + find-in-group

```bash
node dist/tool-cli.js node set-groups --path res://main.tscn --node-path "/root/Main/Enemy" --add enemies
node dist/tool-cli.js node groups --path res://main.tscn --node-path "/root/Main/Enemy"
node dist/tool-cli.js node find-in-group --group enemies
```

**预期结果：**
- `set-groups` 返回 `{ "updated": true }`
- `groups` 返回 `{ "groups": ["enemies"] }`
- `find-in-group` 返回含 `Enemy` 节点的列表
- 退出码均为 `0`

**通过标准：** `[ ]`

---

### TC-29: node connect + disconnect

```bash
node dist/tool-cli.js node connect --path res://main.tscn --node-path "/root/Main/Button" --signal pressed --target-path "/root/Main/Enemy" --method _on_button_pressed
node dist/tool-cli.js node disconnect --path res://main.tscn --node-path "/root/Main/Button" --signal pressed --target-path "/root/Main/Enemy" --method _on_button_pressed
```

**预期结果：**
- `connect` 返回 `{ "connected": true }`
- `disconnect` 返回 `{ "disconnected": true }`
- 退出码均为 `0`

**通过标准：** `[ ]`

---

## 四、Game（Runtime）工具测试

> 前置：Godot 项目正在运行（`editor run` 后）

### TC-30: game tree

```bash
node dist/tool-cli.js game tree --max-depth 3
```

**预期结果：**
- 返回 JSON，含 `nodes` 数组
- 节点数量不超过合理上限
- 退出码为 `0`

**通过标准：** `[ ]`

---

### TC-31: game properties

```bash
node dist/tool-cli.js game properties --node-path "/root/Player"
```

**预期结果：**
- 返回 JSON `{ "properties": { "position": "...", ... } }`
- 退出码为 `0`

**通过标准：** `[ ]`

---

### TC-32: game property

```bash
node dist/tool-cli.js game property --node-path "/root/Player" --property position
```

**预期结果：**
- 返回 JSON `{ "value": "..." }`
- 退出码为 `0`

**通过标准：** `[ ]`

---

### TC-33: game set-property

```bash
node dist/tool-cli.js game set-property --node-path "/root/Player" --property speed --value 200
```

**预期结果：**
- 返回 JSON `{ "set": true }`
- 游戏中对应属性已更新
- 退出码为 `0`

**通过标准：** `[ ]`

---

### TC-34: game execute

```bash
node dist/tool-cli.js game execute --code "print('Hello from CLI')"
```

**预期结果：**
- 返回 JSON `{ "result": "success" }`
- Godot 输出窗口打印 `Hello from CLI`
- 退出码为 `0`

**通过标准：** `[ ]`

---

### TC-35: game find-by-script

```bash
node dist/tool-cli.js game find-by-script --script-path res://player.gd
```

**预期结果：**
- 返回 JSON `{ "nodes": [{ "name": "Player", "path": "/root/Player" }] }`
- 退出码为 `0`

**通过标准：** `[ ]`

---

### TC-36: game autoload

```bash
node dist/tool-cli.js game autoload --name GameState
```

**预期结果：**
- 返回 JSON，含 autoload 单例的属性信息
- 退出码为 `0`

**通过标准：** `[ ]`

---

### TC-37: game batch-properties

```bash
node dist/tool-cli.js game batch-properties --node-paths '["/root/Player","/root/Enemy"]'
```

**预期结果：**
- 返回 JSON，含多个节点的属性
- 退出码为 `0`

**通过标准：** `[ ]`

---

### TC-38: game ui-elements

```bash
node dist/tool-cli.js game ui-elements --type Button
```

**预期结果：**
- 返回 JSON `{ "elements": [...] }`
- 列出所有 Button 类型 UI 元素
- 退出码为 `0`

**通过标准：** `[ ]`

---

### TC-39: game click-button

```bash
node dist/tool-cli.js game click-button --text "Start"
```

**预期结果：**
- 返回 JSON `{ "clicked": true }`
- 游戏中对应按钮被点击
- 退出码为 `0`

**通过标准：** `[ ]`

---

### TC-40: game wait-for-node

```bash
node dist/tool-cli.js game wait-for-node --node-path "/root/Enemy" --timeout-ms 3000
```

**预期结果：**
- 节点存在时立即返回 `{ "found": true }`
- 超时未找到返回 `{ "found": false }`
- 退出码为 `0`

**通过标准：** `[ ]`

---

### TC-41: game nearby-nodes

```bash
node dist/tool-cli.js game nearby-nodes --node-path "/root/Player" --distance 200
```

**预期结果：**
- 返回 JSON `{ "nodes": [...] }`
- 节点在指定距离内
- 退出码为 `0`

**通过标准：** `[ ]`

---

### TC-42: game navigate

```bash
node dist/tool-cli.js game navigate --node-path "/root/Agent" --target "100,200,0"
```

**预期结果：**
- 返回 JSON `{ "navigating": true }`
- 导航代理向目标移动
- 退出码为 `0`

**通过标准：** `[ ]`

---

### TC-43: game capture

```bash
node dist/tool-cli.js game capture --count 3
```

**预期结果：**
- 返回 JSON `{ "frames": ["base64...", ...] }`
- 帧数据为 PNG base64 编码
- 退出码为 `0`

**通过标准：** `[ ]`

---

### TC-44: game monitor

```bash
node dist/tool-cli.js game monitor --node-path "/root/Player" --properties '["health","speed"]'
```

**预期结果：**
- 返回 JSON `{ "monitoring": true }`
- 退出码为 `0`

**通过标准：** `[ ]`

---

### TC-45: game recording + replay

```bash
node dist/tool-cli.js game start-recording
# 执行一些输入操作...
node dist/tool-cli.js game stop-recording
```

**预期结果：**
- `start-recording` 返回 `{ "recording": true }`
- `stop-recording` 返回 `{ "data": [...] }`
- 退出码均为 `0`

**通过标准：** `[ ]`

---

## 五、Input 工具测试

> 前置：Godot 项目正在运行

### TC-50: input key

```bash
node dist/tool-cli.js input key --keycode Space --pressed true
node dist/tool-cli.js input key --keycode Space --pressed false
```

**预期结果：**
- 返回 JSON `{ "simulated": true }`
- 游戏中 Space 键被按下/释放
- 退出码为 `0`

**通过标准：** `[ ]`

---

### TC-51: input mouse-click

```bash
node dist/tool-cli.js input mouse-click --position '{"x":100,"y":200}' --button 1 --pressed true
```

**预期结果：**
- 返回 JSON `{ "simulated": true }`
- 游戏中鼠标在 (100, 200) 位置点击
- 退出码为 `0`

**通过标准：** `[ ]`

---

### TC-52: input mouse-move

```bash
node dist/tool-cli.js input mouse-move --position '{"x":400,"y":300}'
```

**预期结果：**
- 返回 JSON `{ "simulated": true }`
- 游戏中鼠标移动到 (400, 300)
- 退出码为 `0`

**通过标准：** `[ ]`

---

### TC-53: input action

```bash
node dist/tool-cli.js input action --action ui_accept --pressed true
```

**预期结果：**
- 返回 JSON `{ "simulated": true }`
- 游戏中 `ui_accept` 动作被触发
- 退出码为 `0`

**通过标准：** `[ ]`

---

### TC-54: input actions

```bash
node dist/tool-cli.js input actions
```

**预期结果：**
- 返回 JSON `{ "actions": ["ui_accept", "ui_cancel", ...] }`
- 列出所有已定义的输入动作
- 退出码为 `0`

**通过标准：** `[ ]`

---

### TC-55: input set-action

```bash
node dist/tool-cli.js input set-action --action jump --event '{"type":"key","keycode":"Space"}'
```

**预期结果：**
- 返回 JSON `{ "set": true }`
- 输入动作已更新
- 退出码为 `0`

**通过标准：** `[ ]`

---

### TC-56: input sequence

```bash
node dist/tool-cli.js input sequence --events '[{"type":"key","keycode":"Right","pressed":true},{"type":"key","keycode":"Right","pressed":false}]'
```

**预期结果：**
- 返回 JSON `{ "simulated": true }`
- 序列中的输入事件依次执行
- 退出码为 `0`

**通过标准：** `[ ]`

---

## 六、参数解析测试

### TC-60: kebab-case 转 camelCase

```bash
node dist/tool-cli.js node tree --scene-path res://main.tscn --max-depth 2
```

**预期结果：**
- `--scene-path` 映射为 `scenePath`
- `--max-depth` 映射为 `maxDepth`
- 工具能正确接收参数（无 "Missing required field" 错误）

**通过标准：** `[ ]`

---

### TC-61: JSON 对象/数组自动解析

```bash
node dist/tool-cli.js game set-property --node-path "/root/Player" --property position --value '{"x":100,"y":200}'
node dist/tool-cli.js input sequence --events '[{"type":"key","keycode":"Space"}]'
```

**预期结果：**
- `value` 被解析为对象 `{ x: 100, y: 200 }`
- `events` 被解析为数组
- 不是字符串

**通过标准：** `[ ]`

---

### TC-62: 纯字符串不强制 JSON 解析

```bash
node dist/tool-cli.js file write --path test.txt --content "{not json}"
```

**预期结果：**
- `content` 保持为字符串 `"{not json}"`
- 文件内容正确写入
- 不因 JSON 解析失败而报错

**通过标准：** `[ ]`

---

### TC-63: 布尔型无值参数

```bash
node dist/tool-cli.js input key --keycode Space --pressed
```

**预期结果：**
- `--pressed` 无后续值时映射为 `pressed: true`
- 工具正确接收 `pressed: true`

**通过标准：** `[ ]`

---

## 七、错误处理测试

### TC-70: 未知命令

```bash
node dist/tool-cli.js project delete-all
```

**预期结果：**
- 输出 `Unknown command: project delete-all`
- 提示 `Run: godot-mcp --help for available commands`
- 退出码为 `1`

**通过标准：** `[ ]`

---

### TC-71: 缺少必需参数

```bash
node dist/tool-cli.js file read
```

**预期结果：**
- 返回 JSON `{ "error": "Missing required field: path" }`（或类似错误）
- 输出到 stderr
- 退出码为 `1`

**通过标准：** `[ ]`

---

### TC-72: 文件不存在

```bash
node dist/tool-cli.js file read --path res://not-exist.gd
```

**预期结果：**
- 返回 JSON `{ "error": "..." }`
- 退出码为 `1`

**通过标准：** `[ ]`

---

### TC-73: Godot 未连接时在线工具报错

```bash
# 确保 Godot 未运行
node dist/tool-cli.js node add --path res://main.tscn --parent "/root" --type Node2D --name X
node dist/tool-cli.js game tree
```

**预期结果：**
- 返回 `{ "offline": true, "added": false, "message": "...requires Godot editor..." }`
- 不是未处理的异常崩溃
- 退出码为 `0`（工具返回了结果对象）

> 注：部分在线工具返回业务错误对象（exit 0），部分抛出异常（exit 1），以实际实现为准。

**通过标准：** `[ ]`

---

## 八、输出格式测试

### TC-80: JSON 格式化输出

```bash
node dist/tool-cli.js project info
```

**预期结果：**
- 输出为格式化 JSON（带缩进和换行）
- 机器可读，也便于人眼查看

**通过标准：** `[ ]`

---

### TC-81: 错误输出到 stderr

```bash
node dist/tool-cli.js file read --path missing.txt 2>stderr.txt
cat stderr.txt
```

**预期结果：**
- 错误信息写入 stderr，不是 stdout
- 内容为 JSON 格式 `{ "error": "..." }`

**通过标准：** `[ ]`

---

## 测试执行记录

| 日期 | 执行人 | Godot 版本 | 结果 |
|------|--------|-----------|------|
|      |        |           |      |

---

## 附录：完整命令速查

### Help

```bash
node dist/tool-cli.js
node dist/tool-cli.js <group> --help
node dist/tool-cli.js <group> <cmd> --help
```

### 离线工具

```bash
# Project
node dist/tool-cli.js project info
node dist/tool-cli.js project list-files
node dist/tool-cli.js project list-files --extension gd
node dist/tool-cli.js project settings

# File
node dist/tool-cli.js file read --path <path>
node dist/tool-cli.js file write --path <path> --content "<text>"

# Scene
node dist/tool-cli.js scene read --path res://<scene>.tscn
node dist/tool-cli.js scene create --path res://<scene>.tscn --type <NodeType> --name <Name>
node dist/tool-cli.js scene save --path res://<scene>.tscn
node dist/tool-cli.js scene open --path res://<scene>.tscn

# Script
node dist/tool-cli.js script read --path res://<script>.gd
node dist/tool-cli.js script create --path res://<script>.gd --extends <type>
node dist/tool-cli.js script edit --path res://<script>.gd --replacement "<code>"
```

### 在线工具（需 Godot 连接）

```bash
# Editor
node dist/tool-cli.js editor run
node dist/tool-cli.js editor logs --lines 20

# Node
node dist/tool-cli.js node tree --path res://<scene>.tscn
node dist/tool-cli.js node get --path res://<scene>.tscn --node-path <path>
node dist/tool-cli.js node add --path res://<scene>.tscn --parent <path> --type <type> --name <name>
node dist/tool-cli.js node remove --path res://<scene>.tscn --node-path <path>
node dist/tool-cli.js node update --path res://<scene>.tscn --node-path <path> --property <prop> --value <val>
node dist/tool-cli.js node duplicate --path res://<scene>.tscn --node-path <path> --new-name <name>
node dist/tool-cli.js node move --path res://<scene>.tscn --node-path <path> --new-parent <path>
node dist/tool-cli.js node rename --path res://<scene>.tscn --node-path <path> --new-name <name>
node dist/tool-cli.js node connect --path res://<scene>.tscn --node-path <path> --signal <sig> --target-path <path> --method <method>
node dist/tool-cli.js node disconnect --path res://<scene>.tscn --node-path <path> --signal <sig> --target-path <path> --method <method>
node dist/tool-cli.js node groups --path res://<scene>.tscn --node-path <path>
node dist/tool-cli.js node set-groups --path res://<scene>.tscn --node-path <path> --add '["group1"]'
node dist/tool-cli.js node find-in-group --group <group>

# Game (Runtime)
node dist/tool-cli.js game tree --max-depth 3
node dist/tool-cli.js game properties --node-path <path>
node dist/tool-cli.js game property --node-path <path> --property <prop>
node dist/tool-cli.js game set-property --node-path <path> --property <prop> --value <val>
node dist/tool-cli.js game execute --code "<gdscript>"
node dist/tool-cli.js game find-by-script --script-path res://<script>.gd
node dist/tool-cli.js game autoload --name <name>
node dist/tool-cli.js game batch-properties --node-paths '["path1","path2"]'
node dist/tool-cli.js game ui-elements --type Button
node dist/tool-cli.js game click-button --text "<text>"
node dist/tool-cli.js game wait-for-node --node-path <path> --timeout-ms 3000
node dist/tool-cli.js game nearby-nodes --node-path <path> --distance 200
node dist/tool-cli.js game navigate --node-path <path> --target "x,y,z"
node dist/tool-cli.js game capture --count 3
node dist/tool-cli.js game monitor --node-path <path> --properties '["prop1","prop2"]'
node dist/tool-cli.js game start-recording
node dist/tool-cli.js game stop-recording
node dist/tool-cli.js game replay-recording --data '{"events":[]}'

# Input
node dist/tool-cli.js input key --keycode <Key> --pressed true
node dist/tool-cli.js input mouse-click --position '{"x":100,"y":200}' --button 1 --pressed true
node dist/tool-cli.js input mouse-move --position '{"x":100,"y":200}'
node dist/tool-cli.js input action --action ui_accept --pressed true
node dist/tool-cli.js input sequence --events '[...]'
node dist/tool-cli.js input actions
node dist/tool-cli.js input set-action --action <name> --event '{...}'
```
