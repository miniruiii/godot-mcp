extends RefCounted

# Error codes for particle commands
const ERR_INVALID_PARTICLE_NODE = -32602
const ERR_INVALID_TYPE = -32000
const ERR_INVALID_VALUE = -32000
const ERR_NOT_FOUND = -32001

func create_particles(params: Dictionary) -> Dictionary:
	var parent_path = params.get("parent", "")
	if parent_path == "":
		return { "error": { "code": ERR_INVALID_PARTICLE_NODE, "message": "Missing parent parameter" } }

	var parent = _find_node_by_path(parent_path)
	if parent == null:
		return { "error": { "code": ERR_NOT_FOUND, "message": "Parent node not found at path: %s" % parent_path } }

	var node_name = params.get("name", "Particles")
	var node_type = params.get("type", "2D")  # "2D" or "3D"

	var particles: Node
	if node_type == "3D":
		particles = GPUParticles3D.new()
	else:
		particles = GPUParticles2D.new()

	particles.name = node_name

	# Configure basic properties
	if params.has("amount"):
		particles.amount = params.get("amount", 256)
	if params.has("lifetime"):
		particles.lifetime = params.get("lifetime", 1.0)
	if params.has("preprocess"):
		particles.preprocess = params.get("preprocess", 0.0)
	if params.has("explosiveness"):
		particles.explosiveness = params.get("explosiveness", 0.0)
	if params.has("fractals"):
		particles.fract_delta = params.get("fractals", false)

	parent.add_child(particles)

	return {
		"result": {
			"created": true,
			"name": node_name,
			"type": node_type,
			"path": parent_path + "/" + node_name
		}
	}

func set_particle_material(params: Dictionary) -> Dictionary:
	var particles_path = params.get("particles", "")
	if particles_path == "":
		return { "error": { "code": ERR_INVALID_PARTICLE_NODE, "message": "Missing particles parameter" } }

	var particles = _find_node_by_path(particles_path)
	if particles == null:
		return { "error": { "code": ERR_NOT_FOUND, "message": "Particle node not found at path: %s" % particles_path } }

	if not (particles is GPUParticles2D or particles is GPUParticles3D):
		return { "error": { "code": ERR_INVALID_TYPE, "message": "Node at path is not GPUParticles2D or GPUParticles3D: %s" % particles_path } }

	# Set process material
	if params.has("process_material"):
		var material = _create_process_material(params.get("process_material", {}))
		particles.process_material = material

	# Set draw pass (for GPUParticles2D)
	if particles is GPUParticles2D and params.has("draw_pass"):
		var draw_pass_count = params.get("draw_pass", 1)
		particles.draw_pass_1 = material if draw_pass_count >= 1 else null

	return { "result": { "path": particles_path, "material_set": true } }

func set_particle_color_gradient(params: Dictionary) -> Dictionary:
	var particles_path = params.get("particles", "")
	if particles_path == "":
		return { "error": { "code": ERR_INVALID_PARTICLE_NODE, "message": "Missing particles parameter" } }

	var particles = _find_node_by_path(particles_path)
	if particles == null:
		return { "error": { "code": ERR_NOT_FOUND, "message": "Particle node not found at path: %s" % particles_path } }

	if not (particles is GPUParticles2D or particles is GPUParticles3D):
		return { "error": { "code": ERR_INVALID_TYPE, "message": "Node at path is not GPUParticles2D or GPUParticles3D: %s" % particles_path } }

	var gradient_data = params.get("gradient", [])
	if gradient_data.size() == 0:
		return { "error": { "code": ERR_INVALID_VALUE, "message": "Missing gradient parameter" } }

	var gradient = Gradient.new()
	for point in gradient_data:
		var offset = point.get("offset", 0.0)
		var color_data = point.get("color", { "r": 1, "g": 1, "b": 1, "a": 1 })
		var color = Color(
			color_data.get("r", 1.0),
			color_data.get("g", 1.0),
			color_data.get("b", 1.0),
			color_data.get("a", 1.0)
		)
		gradient.set_offset(offset, color)

	# Apply gradient to a GradientTexture and then to material
	var gradient_texture = GradientTexture1D.new()
	gradient_texture.gradient = gradient

	var material: Material
	if particles is GPUParticles2D:
		material = particles.process_material
		if material == null:
			material = ParticleProcessMaterial.new()
		if material is ParticleProcessMaterial:
			material.color = Color.WHITE  # Will use gradient color
		particles.process_material = material
	else:
		material = particles.process_material
		if material == null:
			material = ParticleProcessMaterial.new()
		if material is ParticleProcessMaterial:
			material.color = Color.WHITE
		particles.process_material = material

	return { "result": { "path": particles_path, "gradient_set": true } }

