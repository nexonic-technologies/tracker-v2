import 'package:flutter/material.dart';

// ─── NavigationProvider ───────────────────────────────────────────────────────
// Manages:
//   1. 5-Tab Core Bottom Navigation (home, work, crm, inbox, profile)
//   2. Active Sub-module Navigation within tabs
//   3. The app ThemeMode (light / dark)

enum NavPage {
  // 5 Main Navigation Tabs
  home,
  work,
  crm,
  inbox,
  profile,

  // Direct Sub-Module Routes
  attendance,
  activity,
  tasks,
  tickets,
  payroll,
  feeds,
  teams,
}

class NavigationProvider extends ChangeNotifier {
  static final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();
  NavPage _currentPage = NavPage.home;
  ThemeMode _themeMode = ThemeMode.light;

  NavPage get currentPage => _currentPage;
  ThemeMode get themeMode => _themeMode;
  bool get isDark => _themeMode == ThemeMode.dark;

  String get pageTitle {
    switch (_currentPage) {
      case NavPage.home:
        return 'Home';
      case NavPage.work:
        return 'Work Hub';
      case NavPage.crm:
        return 'CRM & Field Ops';
      case NavPage.inbox:
        return 'Action Inbox';
      case NavPage.profile:
        return 'My Profile';
      case NavPage.attendance:
        return 'Attendance';
      case NavPage.activity:
        return 'Activity Tracker';
      case NavPage.tasks:
        return 'Tasks';
      case NavPage.tickets:
        return 'Tickets';
      case NavPage.payroll:
        return 'My Payslips';
      case NavPage.feeds:
        return 'Company Feed';
      case NavPage.teams:
        return 'Teams';
    }
  }

  void navigateTo(NavPage page) {
    if (_currentPage == page) return;
    _currentPage = page;
    notifyListeners();
  }

  void toggleTheme() {
    _themeMode = _themeMode == ThemeMode.light ? ThemeMode.dark : ThemeMode.light;
    notifyListeners();
  }
}

