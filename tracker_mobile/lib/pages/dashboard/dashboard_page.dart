import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/navigation_provider.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/custom_app_bar.dart';
import '../dashboard/home_tab.dart';
import '../dashboard/work_tab.dart';
import '../dashboard/crm_tab.dart';
import '../dashboard/inbox_tab.dart';
import '../attendance/attendance_page.dart';
import '../activity/activity_page.dart';
import '../tasks/tasks_page.dart';
import '../tickets/tickets_page.dart';
import '../profile/profile_page.dart';
import '../payroll/payroll_page.dart';
import '../feeds/feeds_page.dart';
import '../teams/teams_page.dart';

class DashboardPage extends StatefulWidget {
  const DashboardPage({super.key});

  @override
  State<DashboardPage> createState() => _DashboardPageState();
}

class _DashboardPageState extends State<DashboardPage> {
  DateTime? _lastBackPressTime;

  final List<NavPage> _tabKeys = [
    NavPage.home,
    NavPage.work,
    NavPage.crm,
    NavPage.inbox,
    NavPage.profile,
    NavPage.attendance,
    NavPage.activity,
    NavPage.tasks,
    NavPage.tickets,
    NavPage.payroll,
    NavPage.feeds,
    NavPage.teams,
  ];

  final Map<NavPage, Widget> _tabPages = const {
    NavPage.home: HomeTab(),
    NavPage.work: WorkTab(),
    NavPage.crm: CrmTab(),
    NavPage.inbox: InboxTab(),
    NavPage.profile: ProfilePage(),
    NavPage.attendance: AttendancePage(),
    NavPage.activity: ActivityPage(),
    NavPage.tasks: TasksPage(),
    NavPage.tickets: TicketsPage(),
    NavPage.payroll: PayrollPage(),
    NavPage.feeds: FeedsPage(),
    NavPage.teams: TeamsPage(),
  };

