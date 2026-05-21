extends RefCounted

# Error codes for batch commands
const ERR_SCENE_NOT_FOUND = -32001
const ERR_NODE_NOT_FOUND = -32002
const ERR_INVALID_TYPE = -32003
const ERR_PROPERTY_NOT_FOUND = -32004
const ERR_SCRIPT_NOT_FOUND = -32005
const ERR_CIRCULAR_DEPENDENCY = -32006

func find_nodes_by_type(params: Dictionary) -> Dictionary:
	var node_type = params.get("type", "")
	if node_type == "":
		return { "error": { "code": ERR_INVALID_TYPE, "message": "Missing 'type' parameter" } }

	var include_subtypes = params.get("include_subtypes", true)
	var scene_root = params.get("scene_root", "")

	var root_node: Node
	if scene_root != "":
		root_node = _find_node_by_path(scene_root)
		if root_node == null:
			return { "error": { "code": ERR_SCENE_NOT_FOUND, "message": "Scene root not found: " + scene_root } }
	else:
		root_node = Engine.get_main_loop().get_root()

	if root_node == null:
		return { "error": { "code": ERR_SCENE_NOT_FOUND, "message": "No scene root available" } }

	var found_nodes = []
	var search_type = Type.get_type_from_name(node_type)

	if search_type != null:
		_traverse_nodes_by_type(root_node, search_type, include_subtypes, found_nodes)
	else:
		_traverse_nodes_by_class_name(root_node, node_type, include_subtypes, found_nodes)

	return {
		"result": {
			"type": node_type,
			"count": found_nodes.size(),
			"nodes": found_nodes
		}
	}


func find_signal_connections(params: Dictionary) -> Dictionary:
	var node_path = params.get("node_path", "")
	if node_path == "":
		return { "error": { "code": ERR_NODE_NOT_FOUND, "message": "Missing 'node_path' parameter" } }

	var node = _find_node_by_path(node_path)
	if node == null:
		return { "error": { "code": ERR_NODE_NOT_FOUND, "message": "Node not found: " + node_path } }

	var signal_name = params.get("signal_name", "")
	var connections = _get_connections(node, signal_name)

	return {
		"result": {
			"node_path": node_path,
			"signal_name": signal_name,
			"count": connections.size(),
			"connections": connections
		}
	}


func batch_set_property(params: Dictionary) -> Dictionary:
	var property_name = params.get("property", "")
	if property_name == "":
		return { "error": { "code": ERR_PROPERTY_NOT_FOUND, "message": "Missing 'property' parameter" } }

	var node_paths = params.get("node_paths", [])
	if node_paths.size() == 0:
		return { "error": { "code": ERR_NODE_NOT_FOUND, "message": "Missing 'node_paths' parameter" } }

	var value = params.get("value", null)

	var successful = []
	var failed = []

	for path in node_paths:
		var node = _find_node_by_path(path)
		if node == null:
			failed.append({ "node_path": path, "error": "Node not found" })
			continue

		if not node.has(property_name):
			failed.append({ "node_path": path, "error": "Property not found: " + property_name })
			continue

		node.set(property_name, value)
		successful.append(path)

	return {
		"result": {
			"property": property_name,
			"total": node_paths.size(),
			"successful": successful.size(),
			"failed": failed.size(),
			"successful_nodes": successful,
			"failed_nodes": failed
		}
	}


func find_node_references(params: Dictionary) -> Dictionary:
	var node_path = params.get("node_path", "")
	if node_path == "":
		return { "error": { "code": ERR_NODE_NOT_FOUND, "message": "Missing 'node_path' parameter" } }

	var node = _find_node_by_path(node_path)
	if node == null:
		return { "error": { "code": ERR_NODE_NOT_FOUND, "message": "Node not found: " + node_path } }

	var references = []

	# Search in exported properties of other nodes
	var root = Engine.get_main_loop().get_root()
	_search_node_references(root, node_path, references)

	return {
		"result": {
			"node_path": node_path,
			"count": references.size(),
			"references": references
		}
	}


