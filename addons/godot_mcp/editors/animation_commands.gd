extends RefCounted

# Error codes for animation commands
const ERR_INVALID_ANIMATION_PLAYER = -32602
const ERR_INVALID_ANIMATION = -32602
const ERR_INVALID_TRACK = -32000
const ERR_INVALID_NODE_PATH = -32001
const ERR_INVALID_VALUE = -32000

func list_animations(params: Dictionary) -> Dictionary:
	var player_path = params.get("animation_player", "")
	if player_path == "":
		return { "error": { "code": ERR_INVALID_ANIMATION_PLAYER, "message": "Missing animation_player parameter" } }

	var player = _find_node_by_path(player_path)
	if player == null:
		return { "error": { "code": ERR_INVALID_NODE_PATH, "message": "AnimationPlayer not found at path: %s" % player_path } }

	if not player is AnimationPlayer:
		return { "error": { "code": ERR_INVALID_ANIMATION_PLAYER, "message": "Node at path is not an AnimationPlayer: %s" % player_path } }

	var animation_names = player.get_animation_list()
	var animations = []

	for name in animation_names:
		var anim = player.get_animation(name)
		if anim != null:
			animations.append({
				"name": name,
				"duration": anim.length,
			})

	return { "result": { "animations": animations } }

func create_animation(params: Dictionary) -> Dictionary:
	var player_path = params.get("animation_player", "")
	if player_path == "":
		return { "error": { "code": ERR_INVALID_ANIMATION_PLAYER, "message": "Missing animation_player parameter" } }

	var player = _find_node_by_path(player_path)
	if player == null:
		return { "error": { "code": ERR_INVALID_NODE_PATH, "message": "AnimationPlayer not found at path: %s" % player_path } }

	if not player is AnimationPlayer:
		return { "error": { "code": ERR_INVALID_ANIMATION_PLAYER, "message": "Node at path is not an AnimationPlayer: %s" % player_path } }

	var animation_name = params.get("name", "")
	if animation_name == "":
		return { "error": { "code": ERR_INVALID_ANIMATION, "message": "Missing name parameter" } }

	# Check if animation already exists
	var existing = player.get_animation(animation_name)
	if existing != null:
		return { "error": { "code": ERR_INVALID_ANIMATION, "message": "Animation already exists: %s" % animation_name } }

	var animation = Animation.new()
	player.add_animation(animation_name, animation)

	return { "result": { "created": true, "name": animation_name } }

func add_animation_track(params: Dictionary) -> Dictionary:
	var player_path = params.get("animation_player", "")
	if player_path == "":
		return { "error": { "code": ERR_INVALID_ANIMATION_PLAYER, "message": "Missing animation_player parameter" } }

	var player = _find_node_by_path(player_path)
	if player == null:
		return { "error": { "code": ERR_INVALID_NODE_PATH, "message": "AnimationPlayer not found at path: %s" % player_path } }

	if not player is AnimationPlayer:
		return { "error": { "code": ERR_INVALID_ANIMATION_PLAYER, "message": "Node at path is not an AnimationPlayer: %s" % player_path } }

	var animation_name = params.get("animation", "")
	if animation_name == "":
		return { "error": { "code": ERR_INVALID_ANIMATION, "message": "Missing animation parameter" } }

	var anim = player.get_animation(animation_name)
	if anim == null:
		return { "error": { "code": ERR_INVALID_ANIMATION, "message": "Animation not found: %s" % animation_name } }

	var track_type = params.get("track_type", "value")
	var track_path = params.get("track_path", "")

	var type = Animation.TYPE_VALUE
	if track_type == "position":
		type = Animation.TYPE_POSITION_3D
	elif track_type == "rotation":
		type = Animation.TYPE_ROTATION_3D
	elif track_type == "scale":
		type = Animation.TYPE_SCALE_3D
	elif track_type == "method":
		type = Animation.TYPE_METHOD
	elif track_type == "bezier":
		type = Animation.TYPE_BEZIER
	elif track_type == "audio":
		type = Animation.TYPE_AUDIO
	elif track_type == "animation":
		type = Animation.TYPE_ANIMATION

	var track_index = anim.add_track(type)

	if track_path != "":
		anim.track_set_path(track_index, track_path)

	return { "result": { "track_index": track_index, "track_type": track_type } }

