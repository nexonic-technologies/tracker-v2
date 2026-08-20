import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

class LocalCache {
  static final LocalCache _instance = LocalCache._internal();
  factory LocalCache() => _instance;
  LocalCache._internal();

  // Cache complex payloads (JSON Lists / Maps)
  Future<void> set(String key, dynamic value) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final String raw = jsonEncode(value);
      await prefs.setString(key, raw);
    } catch (e) {
      // Ignore cache errors
    }
  }

  // Retrieve complex payloads
  Future<dynamic> get(String key) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final String? raw = prefs.getString(key);
      if (raw == null) return null;
      return jsonDecode(raw);
    } catch (e) {
      return null;
    }
  }

  // Clear cache items
  Future<void> remove(String key) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(key);
    } catch (e) {
      // Ignore
    }
  }
}
