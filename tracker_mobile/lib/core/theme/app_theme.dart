import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

// ─── DESIGN.md Color Tokens ──────────────────────────────────────────────────

class AppColors {
  // Brand / Global Chrome
  static const brandFrom      = Color(0xFF6C3DE8);
  static const brandTo        = Color(0xFFC026D3);
  static const brandMid       = Color(0xFF8B5CF6);
  static const brandSolid     = Color(0xFF6C3DE8);
  static const brandTeal      = Color(0xFF0EA5E9);
  static const brandTealLight = Color(0xFFE0F2FE);

  // Canvas & Surfaces — Light
  static const canvas         = Color(0xFFF7F8FC);
  static const surface0       = Color(0xFFFFFFFF);
  static const surface1       = Color(0xFFF0F2FA);
  static const surface2       = Color(0xFFE8EAF6);
  static const surfaceChip    = Color(0xFFEEF0FB);

  // Canvas & Surfaces — Dark
  static const darkCanvas     = Color(0xFF0F1117);
  static const darkSurface0   = Color(0xFF1A1D2E);
  static const darkSurface1   = Color(0xFF22263A);
  static const darkSurface2   = Color(0xFF2A2F48);
  static const darkSurfaceChip = Color(0xFF252840);

  // Ink (text) — Light
  static const ink            = Color(0xFF1A1D2E);
  static const inkMuted       = Color(0xFF4B5068);
  static const inkSubtle      = Color(0xFF8890A8);
  static const inkTertiary    = Color(0xFFB4BACC);
  static const onBrand        = Color(0xFFFFFFFF);

  // Ink (text) — Dark
  static const darkInk        = Color(0xFFF0F2FA);
  static const darkInkMuted   = Color(0xFFA0A8C0);
  static const darkInkSubtle  = Color(0xFF5A6080);

  // Borders & Dividers — Light
  static const border         = Color(0xFFE2E5F0);
  static const borderSoft     = Color(0xFFECEEF7);
  static const borderFocus    = Color(0xFF8B5CF6);

  // Borders — Dark
  static const darkBorder     = Color(0xFF2E3350);
  static const darkBorderSoft = Color(0xFF252840);

  // HR Tracker (Attendance) — Violet family
  static const hrAccent       = Color(0xFF7C3AED);
  static const hrAccentLight  = Color(0xFFEDE9FE);
  static const hrAccentMid    = Color(0xFFA78BFA);

  // Project — Sky Blue
  static const projectAccent     = Color(0xFF0EA5E9);
  static const projectAccentLight= Color(0xFFE0F2FE);

  // Semantic
  static const success        = Color(0xFF10B981);
  static const successLight   = Color(0xFFD1FAE5);
  static const warning        = Color(0xFFF59E0B);
  static const warningLight   = Color(0xFFFEF3C7);
  static const error          = Color(0xFFEF4444);
  static const errorLight     = Color(0xFFFEE2E2);
  static const info           = Color(0xFF3B82F6);
  static const infoLight      = Color(0xFFDBEAFE);

  // Status chips
  static const statusPresentBg   = Color(0xFFD1FAE5);
  static const statusPresentText = Color(0xFF065F46);
  static const statusAbsentBg    = Color(0xFFFEE2E2);
  static const statusAbsentText  = Color(0xFFB91C1C);
  static const statusPendingBg   = Color(0xFFFEF3C7);
  static const statusPendingText = Color(0xFF92400E);
  static const statusClosedBg    = Color(0xFFF1F5F9);
  static const statusClosedText  = Color(0xFF475569);
}

// ─── Radius Tokens ───────────────────────────────────────────────────────────

class AppRadius {
  static const double xs   = 4;
  static const double sm   = 6;
  static const double md   = 8;
  static const double lg   = 12;
  static const double xl   = 16;
  static const double xxl  = 20;
  static const double pill = 9999;
}

// ─── Spacing Tokens ──────────────────────────────────────────────────────────

class AppSpacing {
  static const double xxs     = 2;
  static const double xs      = 4;
  static const double sm      = 8;
  static const double md      = 12;
  static const double lg      = 16;
  static const double xl      = 24;
  static const double xxl     = 32;
  static const double section = 48;
}

// ─── AppTheme ─────────────────────────────────────────────────────────────────

class AppTheme {

  static TextTheme _buildTextTheme(Color primary, Color secondary, Color tertiary) {
    final inter = GoogleFonts.interTextTheme();
    return inter.copyWith(
      displayLarge: inter.displayLarge?.copyWith(
        fontSize: 48, fontWeight: FontWeight.w700,
        letterSpacing: -1.2, color: primary,
      ),
      displayMedium: inter.displayMedium?.copyWith(
        fontSize: 36, fontWeight: FontWeight.w700,
        letterSpacing: -0.8, color: primary,
      ),
      headlineLarge: inter.headlineLarge?.copyWith(
        fontSize: 28, fontWeight: FontWeight.w600,
        letterSpacing: -0.4, color: primary,
      ),
      headlineMedium: inter.headlineMedium?.copyWith(
        fontSize: 22, fontWeight: FontWeight.w600,
        letterSpacing: -0.3, color: primary,
      ),
      headlineSmall: inter.headlineSmall?.copyWith(
        fontSize: 18, fontWeight: FontWeight.w600,
        letterSpacing: -0.2, color: primary,
      ),
      titleLarge: inter.titleLarge?.copyWith(
        fontSize: 15, fontWeight: FontWeight.w600,
        letterSpacing: 0, color: primary,
      ),
      bodyLarge: inter.bodyLarge?.copyWith(
        fontSize: 16, fontWeight: FontWeight.w400,
        letterSpacing: 0, color: primary,
      ),
      bodyMedium: inter.bodyMedium?.copyWith(
        fontSize: 14, fontWeight: FontWeight.w400,
        letterSpacing: 0, color: secondary,
      ),
      bodySmall: inter.bodySmall?.copyWith(
        fontSize: 13, fontWeight: FontWeight.w400,
        letterSpacing: 0, color: tertiary,
      ),
      labelLarge: inter.labelLarge?.copyWith(
        fontSize: 14, fontWeight: FontWeight.w500,
        letterSpacing: 0, color: primary,
      ),
      labelSmall: inter.labelSmall?.copyWith(
        fontSize: 11, fontWeight: FontWeight.w600,
        letterSpacing: 0.4, color: tertiary,
      ),
    );
  }