  @override
  Widget build(BuildContext context) {
    final nav = context.watch<NavigationProvider>();
    final auth = context.watch<AuthProvider>();
    final user = auth.user;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final List<Map<String, dynamic>> barItems = [
      {
        'page': NavPage.home,
        'icon': Icons.home_outlined,
        'activeIcon': Icons.home_rounded,
        'label': 'Home'
      },
      {
        'page': NavPage.work,
        'icon': Icons.work_outline_rounded,
        'activeIcon': Icons.work_rounded,
        'label': 'Work'
      },
    ];

    if (auth.hasCapability('CRM:view') || auth.user?.role == 'superadmin') {
      barItems.add({
        'page': NavPage.crm,
        'icon': Icons.handshake_outlined,
        'activeIcon': Icons.handshake_rounded,
        'label': 'CRM'
      });
    }

    barItems.add({
      'page': NavPage.inbox,
      'icon': Icons.inbox_outlined,
      'activeIcon': Icons.inbox_rounded,
      'label': 'Inbox'
    });

    barItems.add({
      'page': NavPage.profile,
      'icon': Icons.person_outline_rounded,
      'activeIcon': Icons.person_rounded,
      'label': 'Profile'
    });

    final activeIndex = barItems.indexWhere((item) => item['page'] == nav.currentPage);
    final currentIndex = activeIndex != -1 ? activeIndex : 0;

    final stackIndex = _tabKeys.indexOf(nav.currentPage);
    final activeStackIndex = stackIndex != -1 ? stackIndex : 0;

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) {
        if (didPop) return;

        final scaffoldState = Scaffold.maybeOf(context);
        if (scaffoldState != null && scaffoldState.isDrawerOpen) {
          Navigator.of(context).pop();
          return;
        }

        if (nav.currentPage != NavPage.home) {
          nav.navigateTo(NavPage.home);
          return;
        }

        final now = DateTime.now();
        if (_lastBackPressTime == null ||
            now.difference(_lastBackPressTime!) > const Duration(seconds: 2)) {
          _lastBackPressTime = now;
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Press back again to exit App'),
              duration: Duration(seconds: 2),
              behavior: SnackBarBehavior.floating,
            ),
          );
          return;
        }

        SystemNavigator.pop();
      },
      child: Scaffold(
        backgroundColor: isDark ? AppColors.darkCanvas : AppColors.canvas,
        appBar: const CustomAppBar(),
        drawer: _buildDrawer(context, nav, auth, user, isDark),
        body: SafeArea(
          top: false,
          bottom: false,
          child: IndexedStack(
            index: activeStackIndex,
            children: _tabKeys.map((p) => _tabPages[p] ?? const HomeTab()).toList(),
          ),
        ),
        bottomNavigationBar: barItems.length >= 2
            ? Container(
                decoration: BoxDecoration(
                  border: Border(
                    top: BorderSide(
                      color: isDark ? AppColors.darkBorder : AppColors.border,
                      width: 1.0,
                    ),
                  ),
                ),
                child: BottomNavigationBar(
                  currentIndex: currentIndex,
                  onTap: (index) {
                    if (index >= 0 && index < barItems.length) {
                      nav.navigateTo(barItems[index]['page'] as NavPage);
                    }
                  },
                  selectedItemColor: AppColors.hrAccent,
                  unselectedItemColor: isDark ? AppColors.darkInkSubtle : AppColors.inkSubtle,
                  backgroundColor: isDark ? AppColors.darkSurface0 : Colors.white,
                  type: BottomNavigationBarType.fixed,
                  selectedLabelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                  unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.w500, fontSize: 12),
                  items: barItems.map((item) {
                    return BottomNavigationBarItem(
                      icon: Icon(item['icon'] as IconData),
                      activeIcon: Icon(item['activeIcon'] as IconData),
                      label: item['label'] as String,
                    );
                  }).toList(),
                ),
              )
            : null,
      ),
    );
  }

  Widget _buildDrawer(
    BuildContext context,
    NavigationProvider nav,
    AuthProvider auth,
    dynamic user,
    bool isDark,
  ) {
    final name = user?.name ?? 'User';
    final role = user?.department ?? user?.userType ?? 'Employee';
    final initials = name.trim().isNotEmpty ? name.trim()[0].toUpperCase() : 'U';

    return Drawer(
      backgroundColor: isDark ? AppColors.darkSurface0 : AppColors.surface0,
      child: Column(
        children: [
          Container(
            width: double.infinity,
            padding: EdgeInsets.only(
              top: MediaQuery.of(context).padding.top + 20,
              bottom: 24,
              left: 20,
              right: 20,
            ),
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [AppColors.brandFrom, AppColors.brandMid, AppColors.brandTo],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 60,
                  height: 60,
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.22),
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white.withValues(alpha: 0.5), width: 2.5),
                  ),
                  child: Center(
                    child: Text(
                      initials,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 24,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  name,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 17,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  role,
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.75),
                    fontSize: 13,
                  ),
                ),
                const SizedBox(height: 10),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.18),
                    borderRadius: BorderRadius.circular(AppRadius.pill),
                    border: Border.all(color: Colors.white.withValues(alpha: 0.3)),
                  ),
                  child: const Text(
                    'WorkHub ERP',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 0.5,
                    ),
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
              children: [
                const _NavSection(label: 'MAIN NAVIGATION'),
                _NavItem(
                  icon: Icons.dashboard_rounded,
                  label: 'Dashboard',
                  page: NavPage.home,
                  current: nav.currentPage,
                  accentColor: AppColors.brandSolid,
                  accentBg: AppColors.hrAccentLight,
                  isDark: isDark,
                  onTap: () {
                    nav.navigateTo(NavPage.home);
                    Navigator.of(context).pop();
                  },
                ),
                _NavItem(
                  icon: Icons.work_rounded,
                  label: 'Work Hub',
                  page: NavPage.work,
                  current: nav.currentPage,
                  accentColor: AppColors.brandSolid,
                  accentBg: AppColors.hrAccentLight,
                  isDark: isDark,
                  onTap: () {
                    nav.navigateTo(NavPage.work);
                    Navigator.of(context).pop();
                  },
                ),
                _NavItem(
                  icon: Icons.inbox_rounded,
                  label: 'Inbox & Notifications',
                  page: NavPage.inbox,
                  current: nav.currentPage,
                  accentColor: AppColors.brandSolid,
                  accentBg: AppColors.hrAccentLight,
                  isDark: isDark,
                  onTap: () {
                    nav.navigateTo(NavPage.inbox);
                    Navigator.of(context).pop();
                  },
                ),
                const SizedBox(height: 12),
                const _NavSection(label: 'OPERATIONS & TASKS'),
                if (auth.hasCapability('Task:view') || auth.user?.role == 'superadmin') ...[
                  _NavItem(
                    icon: Icons.assignment_rounded,
                    label: 'Tasks',
                    page: NavPage.tasks,
                    current: nav.currentPage,
                    accentColor: AppColors.projectAccent,
                    accentBg: AppColors.projectAccentLight,
                    isDark: isDark,
                    onTap: () {
                      nav.navigateTo(NavPage.tasks);
                      Navigator.of(context).pop();
                    },
                  ),
                ],
                if (auth.hasCapability('Ticket:view') || auth.user?.role == 'superadmin') ...[
                  _NavItem(
                    icon: Icons.chat_bubble_rounded,
                    label: 'Tickets & Support',
                    page: NavPage.tickets,
                    current: nav.currentPage,
                    accentColor: AppColors.hrAccent,
                    accentBg: AppColors.hrAccentLight,
                    isDark: isDark,
                    onTap: () {
                      nav.navigateTo(NavPage.tickets);
                      Navigator.of(context).pop();
                    },
                  ),
                ],
                if (auth.hasCapability('Attendance:view') || auth.user?.role == 'superadmin') ...[
                  _NavItem(
                    icon: Icons.calendar_month_rounded,
                    label: 'Attendance & Clock',
                    page: NavPage.attendance,
                    current: nav.currentPage,
                    accentColor: AppColors.hrAccent,
                    accentBg: AppColors.hrAccentLight,
                    isDark: isDark,
                    onTap: () {
                      nav.navigateTo(NavPage.attendance);
                      Navigator.of(context).pop();
                    },
                  ),
                ],
                if (auth.hasCapability('DailyActivity:view') || auth.user?.role == 'superadmin') ...[
                  _NavItem(
                    icon: Icons.bar_chart_rounded,
                    label: 'Activity Tracker',
                    page: NavPage.activity,
                    current: nav.currentPage,
                    accentColor: AppColors.projectAccent,
                    accentBg: AppColors.projectAccentLight,
                    isDark: isDark,
                    onTap: () {
                      nav.navigateTo(NavPage.activity);
                      Navigator.of(context).pop();
                    },
                  ),
                ],
                _NavItem(
                  icon: Icons.rss_feed_rounded,
                  label: 'Company Feed',
                  page: NavPage.feeds,
                  current: nav.currentPage,
                  accentColor: AppColors.brandSolid,
                  accentBg: AppColors.hrAccentLight,
                  isDark: isDark,
                  onTap: () {
                    nav.navigateTo(NavPage.feeds);
                    Navigator.of(context).pop();
                  },
                ),
                const SizedBox(height: 12),
                const _NavSection(label: 'PEOPLE & BUSINESS'),
                if (auth.hasCapability('CRM:view') || auth.user?.role == 'superadmin') ...[
                  _NavItem(
                    icon: Icons.handshake_rounded,
                    label: 'CRM & Contacts',
                    page: NavPage.crm,
                    current: nav.currentPage,
                    accentColor: AppColors.brandSolid,
                    accentBg: AppColors.hrAccentLight,
                    isDark: isDark,
                    onTap: () {
                      nav.navigateTo(NavPage.crm);
                      Navigator.of(context).pop();
                    },
                  ),
                ],
                _NavItem(
                  icon: Icons.groups_rounded,
                  label: 'Teams & Directory',
                  page: NavPage.teams,
                  current: nav.currentPage,
                  accentColor: AppColors.brandSolid,
                  accentBg: AppColors.hrAccentLight,
                  isDark: isDark,
                  onTap: () {
                    nav.navigateTo(NavPage.teams);
                    Navigator.of(context).pop();
                  },
                ),
                _NavItem(
                  icon: Icons.receipt_long_rounded,
                  label: 'My Payslips',
                  page: NavPage.payroll,
                  current: nav.currentPage,
                  accentColor: AppColors.brandSolid,
                  accentBg: AppColors.hrAccentLight,
                  isDark: isDark,
                  onTap: () {
                    nav.navigateTo(NavPage.payroll);
                    Navigator.of(context).pop();
                  },
                ),
                _NavItem(
                  icon: Icons.person_outline_rounded,
                  label: 'My Profile & Settings',
                  page: NavPage.profile,
                  current: nav.currentPage,
                  accentColor: AppColors.brandSolid,
                  accentBg: AppColors.hrAccentLight,
                  isDark: isDark,
                  onTap: () {
                    nav.navigateTo(NavPage.profile);
                    Navigator.of(context).pop();
                  },
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            child: _NavLogout(auth: auth, isDark: isDark),
          ),
          SizedBox(height: MediaQuery.of(context).padding.bottom + 8),
        ],
      ),
    );
  }
}

