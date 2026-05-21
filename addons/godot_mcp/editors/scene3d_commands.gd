extends RefCounted

# Error codes for 3D scene commands
const ERR_INVALID_PARENT = -32001
const ERR_INVALID_NODE_TYPE = -32002
const ERR_NODE_NOT_FOUND = -32001
const ERR_INVALID_MESH_TYPE = -32000
const ERR_INVALID_LIGHT_TYPE = -32000

func add_mesh(params: Dictionary) -> Dictionary:
	var parent_path = params.get("parent", "")
	if parent_path == "":
		return { "error": { "code": ERR_INVALID_PARENT, "message": "Missing parent parameter" } }

	var parent = _find_node_by_path(parent_path)
	if parent == null:
		return { "error": { "code": ERR_INVALID_PARENT, "message": "Parent node not found: %s" % parent_path } }

	var mesh_type = params.get("mesh_type", "BoxMesh")
	var node_name = params.get("name", mesh_type)

	var mesh_instance = ClassDB.instantiate("MeshInstance3D")
	if mesh_instance == null:
		return { "error": { "code": ERR_INVALID_NODE_TYPE, "message": "Failed to instantiate MeshInstance3D" } }

	mesh_instance.name = node_name

	var mesh: Mesh
	match mesh_type:
		"BoxMesh":
			mesh = ClassDB.instantiate("BoxMesh")
		"SphereMesh":
			mesh = ClassDB.instantiate("SphereMesh")
		"CylinderMesh":
			mesh = ClassDB.instantiate("CylinderMesh")
		"PlaneMesh":
			mesh = ClassDB.instantiate("PlaneMesh")
		"CapsuleMesh":
			mesh = ClassDB.instantiate("CapsuleMesh")
		"OvalMesh":
			mesh = ClassDB.instantiate("OvalMesh")
		"TorusMesh":
			mesh = ClassDB.instantiate("TorusMesh")
		"RectangleMesh":
			mesh = ClassDB.instantiate("RectangleMesh")
		"QuadMesh":
			mesh = ClassDB.instantiate("QuadMesh")
		"PrismMesh":
			mesh = ClassDB.instantiate("PrismMesh")
		_:
			mesh = ClassDB.instantiate("BoxMesh")

	if mesh != null:
		mesh_instance.mesh = mesh

	var undo = EditorInterface.get_editor_undo_redo()
	undo.create_action("Add MeshInstance3D via MCP")
	undo.add_do_method(parent, "add_child", mesh_instance, true)
	undo.add_undo_method(parent, "remove_child", mesh_instance)
	undo.commit_action()

	var edited_root = EditorInterface.get_edited_scene_root()
	if edited_root:
		mesh_instance.set_owner(edited_root)

	return { "result": { "added": true, "node_path": parent_path + "/" + node_name, "mesh_type": mesh_type } }


func setup_camera(params: Dictionary) -> Dictionary:
	var parent_path = params.get("parent", "")
	if parent_path == "":
		return { "error": { "code": ERR_INVALID_PARENT, "message": "Missing parent parameter" } }

	var parent = _find_node_by_path(parent_path)
	if parent == null:
		return { "error": { "code": ERR_INVALID_PARENT, "message": "Parent node not found: %s" % parent_path } }

	var node_name = params.get("name", "Camera3D")

	var camera = ClassDB.instantiate("Camera3D")
	if camera == null:
		return { "error": { "code": ERR_INVALID_NODE_TYPE, "message": "Failed to instantiate Camera3D" } }

	camera.name = node_name

	# Set position if provided
	if params.has("position"):
		var pos = params["position"]
		if pos is Dictionary:
			camera.position = Vector3(pos.get("x", 0), pos.get("y", 0), pos.get("z", 0))
		else:
			camera.position = Vector3(pos.get("x", 0), pos.get("y", 0), pos.get("z", 0))

	# Set fov if provided
	if params.has("fov"):
		camera.fov = float(params.get("fov", 75.0))

	# Set near/far clip if provided
	if params.has("near"):
		camera.near = float(params.get("near", 0.05))
	if params.has("far"):
		camera.far = float(params.get("far", 4000.0))

	# Set current camera if requested
	if params.get("current", false):
		camera.current = true

	var undo = EditorInterface.get_editor_undo_redo()
	undo.create_action("Add Camera3D via MCP")
	undo.add_do_method(parent, "add_child", camera, true)
	undo.add_undo_method(parent, "remove_child", camera)
	undo.commit_action()

	var edited_root = EditorInterface.get_edited_scene_root()
	if edited_root:
		camera.set_owner(edited_root)

	return { "result": { "added": true, "node_path": parent_path + "/" + node_name } }


