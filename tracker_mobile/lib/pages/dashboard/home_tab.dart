import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/navigation_provider.dart';
import '../../services/api.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/stat_card.dart';
import '../../core/widgets/cached_avatar.dart';
import '../../core/utils/location_helper.dart';
import 'executive_mis_widget.dart';

class HomeTab extends StatefulWidget {
  const HomeTab({super.key});

  @override
  State<HomeTab> createState() => _HomeTabState();
}

class _HomeTabState extends State<HomeTab> {
  final ApiService _api = ApiService();
  bool _loadingAttendance = false;
  Map<String, dynamic>? _todayAttendance;
  bool _actionBusy = false;

  List<Map<String, dynamic>> _pendingApprovals = [];

  String _localDate([DateTime? d]) {
    final date = d ?? DateTime.now();
    return '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _fetchToday();
      _fetchPendingApprovals();
    });
  }

  Future<void> _fetchPendingApprovals() async {
    final userId = context.read<AuthProvider>().user?.id;
    if (userId == null) return;

    try {
      final query = {
        'filter': {'managerId': userId, 'status': 'Pending'},
        'limit': 20,
      };
      final res = await _api.readModel('leaves', query: query);
      if (res.statusCode == 200 && res.data != null) {
        final List<dynamic> data = res.data['data'] ?? [];
        if (mounted) {
          setState(() {
            _pendingApprovals = List<Map<String, dynamic>>.from(data);
          });
        }
      }
    } catch (e) {
      debugPrint("Error fetching pending approvals: $e");
    } finally {
      // no-op
    }
  }

  Future<void> _handleApproval(String leaveId, String status) async {
    setState(() => _actionBusy = true);
    try {
      final payload = {
        'status': status,
        if (status == 'Approved')
          'approvedAt': DateTime.now().toIso8601String(),
        if (status == 'Rejected')
          'rejectedAt': DateTime.now().toIso8601String(),
      };
      final res = await _api.updateModel('leaves', leaveId, payload);
      if (res.statusCode == 200) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Leave request $status successfully')),
        );
        _fetchPendingApprovals();
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Action failed. Please try again.')),
      );
    } finally {
      if (mounted) setState(() => _actionBusy = false);
    }
  }

  Future<void> _fetchToday() async {
    setState(() => _loadingAttendance = true);
    _fetchPendingApprovals();
    try {
      final today = _localDate();
      final res = await _api.readModel(
        'attendances',
        query: {
          'filter': {
            'date': {
              '\$gte': '${today}T00:00:00.000Z',
              '\$lte': '${today}T23:59:59.999Z',
            },
          },
        },
      );
      final data = res.data;
      final recs = data is Map ? (data['data'] as List?) ?? [] : [];
      if (!mounted) return;
      setState(() {
        _todayAttendance = recs.isNotEmpty
            ? Map<String, dynamic>.from(recs.first)
            : null;
      });
    } catch (_) {
      // ignore
    } finally {
      if (mounted) setState(() => _loadingAttendance = false);
    }
  }

  Future<void> _handleCheckIn(String userId, String userName) async {
    if (_actionBusy) return;
    setState(() => _actionBusy = true);
    try {
      final today = _localDate();
      final loc = await getDeviceLocation();
      if (_todayAttendance?['_id'] != null) {
        await _api.updateModel('attendances', _todayAttendance!['_id'], {
          'checkIn': DateTime.now().toIso8601String(),
          'location': loc,
        });
      } else {
        await _api.createModel('attendances', {
          'employee': userId,
          'employeeName': userName,
          'date': today,
          'checkIn': DateTime.now().toIso8601String(),
          'status': 'Present',
          'workType': 'fixed',
          'location': loc,
        });
      }
      await _fetchToday();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Check-in failed: $e'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _actionBusy = false);
    }
  }

  Future<void> _handleCheckOut() async {
    if (_actionBusy || _todayAttendance?['_id'] == null) return;
    setState(() => _actionBusy = true);
    try {
      await _api.updateModel('attendances', _todayAttendance!['_id'], {
        'checkOut': DateTime.now().toIso8601String(),
      });
      await _fetchToday();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Check-out failed: $e'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _actionBusy = false);
    }
  }

  String? _lastCheckOutTime() {
    final rec = _todayAttendance;
    if (rec == null) return null;
    final punches = rec['punches'] as List?;
    if (punches != null && punches.isNotEmpty) {
      for (int i = punches.length - 1; i >= 0; i--) {
        final p = punches[i] as Map?;
        if (p != null && p['checkOut'] != null) {
          return p['checkOut'].toString();
        }
      }
    }
    return rec['checkOut']?.toString();
  }

  String _fmt12(String? iso) {
    if (iso == null) return '—';
    try {
      final dt = DateTime.parse(iso).toLocal();
      final h = dt.hour % 12 == 0 ? 12 : dt.hour % 12;
      final m = dt.minute.toString().padLeft(2, '0');
      final ampm = dt.hour < 12 ? 'AM' : 'PM';
      return '$h:$m $ampm';
    } catch (_) {
      return '—';
    }
  }

  double _calculateActiveHours(Map<String, dynamic>? rec) {
    if (rec == null) return 0.0;

    final punches = rec['punches'] as List?;
    if (punches != null && punches.isNotEmpty) {
      double totalMinutes = 0.0;
      for (var i = 0; i < punches.length; i++) {
        final p = punches[i] as Map?;
        if (p == null) continue;
        final ci = DateTime.tryParse(p['checkIn']?.toString() ?? '');
        if (ci == null) continue;

        DateTime co;
        if (p['checkOut'] != null) {
          co = DateTime.tryParse(p['checkOut'].toString()) ?? ci;
        } else {
          // If checkout is null, only count it if it's the last punch AND the user is currently checked-in/active
          if (i == punches.length - 1) {
            co = DateTime.now();
          } else {
            co = ci;
          }
        }
        totalMinutes += co.difference(ci).inMinutes;
      }
      return totalMinutes / 60.0;
    }

    // Fallback to workHours if punches array is not populated or empty
    if (rec['workHours'] != null) {
      return (rec['workHours'] as num).toDouble();
    }

    // Final fallback to top-level checkIn/checkOut
    if (rec['checkIn'] == null) return 0.0;
    final checkIn =
        DateTime.tryParse(rec['checkIn']?.toString() ?? '') ?? DateTime.now();
    final checkOut = rec['checkOut'] != null
        ? DateTime.tryParse(rec['checkOut']?.toString() ?? '') ?? DateTime.now()
        : DateTime.now();
    return checkOut.difference(checkIn).inMinutes / 60.0;
  }

  double _activeHours() {
    return _calculateActiveHours(_todayAttendance);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final auth = context.watch<AuthProvider>();
    final user = auth.user;

    final checkedIn = _todayAttendance?['checkIn'] != null;
    final checkedOut = _todayAttendance?['checkOut'] != null;

    // Evaluate if user is currently checked in by inspecting the last punch
    final punches = _todayAttendance?['punches'] as List?;
    final isCurrentlyCheckedIn =
        checkedIn &&
        (punches != null && punches.isNotEmpty
            ? punches.last['checkOut'] == null
            : checkedOut == false);

    final hours = _activeHours();

    return RefreshIndicator(
      onRefresh: _fetchToday,
      color: AppColors.brandSolid,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(AppSpacing.lg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ─── Greeting Card ──────────────────────────────────────────────
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(AppSpacing.lg),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [
                    AppColors.brandFrom,
                    AppColors.brandMid,
                    AppColors.brandTo,
                  ],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(AppRadius.xl),
              ),
              child: Row(
                children: [
                  // Avatar
                  CachedAvatar(
                    name: user?.name ?? 'User',
                    imageUrl: user?.profileImage,
                    radius: 26,
                    borderWidth: 2,
                    borderColor: Colors.white.withValues(alpha: 0.5),
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Hello, ${(user?.name ?? 'there').split(' ').first} 👋',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          user?.designation ?? user?.department ?? user?.role ?? 'Employee',
                          style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.8),
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: AppSpacing.lg),

            // Executive MIS Cockpit Card
            const ExecutiveMisWidget(),

            const SizedBox(height: AppSpacing.lg),
            Row(
              children: [
                Expanded(
                  child: StatCard(
                    icon: Icons.access_time_rounded,
                    iconColor: AppColors.hrAccent,
                    iconBg: AppColors.hrAccentLight,
                    value: '${hours.toStringAsFixed(1)}h',
                    label: 'Hours Today',
                  ),
                ),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: StatCard(
                    icon: isCurrentlyCheckedIn
                        ? Icons.check_circle_rounded
                        : Icons.radio_button_unchecked_rounded,
                    iconColor: isCurrentlyCheckedIn
                        ? AppColors.success
                        : AppColors.inkSubtle,
                    iconBg: isCurrentlyCheckedIn
                        ? AppColors.successLight
                        : AppColors.surface1,
                    value: isCurrentlyCheckedIn ? 'In' : 'Out',
                    label: 'Today\'s Status',
                  ),
                ),
              ],
            ),

            const SizedBox(height: AppSpacing.lg),

            // ─── Today Attendance Card ───────────────────────────────────────
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(AppSpacing.lg),
              decoration: BoxDecoration(
                color: isDark ? AppColors.darkSurface0 : AppColors.surface0,
                borderRadius: BorderRadius.circular(AppRadius.lg),
                border: Border.all(
                  color: isDark ? AppColors.darkBorder : AppColors.border,
                ),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.brandSolid.withValues(alpha: 0.05),
                    blurRadius: 4,
                    offset: const Offset(0, 1),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: AppColors.hrAccentLight,
                          borderRadius: BorderRadius.circular(AppRadius.md),
                        ),
                        child: const Icon(
                          Icons.timer_rounded,
                          color: AppColors.hrAccent,
                          size: 18,
                        ),
                      ),
                      const SizedBox(width: AppSpacing.sm),
                      Text(
                        'Shift Tracker',
                        style: theme.textTheme.headlineSmall?.copyWith(
                          fontSize: 16,
                        ),
                      ),
                    ],
                  ),
                  const Divider(height: AppSpacing.xl),

                  // Status + times
                  if (_loadingAttendance)
                    const Center(
                      child: Padding(
                        padding: EdgeInsets.all(AppSpacing.lg),
                        child: CircularProgressIndicator(
                          color: AppColors.hrAccent,
                        ),
                      ),
                    )
                  else ...[
                    Row(
                      children: [
                        _TimeChip(
                          label: 'Check In',
                          value: _fmt12(_todayAttendance?['checkIn']),
                          color: AppColors.success,
                        ),
                        const SizedBox(width: AppSpacing.md),
                        _TimeChip(
                          label: 'Last Check Out',
                          value: _fmt12(_lastCheckOutTime()),
                          color: AppColors.error,
                        ),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.md),

                    // Action button
                    if (!isCurrentlyCheckedIn)
                      _GradientButton(
                        label: 'Check In',
                        icon: Icons.login_rounded,
                        busy: _actionBusy,
                        onTap: () =>
                            _handleCheckIn(user?.id ?? '', user?.name ?? ''),
                      )
                    else
                      _GradientButton(
                        label: 'Check Out',
                        icon: Icons.logout_rounded,
                        busy: _actionBusy,
                        gradient: const LinearGradient(
                          colors: [Color(0xFF059669), Color(0xFF34D399)],
                        ),
                        onTap: _handleCheckOut,
                      ),
                  ],
                ],
              ),
            ),

            const SizedBox(height: AppSpacing.lg),

            // Pending Approvals List
            if (_pendingApprovals.isNotEmpty) ...[
              Text('Pending Team Leaves', style: theme.textTheme.titleLarge),
              const SizedBox(height: AppSpacing.sm),
              ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: _pendingApprovals.length,
                itemBuilder: (context, idx) {
                  final leave = _pendingApprovals[idx];
                  final name = leave['employeeName'] ?? 'Team Member';
                  final type = leave['leaveName'] ?? 'Leave Request';
                  final days = leave['totalDays']?.toString() ?? '1';
                  final reason = leave['reason'] ?? 'No reason provided';

                  return Card(
                    elevation: 0,
                    margin: const EdgeInsets.only(bottom: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                      side: BorderSide(
                        color: isDark ? AppColors.darkBorder : AppColors.border,
                      ),
                    ),
                    color: isDark ? AppColors.darkSurface0 : Colors.white,
                    child: Padding(
                      padding: const EdgeInsets.all(14.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                name,
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 13,
                                  color: isDark
                                      ? AppColors.darkInk
                                      : AppColors.ink,
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 3,
                                ),
                                decoration: BoxDecoration(
                                  color: AppColors.hrAccent.withValues(
                                    alpha: 0.1,
                                  ),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  '$days Days • $type',
                                  style: const TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                    color: AppColors.hrAccent,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Text(
                            reason,
                            style: TextStyle(
                              fontSize: 12,
                              color: isDark
                                  ? AppColors.darkInkSubtle
                                  : AppColors.inkSubtle,
                            ),
                          ),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              Expanded(
                                child: ElevatedButton(
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: Colors.green.shade600,
                                    padding: const EdgeInsets.symmetric(
                                      vertical: 8,
                                    ),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                  ),
                                  onPressed: () =>
                                      _handleApproval(leave['_id'], 'Approved'),
                                  child: const Text(
                                    'Approve',
                                    style: TextStyle(
                                      fontSize: 11,
                                      color: Colors.white,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: OutlinedButton(
                                  style: OutlinedButton.styleFrom(
                                    foregroundColor: Colors.red,
                                    side: const BorderSide(color: Colors.red),
                                    padding: const EdgeInsets.symmetric(
                                      vertical: 8,
                                    ),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                  ),
                                  onPressed: () =>
                                      _handleApproval(leave['_id'], 'Rejected'),
                                  child: const Text(
                                    'Reject',
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
              const SizedBox(height: AppSpacing.lg),
            ],

            // ─── Quick Nav Cards ─────────────────────────────────────────────
            Text('Quick Access', style: theme.textTheme.titleLarge),
            const SizedBox(height: AppSpacing.sm),
            Row(
              children: [
                Expanded(
                  child: _QuickNavCard(
                    icon: Icons.calendar_month_rounded,
                    iconColor: AppColors.hrAccent,
                    iconBg: AppColors.hrAccentLight,
                    label: 'Attendance',
                    onTap: () => context.read<NavigationProvider>().navigateTo(
                      NavPage.attendance,
                    ),
                  ),
                ),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: _QuickNavCard(
                    icon: Icons.bar_chart_rounded,
                    iconColor: AppColors.projectAccent,
                    iconBg: AppColors.projectAccentLight,
                    label: 'Activity\nTracker',
                    onTap: () => context.read<NavigationProvider>().navigateTo(
                      NavPage.activity,
                    ),
                  ),
                ),
              ],
            ),

            const SizedBox(height: AppSpacing.xxl),
          ],
        ),
      ),
    );
  }
}

// ─── Sub-Widgets ─────────────────────────────────────────────────────────────

class _TimeChip extends StatelessWidget {
  final String label;
  final String value;
  final Color color;
  const _TimeChip({
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: isDark ? AppColors.darkSurface1 : AppColors.surface1,
          borderRadius: BorderRadius.circular(AppRadius.md),
          border: Border.all(
            color: isDark ? AppColors.darkBorder : AppColors.border,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: theme.textTheme.bodySmall?.copyWith(fontSize: 11),
            ),
            const SizedBox(height: 2),
            Text(
              value,
              style: theme.textTheme.titleLarge?.copyWith(
                fontSize: 15,
                color: value == '—'
                    ? (isDark ? AppColors.darkInkSubtle : AppColors.inkSubtle)
                    : color,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _GradientButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool busy;
  final VoidCallback onTap;
  final Gradient? gradient;
  const _GradientButton({
    required this.label,
    required this.icon,
    required this.busy,
    required this.onTap,
    this.gradient,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: busy ? null : onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 13),
        decoration: BoxDecoration(
          gradient:
              gradient ??
              const LinearGradient(
                colors: [AppColors.brandFrom, AppColors.brandTo],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
          borderRadius: BorderRadius.circular(AppRadius.md),
          boxShadow: [
            BoxShadow(
              color: AppColors.brandSolid.withValues(alpha: 0.3),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (busy)
              const SizedBox(
                width: 18,
                height: 18,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                ),
              )
            else
              Icon(icon, color: Colors.white, size: 18),
            const SizedBox(width: 8),
            Text(
              busy ? 'Please wait…' : label,
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w600,
                fontSize: 15,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _QuickNavCard extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final Color iconBg;
  final String label;
  final VoidCallback onTap;
  const _QuickNavCard({
    required this.icon,
    required this.iconColor,
    required this.iconBg,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(AppSpacing.lg),
        decoration: BoxDecoration(
          color: isDark ? AppColors.darkSurface0 : AppColors.surface0,
          borderRadius: BorderRadius.circular(AppRadius.lg),
          border: Border.all(
            color: isDark ? AppColors.darkBorder : AppColors.border,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: iconBg,
                borderRadius: BorderRadius.circular(AppRadius.md),
              ),
              child: Icon(icon, color: iconColor, size: 20),
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              label,
              style: theme.textTheme.titleLarge?.copyWith(fontSize: 13),
            ),
          ],
        ),
      ),
    );
  }
}