  static ThemeData get light {
    final textTheme = _buildTextTheme(AppColors.ink, AppColors.inkMuted, AppColors.inkSubtle);
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      colorScheme: ColorScheme.light(
        primary: AppColors.brandSolid,
        secondary: AppColors.brandMid,
        surface: AppColors.surface0,
        onPrimary: AppColors.onBrand,
        onSecondary: AppColors.onBrand,
        onSurface: AppColors.ink,
        outline: AppColors.border,
        surfaceContainerHighest: AppColors.surface1,
      ),
      scaffoldBackgroundColor: AppColors.canvas,
      textTheme: textTheme,
      appBarTheme: AppBarTheme(
        backgroundColor: AppColors.surface0,
        foregroundColor: AppColors.ink,
        elevation: 0,
        shadowColor: Colors.transparent,
        surfaceTintColor: Colors.transparent,
        titleTextStyle: textTheme.headlineSmall,
        iconTheme: const IconThemeData(color: AppColors.inkMuted),
      ),
      drawerTheme: const DrawerThemeData(
        backgroundColor: AppColors.surface0,
        elevation: 8,
        shadowColor: Color(0x1A6C3DE8),
        width: 280,
      ),
      cardTheme: CardThemeData(
        color: AppColors.surface0,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.lg),
          side: const BorderSide(color: AppColors.border, width: 1),
        ),
        margin: EdgeInsets.zero,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.surface0,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.md),
          borderSide: const BorderSide(color: AppColors.border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.md),
          borderSide: const BorderSide(color: AppColors.border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.md),
          borderSide: const BorderSide(color: AppColors.borderFocus, width: 1.5),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        hintStyle: textTheme.bodyMedium?.copyWith(color: AppColors.inkSubtle),
        labelStyle: textTheme.labelSmall?.copyWith(color: AppColors.inkMuted),
      ),
      dividerTheme: const DividerThemeData(
        color: AppColors.borderSoft,
        thickness: 1,
        space: 1,
      ),
      chipTheme: ChipThemeData(
        backgroundColor: AppColors.surfaceChip,
        labelStyle: textTheme.bodySmall?.copyWith(fontSize: 12, fontWeight: FontWeight.w600),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.pill)),
        side: BorderSide.none,
      ),
    );
  }

  static ThemeData get dark {
    final textTheme = _buildTextTheme(AppColors.darkInk, AppColors.darkInkMuted, AppColors.darkInkSubtle);
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      colorScheme: ColorScheme.dark(
        primary: AppColors.brandMid,
        secondary: AppColors.brandFrom,
        surface: AppColors.darkSurface0,
        onPrimary: AppColors.onBrand,
        onSecondary: AppColors.onBrand,
        onSurface: AppColors.darkInk,
        outline: AppColors.darkBorder,
        surfaceContainerHighest: AppColors.darkSurface1,
      ),
      scaffoldBackgroundColor: AppColors.darkCanvas,
      textTheme: textTheme,
      appBarTheme: AppBarTheme(
        backgroundColor: AppColors.darkSurface0,
        foregroundColor: AppColors.darkInk,
        elevation: 0,
        shadowColor: Colors.transparent,
        surfaceTintColor: Colors.transparent,
        titleTextStyle: textTheme.headlineSmall,
        iconTheme: const IconThemeData(color: AppColors.darkInkMuted),
      ),
      drawerTheme: const DrawerThemeData(
        backgroundColor: AppColors.darkSurface0,
        elevation: 8,
        shadowColor: Color(0x336C3DE8),
        width: 280,
      ),
      cardTheme: CardThemeData(
        color: AppColors.darkSurface0,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.lg),
          side: const BorderSide(color: AppColors.darkBorder, width: 1),
        ),
        margin: EdgeInsets.zero,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.darkSurface1,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.md),
          borderSide: const BorderSide(color: AppColors.darkBorder),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.md),
          borderSide: const BorderSide(color: AppColors.darkBorder),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.md),
          borderSide: const BorderSide(color: AppColors.borderFocus, width: 1.5),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        hintStyle: textTheme.bodyMedium?.copyWith(color: AppColors.darkInkSubtle),
        labelStyle: textTheme.labelSmall?.copyWith(color: AppColors.darkInkMuted),
      ),
      dividerTheme: const DividerThemeData(
        color: AppColors.darkBorderSoft,
        thickness: 1,
        space: 1,
      ),
      chipTheme: ChipThemeData(
        backgroundColor: AppColors.darkSurface2,
        labelStyle: textTheme.bodySmall?.copyWith(fontSize: 12, fontWeight: FontWeight.w600),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.pill)),
        side: BorderSide.none,
      ),
    );
  }
}
