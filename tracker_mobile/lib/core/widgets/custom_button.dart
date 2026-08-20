import 'package:flutter/material.dart';

class CustomButton extends StatelessWidget {
  final String text;
  final VoidCallback? onPressed;
  final bool isLoading;
  final List<Color>? gradientColors;
  final double? width;
  final double height;
  final double borderRadius;
  final IconData? icon;

  const CustomButton({
    super.key,
    required this.text,
    required this.onPressed,
    this.isLoading = false,
    this.gradientColors,
    this.width,
    this.height = 52.0,
    this.borderRadius = 8.0,
    this.icon,
  });

  @override
  Widget build(BuildContext context) {
    final themeColors =
        gradientColors ??
        const [
          Color(0xFF6C3DE8), // Brand Purple
          Color(0xFFC026D3), // Brand Fuchsia
        ];

    final isButtonEnabled = onPressed != null && !isLoading;

    return Container(
      width: width ?? double.infinity,
      height: height,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(borderRadius),
        gradient: isButtonEnabled
            ? LinearGradient(
                colors: themeColors,
                begin: Alignment.centerLeft,
                end: Alignment.centerRight,
              )
            : null,
        color: isButtonEnabled
            ? null
            : Theme.of(context).disabledColor.withValues(alpha: 0.12),
        boxShadow: isButtonEnabled
            ? [
                BoxShadow(
                  color: themeColors[0].withValues(alpha: 0.3),
                  blurRadius: 8,
                  offset: const Offset(0, 4),
                ),
              ]
            : null,
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: isButtonEnabled ? onPressed : null,
          borderRadius: BorderRadius.circular(borderRadius),
          child: Center(
            child: isLoading
                ? const SizedBox(
                    width: 24,
                    height: 24,
                    child: CircularProgressIndicator(
                      strokeWidth: 2.5,
                      valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                    ),
                  )
                : Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      if (icon != null) ...[
                        Icon(icon, color: Colors.white, size: 20),
                        const SizedBox(width: 8),
                      ],
                      Text(
                        text,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ],
                  ),
          ),
        ),
      ),
    );
  }
}
