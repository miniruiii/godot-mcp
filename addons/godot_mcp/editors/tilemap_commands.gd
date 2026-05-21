extends RefCounted

# Error codes for tilemap commands
const ERR_NOT_FOUND = -32602
const ERR_INVALID_TYPE = -32000
const ERR_INVALID_VALUE = -32000

func tilemap_set_cell(params: Dictionary) -> Dictionary:
	var tilemap_path = params.get("tilemap", "")
	if tilemap_path == "":
		return { "error": { "code": ERR_NOT_FOUND, "message": "Missing tilemap parameter" } }

	var tilemap = _find_node_by_path(tilemap_path)
	if tilemap == null:
		return { "error": { "code": ERR_NOT_FOUND, "message": "TileMap not found at path: %s" % tilemap_path } }

	if not tilemap is TileMap:
		return { "error": { "code": ERR_INVALID_TYPE, "message": "Node at path is not a TileMap: %s" % tilemap_path } }

	var layer = params.get("layer", 0)
	var x = params.get("x", 0)
	var y = params.get("y", 0)
	var tile_id = params.get("tile_id", -1)

	var position = Vector2i(x, y)
	tilemap.set_cell(layer, position, tile_id)

	return { "result": { "layer": layer, "position": { "x": x, "y": y }, "tile_id": tile_id } }


func tilemap_get_cell(params: Dictionary) -> Dictionary:
	var tilemap_path = params.get("tilemap", "")
	if tilemap_path == "":
		return { "error": { "code": ERR_NOT_FOUND, "message": "Missing tilemap parameter" } }

	var tilemap = _find_node_by_path(tilemap_path)
	if tilemap == null:
		return { "error": { "code": ERR_NOT_FOUND, "message": "TileMap not found at path: %s" % tilemap_path } }

	if not tilemap is TileMap:
		return { "error": { "code": ERR_INVALID_TYPE, "message": "Node at path is not a TileMap: %s" % tilemap_path } }

	var layer = params.get("layer", 0)
	var x = params.get("x", 0)
	var y = params.get("y", 0)

	var position = Vector2i(x, y)
	var tile_id = tilemap.get_cell(layer, position)

	return { "result": { "layer": layer, "position": { "x": x, "y": y }, "tile_id": tile_id } }


func tilemap_clear(params: Dictionary) -> Dictionary:
	var tilemap_path = params.get("tilemap", "")
	if tilemap_path == "":
		return { "error": { "code": ERR_NOT_FOUND, "message": "Missing tilemap parameter" } }

	var tilemap = _find_node_by_path(tilemap_path)
	if tilemap == null:
		return { "error": { "code": ERR_NOT_FOUND, "message": "TileMap not found at path: %s" % tilemap_path } }

	if not tilemap is TileMap:
		return { "error": { "code": ERR_INVALID_TYPE, "message": "Node at path is not a TileMap: %s" % tilemap_path } }

	var layer = params.get("layer", -1)

	if layer >= 0:
		tilemap.clear_layer(layer)
	else:
		tilemap.clear()

	return { "result": { "cleared": true, "layer": layer } }


func tilemap_get_info(params: Dictionary) -> Dictionary:
	var tilemap_path = params.get("tilemap", "")
	if tilemap_path == "":
		return { "error": { "code": ERR_NOT_FOUND, "message": "Missing tilemap parameter" } }

	var tilemap = _find_node_by_path(tilemap_path)
	if tilemap == null:
		return { "error": { "code": ERR_NOT_FOUND, "message": "TileMap not found at path: %s" % tilemap_path } }

	if not tilemap is TileMap:
		return { "error": { "code": ERR_INVALID_TYPE, "message": "Node at path is not a TileMap: %s" % tilemap_path } }

	var size = tilemap.get_size()
	var cell_size = tilemap.cell_size
	var layers_count = tilemap.get_layers_count()

	return {
		"result": {
			"layers": layers_count,
			"size": { "x": size.x, "y": size.y },
			"cell_size": { "x": cell_size.x, "y": cell_size.y }
		}
	}


func tilemap_get_used_cells(params: Dictionary) -> Dictionary:
	var tilemap_path = params.get("tilemap", "")
	if tilemap_path == "":
		return { "error": { "code": ERR_NOT_FOUND, "message": "Missing tilemap parameter" } }

	var tilemap = _find_node_by_path(tilemap_path)
	if tilemap == null:
		return { "error": { "code": ERR_NOT_FOUND, "message": "TileMap not found at path: %s" % tilemap_path } }

	if not tilemap is TileMap:
		return { "error": { "code": ERR_INVALID_TYPE, "message": "Node at path is not a TileMap: %s" % tilemap_path } }

	var layer = params.get("layer", 0)
	var used_cells = tilemap.get_used_cells(layer)

	var cells = []
	for pos in used_cells:
		cells.append({ "x": pos.x, "y": pos.y })

	return { "result": { "layer": layer, "cells": cells } }


func tilemap_fill_rect(params: Dictionary) -> Dictionary:
	var tilemap_path = params.get("tilemap", "")
	if tilemap_path == "":
		return { "error": { "code": ERR_NOT_FOUND, "message": "Missing tilemap parameter" } }

	var tilemap = _find_node_by_path(tilemap_path)
	if tilemap == null:
		return { "error": { "code": ERR_NOT_FOUND, "message": "TileMap not found at path: %s" % tilemap_path } }

	if not tilemap is TileMap:
		return { "error": { "code": ERR_INVALID_TYPE, "message": "Node at path is not a TileMap: %s" % tilemap_path } }

	var layer = params.get("layer", 0)
	var x = params.get("x", 0)
	var y = params.get("y", 0)
	var width = params.get("width", 1)
	var height = params.get("height", 1)
	var tile_id = params.get("tile_id", -1)

	var start_pos = Vector2i(x, y)
	var end_pos = Vector2i(x + width - 1, y + height - 1)

	var rect = Rect2i(start_pos, Vector2i(width, height))

	var cells_filled = 0
	for rx in range(x, x + width):
		for ry in range(y, y + height):
			tilemap.set_cell(layer, Vector2i(rx, ry), tile_id)
			cells_filled += 1

	return {
		"result": {
			"layer": layer,
			"rect": { "x": x, "y": y, "width": width, "height": height },
			"tile_id": tile_id,
			"cells_filled": cells_filled
		}
	}


func _find_node_by_path(path: String) -> Node:
	if path == "" or path == "/":
		return null

	# Handle absolute path from root
	if path.begins_with("/"):
		var root = Engine.get_main_loop().get_root()
		if root == null:
			return null
		var node = root.get_node(path)
		if node != null:
			return node
		return null

	# Handle relative path - try to find in the scene
	var root = Engine.get_main_loop().get_root()
	if root == null:
		return null

	var parts = path.split("/")
	var current_node = null

	for i in range(parts.size()):
		var part = parts[i]
		if part == "" or part == ".":
			continue
		if part == "..":
			if current_node != null:
				current_node = current_node.get_parent()
			continue

		var next_node: Node
		if current_node == null:
			next_node = root.find_child(part, false, false)
		else:
			next_node = current_node.find_child(part, false, false)

		if next_node == null:
			return null
		current_node = next_node

	return current_node