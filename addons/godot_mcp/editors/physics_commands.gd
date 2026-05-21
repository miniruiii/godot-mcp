extends RefCounted

# Error codes for physics commands
const ERR_NOT_FOUND = -32602
const ERR_INVALID_TYPE = -32000
const ERR_INVALID_VALUE = -32000

func setup_physics_body(params: Dictionary) -> Dictionary:
	var parent_path = params.get("parent", "")
	var body_name = params.get("name", "")
	var body_type = params.get("type", "StaticBody2D")

	if parent_path == "":
		return { "error": { "code": ERR_NOT_FOUND, "message": "Missing parent parameter" } }
	if body_name == "":
		return { "error": { "code": ERR_INVALID_VALUE, "message": "Missing name parameter" } }

	var parent = _find_node_by_path(parent_path)
	if parent == null:
		return { "error": { "code": ERR_NOT_FOUND, "message": "Parent not found at path: %s" % parent_path } }

	var body: Node
	if body_type == "StaticBody2D":
		body = StaticBody2D.new()
	elif body_type == "RigidBody2D":
		body = RigidBody2D.new()
	elif body_type == "CharacterBody2D":
		body = CharacterBody2D.new()
	elif body_type == "StaticBody3D":
		body = StaticBody3D.new()
	elif body_type == "RigidBody3D":
		body = RigidBody3D.new()
	elif body_type == "CharacterBody3D":
		body = CharacterBody3D.new()
	else:
		return { "error": { "code": ERR_INVALID_TYPE, "message": "Unknown physics body type: %s" % body_type } }

	body.set_name(body_name)
	parent.add_child(body)

	return { "result": { "created": true, "name": body_name, "type": body_type, "path": parent_path + "/" + body_name } }


func setup_collision(params: Dictionary) -> Dictionary:
	var body_path = params.get("body", "")
	var shape_type = params.get("shape_type", "RectangleShape2D")
	var shape_params = params.get("shape_params", {})

	if body_path == "":
		return { "error": { "code": ERR_NOT_FOUND, "message": "Missing body parameter" } }

	var body = _find_node_by_path(body_path)
	if body == null:
		return { "error": { "code": ERR_NOT_FOUND, "message": "Physics body not found at path: %s" % body_path } }

	# Check if body has collision object capability
	if not (body is PhysicsBody2D or body is PhysicsBody3D or body is StaticBody2D or body is StaticBody3D or body is RigidBody2D or body is RigidBody3D or body is CharacterBody2D or body is CharacterBody3D):
		return { "error": { "code": ERR_INVALID_TYPE, "message": "Node is not a physics body: %s" % body_path } }

	# Remove existing collision shapes
	for child in body.get_children():
		if child is CollisionShape2D or child is CollisionShape3D:
			child.queue_free()

	var shape: Shape2D
	if shape_type == "RectangleShape2D":
		var size = shape_params.get("size", Vector2(100, 100))
		shape = RectangleShape2D.new()
		shape.size = size
	elif shape_type == "CircleShape2D":
		var radius = shape_params.get("radius", 50)
		shape = CircleShape2D.new()
		shape.radius = radius
	elif shape_type == "CapsuleShape2D":
		var radius = shape_params.get("radius", 20)
		var height = shape_params.get("height", 100)
		shape = CapsuleShape2D.new()
		shape.radius = radius
		shape.height = height
	elif shape_type == "SegmentShape2D":
		var a = shape_params.get("a", Vector2(-50, 0))
		var b = shape_params.get("b", Vector2(50, 0))
		shape = SegmentShape2D.new()
		shape.a = a
		shape.b = b
	elif shape_type == "ConvexPolygonShape2D":
		var points = shape_params.get("points", [])
		shape = ConvexPolygonShape2D.new()
		var converted_points = []
		for p in points:
			if p is Dictionary:
				converted_points.append(Vector2(p.get("x", 0), p.get("y", 0)))
			else:
				converted_points.append(Vector2(0, 0))
		shape.points = converted_points
	elif shape_type == "ConcavePolygonShape2D":
		var segments = shape_params.get("segments", [])
		shape = ConcavePolygonShape2D.new()
		var converted_segments = []
		for seg in segments:
			if seg is Array and seg.size() >= 2:
				var p1 = seg[0]
				var p2 = seg[1]
				if p1 is Dictionary and p2 is Dictionary:
					converted_segments.append(Vector2(p1.get("x", 0), p1.get("y", 0)))
					converted_segments.append(Vector2(p2.get("x", 0), p2.get("y", 0)))
		shape.segments = converted_segments
	else:
		return { "error": { "code": ERR_INVALID_TYPE, "message": "Unknown shape type: %s" % shape_type } }

	var collision_shape: Node
	if body is PhysicsBody2D or body is StaticBody2D or body is RigidBody2D or body is CharacterBody2D:
		collision_shape = CollisionShape2D.new()
		collision_shape.set_name("CollisionShape2D")
	elif body is PhysicsBody3D or body is StaticBody3D or body is RigidBody3D or body is CharacterBody3D:
		collision_shape = CollisionShape3D.new()
		collision_shape.set_name("CollisionShape3D")

	collision_shape.shape = shape
	body.add_child(collision_shape)

	return {
		"result": {
			"created": true,
			"shape_type": shape_type,
			"shape_params": shape_params
		}
	}


