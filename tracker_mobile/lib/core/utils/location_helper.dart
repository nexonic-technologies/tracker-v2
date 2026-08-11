import 'package:geolocator/geolocator.dart';

/// Returns {latitude, longitude} or a fallback if permission is denied / unavailable.
Future<Map<String, double>> getDeviceLocation() async {
  try {
    // Check if location services are enabled
    final serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) return _fallback();

    // Check/request permission
    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) {
      return _fallback();
    }

    // Get position
    final position = await Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        timeLimit: Duration(seconds: 8),
      ),
    );
    return {'latitude': position.latitude, 'longitude': position.longitude};
  } catch (_) {
    return _fallback();
  }
}

Map<String, double> _fallback() => {'latitude': 0.0, 'longitude': 0.0};
