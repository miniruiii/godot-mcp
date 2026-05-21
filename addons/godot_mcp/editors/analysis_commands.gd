extends RefCounted

# Error codes for analysis commands
const ERR_NOT_FOUND = -32001
const ERR_INVALID_PATH = -32002
const ERR_PARSE_ERROR = -32003

func analyze_scene_complexity(params: Dictionary) -> Dictionary:
	var scene_path = params.get("scene_path", "")

	if scene_path == "":
		return { "error": { "code": ERR_INVALID_PATH, "message": "Missing scene_path parameter" } }

	if not scene_path.begins_with("res://"):
		scene_path = "res://" + scene_path

	var pkd_scene = PackedScene.new()
	var err = pkd_scene.pack(scene_path)

	if err != OK:
		return { "error": { "code": ERR_PARSE_ERROR, "message": "Failed to load scene: %s" % scene_path } }

	var root_node = pkd_scene.get_root_node()
	if root_node == null:
		return { "error": { "code": ERR_NOT_FOUND, "message": "Scene has no root node: %s" % scene_path } }

	var metrics = {
		"scene_path": scene_path,
		"total_nodes": 0,
		"max_nesting_depth": 0,
		"script_count": 0,
		"node_type_counts": {},
		"deepest_path": ""
	}

	var stack = []
	stack.push_back({ "node": root_node, "depth": 1, "path": root_node.get_name() })

	var max_depth = 0
	var deepest_path = root_node.get_name()

	while stack.size() > 0:
		var item = stack.pop_back()
		var node = item["node"]
		var depth = item["depth"]
		var path = item["path"]

		metrics["total_nodes"] += 1

		# Count node types
		var type_name = node.get_class()
		if metrics["node_type_counts"].has(type_name):
			metrics["node_type_counts"][type_name] += 1
		else:
			metrics["node_type_counts"][type_name] = 1

		# Count scripts
		if node.get_script() != null:
			metrics["script_count"] += 1

		# Track nesting depth
		if depth > max_depth:
			max_depth = depth
			deepest_path = path

		# Add children to stack
		for i in range(node.get_child_count() - 1, -1, -1):
			var child = node.get_child(i)
			var child_path = path + "/" + child.get_name()
			stack.push_back({ "node": child, "depth": depth + 1, "path": child_path })

	metrics["max_nesting_depth"] = max_depth
	metrics["deepest_path"] = deepest_path

	return { "result": metrics }


func analyze_signal_flow(params: Dictionary) -> Dictionary:
	var scene_path = params.get("scene_path", "")

	if scene_path == "":
		return { "error": { "code": ERR_INVALID_PATH, "message": "Missing scene_path parameter" } }

	if not scene_path.begins_with("res://"):
		scene_path = "res://" + scene_path

	var pkd_scene = PackedScene.new()
	var err = pkd_scene.pack(scene_path)

	if err != OK:
		return { "error": { "code": ERR_PARSE_ERROR, "message": "Failed to load scene: %s" % scene_path } }

	var root_node = pkd_scene.get_root_node()
	if root_node == null:
		return { "error": { "code": ERR_NOT_FOUND, "message": "Scene has no root node: %s" % scene_path } }

	var signal_flow = {
		"scene_path": scene_path,
		"connections": [],
		"signal_counts": {},
		"nodes_with_signals": 0,
		"nodes_with_receivers": 0
	}

	var all_nodes = []
	var traverse_func = func(node):
		all_nodes.append(node)
	root_node.propagate_call(traverse_func)

	for node in all_nodes:
		var signals = node.get_signal_list()
		if signals.size() > 0:
			signal_flow["nodes_with_signals"] += 1

		for signal in signals:
			var signal_name = signal["name"]
			var connections = node.get_signal_connection_list(signal_name)

			for conn in connections:
				var target = conn["target"] if conn.has("target") else null
				var method = conn["method"] if conn.has("method") else ""

				if target != null:
					signal_flow["connections"].append({
						"source_node": node.get_path(),
						"source_signal": signal_name,
						"target_node": target.get_path() if target else "",
						"target_method": method,
						"flags": conn.get("flags", 0),
						"binds": conn.get("binds", [])
					})

					if signal_flow["signal_counts"].has(signal_name):
						signal_flow["signal_counts"][signal_name] += 1
					else:
						signal_flow["signal_counts"][signal_name] = 1

	for node in all_nodes:
		var conn_count = 0
		var signals = node.get_signal_list()
		for signal in signals:
			conn_count += node.get_signal_connection_list(signal["name"]).size()

		if conn_count > 0:
			signal_flow["nodes_with_receivers"] += 1

	return { "result": signal_flow }


