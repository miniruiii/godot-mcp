extends RefCounted

const Utils = preload("res://addons/godot_mcp/utils.gd")

# Error codes
const ERR_NO_MAIN_LOOP = -32000
const ERR_NODE_NOT_FOUND = -32001
const ERR_PARENT_NOT_FOUND = -32002
const ERR_PROPERTY_NOT_FOUND = -32003
const ERR_MISSING_CODE = -32004
const ERR_MISSING_AUTOLOAD_NAME = -32005
const ERR_MISSING_NODE_PATHS = -32006
const ERR_MISSING_TEXT = -32007
const ERR_NOT_NAVIGATION_AGENT = -32008
const ERR_INVALID_TARGET_FORMAT = -32009
const ERR_SCRIPT_COMPILATION_FAILED = -32010
const ERR_SCRIPT_NOT_FOUND = -32011
const ERR_AUTOLOAD_NOT_FOUND = -32012
const ERR_INVALID_FRAME_COUNT = -32013
const ERR_NO_RECORDING_DATA = -32014

func _find_game_node(path: String) -> Node:
	var main_loop = Engine.get_main_loop()
	if main_loop == null:
		return null
	return main_loop.root.get_node_or_null(NodePath(path))

func get_tree(params: Dictionary) -> Dictionary:
	print("[MCP] game.get_tree")
	var main_loop = Engine.get_main_loop()
	if main_loop == null:
		return { "error": { "code": ERR_NO_MAIN_LOOP, "message": "No main loop available" } }

	var root = main_loop.root
	var nodes = []
	var max_depth = params.get("max_depth", 5)
	_collect_runtime_nodes(root, nodes, "", 0, max_depth)
	return { "result": { "nodes": nodes, "scene_path": root.scene_file_path if root.scene_file_path else "" } }

func _collect_runtime_nodes(node: Node, out: Array, path: String, depth: int, max_depth: int) -> void:
	var node_path = path + "/" + node.name if path != "" else "/" + node.name
	out.append({
		"name": node.name,
		"type": node.get_class(),
		"path": node_path,
	})
	if depth >= max_depth:
		return
	for child in node.get_children():
		_collect_runtime_nodes(child, out, node_path, depth + 1, max_depth)

func get_node_properties(params: Dictionary) -> Dictionary:
	print("[MCP] game.get_node_properties: node_path=%s" % params.get("node_path", ""))
	var node_path = params.get("node_path", "")
	var target = _find_game_node(node_path)
	if target == null:
		return { "error": { "code": ERR_NODE_NOT_FOUND, "message": "Node not found: %s" % node_path } }

	var props = {}
	for prop in target.get_property_list():
		if prop["usage"] & PROPERTY_USAGE_EDITOR:
			var val = target.get(prop["name"])
			props[prop["name"]] = Utils.value_to_string(val)

	return { "result": {
		"name": target.name,
		"type": target.get_class(),
		"path": node_path,
		"properties": props,
	} }

func set_node_property(params: Dictionary) -> Dictionary:
	print("[MCP] game.set_node_property: node_path=%s property=%s" % [params.get("node_path", ""), params.get("property", "")])
	var node_path = params.get("node_path", "")
	var property = params.get("property", "")
	var value_str = params.get("value", "")

	var target = _find_game_node(node_path)
	if target == null:
		return { "error": { "code": ERR_NODE_NOT_FOUND, "message": "Node not found: %s" % node_path } }

	if not property in target:
		return { "error": { "code": ERR_PROPERTY_NOT_FOUND, "message": "Property not found: %s" % property } }

	var new_value = Utils.parse_value(value_str)
	target.set(property, new_value)
	return { "result": { "updated": true, "property": property, "value": Utils.value_to_string(new_value) } }

func execute_script(params: Dictionary) -> Dictionary:
	print("[MCP] game.execute_script")
	var code = params.get("code", "")
	if code == "":
		return { "error": { "code": ERR_MISSING_CODE, "message": "Missing code parameter" } }

	var script = GDScript.new()
	script.source_code = code

	var err = script.reload(false)
	if err != OK:
		return { "error": { "code": ERR_SCRIPT_COMPILATION_FAILED, "message": "Script compilation failed" } }

	var instance = script.new()
	if instance.has_method("_ready"):
		instance._ready()

	instance.free()
	return { "result": { "executed": true } }

