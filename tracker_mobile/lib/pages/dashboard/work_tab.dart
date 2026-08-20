import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_theme.dart';
import '../../providers/auth_provider.dart';
import '../../providers/navigation_provider.dart';
import '../expenses/expenses_page.dart';

class WorkTab extends StatefulWidget {
  const WorkTab({super.key});

  @override
  State<WorkTab> createState() => _WorkTabState();
}

class _WorkTabState extends State<WorkTab> {
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final nav = context.watch<NavigationProvider>();
    final isDark = Theme.of(context).brightness == Brightness.dark;

    // Define all Work Hub Module Items with capability checks
    final List<Map<String, dynamic>> allModules = [
      {
        'category': 'HR & ATTENDANCE',
        'title': 'Attendance & Clock-In',
        'subtitle': 'Geofenced check-in, duration, shift status',
        'icon': Icons.calendar_month_rounded,
        'color': const Color(0xFF2563EB),
        'bgColor': const Color(0xFFEFF6FF),
        'capability': 'Attendance:view',
        'page': NavPage.attendance,
      },
      {
        'category': 'HR & ATTENDANCE',
        'title': 'Daily Activity Tracker',
        'subtitle': 'Log daily work hours, tasks & progress',
        'icon': Icons.more_time_rounded,
        'color': const Color(0xFF7C3AED),
        'bgColor': const Color(0xFFF5F3FF),
        'capability': 'DailyActivity:view',
        'page': NavPage.activity,
      },
      {
        'category': 'PROJECTS & TASKS',
        'title': 'Tasks & Sprint Board',
        'subtitle': 'Manage assigned tasks, subtasks & deadlines',
        'icon': Icons.assignment_rounded,
        'color': const Color(0xFF0D9488),
        'bgColor': const Color(0xFFF0FDF4),
        'capability': 'Task:view',
        'page': NavPage.tasks,
      },
      {
        'category': 'SERVICE DESK',
        'title': 'Tickets & Support Desk',
        'subtitle': 'Resolve customer queries & SLA tickets',
        'icon': Icons.chat_bubble_outline_rounded,
        'color': const Color(0xFFE11D48),
        'bgColor': const Color(0xFFFFE4E6),
        'capability': 'Ticket:view',
        'page': NavPage.tickets,
      },
      {
        'category': 'FINANCE & CLAIMS',
        'title': 'My Payslips & Payroll',
        'subtitle': 'View monthly payslips & tax breakdowns',
        'icon': Icons.receipt_long_rounded,
        'color': const Color(0xFF059669),
        'bgColor': const Color(0xFFECFDF5),
        'capability': null, // Public for employee
        'page': NavPage.payroll,
      },
      {
        'category': 'FINANCE & CLAIMS',
        'title': 'Expense & Travel Claims',
        'subtitle': 'Snap receipt photos & submit claims',
        'icon': Icons.camera_alt_outlined,
        'color': const Color(0xFFD97706),
        'bgColor': const Color(0xFFFFFBEB),
        'capability': null, // Public for employee
        'onTap': () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const ExpensesPage()),
          );
        },
      },
      {
        'category': 'COMMUNICATION',
        'title': 'Company Feed',
        'subtitle': 'Corporate announcements & updates',
        'icon': Icons.rss_feed_rounded,
        'color': const Color(0xFF4F46E5),
        'bgColor': const Color(0xFFEEF2FF),
        'capability': null,
        'page': NavPage.feeds,
      },
      {
        'category': 'COMMUNICATION',
        'title': 'Teams & Contacts',
        'subtitle': 'Employee directory & reporting lines',
        'icon': Icons.groups_rounded,
        'color': const Color(0xFF0284C7),
        'bgColor': const Color(0xFFF0F9FF),
        'capability': null,
        'page': NavPage.teams,
      },
    ];

    // Filter modules based on Auth capabilities + Search query
    final allowedModules = allModules.where((item) {
      final cap = item['capability'] as String?;
      if (cap != null && !auth.hasCapability(cap)) return false;

      if (_searchQuery.isNotEmpty) {
        final title = (item['title'] as String).toLowerCase();
        final subtitle = (item['subtitle'] as String).toLowerCase();
        final category = (item['category'] as String).toLowerCase();
        final q = _searchQuery.toLowerCase();
        return title.contains(q) ||
            subtitle.contains(q) ||
            category.contains(q);
      }
      return true;
    }).toList();

    // Group by category
    final Map<String, List<Map<String, dynamic>>> groupedModules = {};
    for (var mod in allowedModules) {
      final cat = mod['category'] as String;
      groupedModules.putIfAbsent(cat, () => []).add(mod);
    }

    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Search Bar ───────────────────────────────────────────────────────
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14.0),
            decoration: BoxDecoration(
              color: isDark ? AppColors.darkSurface0 : Colors.white,
              borderRadius: BorderRadius.circular(14.0),
              border: Border.all(
                color: isDark ? AppColors.darkBorder : const Color(0xFFCBD5E1),
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.04),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Row(
              children: [
                Icon(
                  Icons.search_rounded,
                  color: isDark ? AppColors.darkInkSubtle : AppColors.inkSubtle,
                  size: 22,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: TextField(
                    controller: _searchController,
                    onChanged: (val) => setState(() => _searchQuery = val),
                    style: TextStyle(
                      fontSize: 14,
                      color: isDark ? Colors.white : AppColors.inkMuted,
                    ),
                    decoration: InputDecoration(
                      hintText: 'Search any module or tool...',
                      hintStyle: TextStyle(
                        fontSize: 14,
                        color: isDark
                            ? AppColors.darkInkSubtle
                            : AppColors.inkSubtle,
                      ),
                      border: InputBorder.none,
                    ),
                  ),
                ),
                if (_searchQuery.isNotEmpty)
                  GestureDetector(
                    onTap: () {
                      _searchController.clear();
                      setState(() => _searchQuery = '');
                    },
                    child: Icon(
                      Icons.cancel_rounded,
                      color: isDark
                          ? AppColors.darkInkSubtle
                          : AppColors.inkSubtle,
                      size: 20,
                    ),
                  ),
              ],
            ),
          ),

          const SizedBox(height: 20),

          // ── Pinned Quick Shortcuts Row ──────────────────────────────────────
          if (_searchQuery.isEmpty) ...[
            Text(
              'PINNED SHORTCUTS',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.8,
                color: isDark ? AppColors.darkInkSubtle : AppColors.inkTertiary,
              ),
            ),
            const SizedBox(height: 10),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              physics: const BouncingScrollPhysics(),
              child: Row(
                children: [
                  _QuickShortcutChip(
                    icon: Icons.fingerprint_rounded,
                    label: 'Clock In',
                    color: const Color(0xFF2563EB),
                    onTap: () => nav.navigateTo(NavPage.attendance),
                  ),
                  const SizedBox(width: 10),
                  _QuickShortcutChip(
                    icon: Icons.add_task_rounded,
                    label: 'New Task',
                    color: const Color(0xFF0D9488),
                    onTap: () => nav.navigateTo(NavPage.tasks),
                  ),
                  const SizedBox(width: 10),
                  _QuickShortcutChip(
                    icon: Icons.confirmation_number_outlined,
                    label: 'New Ticket',
                    color: const Color(0xFFE11D48),
                    onTap: () => nav.navigateTo(NavPage.tickets),
                  ),
                  const SizedBox(width: 10),
                  _QuickShortcutChip(
                    icon: Icons.camera_alt_outlined,
                    label: 'Snap Expense',
                    color: const Color(0xFFD97706),
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const ExpensesPage()),
                      );
                    },
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
          ],

          // ── Categorized Modules ─────────────────────────────────────────────
          if (groupedModules.isEmpty) ...[
            Center(
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 40.0),
                child: Column(
                  children: [
                    Icon(
                      Icons.search_off_rounded,
                      size: 48,
                      color: isDark
                          ? AppColors.darkInkSubtle
                          : AppColors.inkSubtle,
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'No matching modules found',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: isDark
                            ? AppColors.darkInkSubtle
                            : AppColors.inkMuted,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ] else ...[
            for (var entry in groupedModules.entries) ...[
              Text(
                entry.key,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.8,
                  color: isDark
                      ? AppColors.darkInkSubtle
                      : AppColors.inkTertiary,
                ),
              ),
              const SizedBox(height: 10),
              ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: entry.value.length,
                separatorBuilder: (_, _) => const SizedBox(height: 10),
                itemBuilder: (context, idx) {
                  final item = entry.value[idx];
                  return _ModuleCard(
                    title: item['title'] as String,
                    subtitle: item['subtitle'] as String,
                    icon: item['icon'] as IconData,
                    color: item['color'] as Color,
                    bgColor: item['bgColor'] as Color,
                    isDark: isDark,
                    onTap: () {
                      if (item['page'] != null) {
                        nav.navigateTo(item['page'] as NavPage);
                      } else if (item['onTap'] != null) {
                        (item['onTap'] as VoidCallback)();
                      }
                    },
                  );
                },
              ),
              const SizedBox(height: 24),
            ],
          ],
        ],
      ),
    );
  }
}