func get_scene_dependencies(params: Dictionary) -> Dictionary:
	var scene_path = params.get("scene_path", "")
	if scene_path == "":
		return { "error": { "code": ERR_SCENE_NOT_FOUND, "message": "Missing 'scene_path' parameter" } }

	if not scene_path.begins_with("res://"):
		scene_path = "res://" + scene_path

	var pkd_scene = PackedScene.new()
	var result = pkd_scene.pack(scene_path)

	if result != OK:
		return { "error": { "code": ERR_SCENE_NOT_FOUND, "message": "Failed to load scene: " + scene_path } }

	var dependencies = []
	var external_resources = pkd_scene.get_external_resources()

	for resource in external_resources:
		var res_path = resource
		if res_path is String:
			dependencies.append({
				"path": res_path,
				"type": _get_resource_type(res_path)
			})

	return {
		"result": {
			"scene_path": scene_path,
			"count": dependencies.size(),
			"dependencies": dependencies
		}
	}


func cross_scene_set_property(params: Dictionary) -> Dictionary:
	var property_name = params.get("property", "")
	if property_name == "":
		return { "error": { "code": ERR_PROPERTY_NOT_FOUND, "message": "Missing 'property' parameter" } }

	var scene_paths = params.get("scene_paths", [])
	if scene_paths.size() == 0:
		return { "error": { "code": ERR_SCENE_NOT_FOUND, "message": "Missing 'scene_paths' parameter" } }

	var value = params.get("value", null)
	var node_filter = params.get("node_filter", "")

	var successful = []
	var failed = []

	for scene_path in scene_paths:
		if not scene_path.begins_with("res://"):
			scene_path = "res://" + scene_path

		var pkd_scene = PackedScene.new()
		var result = pkd_scene.pack(scene_path)

		if result != OK:
			failed.append({ "scene_path": scene_path, "error": "Failed to load scene" })
			continue

		var scene_root = pkd_scene.instantiate()
		if scene_root == null:
			failed.append({ "scene_path": scene_path, "error": "Failed to instantiate scene" })
			continue

		var nodes_to_edit = []
		if node_filter != "":
			_filter_nodes_by_type(scene_root, node_filter, nodes_to_edit)
		else:
			nodes_to_edit.append(scene_root)

		var scene_successful = false
		for target_node in nodes_to_edit:
			if target_node.has(property_name):
				target_node.set(property_name, value)
				scene_successful = true

		if scene_successful:
			successful.append(scene_path)
		else:
			failed.append({ "scene_path": scene_path, "error": "Property not found in any node" })

		scene_root.free()

	return {
		"result": {
			"property": property_name,
			"total_scenes": scene_paths.size(),
			"successful": successful.size(),
			"failed": failed.size(),
			"successful_scenes": successful,
			"failed_scenes": failed
		}
	}


func find_script_references(params: Dictionary) -> Dictionary:
	var script_path = params.get("script_path", "")
	if script_path == "":
		return { "error": { "code": ERR_SCRIPT_NOT_FOUND, "message": "Missing 'script_path' parameter" } }

	if not script_path.begins_with("res://"):
		script_path = "res://" + script_path

	var references = []

	# Search in all loaded scenes
	var root = Engine.get_main_loop().get_root()

	# Get all .tscn files in the project
	var project_path = ProjectSettings.get_project_path()
	var dir = DirAccess.open(project_path)

	if dir != null:
		dir.list_dir_begin()
		var file_name = dir.get_next()
		while file_name != "":
			if file_name.ends_with(".tscn"):
				var full_path = project_path + "/" + file_name
				_search_script_in_scene(full_path, script_path, references)
			file_name = dir.get_next()

	return {
		"result": {
			"script_path": script_path,
			"count": references.size(),
			"references": references
		}
	}


func detect_circular_dependencies(params: Dictionary) -> Dictionary:
	var start_path = params.get("path", "")
	if start_path == "":
		return { "error": { "code": ERR_SCENE_NOT_FOUND, "message": "Missing 'path' parameter" } }

	if not start_path.begins_with("res://"):
		start_path = "res://" + start_path

	var visited = []
	var recursion_stack = []
	var circular_paths = []

	_detect_circular(start_path, visited, recursion_stack, circular_paths)

	return {
		"result": {
			"start_path": start_path,
			"circular_count": circular_paths.size(),
			"circular_paths": circular_paths
		}
	}


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

	for i in range(parts.size()):
		var part = parts[i]
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


func _traverse_nodes_by_type(node: Node, type: Variant, include_subtypes: bool, results: Array) -> void:
	if include_subtypes:
		if node is type:
			results.append({ "path": node.get_path(), "name": node.get_name(), "type": node.get_class() })
	else:
		if node.get_class() == type:
			results.append({ "path": node.get_path(), "name": node.get_name(), "type": node.get_class() })

	for child in node.get_children():
		_traverse_nodes_by_type(child, type, include_subtypes, results)


