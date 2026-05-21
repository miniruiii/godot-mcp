extends RefCounted

# Error codes for audio commands
const ERR_NOT_FOUND = -32602
const ERR_INVALID_TYPE = -32000
const ERR_INVALID_VALUE = -32000
const ERR_BUS_NOT_FOUND = -32603
const ERR_EFFECT_NOT_SUPPORTED = -32604

func add_audio_player(params: Dictionary) -> Dictionary:
	var parent_path = params.get("parent", "")
	var player_name = params.get("name", "AudioStreamPlayer")
	var stream_path = params.get("stream", "")

	var parent = _find_node_by_path(parent_path)
	if parent == null:
		return { "error": { "code": ERR_NOT_FOUND, "message": "Parent node not found at path: %s" % parent_path } }

	if not parent is Node:
		return { "error": { "code": ERR_INVALID_TYPE, "message": "Parent is not a valid Node: %s" % parent_path } }

	var player = AudioStreamPlayer.new()
	player.set_name(player_name)

	if stream_path != "":
		var stream = load(stream_path)
		if stream != null and stream is AudioStream:
			player.stream = stream

		parent.add_child(player)

	return { "result": { "name": player_name, "path": parent_path + "/" + player_name, "stream": stream_path } }


func add_audio_bus(params: Dictionary) -> Dictionary:
	var bus_name = params.get("name", "NewBus")
	var bus_index = AudioServer.get_bus_count()

	# Check if bus with this name already exists
	for i in range(AudioServer.get_bus_count()):
		if AudioServer.get_bus_name(i) == bus_name:
			return { "error": { "code": ERR_INVALID_VALUE, "message": "Audio bus already exists: %s" % bus_name } }

	AudioServer.add_bus(bus_index)
	AudioServer.set_bus_name(bus_index, bus_name)

	return { "result": { "name": bus_name, "index": bus_index } }


func add_audio_bus_effect(params: Dictionary) -> Dictionary:
	var bus_name = params.get("bus", "")
	var effect_type = params.get("effect_type", "")

	# Find bus index by name
	var bus_index = -1
	for i in range(AudioServer.get_bus_count()):
		if AudioServer.get_bus_name(i) == bus_name:
			bus_index = i
			break

	if bus_index < 0:
		return { "error": { "code": ERR_BUS_NOT_FOUND, "message": "Audio bus not found: %s" % bus_name } }

	# Create effect based on type
	var effect: AudioEffect
	match effect_type:
		"reverb":
			effect = AudioEffectReverb.new()
		"delay":
			effect = AudioEffectDelay.new()
		"eq":
			effect = AudioEffectEQ.new()
		"eq10":
			effect = AudioEffectEQ10.new()
		"eq21":
			effect = AudioEffectEQ21.new()
		"chorus":
			effect = AudioEffectChorus.new()
		"compressor":
			effect = AudioEffectCompressor.new()
		"distortion":
			effect = AudioEffectDistortion.new()
		"filter":
			effect = AudioEffectFilter.new()
		"limiter":
			effect = AudioEffectLimiter.new()
		"panner":
			effect = AudioEffectPanner.new()
		"phaser":
			effect = AudioEffectPhaser.new()
		"pitch_shift":
			effect = AudioEffectPitchShift.new()
		"record":
			effect = AudioEffectRecord.new()
		"spectrum_analyzer":
			effect = AudioEffectSpectrumAnalyzer.new()
		"subtract":
			effect = AudioEffectSubtract.new()
		"transpose":
			effect = AudioEffectTranspose.new()
		"hard_limiter":
			effect = AudioEffectHardLimiter.new()
		_:
			return { "error": { "code": ERR_EFFECT_NOT_SUPPORTED, "message": "Unsupported effect type: %s" % effect_type } }

	var effect_index = AudioServer.get_bus_effect_count(bus_index)
	AudioServer.add_bus_effect(bus_index, effect)

	return { "result": { "bus": bus_name, "bus_index": bus_index, "effect_type": effect_type, "effect_index": effect_index } }


