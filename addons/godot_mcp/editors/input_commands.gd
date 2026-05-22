extends RefCounted

# Error codes for input commands
const ERR_INVALID_KEYCODE = -32015
const ERR_INVALID_POSITION = -32016
const ERR_INVALID_BUTTON = -32017
const ERR_INVALID_ACTION = -32018
const ERR_INVALID_EVENT = -32019
const ERR_INVALID_EVENTS_ARRAY = -32020

func simulate_key(params: Dictionary) -> Dictionary:
	print("[MCP] input.simulate_key: keycode=%s pressed=%s" % [params.get("keycode", ""), params.get("pressed", true)])
	var keycode = params.get("keycode", "")
	if keycode == "":
		return { "error": { "code": ERR_INVALID_KEYCODE, "message": "Missing keycode parameter" } }

	var pressed = params.get("pressed", true)
	var modifiers = params.get("modifiers", {})
	if not modifiers is Dictionary:
		modifiers = {}

	var keycode_value = OS.find_keycode_from_string(keycode)
	if keycode_value == 0:
		return { "error": { "code": ERR_INVALID_KEYCODE, "message": "Invalid keycode: %s" % keycode } }

	var event = InputEventKey.new()
	event.keycode = keycode_value
	event.pressed = pressed
	event.meta_pressed = modifiers.get("meta", false)
	event.ctrl_pressed = modifiers.get("ctrl", false)
	event.shift_pressed = modifiers.get("shift", false)
	event.alt_pressed = modifiers.get("alt", false)

	Input.parse_input_event(event)
	return { "result": { "simulated": true, "keycode": keycode, "pressed": pressed } }

func simulate_mouse_click(params: Dictionary) -> Dictionary:
	print("[MCP] input.simulate_mouse_click: position=(%s,%s) button=%d pressed=%s" % [params.get("position", {}).get("x", 0), params.get("position", {}).get("y", 0), params.get("button", 1), params.get("pressed", true)])
	var position = params.get("position", {})
	if not position.has("x") or not position.has("y"):
		return { "error": { "code": ERR_INVALID_POSITION, "message": "Missing position.x or position.y" } }

	var button = params.get("button", 1)
	if button < 1 or button > 9:
		return { "error": { "code": ERR_INVALID_BUTTON, "message": "Button must be between 1 and 9 (MouseButton enum)" } }

	var pressed = params.get("pressed", true)

	var event = InputEventMouseButton.new()
	event.position = Vector2(position["x"], position["y"])
	event.button_index = button
	event.pressed = pressed

	Input.parse_input_event(event)
	return { "result": { "simulated": true, "position": event.position, "button": button, "pressed": pressed } }

func simulate_mouse_move(params: Dictionary) -> Dictionary:
	print("[MCP] input.simulate_mouse_move: position=(%s,%s)" % [params.get("position", {}).get("x", 0), params.get("position", {}).get("y", 0)])
	var position = params.get("position", {})
	if not position.has("x") or not position.has("y"):
		return { "error": { "code": ERR_INVALID_POSITION, "message": "Missing position.x or position.y" } }

	var event = InputEventMouseMotion.new()
	event.position = Vector2(position["x"], position["y"])

	Input.parse_input_event(event)
	return { "result": { "simulated": true, "position": event.position } }

func simulate_action(params: Dictionary) -> Dictionary:
	print("[MCP] input.simulate_action: action=%s pressed=%s" % [params.get("action", ""), params.get("pressed", true)])
	var action = params.get("action", "")
	if action == "":
		return { "error": { "code": ERR_INVALID_ACTION, "message": "Missing action parameter" } }

	var pressed = params.get("pressed", true)

	if pressed:
		Input.action_press(action)
	else:
		Input.action_release(action)

	return { "result": { "simulated": true, "action": action, "pressed": pressed } }

func simulate_sequence(params: Dictionary) -> Dictionary:
	print("[MCP] input.simulate_sequence: events=%d" % params.get("events", []).size())
	var events = params.get("events", [])
	if events.size() == 0:
		return { "error": { "code": ERR_INVALID_EVENTS_ARRAY, "message": "Missing or empty events array" } }

	var simulated_count = 0
	for event_data in events:
		var event = _parse_event_from_dict(event_data)
		if event != null:
			Input.parse_input_event(event)
			simulated_count += 1

	return { "result": { "simulated": true, "count": simulated_count } }

func get_input_actions(params: Dictionary) -> Dictionary:
	print("[MCP] input.get_input_actions")
	var actions = InputMap.get_actions()
	var result: Array[String] = []

	for action in actions:
		result.append(action)

	return { "result": { "actions": result } }

func set_input_action(params: Dictionary) -> Dictionary:
	print("[MCP] input.set_input_action: action=%s" % params.get("action", ""))
	var action = params.get("action", "")
	if action == "":
		return { "error": { "code": ERR_INVALID_ACTION, "message": "Missing action parameter" } }

	var event_data = params.get("event", {})
	if event_data.size() == 0:
		return { "error": { "code": ERR_INVALID_EVENT, "message": "Missing event parameter" } }

	var event = _parse_event_from_dict(event_data)
	if event == null:
		return { "error": { "code": ERR_INVALID_EVENT, "message": "Invalid event format" } }

	InputMap.action_add_event(action, event)
	return { "result": { "set": true, "action": action } }

func _parse_event_from_dict(event_data: Dictionary) -> InputEvent:
	var event_type = event_data.get("type", "")

	if event_type == "key":
		var event = InputEventKey.new()
		var keycode = event_data.get("keycode", "")
		if keycode != "":
			event.keycode = OS.find_keycode_from_string(keycode)
		else:
			var raw_keycode = event_data.get("keycode_value", 0)
			if raw_keycode == 0:
				return null
			event.keycode = raw_keycode
		event.pressed = event_data.get("pressed", true)
		event.meta_pressed = event_data.get("meta_pressed", false)
		event.ctrl_pressed = event_data.get("ctrl_pressed", false)
		event.shift_pressed = event_data.get("shift_pressed", false)
		event.alt_pressed = event_data.get("alt_pressed", false)
		return event

	elif event_type == "mouse_button":
		var event = InputEventMouseButton.new()
		event.position = event_data.get("position", Vector2.ZERO)
		event.button_index = event_data.get("button_index", 1)
		event.pressed = event_data.get("pressed", true)
		return event

	elif event_type == "mouse_motion":
		var event = InputEventMouseMotion.new()
		event.position = event_data.get("position", Vector2.ZERO)
		return event

	return null
