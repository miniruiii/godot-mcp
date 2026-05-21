extends RefCounted

# Error codes for shader commands
const ERR_SHADER_NOT_FOUND = -32001
const ERR_INVALID_SHADER_PATH = -32002
const ERR_NODE_NOT_FOUND = -32003
const ERR_INVALID_NODE_TYPE = -32004
const ERR_MATERIAL_NOT_FOUND = -32005
const ERR_INVALID_SHADER_CODE = -32006
const ERR_INVALID_SHADER_TYPE = -32007

func create_shader(params: Dictionary) -> Dictionary:
	var shader_path = params.get("shader_path", "")
	if shader_path == "":
		return { "error": { "code": ERR_INVALID_SHADER_PATH, "message": "Missing shader_path parameter" } }

	# Ensure path starts with res://
	if not shader_path.begins_with("res://"):
		shader_path = "res://" + shader_path

	# Add .gdshader extension if missing
	if not shader_path.ends_with(".gdshader"):
		shader_path += ".gdshader"

	var shader_type = params.get("type", "spatial")
	var template = _get_shader_template(shader_type)

	var dir = shader_path.get_base_dir()
	var dir_access = DirAccess.open(dir)
	if dir_access == null:
		# Try to create the directory
		var make_dir = DirAccess.open(dir)
		if make_dir == null:
			return { "error": { "code": ERR_INVALID_SHADER_PATH, "message": "Directory does not exist and cannot be created: %s" % dir } }

	var file = FileAccess.open(shader_path, FileAccess.WRITE)
	if file == null:
		return { "error": { "code": ERR_INVALID_SHADER_PATH, "message": "Failed to create shader file: %s" % shader_path } }

	file.store_string(template)
	file.close()

	return {
		"result": {
			"created": true,
			"shader_path": shader_path,
			"type": shader_type
		}
	}


func read_shader(params: Dictionary) -> Dictionary:
	var shader_path = params.get("shader_path", "")
	if shader_path == "":
		return { "error": { "code": ERR_INVALID_SHADER_PATH, "message": "Missing shader_path parameter" } }

	# Ensure res:// prefix
	if not shader_path.begins_with("res://"):
		shader_path = "res://" + shader_path

	var shader = load(shader_path)
	if shader == null:
		return { "error": { "code": ERR_SHADER_NOT_FOUND, "message": "Shader not found: %s" % shader_path } }

	if not shader is Shader:
		return { "error": { "code": ERR_INVALID_SHADER_TYPE, "message": "File is not a Shader: %s" % shader_path } }

	var content = shader.code
	return {
		"result": {
			"shader_path": shader_path,
			"content": content,
			"line_count": content.count("\n") + 1,
			"type": shader.get_mode()
		}
	}


func edit_shader(params: Dictionary) -> Dictionary:
	var shader_path = params.get("shader_path", "")
	if shader_path == "":
		return { "error": { "code": ERR_INVALID_SHADER_PATH, "message": "Missing shader_path parameter" } }

	# Ensure res:// prefix
	if not shader_path.begins_with("res://"):
		shader_path = "res://" + shader_path

	var shader = load(shader_path) as Shader
	if shader == null:
		return { "error": { "code": ERR_SHADER_NOT_FOUND, "message": "Shader not found: %s" % shader_path } }

	var new_content = params.get("content", "")
	var start_line = params.get("start_line", 0)
	var end_line = params.get("end_line", -1)

	var current_content = shader.code
	var lines = current_content.split("\n")

	if start_line > 0 and end_line > start_line:
		# Replace line range
		var before = ""
		var after = ""

		if start_line > 1:
			before = "\n".join(lines.slice(0, start_line - 1)) + "\n"

		if end_line < lines.size():
			after = "\n".join(lines.slice(end_line))

		new_content = before + new_content + after
	elif new_content == "":
		return { "error": { "code": ERR_INVALID_SHADER_CODE, "message": "No content provided for edit" } }

	# Write the updated content
	var file = FileAccess.open(shader_path, FileAccess.WRITE)
	if file == null:
		return { "error": { "code": ERR_INVALID_SHADER_PATH, "message": "Failed to open shader for writing: %s" % shader_path } }

	file.store_string(new_content)
	file.close()

	return {
		"result": {
			"edited": true,
			"shader_path": shader_path,
			"new_line_count": new_content.count("\n") + 1
		}
	}