func set_audio_bus(params: Dictionary) -> Dictionary:
	var player_path = params.get("audio_player", "")
	var bus_name = params.get("bus", "")

	var player = _find_node_by_path(player_path)
	if player == null:
		return { "error": { "code": ERR_NOT_FOUND, "message": "AudioStreamPlayer not found at path: %s" % player_path } }

	if not player is AudioStreamPlayer:
		return { "error": { "code": ERR_INVALID_TYPE, "message": "Node at path is not an AudioStreamPlayer: %s" % player_path } }

	# Find bus index by name
	var bus_index = -1
	for i in range(AudioServer.get_bus_count()):
		if AudioServer.get_bus_name(i) == bus_name:
			bus_index = i
			break

	if bus_index < 0:
		return { "error": { "code": ERR_BUS_NOT_FOUND, "message": "Audio bus not found: %s" % bus_name } }

	player.set_bus(bus_name)

	return { "result": { "player": player_path, "bus": bus_name, "bus_index": bus_index } }


func get_audio_bus_layout(params: Dictionary) -> Dictionary:
	var buses = []
	for i in range(AudioServer.get_bus_count()):
		var bus_name = AudioServer.get_bus_name(i)
		var effects = []

		for j in range(AudioServer.get_bus_effect_count(i)):
			var effect = AudioServer.get_bus_effect(i, j)
			var effect_type = "unknown"
			if effect is AudioEffectReverb:
				effect_type = "reverb"
			elif effect is AudioEffectDelay:
				effect_type = "delay"
			elif effect is AudioEffectEQ:
				effect_type = "eq"
			elif effect is AudioEffectEQ10:
				effect_type = "eq10"
			elif effect is AudioEffectEQ21:
				effect_type = "eq21"
			elif effect is AudioEffectChorus:
				effect_type = "chorus"
			elif effect is AudioEffectCompressor:
				effect_type = "compressor"
			elif effect is AudioEffectDistortion:
				effect_type = "distortion"
			elif effect is AudioEffectFilter:
				effect_type = "filter"
			elif effect is AudioEffectLimiter:
				effect_type = "limiter"
			elif effect is AudioEffectPanner:
				effect_type = "panner"
			elif effect is AudioEffectPhaser:
				effect_type = "phaser"
			elif effect is AudioEffectPitchShift:
				effect_type = "pitch_shift"
			elif effect is AudioEffectRecord:
				effect_type = "record"
			elif effect is AudioEffectSpectrumAnalyzer:
				effect_type = "spectrum_analyzer"
			elif effect is AudioEffectSubtract:
				effect_type = "subtract"
			elif effect is AudioEffectTranspose:
				effect_type = "transpose"
			elif effect is AudioEffectHardLimiter:
				effect_type = "hard_limiter"

			effects.append({ "index": j, "type": effect_type })

		buses.append({
			"index": i,
			"name": bus_name,
			"volume_db": AudioServer.get_bus_volume_db(i),
			"mute": AudioServer.is_bus_monitoring(i),
			"effects": effects
		})

	return { "result": { "buses": buses } }


func get_audio_info(params: Dictionary) -> Dictionary:
	var player_path = params.get("audio_player", "")

	if player_path == "":
		return { "error": { "code": ERR_NOT_FOUND, "message": "Missing audio_player parameter" } }

	var player = _find_node_by_path(player_path)
	if player == null:
		return { "error": { "code": ERR_NOT_FOUND, "message": "AudioStreamPlayer not found at path: %s" % player_path } }

	if not player is AudioStreamPlayer:
		return { "error": { "code": ERR_INVALID_TYPE, "message": "Node at path is not an AudioStreamPlayer: %s" % player_path } }

	var stream_info = null
	if player.stream != null:
		stream_info = {
			"type": "AudioStream",
			"class": player.stream.get_class()
		}

	return {
		"result": {
			"path": player_path,
			"bus": player.get_bus(),
			"volume_db": player.volume_db,
			"pitch_scale": player.pitch_scale,
			"playing": player.is_playing(),
			"stream": stream_info
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