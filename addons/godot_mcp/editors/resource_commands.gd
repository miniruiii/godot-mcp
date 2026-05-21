extends RefCounted

# Error codes for resource commands
const ERR_INVALID_RESOURCE = -32602
const ERR_NOT_FOUND = -32602
const ERR_INVALID_PATH = -32000
const ERR_INVALID_AUTOLOAD = -32000

func read_resource(params: Dictionary) -> Dictionary:
	var resource_path = params.get("path", "")
	if resource_path == "":
		return { "error": { "code": ERR_INVALID_PATH, "message": "Missing path parameter" } }

	if not resource_path.begins_with("res://"):
		resource_path = "res://" + resource_path

	if not ResourceLoader.exists(resource_path):
		return { "error": { "code": ERR_NOT_FOUND, "message": "Resource not found: %s" % resource_path } }

	var resource = ResourceLoader.load(resource_path)
	if resource == null:
		return { "error": { "code": ERR_INVALID_RESOURCE, "message": "Failed to load resource: %s" % resource_path } }

	# Get resource properties
	var properties = {}
	if resource is Resource:
		for property in resource.get_property_list():
			var name = property["name"]
			if not name.begins_with("_"):
				properties[name] = {
					"type": property["type"],
					"value": _variant_to_dict(resource.get(name))
				}

	return {
		"result": {
			"path": resource_path,
			"type": _get_type_name(resource),
			"properties": properties
		}
	}

func edit_resource(params: Dictionary) -> Dictionary:
	var resource_path = params.get("path", "")
	if resource_path == "":
		return { "error": { "code": ERR_INVALID_PATH, "message": "Missing path parameter" } }

	if not resource_path.begins_with("res://"):
		resource_path = "res://" + resource_path

	if not ResourceLoader.exists(resource_path):
		return { "error": { "code": ERR_NOT_FOUND, "message": "Resource not found: %s" % resource_path } }

	var resource = ResourceLoader.load(resource_path)
	if resource == null:
		return { "error": { "code": ERR_INVALID_RESOURCE, "message": "Failed to load resource: %s" % resource_path } }

	var changes = params.get("changes", {})
	var property_name = params.get("property", "")

	if property_name != "":
		# Single property update
		var value = changes if not changes is Dictionary else changes.get("value", null)
		resource.set(property_name, _parse_value(value))
	else:
		# Multiple property updates from dict
		for key in changes:
			if not key.begins_with("_"):
				resource.set(key, _parse_value(changes[key]))

	var error = ResourceSaver.save(resource, resource_path)
	if error != OK:
		return { "error": { "code": ERR_INVALID_RESOURCE, "message": "Failed to save resource: %s" % resource_path } }

	return { "result": { "saved": true, "path": resource_path, "property": property_name } }

