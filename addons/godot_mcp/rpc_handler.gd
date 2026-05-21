extends RefCounted

const SceneEditorClass = preload("res://addons/godot_mcp/editors/scene_editor.gd")
const ScriptEditorClass = preload("res://addons/godot_mcp/editors/script_editor.gd")
const ProjectEditorClass = preload("res://addons/godot_mcp/editors/project_editor.gd")
const Utils = preload("res://addons/godot_mcp/utils.gd")

var scene_editor: SceneEditorClass
var script_editor: ScriptEditorClass
var project_editor: ProjectEditorClass

func _init():
    scene_editor = SceneEditorClass.new()
    script_editor = ScriptEditorClass.new()
    project_editor = ProjectEditorClass.new()

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
            return scene_editor.get_tree(params)
        "scene.add_node":
            return scene_editor.add_node(params)
        "scene.remove_node":
            return scene_editor.remove_node(params)
        "scene.update_property":
            return scene_editor.update_property(params)
        "scene.get_node":
            return scene_editor.get_node(params)
        "scene.save":
            return scene_editor.save_scene(params)
        "scene.open":
            return scene_editor.open_scene(params)
        "script.open":
            return script_editor.open_script(params)
        "script.get_content":
            return script_editor.get_content(params)
        "script.get_open":
            return script_editor.get_open_scripts()
        "project.run":
            return project_editor.run_project(params)
        "project.get_output_log":
            return project_editor.get_output_log(params)
        "project.get_settings":
            return project_editor.get_settings()
        "project.get_info":
            return { "result": Utils.get_engine_info() }
        "handshake":
            return { "result": { "version": Utils.PLUGIN_VERSION, "godot_version": Engine.get_version_info()["string"] } }
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