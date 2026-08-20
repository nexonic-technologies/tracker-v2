import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../providers/navigation_provider.dart';
import 'api.dart';
import '../core/api_config.dart';

class FcmService {
  static final FcmService _instance = FcmService._internal();
  factory FcmService() => _instance;

  final FirebaseMessaging _fcm = FirebaseMessaging.instance;
  final FlutterLocalNotificationsPlugin _localNotifications = FlutterLocalNotificationsPlugin();
  bool _isInitialized = false;

  FcmService._internal();

  Future<void> init() async {
    if (_isInitialized) return;

    // 1. Request notification permissions (for iOS & Android 13+)
    await _fcm.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );

    // 2. Initialize Local Notifications for foreground alerts
    const AndroidInitializationSettings initializationSettingsAndroid =
        AndroidInitializationSettings('@mipmap/ic_launcher');
    
    const InitializationSettings initializationSettings = InitializationSettings(
      android: initializationSettingsAndroid,
    );

    await _localNotifications.initialize(
      settings: initializationSettings,
      onDidReceiveNotificationResponse: (NotificationResponse details) {
        // Handle foreground notification tap if needed
      },
    );

    // 3. Create Android notification channel
    const AndroidNotificationChannel channel = AndroidNotificationChannel(
      'workhub_alerts', // id
      'WorkHub Alerts', // title
      description: 'This channel is used for task and HR notifications.', // description
      importance: Importance.high,
    );

    await _localNotifications
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(channel);

    // 4. Foreground notification presentation options
    await _fcm.setForegroundNotificationPresentationOptions(
      alert: true,
      badge: true,
      sound: true,
    );

    // 5. Handle foreground messages
    FirebaseMessaging.onMessage.listen((RemoteMessage message) async {
      RemoteNotification? notification = message.notification;
      AndroidNotification? android = message.notification?.android;
      
      try {
        final module = message.data['module']?.toString().toLowerCase() ?? '';
        final prefs = await SharedPreferences.getInstance();
        if (module == 'tasks' && !(prefs.getBool('pref_task_alerts') ?? true)) return;
        if (module == 'tickets' && !(prefs.getBool('pref_ticket_alerts') ?? true)) return;
        if (module == 'feeds' && !(prefs.getBool('pref_feeds_alerts') ?? true)) return;
        if ((module == 'leaves' || module == 'attendance') && !(prefs.getBool('pref_approval_alerts') ?? true)) return;
      } catch (_) {}

      if (notification != null && android != null) {
        _localNotifications.show(
          id: notification.hashCode,
          title: notification.title,
          body: notification.body,
          notificationDetails: NotificationDetails(
            android: AndroidNotificationDetails(
              channel.id,
              channel.name,
              channelDescription: channel.description,
              icon: android.smallIcon ?? '@mipmap/ic_launcher',
            ),
          ),
        );
      }
    });

    // 6. Handle app-open from background notification click
    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      _handleNotificationNavigation(message.data);
    });

    // 7. Handle app launch from terminated state via notification click
    _fcm.getInitialMessage().then((RemoteMessage? message) {
      if (message != null) {
        Future.delayed(const Duration(milliseconds: 1500), () {
          _handleNotificationNavigation(message.data);
        });
      }
    });

    _isInitialized = true;
  }

  void _handleNotificationNavigation(Map<String, dynamic> data) {
    try {
      final module = data['module']?.toString().toLowerCase();
      final context = NavigationProvider.navigatorKey.currentContext;
      if (context != null && module != null) {
        if (module == 'tasks') {
          Provider.of<NavigationProvider>(context, listen: false).navigateTo(NavPage.tasks);
        } else if (module == 'tickets') {
          Provider.of<NavigationProvider>(context, listen: false).navigateTo(NavPage.tickets);
        } else if (module == 'leaves' || module == 'attendance') {
          Provider.of<NavigationProvider>(context, listen: false).navigateTo(NavPage.attendance);
        }
      }
    } catch (e) {
      // Navigation handler error
    }
  }

  // Fetch token and register it with the active session
  Future<String?> getFcmTokenAndRegister(String sessionId) async {
    try {
      final token = await _fcm.getToken();
      if (token != null) {
        await _registerTokenOnBackend(sessionId, token);
      }
      return token;
    } catch (e) {
      // FCM Token retrieval failed
      return null;
    }
  }

  // Call API to store the FCM push token on server
  Future<void> _registerTokenOnBackend(String sessionId, String token) async {
    try {
      await ApiService().dio.post(
        ApiConfig.storePushToken,
        data: {
          'sessionId': sessionId,
          'fcmToken': token,
        },
      );
    } catch (e) {
      // Backend registration failed (session expired or invalid)
    }
  }
}
