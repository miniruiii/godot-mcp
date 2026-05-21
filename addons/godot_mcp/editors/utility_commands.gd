extends RefCounted

# Error codes for utility commands
const ERR_INVALID_PATH = -32101
const ERR_NOT_FOUND = -32102
const ERR_SETTING_NOT_FOUND = -32103
const ERR_INVALID_SETTING_VALUE = -32104
const ERR_UID_INVALID = -32105

func filesystem_tree(params: Dictionary) -> Dictionary:
	var base_path = params.get("path", "res://")
	var max_depth = params.get("max_depth", 3)

	if not base_path.begins_with("res://"):
		base_path = "res://" + base_path

	var tree = _build_directory_tree(base_path, 0, max_depth)

	return {
		"result": {
			"path": base_path,
			"tree": tree
		}
	}


func search_files(params: Dictionary) -> Dictionary:
	var search_text = params.get("text", "")
	var search_path = params.get("path", "res://")
	var extensions = params.get("extensions", [])
	var max_results = params.get("max_results", 50)
	var case_sensitive = params.get("case_sensitive", false)

	if search_text == "":
		return { "error": { "code": ERR_INVALID_PATH, "message": "Missing text parameter for search" } }

	if not search_path.begins_with("res://"):
		search_path = "res://" + search_path

	var results = []
	_search_in_directory(search_path, search_text, extensions, max_results, case_sensitive, results)

	return {
		"result": {
			"text": search_text,
			"path": search_path,
			"results": results,
			"count": results.size()
		}
	}


func get_settings(params: Dictionary) -> Dictionary:
	var category = params.get("category", "")

	var all_settings = {}
	var property_info = ProjectSettings.get_property_list()

	for prop in property_info:
		if prop is Dictionary:
			var name = prop.get("name", "")
			if name != "" and not name.begins_with("."):
				if category == "" or name.begins_with(category):
					var value = ProjectSettings.get_setting(name)
					all_settings[name] = {
						"value": value,
						"type": typeof(value)
					}

	return {
		"result": {
			"settings": all_settings,
			"category": category if category != "" else "all"
		}
	}


func set_setting(params: Dictionary) -> Dictionary:
	var name = params.get("name", "")
	var value = params.get("value", null)

	if name == "":
		return { "error": { "code": ERR_INVALID_PATH, "message": "Missing name parameter" } }

	if value == null:
		return { "error": { "code": ERR_INVALID_SETTING_VALUE, "message": "Missing value parameter" } }

	var current_value = ProjectSettings.get_setting(name)

	ProjectSettings.set_setting(name, value)
	ProjectSettings.save()

	return {
		"result": {
			"name": name,
			"previous_value": current_value,
			"new_value": value
		}
	}


func uid_to_path(params: Dictionary) -> Dictionary:
	var uid = params.get("uid", "")

	if uid == "":
		return { "error": { "code": ERR_UID_INVALID, "message": "Missing uid parameter" } }

	if not uid.begins_with("uid://"):
		uid = "uid://" + uid

	var path = ResourceUID.id_to_path(uid)

	if path == "":
		return { "error": { "code": ERR_NOT_FOUND, "message": "UID not found or invalid: %s" % uid } }

	return {
		"result": {
			"uid": uid,
			"path": path
		}
	}


func path_to_uid(params: Dictionary) -> Dictionary:
	var path = params.get("path", "")

	if path == "":
		return { "error": { "code": ERR_INVALID_PATH, "message": "Missing path parameter" } }

	if not path.begins_with("res://"):
		path = "res://" + path

	var uid = ResourceUID.path_to_id(path)

	if uid == ResourceUID.INVALID_ID:
		return { "error": { "code": ERR_NOT_FOUND, "message": "Path not found or not registered as UID: %s" % path } }

	return {
		"result": {
			"path": path,
			"uid": "uid://" + uid
		}
	}


func _build_directory_tree(path: String, depth: int, max_depth: int) -> Dictionary:
	var result = {
		"name": path.get_file() if path != "res://" else "project",
		"path": path,
		"type": "directory",
		"children": []
	}

	if depth >= max_depth:
		return result

	var dir = DirAccess.open(path)
	if dir == null:
		result["error"] = "Cannot open directory"
		return result

	dir.list_dir_begin()
	var file_name = dir.get_next()

	while file_name != "":
		if file_name == "." or file_name == "..":
			file_name = dir.get_next()
			continue

		var full_path = path.path_join(file_name)

		if dir.current_is_dir():
			result["children"].append(_build_directory_tree(full_path, depth + 1, max_depth))
		else:
			var file_type = "file"
			if file_name.ends_with(".gd"):
				file_type = "script"
			elif file_name.ends_with(".tscn"):
				file_type = "scene"
			elif file_name.ends_with(".tres"):
				file_type = "resource"
			elif file_name.ends_with(".png") or file_name.ends_with(".jpg") or file_name.ends_with(".webp"):
				file_type = "image"
			elif file_name.ends_with(".wav") or file_name.ends_with(".ogg"):
				file_type = "audio"

			result["children"].append({
				"name": file_name,
				"path": full_path,
				"type": file_type
			})

		file_name = dir.get_next()

	dir.list_dir_end()

	# Sort children: directories first, then alphabetically
	result["children"].sort_custom(func(a, b):
		if a["type"] == "directory" and b["type"] != "directory":
			return true
		if a["type"] != "directory" and b["type"] == "directory":
			return false
		return a["name"] < b["name"]
	)

	return result


func _search_in_directory(path: String, text: String, extensions: Array, max_results: int, case_sensitive: bool, results: Array) -> void:
	if results.size() >= max_results:
		return

	var dir = DirAccess.open(path)
	if dir == null:
		return

	dir.list_dir_begin()
	var file_name = dir.get_next()

	while file_name != "":
		if file_name == "." or file_name == "..":
			file_name = dir.get_next()
			continue

		var full_path = path.path_join(file_name)

		if dir.current_is_dir():
			_search_in_directory(full_path, text, extensions, max_results, case_sensitive, results)
		else:
			# Check extension filter
			if extensions.size() > 0:
				var has_extension = false
				for ext in extensions:
					if file_name.ends_with(ext):
						has_extension = true
						break
				if not has_extension:
					file_name = dir.get_next()
					continue

			# Search in file content
			var file = FileAccess.open(full_path, FileAccess.READ)
			if file != null:
				var content = file.get_as_text()
				file.close()

				var search_text = text if case_sensitive else text.to_lower()
				var search_content = content if case_sensitive else content.to_lower()

				if search_content.find(search_text) != -1:
					var line_number = 1
					var pos = 0
					while pos < search_content.size() and pos != -1:
						pos = search_content.find(search_text, pos)
						if pos != -1:
							var line_pos = content.substr(0, pos).rfind("\n")
							line_number = content.substr(0, pos).count("\n") + 1
							results.append({
								"path": full_path,
								"line": line_number,
								"match": content.split("\n")[line_number - 1].strip_edges()
							})
							pos += search_text.length()
							if results.size() >= max_results:
								break

		file_name = dir.get_next()

	dir.list_dir_end()