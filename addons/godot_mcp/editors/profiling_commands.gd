extends RefCounted

# Error codes for profiling commands
const ERR_NOT_FOUND = -32001
const ERR_INVALID_TYPE = -32002

func get_performance_monitors(params: Dictionary) -> Dictionary:
	var monitors = {}

	# FPS and timing metrics
	monitors["fps"] = Performance.get_monitor(Performance.MONITOR_FPS)
	monitors["fixed_fps"] = Performance.get_monitor(Performance.MONITOR_FIXED_FPS)
	monitors["delta_time_ms"] = Performance.get_monitor(Performance.MONITOR_TIME_FPS)
	monitors["frame_time_ms"] = Performance.get_monitor(Performance.MONITOR_FRAME_TIME)

	# Memory metrics
	monitors["memory_allocated_bytes"] = Performance.get_monitor(Performance.MONITOR_MEMORY_STATIC)
	monitors["memory_usage_bytes"] = Performance.get_monitor(Performance.MONITOR_MEMORY_USAGE)
	monitors["video_memory_bytes"] = Performance.get_monitor(Performance.MONITOR_VIDEO_MEM_USED)
	monitors["buffer_memory_bytes"] = Performance.get_monitor(Performance.MONITOR_MEM_BUFFER)

	# Node metrics
	monitors["node_count"] = Performance.get_monitor(Performance.MONITOR_OBJECT_COUNT)
	monitors["resource_count"] = Performance.get_monitor(Performance.MONITOR_OBJECT_COUNT)
	monitors["orphan_node_count"] = Performance.get_monitor(Performance.MONITOR_OBJECT_ORPHAN_COUNT)

	# Rendering metrics
	monitors["render_objects"] = Performance.get_monitor(Performance.MONITOR_RENDER_OBJECTS)
	monitors["render_draw_calls"] = Performance.get_monitor(Performance.MONITOR_RENDER_DRAW_CALLS)
	monitors["render_surfaces"] = Performance.get_monitor(Performance.MONITOR_RENDER_SURFACES)
	monitors["texture_memory_bytes"] = Performance.get_monitor(Performance.MONITOR_TEXTURE_MEM_USED)
	monitors["shader_compilations"] = Performance.get_monitor(Performance.MONITOR_SHADER_COMPILES)

	# Physics metrics
	monitors["collision_objects"] = Performance.get_monitor(Performance.MONITOR_PHYSICS_2D_OBJECTS)
	monitors["collision_pairs"] = Performance.get_monitor(Performance.MONITOR_PHYSICS_2D_COLLISION_CHECKS)
	monitors["island_count"] = Performance.get_monitor(Performance.MONITOR_PHYSICS_2D_ISLANDS)

	# Navigation metrics
	monitors["navigation_regions"] = Performance.get_monitor(Performance.MONITOR_NAVIGATION_REGIONS)
	monitors["navigation_active_regions"] = Performance.get_monitor(Performance.MONITOR_NAVIGATION_ACTIVE_REGIONS)

	# Audio metrics
	monitors["audio_output_latency_ms"] = Performance.get_monitor(Performance.MONITOR_AUDIO_OUTPUT_LATENCY)

	# Input metrics
	monitors["input_events"] = Performance.get_monitor(Performance.MONITOR_INPUT_EVENTS)

	return { "result": monitors }


func get_editor_performance(params: Dictionary) -> Dictionary:
	var stats = {}

	# Editor-specific metrics
	if Engine.is_editor_hint():
		# Scene tree info
		var edited_scene = EditorInterface.get_edited_scene_root()
		if edited_scene != null:
			var node_count = 0
			var child_count = 0
			var traverse_func = func(node):
				node_count += 1
				child_count += node.get_child_count()
			edited_scene.propagate_call(traverse_func)
			stats["edited_scene_nodes"] = node_count
			stats["edited_scene_children"] = child_count
			stats["edited_scene_root"] = edited_scene.get_name()

		# Undo/Redo stack size
		var undo_redo = EditorInterface.get_editor_undo_redo()
		if undo_redo != null:
			stats["undo_steps"] = undo_redo.get_history_count()

		# Script editor state
		var script_editor = EditorInterface.get_script_editor()
		if script_editor != null:
			stats["script_editor_open"] = true
		else:
			stats["script_editor_open"] = false

	# General engine stats available in editor
	stats["fps"] = Performance.get_monitor(Performance.MONITOR_FPS)
	stats["memory_static_bytes"] = Performance.get_monitor(Performance.MONITOR_MEMORY_STATIC)
	stats["memory_usage_bytes"] = Performance.get_monitor(Performance.MONITOR_MEMORY_USED)
	stats["object_count"] = Performance.get_monitor(Performance.MONITOR_OBJECT_COUNT)
	stats["orphan_objects"] = Performance.get_monitor(Performance.MONITOR_OBJECT_ORPHAN_COUNT)

	# Rendering in editor
	stats["render_objects"] = Performance.get_monitor(Performance.MONITOR_RENDER_OBJECTS)
	stats["render_draw_calls"] = Performance.get_monitor(Performance.MONITOR_RENDER_DRAW_CALLS)
	stats["video_mem_used_bytes"] = Performance.get_monitor(Performance.MONITOR_VIDEO_MEM_USED)
	stats["texture_mem_used_bytes"] = Performance.get_monitor(Performance.MONITOR_TEXTURE_MEM_USED)

	# Physics in editor
	stats["physics_2d_objects"] = Performance.get_monitor(Performance.MONITOR_PHYSICS_2D_OBJECTS)
	stats["physics_2d_collisions"] = Performance.get_monitor(Performance.MONITOR_PHYSICS_2D_COLLISION_CHECKS)

	# Time since editor start
	stats["editor_uptime_seconds"] = Time.get_ticks_msec() / 1000.0

	return { "result": stats }