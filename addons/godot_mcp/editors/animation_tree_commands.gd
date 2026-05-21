extends RefCounted

# Error codes for animation tree commands
const ERR_ANIMATION_TREE_NOT_FOUND = -32001
const ERR_INVALID_ANIMATION_PATH = -32002
const ERR_NODE_NOT_FOUND = -32003
const ERR_INVALID_NODE_TYPE = -32004
const ERR_PARAMETER_NOT_FOUND = -32005
const ERR_STATE_MACHINE_ERROR = -32006


func create(params: Dictionary) -> Dictionary:
	var parent_path = params.get("parent_path", "")
	var node_name = params.get("node_name", "AnimationTree")
	var animation_player_path = params.get("animation_player_path", "")

	if parent_path == "":
		return { "error": { "code": ERR_NODE_NOT_FOUND, "message": "Missing parent_path parameter" } }

	if node_name == "":
		node_name = "AnimationTree"

	var parent = _find_node_by_path(parent_path)
	if parent == null:
		return { "error": { "code": ERR_NODE_NOT_FOUND, "message": "Parent node not found: %s" % parent_path } }

	var anim_tree = AnimationTree.new()
	anim_tree.set_name(node_name)

	if animation_player_path != "":
		var anim_player = _find_node_by_path(animation_player_path)
		if anim_player != null and anim_player is AnimationPlayer:
			anim_tree.anim_player = anim_player

	parent.add_child(anim_tree)

	return {
		"result": {
			"created": true,
			"node_name": node_name,
			"parent_path": parent_path,
			"animation_player_path": animation_player_path
		}
	}


func get_structure(params: Dictionary) -> Dictionary:
	var tree_path = params.get("tree_path", "")

	if tree_path == "":
		return { "error": { "code": ERR_ANIMATION_TREE_NOT_FOUND, "message": "Missing tree_path parameter" } }

	var tree = _find_node_by_path(tree_path)
	if tree == null:
		return { "error": { "code": ERR_ANIMATION_TREE_NOT_FOUND, "message": "AnimationTree not found: %s" % tree_path } }

	if not tree is AnimationTree:
		return { "error": { "code": ERR_INVALID_NODE_TYPE, "message": "Node is not an AnimationTree: %s" % tree_path } }

	var result = {
		"tree_path": tree_path,
		"tree_name": tree.get_name(),
		"anim_player": "",
		"root_node": "",
		"root_type": "",
		"parameters": {}
	}

	# Get animation player reference
	if tree.anim_player != null:
		result["anim_player"] = tree.anim_player.get_path()

	# Get root node type and path
	if tree.tree_root != null:
		result["root_node"] = tree.tree_root.get_path()
		result["root_type"] = _get_animation_node_type(tree.tree_root)

	# Collect all parameters
	_get_animation_tree_parameters(tree, result["parameters"])

	# Get available animations from AnimationPlayer
	if tree.anim_player != null and tree.anim_player is AnimationPlayer:
		var animations = []
		for anim_name in tree.anim_player.get_animation_list():
			var anim = tree.anim_player.get_animation(anim_name)
			if anim != null:
				animations.append({
					"name": anim_name,
					"length": anim.length,
					"loop_mode": anim.loop_mode
				})
		result["animations"] = animations

	return { "result": result }


func set_parameter(params: Dictionary) -> Dictionary:
	var tree_path = params.get("tree_path", "")

	if tree_path == "":
		return { "error": { "code": ERR_ANIMATION_TREE_NOT_FOUND, "message": "Missing tree_path parameter" } }

	var param_name = params.get("parameter", "")
	if param_name == "":
		return { "error": { "code": ERR_PARAMETER_NOT_FOUND, "message": "Missing parameter name" } }

	var value = params.get("value", null)

	var tree = _find_node_by_path(tree_path)
	if tree == null:
		return { "error": { "code": ERR_ANIMATION_TREE_NOT_FOUND, "message": "AnimationTree not found: %s" % tree_path } }

	if not tree is AnimationTree:
		return { "error": { "code": ERR_INVALID_NODE_TYPE, "message": "Node is not an AnimationTree: %s" % tree_path } }

	# Convert value to proper type
	var converted_value = _convert_param_value(value)

	# Set the parameter
	tree.set(param_name, converted_value)

	return {
		"result": {
			"set": true,
			"tree_path": tree_path,
			"parameter": param_name,
			"value": value
		}
	}