func setup_lighting(params: Dictionary) -> Dictionary:
	var parent_path = params.get("parent", "")
	if parent_path == "":
		return { "error": { "code": ERR_INVALID_PARENT, "message": "Missing parent parameter" } }

	var parent = _find_node_by_path(parent_path)
	if parent == null:
		return { "error": { "code": ERR_INVALID_PARENT, "message": "Parent node not found: %s" % parent_path } }

	var light_type = params.get("light_type", "OmniLight3D")
	var node_name = params.get("name", light_type)

	var light: Node
	match light_type:
		"OmniLight3D":
			light = ClassDB.instantiate("OmniLight3D")
		"DirectionalLight3D":
			light = ClassDB.instantiate("DirectionalLight3D")
		"SpotLight3D":
			light = ClassDB.instantiate("SpotLight3D")
		_:
			light = ClassDB.instantiate("OmniLight3D")

	if light == null:
		return { "error": { "code": ERR_INVALID_NODE_TYPE, "message": "Failed to instantiate light: %s" % light_type } }

	light.name = node_name

	# Set light color if provided
	if params.has("color"):
		var col = params["color"]
		if col is Dictionary:
			light.light_color = Color(col.get("r", 1), col.get("g", 1), col.get("b", 1), col.get("a", 1))
		else:
			light.light_color = Color(1, 1, 1, 1)

	# Set light energy if provided
	if params.has("energy"):
		light.light_energy = float(params.get("energy", 1.0))

	# Set light intensity if provided
	if params.has("intensity"):
		light.light_intensity = float(params.get("intensity", 1.0))

	# Set shadow enabled if provided
	if params.has("shadow"):
		light.shadow_enabled = bool(params.get("shadow", false))

	var undo = EditorInterface.get_editor_undo_redo()
	undo.create_action("Add Light via MCP")
	undo.add_do_method(parent, "add_child", light, true)
	undo.add_undo_method(parent, "remove_child", light)
	undo.commit_action()

	var edited_root = EditorInterface.get_edited_scene_root()
	if edited_root:
		light.set_owner(edited_root)

	return { "result": { "added": true, "node_path": parent_path + "/" + node_name, "light_type": light_type } }


func setup_environment(params: Dictionary) -> Dictionary:
	var parent_path = params.get("parent", "")
	if parent_path == "":
		return { "error": { "code": ERR_INVALID_PARENT, "message": "Missing parent parameter" } }

	var parent = _find_node_by_path(parent_path)
	if parent == null:
		return { "error": { "code": ERR_INVALID_PARENT, "message": "Parent node not found: %s" % parent_path } }

	var node_name = params.get("name", "WorldEnvironment")

	var world_env = ClassDB.instantiate("WorldEnvironment")
	if world_env == null:
		return { "error": { "code": ERR_INVALID_NODE_TYPE, "message": "Failed to instantiate WorldEnvironment" } }

	world_env.name = node_name

	# Create and configure Environment resource
	var env = ClassDB.instantiate("Environment")
	if env != null:
		world_env.env = env

		# Set background mode if provided
		if params.has("background_mode"):
			var mode = params.get("background_mode", "default")
			match mode:
				"clear":
					env.background_mode = Environment.BACKGROUND_CLEAR
				"sky":
					env.background_mode = Environment.BACKGROUND_SKY
				"color":
					env.background_mode = Environment.BACKGROUND_COLOR
				"canvas":
					env.background_mode = Environment.BACKGROUND_CANVAS
				"keep":
					env.background_mode = Environment.BACKGROUND_KEEP
				"box":
					env.background_mode = Environment.BACKGROUND_BOX
				"skybox":
					env.background_mode = Environment.BACKGROUND_SKY_BOX
				_:
					env.background_mode = Environment.BACKGROUND_DEFAULT

		# Set background color if provided
		if params.has("background_color"):
			var col = params["background_color"]
			if col is Dictionary:
				env.background_color = Color(col.get("r", 0), col.get("g", 0), col.get("b", 0), col.get("a", 1))
			else:
				env.background_color = Color(0, 0, 0, 1)

		# Set ambient light if provided
		if params.has("ambient_light_energy"):
			env.ambient_light_energy = float(params.get("ambient_light_energy", 0.5))

	var undo = EditorInterface.get_editor_undo_redo()
	undo.create_action("Add WorldEnvironment via MCP")
	undo.add_do_method(parent, "add_child", world_env, true)
	undo.add_undo_method(parent, "remove_child", world_env)
	undo.commit_action()

	var edited_root = EditorInterface.get_edited_scene_root()
	if edited_root:
		world_env.set_owner(edited_root)

	return { "result": { "added": true, "node_path": parent_path + "/" + node_name } }


