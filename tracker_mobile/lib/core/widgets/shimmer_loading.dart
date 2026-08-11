import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';
import '../theme/app_theme.dart';

class ShimmerLoading extends StatelessWidget {
  final Widget child;
  final bool isLoading;

  const ShimmerLoading({
    super.key,
    required this.child,
    required this.isLoading,
  });

  @override
  Widget build(BuildContext context) {
    if (!isLoading) return child;

    final isDark = Theme.of(context).brightness == Brightness.dark;
    final baseColor = isDark ? Colors.grey[800]! : Colors.grey[300]!;
    final highlightColor = isDark ? Colors.grey[700]! : Colors.grey[100]!;

    return Shimmer.fromColors(
      baseColor: baseColor,
      highlightColor: highlightColor,
      child: child,
    );
  }

  // Helper 1: Build a skeletal rectangular box
  static Widget box({
    required double width,
    required double height,
    double borderRadius = 8.0,
  }) {
    return Builder(
      builder: (context) {
        final isDark = Theme.of(context).brightness == Brightness.dark;
        return Shimmer.fromColors(
          baseColor: isDark ? Colors.grey[800]! : Colors.grey[300]!,
          highlightColor: isDark ? Colors.grey[700]! : Colors.grey[100]!,
          child: Container(
            width: width,
            height: height,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(borderRadius),
            ),
          ),
        );
      },
    );
  }

  // Helper 2: Build a skeletal Circle shape
  static Widget circle({required double radius}) {
    return Builder(
      builder: (context) {
        final isDark = Theme.of(context).brightness == Brightness.dark;
        return Shimmer.fromColors(
          baseColor: isDark ? Colors.grey[800]! : Colors.grey[300]!,
          highlightColor: isDark ? Colors.grey[700]! : Colors.grey[100]!,
          child: Container(
            width: radius * 2,
            height: radius * 2,
            decoration: const BoxDecoration(
              color: Colors.white,
              shape: BoxShape.circle,
            ),
          ),
        );
      },
    );
  }

  // Helper 3: Renders a list of premium card skeletons
  static Widget list({int itemCount = 4, double spacing = 16.0}) {
    return ListView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      itemCount: itemCount,
      itemBuilder: (context, index) {
        final isDark = Theme.of(context).brightness == Brightness.dark;
        return Card(
          elevation: 0,
          margin: EdgeInsets.only(bottom: spacing),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: BorderSide(
              color: isDark ? AppColors.darkBorder : AppColors.border,
            ),
          ),
          color: isDark ? AppColors.darkSurface0 : Colors.white,
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        ShimmerLoading.circle(radius: 18),
                        const SizedBox(width: 10),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            ShimmerLoading.box(width: 100, height: 12),
                            const SizedBox(height: 4),
                            ShimmerLoading.box(width: 60, height: 8),
                          ],
                        ),
                      ],
                    ),
                    ShimmerLoading.box(width: 50, height: 16, borderRadius: 6),
                  ],
                ),
                const SizedBox(height: 16),
                ShimmerLoading.box(width: double.infinity, height: 14),
                const SizedBox(height: 8),
                ShimmerLoading.box(width: double.infinity, height: 12),
                const SizedBox(height: 8),
                ShimmerLoading.box(width: 180, height: 12),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        ShimmerLoading.box(
                          width: 40,
                          height: 14,
                          borderRadius: 4,
                        ),
                        const SizedBox(width: 12),
                        ShimmerLoading.box(
                          width: 40,
                          height: 14,
                          borderRadius: 4,
                        ),
                      ],
                    ),
                    ShimmerLoading.box(width: 80, height: 14, borderRadius: 4),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
