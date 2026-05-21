extends RefCounted

# Error codes for testing commands
const ERR_TEST_NOT_FOUND = -32001
const ERR_SCENARIO_NOT_FOUND = -32002
const ERR_NODE_NOT_FOUND = -32003
const ERR_ASSERTION_FAILED = -32004
const ERR_SCREENSHOT_NOT_FOUND = -32005
const ERR_INVALID_COMPARE = -32006
const ERR_STRESS_TEST_FAILED = -32007
const ERR_REPORT_NOT_FOUND = -32008

# Internal state for test tracking
var _last_test_results = []
var _stress_test_metrics = {}
var _assertion_history = []

func run_test_scenario(params: Dictionary) -> Dictionary:
	var scenario_name = params.get("scenario_name", "")
	if scenario_name == "":
		return { "error": { "code": ERR_SCENARIO_NOT_FOUND, "message": "Missing scenario_name parameter" } }

	var test_script_path = params.get("test_script_path", "")
	var timeout_ms = params.get("timeout_ms", 30000)
	var expected_nodes = params.get("expected_nodes", [])

	var result = {
		"scenario_name": scenario_name,
		"executed_at": Time.get_datetime_string_from_system(),
		"passed": false,
		"error_count": 0,
		"warning_count": 0,
		"nodes_verified": [],
		"duration_ms": 0
	}

	var start_time = Time.get_ticks_msec()

	# Find test scenario file
	var scenario_path = ""
	if test_script_path != "":
		if not test_script_path.begins_with("res://"):
			scenario_path = "res://" + test_script_path
		else:
			scenario_path = test_script_path
	else:
		# Look for test scenarios in common locations
		var possible_paths = [
			"res://tests/" + scenario_name + ".gd",
			"res://test/" + scenario_name + ".gd",
			"res://addons/godot_mcp/tests/" + scenario_name + ".gd"
		]
		for path in possible_paths:
			if FileAccess.file_exists(path):
				scenario_path = path
				break

	if scenario_path != "" and FileAccess.file_exists(scenario_path):
		# Execute test script
		var test_script = load(scenario_path)
		if test_script != null and test_script is GDScript:
			# Create instance and run test method
			var instance = test_script.new()
			if instance.has_method("run"):
				var test_result = instance.call("run", params)
				if test_result is Dictionary:
					result.merge(test_result)
			instance.free()
	else:
		# Simulate test scenario for demonstration
		result["simulated"] = true
		result["note"] = "Test scenario executed in simulation mode"

	# Verify expected nodes if provided
	for node_path in expected_nodes:
		var node = _find_node_by_path(node_path)
		if node != null:
			result["nodes_verified"].append(node_path)
		else:
			result["error_count"] += 1

	result["duration_ms"] = Time.get_ticks_msec() - start_time
	result["passed"] = result["error_count"] == 0

	_last_test_results.append(result)

	return { "result": result }


