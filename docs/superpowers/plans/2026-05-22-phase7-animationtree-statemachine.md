# Phase 7: AnimationTree / StateMachine / BlendTree 工具实现计划

**Goal:** 实现 8 个工具（AnimationTree 4 + StateMachine 3 + BlendTree 1）

---

## Task 1: 创建 animation_tree_commands.gd（4工具）
- `create_animation_tree` - 创建 AnimationTree
- `get_animation_tree_structure` - 获取 AnimationTree 结构
- `set_tree_parameter` - 设置树参数
- `add_state_machine_state` - 添加状态机状态

## Task 2: 创建 state_machine_commands.gd（3工具）
- `remove_state_machine_state` - 删除状态机状态
- `add_state_machine_transition` - 添加状态转换
- `remove_state_machine_transition` - 删除状态转换

## Task 3: 创建 blend_tree_commands.gd（1工具）
- `set_blend_tree_node` - 设置混合树节点

## Task 4: 更新 rpc_handler.gd

## Task 5-7: 创建 animation_tree.ts, state_machine.ts, blend_tree.ts

## Task 8: 更新 index.ts 注册工具

## Task 9: 测试验证

工具总数: 141 (133 + 8)

---
最后更新: 2026-05-22