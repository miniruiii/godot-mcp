extends RefCounted

# Error codes for export commands
const ERR_PRESETS_NOT_FOUND = -32602
const ERR_EXPORTER_NOT_AVAILABLE = -32001
const ERR_EXPORT_FAILED = -32002
const ERR_INVALID_PRESET = -32003

func list_export_presets(params: Dictionary) -> Dictionary:
	var project_path = ProjectSettings.get_setting("application/config/name", "")
	if project_path == "":
		project_path = ProjectSettings.get_setting("application/config/name", "Unknown Project")

	var presets_path = "res://export_presets.cfg"
	var presets_file = FileAccess.get_file_as_string(presets_path)

	if presets_file == "" or FileAccess.get_open_error() != OK:
		return { "error": { "code": ERR_PRESETS_NOT_FOUND, "message": "Export presets file not found at: %s" % presets_path } }

	var presets = []
	var current_preset = null
	var lines = presets_file.split("\n")

	for line in lines:
		line = line.strip_edges()
		if line.begins_with("[") and line.ends_with("]"):
			if current_preset != null:
				presets.append(current_preset)
			var preset_name = line.substr(1, line.length() - 2)
			current_preset = { "name": preset_name, "platform": "", "export_path": "", "dedicated": false }
		elif current_preset != null and line.contains("="):
			var parts = line.split("=")
			if parts.size() >= 2:
				var key = parts[0].strip_edges()
				var value = parts[1].strip_edges()
				match key:
					"name":
						current_preset["name"] = value
					"platform":
						current_preset["platform"] = value
					"export_path":
						current_preset["export_path"] = value
					"dedicated":
						current_preset["dedicated"] = value == "true"

	if current_preset != null:
		presets.append(current_preset)

	return { "result": { "project": project_path, "presets_path": presets_path, "presets_count": presets.size(), "presets": presets } }


func export_project(params: Dictionary) -> Dictionary:
	var preset_name = params.get("preset", "")

	if preset_name == "":
		return { "error": { "code": ERR_INVALID_PRESET, "message": "Missing preset parameter" } }

	# Check if EditorExporter is available (only in editor context)
	if not Engine.is_editor_hint():
		return { "error": { "code": ERR_EXPORTER_NOT_AVAILABLE, "message": "Export is only available in the editor" } }

	# Find the preset
	var presets_path = "res://export_presets.cfg"
	var presets_file = FileAccess.get_file_as_string(presets_path)

	if presets_file == "" or FileAccess.get_open_error() != OK:
		return { "error": { "code": ERR_PRESETS_NOT_FOUND, "message": "Export presets file not found at: %s" % presets_path } }

	var preset_found = false
	var export_path = ""
	var lines = presets_file.split("\n")
	var current_preset = null

	for line in lines:
		line = line.strip_edges()
		if line.begins_with("[") and line.ends_with("]"):
			if current_preset != null and current_preset["name"] == preset_name:
				preset_found = true
				break
			var preset_n = line.substr(1, line.length() - 2)
			current_preset = { "name": preset_n, "export_path": "" }
		elif current_preset != null and line.contains("="):
			var parts = line.split("=")
			if parts.size() >= 2:
				var key = parts[0].strip_edges()
				var value = parts[1].strip_edges()
				if key == "export_path":
					current_preset["export_path"] = value

	if not preset_found and current_preset != null and current_preset["name"] == preset_name:
		preset_found = true

	if not preset_found:
		return { "error": { "code": ERR_INVALID_PRESET, "message": "Export preset not found: %s" % preset_name } }

	# Use EditorExporter to export
	var exporter = EditorExporter.get_export_preset(preset_name, 0)
	if exporter == null:
		return { "error": { "code": ERR_EXPORTER_NOT_AVAILABLE, "message": "Failed to get export preset: %s" % preset_name } }

	var export_result = EditorInterface.export_with_preset(preset_name)

	if export_result:
		return { "result": { "success": true, "preset": preset_name, "message": "Export completed successfully" } }
	else:
		return { "error": { "code": ERR_EXPORT_FAILED, "message": "Export failed for preset: %s" % preset_name } }


func get_export_info(params: Dictionary) -> Dictionary:
	var project_path = ProjectSettings.get_setting("application/config/name", "")
	if project_path == "":
		project_path = "Unknown Project"

	# Get project export information
	var export_platforms = []
	var export_presets_path = "res://export_presets.cfg"

	# Available export platforms from EditorExporter
	var platform_count = EditorExporter.get_export_platform_count()
	for i in range(platform_count):
		var platform_name = EditorExporter.get_export_platform_name(i)
		var platform_info = {
			"index": i,
			"name": platform_name,
			"description": EditorExporter.get_export_platform_name(i)
		}
		export_platforms.append(platform_info)

	# Load preset details
	var presets = []
	var presets_file = FileAccess.get_file_as_string(export_presets_path)
	if presets_file != "" and FileAccess.get_open_error() == OK:
		var current_preset = null
		var lines = presets_file.split("\n")

		for line in lines:
			line = line.strip_edges()
			if line.begins_with("[") and line.ends_with("]"):
				if current_preset != null:
					presets.append(current_preset)
				var preset_name = line.substr(1, line.length() - 2)
				current_preset = { "name": preset_name, "platform": "", "export_path": "", "dedicated": false, "options": {} }
			elif current_preset != null and line.contains("="):
				var parts = line.split("=")
				if parts.size() >= 2:
					var key = parts[0].strip_edges()
					var value = parts[1].strip_edges()
					match key:
						"name":
							current_preset["name"] = value
						"platform":
							current_preset["platform"] = value
						"export_path":
							current_preset["export_path"] = value
						"dedicated":
							current_preset["dedicated"] = value == "true"
						_:
							current_preset["options"][key] = value

		if current_preset != null:
			presets.append(current_preset)

	return {
		"result": {
			"project": project_path,
			"export_presets_path": export_presets_path,
			"platforms_count": export_platforms.size(),
			"platforms": export_platforms,
			"presets_count": presets.size(),
			"presets": presets
		}
	}