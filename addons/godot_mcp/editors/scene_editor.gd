extends RefCounted

const Utils = preload("res://addons/godot_mcp/utils.gd")

func get_tree(params: Dictionary) -> Dictionary:
    var root = EditorInterface.get_edited_scene_root()
    if root == null:
        return { "error": { "code": -32000, "message": "No scene is currently open" } }

    var nodes = []
    _collect_nodes(root, nodes, "")
    return { "result": { "nodes": nodes, "scene_path": root.scene_file_path } }

func _collect_nodes(node: Node, out: Array, path: String) -> void:
    var node_path = path + "/" + node.name if path != "" else "/root/" + node.name
    out.append({
        "name": node.name,
        "type": node.get_class(),
        "path": node_path,
    })
    for child in node.get_children():
        _collect_nodes(child, out, node_path)

func get_node(params: Dictionary) -> Dictionary:
    var node_path = params.get("node_path", "")
    var target = _find_node_by_path(node_path)
    if target == null:
        return { "error": { "code": -32001, "message": "Node not found: %s" % node_path } }

    var props = {}
    for prop in target.get_property_list():
        if prop["usage"] & PROPERTY_USAGE_EDITOR:
            var val = target.get(prop["name"])
            props[prop["name"]] = Utils.value_to_string(val)

    return { "result": {
        "name": target.name,
        "type": target.get_class(),
        "path": node_path,
        "properties": props,
    } }

func add_node(params: Dictionary) -> Dictionary:
    var parent_path = params.get("parent_path", "")
    var node_type = params.get("node_type", "Node")
    var node_name = params.get("node_name", "")

    var parent = _find_node_by_path(parent_path)
    if parent == null:
        return { "error": { "code": -32001, "message": "Parent node not found: %s" % parent_path } }

    var new_node = ClassDB.instantiate(node_type)
    if new_node == null:
        return { "error": { "code": -32002, "message": "Failed to instantiate type: %s" % node_type } }

    new_node.name = node_name

    var undo = EditorInterface.get_editor_undo_redo()
    undo.create_action("Add Node via MCP")
    undo.add_do_method(parent, "add_child", new_node, true)
    undo.add_undo_method(parent, "remove_child", new_node)
    undo.commit_action()

    var edited_root = EditorInterface.get_edited_scene_root()
    if edited_root:
        new_node.set_owner(edited_root)

    return { "result": { "added": true, "node_path": parent_path + "/" + node_name } }

func remove_node(params: Dictionary) -> Dictionary:
    var node_path = params.get("node_path", "")
    var target = _find_node_by_path(node_path)
    if target == null:
        return { "error": { "code": -32001, "message": "Node not found: %s" % node_path } }

    var parent = target.get_parent()
    var undo = EditorInterface.get_editor_undo_redo()
    undo.create_action("Remove Node via MCP")
    undo.add_do_method(parent, "remove_child", target)
    undo.add_undo_method(parent, "add_child", target, true)
    undo.add_undo_reference(target)
    undo.commit_action()

    return { "result": { "removed": true } }

func update_property(params: Dictionary) -> Dictionary:
    var node_path = params.get("node_path", "")
    var property = params.get("property", "")
    var value_str = params.get("value", "")

    var target = _find_node_by_path(node_path)
    if target == null:
        return { "error": { "code": -32001, "message": "Node not found: %s" % node_path } }

    if not property in target:
        return { "error": { "code": -32003, "message": "Property not found: %s" % property } }

    var old_value = target.get(property)
    var new_value = Utils.parse_value(value_str)

    var undo = EditorInterface.get_editor_undo_redo()
    undo.create_action("Update Property via MCP")
    undo.add_do_property(target, property, new_value)
    undo.add_undo_property(target, property, old_value)
    undo.commit_action()

    return { "result": { "updated": true, "property": property, "value": Utils.value_to_string(new_value) } }

func save_scene(params: Dictionary) -> Dictionary:
    var err = EditorInterface.save_scene()
    if err != OK:
        return { "error": { "code": -32004, "message": "Failed to save scene" } }
    return { "result": { "saved": true } }

func open_scene(params: Dictionary) -> Dictionary:
    var scene_path = params.get("scene_path", "")
    if scene_path == "":
        return { "error": { "code": -32005, "message": "Missing scene_path" } }

    EditorInterface.open_scene_from_path(scene_path)
    return { "result": { "opened": true, "scene_path": scene_path } }

func _find_node_by_path(path: String) -> Node:
    var root = EditorInterface.get_edited_scene_root()
    if root == null:
        return null

    if path == "/root/" + root.name:
        return root

    var relative = path.trim_prefix("/root/" + root.name + "/")
    return root.get_node_or_null(NodePath(relative))

