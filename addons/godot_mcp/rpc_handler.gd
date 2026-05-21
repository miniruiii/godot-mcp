extends RefCounted

const SceneEditorClass = preload("res://addons/godot_mcp/editors/scene_editor.gd")
const ScriptEditorClass = preload("res://addons/godot_mcp/editors/script_editor.gd")
const ProjectEditorClass = preload("res://addons/godot_mcp/editors/project_editor.gd")
const RuntimeCommandsClass = preload("res://addons/godot_mcp/editors/runtime_commands.gd")
const InputCommandsClass = preload("res://addons/godot_mcp/editors/input_commands.gd")
const AnimationCommandsClass = preload("res://addons/godot_mcp/editors/animation_commands.gd")
const TilemapCommandsClass = preload("res://addons/godot_mcp/editors/tilemap_commands.gd")
const ThemeCommandsClass = preload("res://addons/godot_mcp/editors/theme_commands.gd")
const ResourceCommandsClass = preload("res://addons/godot_mcp/editors/resource_commands.gd")
const PhysicsCommandsClass = preload("res://addons/godot_mcp/editors/physics_commands.gd")
const NavigationCommandsClass = preload("res://addons/godot_mcp/editors/navigation_commands.gd")
const Utils = preload("res://addons/godot_mcp/utils.gd")

var scene_editor_inst: SceneEditorClass
var script_editor_inst: ScriptEditorClass
var project_editor_inst: ProjectEditorClass
var runtime_commands: RuntimeCommandsClass
var input_commands: InputCommandsClass
var animation_commands: AnimationCommandsClass
var tilemap_commands: TilemapCommandsClass
var theme_commands: ThemeCommandsClass
var resource_commands: ResourceCommandsClass
var physics_commands: PhysicsCommandsClass
var navigation_commands: NavigationCommandsClass

func _init():
    scene_editor_inst = SceneEditorClass.new()
    script_editor_inst = ScriptEditorClass.new()
    project_editor_inst = ProjectEditorClass.new()
    runtime_commands = RuntimeCommandsClass.new()
    input_commands = InputCommandsClass.new()
    animation_commands = AnimationCommandsClass.new()
    tilemap_commands = TilemapCommandsClass.new()
    theme_commands = ThemeCommandsClass.new()
    resource_commands = ResourceCommandsClass.new()
    physics_commands = PhysicsCommandsClass.new()
    navigation_commands = NavigationCommandsClass.new()

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

    var result = _route(method, params)

    if result.has("error"):
        return _error_response(id, result["error"]["code"], result["error"]["message"], result["error"].get("data"))

    return _success_response(id, result.get("result", {}))

func _route(method: String, params: Dictionary) -> Dictionary:
    match method:
        "scene.get_tree":
            return scene_editor_inst.get_tree(params)
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
        "scene.get_file_content":
            return scene_editor_inst.get_scene_file_content(params)
        "scene.delete":
            return scene_editor_inst.delete_scene(params)
        "scene.add_instance":
            return scene_editor_inst.add_scene_instance(params)
        "scene.play":
            return scene_editor_inst.play_scene(params)
        "scene.stop":
            return scene_editor_inst.stop_scene(params)
        "scene.get_signals":
            return scene_editor_inst.get_signals(params)
        "script.list":
            return script_editor_inst.list_scripts(params)
        "script.attach":
            return script_editor_inst.attach_script(params)
        "script.validate":
            return script_editor_inst.validate_script(params)
        "script.search":
            return script_editor_inst.search_in_files(params)
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
        "editor.get_errors":
            return project_editor_inst.get_editor_errors(params)
        "editor.get_screenshot":
            return project_editor_inst.get_editor_screenshot(params)
        "editor.get_game_screenshot":
            return project_editor_inst.get_game_screenshot(params)
        "editor.execute_script":
            return project_editor_inst.execute_editor_script(params)
        "editor.clear_output":
            return project_editor_inst.clear_output(params)
        "editor.reload_plugin":
            return project_editor_inst.reload_plugin(params)
        "editor.reload_project":
            return project_editor_inst.reload_project(params)
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
            return runtime_commands.wait_for_node(params)
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
            return runtime_commands.replay_recording(params)
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
        # animation.* routes for animation commands (6 tools)
        "animation.list":
            return animation_commands.list_animations(params)
        "animation.create":
            return animation_commands.create_animation(params)
        "animation.add_track":
            return animation_commands.add_animation_track(params)
        "animation.set_keyframe":
            return animation_commands.set_animation_keyframe(params)
        "animation.get_info":
            return animation_commands.get_animation_info(params)
        "animation.remove":
            return animation_commands.remove_animation(params)
        # tilemap.* routes for tilemap commands (6 tools)
        "tilemap.set_cell":
            return tilemap_commands.tilemap_set_cell(params)
        "tilemap.get_cell":
            return tilemap_commands.tilemap_get_cell(params)
        "tilemap.clear":
            return tilemap_commands.tilemap_clear(params)
        "tilemap.get_info":
            return tilemap_commands.tilemap_get_info(params)
        "tilemap.get_used_cells":
            return tilemap_commands.tilemap_get_used_cells(params)
        "tilemap.fill_rect":
            return tilemap_commands.tilemap_fill_rect(params)
        # theme.* routes for theme commands (6 tools)
        "theme.create":
            return theme_commands.create_theme(params)
        "theme.set_color":
            return theme_commands.set_theme_color(params)
        "theme.set_constant":
            return theme_commands.set_theme_constant(params)
        "theme.set_font_size":
            return theme_commands.set_theme_font_size(params)
        "theme.set_stylebox":
            return theme_commands.set_theme_stylebox(params)
        "theme.get_info":
            return theme_commands.get_theme_info(params)
        # resource.* routes for resource commands (6 tools)
        "resource.read":
            return resource_commands.read_resource(params)
        "resource.edit":
            return resource_commands.edit_resource(params)
        "resource.create":
            return resource_commands.create_resource(params)
        "resource.get_preview":
            return resource_commands.get_resource_preview(params)
        "resource.add_autoload":
            return resource_commands.add_autoload(params)
        "resource.remove_autoload":
            return resource_commands.remove_autoload(params)
        # physics.* routes for physics commands (6 tools)
        "physics.setup_body":
            return physics_commands.setup_physics_body(params)
        "physics.setup_collision":
            return physics_commands.setup_collision(params)
        "physics.set_layers":
            return physics_commands.set_physics_layers(params)
        "physics.get_layers":
            return physics_commands.get_physics_layers(params)
        "physics.get_collision_info":
            return physics_commands.get_collision_info(params)
        "physics.add_raycast":
            return physics_commands.add_raycast(params)
        # navigation.* routes for navigation commands (6 tools)
        "navigation.setup_region":
            return navigation_commands.setup_navigation_region(params)
        "navigation.setup_agent":
            return navigation_commands.setup_navigation_agent(params)
        "navigation.bake_mesh":
            return navigation_commands.bake_navigation_mesh(params)
        "navigation.set_layers":
            return navigation_commands.set_navigation_layers(params)
        "navigation.get_info":
            return navigation_commands.get_navigation_info(params)
        "navigation.get_path":
            return navigation_commands.get_navigation_path(params)
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