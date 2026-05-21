# Godot MCP Pro 完整实现规划

## 项目背景

- **目标仓库：** `C:\code\godot-mcp-rc`（开源，19个工具）
- **参考仓库：** `C:\code\godot-mcp-pro`（商业版，172个工具）
- **最终目标：** 在开源仓库中实现全部172个工具

---

## 工具分类与迭代计划

### 类别概览（按优先级排序）

| 阶段 | 类别 | 工具数 | 核心价值 |
|------|------|--------|----------|
| **Phase 1** | Runtime / Input / Node | 40 | 最高使用频率 |
| **Phase 2** | Scene / Script / Editor | 25 | 基础操作 |
| **Phase 3** | Animation / TileMap / Theme-UI | 18 | 视觉内容 |
| **Phase 4** | Resource / Physics / Navigation | 18 | 资源管理 |
| **Phase 5** | 3D Scene / Particle / Audio | 17 | 3D/媒体 |
| **Phase 6** | Shader / Export / Profiling | 11 | 高级功能 |
| **Phase 7** | AnimationTree / StateMachine / BlendTree | 8 | 状态机 |
| **Phase 8** | Batch/Refactor / Analysis / Testing | 24 | 工程化工具 |

---

## Phase 1: Runtime(19) + Input(7) + Node(14) = 40 工具

### 1.1 Runtime 工具（19）

| # | 工具名 | 描述 | 实现方式 |
|---|--------|------|----------|
| 1 | `get_game_scene_tree` | 游戏运行时场景树 | `Engine.get_main_loop().root` 遍历 |
| 2 | `get_game_node_properties` | 运行时节点属性 | `target.get_property_list()` |
| 3 | `set_game_node_property` | 设置运行时节点属性 | `target.set(property, value)` |
| 4 | `execute_game_script` | 在游戏上下文执行GDScript | `GDScript.new()` + `script.new()` |
| 5 | `capture_frames` | 多帧截图 | `get_tree().root.get_texture().get_data()` |
| 6 | `monitor_properties` | 属性值记录 | 定时采样 + `get()` |
| 7 | `start_recording` | 开始输入录制 | `InputRecorder` 或事件队列 |
| 8 | `stop_recording` | 停止输入录制 | 停止录制 |
| 9 | `replay_recording` | 回放录制 | `InputPlayback` |
| 10 | `find_nodes_by_script` | 按脚本找节点 | `get_tree().root.find_child()` |
| 11 | `get_autoload` | 获取autoload节点属性 | `ProjectSettings.get_setting()` |
| 12 | `batch_get_properties` | 批量获取节点属性 | 循环调用 |
| 13 | `find_ui_elements` | 找UI元素 | `Control.find_child()` |
| 14 | `click_button_by_text` | 按文本点击按钮 | 遍历找文本匹配 |
| 15 | `wait_for_node` | 等待节点出现 | 循环检查 + delay |
| 16 | `find_nearby_nodes` | 找附近节点 | 位置计算 |
| 17 | `navigate_to` | 导航到目标 | NavigationAgent |
| 18 | `move_to` | 行走到目标 | NavigationAgent + path |
| 19 | `get_game_node_property` | 获取单个属性 | `target.get(property)` |

### 1.2 Input 工具（7）

| # | 工具名 | 描述 | 实现方式 |
|---|--------|------|----------|
| 1 | `simulate_key` | 模拟键盘按键 | `InputEventKey` + `Input.parse_input_event()` |
| 2 | `simulate_mouse_click` | 模拟鼠标点击 | `InputEventMouseButton` |
| 3 | `simulate_mouse_move` | 模拟鼠标移动 | `InputEventMouseMotion` |
| 4 | `simulate_action` | 模拟Input Action | `Input.action_press()` / `action_release()` |
| 5 | `simulate_sequence` | 序列输入事件 | 循环 + frame delay |
| 6 | `get_input_actions` | 列出所有Input Action | `InputMap.get_actions()` |
| 7 | `set_input_action` | 创建/修改Input Action | `InputMap.action_add_event()` |

### 1.3 Node 工具（14）