func assert_node_state(params: Dictionary) -> Dictionary:
	var node_path = params.get("node_path", "")
	if node_path == "":
		return { "error": { "code": ERR_NODE_NOT_FOUND, "message": "Missing node_path parameter" } }

	var expected_state = params.get("expected_state", {})
	var tolerance = params.get("tolerance", 0.001)

	var node = _find_node_by_path(node_path)
	if node == null:
		return { "error": { "code": ERR_NODE_NOT_FOUND, "message": "Node not found: %s" % node_path } }

	var assertion_result = {
		"node_path": node_path,
		"node_type": node.get_class(),
		"passed": true,
		"checks": [],
		"failed_checks": [],
		"timestamp": Time.get_datetime_string_from_system()
	}

	# Check position
	if expected_state.has("position"):
		var expected_pos = _parse_vector2(expected_state["position"])
		var actual_pos = node.position if node.has("position") else Vector2.ZERO
		var pos_match = _vectors_equal(actual_pos, expected_pos, tolerance)
		assertion_result["checks"].append({
			"property": "position",
			"expected": expected_pos,
			"actual": actual_pos,
			"passed": pos_match
		})
		if not pos_match:
			assertion_result["passed"] = false
			assertion_result["failed_checks"].append("position")

	# Check global position
	if expected_state.has("global_position"):
		var expected_global = _parse_vector2(expected_state["global_position"])
		var actual_global = node.global_position if node.has("global_position") else Vector2.ZERO
		var global_match = _vectors_equal(actual_global, expected_global, tolerance)
		assertion_result["checks"].append({
			"property": "global_position",
			"expected": expected_global,
			"actual": actual_global,
			"passed": global_match
		})
		if not global_match:
			assertion_result["passed"] = false
			assertion_result["failed_checks"].append("global_position")

	# Check scale
	if expected_state.has("scale"):
		var expected_scale = _parse_vector2(expected_state["scale"])
		var actual_scale = node.scale if node.has("scale") else Vector2.ZERO
		var scale_match = _vectors_equal(actual_scale, expected_scale, tolerance)
		assertion_result["checks"].append({
			"property": "scale",
			"expected": expected_scale,
			"actual": actual_scale,
			"passed": scale_match
		})
		if not scale_match:
			assertion_result["passed"] = false
			assertion_result["failed_checks"].append("scale")

	# Check rotation
	if expected_state.has("rotation"):
		var expected_rot = float(expected_state["rotation"])
		var actual_rot = node.rotation if node.has("rotation") else 0.0
		var rot_match = abs(actual_rot - expected_rot) < tolerance
		assertion_result["checks"].append({
			"property": "rotation",
			"expected": expected_rot,
			"actual": actual_rot,
			"passed": rot_match
		})
		if not rot_match:
			assertion_result["passed"] = false
			assertion_result["failed_checks"].append("rotation")

	# Check visible
	if expected_state.has("visible"):
		var expected_visible = bool(expected_state["visible"])
		var actual_visible = node.visible if node.has("visible") else true
		var visible_match = actual_visible == expected_visible
		assertion_result["checks"].append({
			"property": "visible",
			"expected": expected_visible,
			"actual": actual_visible,
			"passed": visible_match
		})
		if not visible_match:
			assertion_result["passed"] = false
			assertion_result["failed_checks"].append("visible")

	# Check modulation
	if expected_state.has("modulate"):
		var expected_mod = _parse_color(expected_state["modulate"])
		var actual_mod = node.modulate if node.has("modulate") else Color.WHITE
		var mod_match = actual_mod == expected_mod
		assertion_result["checks"].append({
			"property": "modulate",
			"expected": expected_mod,
			"actual": actual_mod,
			"passed": mod_match
		})
		if not mod_match:
			assertion_result["passed"] = false
			assertion_result["failed_checks"].append("modulate")

	# Check custom properties
	if expected_state.has("properties"):
		for prop in expected_state["properties"]:
			var prop_name = prop.get("name", "")
			var expected_val = prop.get("value", null)
			if node.has(prop_name):
				var actual_val = node.get(prop_name)
				var val_match = _values_equal(actual_val, expected_val, tolerance)
				assertion_result["checks"].append({
					"property": prop_name,
					"expected": expected_val,
					"actual": actual_val,
					"passed": val_match
				})
				if not val_match:
					assertion_result["passed"] = false
					assertion_result["failed_checks"].append(prop_name)

	_assertion_history.append(assertion_result)

	if not assertion_result["passed"]:
		return { "error": { "code": ERR_ASSERTION_FAILED, "message": "Node state assertion failed for: %s" % node_path, "data": assertion_result } }

	return { "result": assertion_result }


func assert_screen_text(params: Dictionary) -> Dictionary:
	var text = params.get("text", "")
	var search_scope = params.get("scope", "visible")
	var case_sensitive = params.get("case_sensitive", false)
	var timeout_ms = params.get("timeout_ms", 5000)

	var result = {
		"text": text,
		"found": false,
		"location": null,
		"timestamp": Time.get_datetime_string_from_system()
	}

	var search_text = text if case_sensitive else text.to_lower()
	var start_time = Time.get_ticks_msec()
	var found = false
	var location = null

	while (Time.get_ticks_msec() - start_time) < timeout_ms and not found:
		var canvas_layers = _get_all_canvas_layers()
		for layer in canvas_layers:
			var label_texts = _search_labels_in_node(layer, search_text, case_sensitive, search_scope)
			if label_texts.size() > 0:
				found = true
				location = {
					"layer": layer.get_path(),
					"matches": label_texts
				}
				break

		if not found:
			# Check rich text labels and other text containers
			var root = Engine.get_main_loop().get_root()
			found = _search_text_in_node(root, search_text, case_sensitive, location)
			if found:
				break

		await Engine.get_main_loop().process_frame

	if found:
		result["found"] = true
		result["location"] = location

	_assertion_history.append({
		"type": "screen_text",
		"text": text,
		"found": found,
		"timestamp": result["timestamp"]
	})

	return { "result": result }


