import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/navigation_provider.dart';
import '../theme/app_theme.dart';

class CustomAppBar extends StatelessWidget implements PreferredSizeWidget {
  const CustomAppBar({super.key});

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);

  @override
  Widget build(BuildContext context) {
    final nav = context.watch<NavigationProvider>();
    final auth = context.watch<AuthProvider>();
    final user = auth.user;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return AppBar(
      backgroundColor: isDark ? AppColors.darkSurface0 : AppColors.surface0,
      elevation: 0,
      scrolledUnderElevation: 1,
      shadowColor: AppColors.brandSolid.withValues(alpha: 0.08),
      surfaceTintColor: Colors.transparent,
      leading: Builder(
        builder: (ctx) => IconButton(
          icon: Icon(
            Icons.menu_rounded,
            color: isDark ? AppColors.darkInkMuted : AppColors.inkMuted,
          ),
          onPressed: () => Scaffold.of(ctx).openDrawer(),
        ),
      ),
      title: Text(
        nav.pageTitle,
        style: TextStyle(
          fontSize: 17,
          fontWeight: FontWeight.w600,
          color: isDark ? AppColors.darkInk : AppColors.ink,
        ),
      ),
      actions: [
        // Theme toggle
        IconButton(
          icon: Icon(
            nav.isDark ? Icons.light_mode_rounded : Icons.dark_mode_rounded,
            color: isDark ? AppColors.darkInkMuted : AppColors.inkMuted,
            size: 20,
          ),
          onPressed: () => context.read<NavigationProvider>().toggleTheme(),
          tooltip: nav.isDark ? 'Light mode' : 'Dark mode',
        ),
        
        // Notification bell with red badge dot
        Stack(
          alignment: Alignment.center,
          children: [
            IconButton(
              icon: Icon(
                Icons.notifications_none_rounded,
                color: isDark ? AppColors.darkInkMuted : AppColors.inkMuted,
                size: 22,
              ),
              onPressed: () {
                // Future notification drawer trigger
              },
            ),
            Positioned(
              top: 12,
              right: 12,
              child: Container(
                width: 6,
                height: 6,
                decoration: const BoxDecoration(
                  color: AppColors.error,
                  shape: BoxShape.circle,
                ),
              ),
            ),
          ],
        ),

        const SizedBox(width: 4),

        // User Avatar
        if (user != null) ...[
          CircleAvatar(
            radius: 16,
            backgroundColor: isDark ? const Color(0xFF1E3A8A) : const Color(0xFFDBEAFE),
            child: Text(
              user.name.trim().isNotEmpty 
                  ? user.name.trim().split(' ').map((e) => e[0]).take(2).join('').toUpperCase()
                  : 'EM',
              style: TextStyle(
                color: isDark ? const Color(0xFF93C5FD) : const Color(0xFF1E40AF),
                fontWeight: FontWeight.bold,
                fontSize: 12,
              ),
            ),
          ),
          const SizedBox(width: 12),
        ],
      ],
    );
  }
}