class _QuickShortcutChip extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _QuickShortcutChip({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12.0),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14.0, vertical: 10.0),
        decoration: BoxDecoration(
          color: isDark ? AppColors.darkSurface0 : Colors.white,
          borderRadius: BorderRadius.circular(12.0),
          border: Border.all(
            color: isDark ? AppColors.darkBorder : const Color(0xFFE2E8F0),
          ),
        ),
        child: Row(
          children: [
            Icon(icon, color: color, size: 18),
            const SizedBox(width: 8),
            Text(
              label,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: isDark ? Colors.white : AppColors.inkMuted,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ModuleCard extends StatelessWidget {
  final String title;
  final String subtitle;
  final IconData icon;
  final Color color;
  final Color bgColor;
  final bool isDark;
  final VoidCallback onTap;

  const _ModuleCard({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.color,
    required this.bgColor,
    required this.isDark,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16.0),
      child: Container(
        padding: const EdgeInsets.all(14.0),
        decoration: BoxDecoration(
          color: isDark ? AppColors.darkSurface0 : Colors.white,
          borderRadius: BorderRadius.circular(16.0),
          border: Border.all(
            color: isDark ? AppColors.darkBorder : const Color(0xFFF1F5F9),
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: isDark ? 0.15 : 0.03),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: isDark ? color.withValues(alpha: 0.18) : bgColor,
                borderRadius: BorderRadius.circular(14.0),
              ),
              child: Center(child: Icon(icon, color: color, size: 24)),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: isDark ? Colors.white : const Color(0xFF0F172A),
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: TextStyle(
                      fontSize: 12,
                      color: isDark
                          ? AppColors.darkInkSubtle
                          : AppColors.inkSubtle,
                    ),
                  ),
                ],
              ),
            ),
            Icon(
              Icons.chevron_right_rounded,
              color: isDark ? AppColors.darkInkSubtle : AppColors.inkTertiary,
              size: 20,
            ),
          ],
        ),
      ),
    );
  }
}
