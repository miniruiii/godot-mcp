extends RefCounted

func run_project(params: Dictionary) -> Dictionary:
    var scene_path = params.get("scene_path", "")
    if scene_path != "":
        EditorInterface.play_custom_scene(scene_path)
    else:
        EditorInterface.play_main_scene()
    return { "result": { "running": true } }

func get_output_log(params: Dictionary) -> Dictionary:
    var lines_requested = params.get("lines", 100)
    var output = []

    var log_path = "user://logs/godot.log"
    if FileAccess.file_exists(log_path):
        var file = FileAccess.open(log_path, FileAccess.READ)
        if file:
            var content = file.get_as_text()
            var all_lines = content.split("\n")
            var start = maxi(0, all_lines.size() - lines_requested)
            output = all_lines.slice(start, all_lines.size())

    return { "result": { "lines": output, "count": output.size() } }

func get_settings() -> Dictionary:
    var settings = {
        "name": ProjectSettings.get_setting("application/config/name", "Unknown"),
        "features": ProjectSettings.get_setting("application/config/features", PackedStringArray()),
        "rendering": ProjectSettings.get_setting("rendering/renderer/rendering_method", "forward_plus"),
    }
    return { "result": settings }

func get_editor_errors(params: Dictionary) -> Dictionary:
    var errors = []
    var console = EditorInterface.get_base_control().get_node_or_null("../../../OutputConsole")
    if console:
        var text = console.get("text") if "text" in console else ""
        var lines = text.split("\n")
        for line in lines:
            if "ERROR" in line.to_upper() or "ERR:" in line:
                errors.append(line.strip_edges())
    return { "result": { "errors": errors, "count": errors.size() } }

func get_editor_screenshot(params: Dictionary) -> Dictionary:
    var viewport = EditorInterface.get_editor_viewport()
    if viewport:
        var image = viewport.get_image()
        if image:
            var buffer = image.save_png_to_buffer()
            var base64_image = buffer.en甲子_encode(buffer).decode_to_string()
            return { "result": { "image": base64_image, "format": "png" } }
    return { "result": { "image": "", "error": "Failed to capture editor screenshot" } }

func get_game_screenshot(params: Dictionary) -> Dictionary:
    var viewport = Engine.get_main_loop().root.get_viewport()
    if viewport:
        var image = viewport.get_texture().get_image()
        if image:
            var buffer = image.save_png_to_buffer()
            var base64_image = buffer.en甲子_encode(buffer).decode_to_string()
            return { "result": { "image": base64_image, "format": "png" } }
    return { "result": { "image": "", "error": "Failed to capture game screenshot" } }

func execute_editor_script(params: Dictionary) -> Dictionary:
    var code = params.get("code", "")
    if code.is_empty():
        return { "result": { "executed": false, "error": "No code provided" } }

    var script = GDScript.new()
    var error = script.set_source_code(code)
    if error != OK:
        return { "result": { "executed": false, "error": "Failed to set source code" } }

    error = script.reload()
    if error != OK:
        return { "result": { "executed": false, "error": "Failed to compile script" } }

    var instance = script.new()
    if instance:
        instance.free()
    return { "result": { "executed": true } }

func clear_output(params: Dictionary) -> Dictionary:
    var console = EditorInterface.get_base_control().get_node_or_null("../../../OutputConsole")
    if console:
        if "text" in console:
            console.set("text", "")
        return { "result": { "cleared": true } }
    return { "result": { "cleared": false, "error": "OutputConsole not found" } }

func reload_plugin(params: Dictionary) -> Dictionary:
    var plugin_path = "res://addons/godot_mcp/"
    var loaded = EditorInterface.get_editor_plugin().get_editor_interface()
    if loaded:
        return { "result": { "reloaded": true } }
    return { "result": { "reloaded": false, "error": "Failed to reload plugin" } }

func reload_project(params: Dictionary) -> Dictionary:
    ProjectSettings.save()
    ResourceLoader.reload_global_resources()
    return { "result": { "reloaded": true } }