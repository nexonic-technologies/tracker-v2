import 'package:socket_io_client/socket_io_client.dart' as io;
import '../core/api_config.dart';

class SocketService {
  static final SocketService _instance = SocketService._internal();
  factory SocketService() => _instance;

  io.Socket? _socket;
  bool _isConnected = false;

  bool get isConnected => _isConnected;
  io.Socket? get socket => _socket;

  SocketService._internal();

  void init(String userId) {
    if (_socket != null) {
      disconnect();
    }

    _socket = io.io(
      ApiConfig.socketUrl,
      io.OptionBuilder()
          .setTransports(['websocket', 'polling'])
          .enableAutoConnect()
          .enableReconnection()
          .setReconnectionDelay(5000)
          .setQuery({'userId': userId})
          .build(),
    );

    _socket!.onConnect((_) {
      _isConnected = true;
      // Join the user's private channel
      _socket!.emit('join', userId);
    });

    _socket!.onDisconnect((_) {
      _isConnected = false;
    });

    _socket!.onConnectError((error) {
      _isConnected = false;
    });

    _socket!.onError((error) {
      _isConnected = false;
    });
  }

  void emit(String event, dynamic data) {
    if (_socket != null && _isConnected) {
      _socket!.emit(event, data);
    }
  }

  void on(String event, Function(dynamic) handler) {
    _socket?.on(event, handler);
  }

  void off(String event) {
    _socket?.off(event);
  }

  void disconnect() {
    _socket?.disconnect();
    _socket = null;
    _isConnected = false;
  }
}
