extends RefCounted

signal client_connected(peer_id: int)
signal client_disconnected(peer_id: int)
signal message_received(peer_id: int, message: String)

var tcp_server: TCPServer
var peers: Dictionary = {}
var next_peer_id: int = 1

func start(port: int) -> Error:
    tcp_server = TCPServer.new()
    var err = tcp_server.listen(port, "127.0.0.1")
    if err != OK:
        return err
    return OK

func stop():
    if tcp_server:
        tcp_server.stop()
        tcp_server = null
    for peer_id in peers.keys():
        peers[peer_id].close()
    peers.clear()

func is_listening() -> bool:
    return tcp_server != null and tcp_server.is_listening()

func poll():
    if not tcp_server or not tcp_server.is_listening():
        return

    if tcp_server.is_connection_available():
        var conn = tcp_server.take_connection()
        var ws = WebSocketPeer.new()
        ws.set_outbound_buffer_size(2 * 1024 * 1024)  # 2MB to handle large scene trees
        var err = ws.accept_stream(conn)
        if err == OK:
            var peer_id = next_peer_id
            next_peer_id += 1
            peers[peer_id] = ws
            client_connected.emit(peer_id)

    var to_remove = []
    for peer_id in peers:
        var ws = peers[peer_id]
        ws.poll()
        var state = ws.get_ready_state()

        if state == WebSocketPeer.STATE_CLOSED:
            to_remove.append(peer_id)
            continue

        if state == WebSocketPeer.STATE_OPEN:
            while ws.get_available_packet_count() > 0:
                var packet = ws.get_packet()
                var msg = packet.get_string_from_utf8()
                message_received.emit(peer_id, msg)

    for peer_id in to_remove:
        peers.erase(peer_id)
        client_disconnected.emit(peer_id)

func send_to(peer_id: int, message: String) -> bool:
    if not peers.has(peer_id):
        return false
    var ws = peers[peer_id]
    if ws.get_ready_state() != WebSocketPeer.STATE_OPEN:
        return false
    var err = ws.send_text(message)
    return err == OK

func broadcast(message: String):
    for peer_id in peers:
        send_to(peer_id, message)