func add_state(params: Dictionary) -> Dictionary:
	var tree_path = params.get("tree_path", "")

	if tree_path == "":
		return { "error": { "code": ERR_ANIMATION_TREE_NOT_FOUND, "message": "Missing tree_path parameter" } }

	var state_name = params.get("state_name", "")
	if state_name == "":
		return { "error": { "code": ERR_STATE_MACHINE_ERROR, "message": "Missing state_name parameter" } }

	var state_machine_path = params.get("state_machine_path", "")
	var animation_name = params.get("animation", "")

	var tree = _find_node_by_path(tree_path)
	if tree == null:
		return { "error": { "code": ERR_ANIMATION_TREE_NOT_FOUND, "message": "AnimationTree not found: %s" % tree_path } }

	if not tree is AnimationTree:
		return { "error": { "code": ERR_INVALID_NODE_TYPE, "message": "Node is not an AnimationTree: %s" % tree_path } }

	# Find the state machine node
	var state_machine = null
	if state_machine_path != "":
		state_machine = _find_node_by_path(state_machine_path)
	else:
		state_machine = tree.tree_root

	if state_machine == null:
		return { "error": { "code": ERR_STATE_MACHINE_ERROR, "message": "State machine not found" } }

	if not (state_machine is AnimationNodeStateMachine or state_machine is AnimationNodeStateMachineTransition):
		# Try to find state machine in children
		state_machine = _find_state_machine_child(state_machine)

	if state_machine == null or not state_machine is AnimationNodeStateMachine:
		return { "error": { "code": ERR_STATE_MACHINE_ERROR, "message": "No AnimationNodeStateMachine found in tree" } }

	# Add the new state
	var new_state = AnimationNodeAnimation.new()
	if animation_name != "" and tree.anim_player != null:
		var anim = tree.anim_player.get_animation(animation_name)
		if anim != null:
			new_state.animation = anim
		else:
			new_state.animation = animation_name
	else:
		new_state.animation = animation_name

	state_machine.add_node(state_name, new_state)

	return {
		"result": {
			"added": true,
			"tree_path": tree_path,
			"state_name": state_name,
			"animation": animation_name
		}
	}


func _get_animation_tree_parameters(tree: AnimationTree, params: Dictionary) -> void:
	# AnimationTree stores parameters internally
	# We need to check what parameters are available based on the tree root type
	if tree.tree_root != null:
		var root = tree.tree_root
		if root is AnimationNodeBlendTree:
			# For blend trees, we can't easily enumerate all possible parameters
			# Instead, try common parameter paths
			var common_params = [
				"parameters/times",
				"parameters/weights",
				"parameters/active"
			]
			for param in common_params:
				if tree.has(param):
					params[param] = tree.get(param)

		# Get parameter values from the tree
		var all_properties = [
			"speed_scale",
			"process_priority",
			"root_motion_track"
		]
		for prop in all_properties:
			if tree.has(prop):
				params[prop] = tree.get(prop)

	# Try to get all parameters by iterating
	if tree.has("parameters"):
		var param_root = tree.get("parameters")
		if param_root != null:
			# Walk the parameter tree
			_walk_parameters(param_root, "", params, tree)


func _walk_parameters(param_root: Object, prefix: String, params: Dictionary, tree: AnimationTree) -> void:
	if param_root == null:
		return

	# Try to get children of the parameter node
	if param_root is Node:
		for child in param_root.get_children():
			var child_name = prefix + "/" + child.get_name()
			params[child_name] = tree.get(child_name) if tree.has(child_name) else null
			_walk_parameters(child, child_name, params, tree)


func _find_state_machine_child(node: Node) -> AnimationNodeStateMachine:
	if node is AnimationNodeStateMachine:
		return node

	for child in node.get_children():
		var result = _find_state_machine_child(child)
		if result != null:
			return result

	return null


func _get_animation_node_type(node: AnimationNode) -> String:
	if node == null:
		return "null"

	if node is AnimationNodeAnimation:
		return "Animation"
	elif node is AnimationNodeBlendTree:
		return "BlendTree"
	elif node is AnimationNodeStateMachine:
		return "StateMachine"
	elif node is AnimationNodeStateMachineTransition:
		return "StateMachineTransition"
	elif node is AnimationNodeOneShot:
		return "OneShot"
	elif node is AnimationNodeBlendSpace1D:
		return "BlendSpace1D"
	elif node is AnimationNodeBlendSpace2D:
		return "BlendSpace2D"
	elif node is AnimationNodeTimeSeek:
		return "TimeSeek"
	elif node is AnimationNodeTimeScale:
		return "TimeScale"
	elif node is AnimationNodeTransition:
		return "Transition"
	else:
		return "Unknown"


func _convert_param_value(value: Variant) -> Variant:
	if value is Dictionary:
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
			"bool":
				if values.size() >= 1:
					return bool(values[0])

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