func assign_shader_material(params: Dictionary) -> Dictionary:
	var node_path = params.get("node_path", "")
	if node_path == "":
		return { "error": { "code": ERR_NODE_NOT_FOUND, "message": "Missing node_path parameter" } }

	var shader_path = params.get("shader_path", "")
	if shader_path == "":
		return { "error": { "code": ERR_INVALID_SHADER_PATH, "message": "Missing shader_path parameter" } }

	var node = _find_node_by_path(node_path)
	if node == null:
		return { "error": { "code": ERR_NODE_NOT_FOUND, "message": "Node not found: %s" % node_path } }

	# Ensure res:// prefix
	if not shader_path.begins_with("res://"):
		shader_path = "res://" + shader_path

	var shader = load(shader_path) as Shader
	if shader == null:
		return { "error": { "code": ERR_SHADER_NOT_FOUND, "message": "Shader not found: %s" % shader_path } }

	# Create ShaderMaterial
	var material = ShaderMaterial.new()
	material.shader = shader

	# Assign to node (works for any geometry node with material override)
	var success = false
	if node is GeometryInstance3D:
		node.material_override = material
		success = true
	elif node is Node2D:
		node.material = material
		success = true
	else:
		# Try generic approach for any CanvasItem or Node3D
		if node.has_method("set_material_override"):
			node.set_material_override(material)
			success = true
		elif node.has_method("set_material"):
			node.set_material(material)
			success = true

	if not success:
		return { "error": { "code": ERR_INVALID_NODE_TYPE, "message": "Node does not support material assignment: %s" % node_path } }

	return {
		"result": {
			"assigned": true,
			"node_path": node_path,
			"shader_path": shader_path,
			"material_type": "ShaderMaterial"
		}
	}


func set_shader_param(params: Dictionary) -> Dictionary:
	var node_path = params.get("node_path", "")
	if node_path == "":
		return { "error": { "code": ERR_NODE_NOT_FOUND, "message": "Missing node_path parameter" } }

	var param_name = params.get("param", "")
	if param_name == "":
		return { "error": { "code": ERR_INVALID_SHADER_CODE, "message": "Missing param name" } }

	var value = params.get("value", null)

	var node = _find_node_by_path(node_path)
	if node == null:
		return { "error": { "code": ERR_NODE_NOT_FOUND, "message": "Node not found: %s" % node_path } }

	var material = null
	if node is GeometryInstance3D:
		material = node.material_override
	elif node is Node2D:
		material = node.material

	if material == null or not material is ShaderMaterial:
		return { "error": { "code": ERR_MATERIAL_NOT_FOUND, "message": "Node does not have a ShaderMaterial: %s" % node_path } }

	var shader_material = material as ShaderMaterial

	# Convert value based on type
	var converted_value = _convert_param_value(value)

	shader_material.set_shader_parameter(param_name, converted_value)

	return {
		"result": {
			"set": true,
			"node_path": node_path,
			"param": param_name,
			"value": value
		}
	}


func get_shader_params(params: Dictionary) -> Dictionary:
	var shader_path = params.get("shader_path", "")

	if shader_path != "":
		# Get from shader file
		if not shader_path.begins_with("res://"):
			shader_path = "res://" + shader_path

		var shader = load(shader_path) as Shader
		if shader == null:
			return { "error": { "code": ERR_SHADER_NOT_FOUND, "message": "Shader not found: %s" % shader_path } }

		var content = shader.code
		var uniforms = _parse_shader_uniforms(content)
		return {
			"result": {
				"shader_path": shader_path,
				"uniforms": uniforms
			}
		}
	else:
		# Get from node
		var node_path = params.get("node_path", "")
		if node_path == "":
			return { "error": { "code": ERR_NODE_NOT_FOUND, "message": "Missing shader_path or node_path" } }

		var node = _find_node_by_path(node_path)
		if node == null:
			return { "error": { "code": ERR_NODE_NOT_FOUND, "message": "Node not found: %s" % node_path } }

		var material = null
		if node is GeometryInstance3D:
			material = node.material_override
		elif node is Node2D:
			material = node.material

		if material == null or not material is ShaderMaterial:
			return { "error": { "code": ERR_MATERIAL_NOT_FOUND, "message": "Node does not have a ShaderMaterial: %s" % node_path } }

		var shader_material = material as ShaderMaterial
		var shader = shader_material.shader

		var content = ""
		if shader != null:
			content = shader.code

		var uniforms = _parse_shader_uniforms(content)

		# Also get current parameter values
		var param_values = {}
		for uniform in uniforms:
			var value = shader_material.get_shader_parameter(uniform.get("name", ""))
			param_values[uniform.get("name", "")] = value

		return {
			"result": {
				"node_path": node_path,
				"uniforms": uniforms,
				"values": param_values
			}
		}


