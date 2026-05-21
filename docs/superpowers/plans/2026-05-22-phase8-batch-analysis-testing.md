# Phase 8: Batch/Refactor / Analysis / Testing 工具实现计划

**Goal:** 实现 24 个工具（Batch 8 + Analysis 4 + Testing 6 + Other 6）

---

## Task 1: 创建 batch_commands.gd（8工具）
- `find_nodes_by_type` - 按节点类型查找节点
- `find_signal_connections` - 查找信号连接
- `batch_set_property` - 批量设置属性
- `find_node_references` - 查找节点引用
- `get_scene_dependencies` - 获取场景依赖
- `cross_scene_set_property` - 跨场景设置属性
- `find_script_references` - 查找脚本引用
- `detect_circular_dependencies` - 检测循环依赖

## Task 2: 创建 analysis_commands.gd（4工具）
- `analyze_scene_complexity` - 分析场景复杂度
- `analyze_signal_flow` - 分析信号流
- `find_unused_resources` - 查找未使用资源
- `get_project_statistics` - 获取项目统计

## Task 3: 创建 testing_commands.gd（6工具）
- `run_test_scenario` - 运行测试场景
- `assert_node_state` - 断言节点状态
- `assert_screen_text` - 断言屏幕文本
- `compare_screenshots` - 比较截图
- `run_stress_test` - 运行压力测试
- `get_test_report` - 获取测试报告

## Task 4: 创建 utility_commands.gd（6工具）
- `get_filesystem_tree` - 获取文件系统树
- `search_files` - 搜索文件
- `get_project_settings` - 获取项目设置
- `set_project_setting` - 设置项目配置
- `uid_to_project_path` - UID转项目路径
- `project_path_to_uid` - 项目路径转UID

## Task 5: 更新 rpc_handler.gd

## Task 6-8: 创建 TypeScript 文件并注册

## Task 9: 测试验证

工具总数: 165 (141 + 24)

---
最后更新: 2026-05-22