func create_resource(params: Dictionary) -> Dictionary:
	var resource_path = params.get("path", "")
	if resource_path == "":
		return { "error": { "code": ERR_INVALID_PATH, "message": "Missing path parameter" } }

	if not resource_path.begins_with("res://"):
		resource_path = "res://" + resource_path

	if ResourceLoader.exists(resource_path):
		return { "error": { "code": ERR_INVALID_RESOURCE, "message": "Resource already exists: %s" % resource_path } }

	var resource_type = params.get("type", "Resource")
	var properties = params.get("properties", {})

	var resource: Resource
	match resource_type:
		"Resource":
			resource = Resource.new()
		"ConfigFile":
			resource = ConfigFile.new()
		"Theme":
			resource = Theme.new()
		"AudioStream":
			resource = AudioStream.new()
		"PackedScene":
			resource = PackedScene.new()
		"Shader":
			resource = Shader.new()
		"StyleBox":
			resource = StyleBoxFlat.new()
		"Animation":
			resource = Animation.new()
		"TileSet":
			resource = TileSet.new()
		"PhysicsMaterial":
			resource = PhysicsMaterial.new()
		"Shape2D":
			resource = RectangleShape2D.new()
		"Shape3D":
			resource = BoxShape3D.new()
		"Mesh":
			resource = ArrayMesh.new()
		"Material":
			resource = StandardMaterial3D.new()
		"Texture2D":
			resource = ImageTexture.new()
		"NavigationMesh":
			resource = NavigationMesh.new()
		"AudioStreamPlayer":
			resource = AudioStreamPlayer.new()
		"CylinderShape3D":
			resource = CylinderShape3D.new()
		"SphereShape3D":
			resource = SphereShape3D.new()
		"CapsuleShape2D":
			resource = CapsuleShape2D.new()
		"CapsuleShape3D":
			resource = CapsuleShape3D.new()
		"ConvexPolygonShape3D":
			resource = ConvexPolygonShape3D.new()
		"ConcavePolygonShape3D":
			resource = ConcavePolygonShape3D.new()
		"VisibilityEnabler2D":
			resource = VisibilityEnabler2D.new()
		"VisibilityEnabler3D":
			resource = VisibilityEnabler3D.new()
		"Curve2D":
			resource = Curve2D.new()
		"Curve3D":
			resource = Curve3D.new()
		"Gradient":
			resource = Gradient.new()
		"GradientTexture2D":
			resource = GradientTexture2D.new()
		"ImageTexture":
			resource = ImageTexture.new()
		"ProceduralSkyMaterial":
			resource = ProceduralSkyMaterial.new()
		"PhysicalSkyMaterial":
			resource = PhysicalSkyMaterial.new()
		"PanoramaSkyMaterial":
			resource = PanoramaSkyMaterial.new()
		"StringTexture":
			resource = StringTexture.new()
		"StyleBoxEmpty":
			resource = StyleBoxEmpty.new()
		"StyleBoxFlat":
			resource = StyleBoxFlat.new()
		"StyleBoxTexture":
			resource = StyleBoxTexture.new()
		"World2D":
			resource = World2D.new()
		"World3D":
			resource = World3D.new()
		"WorldEnvironment":
			resource = WorldEnvironment.new()
		"OccupancyRegion":
			resource = OccupancyRegion.new()
		"MultiplayerAPI":
			resource = MultiplayerAPI.new()
		"SceneState":
			resource = SceneState.new()
		"NodeState":
			resource = NodeState.new()
		"PacketPeer":
			resource = PacketPeer.new()
		"PacketPeerUDP":
			resource = PacketPeerUDP.new()
		"PacketPeerStream":
			resource = PacketPeerStream.new()
		"NetworkedMultiplayerPeer":
			resource = NetworkedMultiplayerPeer.new()
		"StreamPeer":
			resource = StreamPeer.new()
		"StreamPeerSSL":
			resource = StreamPeerSSL.new()
		"StreamPeerTCP":
			resource = StreamPeerTCP.new()
		"TCP_Server":
			resource = TCP_Server.new()
		"UniqueNetworkedMultiplayerPeer":
			resource = UniqueNetworkedMultiplayerPeer.new()
		"WebSocketClient":
			resource = WebSocketClient.new()
		"WebSocketServer":
			resource = WebSocketServer.new()
		"HTTPRequest":
			resource = HTTPRequest.new()
		"HTTPClient":
			resource = HTTPClient.new()
		"ValidationContext":
			resource = ValidationContext.new()
		"EditorExportPlatform":
			resource = EditorExportPlatform.new()
		"EditorExportPlatformAndroid":
			resource = EditorExportPlatformAndroid.new()
		"EditorExportPlatformiOS":
			resource = EditorExportPlatformiOS.new()
		"EditorExportPlatformPC":
			resource = EditorExportPlatformPC.new()
		"EditorExportPlatformWeb":
			resource = EditorExportPlatformWeb.new()
		"EditorExportPlatformX11":
			resource = EditorExportPlatformX11.new()
		"EditorExportPlugin":
			resource = EditorExportPlugin.new()
		"EditorInspectorPlugin":
			resource = EditorInspectorPlugin.new()
		"EditorNodeGlitchPlugin":
			resource = EditorNodeGlitchPlugin.new()
		"EditorPlugin":
			resource = EditorPlugin.new()
		"EditorResourcePreviewPlugin":
			resource = EditorResourcePreviewPlugin.new()
		"EditorSceneFormatImporter":
			resource = EditorSceneFormatImporter.new()
		"EditorSceneFormatImporterFBX":
			resource = EditorSceneFormatImporterFBX.new()
		"EditorSceneFormatImporterGLTF":
			resource = EditorSceneFormatImporterGLTF.new()
		"EditorScenePostImportPlugin":
			resource = EditorScenePostImportPlugin.new()
		"EditorSpatialGizmoPlugin":
			resource = EditorSpatialGizmoPlugin.new()
		"EditorVCSInterface":
			resource = EditorVCSInterface.new()
		_:
			resource = Resource.new()

	# Apply initial properties if provided
	for key in properties:
		if not key.begins_with("_"):
			resource.set(key, _parse_value(properties[key]))

	var error = ResourceSaver.save(resource, resource_path)
	if error != OK:
		return { "error": { "code": ERR_INVALID_RESOURCE, "message": "Failed to create resource: %s" % resource_path } }

	return { "result": { "created": true, "path": resource_path, "type": resource_type } }

