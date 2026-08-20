import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import '../../core/theme/app_theme.dart';
import '../../providers/auth_provider.dart';
import '../../services/api.dart';

// Matches backend Expense.js expenseType enum exactly
const _kExpenseTypes = [
  {'value': 'travel', 'label': 'Travel'},
  {'value': 'accommodation', 'label': 'Accommodation'},
  {'value': 'food', 'label': 'Food'},
  {'value': 'miscellaneous', 'label': 'Miscellaneous'},
];

class ExpensesPage extends StatefulWidget {
  const ExpensesPage({super.key});

  @override
  State<ExpensesPage> createState() => _ExpensesPageState();
}

class _ExpensesPageState extends State<ExpensesPage> {
  final ApiService _api = ApiService();
  final ImagePicker _picker = ImagePicker();
  final _formKey = GlobalKey<FormState>();

  // Form state
  String _selectedExpenseType = 'travel';
  String? _selectedClientId;
  final TextEditingController _amountController = TextEditingController();
  final TextEditingController _descriptionController = TextEditingController();
  XFile? _receiptImage;

  // Page state
  bool _isLoading = false;
  bool _isSubmitting = false;
  List<Map<String, dynamic>> _myClaims = [];
  List<Map<String, dynamic>> _clients = [];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _fetchClaims();
      _fetchClients();
    });
  }

  @override
  void dispose() {
    _amountController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _fetchClients() async {
    try {
      final res = await _api.readModel('clients');
      if (res.statusCode == 200 && res.data != null) {
        final List list = res.data['data'] ?? [];
        setState(() {
          _clients = list.map((c) => Map<String, dynamic>.from(c)).toList();
        });
      }
    } catch (e) {
      debugPrint('Error fetching clients: $e');
    }
  }

  Future<void> _fetchClaims() async {
    final userId = context.read<AuthProvider>().user?.id;
    if (userId == null) return;

    setState(() => _isLoading = true);
    try {
      final res = await _api.readModel(
        'expenses',
        query: {
          'filter': {'employeeId': userId},
          'populateFields': {'clientId': 'name'},
          'sort': {'createdAt': -1},
          'limit': 50,
        },
      );
      if (res.statusCode == 200 && res.data != null) {
        final List list = res.data['data'] ?? [];
        setState(() {
          _myClaims = list.map((e) => Map<String, dynamic>.from(e)).toList();
        });
      }
    } catch (e) {
      debugPrint('Error fetching expenses: $e');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _pickImage(ImageSource source) async {
    try {
      final picked = await _picker.pickImage(
        source: source,
        imageQuality: 80,
        maxWidth: 1200,
      );
      if (picked != null) setState(() => _receiptImage = picked);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Image selection failed: $e')));
      }
    }
  }

  /// Matches frontend submitExpenses payload exactly:
  /// { clientId, date, expenses: [{expenseType, amount, description}], dayTotal, totalExpenses }
  Future<void> _submitClaim() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedClientId == null) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Please select a client.')));
      return;
    }

    setState(() => _isSubmitting = true);
    try {
      final amount = double.tryParse(_amountController.text.trim()) ?? 0;
      final expenseItem = {
        'expenseType': _selectedExpenseType,
        'amount': amount,
        'description': _descriptionController.text.trim(),
      };

      final payload = {
        'clientId': _selectedClientId,
        'date': DateTime.now().toIso8601String().split('T')[0],
        'expenses': [expenseItem],
        'dayTotal': amount,
        'totalExpenses': 1,
      };

      final res = await _api.createModel('expenses', payload);
      if (res.statusCode == 200 || res.statusCode == 201) {
        _amountController.clear();
        _descriptionController.clear();
        setState(() {
          _selectedExpenseType = 'travel';
          _selectedClientId = null;
          _receiptImage = null;
        });
        Navigator.pop(context);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Expense submitted for manager review.'),
              backgroundColor: Color(0xFF059669),
            ),
          );
          _fetchClaims();
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Submission failed. Please try again.'),
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  void _showNewClaimSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (sheetCtx, setSheetState) {
            return Padding(
              padding: EdgeInsets.only(
                top: 24,
                left: 20,
                right: 20,
                bottom: MediaQuery.of(sheetCtx).viewInsets.bottom + 24,
              ),
              child: SingleChildScrollView(
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Text(
                        'Submit Expense Claim',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Client selector — required by schema
                      DropdownButtonFormField<String>(
                        initialValue: _selectedClientId,
                        decoration: const InputDecoration(
                          labelText: 'Client *',
                          border: OutlineInputBorder(),
                        ),
                        items: _clients
                            .map(
                              (c) => DropdownMenuItem<String>(
                                value: c['_id']?.toString(),
                                child: Text(c['name']?.toString() ?? ''),
                              ),
                            )
                            .toList(),
                        onChanged: (val) {
                          setState(() => _selectedClientId = val);
                          setSheetState(() {});
                        },
                        validator: (val) =>
                            val == null ? 'Client is required' : null,
                      ),
                      const SizedBox(height: 14),

                      // Expense type — matches backend enum exactly
                      DropdownButtonFormField<String>(
                        initialValue: _selectedExpenseType,
                        decoration: const InputDecoration(
                          labelText: 'Expense Type',
                          border: OutlineInputBorder(),
                        ),
                        items: _kExpenseTypes
                            .map(
                              (t) => DropdownMenuItem<String>(
                                value: t['value'],
                                child: Text(t['label']!),
                              ),
                            )
                            .toList(),
                        onChanged: (val) {
                          if (val != null) {
                            setState(() => _selectedExpenseType = val);
                            setSheetState(() {});
                          }
                        },
                      ),
                      const SizedBox(height: 14),

                      TextFormField(
                        controller: _amountController,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(
                          labelText: 'Amount (₹)',
                          prefixText: '₹ ',
                          border: OutlineInputBorder(),
                        ),
                        validator: (val) {
                          if (val == null || val.trim().isEmpty) {
                            return 'Amount is required';
                          }
                          if (double.tryParse(val.trim()) == null) {
                            return 'Enter a valid number';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 14),

                      TextFormField(
                        controller: _descriptionController,
                        maxLines: 2,
                        decoration: const InputDecoration(
                          labelText: 'Description',
                          hintText: 'e.g. Cab to client office for deployment',
                          border: OutlineInputBorder(),
                        ),
                      ),
                      const SizedBox(height: 16),

                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: () async {
                                await _pickImage(ImageSource.camera);
                                setSheetState(() {});
                              },
                              icon: const Icon(Icons.camera_alt_outlined),
                              label: const Text('Camera Snap'),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: () async {
                                await _pickImage(ImageSource.gallery);
                                setSheetState(() {});
                              },
                              icon: const Icon(Icons.photo_library_outlined),
                              label: const Text('Gallery'),
                            ),
                          ),
                        ],
                      ),
                      if (_receiptImage != null) ...[
                        const SizedBox(height: 10),
                        Row(
                          children: [
                            const Icon(
                              Icons.check_circle_rounded,
                              color: Color(0xFF059669),
                              size: 18,
                            ),
                            const SizedBox(width: 6),
                            Expanded(
                              child: Text(
                                'Receipt: ${_receiptImage!.name}',
                                style: const TextStyle(
                                  fontSize: 12,
                                  color: Color(0xFF059669),
                                  fontWeight: FontWeight.bold,
                                ),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                      ],
                      const SizedBox(height: 20),

                      ElevatedButton(
                        onPressed: _isSubmitting ? null : _submitClaim,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.brandSolid,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: _isSubmitting
                            ? const SizedBox(
                                height: 18,
                                width: 18,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : const Text(
                                'Submit Claim',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    // MTD totals computed from live backend data
    double totalApproved = 0;
    double totalPending = 0;
    for (final c in _myClaims) {
      final amt = (c['dayTotal'] as num?)?.toDouble() ?? 0;
      final status = c['status']?.toString().toLowerCase() ?? '';
      if (status == 'approved') {
        totalApproved += amt;
      } else if (status == 'pending') {
        totalPending += amt;
      }
    }

    return Scaffold(
      backgroundColor: isDark ? AppColors.darkCanvas : AppColors.canvas,
      appBar: AppBar(
        title: const Text('Expense & Travel Claims'),
        backgroundColor: isDark ? AppColors.darkSurface0 : Colors.white,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: _fetchClaims,
            tooltip: 'Refresh',
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showNewClaimSheet,
        backgroundColor: AppColors.brandSolid,
        icon: const Icon(Icons.add_a_photo_outlined, color: Colors.white),
        label: const Text(
          'New Claim',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        ),
      ),
      body: RefreshIndicator(
        onRefresh: _fetchClaims,
        color: AppColors.brandSolid,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // MTD Summary Card — computed from real backend data
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20.0),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(20.0),
                ),
                child: _isLoading
                    ? const Center(
                        child: CircularProgressIndicator(color: Colors.white54),
                      )
                    : Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Month-to-Date Claimed',
                            style: TextStyle(
                              color: Colors.white70,
                              fontSize: 13,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            '₹${(totalApproved + totalPending).toStringAsFixed(0)}',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 28,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              _SummaryBadge(
                                label:
                                    '₹${totalApproved.toStringAsFixed(0)} Approved',
                                color: const Color(0xFF34D399),
                                bg: const Color(0xFF059669),
                              ),
                              const SizedBox(width: 8),
                              _SummaryBadge(
                                label:
                                    '₹${totalPending.toStringAsFixed(0)} Pending',
                                color: const Color(0xFFFBBF24),
                                bg: const Color(0xFFD97706),
                              ),
                            ],
                          ),
                        ],
                      ),
              ),

              const SizedBox(height: 24),

              const Text(
                'MY EXPENSE CLAIMS',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.8,
                  color: AppColors.inkTertiary,
                ),
              ),
              const SizedBox(height: 12),

              if (_isLoading)
                const Center(child: CircularProgressIndicator())
              else if (_myClaims.isEmpty)
                Center(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 48),
                    child: Column(
                      children: [
                        Icon(
                          Icons.receipt_long_outlined,
                          size: 48,
                          color: isDark
                              ? AppColors.darkInkSubtle
                              : AppColors.inkSubtle,
                        ),
                        const SizedBox(height: 12),
                        Text(
                          'No expense claims yet.\nTap + New Claim to submit.',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: isDark
                                ? AppColors.darkInkSubtle
                                : AppColors.inkSubtle,
                          ),
                        ),
                      ],
                    ),
                  ),
                )
              else
                ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: _myClaims.length,
                  separatorBuilder: (_, s) => const SizedBox(height: 10),
                  itemBuilder: (context, idx) {
                    final claim = _myClaims[idx];
                    final status =
                        claim['status']?.toString().toLowerCase() ?? 'pending';
                    final isApproved = status == 'approved';
                    final dayTotal =
                        (claim['dayTotal'] as num?)?.toDouble() ?? 0;

                    // Client name from populate
                    final clientRaw = claim['clientId'];
                    final clientName = clientRaw is Map
                        ? (clientRaw['name']?.toString() ?? '')
                        : '';

                    // Expense types summary from line items
                    final items = (claim['expenses'] as List?) ?? [];
                    final typeLabels = items
                        .map((e) {
                          final t = e['expenseType']?.toString() ?? '';
                          return _kExpenseTypes.firstWhere(
                            (x) => x['value'] == t,
                            orElse: () => {'value': t, 'label': t},
                          )['label']!;
                        })
                        .toSet()
                        .join(', ');

                    final submittedAt = claim['submittedAt'] != null
                        ? DateTime.tryParse(
                            claim['submittedAt'].toString(),
                          )?.toLocal()
                        : null;
                    final dateStr = submittedAt != null
                        ? '${submittedAt.day} ${_monthName(submittedAt.month)}'
                        : '';

                    return Container(
                      padding: const EdgeInsets.all(16.0),
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.darkSurface0 : Colors.white,
                        borderRadius: BorderRadius.circular(16.0),
                        border: Border.all(
                          color: isDark
                              ? AppColors.darkBorder
                              : const Color(0xFFF1F5F9),
                        ),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 44,
                            height: 44,
                            decoration: BoxDecoration(
                              color: isApproved
                                  ? const Color(0xFFECFDF5)
                                  : const Color(0xFFFFFBEB),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Center(
                              child: Icon(
                                isApproved
                                    ? Icons.check_circle_outline
                                    : Icons.hourglass_top_rounded,
                                color: isApproved
                                    ? const Color(0xFF059669)
                                    : const Color(0xFFD97706),
                                size: 22,
                              ),
                            ),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  typeLabels.isNotEmpty
                                      ? typeLabels
                                      : 'Expense',
                                  style: TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w600,
                                    color: isDark
                                        ? Colors.white
                                        : const Color(0xFF0F172A),
                                  ),
                                ),
                                Text(
                                  [
                                    if (clientName.isNotEmpty) clientName,
                                    if (dateStr.isNotEmpty) dateStr,
                                  ].join(' · '),
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: isDark
                                        ? AppColors.darkInkSubtle
                                        : AppColors.inkSubtle,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text(
                                '₹${dayTotal.toStringAsFixed(0)}',
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                status,
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                  color: isApproved
                                      ? const Color(0xFF059669)
                                      : const Color(0xFFD97706),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    );
                  },
                ),

              const SizedBox(height: 80),
            ],
          ),
        ),
      ),
    );
  }

  String _monthName(int m) {
    const months = [
      '',
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return months[m];
  }
}

class _SummaryBadge extends StatelessWidget {
  final String label;
  final Color color;
  final Color bg;
  const _SummaryBadge({
    required this.label,
    required this.color,
    required this.bg,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bg.withValues(alpha: 0.2),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontSize: 12,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }
}