| # | 工具名 | 描述 | 实现方式 |
|---|--------|------|----------|
| 1 | `duplicate_node` | 复制节点及子节点 | `node.duplicate()` |
| 2 | `move_node` | 移动/重设父节点 | `reparent()` + UndoRedo |
| 3 | `connect_signal` | 连接信号 | `node.connect()` |
| 4 | `disconnect_signal` | 断开信号 | `node.disconnect()` |
| 5 | `get_node_groups` | 获取节点所在组 | `node.get_groups()` |
| 6 | `set_node_groups` | 设置节点组 | `node.add_to_group()` / `remove_from_group()` |
| 7 | `find_nodes_in_group` | 找组内所有节点 | `get_tree().get_nodes_in_group()` |
| 8 | `rename_node` | 重命名节点 | `node.name = new_name` |
| 9 | `add_resource` | 添加资源属性 | `node.add_resource()` |
| 10 | `set_anchor_preset` | 设置Control锚点 | `Control.set_anchor()` |
| 11 | `delete_node` | 删除节点（已有partial） | `remove_child()` + UndoRedo |
| 12 | `update_property` | 更新属性（已有） | 已实现 |
| 13 | `get_node_properties` | 获取节点属性（已有partial） | 已实现 |
| 14 | `add_node` | 添加节点（已有partial） | 已实现 |

### Godot插件新文件
- `editors/runtime_commands.gd` — 19个runtime工具
- `editors/input_commands.gd` — 7个input工具
- `editors/node_commands.gd` — 扩展现有node命令

---

## Phase 2: Scene(9) + Script(8) + Editor(9) = 26 工具

### 2.1 Scene 工具（9）

| # | 工具名 | 描述 |
|---|--------|------|
| 1 | `get_scene_file_content` | 读取原始.tscn文件内容 |
| 2 | `delete_scene` | 删除场景文件 |
| 3 | `add_scene_instance` | 实例化场景作为子节点 |
| 4 | `play_scene` | 运行场景 |
| 5 | `stop_scene` | 停止场景 |
| 6 | `get_scene_tree` | 场景树（已有partial） |
| 7 | `create_scene` | 创建场景（已有） |
| 8 | `open_scene` | 打开场景（已有） |
| 9 | `save_scene` | 保存场景（已有） |

### 2.2 Script 工具（8）

| # | 工具名 | 描述 |
|---|--------|------|
| 1 | `list_scripts` | 列出所有脚本及类信息 |
| 2 | `attach_script` | 将脚本附加到节点 |
| 3 | `get_open_scripts` | 列出编辑器中打开的脚本（已有partial） |
| 4 | `validate_script` | 验证GDScript语法 |
| 5 | `search_in_files` | 在项目中搜索文件内容 |
| 6 | `read_script` | 读取脚本（已有） |
| 7 | `create_script` | 创建脚本（已有） |
| 8 | `edit_script` | 编辑脚本（已有） |

### 2.3 Editor 工具（9）

| # | 工具名 | 描述 |
|---|--------|------|
| 1 | `get_editor_errors` | 获取编辑器错误和堆栈 |
| 2 | `get_editor_screenshot` | 捕获编辑器视口截图 |
| 3 | `get_game_screenshot` | 捕获游戏截图 |
| 4 | `execute_editor_script` | 在编辑器上下文执行GDScript |
| 5 | `clear_output` | 清空输出面板 |
| 6 | `get_signals` | 获取节点的所有信号及连接 |
| 7 | `reload_plugin` | 重载MCP插件 |
| 8 | `reload_project` | 重新扫描文件系统并重载脚本 |
| 9 | `get_output_log` | 获取输出面板内容（已有） |

---

## Phase 3: Animation(6) + TileMap(6) + Theme-UI(6) = 18 工具

### 3.1 Animation 工具（6）
`list_animations`, `create_animation`, `add_animation_track`, `set_animation_keyframe`, `get_animation_info`, `remove_animation`

### 3.2 TileMap 工具（6）
`tilemap_set_cell`, `tilemap_fill_rect`, `tilemap_get_cell`, `tilemap_clear`, `tilemap_get_info`, `tilemap_get_used_cells`

### 3.3 Theme-UI 工具（6）
`create_theme`, `set_theme_color`, `set_theme_constant`, `set_theme_font_size`, `set_theme_stylebox`, `get_theme_info`

---

## Phase 4: Resource(6) + Physics(6) + Navigation(6) = 18 工具

