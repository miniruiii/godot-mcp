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