func get_resource_preview(params: Dictionary) -> Dictionary:
	var resource_path = params.get("path", "")
	if resource_path == "":
		return { "error": { "code": ERR_INVALID_PATH, "message": "Missing path parameter" } }

	if not resource_path.begins_with("res://"):
		resource_path = "res://" + resource_path

	if not ResourceLoader.exists(resource_path):
		return { "error": { "code": ERR_NOT_FOUND, "message": "Resource not found: %s" % resource_path } }

	var resource = ResourceLoader.load(resource_path)
	if resource == null:
		return { "error": { "code": ERR_INVALID_RESOURCE, "message": "Failed to load resource: %s" % resource_path } }

	var preview_path = ""
	var has_preview = false

	# Check for preview texture in common properties
	if resource has("texture"):
		var texture = resource.get("texture")
		if texture != null and texture is Texture2D:
			preview_path = resource_path
			has_preview = true
	elif resource has("icon"):
		var icon = resource.get("icon")
		if icon != null and icon is Texture2D:
			preview_path = resource_path
			has_preview = true
	elif resource is Texture2D:
		preview_path = resource_path
		has_preview = true
	elif resource is Image:
		preview_path = resource_path
		has_preview = true
	elif resource is StreamTexture:
		preview_path = resource_path
		has_preview = true
	elif resource is PackedScene:
		preview_path = resource_path
		has_preview = true
	elif resource is Mesh:
		preview_path = resource_path
		has_preview = true
	elif resource is Shader:
		preview_path = resource_path
		has_preview = true

	# Try to get thumbnail from EditorInterface
	var thumbnail_path = ""
	var editor_interface = Engine.get_main_loop().root.find_child("EditorNode", true, false)
	if editor_interface != null:
		# Editor preview is available through the editor's resource preview system
		thumbnail_path = resource_path

	return {
		"result": {
			"path": resource_path,
			"has_preview": has_preview,
			"preview_path": preview_path,
			"thumbnail_path": thumbnail_path,
			"type": _get_type_name(resource)
		}
	}

func add_autoload(params: Dictionary) -> Dictionary:
	var autoload_name = params.get("name", "")
	if autoload_name == "":
		return { "error": { "code": ERR_INVALID_AUTOLOAD, "message": "Missing name parameter" } }

	var autoload_path = params.get("path", "")
	if autoload_path == "":
		return { "error": { "code": ERR_INVALID_AUTOLOAD, "message": "Missing path parameter" } }

	if not autoload_path.begins_with("res://"):
		autoload_path = "res://" + autoload_path

	# Read project.godot
	var project_path = "res://project.godot"
	if not FileAccess.file_exists(project_path):
		return { "error": { "code": ERR_NOT_FOUND, "message": "project.godot not found" } }

	var config = ConfigFile.new()
	var error = config.load(project_path)
	if error != OK:
		return { "error": { "code": ERR_INVALID_AUTOLOAD, "message": "Failed to load project.godot" } }

	# Check if autoload already exists
	var autoloads = config.get_value("autoload", autoload_name, null)
	if autoloads != null:
		return { "error": { "code": ERR_INVALID_AUTOLOAD, "message": "Autoload already exists: %s" % autoload_name } }

	# Add the autoload entry
	# Format: [path, is_singleton, is_active]
	config.set_value("autoload", autoload_name, [autoload_path, true, true])

	error = config.save(project_path)
	if error != OK:
		return { "error": { "code": ERR_INVALID_AUTOLOAD, "message": "Failed to save project.godot" } }

	return { "result": { "added": true, "name": autoload_name, "path": autoload_path } }

