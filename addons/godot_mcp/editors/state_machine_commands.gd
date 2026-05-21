extends RefCounted

# Error codes for state machine commands
const ERR_ANIMATION_TREE_NOT_FOUND = -32001
const ERR_STATE_NOT_FOUND = -32002
const ERR_INVALID_STATE_MACHINE = -32003
const ERR_TRANSITION_NOT_FOUND = -32004
const ERR_INVALID_TRANSITION = -32005


func remove_state(params: Dictionary) -> Dictionary:
	var animation_tree_path = params.get("animation_tree_path", "")
	if animation_tree_path == "":
		return { "error": { "code": ERR_ANIMATION_TREE_NOT_FOUND, "message": "Missing animation_tree_path parameter" } }

	var state_name = params.get("state_name", "")
	if state_name == "":
		return { "error": { "code": ERR_STATE_NOT_FOUND, "message": "Missing state_name parameter" } }

	var anim_tree = _find_node_by_path(animation_tree_path)
	if anim_tree == null:
		return { "error": { "code": ERR_ANIMATION_TREE_NOT_FOUND, "message": "AnimationTree not found: %s" % animation_tree_path } }

	if not anim_tree is AnimationTree:
		return { "error": { "code": ERR_INVALID_STATE_MACHINE, "message": "Node is not an AnimationTree: %s" % animation_tree_path } }

	var state_machine = anim_tree.get("parameters/playback")
	if state_machine == null:
		return { "error": { "code": ERR_INVALID_STATE_MACHINE, "message": "No state machine found in AnimationTree: %s" % animation_tree_path } }

	if not state_machine.has_node(state_name):
		return { "error": { "code": ERR_STATE_NOT_FOUND, "message": "State not found: %s" % state_name } }

	state_machine.remove_node(state_name)

	return {
		"result": {
			"removed": true,
			"animation_tree_path": animation_tree_path,
			"state_name": state_name
		}
	}


func add_transition(params: Dictionary) -> Dictionary:
	var animation_tree_path = params.get("animation_tree_path", "")
	if animation_tree_path == "":
		return { "error": { "code": ERR_ANIMATION_TREE_NOT_FOUND, "message": "Missing animation_tree_path parameter" } }

	var from_state = params.get("from_state", "")
	if from_state == "":
		return { "error": { "code": ERR_STATE_NOT_FOUND, "message": "Missing from_state parameter" } }

	var to_state = params.get("to_state", "")
	if to_state == "":
		return { "error": { "code": ERR_STATE_NOT_FOUND, "message": "Missing to_state parameter" } }

	var anim_tree = _find_node_by_path(animation_tree_path)
	if anim_tree == null:
		return { "error": { "code": ERR_ANIMATION_TREE_NOT_FOUND, "message": "AnimationTree not found: %s" % animation_tree_path } }

	if not anim_tree is AnimationTree:
		return { "error": { "code": ERR_INVALID_STATE_MACHINE, "message": "Node is not an AnimationTree: %s" % animation_tree_path } }

	var state_machine = anim_tree.get("parameters/playback")
	if state_machine == null:
		return { "error": { "code": ERR_INVALID_STATE_MACHINE, "message": "No state machine found in AnimationTree: %s" % animation_tree_path } }

	if not state_machine.has_node(from_state):
		return { "error": { "code": ERR_STATE_NOT_FOUND, "message": "From state not found: %s" % from_state } }

	if not state_machine.has_node(to_state):
		return { "error": { "code": ERR_STATE_NOT_FOUND, "message": "To state not found: %s" % to_state } }

	# Get transition flags and mode (default to AUTO mode = 0)
	var transition_flags = params.get("flags", 0)
	var transition_mode = params.get("mode", 0)

	state_machine.add_node(transition_flags, from_state, to_state, transition_mode)

	return {
		"result": {
			"added": true,
			"animation_tree_path": animation_tree_path,
			"from_state": from_state,
			"to_state": to_state,
			"flags": transition_flags,
			"mode": transition_mode
		}
	}


func remove_transition(params: Dictionary) -> Dictionary:
	var animation_tree_path = params.get("animation_tree_path", "")
	if animation_tree_path == "":
		return { "error": { "code": ERR_ANIMATION_TREE_NOT_FOUND, "message": "Missing animation_tree_path parameter" } }

	var from_state = params.get("from_state", "")
	if from_state == "":
		return { "error": { "code": ERR_STATE_NOT_FOUND, "message": "Missing from_state parameter" } }

	var to_state = params.get("to_state", "")
	if to_state == "":
		return { "error": { "code": ERR_STATE_NOT_FOUND, "message": "Missing to_state parameter" } }

	var anim_tree = _find_node_by_path(animation_tree_path)
	if anim_tree == null:
		return { "error": { "code": ERR_ANIMATION_TREE_NOT_FOUND, "message": "AnimationTree not found: %s" % animation_tree_path } }

	if not anim_tree is AnimationTree:
		return { "error": { "code": ERR_INVALID_STATE_MACHINE, "message": "Node is not an AnimationTree: %s" % animation_tree_path } }

	var state_machine = anim_tree.get("parameters/playback")
	if state_machine == null:
		return { "error": { "code": ERR_INVALID_STATE_MACHINE, "message": "No state machine found in AnimationTree: %s" % animation_tree_path } }

	if not state_machine.has_node(from_state):
		return { "error": { "code": ERR_STATE_NOT_FOUND, "message": "From state not found: %s" % from_state } }

	if not state_machine.has_node(to_state):
		return { "error": { "code": ERR_STATE_NOT_FOUND, "message": "To state not found: %s" % to_state } }

	state_machine.disconnect_nodes(from_state, to_state)

	return {
		"result": {
			"removed": true,
			"animation_tree_path": animation_tree_path,
			"from_state": from_state,
			"to_state": to_state
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