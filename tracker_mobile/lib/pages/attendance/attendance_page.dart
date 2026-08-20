import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../services/api.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/location_helper.dart';

// ─── Helpers ─────────────────────────────────────────────────────────────────

String _localDate([DateTime? d]) {
  final date = d ?? DateTime.now();
  return '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
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

String? _lastCheckOutForRecord(Map<String, dynamic>? rec) {
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
  final checkIn = DateTime.tryParse(rec['checkIn']?.toString() ?? '') ?? DateTime.now();
  final checkOut = rec['checkOut'] != null
      ? DateTime.tryParse(rec['checkOut']?.toString() ?? '') ?? DateTime.now()
      : DateTime.now();
  return checkOut.difference(checkIn).inMinutes / 60.0;
}

const _monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// ─── AttendancePage ───────────────────────────────────────────────────────────

class AttendancePage extends StatefulWidget {
  const AttendancePage({super.key});

  @override
  State<AttendancePage> createState() => _AttendancePageState();
}

class _AttendancePageState extends State<AttendancePage> {
  final ApiService _api = ApiService();

  bool _loading = false;
  bool _actionBusy = false;
  List<Map<String, dynamic>> _records = [];
  Map<String, dynamic>? _todayRec;
  DateTime _selectedDate = DateTime.now();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _fetchAll();
      _fetchToday();
    });
  }

  Future<void> _fetchToday() async {
    final user = context.read<AuthProvider>().user;
    if (user == null) return;
    final today = _localDate();
    try {
      final res = await _api.readModel('attendances', query: {
        'filter': {
          'date': {'\$gte': '${today}T00:00:00.000Z', '\$lte': '${today}T23:59:59.999Z'},
        },
      });
      final recs = (res.data is Map ? (res.data['data'] as List?) ?? [] : []);
      if (!mounted) return;
      setState(() {
        _todayRec = recs.isNotEmpty ? Map<String, dynamic>.from(recs.first) : null;
      });
    } catch (_) {}
  }

  Future<void> _fetchAll() async {
    if (!mounted) return;
    setState(() => _loading = true);
    try {
      final mm = _selectedDate.month.toString().padLeft(2, '0');
      final lastDay = DateTime(_selectedDate.year, _selectedDate.month + 1, 0).day;
      final startDate = '${_selectedDate.year}-$mm-01';
      final endDate   = '${_selectedDate.year}-$mm-${lastDay.toString().padLeft(2, '0')}';

      final res = await _api.readModel('attendances', query: {
        'filter': {
          'date': {'\$gte': '${startDate}T00:00:00.000Z', '\$lte': '${endDate}T23:59:59.999Z'},
        },
        'sort': {'date': -1},
      });
      final recs = (res.data is Map ? (res.data['data'] as List?) ?? [] : []);
      if (!mounted) return;
      setState(() {
        _records = recs.map((e) => Map<String, dynamic>.from(e)).toList();
      });
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _handleCheckIn(String userId, String userName) async {
    if (_actionBusy) return;
    setState(() => _actionBusy = true);
    try {
      final today = _localDate();
      final loc = await getDeviceLocation();
      if (_todayRec?['_id'] != null) {
        await _api.updateModel('attendances', _todayRec!['_id'], {
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
      await _fetchAll();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: AppColors.error),
        );
      }
    } finally {
      if (mounted) setState(() => _actionBusy = false);
    }
  }

  Future<void> _handleCheckOut() async {
    if (_actionBusy || _todayRec?['_id'] == null) return;
    setState(() => _actionBusy = true);
    try {
      await _api.updateModel('attendances', _todayRec!['_id'],
          {'checkOut': DateTime.now().toIso8601String()});
      await _fetchToday();
      await _fetchAll();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: AppColors.error),
        );
      }
    } finally {
      if (mounted) setState(() => _actionBusy = false);
    }
  }

  double _activeHours() {
    return _calculateActiveHours(_todayRec);
  }

  String _fmtHoursMins(double hoursDecimal) {
    final totalMinutes = (hoursDecimal * 60).round();
    final h = totalMinutes ~/ 60;
    final m = totalMinutes % 60;
    return '${h}h ${m}m';
  }

  List<DateTime> _getCurrentWeek(DateTime date) {
    final monday = date.subtract(Duration(days: date.weekday - 1));
    return List.generate(7, (i) => monday.add(Duration(days: i)));
  }

  Color? _dotColorFor(DateTime d) {
    if (d.weekday == 6 || d.weekday == 7) {
      return const Color(0xFF9CA3AF);
    }
    
    final today = DateTime.now();
    final normalizedDay = DateTime(d.year, d.month, d.day);
    final normalizedToday = DateTime(today.year, today.month, today.day);
    if (normalizedDay.isAfter(normalizedToday)) {
      return null;
    }

    final dateStr = _localDate(d);
    Map<String, dynamic>? rec;
    for (final r in _records) {
      if ((r['date'] ?? '').toString().startsWith(dateStr)) {
        rec = r;
        break;
      }
    }

    if (rec == null) {
      if (normalizedDay.isBefore(normalizedToday)) {
        return const Color(0xFFEF4444);
      }
      return null;
    }

    final status = (rec['status'] ?? '').toString().toLowerCase();
    if (status.contains('present') || status.contains('on time')) {
      return const Color(0xFF10B981);
    } else if (status.contains('late')) {
      return const Color(0xFFF59E0B);
    } else if (status.contains('leave')) {
      return const Color(0xFFEF4444);
    } else if (status.contains('pending')) {
      return const Color(0xFF8B5CF6);
    } else {
      return const Color(0xFF3B82F6);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final auth = context.watch<AuthProvider>();
    final user = auth.user;

    final checkedIn  = _todayRec?['checkIn'] != null;
    final checkedOut = _todayRec?['checkOut'] != null;

    final punches = _todayRec?['punches'] as List?;
    final isCurrentlyCheckedIn = checkedIn &&
        (punches != null && punches.isNotEmpty
            ? punches.last['checkOut'] == null
            : checkedOut == false);

    // Calculate Grid Stats
    int presentCount = 0;
    int lateCount = 0;
    int leaveCount = 0;
    int pendingCount = 0;

    for (final r in _records) {
      final status = (r['status'] ?? '').toString().toLowerCase();
      if (status.contains('present') || status.contains('on time')) {
        presentCount++;
      } else if (status.contains('late')) {
        lateCount++;
      } else if (status.contains('leave')) {
        leaveCount++;
      } else if (status.contains('pending')) {
        pendingCount++;
      }
    }

    return RefreshIndicator(
      onRefresh: () async {
        await _fetchAll();
        await _fetchToday();
      },
      color: AppColors.hrAccent,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(AppSpacing.lg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [


            // 2. Punch Card
            _buildPunchCard(context, isCurrentlyCheckedIn, isDark, user),
            const SizedBox(height: AppSpacing.lg),

            // 3. Mini Stats Grid
            _buildStatsGrid(presentCount, lateCount, leaveCount, pendingCount, isDark),
            const SizedBox(height: AppSpacing.xl),

            // 4. Week Day Navigator Calendar
            _buildWeekNavigator(context, isDark),
            const SizedBox(height: AppSpacing.xl),

            // 5. History Section
            if (_loading)
              const Center(
                child: Padding(
                  padding: EdgeInsets.symmetric(vertical: 40.0),
                  child: CircularProgressIndicator(color: AppColors.hrAccent),
                ),
              )
            else
              _buildHistorySection(context, isDark),

            const SizedBox(height: AppSpacing.xxl),
          ],
        ),
      ),
    );
  }



  // --- Punch Card Replica ---
  Widget _buildPunchCard(
    BuildContext context,
    bool isCurrentlyCheckedIn,
    bool isDark,
    dynamic user,
  ) {
    final activeMinutes = _activeHours();
    final checkInTimeStr = _fmt12(_todayRec?['checkIn']);
    final checkOutTimeStr = _fmt12(_lastCheckOutForRecord(_todayRec));
    
    final statusText = isCurrentlyCheckedIn ? 'Checked in' : 'Checked out';
    final statusBg = isCurrentlyCheckedIn ? const Color(0xFFD1FAE5) : const Color(0xFFFEE2E2);
    final statusTextColor = isCurrentlyCheckedIn ? const Color(0xFF065F46) : const Color(0xFFB91C1C);
    
    String lastPunchTimeStr = '--:--';
    final punches = _todayRec?['punches'] as List?;
    if (punches != null && punches.isNotEmpty) {
      final lastPunch = punches.last as Map?;
      final lastTime = lastPunch?['checkOut'] ?? lastPunch?['checkIn'];
      if (lastTime != null) {
        lastPunchTimeStr = _fmt12(lastTime.toString());
      }
    } else if (_todayRec?['checkIn'] != null) {
      lastPunchTimeStr = _fmt12(_todayRec!['checkIn'].toString());
    }

    final cardBg = isDark ? AppColors.darkSurface0 : Colors.white;
    final borderColor = isDark ? AppColors.darkBorder : AppColors.border;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: borderColor),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: statusBg,
                  borderRadius: BorderRadius.circular(AppRadius.pill),
                ),
                child: Text(
                  statusText,
                  style: TextStyle(
                    color: statusTextColor,
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              Text(
                lastPunchTimeStr,
                style: TextStyle(
                  color: isDark ? AppColors.darkInkSubtle : AppColors.inkSubtle,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.lg),

          Row(
            children: [
              SizedBox(
                width: 100,
                height: 100,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    SizedBox(
                      width: 90,
                      height: 90,
                      child: CircularProgressIndicator(
                        value: (activeMinutes / 9.0).clamp(0.0, 1.0),
                        strokeWidth: 7,
                        backgroundColor: isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
                        valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF3B82F6)),
                      ),
                    ),
                    Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          _fmtHoursMins(activeMinutes),
                          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                        ),
                        Text(
                          'of 9h',
                          style: TextStyle(
                            fontSize: 9,
                            color: isDark ? AppColors.darkInkMuted : AppColors.inkMuted,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(width: AppSpacing.xl),

              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Check in',
                      style: TextStyle(
                        fontSize: 11,
                        color: isDark ? AppColors.darkInkMuted : AppColors.inkMuted,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      checkInTimeStr,
                      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                    ),
                    
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 8.0),
                      child: Divider(height: 1, thickness: 0.5),
                    ),
                    
                    Text(
                      'Last check out',
                      style: TextStyle(
                        fontSize: 11,
                        color: isDark ? AppColors.darkInkMuted : AppColors.inkMuted,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      checkOutTimeStr,
                      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.lg),

          GestureDetector(
            onTap: _actionBusy
                ? null
                : (isCurrentlyCheckedIn
                    ? _handleCheckOut
                    : () => _handleCheckIn(user?.id ?? '', user?.name ?? '')),
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 14),
              decoration: BoxDecoration(
                color: const Color(0xFF0F172A),
                borderRadius: BorderRadius.circular(AppRadius.lg),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  if (_actionBusy)
                    const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                      ),
                    )
                  else ...[
                    Icon(
                      isCurrentlyCheckedIn ? Icons.logout_rounded : Icons.login_rounded,
                      color: Colors.white,
                      size: 18,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      isCurrentlyCheckedIn ? 'Check out' : 'Check in',
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
                        fontSize: 15,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  // --- Mini Stats Grid Replica ---
  Widget _buildStatsGrid(int present, int late, int leave, int pending, bool isDark) {
    final cardBg = isDark ? AppColors.darkSurface0 : Colors.white;
    final borderColor = isDark ? AppColors.darkBorder : AppColors.border;

    return Column(
      children: [
        Row(
          children: [
            Expanded(
              child: _buildMiniStatCard(
                icon: Icons.calendar_today_rounded,
                iconColor: const Color(0xFF10B981),
                iconBg: const Color(0xFFD1FAE5),
                value: '$present',
                label: 'Present days',
                cardBg: cardBg,
                borderColor: borderColor,
              ),
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: _buildMiniStatCard(
                icon: Icons.schedule_rounded,
                iconColor: const Color(0xFFF59E0B),
                iconBg: const Color(0xFFFEF3C7),
                value: '$late',
                label: 'Late entries',
                cardBg: cardBg,
                borderColor: borderColor,
              ),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.md),
        Row(
          children: [
            Expanded(
              child: _buildMiniStatCard(
                icon: Icons.beach_access_rounded,
                iconColor: const Color(0xFFEF4444),
                iconBg: const Color(0xFFFEE2E2),
                value: '$leave',
                label: 'Leaves taken',
                cardBg: cardBg,
                borderColor: borderColor,
              ),
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: _buildMiniStatCard(
                icon: Icons.pending_actions_rounded,
                iconColor: const Color(0xFF3B82F6),
                iconBg: const Color(0xFFDBEAFE),
                value: '$pending',
                label: 'Pending requests',
                cardBg: cardBg,
                borderColor: borderColor,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildMiniStatCard({
    required IconData icon,
    required Color iconColor,
    required Color iconBg,
    required String value,
    required String label,
    required Color cardBg,
    required Color borderColor,
  }) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: iconBg,
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: iconColor, size: 18),
          ),
          const SizedBox(height: AppSpacing.md),
          Text(
            value,
            style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: const TextStyle(fontSize: 12, color: AppColors.inkSubtle, fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }

  // --- Week Calendar Replica ---
  Widget _buildWeekNavigator(BuildContext context, bool isDark) {
    final weekDays = _getCurrentWeek(_selectedDate);
    final monthName = _monthNames[_selectedDate.month - 1];
    final year = _selectedDate.year;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              '$monthName $year',
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            IconButton(
              icon: Icon(
                Icons.calendar_month_rounded,
                color: isDark ? AppColors.darkInkSubtle : AppColors.inkSubtle,
                size: 20,
              ),
              onPressed: () async {
                final picked = await showDatePicker(
                  context: context,
                  initialDate: _selectedDate,
                  firstDate: DateTime.now().subtract(const Duration(days: 365)),
                  lastDate: DateTime.now().add(const Duration(days: 30)),
                );
                if (picked != null) {
                  setState(() => _selectedDate = picked);
                  _fetchAll();
                }
              },
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.sm),

        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: weekDays.map((d) {
            final isSelected = _localDate(d) == _localDate(_selectedDate);
            final dayName = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][d.weekday - 1];
            final dotColor = _dotColorFor(d);

            return Expanded(
              child: GestureDetector(
                onTap: () {
                  setState(() => _selectedDate = d);
                  _fetchAll();
                },
                child: Column(
                  children: [
                    Text(
                      dayName,
                      style: TextStyle(
                        fontSize: 12,
                        color: isDark ? AppColors.darkInkSubtle : AppColors.inkSubtle,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    Container(
                      width: 36,
                      height: 36,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: isSelected
                            ? const Color(0xFF0F172A)
                            : Colors.transparent,
                        shape: BoxShape.circle,
                      ),
                      child: Text(
                        '${d.day}',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                          color: isSelected
                              ? Colors.white
                              : (isDark ? AppColors.darkInk : AppColors.ink),
                        ),
                      ),
                    ),
                    const SizedBox(height: 6),
                    if (dotColor != null)
                      Container(
                        width: 5,
                        height: 5,
                        decoration: BoxDecoration(
                          color: dotColor,
                          shape: BoxShape.circle,
                        ),
                      )
                    else
                      const SizedBox(height: 5),
                  ],
                ),
              ),
            );
          }).toList(),
        ),
        const SizedBox(height: AppSpacing.md),

        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              _buildLegendItem(color: const Color(0xFF10B981), label: 'Present'),
              const SizedBox(width: 10),
              _buildLegendItem(color: const Color(0xFF3B82F6), label: 'Check-out'),
              const SizedBox(width: 10),
              _buildLegendItem(color: const Color(0xFFF59E0B), label: 'Late'),
              const SizedBox(width: 10),
              _buildLegendItem(color: const Color(0xFFEF4444), label: 'Leave'),
              const SizedBox(width: 10),
              _buildLegendItem(color: const Color(0xFF8B5CF6), label: 'Pending'),
              const SizedBox(width: 10),
              _buildLegendItem(color: const Color(0xFF9CA3AF), label: 'Holiday'),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildLegendItem({required Color color, required String label}) {
    return Row(
      children: [
        Container(
          width: 6,
          height: 6,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 4),
        Text(
          label,
          style: const TextStyle(fontSize: 10, color: AppColors.inkSubtle, fontWeight: FontWeight.w600),
        ),
      ],
    );
  }

  // --- History List Replica ---
  Widget _buildHistorySection(BuildContext context, bool isDark) {
    final cardBg = isDark ? AppColors.darkSurface0 : Colors.white;
    final borderColor = isDark ? AppColors.darkBorder : AppColors.border;

    final List<Map<String, dynamic>> pastDays = [];
    final now = DateTime.now();
    for (int i = 1; i <= 15; i++) {
      final d = now.subtract(Duration(days: i));
      final dateStr = _localDate(d);
      
      Map<String, dynamic>? match;
      for (final r in _records) {
        if ((r['date'] ?? '').toString().startsWith(dateStr)) {
          match = r;
          break;
        }
      }
      
      pastDays.add({
        'date': d,
        'record': match,
      });
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'History',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: AppSpacing.md),
        
        ListView.separated(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: pastDays.length,
          separatorBuilder: (context, _) => const SizedBox(height: AppSpacing.md),
          itemBuilder: (context, idx) {
            final item = pastDays[idx];
            final DateTime date = item['date'] as DateTime;
            final Map<String, dynamic>? rec = item['record'] as Map<String, dynamic>?;
            
            final dayNumStr = date.day.toString().padLeft(2, '0');
            final dayNameStr = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][date.weekday - 1];
            
            String mainText = '';
            String subText = '';
            String chipText = 'Absent';
            Color chipBg = const Color(0xFFFEE2E2);
            Color chipTextColor = const Color(0xFFB91C1C);

            final isWeekend = date.weekday == 6 || date.weekday == 7;

            if (rec != null) {
              final status = (rec['status'] ?? '').toString().toLowerCase();
              final ciStr = _fmt12(rec['checkIn']);
              final coStr = _fmt12(_lastCheckOutForRecord(rec));
              
              if (rec['checkIn'] != null) {
                mainText = '$ciStr - $coStr';
                final hours = _calculateActiveHours(rec);
                subText = _fmtHoursWorked(hours);
                
                if (status.contains('late')) {
                  chipText = 'Late entry';
                  chipBg = const Color(0xFFFEF3C7);
                  chipTextColor = const Color(0xFFD97706);
                } else {
                  chipText = 'On time';
                  chipBg = const Color(0xFFD1FAE5);
                  chipTextColor = const Color(0xFF059669);
                }
              } else {
                mainText = 'Leave record';
                subText = 'Approved leave';
                chipText = 'On leave';
                chipBg = const Color(0xFFFEE2E2);
                chipTextColor = const Color(0xFFEF4444);
              }
            } else {
              if (isWeekend) {
                mainText = 'Weekly off';
                subText = '';
                chipText = 'Holiday';
                chipBg = const Color(0xFFF1F5F9);
                chipTextColor = const Color(0xFF64748B);
              } else {
                mainText = 'Absent';
                subText = 'No attendance recorded';
                chipText = 'Absent';
                chipBg = const Color(0xFFFEE2E2);
                chipTextColor = const Color(0xFFEF4444);
              }
            }

            return Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: cardBg,
                borderRadius: BorderRadius.circular(AppRadius.lg),
                border: Border.all(color: borderColor),
              ),
              child: Row(
                children: [
                  SizedBox(
                    width: 45,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          dayNumStr,
                          style: const TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            letterSpacing: -0.5,
                          ),
                        ),
                        Text(
                          dayNameStr,
                          style: const TextStyle(
                            fontSize: 12,
                            color: AppColors.inkSubtle,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    width: 1,
                    height: 36,
                    color: borderColor,
                    margin: const EdgeInsets.symmetric(horizontal: 12),
                  ),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          mainText,
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        if (subText.isNotEmpty) ...[
                          const SizedBox(height: 2),
                          Text(
                            subText,
                            style: const TextStyle(
                              fontSize: 12,
                              color: AppColors.inkMuted,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: chipBg,
                      borderRadius: BorderRadius.circular(AppRadius.pill),
                    ),
                    child: Text(
                      chipText,
                      style: TextStyle(
                        color: chipTextColor,
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),
            );
          },
        ),
      ],
    );
  }

  String _fmtHoursWorked(double decimalHours) {
    final totalMins = (decimalHours * 60).round();
    final h = totalMins ~/ 60;
    final m = totalMins % 60;
    return '$h hours $m mins worked';
  }
}
