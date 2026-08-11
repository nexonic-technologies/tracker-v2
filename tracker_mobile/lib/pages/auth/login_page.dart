import 'package:flutter/material.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/custom_button.dart';
import '../../core/widgets/custom_text_field.dart';
import '../../providers/auth_provider.dart';
import 'signup_page.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _rememberMe = false;
  bool _isGoogleLoading = false;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _handleLogin() async {
    if (_formKey.currentState!.validate()) {
      FocusScope.of(context).unfocus();
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      await authProvider.login(
        _emailController.text.trim(),
        _passwordController.text,
      );
    }
  }

  Future<void> _handleGoogleSignIn() async {
    setState(() => _isGoogleLoading = true);
    try {
      final googleSignIn = GoogleSignIn(
        scopes: ['email', 'profile'],
      );

      final googleUser = await googleSignIn.signIn();
      if (googleUser == null) {
        // User cancelled the sign-in flow
        setState(() => _isGoogleLoading = false);
        return;
      }

      final googleAuth = await googleUser.authentication;
      final idToken = googleAuth.idToken;

      if (idToken == null || idToken.isEmpty) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Could not retrieve Google ID Token. Please try again.'),
              backgroundColor: AppColors.error,
            ),
          );
        }
        setState(() => _isGoogleLoading = false);
        return;
      }

      if (mounted) {
        final authProvider = Provider.of<AuthProvider>(context, listen: false);
        await authProvider.loginWithGoogle(idToken);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Google Sign-In error: ${e.toString()}'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isGoogleLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    final authProvider = Provider.of<AuthProvider>(context);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? AppColors.darkCanvas : const Color(0xFFF1F5F9),
      body: GestureDetector(
        onTap: () => FocusScope.of(context).unfocus(),
        child: Stack(
          children: [
            // Ambient Top Gradient Header Background
            Positioned(
              top: 0,
              left: 0,
              right: 0,
              height: size.height * 0.38,
              child: Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      Color(0xFF0F172A), // Deep Slate Navy
                      Color(0xFF1E1B4B), // Midnight Indigo
                      Color(0xFF4C1D95), // Deep Violet
                    ],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
                child: SafeArea(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 20.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        const SizedBox(height: 12),
                        // WorkHub Logo Badge
                        Container(
                          width: 56,
                          height: 56,
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              colors: [Color(0xFF7C3AED), Color(0xFFC084FC)],
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                            ),
                            borderRadius: BorderRadius.circular(16.0),
                            boxShadow: [
                              BoxShadow(
                                color: const Color(0xFF7C3AED).withValues(alpha: 0.4),
                                blurRadius: 16,
                                offset: const Offset(0, 6),
                              ),
                            ],
                          ),
                          child: const Center(
                            child: Text(
                              'W',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 32,
                                fontWeight: FontWeight.w900,
                                fontFamily: 'Inter',
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 12),
                        const Text(
                          'WorkHub',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 26,
                            fontWeight: FontWeight.w800,
                            letterSpacing: -0.5,
                            fontFamily: 'Inter',
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Unified Enterprise Operations & Workflow',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.75),
                            fontSize: 13,
                            fontWeight: FontWeight.w400,
                            fontFamily: 'Inter',
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),

            // Scrollable Content area with Floating Glass Card
            SafeArea(
              child: SingleChildScrollView(
                physics: const BouncingScrollPhysics(),
                padding: const EdgeInsets.symmetric(horizontal: 20.0),
                child: Column(
                  children: [
                    SizedBox(height: size.height * 0.22),

                    // Floating Glassmorphism Card
                    Container(
                      padding: const EdgeInsets.all(24.0),
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.darkSurface0 : Colors.white,
                        borderRadius: BorderRadius.circular(24.0),
                        border: Border.all(
                          color: isDark
                              ? Colors.white.withValues(alpha: 0.08)
                              : Colors.black.withValues(alpha: 0.05),
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: isDark ? 0.4 : 0.08),
                            blurRadius: 32,
                            spreadRadius: 0,
                            offset: const Offset(0, 12),
                          ),
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          // Card Header
                          Text(
                            'Welcome Back',
                            style: TextStyle(
                              color: isDark ? Colors.white : const Color(0xFF0F172A),
                              fontSize: 22,
                              fontWeight: FontWeight.w700,
                              fontFamily: 'Inter',
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Sign in to access your WorkHub workspace',
                            style: TextStyle(
                              color: isDark ? AppColors.darkInkSubtle : AppColors.inkSubtle,
                              fontSize: 13,
                              fontFamily: 'Inter',
                            ),
                          ),
                          const SizedBox(height: 24),

                          // Error Banner
                          if (authProvider.errorMessage != null) ...[
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 14.0,
                                vertical: 10.0,
                              ),
                              decoration: BoxDecoration(
                                color: const Color(0xFFFEE2E2),
                                borderRadius: BorderRadius.circular(12.0),
                                border: Border.all(
                                  color: const Color(0xFFEF4444),
                                  width: 1.0,
                                ),
                              ),
                              child: Row(
                                children: [
                                  const Icon(
                                    Icons.error_outline_rounded,
                                    color: Color(0xFFEF4444),
                                    size: 20,
                                  ),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: Text(
                                      authProvider.errorMessage!,
                                      style: const TextStyle(
                                        color: Color(0xFF991B1B),
                                        fontSize: 13,
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 20),
                          ],

                          // Form
                          Form(
                            key: _formKey,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                CustomTextField(
                                  controller: _emailController,
                                  labelText: 'Work Email',
                                  hintText: 'name@company.com',
                                  prefixIcon: Icons.mail_outline_rounded,
                                  keyboardType: TextInputType.emailAddress,
                                  validator: (value) {
                                    if (value == null || value.trim().isEmpty) {
                                      return 'Email is required';
                                    }
                                    final emailRegex = RegExp(
                                      r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$',
                                    );
                                    if (!emailRegex.hasMatch(value.trim())) {
                                      return 'Please enter a valid work email';
                                    }
                                    return null;
                                  },
                                ),
                                const SizedBox(height: 16),

                                CustomTextField(
                                  controller: _passwordController,
                                  labelText: 'Password',
                                  hintText: '••••••••',
                                  isPassword: true,
                                  prefixIcon: Icons.lock_outline_rounded,
                                  textInputAction: TextInputAction.done,
                                  onFieldSubmitted: (_) => _handleLogin(),
                                  validator: (value) {
                                    if (value == null || value.isEmpty) {
                                      return 'Password is required';
                                    }
                                    if (value.length < 6) {
                                      return 'Password must be at least 6 characters';
                                    }
                                    return null;
                                  },
                                ),
                                const SizedBox(height: 10),

                                // Remember Me & Forgot Password Row
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Row(
                                      children: [
                                        SizedBox(
                                          width: 24,
                                          height: 24,
                                          child: Checkbox(
                                            value: _rememberMe,
                                            activeColor: const Color(0xFF7C3AED),
                                            shape: RoundedRectangleBorder(
                                              borderRadius: BorderRadius.circular(4),
                                            ),
                                            onChanged: (val) {
                                              setState(() => _rememberMe = val ?? false);
                                            },
                                          ),
                                        ),
                                        const SizedBox(width: 8),
                                        Text(
                                          'Remember me',
                                          style: TextStyle(
                                            fontSize: 13,
                                            color: isDark ? AppColors.darkInkSubtle : AppColors.inkMuted,
                                            fontWeight: FontWeight.w500,
                                          ),
                                        ),
                                      ],
                                    ),
                                    TextButton(
                                      onPressed: () {
                                        ScaffoldMessenger.of(context).showSnackBar(
                                          const SnackBar(
                                            content: Text('Password reset instructions sent to email if account exists.'),
                                          ),
                                        );
                                      },
                                      style: TextButton.styleFrom(
                                        padding: EdgeInsets.zero,
                                        minimumSize: const Size(50, 30),
                                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                      ),
                                      child: const Text(
                                        'Forgot password?',
                                        style: TextStyle(
                                          color: Color(0xFF7C3AED),
                                          fontWeight: FontWeight.w600,
                                          fontSize: 13,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 20),

                                // Sign In Button
                                CustomButton(
                                  text: 'Sign In',
                                  icon: Icons.arrow_forward_rounded,
                                  isLoading: authProvider.isLoading,
                                  onPressed: _handleLogin,
                                ),
                              ],
                            ),
                          ),

                          const SizedBox(height: 24),

                          // Divider "OR CONTINUE WITH"
                          Row(
                            children: [
                              Expanded(
                                child: Divider(
                                  color: isDark ? AppColors.darkBorder : AppColors.border,
                                  thickness: 1,
                                ),
                              ),
                              Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 12.0),
                                child: Text(
                                  'OR CONTINUE WITH',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w700,
                                    letterSpacing: 0.8,
                                    color: isDark ? AppColors.darkInkSubtle : AppColors.inkTertiary,
                                  ),
                                ),
                              ),
                              Expanded(
                                child: Divider(
                                  color: isDark ? AppColors.darkBorder : AppColors.border,
                                  thickness: 1,
                                ),
                              ),
                            ],
                          ),

                          const SizedBox(height: 20),

                          // Google Sign-In SSO Button
                          OutlinedButton(
                            onPressed: (_isGoogleLoading || authProvider.isLoading)
                                ? null
                                : _handleGoogleSignIn,
                            style: OutlinedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
                              side: BorderSide(
                                color: isDark ? AppColors.darkBorder : const Color(0xFFCBD5E1),
                                width: 1.2,
                              ),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12.0),
                              ),
                              backgroundColor: isDark ? const Color(0xFF1E293B) : Colors.white,
                              elevation: 0,
                            ),
                            child: _isGoogleLoading
                                ? const SizedBox(
                                    width: 20,
                                    height: 20,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF4285F4)),
                                    ),
                                  )
                                : Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      const _GoogleIconWidget(),
                                      const SizedBox(width: 12),
                                      Text(
                                        'Sign in with Google',
                                        style: TextStyle(
                                          fontSize: 14,
                                          fontWeight: FontWeight.w600,
                                          color: isDark ? Colors.white : const Color(0xFF334155),
                                          fontFamily: 'Inter',
                                        ),
                                      ),
                                    ],
                                  ),
                          ),

                          const SizedBox(height: 24),

                          // Redirect to Sign Up Link
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                "Don't have an account? ",
                                style: TextStyle(
                                  color: isDark ? AppColors.darkInkSubtle : AppColors.inkSubtle,
                                  fontSize: 14,
                                ),
                              ),
                              GestureDetector(
                                onTap: () {
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (context) => const SignupPage(),
                                    ),
                                  );
                                },
                                child: const Text(
                                  'Sign Up',
                                  style: TextStyle(
                                    color: Color(0xFF7C3AED),
                                    fontWeight: FontWeight.bold,
                                    fontSize: 14,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 32),
                    // Footer
                    Text(
                      '© 2026 WorkHub ERP Platform • All Rights Reserved',
                      style: TextStyle(
                        color: isDark
                            ? AppColors.darkInkSubtle.withValues(alpha: 0.6)
                            : AppColors.inkSubtle,
                        fontSize: 12,
                        fontFamily: 'Inter',
                      ),
                    ),
                    const SizedBox(height: 24),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Google Brand Mark Graphic ───────────────────────────────────────────────
class _GoogleIconWidget extends StatelessWidget {
  const _GoogleIconWidget();

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      size: const Size(20, 20),
      painter: _GoogleIconPainter(),
    );
  }
}