func _get_shader_template(shader_type: String) -> String:
	match shader_type:
		"spatial":
			return """shader_type spatial;

render_mode blend_mix, depth_draw_opaque, cull_back, diffuse_burley, specular_schlick_lgg;

uniform vec3 albedo : source_color = vec3(1.0);
uniform float roughness : hint_range(0.0, 1.0) = 0.5;
uniform float metallic : hint_range(0.0, 1.0) = 0.0;

void fragment() {
	ALBEDO = albedo;
	ROUGHNESS = roughness;
	METALLIC = metallic;
}
"""
		"canvas_item":
			return """shader_type canvas_item;

uniform vec4 modulate : source_color = vec4(1.0, 1.0, 1.0, 1.0);

void fragment() {
	COLOR = modulate;
}
"""
		"particles":
			return """shader_type particles;

uniform float lifetime = 5.0;
uniform vec3 gravity = vec3(0.0, -980.0, 0.0);

void start() {
}

void process() {
}
"""
		"sky":
			return """shader_type sky;

uniform vec4 sky_color : source_color = vec4(0.5, 0.7, 1.0, 1.0);
uniform float sun_angle = 0.0;

void fragment() {
	COLOR = sky_color;
}
"""
		"visual_server":
			return """shader_type visual_server;

uniform vec4 color : source_color = vec4(1.0, 1.0, 1.0, 1.0);

void fragment() {
	COLOR = color;
}
"""
		_:
			return """shader_type spatial;

uniform vec3 albedo : source_color = vec3(1.0);

void fragment() {
	ALBEDO = albedo;
}
"""


func _parse_shader_uniforms(shader_code: String) -> Array:
	var uniforms = []
	var lines = shader_code.split("\n")

	for line in lines:
		var trimmed = line.strip_edges()
		if trimmed.begins_with("uniform "):
			# Parse uniform declaration
			# Format: uniform <type> <name> [: hint] [= default];
			var parts = trimmed.substr(8).split("=")
			var declaration = parts[0].strip_edges()

			var type = ""
			var name = ""

			# Handle hints like : source_color
			if declaration.find(":") != -1:
				var decl_parts = declaration.split(":")
				var type_name = decl_parts[0].strip_edges()
				var hint = decl_parts[1].strip_edges()

				var type_name_parts = type_name.split(" ")
				if type_name_parts.size() >= 2:
					type = type_name_parts[0]
					name = type_name_parts[1]
				uniforms.append({
					"name": name,
					"type": type,
					"hint": hint
				})
			else:
				var type_name_parts = declaration.split(" ")
				if type_name_parts.size() >= 2:
					type = type_name_parts[0]
					name = type_name_parts[1]
				uniforms.append({
					"name": name,
					"type": type
				})

	return uniforms


func _convert_param_value(value: Variant) -> Variant:
	if value is Dictionary:
		# Handle structured values like { "type": "Vector3", "values": [1, 2, 3] }
		var value_type = value.get("type", "")
		var values = value.get("values", [])

		match value_type:
			"Vector2":
				if values.size() >= 2:
					return Vector2(float(values[0]), float(values[1]))
			"Vector3":
				if values.size() >= 3:
					return Vector3(float(values[0]), float(values[1]), float(values[2]))
			"Vector4":
				if values.size() >= 4:
					return Vector4(float(values[0]), float(values[1]), float(values[2]), float(values[3]))
			"Color":
				if values.size() >= 4:
					return Color(float(values[0]), float(values[1]), float(values[2]), float(values[3]))
				elif values.size() >= 3:
					return Color(float(values[0]), float(values[1]), float(values[2]))
			"int":
				if values.size() >= 1:
					return int(values[0])
			"float":
				if values.size() >= 1:
					return float(values[0])
			_:
				# Try to parse color from hex or named color
				if value.has("hex"):
					return Color(value.get("hex", "#ffffff"))
				elif value.has("r"):
					return Color(float(value.get("r", 1)), float(value.get("g", 1)), float(value.get("b", 1)), float(value.get("a", 1)))

	return value


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