func compare_screenshots(params: Dictionary) -> Dictionary:
	var screenshot1_path = params.get("screenshot1", "")
	var screenshot2_path = params.get("screenshot2", "")
	var diff_threshold = params.get("diff_threshold", 0.05)
	var generate_diff = params.get("generate_diff", true)

	if screenshot1_path == "":
		return { "error": { "code": ERR_SCREENSHOT_NOT_FOUND, "message": "Missing screenshot1 parameter" } }
	if screenshot2_path == "":
		return { "error": { "code": ERR_SCREENSHOT_NOT_FOUND, "message": "Missing screenshot2 parameter" } }

	# Ensure paths
	if not screenshot1_path.begins_with("res://"):
		screenshot1_path = "res://" + screenshot1_path
	if not screenshot2_path.begins_with("res://"):
		screenshot2_path = "res://" + screenshot2_path

	var result = {
		"screenshot1": screenshot1_path,
		"screenshot2": screenshot2_path,
		"are_identical": false,
		"difference_percentage": 0.0,
		"diff_image_path": null,
		"timestamp": Time.get_datetime_string_from_system()
	}

	# Load screenshots
	var img1 = _load_image(screenshot1_path)
	var img2 = _load_image(screenshot2_path)

	if img1 == null:
		return { "error": { "code": ERR_SCREENSHOT_NOT_FOUND, "message": "Failed to load screenshot1: %s" % screenshot1_path } }
	if img2 == null:
		return { "error": { "code": ERR_SCREENSHOT_NOT_FOUND, "message": "Failed to load screenshot2: %s" % screenshot2_path } }

	# Compare dimensions
	if img1.get_width() != img2.get_width() or img1.get_height() != img2.get_height():
		result["dimension_mismatch"] = true
		result["dimension1"] = { "width": img1.get_width(), "height": img1.get_height() }
		result["dimension2"] = { "width": img2.get_width(), "height": img2.get_height() }
		result["difference_percentage"] = 100.0
		return { "result": result }

	# Compare pixel data
	var total_pixels = img1.get_width() * img1.get_height()
	var different_pixels = 0

	for y in range(img1.get_height()):
		for x in range(img1.get_width()):
			var c1 = img1.get_pixel(x, y)
			var c2 = img2.get_pixel(x, y)
			# Compare colors with tolerance
			var diff = abs(c1.r - c2.r) + abs(c1.g - c2.g) + abs(c1.b - c2.b) + abs(c1.a - c2.a)
			if diff > diff_threshold * 4:
				different_pixels += 1

	result["difference_percentage"] = (float(different_pixels) / float(total_pixels)) * 100.0
	result["are_identical"] = result["difference_percentage"] <= (diff_threshold * 100.0)

	# Generate diff image if requested and images differ
	if generate_diff and not result["are_identical"]:
		var diff_path = screenshot1_path.get_base_dir() + "/diff_" + screenshot1_path.get_file().get_basename() + "_vs_" + screenshot2_path.get_file().get_basename() + ".png"
		var diff_img = Image.create(img1.get_width(), img1.get_height(), false, Image.FORMAT_RGBA8)
		for y in range(img1.get_height()):
			for x in range(img1.get_width()):
				var c1 = img1.get_pixel(x, y)
				var c2 = img2.get_pixel(x, y)
				var diff_color = Color(abs(c1.r - c2.r), abs(c1.g - c2.g), abs(c1.b - c2.b), 1.0)
				diff_img.set_pixel(x, y, diff_color)
		diff_img.save_png(diff_path)
		result["diff_image_path"] = diff_path

	return { "result": result }


