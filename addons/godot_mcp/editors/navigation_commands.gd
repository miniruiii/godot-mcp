extends RefCounted

# Error codes for navigation commands
const ERR_NOT_FOUND = -32602
const ERR_INVALID_TYPE = -32000
const ERR_INVALID_VALUE = -32000

func setup_navigation_region(params: Dictionary) -> Dictionary:
	var parent_path = params.get("parent", "")
	var region_name = params.get("name", "NavigationRegion2D")
	var bounds = params.get("bounds", {})

	var parent_node: Node
	if parent_path != "":
		parent_node = _find_node_by_path(parent_path)
		if parent_node == null:
			return { "error": { "code": ERR_NOT_FOUND, "message": "Parent node not found at path: %s" % parent_path } }
	else:
		var root = Engine.get_main_loop().get_root()
		parent_node = root

	var region = NavigationRegion2D.new()
	region.set_name(region_name)

	# Set bounds if provided
	if bounds.has("position") and bounds.has("size"):
		var rect = Rect2(
			bounds.get("position", {}).get("x", 0),
			bounds.get("position", {}).get("y", 0),
			bounds.get("size", {}).get("width", 100),
			bounds.get("size", {}).get("height", 100)
		)
		region.bounds = rect

	# Set cell_size if provided
	if params.has("cell_size"):
		region.cell_size = params.get("cell_size", 0.5)

	parent_node.add_child(region)

	return {
		"result": {
			"created": true,
			"name": region_name,
			"type": "NavigationRegion2D",
			"parent": parent_path if parent_path != "" else "/root",
			"bounds": {
				"position": { "x": region.bounds.position.x, "y": region.bounds.position.y },
				"size": { "width": region.bounds.size.x, "height": region.bounds.size.y }
			},
			"cell_size": region.cell_size
		}
	}


func setup_navigation_agent(params: Dictionary) -> Dictionary:
	var parent_path = params.get("parent", "")
	var agent_name = params.get("name", "NavigationAgent2D")

	var parent_node: Node
	if parent_path == "":
		return { "error": { "code": ERR_NOT_FOUND, "message": "Missing parent parameter" } }

	parent_node = _find_node_by_path(parent_path)
	if parent_node == null:
		return { "error": { "code": ERR_NOT_FOUND, "message": "Parent node not found at path: %s" % parent_path } }

	var agent = NavigationAgent2D.new()
	agent.set_name(agent_name)

	# Set navigation_layers if provided
	if params.has("navigation_layers"):
		agent.navigation_layers = params.get("navigation_layers", 1)

	# Set agent properties
	if params.has("path_desired_distance"):
		agent.path_desired_distance = params.get("path_desired_distance", 0.5)

	if params.has("target_desired_distance"):
		agent.target_desired_distance = params.get("target_desired_distance", 0.5)

	if params.has("max_speed"):
		agent.max_speed = params.get("max_speed", 200.0)

	if params.has("velocity"):
		var vel = params.get("velocity", {})
		agent.velocity = Vector2(vel.get("x", 0), vel.get("y", 0))

	# Set initial target if provided
	if params.has("target_position"):
		var target = params.get("target_position", {})
		agent.target_position = Vector2(target.get("x", 0), target.get("y", 0))

	parent_node.add_child(agent)

	return {
		"result": {
			"created": true,
			"name": agent_name,
			"type": "NavigationAgent2D",
			"parent": parent_path,
			"navigation_layers": agent.navigation_layers,
			"path_desired_distance": agent.path_desired_distance,
			"target_desired_distance": agent.target_desired_distance,
			"max_speed": agent.max_speed
		}
	}


func bake_navigation_mesh(params: Dictionary) -> Dictionary:
	var region_path = params.get("region", "")
	if region_path == "":
		return { "error": { "code": ERR_NOT_FOUND, "message": "Missing region parameter" } }

	var region = _find_node_by_path(region_path)
	if region == null:
		return { "error": { "code": ERR_NOT_FOUND, "message": "NavigationRegion2D not found at path: %s" % region_path } }

	if not region is NavigationRegion2D:
		return { "error": { "code": ERR_INVALID_TYPE, "message": "Node at path is not a NavigationRegion2D: %s" % region_path } }

	# Trigger navigation mesh bake
	region.bake_navigation_region()

	return {
		"result": {
			"baked": true,
			"region": region_path,
			"bounds": {
				"position": { "x": region.bounds.position.x, "y": region.bounds.position.y },
				"size": { "width": region.bounds.size.x, "height": region.bounds.size.y }
			}
		}
	}


