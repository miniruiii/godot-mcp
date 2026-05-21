@tool
extends EditorPlugin

const WebSocketServer = preload("res://addons/godot_mcp/websocket_server.gd")
const RpcHandler = preload("res://addons/godot_mcp/rpc_handler.gd")

var ws_server
var rpc_handler

func _enter_tree():
    rpc_handler = RpcHandler.new()
    ws_server = WebSocketServer.new()
    ws_server.message_received.connect(_on_message_received)
    ws_server.client_connected.connect(_on_client_connected)
    ws_server.client_disconnected.connect(_on_client_disconnected)

    var port = 6505
    var err = ws_server.start(port)
    if err != OK:
        push_error("Godot MCP: Failed to start WebSocket server on port %d" % port)
    else:
        print("Godot MCP: WebSocket server listening on port %d" % port)

func _exit_tree():
    if ws_server:
        ws_server.stop()
        ws_server = null
    if rpc_handler:
        rpc_handler = null

func _process(_delta):
    if ws_server:
        ws_server.poll()

func _on_message_received(peer_id: int, message: String):
    var response = rpc_handler.handle(message)
    if response != "":
        ws_server.send_to(peer_id, response)

func _on_client_connected(peer_id: int):
    print("Godot MCP: Client connected (%d)" % peer_id)

func _on_client_disconnected(peer_id: int):
    print("Godot MCP: Client disconnected (%d)" % peer_id)