func duplicate_node(params: Dictionary) -> Dictionary:
    var node_path = params.get("node_path", "")
    var new_name = params.get("new_name", "")

    var target = _find_node_by_path(node_path)
    if target == null:
        return { "error": { "code": -32602, "message": "Node not found: %s" % node_path } }

    var parent = target.get_parent()
    if parent == null:
        return { "error": { "code": -32602, "message": "Node has no parent: %s" % node_path } }

    var duplicated = target.duplicate()
    if duplicated == null:
        return { "error": { "code": -32602, "message": "Failed to duplicate node: %s" % node_path } }

    if new_name == "":
        new_name = target.name + "_copy"
    duplicated.name = new_name

    var undo = EditorInterface.get_editor_undo_redo()
    undo.create_action("Duplicate Node via MCP")
    undo.add_do_method(parent, "add_child", duplicated, true)
    undo.add_undo_method(parent, "remove_child", duplicated)
    undo.add_do_method(duplicated, "set_owner", edited_root)
    undo.add_undo_method(duplicated, "set_owner", target)
    undo.commit_action()

    return { "result": { "duplicated": true, "new_path": parent.get_path().to_string() + "/" + duplicated.name } }

func move_node(params: Dictionary) -> Dictionary:
    var node_path = params.get("node_path", "")
    var new_parent_path = params.get("new_parent_path", "")

    var target = _find_node_by_path(node_path)
    if target == null:
        return { "error": { "code": -32602, "message": "Node not found: %s" % node_path } }

    var new_parent = _find_node_by_path(new_parent_path)
    if new_parent == null:
        return { "error": { "code": -32602, "message": "New parent not found: %s" % new_parent_path } }

    # Prevent moving a node to become its own descendant
    var check_node = new_parent
    while check_node != null:
        if check_node == target:
            return { "error": { "code": -32602, "message": "Cannot move node to become its own descendant" } }
        check_node = check_node.get_parent()

    var old_parent = target.get_parent()

    var undo = EditorInterface.get_editor_undo_redo()
    undo.create_action("Move Node via MCP")
    undo.add_do_method(target, "reparent", new_parent, true)
    undo.add_undo_method(target, "reparent", old_parent, true)
    undo.commit_action()

    return { "result": { "moved": true, "node_path": node_path, "new_parent": new_parent_path } }

func connect_signal(params: Dictionary) -> Dictionary:
    var node_path = params.get("node_path", "")
    var signal = params.get("signal", "")
    var target_path = params.get("target_path", "")
    var method = params.get("method", "")

    var source = _find_node_by_path(node_path)
    if source == null:
        return { "error": { "code": -32602, "message": "Source node not found: %s" % node_path } }

    var target = _find_node_by_path(target_path)
    if target == null:
        return { "error": { "code": -32602, "message": "Target node not found: %s" % target_path } }

    if signal == "":
        return { "error": { "code": -32600, "message": "Missing signal name" } }

    if method == "":
        return { "error": { "code": -32600, "message": "Missing method name" } }

    var callable = Callable(target, method)

    var undo = EditorInterface.get_editor_undo_redo()
    undo.create_action("Connect Signal via MCP")
    undo.add_do_method(source, "connect", signal, callable)
    undo.add_undo_method(source, "disconnect", signal, callable)
    undo.commit_action()

    return { "result": { "connected": true } }

func disconnect_signal(params: Dictionary) -> Dictionary:
    var node_path = params.get("node_path", "")
    var signal = params.get("signal", "")
    var target_path = params.get("target_path", "")
    var method = params.get("method", "")

    var source = _find_node_by_path(node_path)
    if source == null:
        return { "error": { "code": -32602, "message": "Source node not found: %s" % node_path } }

    var target = _find_node_by_path(target_path)
    if target == null:
        return { "error": { "code": -32602, "message": "Target node not found: %s" % target_path } }

    if signal == "":
        return { "error": { "code": -32600, "message": "Missing signal name" } }

    if method == "":
        return { "error": { "code": -32600, "message": "Missing method name" } }

    var callable = Callable(target, method)

    var undo = EditorInterface.get_editor_undo_redo()
    undo.create_action("Disconnect Signal via MCP")
    undo.add_do_method(source, "disconnect", signal, callable)
    undo.add_undo_method(source, "connect", signal, callable)
    undo.commit_action()

    return { "result": { "disconnected": true } }

