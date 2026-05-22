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