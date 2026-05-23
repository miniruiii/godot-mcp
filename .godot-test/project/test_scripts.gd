extends Node

var passed = 0
var failed = 0

func _ready() -> void:
	print("=== Godot MCP Plugin Compilation Test ===")

	var scripts = [
		"res://addons/godot_mcp/plugin.gd",
		"res://addons/godot_mcp/websocket_server.gd",
		"res://addons/godot_mcp/rpc_handler.gd",
		"res://addons/godot_mcp/utils.gd",
		"res://addons/godot_mcp/editors/scene_editor.gd",
		"res://addons/godot_mcp/editors/script_editor.gd",
		"res://addons/godot_mcp/editors/project_editor.gd",
		"res://addons/godot_mcp/editors/runtime_commands.gd",
		"res://addons/godot_mcp/editors/input_commands.gd",
	]

	for script_path in scripts:
		var script_res = load(script_path)
		if script_res:
			print("[PASS] %s" % script_path)
			passed += 1
		else:
			print("[FAIL] %s - could not load" % script_path)
			failed += 1

	print("\n=== Results: %d passed, %d failed ===" % [passed, failed])
	if failed > 0:
		print("FAILED")
	else:
		print("SUCCESS")