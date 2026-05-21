extends RefCounted

# Error codes for theme commands
const ERR_INVALID_CONTROL = -32602
const ERR_INVALID_THEME_ITEM = -32000
const ERR_NOT_FOUND = -32602

func create_theme(params: Dictionary) -> Dictionary:
	var theme_name = params.get("name", "")
	if theme_name == "":
		return { "error": { "code": ERR_INVALID_THEME_ITEM, "message": "Missing name parameter" } }

	var theme = Theme.new()

	return { "result": { "created": true, "name": theme_name, "theme": theme } }

func set_theme_color(params: Dictionary) -> Dictionary:
	var control_path = params.get("control", "")
	if control_path == "":
		return { "error": { "code": ERR_INVALID_CONTROL, "message": "Missing control parameter" } }

	var control = _find_node_by_path(control_path)
	if control == null:
		return { "error": { "code": ERR_NOT_FOUND, "message": "Control not found at path: %s" % control_path } }

	if not control is Control:
		return { "error": { "code": ERR_INVALID_CONTROL, "message": "Node at path is not a Control: %s" % control_path } }

	var color_name = params.get("color_name", "")
	if color_name == "":
		return { "error": { "code": ERR_INVALID_THEME_ITEM, "message": "Missing color_name parameter" } }

	var color_data = params.get("color", {})
	var color: Color
	if color_data is Dictionary:
		color = Color(
			color_data.get("r", 1.0),
			color_data.get("g", 1.0),
			color_data.get("b", 1.0),
			color_data.get("a", 1.0)
		)
	else:
		color = Color(1.0, 1.0, 1.0, 1.0)

	control.add_theme_color_override(color_name, color)

	return { "result": { "set": true, "color_name": color_name, "path": control_path } }

func set_theme_constant(params: Dictionary) -> Dictionary:
	var control_path = params.get("control", "")
	if control_path == "":
		return { "error": { "code": ERR_INVALID_CONTROL, "message": "Missing control parameter" } }

	var control = _find_node_by_path(control_path)
	if control == null:
		return { "error": { "code": ERR_NOT_FOUND, "message": "Control not found at path: %s" % control_path } }

	if not control is Control:
		return { "error": { "code": ERR_INVALID_CONTROL, "message": "Node at path is not a Control: %s" % control_path } }

	var constant_name = params.get("constant_name", "")
	if constant_name == "":
		return { "error": { "code": ERR_INVALID_THEME_ITEM, "message": "Missing constant_name parameter" } }

	var value = params.get("value", 0)
	if not value is int:
		return { "error": { "code": ERR_INVALID_THEME_ITEM, "message": "Constant value must be an integer" } }

	control.add_theme_constant_override(constant_name, value)

	return { "result": { "set": true, "constant_name": constant_name, "value": value, "path": control_path } }

func set_theme_font_size(params: Dictionary) -> Dictionary:
	var control_path = params.get("control", "")
	if control_path == "":
		return { "error": { "code": ERR_INVALID_CONTROL, "message": "Missing control parameter" } }

	var control = _find_node_by_path(control_path)
	if control == null:
		return { "error": { "code": ERR_NOT_FOUND, "message": "Control not found at path: %s" % control_path } }

	if not control is Control:
		return { "error": { "code": ERR_INVALID_CONTROL, "message": "Node at path is not a Control: %s" % control_path } }

	var font_size_name = params.get("font_size_name", "")
	if font_size_name == "":
		return { "error": { "code": ERR_INVALID_THEME_ITEM, "message": "Missing font_size_name parameter" } }

	var size = params.get("size", 16)
	if not size is int:
		return { "error": { "code": ERR_INVALID_THEME_ITEM, "message": "Font size must be an integer" } }

	control.add_theme_font_size_override(font_size_name, size)

	return { "result": { "set": true, "font_size_name": font_size_name, "size": size, "path": control_path } }