class _GoogleIconPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final double w = size.width;
    final double h = size.height;

    // Blue Path
    final bluePaint = Paint()..color = const Color(0xFF4285F4);
    final bluePath = Path()
      ..moveTo(w * 0.94, h * 0.51)
      ..cubicTo(w * 0.94, h * 0.48, w * 0.93, h * 0.45, w * 0.93, h * 0.42)
      ..lineTo(w * 0.5, h * 0.42)
      ..lineTo(w * 0.5, h * 0.60)
      ..lineTo(w * 0.75, h * 0.60)
      ..cubicTo(w * 0.74, h * 0.66, w * 0.70, h * 0.71, w * 0.65, h * 0.74)
      ..lineTo(w * 0.65, h * 0.86)
      ..lineTo(w * 0.80, h * 0.86)
      ..cubicTo(w * 0.89, h * 0.78, w * 0.94, h * 0.66, w * 0.94, h * 0.51)
      ..close();
    canvas.drawPath(bluePath, bluePaint);

    // Green Path
    final greenPaint = Paint()..color = const Color(0xFF34A853);
    final greenPath = Path()
      ..moveTo(w * 0.5, h * 0.96)
      ..cubicTo(w * 0.62, h * 0.96, w * 0.73, h * 0.92, w * 0.80, h * 0.86)
      ..lineTo(w * 0.65, h * 0.74)
      ..cubicTo(w * 0.61, h * 0.77, w * 0.56, h * 0.79, w * 0.5, h * 0.79)
      ..cubicTo(w * 0.38, h * 0.79, w * 0.28, h * 0.71, w * 0.24, h * 0.60)
      ..lineTo(w * 0.09, h * 0.60)
      ..lineTo(w * 0.09, h * 0.72)
      ..cubicTo(w * 0.17, h * 0.87, w * 0.32, h * 0.96, w * 0.5, h * 0.96)
      ..close();
    canvas.drawPath(greenPath, greenPaint);

    // Yellow Path
    final yellowPaint = Paint()..color = const Color(0xFBBC05FF);
    final yellowPath = Path()
      ..moveTo(w * 0.24, h * 0.60)
      ..cubicTo(w * 0.23, h * 0.57, w * 0.23, h * 0.53, w * 0.23, h * 0.50)
      ..cubicTo(w * 0.23, h * 0.47, w * 0.23, h * 0.43, w * 0.24, h * 0.40)
      ..lineTo(w * 0.24, h * 0.28)
      ..lineTo(w * 0.09, h * 0.28)
      ..cubicTo(w * 0.06, h * 0.35, w * 0.04, h * 0.42, w * 0.04, h * 0.50)
      ..cubicTo(w * 0.04, h * 0.58, w * 0.06, h * 0.65, w * 0.09, h * 0.72)
      ..lineTo(w * 0.24, h * 0.60)
      ..close();
    canvas.drawPath(yellowPath, yellowPaint);

    // Red Path
    final redPaint = Paint()..color = const Color(0xFFEA4335);
    final redPath = Path()
      ..moveTo(w * 0.5, h * 0.22)
      ..cubicTo(w * 0.57, h * 0.22, w * 0.63, h * 0.25, w * 0.68, h * 0.29)
      ..lineTo(w * 0.81, h * 0.16)
      ..cubicTo(w * 0.73, h * 0.09, w * 0.62, h * 0.04, w * 0.5, h * 0.04)
      ..cubicTo(w * 0.32, h * 0.04, w * 0.17, h * 0.13, w * 0.09, h * 0.28)
      ..lineTo(w * 0.24, h * 0.40)
      ..cubicTo(w * 0.28, h * 0.29, w * 0.38, h * 0.22, w * 0.5, h * 0.22)
      ..close();
    canvas.drawPath(redPath, redPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