func remove_autoload(params: Dictionary) -> Dictionary:
	var autoload_name = params.get("name", "")
	if autoload_name == "":
		return { "error": { "code": ERR_INVALID_AUTOLOAD, "message": "Missing name parameter" } }

	# Read project.godot
	var project_path = "res://project.godot"
	if not FileAccess.file_exists(project_path):
		return { "error": { "code": ERR_NOT_FOUND, "message": "project.godot not found" } }

	var config = ConfigFile.new()
	var error = config.load(project_path)
	if error != OK:
		return { "error": { "code": ERR_INVALID_AUTOLOAD, "message": "Failed to load project.godot" } }

	# Check if autoload exists
	var autoloads = config.get_value("autoload", autoload_name, null)
	if autoloads == null:
		return { "error": { "code": ERR_NOT_FOUND, "message": "Autoload not found: %s" % autoload_name } }

	# Remove the autoload entry
	var section_data = config.get_section_values("autoload")
	if section_data != null and section_data.has(autoload_name):
		section_data.erase(autoload_name)
		# Save the section back
		for key in section_data:
			config.set_value("autoload", key, section_data[key])

	error = config.save(project_path)
	if error != OK:
		return { "error": { "code": ERR_INVALID_AUTOLOAD, "message": "Failed to save project.godot" } }

	return { "result": { "removed": true, "name": autoload_name } }

func _get_type_name(resource: Resource) -> String:
	var class_name = resource.get_class()
	if resource is AudioStream:
		return "AudioStream"
	if resource is Animation:
		return "Animation"
	if resource is Mesh:
		return "Mesh"
	if resource is PackedScene:
		return "PackedScene"
	if resource is Shader:
		return "Shader"
	if resource is StyleBox:
		return "StyleBox"
	if resource is Theme:
		return "Theme"
	if resource is TileSet:
		return "TileSet"
	if resource is PhysicsMaterial:
		return "PhysicsMaterial"
	if resource is Image:
		return "Image"
	if resource is Texture2D:
		return "Texture2D"
	if resource is ConfigFile:
		return "ConfigFile"
	return class_name

