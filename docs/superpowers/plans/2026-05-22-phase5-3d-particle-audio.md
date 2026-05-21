# Phase 5: 3D Scene / Particle / Audio 工具实现计划

**Goal:** 实现 17 个工具（3D Scene 6 + Particle 5 + Audio 6）

---

## Task 1: 创建 scene3d_commands.gd（6工具）
- `add_mesh_instance` - 添加 MeshInstance3D
- `setup_camera_3d` - 设置 Camera3D
- `setup_lighting` - 设置灯光
- `setup_environment` - 设置环境
- `add_gridmap` - 添加 GridMap
- `set_material_3d` - 设置材质

## Task 2: 创建 particle_commands.gd（5工具）
- `create_particles` - 创建粒子系统
- `set_particle_material` - 设置粒子材质
- `set_particle_color_gradient` - 设置颜色渐变
- `apply_particle_preset` - 应用预设
- `get_particle_info` - 获取粒子信息

## Task 3: 创建 audio_commands.gd（6工具）
- `add_audio_player` - 添加 AudioStreamPlayer
- `add_audio_bus` - 添加音频总线
- `add_audio_bus_effect` - 添加音频效果
- `set_audio_bus` - 设置音频总线
- `get_audio_bus_layout` - 获取音频布局
- `get_audio_info` - 获取音频信息

## Task 4: 更新 rpc_handler.gd

## Task 5-7: 创建 scene3d.ts, particle.ts, audio.ts

## Task 8: 更新 index.ts 注册工具

## Task 9: 测试验证

工具总数: 122 (105 + 17)

---
最后更新: 2026-05-22