func find_nodes_by_script(params: Dictionary) -> Dictionary:
	print("[MCP] game.find_nodes_by_script: script_path=%s" % params.get("script_path", ""))
	var main_loop = Engine.get_main_loop()
	if main_loop == null:
		return { "error": { "code": ERR_NO_MAIN_LOOP, "message": "No main loop available" } }

	var script_path = params.get("script_path", "")
	var script = load(script_path) as Script
	if script == null:
		return { "error": { "code": ERR_SCRIPT_NOT_FOUND, "message": "Script not found: %s" % script_path } }

	var result = []
	var root = main_loop.root
	_find_nodes_with_script_recursive(root, script, result, "")

	return { "result": { "nodes": result } }

func _find_nodes_with_script_recursive(node: Node, target_script: Script, out: Array, path: String) -> void:
	if node.get_script() == target_script:
		var node_path = path + "/" + node.name if path != "" else "/" + node.name
		out.append({
			"name": node.name,
			"type": node.get_class(),
			"path": node_path,
		})

	for child in node.get_children():
		var child_path = path + "/" + child.name if path != "" else "/" + child.name
		_find_nodes_with_script_recursive(child, target_script, out, child_path)

func get_autoload(params: Dictionary) -> Dictionary:
	print("[MCP] game.get_autoload: name=%s" % params.get("name", ""))
	var name = params.get("name", "")
	if name == "":
		return { "error": { "code": ERR_MISSING_AUTOLOAD_NAME, "message": "Missing autoload name" } }

	var path = "autoload/" + name
	if not ProjectSettings.has_setting(path):
		return { "error": { "code": ERR_AUTOLOAD_NOT_FOUND, "message": "Autoload not found: %s" % name } }

	var autoload_path = ProjectSettings.get_setting(path)
	return { "result": { "name": name, "path": autoload_path } }

func batch_get_properties(params: Dictionary) -> Dictionary:
	print("[MCP] game.batch_get_properties: node_paths=%s" % params.get("node_paths", []))
	var node_paths = params.get("node_paths", [])
	if node_paths.size() == 0:
		return { "error": { "code": ERR_MISSING_NODE_PATHS, "message": "Missing node_paths parameter" } }

	var results = []
	for node_path in node_paths:
		var target = _find_game_node(node_path)
		if target == null:
			results.append({ "path": node_path, "error": "Node not found" })
		else:
			var props = {}
			for prop in target.get_property_list():
				if prop["usage"] & PROPERTY_USAGE_EDITOR:
					var val = target.get(prop["name"])
					props[prop["name"]] = Utils.value_to_string(val)
			results.append({ "path": node_path, "properties": props })

	return { "result": { "nodes": results } }

func find_ui_elements(params: Dictionary) -> Dictionary:
	print("[MCP] game.find_ui_elements: type=%s text=%s" % [params.get("type", ""), params.get("text", "")])
	var main_loop = Engine.get_main_loop()
	if main_loop == null:
		return { "error": { "code": ERR_NO_MAIN_LOOP, "message": "No main loop available" } }

	var search_text = params.get("text", "")
	var control_type = params.get("type", "")
	var result = []

	var root = main_loop.root
	_find_ui_elements_recursive(root, search_text, control_type, result, "")

	return { "result": { "elements": result } }

func _find_ui_elements_recursive(node: Node, search_text: String, control_type: String, out: Array, path: String) -> void:
	if node is Control:
		var matches = true
		if control_type != "" and not node.get_class() == control_type:
			matches = false
		if search_text != "":
			var label = node as Label
			if label != null and label.text.find(search_text) == -1:
				matches = false

		if matches:
			var node_path = path + "/" + node.name if path != "" else "/" + node.name
			out.append({
				"name": node.name,
				"type": node.get_class(),
				"path": node_path,
				"text": node.get("text") if "text" in node else "",
			})

	for child in node.get_children():
		var child_path = path + "/" + child.name if path != "" else "/" + child.name
		_find_ui_elements_recursive(child, search_text, control_type, out, child_path)

