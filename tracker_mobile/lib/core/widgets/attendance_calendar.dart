import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

/// Monthly calendar grid widget for Attendance page.
/// Color-codes each day: Present, Absent, Late, Weekend, Future, Today.
class AttendanceCalendar extends StatelessWidget {
  final int month; // 0-indexed
  final int year;
  final List<Map<String, dynamic>> records;
  final DateTime? selectedDate;
  final ValueChanged<DateTime>? onDayTap;

  const AttendanceCalendar({
    super.key,
    required this.month,
    required this.year,
    required this.records,
    this.selectedDate,
    this.onDayTap,
  });

  static const _dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  String _localDate(DateTime d) =>
      '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  bool _isToday(DateTime d) => _localDate(d) == _localDate(DateTime.now());
  bool _isFuture(DateTime d) => d.isAfter(DateTime.now()) && !_isToday(d);
  bool _isWeekend(DateTime d) => d.weekday == 6 || d.weekday == 7; // Sat=6 Sun=7

  Map<String, dynamic>? _recordFor(DateTime d) {
    final key = _localDate(d);
    for (final r in records) {
      final dateRaw = r['date']?.toString() ?? '';
      if (dateRaw.startsWith(key)) return r;
    }
    return null;
  }

  _DayStyle _styleFor(DateTime d) {
    if (_isWeekend(d)) {
      return _DayStyle(
        bg: AppColors.surface1,
        border: Colors.transparent,
        text: AppColors.inkTertiary,
        dot: null,
      );
    }
    if (_isFuture(d)) {
      return _DayStyle(
        bg: Colors.transparent,
        border: Colors.transparent,
        text: AppColors.inkTertiary,
        dot: null,
      );
    }

    final rec = _recordFor(d);
    if (_isToday(d)) {
      if (rec == null) {
        // today, not yet checked in
        return _DayStyle(
          bg: AppColors.brandMid.withValues(alpha: 0.12),
          border: AppColors.brandMid,
          text: AppColors.brandSolid,
          dot: AppColors.brandMid,
        );
      }
    }

    if (rec != null) {
      final status = (rec['status'] ?? '').toString().toLowerCase();
      if (status == 'present' || (rec['checkIn'] != null)) {
        return _DayStyle(
          bg: AppColors.statusPresentBg,
          border: AppColors.success.withValues(alpha: 0.3),
          text: AppColors.statusPresentText,
          dot: AppColors.success,
        );
      } else if (status == 'late') {
        return _DayStyle(
          bg: AppColors.warningLight,
          border: AppColors.warning.withValues(alpha: 0.3),
          text: const Color(0xFF92400E),
          dot: AppColors.warning,
        );
      } else {
        return _DayStyle(
          bg: AppColors.errorLight,
          border: AppColors.error.withValues(alpha: 0.3),
          text: AppColors.statusAbsentText,
          dot: AppColors.error,
        );
      }
    }

    // Past day, no record — absent
    return _DayStyle(
      bg: AppColors.errorLight.withValues(alpha: 0.5),
      border: AppColors.error.withValues(alpha: 0.15),
      text: AppColors.statusAbsentText.withValues(alpha: 0.7),
      dot: AppColors.error.withValues(alpha: 0.5),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final firstDay = DateTime(year, month + 1, 1);
    final daysInMonth = DateTime(year, month + 2, 0).day;
    // weekday: Mon=1, ..., Sun=7; we want Sun=0 ... Sat=6
    int startOffset = firstDay.weekday % 7; // Sun=0

    final dayLabelColor = isDark ? AppColors.darkInkMuted : AppColors.inkMuted;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Day-of-week headers
        Row(
          children: _dayLabels.map((l) {
            return Expanded(
              child: Center(
                child: Text(
                  l,
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: dayLabelColor,
                    fontWeight: FontWeight.w700,
                    fontSize: 11,
                  ),
                ),
              ),
            );
          }).toList(),
        ),
        const SizedBox(height: 6),
        // Calendar grid
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 7,
            childAspectRatio: 1.0,
            crossAxisSpacing: 3,
            mainAxisSpacing: 3,
          ),
          itemCount: startOffset + daysInMonth,
          itemBuilder: (context, idx) {
            if (idx < startOffset) return const SizedBox.shrink();

            final day = DateTime(year, month + 1, idx - startOffset + 1);
            final style = _styleFor(day);
            final isSelected = selectedDate != null &&
                _localDate(day) == _localDate(selectedDate!);

            return GestureDetector(
              onTap: () => onDayTap?.call(day),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                decoration: BoxDecoration(
                  color: style.bg,
                  borderRadius: BorderRadius.circular(AppRadius.sm),
                  border: Border.all(
                    color: isSelected
                        ? AppColors.brandSolid
                        : style.border,
                    width: isSelected ? 2 : 1,
                  ),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      '${day.day}',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: _isToday(day)
                            ? FontWeight.w700
                            : FontWeight.w400,
                        color: style.text,
                      ),
                    ),
                    if (style.dot != null) ...[
                      const SizedBox(height: 2),
                      Container(
                        width: 4,
                        height: 4,
                        decoration: BoxDecoration(
                          color: style.dot,
                          shape: BoxShape.circle,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            );
          },
        ),
        const SizedBox(height: AppSpacing.md),
        // Legend
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            _Legend(color: AppColors.success, label: 'Present'),
            const SizedBox(width: AppSpacing.md),
            _Legend(color: AppColors.error, label: 'Absent'),
            const SizedBox(width: AppSpacing.md),
            _Legend(color: AppColors.warning, label: 'Late'),
            const SizedBox(width: AppSpacing.md),
            _Legend(color: AppColors.brandMid, label: 'Today'),
          ],
        ),
      ],
    );
  }
}

class _DayStyle {
  final Color bg;
  final Color border;
  final Color text;
  final Color? dot;
  const _DayStyle({
    required this.bg,
    required this.border,
    required this.text,
    required this.dot,
  });
}

class _Legend extends StatelessWidget {
  final Color color;
  final String label;
  const _Legend({required this.color, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 8, height: 8,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 4),
        Text(
          label,
          style: Theme.of(context).textTheme.bodySmall?.copyWith(fontSize: 11),
        ),
      ],
    );
  }
}
