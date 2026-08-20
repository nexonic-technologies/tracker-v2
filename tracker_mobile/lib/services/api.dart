import 'dart:math';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart' show MaterialPageRoute;
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../core/api_config.dart';
import '../providers/navigation_provider.dart';
import '../pages/maintenance_page.dart';

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;

  late final Dio dio;
  final FlutterSecureStorage _secureStorage = const FlutterSecureStorage();
  String? _deviceUuid;

  ApiService._internal() {
    dio = Dio(
      BaseOptions(
        baseUrl: ApiConfig.baseUrl,
        connectTimeout: const Duration(seconds: ApiConfig.connectTimeoutSeconds),
        receiveTimeout: const Duration(seconds: ApiConfig.receiveTimeoutSeconds),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'x-source': 'mobile',
        },
      ),
    );

    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          // 1. Inject Device UUID
          final uuid = await getDeviceUuid();
          options.headers['x-device-uuid'] = uuid;
          options.headers['deviceuuid'] = uuid;

          // 2. Inject Auth Token
          final token = await getAccessToken();
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }

          return handler.next(options);
        },
        onError: (DioException error, handler) async {
          // Handle 503 Maintenance
          if (error.response?.statusCode == 503 &&
              error.response?.data is Map &&
              error.response?.data['maintenance'] == true) {
            final data = error.response?.data as Map;
            final message = data['message'] ?? 'System is currently undergoing scheduled maintenance.';
            final scheduledEndStr = data['scheduledEnd'];
            final scheduledEnd = scheduledEndStr != null ? DateTime.tryParse(scheduledEndStr) : null;

            final navState = NavigationProvider.navigatorKey.currentState;
            if (navState != null) {
              navState.pushReplacement(
                MaterialPageRoute(
                  builder: (_) => MaintenancePage(
                    message: message,
                    scheduledEnd: scheduledEnd,
                  ),
                ),
              );
            }
            return handler.next(error);
          }

          // Handle 401 and try token refresh
          if (error.response?.statusCode == 401) {
            final requestOptions = error.requestOptions;
            
            // Avoid infinite loop if refresh itself fails
            if (requestOptions.path.contains('/auth/refresh') ||
                requestOptions.path.contains('/auth/login')) {
              return handler.next(error);
            }

            final refreshed = await refreshAuthTokens();
            if (refreshed) {
              // Retry the request with new token
              final newToken = await getAccessToken();
              requestOptions.headers['Authorization'] = 'Bearer $newToken';
              
              // Resend request
              try {
                final response = await dio.fetch(requestOptions);
                return handler.resolve(response);
              } on DioException catch (retryError) {
                return handler.next(retryError);
              }
            }
          }
          return handler.next(error);
        },
      ),
    );
  }

  // --- Device UUID Management ---
  Future<String> getDeviceUuid() async {
    if (_deviceUuid != null) return _deviceUuid!;

    final prefs = await SharedPreferences.getInstance();
    String? uuid = prefs.getString('device_uuid');

    if (uuid == null) {
      uuid = _generateRandomUuid();
      await prefs.setString('device_uuid', uuid);
    }

    _deviceUuid = uuid;
    return uuid;
  }

  String _generateRandomUuid() {
    final random = Random.secure();
    final values = List<int>.generate(16, (i) => random.nextInt(256));
    
    // Set UUID v4 variant/version bits
    values[6] = (values[6] & 0x0f) | 0x40; // Version 4
    values[8] = (values[8] & 0x3f) | 0x80; // Variant 10xxxxxx
    
    final hexList = values.map((val) => val.toRadixString(16).padLeft(2, '0')).toList();
    
    return '${hexList[0]}${hexList[1]}${hexList[2]}${hexList[3]}-'
        '${hexList[4]}${hexList[5]}-'
        '${hexList[6]}${hexList[7]}-'
        '${hexList[8]}${hexList[9]}-'
        '${hexList[10]}${hexList[11]}${hexList[12]}${hexList[13]}${hexList[14]}${hexList[15]}';
  }

  // --- Secure Storage Auth Helpers ---
  Future<String?> getAccessToken() async {
    return await _secureStorage.read(key: 'access_token');
  }

  Future<String?> getRefreshToken() async {
    return await _secureStorage.read(key: 'refresh_token');
  }

  Future<String?> getSessionId() async {
    return await _secureStorage.read(key: 'session_id');
  }

  Future<void> saveAuthData({
    required String accessToken,
    required String refreshToken,
    required String sessionId,
  }) async {
    await _secureStorage.write(key: 'access_token', value: accessToken);
    await _secureStorage.write(key: 'refresh_token', value: refreshToken);
    await _secureStorage.write(key: 'session_id', value: sessionId);
  }

  Future<void> clearAuthData() async {
    await _secureStorage.delete(key: 'access_token');
    await _secureStorage.delete(key: 'refresh_token');
    await _secureStorage.delete(key: 'session_id');
  }

  // --- Refresh Token Flow ---
  Future<bool> refreshAuthTokens() async {
    try {
      final refreshToken = await getRefreshToken();
      if (refreshToken == null) return false;

      final deviceUuid = await getDeviceUuid();

      final response = await dio.post(
        ApiConfig.refreshToken,
        data: {'refreshToken': refreshToken},
        options: Options(
          headers: {
            'x-device-uuid': deviceUuid,
          },
        ),
      );

      if (response.statusCode == 200 && response.data != null) {
        final newAccessToken = response.data['accessToken'];
        final newRefreshToken = response.data['refreshToken'];

        if (newAccessToken != null && newRefreshToken != null) {
          final sessionId = await getSessionId() ?? '';
          await saveAuthData(
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
            sessionId: sessionId,
          );
          return true;
        }
      }
    } catch (e) {
      // Refresh failed
      await clearAuthData();
    }
    return false;
  }

  // --- Auth API Actions ---
  Future<Response> login(String email, String password) async {
    final deviceUuid = await getDeviceUuid();
    // Use 'web' platform when running in Chrome (flutter run -d chrome)
    // so the backend session lookup matches the stored platform field.
    final platform = kIsWeb ? 'web' : 'mobile';
    return await dio.post(
      ApiConfig.login,
      data: {
        'workEmail': email,
        'password': password,
        'platform': platform,
      },
      options: Options(
        headers: {
          'x-device-uuid': deviceUuid,
        },
      ),
    );
  }

  Future<Response> googleLogin(String idToken) async {
    final deviceUuid = await getDeviceUuid();
    final platform = kIsWeb ? 'web' : 'mobile';
    return await dio.post(
      ApiConfig.googleLogin,
      data: {
        'idToken': idToken,
        'platform': platform,
      },
      options: Options(
        headers: {
          'x-device-uuid': deviceUuid,
        },
      ),
    );
  }

  Future<Response> logout() async {
    final deviceUuid = await getDeviceUuid();
    final response = await dio.post(
      ApiConfig.logout,
      options: Options(
        headers: {
          'x-device-uuid': deviceUuid,
        },
      ),
    );
    await clearAuthData();
    return response;
  }

  Future<Response> getMe() async {
    final deviceUuid = await getDeviceUuid();
    return await dio.get(
      ApiConfig.getMe,
      options: Options(
        headers: {
          'x-device-uuid': deviceUuid,
        },
        validateStatus: (status) =>
            status != null && ((status >= 200 && status < 300) || status == 304),
      ),
    );
  }

  Future<Response> signup(Map<String, dynamic> signupData) async {
    // Note: Since employee signup route is generally mock/unsupported directly,
    // we define this helper. It can point to '/auth/register' or similar if needed.
    // If not implemented on backend, it will be handled gracefully by UI/Provider.
    return await dio.post(
      '/auth/register',
      data: {
        ...signupData,
        'platform': 'mobile',
      },
    );
  }

  // --- Generic Populate CRUD Operations ---
  Future<Response> readModel(String model, {Map<String, dynamic>? query}) async {
    return await dio.post('/populate/read/$model', data: query ?? {});
  }

  Future<Response> createModel(String model, Map<String, dynamic> data) async {
    return await dio.post('/populate/create/$model', data: data);
  }

  Future<Response> updateModel(String model, String id, Map<String, dynamic> data) async {
    return await dio.put('/populate/update/$model/$id', data: data);
  }

  Future<Response> deleteModel(String model, String id) async {
    return await dio.delete('/populate/delete/$model/$id');
  }
}