extends RefCounted

# Error codes for blend tree commands
const ERR_ANIMATION_TREE_NOT_FOUND = -32001
const ERR_BLEND_TREE_NOT_FOUND = -32002
const ERR_NODE_NOT_FOUND = -32003
const ERR_INVALID_NODE_TYPE = -32004
const ERR_NODE_ALREADY_EXISTS = -32005
const ERR_INVALID_NODE_NAME = -32006

func set_blend_tree_node(params: Dictionary) -> Dictionary:
	var animation_tree_path = params.get("animation_tree_path", "")
	if animation_tree_path == "":
		return { "error": { "code": ERR_ANIMATION_TREE_NOT_FOUND, "message": "Missing animation_tree_path parameter" } }

	var node_name = params.get("node_name", "")
	if node_name == "":
		return { "error": { "code": ERR_INVALID_NODE_NAME, "message": "Missing node_name parameter" } }

	# Validate node name (must be valid identifier for blend tree)
	if not _is_valid_node_name(node_name):
		return { "error": { "code": ERR_INVALID_NODE_NAME, "message": "Invalid node name. Must be alphanumeric with underscores, not starting with a number." } }

	var node_type = params.get("node_type", "AnimationNodeBlendTree")
	var position = params.get("position", Vector2.ZERO)

	var anim_tree = _find_node_by_path(animation_tree_path)
	if anim_tree == null:
		return { "error": { "code": ERR_ANIMATION_TREE_NOT_FOUND, "message": "AnimationTree node not found: %s" % animation_tree_path } }

	if not anim_tree is AnimationTree:
		return { "error": { "code": ERR_INVALID_NODE_TYPE, "message": "Node is not an AnimationTree: %s" % animation_tree_path } }

	var blend_tree = anim_tree.tree_root
	if blend_tree == null:
		# Create a new BlendTree if no root exists
		blend_tree = AnimationNodeBlendTree.new()
		anim_tree.tree_root = blend_tree

	if not blend_tree is AnimationNodeBlendTree:
		return { "error": { "code": ERR_BLEND_TREE_NOT_FOUND, "message": "AnimationTree root is not a BlendTree" } }

	# Check if node already exists
	var existing_node = blend_tree.get_node(node_name)
	if existing_node != null:
		# Update existing node position if provided
		if params.has("position"):
			blend_tree.set_node_position(node_name, position)
		return {
			"result": {
				"updated": true,
				"node_name": node_name,
				"node_type": node_type,
				"position": position,
				"animation_tree_path": animation_tree_path
			}
		}

	# Create the appropriate AnimationNode based on type
	var new_node = _create_blend_node(node_type)
	if new_node == null:
		return { "error": { "code": ERR_INVALID_NODE_TYPE, "message": "Unknown blend node type: %s" % node_type } }

	# Add the node to the blend tree
	blend_tree.add_node(node_name, new_node, position)

	# Configure node if parameters provided
	_configure_blend_node(blend_tree, node_name, node_type, params)

	return {
		"result": {
			"created": true,
			"node_name": node_name,
			"node_type": node_type,
			"position": position,
			"animation_tree_path": animation_tree_path
		}
	}


func _is_valid_node_name(name: String) -> bool:
	if name.is_empty():
		return false
	# Must start with letter or underscore
	var first_char = name[0]
	if not (first_char.isLetter() or first_char == "_"):
		return false
	# Rest must be alphanumeric or underscore
	for c in name:
		if not (c.isLetter() or c.isDigit() or c == "_"):
			return false
	return true


func _create_blend_node(node_type: String) -> AnimationNode:
	match node_type:
		"AnimationNodeBlendTree":
			return AnimationNodeBlendTree.new()
		"AnimationNodeBlendSpace1D":
			return AnimationNodeBlendSpace1D.new()
		"AnimationNodeBlendSpace2D":
			return AnimationNodeBlendSpace2D.new()
		"AnimationNodeStateMachine":
			return AnimationNodeStateMachine.new()
		"AnimationNodeStateMachineTransition":
			return AnimationNodeStateMachineTransition.new()
		"AnimationNodeBlendByIndex":
			return AnimationNodeBlendByIndex.new()
		"AnimationNodeBlendByTrack":
			return AnimationNodeBlendByTrack.new()
		"AnimationNodeTimeSeek":
			return AnimationNodeTimeSeek.new()
		"AnimationNodeTimeScale":
			return AnimationNodeTimeScale.new()
		"AnimationNodeOneShot":
			return AnimationNodeOneShot.new()
		"AnimationNodeReset":
			return AnimationNodeReset.new()
		"AnimationNodeTransition":
			return AnimationNodeTransition.new()
		_:
			# Default to AnimationNodeBlendTree for unknown types
			return AnimationNodeBlendTree.new()


func _configure_blend_node(blend_tree: AnimationNodeBlendTree, node_name: String, node_type: String, params: Dictionary) -> void:
	# Configure specific node types based on parameters
	match node_type:
		"AnimationNodeBlendSpace1D":
			if params.has("blend_position"):
				blend_tree.set_blend_position(params.get("blend_position"))
		"AnimationNodeBlendSpace2D":
			if params.has("blend_position"):
				var pos = params.get("blend_position")
				if pos is Vector2:
					blend_tree.set_blend_position(pos)
		"AnimationNodeTimeScale":
			if params.has("scale"):
				blend_tree.set_scale(params.get("scale"))
		"AnimationNodeOneShot":
			if params.has("fade_in"):
				blend_tree.set_fade_in(params.get("fade_in"))
			if params.has("fade_out"):
				blend_tree.set_fade_out(params.get("fade_out"))
		"AnimationNodeTransition":
			if params.has("auto_advance"):
				blend_tree.set_auto_advance(params.get("auto_advance"))
			if params.has("transition_time"):
				blend_tree.set_transition_time(params.get("transition_time"))


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