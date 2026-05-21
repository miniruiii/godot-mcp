extends RefCounted

func open_script(params: Dictionary) -> Dictionary:
    var script_path = params.get("script_path", "")
    if script_path == "":
        return { "error": { "code": -32010, "message": "Missing script_path" } }

    var res = load(script_path)
    if res == null:
        return { "error": { "code": -32011, "message": "Script not found: %s" % script_path } }

    EditorInterface.edit_script(res)
    return { "result": { "opened": true, "script_path": script_path } }

func get_content(params: Dictionary) -> Dictionary:
    var script_path = params.get("script_path", "")
    var script = load(script_path) as Script
    if script == null:
        return { "error": { "code": -32011, "message": "Script not found: %s" % script_path } }

    var source = script.source_code
    return {
        "result": {
            "content": source,
            "line_count": source.count("\n") + 1,
            "language": "gdscript" if script is GDScript else "csharp",
        }
    }

func get_open_scripts() -> Dictionary:
    var editor_interface = EditorInterface.get_script_editor()
    var open_scripts: Array = editor_interface.get_open_scripts()
    var result = []
    for scr in open_scripts:
        result.append({
            "path": scr.resource_path,
            "name": scr.resource_path.get_file(),
        })
    return { "result": { "scripts": result } }

func list_scripts(params: Dictionary) -> Dictionary:
    var extensions = params.get("extensions", ["gd", "cs"])
    var project_path = ProjectSettings.get_setting("application/config/name")
    if project_path == "":
        project_path = "res://"

    var scripts = []
    _scan_directory_recursive(project_path, extensions, scripts)
    return { "result": { "scripts": scripts } }

func _scan_directory_recursive(path: String, extensions: Array, output: Array):
    var dir = DirAccess.open(path)
    if dir == null:
        return
    dir.list_dir_begin()
    var file_name = dir.get_next()
    while file_name != "":
        if dir.current_is_dir() and not file_name.begins_with("."):
            var subpath = path.path_join(file_name)
            _scan_directory_recursive(subpath, extensions, output)
        else:
            var ext = file_name.get_extension()
            if extensions.has(ext):
                var full_path = path.path_join(file_name)
                var class_name = _extract_class_name(full_path, ext)
                output.append({
                    "path": full_path,
                    "class_name": class_name,
                    "name": file_name,
                })
        file_name = dir.get_next()
    dir.list_dir_end()

func _extract_class_name(script_path: String, ext: String) -> String:
    var script = load(script_path) as Script
    if script != null and script.get_global_class():
        return script.get_global_class_name()
    return script_path.get_file().get_basename()

func attach_script(params: Dictionary) -> Dictionary:
    var node_path = params.get("node_path", "")
    var script_path = params.get("script_path", "")
    if node_path == "" or script_path == "":
        return { "error": { "code": -32600, "message": "Missing node_path or script_path" } }

    var node = get_node(node_path)
    if node == null:
        return { "error": { "code": -32600, "message": "Node not found: %s" % node_path } }

    var script = load(script_path)
    if script == null:
        return { "error": { "code": -32600, "message": "Script not found: %s" % script_path } }

    node.set_script(script)
    return { "result": { "attached": true, "node_path": node_path, "script_path": script_path } }

func validate_script(params: Dictionary) -> Dictionary:
    var script_path = params.get("script_path", "")
    var code = params.get("code", "")

    if script_path == "" and code == "":
        return { "error": { "code": -32600, "message": "Missing script_path or code" } }

    var gd_script = GDScript.new()
    if script_path != "":
        gd_script.source_code = FileAccess.get_file_as_string(script_path)
    else:
        gd_script.source_code = code

    var error = gd_script.compile()
    if error != OK:
        return { "result": { "valid": false, "error": "Compilation failed" } }
    return { "result": { "valid": true } }

func search_in_files(params: Dictionary) -> Dictionary:
    var search_text = params.get("text", "")
    var extensions = params.get("extensions", ["gd", "cs"])
    var case_sensitive = params.get("case_sensitive", true)

    if search_text == "":
        return { "error": { "code": -32600, "message": "Missing text" } }

    var project_path = ProjectSettings.get_setting("application/config/name")
    if project_path == "":
        project_path = "res://"

    var results = []
    _search_in_directory_recursive(project_path, extensions, case_sensitive, search_text, results)
    return { "result": { "matches": results } }

func _search_in_directory_recursive(path: String, extensions: Array, case_sensitive: bool, search_text: String, output: Array):
    var dir = DirAccess.open(path)
    if dir == null:
        return
    dir.list_dir_begin()
    var file_name = dir.get_next()
    while file_name != "":
        if dir.current_is_dir() and not file_name.begins_with("."):
            var subpath = path.path_join(file_name)
            _search_in_directory_recursive(subpath, extensions, case_sensitive, search_text, output)
        else:
            var ext = file_name.get_extension()
            if extensions.has(ext):
                var full_path = path.path_join(file_name)
                _search_file(full_path, case_sensitive, search_text, output)
        file_name = dir.get_next()
    dir.list_dir_end()

func _search_file(file_path: String, case_sensitive: bool, search_text: String, output: Array):
    var file = FileAccess.open(file_path, FileAccess.READ)
    if file == null:
        return
    var line_number = 0
    while not file.eof_reached():
        line_number += 1
        var line = file.get_line()
        var match_line = line
        if not case_sensitive:
            match_line = match_line.to_lower()
            var search_lower = search_text.to_lower()
            if match_line.find(search_lower) != -1:
                output.append({
                    "file": file_path,
                    "line": line_number,
                    "content": line,
                })
        else:
            if match_line.find(search_text) != -1:
                output.append({
                    "file": file_path,
                    "line": line_number,
                    "content": line,
                })
    file.close()