func find_unused_resources(params: Dictionary) -> Dictionary:
	var resource_dir = params.get("directory", "res://")

	if not resource_dir.begins_with("res://"):
		resource_dir = "res://" + resource_dir

	var all_resources = []
	var unused_resources = []
	var referenced_paths = {}

	# Scan project files for resource references
	var project_dir = DirAccess.open("res://")
	if project_dir == null:
		return { "error": { "code": ERR_INVALID_PATH, "message": "Cannot open project directory" } }

	# Find all .tscn and .gd files
	var scanner = func(dir_path: String):
		var dir = DirAccess.open(dir_path)
		if dir == null:
			return

		dir.list_dir_begin()
		var file_name = dir.get_next()
		while file_name != "":
			if dir.current_is_dir():
				if not file_name.begins_with("."):
					scanner.call(dir_path + "/" + file_name)
			else:
				var ext = file_name.get_extension()
				if ext == "tscn" or ext == "gd":
					var file_path = dir_path + "/" + file_name
					var file = FileAccess.open(file_path, FileAccess.READ)
					if file != null:
						var content = file.get_as_text()
						file.close()

						# Find resource paths (res://... with common extensions)
						var regex = RegEx.new()
						regex.compile("res://[^\\s\"'<>]+\\.(png|jpg|jpeg|gd|tres|tscn|ogg|wav|mp3|glb|gltf|scn|mesh)")
						var matches = regex.search_all(content)
						for match in matches:
							var res_path = match.get_string()
							referenced_paths[res_path] = true

			file_name = dir.get_next()
		dir.list_dir_end()

	scanner.call("res://")

	# Check all files in res:// directory
	var all_dir = DirAccess.open("res://")
	if all_dir == null:
		return { "error": { "code": ERR_INVALID_PATH, "message": "Cannot open res:// directory" } }

	var resource_extensions = ["png", "jpg", "jpeg", "tres", "tscn", "ogg", "wav", "mp3", "glb", "gltf", "scn", "mesh", "gd", "shader"]

	all_dir.list_dir_begin()
	var file_name = all_dir.get_next()
	while file_name != "":
		if not all_dir.current_is_dir():
			var ext = file_name.get_extension().to_lower()
			if resource_extensions.has(ext):
				var full_path = "res://" + file_name
				if not referenced_paths.has(full_path):
					unused_resources.append({
						"path": full_path,
						"type": ext,
						"name": file_name
					})
		file_name = all_dir.get_next()
	all_dir.list_dir_end()

	return {
		"result": {
			"directory": resource_dir,
			"total_resources": referenced_paths.size(),
			"unused_count": unused_resources.size(),
			"unused_resources": unused_resources
		}
	}


func get_project_statistics(params: Dictionary) -> Dictionary:
	var stats = {
		"node_count": 0,
		"script_count": 0,
		"scene_count": 0,
		"resource_count": 0,
		"autoload_count": 0,
		"scene_files": [],
		"script_files": [],
		"resource_types": {},
		"total_files": 0
	}

	var project_dir = DirAccess.open("res://")
	if project_dir == null:
		return { "error": { "code": ERR_INVALID_PATH, "message": "Cannot open project directory" } }

	var extensions = {
		"tscn": "scene",
		"gd": "script",
		"png": "image",
		"jpg": "image",
		"jpeg": "image",
		"tres": "resource",
		"ogg": "audio",
		"wav": "audio",
		"mp3": "audio",
		"glb": "3d_model",
		"gltf": "3d_model",
		"shader": "shader"
	}

	var count_func = func(dir_path: String):
		var dir = DirAccess.open(dir_path)
		if dir == null:
			return

		dir.list_dir_begin()
		var file_name = dir.get_next()
		while file_name != "":
			if dir.current_is_dir():
				if not file_name.begins_with("."):
					count_func.call(dir_path + "/" + file_name)
			else:
				var ext = file_name.get_extension().to_lower()
				if extensions.has(ext):
					var full_path = dir_path + "/" + file_name
					stats["total_files"] += 1

					if ext == "tscn":
						stats["scene_files"].append(full_path)
						stats["scene_count"] += 1
					elif ext == "gd":
						stats["script_files"].append(full_path)
						stats["script_count"] += 1

					var type_name = extensions[ext]
					if stats["resource_types"].has(type_name):
						stats["resource_types"][type_name] += 1
					else:
						stats["resource_types"][type_name] = 1

			file_name = dir.get_next()
		dir.list_dir_end()

	count_func.call("res://")

	# Get autoloads from project.godot
	var config = ConfigFile.new()
	err = config.load("res://project.godot")
	if err == OK:
		var autoloads = config.get_value("autoload", "", {})
		stats["autoload_count"] = autoloads.size() if typeof(autoloads) == TYPE_DICTIONARY else 0

	# Get memory stats
	stats["memory_static_bytes"] = Performance.get_monitor(Performance.MONITOR_MEMORY_STATIC)
	stats["memory_usage_bytes"] = Performance.get_monitor(Performance.MONITOR_MEMORY_USED)
	stats["object_count"] = Performance.get_monitor(Performance.MONITOR_OBJECT_COUNT)

	return { "result": stats }