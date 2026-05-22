extends RefCounted

func open_script(params: Dictionary) -> Dictionary:
    print("[MCP] open_script: script_path=%s" % params.get("script_path", ""))
    var script_path = params.get("script_path", "")
    if script_path == "":
        return { "error": { "code": -32010, "message": "Missing script_path" } }

    var res = load(script_path)
    if res == null:
        return { "error": { "code": -32011, "message": "Script not found: %s" % script_path } }

    EditorInterface.edit_script(res)
    return { "result": { "opened": true, "script_path": script_path } }

func get_content(params: Dictionary) -> Dictionary:
    print("[MCP] get_content: script_path=%s" % params.get("script_path", ""))
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
    print("[MCP] get_open_scripts")
    var editor_interface = EditorInterface.get_script_editor()
    var open_scripts: Array = editor_interface.get_open_scripts()
    var result = []
    for scr in open_scripts:
        result.append({
            "path": scr.resource_path,
            "name": scr.resource_path.get_file(),
        })
    return { "result": { "scripts": result } }