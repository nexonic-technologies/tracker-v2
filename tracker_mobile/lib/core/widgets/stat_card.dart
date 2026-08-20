import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

/// A reusable KPI / Stat card following the DESIGN.md stat-card spec.
/// Shows an icon tile, a value, a label, and an optional trend indicator.
class StatCard extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final Color iconBg;
  final String value;
  final String label;
  final String? trendLabel;
  final bool? trendUp;

  const StatCard({
    super.key,
    required this.icon,
    required this.iconColor,
    required this.iconBg,
    required this.value,
    required this.label,
    this.trendLabel,
    this.trendUp,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final cardBg = isDark ? AppColors.darkSurface0 : AppColors.surface0;
    final borderColor = isDark ? AppColors.darkBorder : AppColors.border;

    return Container(
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: borderColor),
        boxShadow: [
          BoxShadow(
            color: AppColors.brandSolid.withValues(alpha: 0.06),
            blurRadius: 3,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: iconBg,
                  borderRadius: BorderRadius.circular(AppRadius.lg),
                ),
                child: Icon(icon, color: iconColor, size: 20),
              ),
              if (trendLabel != null && trendUp != null) ...[
                Row(
                  children: [
                    Icon(
                      trendUp! ? Icons.trending_up_rounded : Icons.trending_down_rounded,
                      size: 14,
                      color: trendUp! ? AppColors.success : AppColors.error,
                    ),
                    const SizedBox(width: 2),
                    Text(
                      trendLabel!,
                      style: theme.textTheme.bodySmall?.copyWith(
                        fontSize: 11,
                        color: trendUp! ? AppColors.success : AppColors.error,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          Text(
            value,
            style: theme.textTheme.headlineLarge?.copyWith(
              fontSize: 26,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: AppSpacing.xs),
          Text(
            label,
            style: theme.textTheme.bodySmall?.copyWith(
              color: isDark ? AppColors.darkInkMuted : AppColors.inkMuted,
            ),
          ),
        ],
      ),
    );
  }
}
