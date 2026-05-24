extends RefCounted

var debug_mode: bool = true

func print_log(params: Dictionary) -> Dictionary:
    var message = params.get("message", "")
    var level = params.get("level", "debug")

    if level == "debug" and not debug_mode:
        return { "result": { "printed": false } }

    var line = "[MCP] %s" % message
    print(line)
    append_log(line)
    return { "result": { "printed": true } }

var _log_lines: Array[String] = []
var _max_log_lines: int = 1000

func append_log(line: String) -> void:
    _log_lines.append(line)
    if _log_lines.size() > _max_log_lines:
        _log_lines.pop_front()

func run_project(params: Dictionary) -> Dictionary:
    var scene_path = params.get("scene_path", "")
    print("[MCP] run_project: scene_path=%s" % scene_path)
    if scene_path != "":
        EditorInterface.play_custom_scene(scene_path)
    else:
        EditorInterface.play_main_scene()
    return { "result": { "running": true } }

func get_output_log(params: Dictionary) -> Dictionary:
    var lines_requested = params.get("lines", 100)
    print("[MCP] get_output_log: lines=%d" % lines_requested)
    var output: Array[String] = []
    var source = ""

    # Priority 1: in-memory MCP log buffer (captures all MCP print output)
    if _log_lines.size() > 0:
        var start = maxi(0, _log_lines.size() - lines_requested)
        output = _log_lines.slice(start, _log_lines.size())
        source = "mcp_memory_buffer"
    else:
        # Fallback 1: project runtime log (requires file_logging enabled)
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
            # Fallback 2: editor logs directory
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
    print("[MCP] get_settings")
    var settings = {
        "name": ProjectSettings.get_setting("application/config/name", "Unknown"),
        "features": ProjectSettings.get_setting("application/config/features", PackedStringArray()),
        "rendering": ProjectSettings.get_setting("rendering/renderer/rendering_method", "forward_plus"),
    }
    return { "result": settings }


func remove_uid(params: Dictionary) -> Dictionary:
    print("[MCP] remove_uid")
    var uid_str = params.get("uid", "")
    if uid_str == "":
        return { "error": { "code": -32602, "message": "Missing uid parameter" } }
    var uid = ResourceUID.text_to_id(uid_str)
    if not ResourceUID.has_id(uid):
        return { "error": { "code": -404, "message": "UID '%s' not found" % uid_str } }
    var path = ResourceUID.get_id_path(uid)
    ResourceUID.remove_id(uid)
    return { "result": { "uid": uid_str, "path": path, "removed": true } }


async func rescan_resources(params: Dictionary) -> Dictionary:
    print("[MCP] rescan_resources")
    if Engine.is_editor_hint():
        var efs = EditorInterface.get_resource_filesystem()
        efs.scan()
        await efs.filesystem_changed
        return { "result": { "scanned": true } }
    else:
        return { "error": { "code": -32002, "message": "This operation is only available in the Godot editor" } }


func uid_to_project_path(params: Dictionary) -> Dictionary:
    var uid_str = params.get("uid", "")
    if uid_str == "":
        return { "error": { "code": -32602, "message": "Missing uid parameter" } }
    var uid = ResourceUID.text_to_id(uid_str)
    if uid == ResourceUID.INVALID_ID:
        return { "error": { "code": -32602, "message": "Invalid UID format: %s" % uid_str } }
    if not ResourceUID.has_id(uid):
        return { "error": { "code": -404, "message": "UID '%s' not found" % uid_str } }
    var path = ResourceUID.get_id_path(uid)
    return { "result": { "uid": uid_str, "path": path } }


func project_path_to_uid(params: Dictionary) -> Dictionary:
    var path = params.get("path", "")
    if path == "":
        return { "error": { "code": -32602, "message": "Missing path parameter" } }
    if not ResourceLoader.exists(path):
        return { "error": { "code": -404, "message": "Resource not found: %s" % path } }
    var uid = ResourceLoader.get_resource_uid(path)
    if uid == ResourceUID.INVALID_ID:
        return { "error": { "code": -32001, "message": "No UID assigned to '%s'" % path } }
    var uid_str = ResourceUID.id_to_text(uid)
    return { "result": { "path": path, "uid": uid_str } }