func set_physics_layers(params: Dictionary) -> Dictionary:
	var body_path = params.get("body", "")
	var layer = params.get("layer", 1)
	var mask = params.get("mask", 1)

	if body_path == "":
		return { "error": { "code": ERR_NOT_FOUND, "message": "Missing body parameter" } }

	var body = _find_node_by_path(body_path)
	if body == null:
		return { "error": { "code": ERR_NOT_FOUND, "message": "Physics body not found at path: %s" % body_path } }

	if body is PhysicsBody2D or body is StaticBody2D or body is RigidBody2D or body is CharacterBody2D:
		body.collision_layer = layer
		body.collision_mask = mask
	elif body is PhysicsBody3D or body is StaticBody3D or body is RigidBody3D or body is CharacterBody3D:
		body.collision_layer = layer
		body.collision_mask = mask
	else:
		return { "error": { "code": ERR_INVALID_TYPE, "message": "Node is not a physics body: %s" % body_path } }

	return { "result": { "layer": layer, "mask": mask } }


func get_physics_layers(params: Dictionary) -> Dictionary:
	var body_path = params.get("body", "")

	if body_path == "":
		return { "error": { "code": ERR_NOT_FOUND, "message": "Missing body parameter" } }

	var body = _find_node_by_path(body_path)
	if body == null:
		return { "error": { "code": ERR_NOT_FOUND, "message": "Physics body not found at path: %s" % body_path } }

	var layer = 0
	var mask = 0

	if body is PhysicsBody2D or body is StaticBody2D or body is RigidBody2D or body is CharacterBody2D:
		layer = body.collision_layer
		mask = body.collision_mask
	elif body is PhysicsBody3D or body is StaticBody3D or body is RigidBody3D or body is CharacterBody3D:
		layer = body.collision_layer
		mask = body.collision_mask
	else:
		return { "error": { "code": ERR_INVALID_TYPE, "message": "Node is not a physics body: %s" % body_path } }

	return { "result": { "layer": layer, "mask": mask } }


func get_collision_info(params: Dictionary) -> Dictionary:
	var body_path = params.get("body", "")

	if body_path == "":
		return { "error": { "code": ERR_NOT_FOUND, "message": "Missing body parameter" } }

	var body = _find_node_by_path(body_path)
	if body == null:
		return { "error": { "code": ERR_NOT_FOUND, "message": "Physics body not found at path: %s" % body_path } }

	var shapes = []

	for child in body.get_children():
		if child is CollisionShape2D:
			var shape_info = {
				"type": "CollisionShape2D",
				"name": child.get_name()
			}
			if child.shape != null:
				shape_info["shape_type"] = child.shape.get_class_name() if child.shape.get_class_name else child.shape.get_class()
				if child.shape is RectangleShape2D:
					shape_info["size"] = { "x": child.shape.size.x, "y": child.shape.size.y }
				elif child.shape is CircleShape2D:
					shape_info["radius"] = child.shape.radius
				elif child.shape is CapsuleShape2D:
					shape_info["radius"] = child.shape.radius
					shape_info["height"] = child.shape.height
				elif child.shape is SegmentShape2D:
					shape_info["a"] = { "x": child.shape.a.x, "y": child.shape.a.y }
					shape_info["b"] = { "x": child.shape.b.x, "y": child.shape.b.y }
			shapes.append(shape_info)
		elif child is CollisionShape3D:
			var shape_info = {
				"type": "CollisionShape3D",
				"name": child.get_name()
			}
			if child.shape != null:
				shape_info["shape_type"] = child.shape.get_class_name() if child.shape.get_class_name else child.shape.get_class()
			shapes.append(shape_info)

	return { "result": { "shapes": shapes } }


func add_raycast(params: Dictionary) -> Dictionary:
	var parent_path = params.get("parent", "")
	var raycast_name = params.get("name", "RayCast2D")
	var enabled = params.get("enabled", true)
	var target_position = params.get("target_position", Vector2(0, -100))
	var collide_with_bodies = params.get("collide_with_bodies", true)
	var collide_with_areas = params.get("collide_with_areas", false)
	var cast_from = params.get("cast_from", Vector2(0, 0))

	if parent_path == "":
		return { "error": { "code": ERR_NOT_FOUND, "message": "Missing parent parameter" } }

	var parent = _find_node_by_path(parent_path)
	if parent == null:
		return { "error": { "code": ERR_NOT_FOUND, "message": "Parent not found at path: %s" % parent_path } }

	var raycast: Node

	# Determine if 2D or 3D based on parent type
	var is_2d = false
	var test_node = parent
	while test_node != null:
		if test_node is Node2D:
			is_2d = true
			break
		if test_node is Node3D:
			is_2d = false
			break
		test_node = test_node.get_parent()

	if is_2d:
		raycast = RayCast2D.new()
	else:
		raycast = RayCast3D.new()

	raycast.set_name(raycast_name)
	raycast.enabled = enabled

	if raycast is RayCast2D:
		raycast.target_position = target_position
		raycast.collide_with_bodies = collide_with_bodies
		raycast.collide_with_areas = collide_with_areas
		raycast.position = cast_from
	elif raycast is RayCast3D:
		var target = Vector3(target_position.x, 0, target_position.y)
		raycast.target_position = target
		raycast.collide_with_bodies = collide_with_bodies
		raycast.collide_with_areas = collide_with_areas
		raycast.position = Vector3(cast_from.x, 0, cast_from.y)

	parent.add_child(raycast)

	return {
		"result": {
			"created": true,
			"name": raycast_name,
			"enabled": enabled,
			"target_position": { "x": target_position.x, "y": target_position.y },
			"collide_with_bodies": collide_with_bodies,
			"collide_with_areas": collide_with_areas,
			"cast_from": { "x": cast_from.x, "y": cast_from.y }
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