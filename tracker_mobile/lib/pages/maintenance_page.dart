import 'dart:async';
import 'package:flutter/material.dart';
import '../services/api.dart';

class MaintenancePage extends StatefulWidget {
  final String message;
  final DateTime? scheduledEnd;

  const MaintenancePage({super.key, required this.message, this.scheduledEnd});

  @override
  State<MaintenancePage> createState() => _MaintenancePageState();
}

class _MaintenancePageState extends State<MaintenancePage> {
  bool _isChecking = false;
  String? _statusMessage;
  Timer? _timer;
  Duration? _timeLeft;

  @override
  void initState() {
    super.initState();
    _statusMessage = widget.message;
    _initCountdown();
  }

  void _initCountdown() {
    if (widget.scheduledEnd == null) return;
    _timer?.cancel();

    _timeLeft = widget.scheduledEnd!.difference(DateTime.now());
    if (_timeLeft!.isNegative) return;

    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) return;
      setState(() {
        _timeLeft = widget.scheduledEnd!.difference(DateTime.now());
        if (_timeLeft!.isNegative) {
          _timer?.cancel();
          _timeLeft = null;
        }
      });
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _checkStatus() async {
    setState(() {
      _isChecking = true;
    });

    try {
      final dio = ApiService().dio;
      // Fetch public maintenance endpoint
      final response = await dio.get('/config/maintenance');
      final data = response.data;

      if (data != null && data['active'] == false) {
        // Maintenance is over! Exit maintenance page and return to splash/login
        if (mounted) {
          Navigator.pushNamedAndRemoveUntil(context, '/', (route) => false);
        }
      } else {
        if (mounted) {
          setState(() {
            _statusMessage = data?['message'] ?? widget.message;
            _isChecking = false;
          });
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text(
                'System is still undergoing maintenance. Please try again soon.',
              ),
              behavior: SnackBarBehavior.floating,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isChecking = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Server is unreachable. Please verify your connection.',
            ),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  String _formatDuration(Duration d) {
    final h = d.inHours;
    final m = d.inMinutes.remainder(60).toString().padLeft(2, '0');
    final s = d.inSeconds.remainder(60).toString().padLeft(2, '0');
    return h > 0 ? '$h:$m:$s' : '$m:$s';
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark
          ? const Color(0xFF0F111A)
          : const Color(0xFFF7F8FC),
      body: Stack(
        children: [
          // Elegant Shimmer Top Line
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: Container(
              height: 4,
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    Color(0xFF6C3DE8),
                    Color(0xFF8B5CF6),
                    Color(0xFFC026D3),
                  ],
                ),
              ),
            ),
          ),

          Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24.0),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // Logo/Icon Card
                  Container(
                    width: 80,
                    height: 80,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFF6C3DE8), Color(0xFFC026D3)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF6C3DE8).withValues(alpha: 0.3),
                          blurRadius: 20,
                          offset: const Offset(0, 8),
                        ),
                      ],
                    ),
                    child: const Icon(
                      Icons.construction_rounded,
                      color: Colors.white,
                      size: 36,
                    ),
                  ),
                  const SizedBox(height: 28),

                  // Title
                  Text(
                    "We'll be right back",
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                      color: isDark
                          ? const Color(0xFFF0F1F5)
                          : const Color(0xFF1A1D2E),
                      letterSpacing: -0.5,
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Description
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 12.0),
                    child: Text(
                      _statusMessage ??
                          'System is currently undergoing scheduled maintenance.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 14,
                        color: isDark
                            ? const Color(0xFFB4BACC)
                            : const Color(0xFF4B5068),
                        height: 1.5,
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Countdown widget
                  if (_timeLeft != null)
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 10,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xFF0EA5E9).withValues(alpha: 0.12),
                        border: Border.all(
                          color: const Color(0xFF0EA5E9).withValues(alpha: 0.3),
                        ),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(
                            Icons.timer_outlined,
                            size: 14,
                            color: Color(0xFF0EA5E9),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            "Back in ${_formatDuration(_timeLeft!)}",
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF0EA5E9),
                            ),
                          ),
                        ],
                      ),
                    ),
                  const SizedBox(height: 32),

                  // Try Again Button
                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: ElevatedButton(
                      onPressed: _isChecking ? null : _checkStatus,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF6C3DE8),
                        foregroundColor: Colors.white,
                        disabledBackgroundColor: const Color(
                          0xFF6C3DE8,
                        ).withValues(alpha: 0.5),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        elevation: 0,
                      ),
                      child: _isChecking
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                valueColor: AlwaysStoppedAnimation<Color>(
                                  Colors.white,
                                ),
                              ),
                            )
                          : const Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.refresh_rounded, size: 18),
                                SizedBox(width: 8),
                                Text(
                                  "Try Again",
                                  style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
