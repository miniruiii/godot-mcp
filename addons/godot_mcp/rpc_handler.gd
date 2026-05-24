extends RefCounted

const SceneEditorClass = preload("res://addons/godot_mcp/editors/scene_editor.gd")
const ScriptEditorClass = preload("res://addons/godot_mcp/editors/script_editor.gd")
const ProjectEditorClass = preload("res://addons/godot_mcp/editors/project_editor.gd")
const RuntimeCommandsClass = preload("res://addons/godot_mcp/editors/runtime_commands.gd")
const InputCommandsClass = preload("res://addons/godot_mcp/editors/input_commands.gd")
const Utils = preload("res://addons/godot_mcp/utils.gd")

var scene_editor_inst: SceneEditorClass
var script_editor_inst: ScriptEditorClass
var project_editor_inst: ProjectEditorClass
var runtime_commands: RuntimeCommandsClass
var input_commands: InputCommandsClass

func _init():
    scene_editor_inst = SceneEditorClass.new()
    script_editor_inst = ScriptEditorClass.new()
    project_editor_inst = ProjectEditorClass.new()
    runtime_commands = RuntimeCommandsClass.new()
    input_commands = InputCommandsClass.new()

func handle(message: String) -> String:
    var parsed = JSON.parse_string(message)
    if parsed == null or typeof(parsed) != TYPE_DICTIONARY:
        return _error_response(null, -32700, "Parse error")

    if not parsed.has("jsonrpc") or parsed["jsonrpc"] != "2.0":
        return _error_response(parsed.get("id", null), -32600, "Invalid Request: not JSON-RPC 2.0")

    var id = parsed.get("id", null)
    var method = parsed.get("method", "")
    var params = parsed.get("params", {})

    if method == "":
        return _error_response(id, -32600, "Invalid Request: missing method")

    if method != "log.print":
        var req_log = "[MCP] → %s" % method
        print(req_log)
        project_editor_inst.append_log(req_log)
    var result = await _route(method, params)

    if result.has("error"):
        if method != "log.print":
            var err_log = "[MCP] ← ERROR %s: %s" % [method, result["error"]["message"]]
            print(err_log)
            project_editor_inst.append_log(err_log)
        return _error_response(id, result["error"]["code"], result["error"]["message"], result["error"].get("data"))

    if method != "log.print":
        var ok_log = "[MCP] ← OK %s" % method
        print(ok_log)
        project_editor_inst.append_log(ok_log)
    return _success_response(id, result.get("result", {}))

func _route(method: String, params: Dictionary) -> Dictionary:
    match method:
        "scene.get_tree":
            return await scene_editor_inst.get_tree(params)
        "scene.add_node":
            return scene_editor_inst.add_node(params)
        "scene.remove_node":
            return scene_editor_inst.remove_node(params)
        "scene.update_property":
            return scene_editor_inst.update_property(params)
        "scene.get_node":
            return scene_editor_inst.get_node(params)
        "scene.save":
            return scene_editor_inst.save_scene(params)
        "scene.open":
            return scene_editor_inst.open_scene(params)
        "script.open":
            return script_editor_inst.open_script(params)
        "script.get_content":
            return script_editor_inst.get_content(params)
        "script.get_open":
            return script_editor_inst.get_open_scripts()
        "project.run":
            return project_editor_inst.run_project(params)
        "project.get_output_log":
            return project_editor_inst.get_output_log(params)
        "project.get_settings":
            return project_editor_inst.get_settings()
        "project.get_info":
            return { "result": Utils.get_engine_info() }
        "project.uid_to_path":
            return project_editor_inst.uid_to_project_path(params)
        "project.path_to_uid":
            return project_editor_inst.project_path_to_uid(params)
        "project.rescan_resources":
            return project_editor_inst.rescan_resources(params)
        "project.remove_uid":
            return project_editor_inst.remove_uid(params)
        "handshake":
            return { "result": { "version": Utils.PLUGIN_VERSION, "godot_version": Engine.get_version_info()["string"] } }
        # game.* routes for runtime commands (19 tools)
        "game.get_tree":
            return runtime_commands.get_tree(params)
        "game.get_node_properties":
            return runtime_commands.get_node_properties(params)
        "game.set_node_property":
            return runtime_commands.set_node_property(params)
        "game.execute_script":
            return runtime_commands.execute_script(params)
        "game.find_nodes_by_script":
            return runtime_commands.find_nodes_by_script(params)
        "game.get_autoload":
            return runtime_commands.get_autoload(params)
        "game.batch_get_properties":
            return runtime_commands.batch_get_properties(params)
        "game.find_ui_elements":
            return runtime_commands.find_ui_elements(params)
        "game.click_button_by_text":
            return runtime_commands.click_button_by_text(params)
        "game.wait_for_node":
            return await runtime_commands.wait_for_node(params)
        "game.find_nearby_nodes":
            return runtime_commands.find_nearby_nodes(params)
        "game.navigate_to":
            return runtime_commands.navigate_to(params)
        "game.get_game_node_property":
            return runtime_commands.get_game_node_property(params)
        "game.capture_frames":
            return runtime_commands.capture_frames(params)
        "game.monitor_properties":
            return runtime_commands.monitor_properties(params)
        "game.start_recording":
            return runtime_commands.start_recording(params)
        "game.stop_recording":
            return runtime_commands.stop_recording(params)
        "game.replay_recording":
            return await runtime_commands.replay_recording(params)
        # input.* routes for input commands (7 tools)
        "input.simulate_key":
            return input_commands.simulate_key(params)
        "input.simulate_mouse_click":
            return input_commands.simulate_mouse_click(params)
        "input.simulate_mouse_move":
            return input_commands.simulate_mouse_move(params)
        "input.simulate_action":
            return input_commands.simulate_action(params)
        "input.simulate_sequence":
            return input_commands.simulate_sequence(params)
        "input.get_input_actions":
            return input_commands.get_input_actions(params)
        "input.set_input_action":
            return input_commands.set_input_action(params)
        # node.* routes for scene editor node tools (5 tools)
        "node.duplicate":
            return scene_editor_inst.duplicate_node(params)
        "node.move":
            return scene_editor_inst.move_node(params)
        "node.connect_signal":
            return scene_editor_inst.connect_signal(params)
        "node.disconnect_signal":
            return scene_editor_inst.disconnect_signal(params)
        "node.rename":
            return scene_editor_inst.rename_node(params)
        "node.get_groups":
            return scene_editor_inst.get_node_groups(params)
        "node.set_groups":
            return scene_editor_inst.set_node_groups(params)
        "node.find_in_group":
            return scene_editor_inst.find_nodes_in_group(params)
        "log.print":
            return project_editor_inst.print_log(params)
        _:
            return { "error": { "code": -32601, "message": "Method not found: %s" % method } }

func _success_response(id: Variant, result: Dictionary) -> String:
    var resp = { "jsonrpc": "2.0", "id": id, "result": result }
    return JSON.stringify(resp)

func _error_response(id: Variant, code: int, message: String, data: Variant = null) -> String:
    var err = { "code": code, "message": message }
    if data != null:
        err["data"] = data
    var resp = { "jsonrpc": "2.0", "id": id, "error": err }
    return JSON.stringify(resp)