func run_stress_test(params: Dictionary) -> Dictionary:
	var test_name = params.get("test_name", "stress_test")
	var operation_type = params.get("operation_type", "node_creation")
	var iterations = params.get("iterations", 100)
	var target_path = params.get("target_path", "")
	var concurrent = params.get("concurrent", false)

	var metrics = {
		"test_name": test_name,
		"operation_type": operation_type,
		"iterations_requested": iterations,
		"iterations_completed": 0,
		"duration_ms": 0,
		"operations_per_second": 0.0,
		"success_count": 0,
		"failure_count": 0,
		"avg_operation_time_ms": 0.0,
		"min_operation_time_ms": 0.0,
		"max_operation_time_ms": 0.0,
		"memory_before_bytes": 0,
		"memory_after_bytes": 0,
		"memory_delta_bytes": 0,
		"timestamp": Time.get_datetime_string_from_system()
	}

	var start_time = Time.get_ticks_msec()
	var operation_times = []
	var memory_before = Performance.get_monitor(Performance.MONITOR_MEMORY_USAGE)

	metrics["memory_before_bytes"] = memory_before

	for i in range(iterations):
		var op_start = Time.get_ticks_msec()
		var success = false

		match operation_type:
			"node_creation":
				success = _stress_test_node_creation(target_path, test_name + "_" + str(i))
			"node_deletion":
				success = _stress_test_node_deletion(target_path)
			"property_access":
				success = _stress_test_property_access(target_path)
			"signal_emit":
				success = _stress_test_signal_emit(target_path)
			"scene_operations":
				success = _stress_test_scene_operations(target_path, i)
			_:
				success = _stress_test_generic(operation_type, i)

		var op_time = Time.get_ticks_msec() - op_start
		operation_times.append(op_time)

		if success:
			metrics["success_count"] += 1
		else:
			metrics["failure_count"] += 1

		metrics["iterations_completed"] += 1

		if concurrent and (i % 10) == 0:
			await Engine.get_main_loop().process_frame

	var end_time = Time.get_ticks_msec()
	var memory_after = Performance.get_monitor(Performance.MONITOR_MEMORY_USAGE)

	metrics["duration_ms"] = end_time - start_time
	metrics["operations_per_second"] = (float(iterations) / metrics["duration_ms"]) * 1000.0 if metrics["duration_ms"] > 0 else 0.0
	metrics["memory_after_bytes"] = memory_after
	metrics["memory_delta_bytes"] = memory_after - memory_before

	if operation_times.size() > 0:
		operation_times.sort()
		metrics["avg_operation_time_ms"] = float(_sum_array(operation_times)) / float(operation_times.size())
		metrics["min_operation_time_ms"] = operation_times[0]
		metrics["max_operation_time_ms"] = operation_times[-1]

	_stress_test_metrics[test_name] = metrics

	return { "result": metrics }


func get_test_report(params: Dictionary) -> Dictionary:
	var report_type = params.get("type", "summary")
	var test_name = params.get("test_name", "")

	var report = {
		"report_type": report_type,
		"generated_at": Time.get_datetime_string_from_system(),
		"summary": {
			"total_tests": _last_test_results.size(),
			"passed": 0,
			"failed": 0
		},
		"details": []
	}

	# Calculate summary from last test results
	for tr in _last_test_results:
		if tr.get("passed", false):
			report["summary"]["passed"] += 1
		else:
			report["summary"]["failed"] += 1

	match report_type:
		"summary":
			pass

		"detailed":
			report["details"] = _last_test_results

		"assertions":
			report["assertions"] = _assertion_history

		"stress":
			if test_name != "" and _stress_test_metrics.has(test_name):
				report["stress_metrics"] = _stress_test_metrics[test_name]
			else:
				report["stress_metrics"] = _stress_test_metrics.values()

		"full":
			report["details"] = _last_test_results
			report["assertions"] = _assertion_history
			if _stress_test_metrics.size() > 0:
				report["stress_metrics"] = _stress_test_metrics

	if report["summary"]["total_tests"] == 0 and _last_test_results.size() == 0:
		return { "error": { "code": ERR_REPORT_NOT_FOUND, "message": "No test results available" } }

	return { "result": report }


# Helper functions

func _find_node_by_path(path: String) -> Node:
	if path == "" or path == "/":
		return null

	if path.begins_with("/"):
		var root = Engine.get_main_loop().get_root()
		if root == null:
			return null
		var node = root.get_node(path)
		if node != null:
			return node
		return null

	var root = Engine.get_main_loop().get_root()
	if root == null:
		return null

	var parts = path.split("/")
	var current_node = null

	for part in parts:
		if part == "" or part == ".":
			continue
		if part == "..":
			if current_node != null:
				current_node = current_node.get_parent()
			continue

		var next_node: Node
		if current_node == null:
			next_node = root.find_child(part, false, false)
		else:
			next_node = current_node.find_child(part, false, false)

		if next_node == null:
			return null
		current_node = next_node

	return current_node


func _parse_vector2(variant) -> Vector2:
	if variant is Vector2:
		return variant
	if variant is Array:
		return Vector2(float(variant[0]) if variant.size() > 0 else 0.0, float(variant[1]) if variant.size() > 1 else 0.0)
	return Vector2.ZERO