func _variant_to_dict(value: Variant) -> Variant:
	if value == null:
		return null
	if value is bool or value is int or value is float or value is String:
		return value
	if value is Vector2:
		return { "type": "vector2", "x": value.x, "y": value.y }
	if value is Vector2i:
		return { "type": "vector2i", "x": value.x, "y": value.y }
	if value is Vector3:
		return { "type": "vector3", "x": value.x, "y": value.y, "z": value.z }
	if value is Vector3i:
		return { "type": "vector3i", "x": value.x, "y": value.y, "z": value.z }
	if value is Vector4:
		return { "type": "vector4", "x": value.x, "y": value.y, "z": value.z, "w": value.w }
	if value is Vector4i:
		return { "type": "vector4i", "x": value.x, "y": value.y, "z": value.z, "w": value.w }
	if value is Color:
		return { "type": "color", "r": value.r, "g": value.g, "b": value.b, "a": value.a }
	if value is Rect2:
		return { "type": "rect2", "position": _variant_to_dict(value.position), "size": _variant_to_dict(value.size) }
	if value is Rect2i:
		return { "type": "rect2i", "position": _variant_to_dict(value.position), "size": _variant_to_dict(value.size) }
	if value is Transform2D:
		return {
			"type": "transform2d",
			"x": _variant_to_dict(value.x),
			"y": _variant_to_dict(value.y),
			"origin": _variant_to_dict(value.origin)
		}
	if value is Transform3D:
		return {
			"type": "transform3d",
			"basis": _variant_to_dict(value.basis),
			"origin": _variant_to_dict(value.origin)
		}
	if value is Basis:
		return {
			"type": "basis",
			"x": _variant_to_dict(value.x),
			"y": _variant_to_dict(value.y),
			"z": _variant_to_dict(value.z)
		}
	if value is Quaternion:
		return { "type": "quaternion", "x": value.x, "y": value.y, "z": value.z, "w": value.w }
	if value is NodePath:
		return { "type": "node_path", "path": str(value) }
	if value is Dictionary:
		var dict_result = {}
		for key in value:
			dict_result[key] = _variant_to_dict(value[key])
		return dict_result
	if value is Array:
		var array_result = []
		for item in value:
			array_result.append(_variant_to_dict(item))
		return array_result
	if value is Color:
		return { "type": "color", "r": value.r, "g": value.g, "b": value.b, "a": value.a }
	if value is AABB:
		return {
			"type": "aabb",
			"position": _variant_to_dict(value.position),
			"size": _variant_to_dict(value.size)
		}
	if value is EncodingAttribute:
		return { "type": "encoding_attribute", "name": value.name, "value": value.value }
	if value is PackedByteArray:
		return { "type": "packed_byte_array", "data": Array(value) }
	if value is PackedInt32Array:
		return { "type": "packed_int32_array", "data": Array(value) }
	if value is PackedInt64Array:
		return { "type": "packed_int64_array", "data": Array(value) }
	if value is PackedFloat32Array:
		return { "type": "packed_float32_array", "data": Array(value) }
	if value is PackedFloat64Array:
		return { "type": "packed_float64_array", "data": Array(value) }
	if value is PackedStringArray:
		return { "type": "packed_string_array", "data": Array(value) }
	if value is PackedVector2Array:
		var items = []
		for item in value:
			items.append(_variant_to_dict(item))
		return { "type": "packed_vector2_array", "data": items }
	if value is PackedVector3Array:
		var items = []
		for item in value:
			items.append(_variant_to_dict(item))
		return { "type": "packed_vector3_array", "data": items }
	if value is PackedColorArray:
		var items = []
		for item in value:
			items.append(_variant_to_dict(item))
		return { "type": "packed_color_array", "data": items }
	return str(value)

func _parse_value(value) -> Variant:
	if value == null:
		return null
	if value is Dictionary:
		var type = value.get("type", "")
		match type:
			"vector2": return Vector2(value.get("x", 0), value.get("y", 0))
			"vector2i": return Vector2i(value.get("x", 0), value.get("y", 0))
			"vector3": return Vector3(value.get("x", 0), value.get("y", 0), value.get("z", 0))
			"vector3i": return Vector3i(value.get("x", 0), value.get("y", 0), value.get("z", 0))
			"vector4": return Vector4(value.get("x", 0), value.get("y", 0), value.get("z", 0), value.get("w", 0))
			"vector4i": return Vector4i(value.get("x", 0), value.get("y", 0), value.get("z", 0), value.get("w", 0))
			"color": return Color(value.get("r", 1), value.get("g", 1), value.get("b", 1), value.get("a", 1))
			"rect2": return Rect2(_parse_value(value.get("position")), _parse_value(value.get("size")))
			"rect2i": return Rect2i(_parse_value(value.get("position")), _parse_value(value.get("size")))
			"transform2d": return Transform2D(_parse_value(value.get("x")), _parse_value(value.get("y")), _parse_value(value.get("origin")))
			"transform3d": return Transform3D(_parse_value(value.get("basis")), _parse_value(value.get("origin")))
			"basis": return Basis(_parse_value(value.get("x")), _parse_value(value.get("y")), _parse_value(value.get("z")))
			"quaternion": return Quaternion(value.get("x", 0), value.get("y", 0), value.get("z", 0), value.get("w", 1))
			"node_path": return NodePath(value.get("path", ""))
			"aabb": return AABB(_parse_value(value.get("position")), _parse_value(value.get("size")))
		return value
	if value is Array:
		var result = []
		for item in value:
			result.append(_parse_value(item))
		return result
	return value

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