func set_navigation_layers(params: Dictionary) -> Dictionary:
	var node_path = params.get("node", "")
	if node_path == "":
		return { "error": { "code": ERR_NOT_FOUND, "message": "Missing node parameter" } }

	var node = _find_node_by_path(node_path)
	if node == null:
		return { "error": { "code": ERR_NOT_FOUND, "message": "Node not found at path: %s" % node_path } }

	var layers = params.get("layers", 1)

	# Check if it's a NavigationAgent2D or NavigationRegion2D
	if node is NavigationAgent2D:
		node.navigation_layers = layers
		return {
			"result": {
				"updated": true,
				"node": node_path,
				"type": "NavigationAgent2D",
				"navigation_layers": node.navigation_layers
			}
		}
	elif node is NavigationRegion2D:
		node.navigation_layers = layers
		return {
			"result": {
				"updated": true,
				"node": node_path,
				"type": "NavigationRegion2D",
				"navigation_layers": node.navigation_layers
			}
		}
	else:
		return { "error": { "code": ERR_INVALID_TYPE, "message": "Node does not support navigation layers: %s" % node_path } }


func get_navigation_info(params: Dictionary) -> Dictionary:
	var node_path = params.get("node", "")
	if node_path == "":
		return { "error": { "code": ERR_NOT_FOUND, "message": "Missing node parameter" } }

	var node = _find_node_by_path(node_path)
	if node == null:
		return { "error": { "code": ERR_NOT_FOUND, "message": "Node not found at path: %s" % node_path } }

	if node is NavigationAgent2D:
		var path = node.get_path()
		var path_points = []
		for p in path:
			path_points.append({ "x": p.x, "y": p.y })

		return {
			"result": {
				"type": "NavigationAgent2D",
				"name": node.get_name(),
				"navigation_layers": node.navigation_layers,
				"path_desired_distance": node.path_desired_distance,
				"target_desired_distance": node.target_desired_distance,
				"max_speed": node.max_speed,
				"target_position": { "x": node.target_position.x, "y": node.target_position.y },
				"path": path_points,
				"path_size": path.size(),
				"is_navigation_finished": node.is_navigation_finished(),
				"get_next_location": node.get_next_location() if "get_next_location" in node else null
			}
		}
	elif node is NavigationRegion2D:
		return {
			"result": {
				"type": "NavigationRegion2D",
				"name": node.get_name(),
				"navigation_layers": node.navigation_layers,
				"cell_size": node.cell_size,
				"bounds": {
					"position": { "x": node.bounds.position.x, "y": node.bounds.position.y },
					"size": { "width": node.bounds.size.x, "height": node.bounds.size.y }
				}
			}
		}
	else:
		return { "error": { "code": ERR_INVALID_TYPE, "message": "Node is not a navigation node: %s" % node_path } }


func get_navigation_path(params: Dictionary) -> Dictionary:
	var agent_path = params.get("agent", "")
	if agent_path == "":
		return { "error": { "code": ERR_NOT_FOUND, "message": "Missing agent parameter" } }

	var agent = _find_node_by_path(agent_path)
	if agent == null:
		return { "error": { "code": ERR_NOT_FOUND, "message": "NavigationAgent2D not found at path: %s" % agent_path } }

	if not agent is NavigationAgent2D:
		return { "error": { "code": ERR_INVALID_TYPE, "message": "Node at path is not a NavigationAgent2D: %s" % agent_path } }

	var path = agent.get_path()
	var path_points = []
	for p in path:
		path_points.append({ "x": p.x, "y": p.y })

	var current_position: Vector2
	if params.has("current_position"):
		var cp = params.get("current_position", {})
		current_position = Vector2(cp.get("x", 0), cp.get("y", 0))
		agent.velocity = current_position

	return {
		"result": {
			"agent": agent_path,
			"path": path_points,
			"path_size": path.size(),
			"navigation_finished": agent.is_navigation_finished(),
			"target_position": { "x": agent.target_position.x, "y": agent.target_position.y }
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
	var current_node: Node = null

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