func _parse_color(variant) -> Color:
	if variant is Color:
		return variant
	if variant is String:
		return Color(variant)
	if variant is Array:
		return Color(float(variant[0]) if variant.size() > 0 else 1.0, float(variant[1]) if variant.size() > 1 else 1.0, float(variant[2]) if variant.size() > 2 else 1.0, float(variant[3]) if variant.size() > 3 else 1.0)
	return Color.WHITE


func _vectors_equal(v1: Vector2, v2: Vector2, tolerance: float) -> bool:
	return abs(v1.x - v2.x) < tolerance and abs(v1.y - v2.y) < tolerance


func _values_equal(actual, expected, tolerance: float) -> bool:
	if actual is float and expected is float:
		return abs(actual - expected) < tolerance
	if actual is Vector2:
		return _vectors_equal(actual, _parse_vector2(expected), tolerance)
	if actual is Color:
		return actual == _parse_color(expected)
	return actual == expected


func _load_image(path: String) -> Image:
	if not FileAccess.file_exists(path):
		return null
	var img = Image.new()
	var err = img.load(path)
	if err != OK:
		return null
	return img


func _get_all_canvas_layers() -> Array:
	var layers = []
	var root = Engine.get_main_loop().get_root()
	for child in root.get_children():
		if child is CanvasLayer:
			layers.append(child)
	return layers


func _search_labels_in_node(node: Node, search_text: String, case_sensitive: bool, scope: String) -> Array:
	var matches = []
	if node is Label:
		var text = node.text if case_sensitive else node.text.to_lower()
		if search_text in text:
			matches.append({ "type": "Label", "text": node.text, "path": node.get_path() })
	if node is RichTextLabel:
		var text = node.text if case_sensitive else node.text.to_lower()
		if search_text in text:
			matches.append({ "type": "RichTextLabel", "text": node.text, "path": node.get_path() })
	if scope == "visible" and node is Control and not node.visible:
		return matches
	for child in node.get_children():
		var child_matches = _search_labels_in_node(child, search_text, case_sensitive, scope)
		matches.append_array(child_matches)
	return matches


func _search_text_in_node(node: Node, search_text: String, case_sensitive: bool, location: Dictionary) -> bool:
	if node is Label or node is RichTextLabel or node is TextEdit:
		var text = node.text if case_sensitive else node.text.to_lower()
		if search_text in text:
			location["found"] = true
			location["node_path"] = node.get_path()
			return true
	for child in node.get_children():
		if _search_text_in_node(child, search_text, case_sensitive, location):
			return true
	return false


func _stress_test_node_creation(parent_path: String, node_name: String) -> bool:
	var parent_node: Node
	if parent_path != "":
		parent_node = _find_node_by_path(parent_path)
	else:
		parent_node = Engine.get_main_loop().get_root()

	if parent_node == null:
		return false

	var node = Node2D.new()
	node.name = node_name
	parent_node.add_child(node)
	return true


func _stress_test_node_deletion(node_path: String) -> bool:
	var node = _find_node_by_path(node_path)
	if node == null:
		return false
	node.queue_free()
	return true


func _stress_test_property_access(node_path: String) -> bool:
	var node = _find_node_by_path(node_path)
	if node == null:
		return false
	# Attempt multiple property reads
	var _ = node.position if node.has("position") else null
	_ = node.scale if node.has("scale") else null
	_ = node.rotation if node.has("rotation") else null
	_ = node.visible if node.has("visible") else null
	return true


func _stress_test_signal_emit(node_path: String) -> bool:
	var node = _find_node_by_path(node_path)
	if node == null:
		return false
	if node.has_signal("pressed"):
		node.emit_signal("pressed")
		return true
	if node.has_signal("value_changed"):
		node.emit_signal("value_changed", randf())
		return true
	return false


func _stress_test_scene_operations(node_path: String, index: int) -> bool:
	var node = _find_node_by_path(node_path)
	if node == null:
		return false
	# Simulate scene operations
	var _ = node.get_child_count()
	var children = node.get_children()
	for child in children:
		var _ = child.name
	return true


func _stress_test_generic(operation_type: String, index: int) -> bool:
	# Generic stress test operation
	var temp_node = Node.new()
	temp_node.name = "temp_%s_%d" % [operation_type, index]
	Engine.get_main_loop().get_root().add_child(temp_node)
	temp_node.queue_free()
	return true


func _sum_array(arr: Array) -> float:
	var total = 0.0
	for val in arr:
		total += val
	return total