func click_button_by_text(params: Dictionary) -> Dictionary:
	print("[MCP] game.click_button_by_text: text=%s" % params.get("text", ""))
	var main_loop = Engine.get_main_loop()
	if main_loop == null:
		return { "error": { "code": ERR_NO_MAIN_LOOP, "message": "No main loop available" } }

	var button_text = params.get("text", "")
	if button_text == "":
		return { "error": { "code": ERR_MISSING_TEXT, "message": "Missing text parameter" } }

	var root = main_loop.root
	var button = _find_button_by_text_recursive(root, button_text)
	if button == null:
		return { "error": { "code": ERR_NODE_NOT_FOUND, "message": "Button not found: %s" % button_text } }

	button.pressed.emit()
	return { "result": { "clicked": true, "button_path": button.get_path() } }

func _find_button_by_text_recursive(node: Node, text: String) -> Button:
	if node is Button:
		var label = node.get_node_or_null("Label")
		if label != null and label.text == text:
			return node as Button
		if node.text == text:
			return node as Button

	for child in node.get_children():
		var found = _find_button_by_text_recursive(child, text)
		if found != null:
			return found
	return null

func wait_for_node(params: Dictionary) -> Dictionary:
	print("[MCP] game.wait_for_node: node_path=%s timeout=%d" % [params.get("node_path", ""), params.get("timeout_ms", 5000)])
	var node_path = params.get("node_path", "")
	var timeout_ms = params.get("timeout_ms", 5000)

	var node = _find_game_node(node_path)
	if node != null:
		return { "result": { "found": true, "node_path": node_path } }

	var start_time = Time.get_ticks_msec()

	while Time.get_ticks_msec() - start_time < timeout_ms:
		node = _find_game_node(node_path)
		if node != null:
			return { "result": { "found": true, "node_path": node_path } }
		# Use create_timer for efficient non-busy waiting
		await Engine.get_main_loop().create_timer(0.01).timeout

	return { "error": { "code": ERR_NODE_NOT_FOUND, "message": "Node not found within timeout: %s" % node_path } }

func find_nearby_nodes(params: Dictionary) -> Dictionary:
	print("[MCP] game.find_nearby_nodes: origin=%s max_distance=%s" % [params.get("origin_path", ""), params.get("max_distance", 100.0)])
	var main_loop = Engine.get_main_loop()
	if main_loop == null:
		return { "error": { "code": ERR_NO_MAIN_LOOP, "message": "No main loop available" } }

	var origin_path = params.get("origin_path", "")
	var max_distance = params.get("max_distance", 100.0)

	var origin = _find_game_node(origin_path)
	if origin == null:
		return { "error": { "code": ERR_NODE_NOT_FOUND, "message": "Origin node not found: %s" % origin_path } }

	var origin_pos: Vector2 = origin.global_position
	var result = []
	_find_nodes_by_distance_recursive(main_loop.root, origin_pos, max_distance, result, "", origin)

	return { "result": { "nodes": result } }

func _find_nodes_by_distance_recursive(node: Node, origin: Vector2, max_dist: float, out: Array, path: String, origin_node: Node) -> void:
	if node == origin_node:
		return

	var dist = node.global_position.distance_to(origin)
	if dist <= max_dist:
		var node_path = path + "/" + node.name if path != "" else "/" + node.name
		out.append({
			"name": node.name,
			"type": node.get_class(),
			"path": node_path,
			"distance": dist,
		})

	for child in node.get_children():
		var child_path = path + "/" + child.name if path != "" else "/" + child.name
		_find_nodes_by_distance_recursive(child, origin, max_dist, out, child_path, origin_node)

func navigate_to(params: Dictionary) -> Dictionary:
	print("[MCP] game.navigate_to: node_path=%s target=%s" % [params.get("node_path", ""), params.get("target", "")])
	var agent_path = params.get("node_path", "")
	var target_pos_str = params.get("target", "")

	var agent = _find_game_node(agent_path)
	if agent == null:
		return { "error": { "code": ERR_NODE_NOT_FOUND, "message": "Navigation agent not found: %s" % agent_path } }

	if not agent.has("target_position"):
		return { "error": { "code": ERR_NOT_NAVIGATION_AGENT, "message": "Node is not a NavigationAgent" } }

	var parts = target_pos_str.strip_edges().split(",")
	if parts.size() != 3:
		return { "error": { "code": ERR_INVALID_TARGET_FORMAT, "message": "Invalid target_position format, expected 'x,y,z'" } }

	var target = Vector3(float(parts[0]), float(parts[1]), float(parts[2]))
	agent.target_position = target
	agent.navigate()
	return { "result": { "navigating": true, "target": target_pos_str } }


