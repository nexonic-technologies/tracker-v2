import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../core/theme/app_theme.dart';
import '../../core/api_config.dart';

class CachedAvatar extends StatelessWidget {
  final String? imageUrl;
  final String name;
  final double radius;
  final double? borderWidth;
  final Color? borderColor;

  const CachedAvatar({
    super.key,
    required this.name,
    this.imageUrl,
    this.radius = 20,
    this.borderWidth,
    this.borderColor,
  });

  // Generates a consistent, premium color based on user's name string
  Color _getInitialsColor(String text) {
    if (text.isEmpty) return AppColors.brandSolid;
    final int hash = text.hashCode;
    final List<Color> colors = [
      const Color(0xFF6C3DE8), // Indigo
      const Color(0xFF0EA5E9), // Sky Blue
      const Color(0xFF10B981), // Emerald
      const Color(0xFFF59E0B), // Amber
      const Color(0xFFEF4444), // Rose
      const Color(0xFFEC4899), // Pink
      const Color(0xFF8B5CF6), // Purple
    ];
    return colors[hash.abs() % colors.length];
  }

  String _getInitials(String fullName) {
    final clean = fullName.trim();
    if (clean.isEmpty) return 'U';
    final parts = clean.split(' ');
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return clean[0].toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    final initials = _getInitials(name);
    final bgCol = _getInitialsColor(name);
    final double size = radius * 2;

    // Build the fallback initials circle
    final Widget fallback = Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: bgCol.withValues(alpha: 0.12),
        shape: BoxShape.circle,
      ),
      child: Center(
        child: Text(
          initials,
          style: TextStyle(
            fontSize: radius * 0.8,
            fontWeight: FontWeight.bold,
            color: bgCol,
          ),
        ),
      ),
    );

    // If no image URL is provided, return initials
    if (imageUrl == null || imageUrl!.trim().isEmpty) {
      return _wrapWithBorder(fallback);
    }

    // Convert relative URL to full backend serving URL if needed
    final String cleanUrl = imageUrl!.startsWith('http')
        ? imageUrl!
        : '${ApiConfig.baseUrl}/files/serve/$imageUrl';

    return _wrapWithBorder(
      ClipOval(
        child: CachedNetworkImage(
          imageUrl: cleanUrl,
          width: size,
          height: size,
          fit: BoxFit.cover,
          // CRITICAL MEMORY OPTIMIZATION:
          // Downscale cache size in memory so we do not decode massive images
          memCacheWidth: (size * 2).round(),
          memCacheHeight: (size * 2).round(),
          placeholder: (context, url) => fallback,
          errorWidget: (context, url, error) => fallback,
        ),
      ),
    );
  }

  Widget _wrapWithBorder(Widget child) {
    if (borderWidth == null || borderWidth! <= 0) return child;
    return Container(
      padding: EdgeInsets.all(borderWidth!),
      decoration: BoxDecoration(
        color: borderColor ?? Colors.white,
        shape: BoxShape.circle,
      ),
      child: child,
    );
  }
}
