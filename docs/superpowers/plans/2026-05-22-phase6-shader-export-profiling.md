# Phase 6: Shader / Export / Profiling 工具实现计划

**Goal:** 实现 11 个工具（Shader 6 + Export 3 + Profiling 2）

---

## Task 1: 创建 shader_commands.gd（6工具）
- `create_shader` - 创建着色器文件
- `read_shader` - 读取着色器内容
- `edit_shader` - 编辑着色器
- `assign_shader_material` - 为材质分配着色器
- `set_shader_param` - 设置着色器参数
- `get_shader_params` - 获取着色器参数

## Task 2: 创建 export_commands.gd（3工具）
- `list_export_presets` - 列出导出预设
- `export_project` - 导出项目
- `get_export_info` - 获取导出信息

## Task 3: 创建 profiling_commands.gd（2工具）
- `get_performance_monitors` - 获取性能监控数据
- `get_editor_performance` - 获取编辑器性能信息

## Task 4: 更新 rpc_handler.gd

## Task 5-7: 创建 shader.ts, export.ts, profiling.ts

## Task 8: 更新 index.ts 注册工具

## Task 9: 测试验证

工具总数: 133 (122 + 11)

---
最后更新: 2026-05-22