func get_game_node_property(params: Dictionary) -> Dictionary:
	print("[MCP] game.get_game_node_property: node_path=%s property=%s" % [params.get("node_path", ""), params.get("property", "")])
	var node_path = params.get("node_path", "")
	var property = params.get("property", "")

	var target = _find_game_node(node_path)
	if target == null:
		return { "error": { "code": ERR_NODE_NOT_FOUND, "message": "Node not found: %s" % node_path } }

	if not property in target:
		return { "error": { "code": ERR_PROPERTY_NOT_FOUND, "message": "Property not found: %s" % property } }

	var val = target.get(property)
	return { "result": { "property": property, "value": Utils.value_to_string(val) } }

func capture_frames(params: Dictionary) -> Dictionary:
	print("[MCP] game.capture_frames: count=%d" % params.get("count", 1))
	var count = params.get("count", 1)
	if count < 1 or count > 100:
		return { "error": { "code": ERR_INVALID_FRAME_COUNT, "message": "Frame count must be between 1 and 100" } }

	var viewport = Engine.get_main_loop().root.get_viewport()
	var images = []
	for i in range(count):
		var img = viewport.get_texture().get_image()
		images.append(img.get_data())

	return { "result": { "captured": count, "frames": images } }

func monitor_properties(params: Dictionary) -> Dictionary:
	print("[MCP] game.monitor_properties: node_path=%s properties=%s" % [params.get("node_path", ""), params.get("properties", [])])
	var node_path = params.get("node_path", "")
	var properties = params.get("properties", [])

	var target = _find_game_node(node_path)
	if target == null:
		return { "error": { "code": ERR_NODE_NOT_FOUND, "message": "Node not found: %s" % node_path } }

	var values = {}
	for prop in properties:
		if prop in target:
			values[prop] = Utils.value_to_string(target.get(prop))
		else:
			values[prop] = null

	return { "result": { "node_path": node_path, "values": values } }

var _recording_data = []
var _is_recording = false

func start_recording(params: Dictionary) -> Dictionary:
	print("[MCP] game.start_recording")
	_recording_data = []
	_is_recording = true
	return { "result": { "recording": true } }

func stop_recording(params: Dictionary) -> Dictionary:
	print("[MCP] game.stop_recording")
	_is_recording = false
	var frame_count = _recording_data.size()
	_recording_data = []
	return { "result": { "stopped": true, "frames_recorded": frame_count } }

func replay_recording(params: Dictionary) -> Dictionary:
	print("[MCP] game.replay_recording: frames=%d" % params.get("data", []).size())
	var data = params.get("data", [])
	if data.size() == 0:
		return { "error": { "code": ERR_NO_RECORDING_DATA, "message": "No recording data provided" } }

	for frame_data in data:
		var input_events = frame_data.get("input_events", [])
		for event_data in input_events:
			var event = _parse_input_event(event_data)
			if event:
				Input.parse_input_event(event)
		await Engine.get_main_loop().create_timer(0).timeout

	return { "result": { "replayed": true, "frame_count": data.size() } }

func _parse_input_event(event_data: Dictionary) -> InputEvent:
	var event_type = event_data.get("type", "")
	if event_type == "key":
		var event = InputEventKey.new()
		event.scancode = event_data.get("scancode", 0)
		event.pressed = event_data.get("pressed", false)
		return event
	elif event_type == "mouse_button":
		var event = InputEventMouseButton.new()
		event.button_index = event_data.get("button_index", 0)
		event.pressed = event_data.get("pressed", false)
		event.position = event_data.get("position", Vector2.ZERO)
		event.global_position = event_data.get("global_position", Vector2.ZERO)
		return event
	elif event_type == "mouse_motion":
		var event = InputEventMouseMotion.new()
		event.position = event_data.get("position", Vector2.ZERO)
		event.global_position = event_data.get("global_position", Vector2.ZERO)
		event.relative = event_data.get("relative", Vector2.ZERO)
		return event
	return null