class _NavSection extends StatelessWidget {
  final String label;
  const _NavSection({required this.label});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Padding(
      padding: const EdgeInsets.only(left: 8, top: 8, bottom: 4),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w700,
          letterSpacing: 1.0,
          color: isDark ? AppColors.darkInkSubtle : AppColors.inkTertiary,
        ),
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final NavPage page;
  final NavPage current;
  final Color accentColor;
  final Color accentBg;
  final bool isDark;
  final VoidCallback onTap;

  const _NavItem({
    required this.icon,
    required this.label,
    required this.page,
    required this.current,
    required this.accentColor,
    required this.accentBg,
    required this.isDark,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isActive = page == current;
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: isActive ? accentBg : Colors.transparent,
          borderRadius: BorderRadius.circular(AppRadius.md),
          border: isActive
              ? Border(left: BorderSide(color: accentColor, width: 3))
              : null,
        ),
        child: Row(
          children: [
            Icon(
              icon,
              size: 20,
              color: isActive
                  ? accentColor
                  : (isDark ? AppColors.darkInkMuted : AppColors.inkSubtle),
            ),
            const SizedBox(width: 12),
            Text(
              label,
              style: TextStyle(
                fontSize: 14,
                fontWeight: isActive ? FontWeight.w600 : FontWeight.w400,
                color: isActive
                    ? accentColor
                    : (isDark ? AppColors.darkInkMuted : AppColors.inkMuted),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _NavLogout extends StatefulWidget {
  final AuthProvider auth;
  final bool isDark;
  const _NavLogout({required this.auth, required this.isDark});

  @override
  State<_NavLogout> createState() => _NavLogoutState();
}

class _NavLogoutState extends State<_NavLogout> {
  bool _busy = false;

  Future<void> _logout() async {
    setState(() => _busy = true);
    try {
      await widget.auth.logout();
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: _busy ? null : _logout,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: AppColors.errorLight.withValues(alpha: widget.isDark ? 0.12 : 0.6),
          borderRadius: BorderRadius.circular(AppRadius.md),
        ),
        child: Row(
          children: [
            if (_busy)
              const SizedBox(
                width: 20, height: 20,
                child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.error),
              )
            else
              const Icon(Icons.logout_rounded, size: 20, color: AppColors.error),
            const SizedBox(width: 12),
            Text(
              _busy ? 'Signing out…' : 'Sign Out',
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: AppColors.error,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