func add_gridmap(params: Dictionary) -> Dictionary:
	var parent_path = params.get("parent", "")
	if parent_path == "":
		return { "error": { "code": ERR_INVALID_PARENT, "message": "Missing parent parameter" } }

	var parent = _find_node_by_path(parent_path)
	if parent == null:
		return { "error": { "code": ERR_INVALID_PARENT, "message": "Parent node not found: %s" % parent_path } }

	var node_name = params.get("name", "GridMap")

	var gridmap = ClassDB.instantiate("GridMap")
	if gridmap == null:
		return { "error": { "code": ERR_INVALID_NODE_TYPE, "message": "Failed to instantiate GridMap" } }

	gridmap.name = node_name

	# Set cell size if provided
	if params.has("cell_size"):
		gridmap.cell_size = float(params.get("cell_size", 1.0))

	# Set the TileSet if provided
	if params.has("tile_set"):
		var tile_set_path = params.get("tile_set", "")
		if tile_set_path != "":
			var tile_set = load(tile_set_path)
			if tile_set != null and tile_set is TileSet:
				gridmap.tile_set = tile_set

	# Set map size if provided (x, y, z dimensions)
	if params.has("map_size"):
		var size = params["map_size"]
		if size is Dictionary:
			gridmap.map_size = Vector3i(size.get("x", 10), size.get("y", 1), size.get("z", 10))

	var undo = EditorInterface.get_editor_undo_redo()
	undo.create_action("Add GridMap via MCP")
	undo.add_do_method(parent, "add_child", gridmap, true)
	undo.add_undo_method(parent, "remove_child", gridmap)
	undo.commit_action()

	var edited_root = EditorInterface.get_edited_scene_root()
	if edited_root:
		gridmap.set_owner(edited_root)

	return { "result": { "added": true, "node_path": parent_path + "/" + node_name } }


func set_material(params: Dictionary) -> Dictionary:
	var mesh_path = params.get("mesh_instance", "")
	if mesh_path == "":
		return { "error": { "code": ERR_NODE_NOT_FOUND, "message": "Missing mesh_instance parameter" } }

	var mesh_instance = _find_node_by_path(mesh_path)
	if mesh_instance == null:
		return { "error": { "code": ERR_NODE_NOT_FOUND, "message": "MeshInstance3D not found at path: %s" % mesh_path } }

	if not mesh_instance is MeshInstance3D:
		return { "error": { "code": ERR_INVALID_NODE_TYPE, "message": "Node at path is not a MeshInstance3D: %s" % mesh_path } }

	var material_path = params.get("material", "")
	if material_path == "":
		return { "error": { "code": ERR_INVALID_NODE_TYPE, "message": "Missing material parameter" } }

	var material = load(material_path)
	if material == null:
		return { "error": { "code": ERR_INVALID_NODE_TYPE, "message": "Failed to load material: %s" % material_path } }

	if not material is Material:
		return { "error": { "code": ERR_INVALID_NODE_TYPE, "message": "Loaded resource is not a Material: %s" % material_path } }

	mesh_instance.material_override = material

	return { "result": { "applied": true, "mesh_path": mesh_path, "material_path": material_path } }


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