func rename_node(params: Dictionary) -> Dictionary:
    var node_path = params.get("node_path", "")
    var new_name = params.get("new_name", "")

    var target = _find_node_by_path(node_path)
    if target == null:
        return { "error": { "code": -32602, "message": "Node not found: %s" % node_path } }

    if new_name == "":
        return { "error": { "code": -32600, "message": "Missing new_name" } }

    var old_name = target.name

    var undo = EditorInterface.get_editor_undo_redo()
    undo.create_action("Rename Node via MCP")
    undo.add_do_property(target, "name", new_name)
    undo.add_undo_property(target, "name", old_name)
    undo.commit_action()

    return { "result": { "renamed": true, "new_name": new_name } }

func get_scene_file_content(params: Dictionary) -> Dictionary:
    var scene_path = params.get("scene_path", "")
    if scene_path == "":
        return { "error": { "code": -32600, "message": "Missing scene_path" } }

    if not FileAccess.file_exists(scene_path):
        return { "error": { "code": -32602, "message": "Scene file not found: %s" % scene_path } }

    var file = FileAccess.open(scene_path, FileAccess.READ)
    if file == null:
        return { "error": { "code": -32603, "message": "Failed to open scene file: %s" % scene_path } }

    var content = file.get_as_text()
    file.close()

    return { "result": { "scene_path": scene_path, "content": content } }

func delete_scene(params: Dictionary) -> Dictionary:
    var scene_path = params.get("scene_path", "")
    if scene_path == "":
        return { "error": { "code": -32600, "message": "Missing scene_path" } }

    if not FileAccess.file_exists(scene_path):
        return { "error": { "code": -32602, "message": "Scene file not found: %s" % scene_path } }

    var dir = DirAccess.open(scene_path.get_base_dir())
    if dir == null:
        return { "error": { "code": -32603, "message": "Failed to access directory" } }

    var err = dir.remove(scene_path)
    if err != OK:
        return { "error": { "code": -32603, "message": "Failed to delete scene: %s" % scene_path } }

    return { "result": { "deleted": true, "scene_path": scene_path } }

func add_scene_instance(params: Dictionary) -> Dictionary:
    var scene_path = params.get("scene_path", "")
    var parent_path = params.get("parent_path", "")
    var instance_name = params.get("name", "")

    if scene_path == "":
        return { "error": { "code": -32600, "message": "Missing scene_path" } }

    if parent_path == "":
        return { "error": { "code": -32600, "message": "Missing parent_path" } }

    if not FileAccess.file_exists(scene_path):
        return { "error": { "code": -32602, "message": "Scene file not found: %s" % scene_path } }

    var parent = _find_node_by_path(parent_path)
    if parent == null:
        return { "error": { "code": -32602, "message": "Parent node not found: %s" % parent_path } }

    var scene = load(scene_path)
    if scene == null:
        return { "error": { "code": -32603, "message": "Failed to load scene: %s" % scene_path } }

    var instance = scene.instantiate()
    if instance == null:
        return { "error": { "code": -32603, "message": "Failed to instantiate scene: %s" % scene_path } }

    if instance_name != "":
        instance.name = instance_name

    var undo = EditorInterface.get_editor_undo_redo()
    undo.create_action("Add Scene Instance via MCP")
    undo.add_do_method(parent, "add_child", instance, true)
    undo.add_undo_method(parent, "remove_child", instance)
    undo.commit_action()

    var edited_root = EditorInterface.get_edited_scene_root()
    if edited_root:
        instance.set_owner(edited_root)

    return { "result": { "added": true, "instance_path": parent_path + "/" + instance.name } }

func play_scene(params: Dictionary) -> Dictionary:
    var scene_path = params.get("scene_path", "")

    var tree = Engine.get_main_loop()
    if scene_path != "":
        if not FileAccess.file_exists(scene_path):
            return { "error": { "code": -32602, "message": "Scene file not found: %s" % scene_path } }
        tree.change_scene_to_file(scene_path)
    else:
        tree.unpause()

    return { "result": { "playing": true, "scene_path": scene_path } }

func stop_scene(params: Dictionary) -> Dictionary:
    var tree = Engine.get_main_loop()
    tree.pause()

    return { "result": { "stopped": true } }

func get_signals(params: Dictionary) -> Dictionary:
    var node_path = params.get("node_path", "")

    var target = _find_node_by_path(node_path)
    if target == null:
        return { "error": { "code": -32602, "message": "Node not found: %s" % node_path } }

    var signals = []
    var signal_list = target.get_signal_list()
    for sig in signal_list:
        var connections = []
        var connection_list = target.get_signal_connection_list(sig["name"])
        for conn in connection_list:
            connections.append({
                "target_path": conn["target"].get_path().to_string(),
                "method": conn["method"],
                "flags": conn["flags"],
                "binds": conn["binds"],
            })
        signals.append({
            "name": sig["name"],
            "arguments": sig["args"],
            "connections": connections,
        })

    return { "result": { "node_path": node_path, "signals": signals } }