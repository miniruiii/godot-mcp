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
    var source = ""

    # Try project runtime log first (requires file_logging enabled)
    var log_path = "user://logs/godot.log"
    if FileAccess.file_exists(log_path):
        var file = FileAccess.open(log_path, FileAccess.READ)
        if file:
            var content = file.get_as_text()
            var all_lines = content.split("\n")
            var start = maxi(0, all_lines.size() - lines_requested)
            output = all_lines.slice(start, all_lines.size())
            source = log_path
    else:
        # Fallback: try editor logs directory
        var editor_logs_dir = OS.get_config_dir() + "/Godot/editor_logs/"
        if DirAccess.dir_exists_absolute(editor_logs_dir):
            var dir = DirAccess.open(editor_logs_dir)
            if dir:
                var latest_file = ""
                var latest_time = 0
                dir.list_dir_begin()
                var file_name = dir.get_next()
                while file_name != "":
                    if not dir.current_is_dir() and file_name.ends_with(".log"):
                        var full_path = editor_logs_dir + file_name
                        var mod_time = FileAccess.get_modified_time(full_path)
                        if mod_time > latest_time:
                            latest_time = mod_time
                            latest_file = full_path
                    file_name = dir.get_next()
                dir.list_dir_end()

                if latest_file != "":
                    var file = FileAccess.open(latest_file, FileAccess.READ)
                    if file:
                        var content = file.get_as_text()
                        var all_lines = content.split("\n")
                        var start = maxi(0, all_lines.size() - lines_requested)
                        output = all_lines.slice(start, all_lines.size())
                        source = latest_file

    return { "result": { "lines": output, "count": output.size(), "source": source } }

func get_settings() -> Dictionary:
    var settings = {
        "name": ProjectSettings.get_setting("application/config/name", "Unknown"),
        "features": ProjectSettings.get_setting("application/config/features", PackedStringArray()),
        "rendering": ProjectSettings.get_setting("rendering/renderer/rendering_method", "forward_plus"),
    }
    return { "result": settings }