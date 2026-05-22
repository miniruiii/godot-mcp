extends RefCounted

const PLUGIN_VERSION = "1.0.0"

static func parse_value(value_str: String) -> Variant:
    value_str = value_str.strip_edges()

    if value_str.begins_with("Vector2("):
        var inner = value_str.trim_prefix("Vector2(").trim_suffix(")")
        var parts = inner.split(",")
        if parts.size() == 2:
            return Vector2(float(parts[0]), float(parts[1]))

    if value_str.begins_with("Vector2i("):
        var inner = value_str.trim_prefix("Vector2i(").trim_suffix(")")
        var parts = inner.split(",")
        if parts.size() == 2:
            return Vector2i(int(parts[0]), int(parts[1]))

    if value_str.begins_with("Vector3("):
        var inner = value_str.trim_prefix("Vector3(").trim_suffix(")")
        var parts = inner.split(",")
        if parts.size() == 3:
            return Vector3(float(parts[0]), float(parts[1]), float(parts[2]))

    if value_str.begins_with("Color("):
        var inner = value_str.trim_prefix("Color(").trim_suffix(")")
        var parts = inner.split(",")
        if parts.size() == 3:
            return Color(float(parts[0]), float(parts[1]), float(parts[2]))
        if parts.size() == 4:
            return Color(float(parts[0]), float(parts[1]), float(parts[2]), float(parts[3]))

    if value_str.begins_with("#"):
        return Color.from_string(value_str, Color.WHITE)

    if value_str.begins_with("NodePath(") or value_str.begins_with("@NodePath("):
        var start = value_str.find("\"")
        var end = value_str.rfind("\"")
        if start != -1 and end != -1 and start < end:
            return NodePath(value_str.substr(start + 1, end - start - 1))

    if value_str.begins_with("Rect2("):
        var inner = value_str.trim_prefix("Rect2(").trim_suffix(")")
        var parts = inner.split(",")
        if parts.size() == 4:
            return Rect2(float(parts[0]), float(parts[1]), float(parts[2]), float(parts[3]))

    if value_str == "true":
        return true
    if value_str == "false":
        return false
    if value_str == "null":
        return null
    if value_str.is_valid_int():
        return int(value_str)
    if value_str.is_valid_float():
        return float(value_str)
    if value_str.begins_with("\"") and value_str.ends_with("\""):
        # Store length in local var to avoid resolution as Callable in GDScript
        var len = value_str.length()
        return value_str.substr(1, len - 2)
    return value_str

static func value_to_string(value: Variant) -> String:
    if value is Vector2:
        return "Vector2(%s, %s)" % [value.x, value.y]
    if value is Vector2i:
        return "Vector2i(%s, %s)" % [value.x, value.y]
    if value is Vector3:
        return "Vector3(%s, %s, %s)" % [value.x, value.y, value.z]
    if value is Color:
        return "Color(%s, %s, %s, %s)" % [value.r, value.g, value.b, value.a]
    if value is NodePath:
        return "NodePath(\"%s\")" % str(value)
    if value is Rect2:
        return "Rect2(%s, %s, %s, %s)" % [value.position.x, value.position.y, value.size.x, value.size.y]
    if value is bool:
        return "true" if value else "false"
    if value == null:
        return "null"
    return str(value)

static func get_engine_info() -> Dictionary:
    var version_info = Engine.get_version_info()
    return {
        "engine": "Godot",
        "version": version_info.get("string", "4.x"),
        "rendering": ProjectSettings.get_setting("rendering/renderer/rendering_method", "forward_plus"),
    }