func _traverse_nodes_by_class_name(node: Node, class_name: String, include_subtypes: bool, results: Array) -> void:
	var matches = false
	if include_subtypes:
		matches = node.is_class(class_name)
	else:
		matches = node.get_class() == class_name

	if matches:
		results.append({ "path": node.get_path(), "name": node.get_name(), "type": node.get_class() })

	for child in node.get_children():
		_traverse_nodes_by_class_name(child, class_name, include_subtypes, results)


func _get_connections(node: Node, filter_signal: String) -> Array:
	var connections = []
	var connection_list = node.get_incoming_connections()

	for conn in connection_list:
		var signal_name = conn.signal if conn.signal else ""
		if filter_signal == "" or signal_name == filter_signal:
			connections.append({
				"signal": signal_name,
				"source_node": conn.source.get_path() if conn.source else "",
				"method": conn.method,
				"binds": conn.binds if conn.binds else []
			})

	return connections


func _search_node_references(node: Node, target_path: String, references: Array) -> void:
	# Check if node has a property that references target path
	var properties = node.get_property_list()
	for prop in properties:
		if prop.usage & PROPERTY_USAGE_SCRIPT_PROPERTY == 0:
			continue
		var value = node.get(prop.name)
		if value is NodePath and value != NodePath(""):
			var resolved_path = value
			if node.has_node(resolved_path):
				var resolved = node.get_node(resolved_path)
				if resolved != null and str(resolved.get_path()) == target_path:
					references.append({
						"node": node.get_path(),
						"property": prop.name,
						"type": "NodePath"
					})

	# Check exported script properties for node references
	var script = node.get_script()
	if script != null and script is GDScript:
		var constants = script.get_property_info()
		for prop in constants:
			if "hint" in prop and "ObjectId" in str(prop.hint):
				var value = node.get(prop.name)
				if value is int and value != 0:
					references.append({
						"node": node.get_path(),
						"property": prop.name,
						"type": "ObjectId"
					})

	for child in node.get_children():
		_search_node_references(child, target_path, references)


func _get_resource_type(path: String) -> String:
	var resource = load(path)
	if resource != null:
		return resource.get_class()
	return "Unknown"


func _filter_nodes_by_type(node: Node, type_filter: String, results: Array) -> void:
	if node.is_class(type_filter) or node.get_class() == type_filter:
		results.append(node)

	for child in node.get_children():
		_filter_nodes_by_type(child, type_filter, results)


func _search_script_in_scene(scene_path: String, script_path: String, references: Array) -> void:
	var pkd_scene = PackedScene.new()
	var result = pkd_scene.pack(scene_path)

	if result != OK:
		return

	var scene_root = pkd_scene.instantiate()
	if scene_root == null:
		return

	_search_script_in_node(scene_root, script_path, scene_path, references)
	scene_root.free()


func _search_script_in_node(node: Node, script_path: String, scene_path: String, references: Array) -> void:
	var script = node.get_script()
	if script != null and script is GDScript:
		var script_resource_path = script.get_path()
		if script_resource_path == script_path:
			references.append({
				"scene": scene_path,
				"node_path": node.get_path(),
				"node_name": node.get_name()
			})

	for child in node.get_children():
		_search_script_in_node(child, script_path, scene_path, references)


func _detect_circular(path: String, visited: Array, recursion_stack: Array, circular_paths: Array) -> bool:
	if path in recursion_stack:
		var cycle_start = recursion_stack.find(path)
		var cycle_path = []
		for i in range(cycle_start, recursion_stack.size()):
			cycle_path.append(recursion_stack[i])
		cycle_path.append(path)
		circular_paths.append(cycle_path)
		return true

	if path in visited:
		return false

	visited.append(path)
	recursion_stack.append(path)

	if path.ends_with(".tscn"):
		var pkd_scene = PackedScene.new()
		var result = pkd_scene.pack(path)
		if result == OK:
			var external_resources = pkd_scene.get_external_resources()
			for resource in external_resources:
				if resource is String and resource.ends_with(".tscn"):
					_detect_circular(resource, visited, recursion_stack, circular_paths)
	elif path.ends_with(".gd"):
		# Parse script for resource dependencies
		var script = load(path) as GDScript
		if script != null:
			for constant in script.get_script_constant_map().values():
				if constant is String and constant.ends_with(".tscn"):
					_detect_circular(constant, visited, recursion_stack, circular_paths)

	recursion_stack.pop_back()
	return false