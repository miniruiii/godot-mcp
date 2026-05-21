# Phase 4: Resource/Physics/Navigation 工具实现计划

**Goal:** 实现 18 个工具（Resource 6 + Physics 6 + Navigation 6）

---

## Task 1: 创建 resource_commands.gd（6工具）
- `read_resource` - 读取资源文件
- `edit_resource` - 编辑资源
- `create_resource` - 创建资源
- `get_resource_preview` - 获取资源预览
- `add_autoload` - 添加 autoload
- `remove_autoload` - 删除 autoload

## Task 2: 创建 physics_commands.gd（6工具）
- `setup_physics_body` - 设置物理 body
- `setup_collision` - 设置碰撞
- `set_physics_layers` - 设置物理层
- `get_physics_layers` - 获取物理层
- `get_collision_info` - 获取碰撞信息
- `add_raycast` - 添加射线检测

## Task 3: 创建 navigation_commands.gd（6工具）
- `setup_navigation_region` - 设置导航区域
- `setup_navigation_agent` - 设置导航代理
- `bake_navigation_mesh` - 烘焙导航网格
- `set_navigation_layers` - 设置导航层
- `get_navigation_info` - 获取导航信息

## Task 4: 更新 rpc_handler.gd

## Task 5-7: 创建 resource.ts, physics.ts, navigation.ts

## Task 8: 更新 index.ts 注册工具

## Task 9: 测试验证

工具总数: 99 (81 + 18)

---

最后更新: 2026-05-22