func set_theme_stylebox(params: Dictionary) -> Dictionary:
	var control_path = params.get("control", "")
	if control_path == "":
		return { "error": { "code": ERR_INVALID_CONTROL, "message": "Missing control parameter" } }

	var control = _find_node_by_path(control_path)
	if control == null:
		return { "error": { "code": ERR_NOT_FOUND, "message": "Control not found at path: %s" % control_path } }

	if not control is Control:
		return { "error": { "code": ERR_INVALID_CONTROL, "message": "Node at path is not a Control: %s" % control_path } }

	var stylebox_name = params.get("stylebox_name", "")
	if stylebox_name == "":
		return { "error": { "code": ERR_INVALID_THEME_ITEM, "message": "Missing stylebox_name parameter" } }

	var stylebox_data = params.get("stylebox", {})
	var stylebox: StyleBox

	if stylebox_data is Dictionary:
		var stylebox_type = stylebox_data.get("type", "flat")
		if stylebox_type == "flat":
			stylebox = StyleBoxFlat.new()
			var bg_color = stylebox_data.get("bg_color", {})
			if bg_color is Dictionary:
				stylebox.bg_color = Color(
					bg_color.get("r", 1.0),
					bg_color.get("g", 1.0),
					bg_color.get("b", 1.0),
					bg_color.get("a", 1.0)
				)
			else:
				stylebox.bg_color = Color(1.0, 1.0, 1.0, 1.0)

			var corner_radius = stylebox_data.get("corner_radius_top_left", 0)
			stylebox.set_corner_radius_all(corner_radius)

			var border_width = stylebox_data.get("border_width", 0)
			if border_width > 0:
				stylebox.border_width_left = border_width
				stylebox.border_width_right = border_width
				stylebox.border_width_top = border_width
				stylebox.border_width_bottom = border_width

			var border_color = stylebox_data.get("border_color", {})
			if border_color is Dictionary:
				stylebox.border_color = Color(
					border_color.get("r", 0.0),
					border_color.get("g", 0.0),
					border_color.get("b", 0.0),
					border_color.get("a", 1.0)
				)

			var content_margin = stylebox_data.get("content_margin", -1)
			if content_margin >= 0:
				stylebox.content_margin_left = content_margin
				stylebox.content_margin_right = content_margin
				stylebox.content_margin_top = content_margin
				stylebox.content_margin_bottom = content_margin
		else:
			stylebox = StyleBoxEmpty.new()
	else:
		stylebox = StyleBoxEmpty.new()

	control.add_theme_stylebox_override(stylebox_name, stylebox)

	return { "result": { "set": true, "stylebox_name": stylebox_name, "path": control_path } }

func get_theme_info(params: Dictionary) -> Dictionary:
	var control_path = params.get("control", "")
	if control_path == "":
		return { "error": { "code": ERR_INVALID_CONTROL, "message": "Missing control parameter" } }

	var control = _find_node_by_path(control_path)
	if control == null:
		return { "error": { "code": ERR_NOT_FOUND, "message": "Control not found at path: %s" % control_path } }

	if not control is Control:
		return { "error": { "code": ERR_INVALID_CONTROL, "message": "Node at path is not a Control: %s" % control_path } }

	var theme = control.theme
	var has_theme = theme != null

	var color_overrides = []
	var constant_overrides = []
	var font_size_overrides = []
	var stylebox_overrides = []

	if has_theme:
		# Get default theme items from the theme
		# Note: In Godot 4, getting the list of overrides is not straightforward
		# We can only report that the control has a theme assigned
		pass

	return {
		"result": {
			"has_theme": has_theme,
			"color_overrides": color_overrides,
			"constant_overrides": constant_overrides,
			"font_size_overrides": font_size_overrides,
			"stylebox_overrides": stylebox_overrides,
			"path": control_path,
		}
	}

func _find_node_by_path(path: String) -> Node:
	if path == "" or path == "/":
		return null

	# Handle absolute path from root
	if path.begins_with("/"):
		var root = Engine.get_main_loop().get_root()
		if root == null:
			return null
		var node = root.get_node(path)
		if node != null:
			return node
		return null

	# Handle relative path - try to find in the scene
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