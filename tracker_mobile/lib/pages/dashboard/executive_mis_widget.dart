import 'package:flutter/material.dart';
import '../../services/api.dart';

/// Fetches from the same backend aggregation endpoint the web dashboard uses:
/// GET /dashboard/stats
/// Response shape:  data.pulse.{ total, present, wfh, late, absent }
/// data.stats.pendingApprovals.value
/// data.stats.openTickets.value  (or similar)
class ExecutiveMisWidget extends StatefulWidget {
  const ExecutiveMisWidget({super.key});

  @override
  State<ExecutiveMisWidget> createState() => _ExecutiveMisWidgetState();
}

class _ExecutiveMisWidgetState extends State<ExecutiveMisWidget> {
  final ApiService _api = ApiService();

  bool _isLoading = false;
  bool _hasError = false;

  // Values populated from /dashboard/stats
  int _totalEmployees = 0;
  int _presentToday = 0;
  double _attendancePct = 0;
  int _pendingApprovals = 0;
  int _criticalTickets = 0;
  int _openTasks = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _fetchStats());
  }

  Future<void> _fetchStats() async {
    // Only show this widget if user has an executive/manager capability
    // — the widget is rendered by home_tab; it fetches regardless so that
    // regular employees still see their own numbers.
    setState(() {
      _isLoading = true;
      _hasError = false;
    });

    try {
      final res = await _api.dio.get('/dashboard/stats');
      if (res.statusCode == 200 && res.data != null) {
        final data = res.data['data'];
        if (data == null) return;

        final pulse = data['pulse'] as Map? ?? {};
        final stats = data['stats'] as Map? ?? {};

        final total = (pulse['total'] as num?)?.toInt() ?? 0;
        final present =
            ((pulse['present'] as num?)?.toInt() ?? 0) +
            ((pulse['wfh'] as num?)?.toInt() ?? 0) +
            ((pulse['late'] as num?)?.toInt() ?? 0);

        // /dashboard/stats returns stats as { key: { value, ... } }
        final pendingApprovals =
            (stats['pendingApprovals']?['value'] as num?)?.toInt() ?? 0;

        // Critical tickets: prefer dedicated key, fallback to openTickets
        final criticalTickets =
            (stats['criticalTickets']?['value'] as num?)?.toInt() ??
            (stats['openTickets']?['value'] as num?)?.toInt() ??
            0;

        final openTasks =
            (stats['openTasks']?['value'] as num?)?.toInt() ??
            (data['employee']?['tasks'] as List?)?.length ??
            0;

        setState(() {
          _totalEmployees = total;
          _presentToday = present;
          _attendancePct = total > 0 ? (present / total * 100) : 0;
          _pendingApprovals = pendingApprovals;
          _criticalTickets = criticalTickets;
          _openTasks = openTasks;
        });
      }
    } catch (e) {
      debugPrint('ExecutiveMisWidget fetch error: $e');
      setState(() => _hasError = true);
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18.0),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF0F172A), Color(0xFF1E1B4B)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20.0),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0F172A).withValues(alpha: 0.3),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(
                      Icons.insights_rounded,
                      color: Color(0xFFC084FC),
                      size: 18,
                    ),
                  ),
                  const SizedBox(width: 8),
                  const Text(
                    'TEAM PULSE',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 1.0,
                    ),
                  ),
                ],
              ),
              Row(
                children: [
                  if (_isLoading)
                    const SizedBox(
                      width: 14,
                      height: 14,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white54,
                      ),
                    )
                  else
                    GestureDetector(
                      onTap: _fetchStats,
                      child: Container(
                        padding: const EdgeInsets.all(4),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: const Icon(
                          Icons.refresh_rounded,
                          color: Colors.white54,
                          size: 14,
                        ),
                      ),
                    ),
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 3,
                    ),
                    decoration: BoxDecoration(
                      color: _hasError
                          ? const Color(0xFFE11D48).withValues(alpha: 0.25)
                          : const Color(0xFF059669).withValues(alpha: 0.25),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: _hasError
                            ? const Color(0xFFE11D48).withValues(alpha: 0.4)
                            : const Color(0xFF34D399).withValues(alpha: 0.4),
                      ),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          Icons.fiber_manual_record_rounded,
                          color: _hasError
                              ? const Color(0xFFF87171)
                              : const Color(0xFF34D399),
                          size: 8,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          _hasError ? 'Offline' : 'Live',
                          style: TextStyle(
                            color: _hasError
                                ? const Color(0xFFF87171)
                                : const Color(0xFF34D399),
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ],
          ),

          const SizedBox(height: 16),

          if (_isLoading && _totalEmployees == 0)
            const Center(
              child: Padding(
                padding: EdgeInsets.symmetric(vertical: 16),
                child: CircularProgressIndicator(color: Colors.white38),
              ),
            )
          else ...[
            Row(
              children: [
                Expanded(
                  child: _MisMetricTile(
                    title: 'Today Attendance',
                    value: '${_attendancePct.toStringAsFixed(1)}%',
                    sub: '$_presentToday / $_totalEmployees',
                    isPositive: _attendancePct >= 75,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _MisMetricTile(
                    title: 'Pending Approvals',
                    value: '$_pendingApprovals',
                    sub: _pendingApprovals == 0 ? 'All clear' : 'Action needed',
                    isPositive: _pendingApprovals == 0,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _MisMetricTile(
                    title: 'Open Tickets',
                    value: '$_criticalTickets',
                    sub: _criticalTickets == 0 ? 'None open' : 'Needs review',
                    isPositive: _criticalTickets == 0,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _MisMetricTile(
                    title: 'My Open Tasks',
                    value: '$_openTasks',
                    sub: _openTasks == 0 ? 'All done' : 'In progress',
                    isPositive: _openTasks == 0,
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

class _MisMetricTile extends StatelessWidget {
  final String title;
  final String value;
  final String sub;
  final bool isPositive;

  const _MisMetricTile({
    required this.title,
    required this.value,
    required this.sub,
    required this.isPositive,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12.0),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.07),
        borderRadius: BorderRadius.circular(14.0),
        border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.65),
              fontSize: 11,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 20,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 4),
          Row(
            children: [
              Icon(
                isPositive
                    ? Icons.trending_up_rounded
                    : Icons.warning_amber_rounded,
                color: isPositive
                    ? const Color(0xFF34D399)
                    : const Color(0xFFFBBF24),
                size: 14,
              ),
              const SizedBox(width: 4),
              Expanded(
                child: Text(
                  sub,
                  style: TextStyle(
                    color: isPositive
                        ? const Color(0xFF34D399)
                        : const Color(0xFFFBBF24),
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