func apply_particle_preset(params: Dictionary) -> Dictionary:
	var particles_path = params.get("particles", "")
	if particles_path == "":
		return { "error": { "code": ERR_INVALID_PARTICLE_NODE, "message": "Missing particles parameter" } }

	var particles = _find_node_by_path(particles_path)
	if particles == null:
		return { "error": { "code": ERR_NOT_FOUND, "message": "Particle node not found at path: %s" % particles_path } }

	if not (particles is GPUParticles2D or particles is GPUParticles3D):
		return { "error": { "code": ERR_INVALID_TYPE, "message": "Node at path is not GPUParticles2D or GPUParticles3D: %s" % particles_path } }

	var preset = params.get("preset", "")
	if preset == "":
		return { "error": { "code": ERR_INVALID_VALUE, "message": "Missing preset parameter" } }

	var material = ParticleProcessMaterial.new()

	match preset:
		"explosion":
			material.explosiveness = 0.9
			material.damping = 5.0
			material.initial_velocity_max = 200.0
			material.gravity = Vector3(0, -100, 0)
			material.color = Color(1.0, 0.5, 0.1, 1.0)
			particles.amount = 64
			particles.lifetime = 0.8
		"rain":
			material.gravity = Vector3(0, -400, 0)
			material.initial_velocity_min = 100.0
			material.initial_velocity_max = 200.0
			material.damping = 0.1
			material.explosiveness = 0.0
			material.color = Color(0.5, 0.7, 1.0, 0.8)
			particles.amount = 256
			particles.lifetime = 1.5
		"snow":
			material.gravity = Vector3(0, -50, 0)
			material.initial_velocity_min = 10.0
			material.initial_velocity_max = 30.0
			material.explosiveness = 0.0
			material.damping = 2.0
			material.color = Color(1.0, 1.0, 1.0, 0.9)
			particles.amount = 200
			particles.lifetime = 3.0
		"sparkle":
			material.explosiveness = 0.3
			material.damping = 3.0
			material.initial_velocity_min = 50.0
			material.initial_velocity_max = 100.0
			material.gravity = Vector3(0, -50, 0)
			material.color = Color(1.0, 0.9, 0.5, 1.0)
			particles.amount = 32
			particles.lifetime = 1.2
		"smoke":
			material.explosiveness = 0.1
			material.damping = 1.0
			material.initial_velocity_min = 20.0
			material.initial_velocity_max = 50.0
			material.gravity = Vector3(0, 30, 0)
			material.color = Color(0.5, 0.5, 0.5, 0.3)
			particles.amount = 50
			particles.lifetime = 2.5
		"fire":
			material.explosiveness = 0.5
			material.damping = 2.0
			material.initial_velocity_min = 50.0
			material.initial_velocity_max = 150.0
			material.gravity = Vector3(0, 100, 0)
			material.color = Color(1.0, 0.3, 0.1, 1.0)
			particles.amount = 100
			particles.lifetime = 1.0
		_:
			return { "error": { "code": ERR_INVALID_VALUE, "message": "Unknown preset: %s" % preset } }

	particles.process_material = material

	return { "result": { "path": particles_path, "preset_applied": preset } }

func get_particle_info(params: Dictionary) -> Dictionary:
	var particles_path = params.get("particles", "")
	if particles_path == "":
		return { "error": { "code": ERR_INVALID_PARTICLE_NODE, "message": "Missing particles parameter" } }

	var particles = _find_node_by_path(particles_path)
	if particles == null:
		return { "error": { "code": ERR_NOT_FOUND, "message": "Particle node not found at path: %s" % particles_path } }

	if not (particles is GPUParticles2D or particles is GPUParticles3D):
		return { "error": { "code": ERR_INVALID_TYPE, "message": "Node at path is not GPUParticles2D or GPUParticles3D: %s" % particles_path } }

	var info = {
		"name": particles.name,
		"type": "GPUParticles3D" if particles is GPUParticles3D else "GPUParticles2D",
		"amount": particles.amount,
		"lifetime": particles.lifetime,
		"preprocess": particles.preprocess,
		"explosiveness": particles.explosiveness,
		"fract_delta": particles.fract_delta,
		"one_shot": particles.one_shot,
		"visible": particles.visible
	}

	# Get material info if present
	if particles.process_material != null:
		var mat = particles.process_material
		info["material"] = {
			"type": "ParticleProcessMaterial",
			"has_color": mat.has("color"),
		}
		if mat.has("color"):
			info["material"]["color"] = {
				"r": mat.color.r,
				"g": mat.color.g,
				"b": mat.color.b,
				"a": mat.color.a
			}

	return { "result": info }

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

func _create_process_material(config: Dictionary) -> ParticleProcessMaterial:
	var material = ParticleProcessMaterial.new()

	if config.has("gravity"):
		var gravity_data = config.get("gravity", { "x": 0, "y": -98, "z": 0 })
		material.gravity = Vector3(
			gravity_data.get("x", 0.0),
			gravity_data.get("y", -98.0),
			gravity_data.get("z", 0.0)
		)

	if config.has("initial_velocity"):
		var vel = config.get("initial_velocity", {})
		material.initial_velocity_min = vel.get("min", 0.0)
		material.initial_velocity_max = vel.get("max", 0.0)

	if config.has("damping"):
		var damping_data = config.get("damping", {})
		material.damping = damping_data.get("value", 0.0)
		material.damping_random = damping_data.get("random", 0.0)

	if config.has("scale"):
		var scale_data = config.get("scale", {})
		material.scale_min = scale_data.get("min", 1.0)
		material.scale_max = scale_data.get("max", 1.0)

	if config.has("color"):
		var color_data = config.get("color", { "r": 1, "g": 1, "b": 1, "a": 1 })
		material.color = Color(
			color_data.get("r", 1.0),
			color_data.get("g", 1.0),
			color_data.get("b", 1.0),
			color_data.get("a", 1.0)
		)

	return material