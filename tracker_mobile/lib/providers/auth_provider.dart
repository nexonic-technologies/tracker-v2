import 'package:flutter/material.dart';
import 'package:jwt_decoder/jwt_decoder.dart';
import 'package:dio/dio.dart';
import '../core/models/user_model.dart';
import '../services/api.dart';
import '../services/socket_service.dart';
import '../services/fcm_service.dart';

class AuthProvider extends ChangeNotifier {
  final ApiService _apiService = ApiService();
  
  bool _isAuthenticated = false;
  bool _isLoading = true;
  String? _errorMessage;
  UserModel? _user;
  Set<String> _capabilities = {};

  bool get isAuthenticated => _isAuthenticated;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  UserModel? get user => _user;
  Set<String> get capabilities => _capabilities;

  bool hasCapability(String cap) {
    if (_user?.role == 'superadmin' || _user?.userType == 'superadmin') {
      return true;
    }
    return _capabilities.contains(cap);
  }

  AuthProvider() {
    checkAuthStatus();
  }

  // --- Auto-Login Check ---
  Future<void> checkAuthStatus() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final token = await _apiService.getAccessToken();
      if (token == null || token.isEmpty) {
        _isAuthenticated = false;
        _isLoading = false;
        notifyListeners();
        return;
      }

      // Verify token directly against getMe endpoint
      try {
        final meResponse = await _apiService.getMe();
        if (meResponse.statusCode == 200 || meResponse.statusCode == 304) {
          if (meResponse.statusCode == 200 && meResponse.data != null && meResponse.data['user'] != null) {
            final userMap = Map<String, dynamic>.from(meResponse.data['user']);
            _user = UserModel.fromJson(userMap);
          } else {
            final decodedToken = JwtDecoder.decode(token);
            _user = UserModel.fromJson(decodedToken);
          }
          _isAuthenticated = true;

          await fetchUserCapabilities();

          final sessionId = await _apiService.getSessionId() ?? '';
          _initializeServices(_user!.id, sessionId);
        } else {
          await _apiService.clearAuthData();
          _isAuthenticated = false;
          _user = null;
          _capabilities.clear();
        }
      } catch (e) {
        bool isAuthError = false;
        if (e is DioException) {
          final statusCode = e.response?.statusCode;
          if (statusCode == 401 || statusCode == 403) {
            isAuthError = true;
          }
        }

        if (isAuthError) {
          await _apiService.clearAuthData();
          _isAuthenticated = false;
          _user = null;
          _capabilities.clear();
        } else {
          // Offline / Server down fallback: keep user authenticated using stored JWT token
          try {
            final decodedToken = JwtDecoder.decode(token);
            _user = UserModel.fromJson(decodedToken);
            _isAuthenticated = true;
            final sessionId = await _apiService.getSessionId() ?? '';
            _initializeServices(_user!.id, sessionId);
          } catch (_) {
            await _apiService.clearAuthData();
            _isAuthenticated = false;
            _user = null;
            _capabilities.clear();
          }
        }
      }
    } catch (e) {
      _isAuthenticated = false;
      _user = null;
      _capabilities.clear();
      _errorMessage = "Auth check failed: $e";
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // --- Login Action ---
  Future<bool> login(String email, String password) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await _apiService.login(email, password);
      
      if (response.statusCode == 200 && response.data != null) {
        final data = response.data;
        final accessToken = data['accessToken'];
        final refreshToken = data['refreshToken'];
        final sessionId = data['sessionId'];

        if (accessToken != null && refreshToken != null) {
          // Decode JWT for user profile info
          final decodedToken = JwtDecoder.decode(accessToken);
          _user = UserModel.fromJson(decodedToken);
          
          // Save tokens
          await _apiService.saveAuthData(
            accessToken: accessToken,
            refreshToken: refreshToken,
            sessionId: sessionId ?? '',
          );

          _isAuthenticated = true;
          _errorMessage = null;

          // Fetch capabilities context
          await fetchUserCapabilities();

          // Initialize background connections
          _initializeServices(_user!.id, sessionId ?? '');
          return true;
        }
      }
      _errorMessage = "Login failed: Invalid server response";
      return false;
    } catch (e) {
      _errorMessage = _parseError(e);
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // --- Google Login Action ---
  Future<bool> loginWithGoogle(String idToken) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await _apiService.googleLogin(idToken);

      if (response.statusCode == 200 && response.data != null) {
        final data = response.data;
        final accessToken = data['accessToken'];
        final refreshToken = data['refreshToken'];
        final sessionId = data['sessionId'];

        if (accessToken != null && refreshToken != null) {
          final decodedToken = JwtDecoder.decode(accessToken);
          _user = UserModel.fromJson(decodedToken);

          await _apiService.saveAuthData(
            accessToken: accessToken,
            refreshToken: refreshToken,
            sessionId: sessionId ?? '',
          );

          _isAuthenticated = true;
          _errorMessage = null;

          await fetchUserCapabilities();
          _initializeServices(_user!.id, sessionId ?? '');
          return true;
        }
      }
      _errorMessage = "Google login failed: Invalid server response";
      return false;
    } catch (e) {
      _errorMessage = _parseError(e);
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // --- Sign Up Action ---
  Future<bool> signup(String name, String email, String password, String department) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      // Mock signup for UI presentation, as the backend does not provide a public self-signup endpoint.
      // In the future, this can invoke _apiService.signup(...)
      await Future.delayed(const Duration(seconds: 1));
      
      // Let's show a success flag so the user is guided to log in.
      _errorMessage = null;
      return true;
    } catch (e) {
      _errorMessage = _parseError(e);
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // --- Logout Action ---
  Future<void> logout() async {
    _isLoading = true;
    notifyListeners();

    try {
      await _apiService.logout();
    } catch (_) {
      // Force local logout even if network request fails
      await _apiService.clearAuthData();
    } finally {
      _user = null;
      _isAuthenticated = false;
      _capabilities.clear();
      _isLoading = false;
      SocketService().disconnect();
      notifyListeners();
    }
  }

  Future<void> fetchUserCapabilities() async {
    try {
      final response = await _apiService.dio.get('/auth/me/context');
      if (response.statusCode == 200 && response.data != null) {
        final data = response.data['data'];
        if (data != null && data['capabilities'] != null) {
          final capsList = List<dynamic>.from(data['capabilities']);
          _capabilities = capsList.map((c) => c.toString()).toSet();
          notifyListeners();
        }
      }
    } catch (e) {
      debugPrint("fetchUserCapabilities failed: $e");
    }
  }

  // Helper: Start sockets and register push notifications
  void _initializeServices(String userId, String sessionId) {
    // 1. Init Socket Room connection
    SocketService().init(userId);

    // 2. Init Firebase Cloud Messaging & register token
    FcmService().init().then((_) {
      if (sessionId.isNotEmpty) {
        FcmService().getFcmTokenAndRegister(sessionId);
      }
    });
  }

  String _parseError(dynamic error) {
    if (error is Exception) {
      final str = error.toString();
      if (str.contains('401')) {
        return "Invalid email or password.";
      }
      if (str.contains('Timeout') || str.contains('SocketException')) {
        return "Server is unreachable. Please check your internet connection.";
      }
    }
    return "Authentication failed. Please try again.";
  }
}