func set_animation_keyframe(params: Dictionary) -> Dictionary:
	var player_path = params.get("animation_player", "")
	if player_path == "":
		return { "error": { "code": ERR_INVALID_ANIMATION_PLAYER, "message": "Missing animation_player parameter" } }

	var player = _find_node_by_path(player_path)
	if player == null:
		return { "error": { "code": ERR_INVALID_NODE_PATH, "message": "AnimationPlayer not found at path: %s" % player_path } }

	if not player is AnimationPlayer:
		return { "error": { "code": ERR_INVALID_ANIMATION_PLAYER, "message": "Node at path is not an AnimationPlayer: %s" % player_path } }

	var animation_name = params.get("animation", "")
	if animation_name == "":
		return { "error": { "code": ERR_INVALID_ANIMATION, "message": "Missing animation parameter" } }

	var anim = player.get_animation(animation_name)
	if anim == null:
		return { "error": { "code": ERR_INVALID_ANIMATION, "message": "Animation not found: %s" % animation_name } }

	var track_index = params.get("track_index", -1)
	if track_index < 0 or track_index >= anim.get_track_count():
		return { "error": { "code": ERR_INVALID_TRACK, "message": "Invalid track index: %d" % track_index } }

	var time = params.get("time", 0.0)
	var key_index = params.get("key_index", -1)

	var value = _parse_value(params.get("value", null))

	if key_index < 0:
		# Insert keyframe at the given time
		key_index = anim.track_insert_key(track_index, time, value)
	else:
		# Update existing keyframe
		anim.track_set_key_value(track_index, key_index, value)

	return { "result": { "track_index": track_index, "key_index": key_index, "time": time, "value": value } }

func get_animation_info(params: Dictionary) -> Dictionary:
	var player_path = params.get("animation_player", "")
	if player_path == "":
		return { "error": { "code": ERR_INVALID_ANIMATION_PLAYER, "message": "Missing animation_player parameter" } }

	var player = _find_node_by_path(player_path)
	if player == null:
		return { "error": { "code": ERR_INVALID_NODE_PATH, "message": "AnimationPlayer not found at path: %s" % player_path } }

	if not player is AnimationPlayer:
		return { "error": { "code": ERR_INVALID_ANIMATION_PLAYER, "message": "Node at path is not an AnimationPlayer: %s" % player_path } }

	var animation_name = params.get("animation", "")
	if animation_name == "":
		return { "error": { "code": ERR_INVALID_ANIMATION, "message": "Missing animation parameter" } }

	var anim = player.get_animation(animation_name)
	if anim == null:
		return { "error": { "code": ERR_INVALID_ANIMATION, "message": "Animation not found: %s" % animation_name } }

	return {
		"result": {
			"name": animation_name,
			"length": anim.length,
			"track_count": anim.get_track_count(),
		}
	}

func remove_animation(params: Dictionary) -> Dictionary:
	var player_path = params.get("animation_player", "")
	if player_path == "":
		return { "error": { "code": ERR_INVALID_ANIMATION_PLAYER, "message": "Missing animation_player parameter" } }

	var player = _find_node_by_path(player_path)
	if player == null:
		return { "error": { "code": ERR_INVALID_NODE_PATH, "message": "AnimationPlayer not found at path: %s" % player_path } }

	if not player is AnimationPlayer:
		return { "error": { "code": ERR_INVALID_ANIMATION_PLAYER, "message": "Node at path is not an AnimationPlayer: %s" % player_path } }

	var animation_name = params.get("animation", "")
	if animation_name == "":
		return { "error": { "code": ERR_INVALID_ANIMATION, "message": "Missing animation parameter" } }

	var anim = player.get_animation(animation_name)
	if anim == null:
		return { "error": { "code": ERR_INVALID_ANIMATION, "message": "Animation not found: %s" % animation_name } }

	player.remove_animation(animation_name)

	return { "result": { "removed": true, "name": animation_name } }

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

func _parse_value(value) -> Variant:
	if value == null:
		return null

	if value is Dictionary:
		# Handle typed dictionaries for Vector2, Vector3, Color, etc.
		var type = value.get("type", "")
		if type == "vector2":
			return Vector2(value.get("x", 0), value.get("y", 0))
		elif type == "vector3":
			return Vector3(value.get("x", 0), value.get("y", 0), value.get("z", 0))
		elif type == "vector4":
			return Vector4(value.get("x", 0), value.get("y", 0), value.get("z", 0), value.get("w", 0))
		elif type == "color":
			return Color(value.get("r", 0), value.get("g", 0), value.get("b", 0), value.get("a", 1))
		elif type == "rect2":
			return Rect2(value.get("position", Vector2.ZERO), value.get("size", Vector2.ZERO))
		elif type == "transform2d":
			var x = value.get("x", Vector2.ZERO)
			var y = value.get("y", Vector2.ZERO)
			var origin = value.get("origin", Vector2.ZERO)
			return Transform2D(x, y, origin)
		elif type == "transform3d":
			var basis = value.get("basis", {})
			var origin = value.get("origin", Vector3.ZERO)
			var basis_obj = Basis(
				basis.get("x", Vector3.RIGHT),
				basis.get("y", Vector3.UP),
				basis.get("z", Vector3.FORWARD)
			)
			return Transform3D(basis_obj, origin)
		elif type == "node_path":
			return NodePath(value.get("path", ""))
		elif type == "string":
			return str(value.get("value", ""))
		elif type == "int":
			return int(value.get("value", 0))
		elif type == "float":
			return float(value.get("value", 0.0))
		elif type == "bool":
			return bool(value.get("value", false))

		# Generic dictionary parsing
		return value

	elif value is Array:
		var parsed = []
		for item in value:
			parsed.append(_parse_value(item))
		return parsed

	return value