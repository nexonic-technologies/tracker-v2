import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../services/api.dart';
import '../../services/cache_manager.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/shimmer_loading.dart';

class PayrollPage extends StatefulWidget {
  const PayrollPage({super.key});

  @override
  State<PayrollPage> createState() => _PayrollPageState();
}

class _PayrollPageState extends State<PayrollPage> {
  final ApiService _api = ApiService();
  bool _loading = true;
  List<Map<String, dynamic>> _payslips = [];

  final List<String> _months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  @override
  void initState() {
    super.initState();
    _loadCacheAndFetch();
  }

  Future<void> _loadCacheAndFetch() async {
    final cached = await LocalCache().get('cached_payslips');
    if (cached is List && cached.isNotEmpty && mounted) {
      setState(() {
        _payslips = List<Map<String, dynamic>>.from(cached);
      });
      _fetchPayslips(isSilent: true);
    } else {
      _fetchPayslips(isSilent: false);
    }
  }

  Future<void> _fetchPayslips({bool isSilent = false}) async {
    if (!mounted) return;
    if (!isSilent) setState(() => _loading = true);

    try {
      final userId = context.read<AuthProvider>().user?.id;
      final query = {
        'limit': 100,
        'sort': {'year': -1, 'month': -1},
        'filter': {
          'employeeId': userId,
          'status': {
            '\$in': ['Processed', 'Approved', 'Paid'],
          }, // Only show verified payslips
        },
      };

      final response = await _api.readModel('payrolls', query: query);
      if (response.statusCode == 200 && response.data != null) {
        final List<dynamic> data = response.data['data'] ?? [];
        if (mounted) {
          setState(() {
            _payslips = List<Map<String, dynamic>>.from(data);
          });
          LocalCache().set('cached_payslips', data);
        }
      }
    } catch (e) {
      debugPrint("Error loading mobile payslips: $e");
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? AppColors.darkCanvas : AppColors.canvas,
      body: _loading
          ? ShimmerLoading.list()
          : _payslips.isEmpty
          ? _buildEmptyState(isDark)
          : RefreshIndicator(
              onRefresh: _fetchPayslips,
              color: AppColors.brandSolid,
              child: ListView.builder(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 12,
                ),
                itemCount: _payslips.length,
                itemBuilder: (context, idx) {
                  final pay = _payslips[idx];
                  return _buildPayslipCard(pay, isDark);
                },
              ),
            ),
    );
  }

  Widget _buildPayslipCard(Map<String, dynamic> pay, bool isDark) {
    final monthIdx = (pay['month'] as int? ?? 1) - 1;
    final monthStr = monthIdx >= 0 && monthIdx < 12
        ? _months[monthIdx]
        : 'Unknown';
    final year = pay['year']?.toString() ?? '';
    final netSalary = pay['netSalary']?.toString() ?? '0';
    final status = pay['status'] ?? 'Draft';

    Color statusColor = AppColors.brandSolid;
    if (status == 'Paid') statusColor = Colors.green;
    if (status == 'Approved') statusColor = Colors.blue;

    return Card(
      elevation: 0,
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: isDark ? AppColors.darkBorder : AppColors.border,
        ),
      ),
      color: isDark ? AppColors.darkSurface0 : Colors.white,
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => _showPayslipDetails(pay, isDark),
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              // Info side
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '$monthStr $year',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: isDark ? AppColors.darkInk : AppColors.ink,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Text(
                        'Net Pay: ₹$netSalary',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: isDark
                              ? AppColors.darkInkSubtle
                              : AppColors.inkSubtle,
                        ),
                      ),
                    ],
                  ),
                ],
              ),

              // Status tag side
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: statusColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  status,
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    color: statusColor,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState(bool isDark) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.receipt_long_rounded,
            size: 48,
            color: isDark ? AppColors.darkInkSubtle : AppColors.inkSubtle,
          ),
          const SizedBox(height: 12),
          Text(
            'No payslips released yet.',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.bold,
              color: isDark ? AppColors.darkInkSubtle : AppColors.inkSubtle,
            ),
          ),
        ],
      ),
    );
  }

  void _showPayslipDetails(Map<String, dynamic> pay, bool isDark) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: isDark ? AppColors.darkSurface0 : Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        final monthIdx = (pay['month'] as int? ?? 1) - 1;
        final monthStr = monthIdx >= 0 && monthIdx < 12
            ? _months[monthIdx]
            : 'Unknown';
        final year = pay['year']?.toString() ?? '';
        final netSalary = pay['netSalary']?.toString() ?? '0';
        final grossSalary = pay['grossSalary']?.toString() ?? '0';

        // Parse snapshotted breakdowns
        final Map<String, dynamic> earned = pay['earnedBreakdown'] is Map
            ? Map<String, dynamic>.from(pay['earnedBreakdown'])
            : {};
        final Map<String, dynamic> deducted = pay['deductionBreakdown'] is Map
            ? Map<String, dynamic>.from(pay['deductionBreakdown'])
            : {};

        return Padding(
          padding: EdgeInsets.only(
            top: 20,
            left: 20,
            right: 20,
            bottom: MediaQuery.of(context).viewInsets.bottom + 30,
          ),
          child: Container(
            constraints: BoxConstraints(
              maxHeight: MediaQuery.of(context).size.height * 0.8,
            ),
            child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Pull Handle indicator
                  Align(
                    alignment: Alignment.center,
                    child: Container(
                      width: 36,
                      height: 4.5,
                      margin: const EdgeInsets.only(bottom: 16),
                      decoration: BoxDecoration(
                        color: isDark ? Colors.white24 : Colors.black12,
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                  ),

                  // Header
                  Text(
                    'Payslip for $monthStr $year',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: isDark ? AppColors.darkInk : AppColors.ink,
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Large Net Pay card
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [AppColors.brandFrom, AppColors.brandMid],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Column(
                      children: [
                        const Text(
                          'NET TAKE-HOME SALARY',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            color: Colors.white70,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '₹$netSalary',
                          style: const TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Earnings breakdown
                  Text(
                    'Earnings Snapshot',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: isDark
                          ? AppColors.darkInkSubtle
                          : AppColors.inkSubtle,
                    ),
                  ),
                  const SizedBox(height: 6),
                  if (earned.isEmpty)
                    const Text('No earnings snapshot available.')
                  else
                    ...earned.entries.map(
                      (e) => _buildDetailRow(e.key, '₹${e.value}', isDark),
                    ),
                  const Divider(height: 24),

                  // Deductions breakdown
                  Text(
                    'Deductions Snapshot',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: isDark
                          ? AppColors.darkInkSubtle
                          : AppColors.inkSubtle,
                    ),
                  ),
                  const SizedBox(height: 6),
                  if (deducted.isEmpty)
                    const Text('No deductions snapshot available.')
                  else
                    ...deducted.entries.map(
                      (e) => _buildDetailRow(
                        e.key,
                        '₹${e.value}',
                        isDark,
                        isDeduction: true,
                      ),
                    ),
                  const Divider(height: 24),

                  // Summary metrics
                  _buildDetailRow('Gross Salary', '₹$grossSalary', isDark),
                  _buildDetailRow(
                    'Working Days',
                    pay['workingDays']?.toString() ?? '—',
                    isDark,
                  ),
                  _buildDetailRow(
                    'Present Days',
                    pay['presentDays']?.toString() ?? '—',
                    isDark,
                  ),
                  _buildDetailRow(
                    'LOP Days',
                    pay['lopDays']?.toString() ?? '0',
                    isDark,
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildDetailRow(
    String label,
    String value,
    bool isDark, {
    bool isDeduction = false,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 12)),
          Text(
            value,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.bold,
              color: isDeduction
                  ? Colors.red
                  : (isDark ? AppColors.darkInk : AppColors.ink),
            ),
          ),
        ],
      ),
    );
  }
}