### 4.1 Resource 工具（6）
`read_resource`, `edit_resource`, `create_resource`, `get_resource_preview`, `add_autoload`, `remove_autoload`

### 4.2 Physics 工具（6）
`setup_physics_body`, `setup_collision`, `set_physics_layers`, `get_physics_layers`, `get_collision_info`, `add_raycast`

### 4.3 Navigation 工具（6）
`setup_navigation_region`, `setup_navigation_agent`, `bake_navigation_mesh`, `set_navigation_layers`, `get_navigation_info`

---

## Phase 5: 3D-Scene(6) + Particle(5) + Audio(6) = 17 工具

### 5.1 3D Scene 工具（6）
`add_mesh_instance`, `setup_camera_3d`, `setup_lighting`, `setup_environment`, `add_gridmap`, `set_material_3d`

### 5.2 Particle 工具（5）
`create_particles`, `set_particle_material`, `set_particle_color_gradient`, `apply_particle_preset`, `get_particle_info`

### 5.3 Audio 工具（6）
`add_audio_player`, `add_audio_bus`, `add_audio_bus_effect`, `set_audio_bus`, `get_audio_bus_layout`, `get_audio_info`

---

## Phase 6: Shader(6) + Export(3) + Profiling(2) = 11 工具

### 6.1 Shader 工具（6）
`create_shader`, `read_shader`, `edit_shader`, `assign_shader_material`, `set_shader_param`, `get_shader_params`

### 6.2 Export 工具（3）
`list_export_presets`, `export_project`, `get_export_info`

### 6.3 Profiling 工具（2）
`get_performance_monitors`, `get_editor_performance`

---

## Phase 7: AnimationTree(4) + StateMachine(3) + BlendTree(1) = 8 工具

`create_animation_tree`, `get_animation_tree_structure`, `set_tree_parameter`, `add_state_machine_state`, `remove_state_machine_state`, `add_state_machine_transition`, `remove_state_machine_transition`, `set_blend_tree_node`

---

## Phase 8: Batch(8) + Analysis(4) + Testing(6) + 其他(6) = 24 工具

### 8.1 Batch/Refactor 工具（8）
`find_nodes_by_type`, `find_signal_connections`, `batch_set_property`, `find_node_references`, `get_scene_dependencies`, `cross_scene_set_property`, `find_script_references`, `detect_circular_dependencies`

### 8.2 Analysis/Search 工具（4）
`analyze_scene_complexity`, `analyze_signal_flow`, `find_unused_resources`, `get_project_statistics`

### 8.3 Testing/QA 工具（6）
`run_test_scenario`, `assert_node_state`, `assert_screen_text`, `compare_screenshots`, `run_stress_test`, `get_test_report`

### 8.4 其他工具（6）
`get_project_info`, `get_filesystem_tree`, `search_files`, `get_project_settings`, `set_project_setting`, `uid_to_project_path`, `project_path_to_uid`

---

## 实现顺序建议

```
Phase 1 (40工具) → Phase 2 (26) → Phase 3 (18) → Phase 4 (18)
→ Phase 5 (17) → Phase 6 (11) → Phase 7 (8) → Phase 8 (24)
```

**每个Phase内按工具顺序实现：**
1. Godot插件命令（.gd文件）
2. RPC路由（rpc_handler.gd）
3. MCP服务器工具（.ts文件）
4. 测试验证

---

## 当前状态

| 项目 | 工具数 | 状态 |
|------|--------|------|
| godot-mcp-rc（开源） | 19 | 已实现 |
| godot-mcp-pro（商业） | 172 | 完整实现参考 |
| **差距** | **153** | **待实现** |

---

## 里程碑

- [ ] Phase 1 完成（40工具）— 覆盖80%使用场景
- [ ] Phase 2 完成（26工具）— 基础功能完整
- [ ] Phase 3 完成（18工具）— 视觉内容编辑
- [ ] Phase 4 完成（18工具）— 资源和物理
- [ ] Phase 5 完成（17工具）— 3D和媒体
- [ ] Phase 6 完成（11工具）— 高级功能
- [ ] Phase 7 完成（8工具）— 状态机
- [ ] Phase 8 完成（24工具）— 工程化工具

---

最后更新: 2026-05-21