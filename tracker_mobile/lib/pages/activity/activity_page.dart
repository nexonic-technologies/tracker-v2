import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../services/api.dart';
import '../../core/theme/app_theme.dart';

// ─── Helpers ─────────────────────────────────────────────────────────────────

String _localDate([DateTime? d]) {
  final date = d ?? DateTime.now();
  return '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
}

const _monthNames = [
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

// ─── ActivityPage ─────────────────────────────────────────────────────────────

class ActivityPage extends StatefulWidget {
  const ActivityPage({super.key});

  @override
  State<ActivityPage> createState() => _ActivityPageState();
}

class _ActivityPageState extends State<ActivityPage> {
  final ApiService _api = ApiService();
  final _formKey = GlobalKey<FormState>();

  // Dropdown list data
  List<Map<String, dynamic>> _clients = [];
  List<Map<String, dynamic>> _project_typesForSelectedClient = [];
  List<Map<String, dynamic>> _task_types = [];

  // Form selections
  Map<String, dynamic>? _selectedClient;
  Map<String, dynamic>? _selectedProjectType;
  Map<String, dynamic>? _selectedTaskType;
  final TextEditingController _descController = TextEditingController();

  // State
  bool _submitting = false;
  bool _loadingData = false;
  bool _loadingLogs = false;
  List<Map<String, dynamic>> _logs = [];
  DateTime _selectedDate = DateTime.now();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadFormData();
      _fetchLogs();
    });
  }

  @override
  void dispose() {
    _descController.dispose();
    super.dispose();
  }

  // --- Load clients and task types ---
  Future<void> _loadFormData() async {
    setState(() => _loadingData = true);
    try {
      // 1. Fetch active clients with populated project_types
      final clientRes = await _api.readModel(
        'clients',
        query: {
          'filter': {'Status': 'Active'},
          'populateFields': {'project_types': 'name'},
        },
      );

      // 2. Fetch active task types
      final taskTypeRes = await _api.readModel(
        'task_types',
        query: {
          'filter': {'isActive': true},
        },
      );

      final rawClients = clientRes.data;
      List clientList = [];
      if (rawClients is List) {
        clientList = rawClients;
      } else if (rawClients is Map && rawClients['data'] is List) {
        clientList = rawClients['data'] as List;
      }

      final rawtask_types = taskTypeRes.data;
      List taskTypeList = [];
      if (rawtask_types is List) {
        taskTypeList = rawtask_types;
      } else if (rawtask_types is Map && rawtask_types['data'] is List) {
        taskTypeList = rawtask_types['data'] as List;
      }

      if (mounted) {
        setState(() {
          _clients = clientList
              .map((e) => Map<String, dynamic>.from(e))
              .toList();
          _task_types = taskTypeList
              .map((e) => Map<String, dynamic>.from(e))
              .toList();
        });
      }
    } catch (e) {
      debugPrint('Error loading activity form metadata: $e');
    } finally {
      if (mounted) setState(() => _loadingData = false);
    }
  }

  // --- Fetch logged activities for the selected date ---
  Future<void> _fetchLogs() async {
    final user = context.read<AuthProvider>().user;
    if (user == null) return;

    setState(() => _loadingLogs = true);
    final dateStr = _localDate(_selectedDate);

    try {
      final res = await _api.readModel(
        'daily_activities',
        query: {
          'filter': {
            'user': user.id,
            'date': {
              '\$gte': '${dateStr}T00:00:00.000Z',
              '\$lte': '${dateStr}T23:59:59.999Z',
            },
          },
          'populateFields': {
            'client': 'name',
            'projectType': 'name',
            'taskType': 'name',
          },
          'sort': {'createdAt': -1},
        },
      );

      final data = res.data;
      List recs = [];
      if (data is List) {
        recs = data;
      } else if (data is Map && data['data'] is List) {
        recs = data['data'] as List;
      }

      if (mounted) {
        setState(() {
          _logs = recs.map((e) => Map<String, dynamic>.from(e)).toList();
        });
      }
    } catch (e) {
      debugPrint('Error fetching daily logs: $e');
    } finally {
      if (mounted) setState(() => _loadingLogs = false);
    }
  }

  // --- Submit form ---
  Future<void> _submitLog() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedClient == null ||
        _selectedProjectType == null ||
        _selectedTaskType == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please select client, project type, and task type.'),
          backgroundColor: AppColors.error,
        ),
      );
      return;
    }

    final user = context.read<AuthProvider>().user;
    if (user == null) return;

    setState(() => _submitting = true);
    try {
      // The backend buildCreateQuery handles single object or array
      await _api.createModel('daily_activities', {
        'client': _selectedClient!['_id'] ?? _selectedClient!['id'],
        'projectType':
            _selectedProjectType!['_id'] ?? _selectedProjectType!['id'],
        'taskType': _selectedTaskType!['_id'] ?? _selectedTaskType!['id'],
        'activity': _descController.text.trim(),
        'user': user.id,
        'date': _localDate(_selectedDate),
      });

      _descController.clear();
      setState(() {
        _selectedClient = null;
        _selectedProjectType = null;
        _selectedTaskType = null;
        _project_typesForSelectedClient = [];
      });

      await _fetchLogs();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Row(
              children: [
                Icon(Icons.check_circle_rounded, color: Colors.white, size: 16),
                SizedBox(width: 8),
                Text('Activity logged successfully!'),
              ],
            ),
            backgroundColor: AppColors.success,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppRadius.md),
            ),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed: $e'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final cardBg = isDark ? AppColors.darkSurface0 : AppColors.surface0;
    final borderColor = isDark ? AppColors.darkBorder : AppColors.border;

    return RefreshIndicator(
      onRefresh: () async {
        await _loadFormData();
        await _fetchLogs();
      },
      color: AppColors.projectAccent,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(AppSpacing.lg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ─── Date Navigator ──────────────────────────────────────────────
            Container(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.md,
                vertical: AppSpacing.sm,
              ),
              decoration: BoxDecoration(
                color: cardBg,
                borderRadius: BorderRadius.circular(AppRadius.lg),
                border: Border.all(color: borderColor),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  IconButton(
                    icon: const Icon(Icons.chevron_left_rounded),
                    onPressed: () {
                      setState(() {
                        _selectedDate = _selectedDate.subtract(
                          const Duration(days: 1),
                        );
                      });
                      _fetchLogs();
                    },
                  ),
                  GestureDetector(
                    onTap: () async {
                      final picked = await showDatePicker(
                        context: context,
                        initialDate: _selectedDate,
                        firstDate: DateTime.now().subtract(
                          const Duration(days: 365),
                        ),
                        lastDate: DateTime.now().add(const Duration(days: 30)),
                      );
                      if (picked != null) {
                        setState(() => _selectedDate = picked);
                        _fetchLogs();
                      }
                    },
                    child: Row(
                      children: [
                        const Icon(
                          Icons.calendar_month_rounded,
                          size: 16,
                          color: AppColors.projectAccent,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          '${_monthNames[_selectedDate.month - 1]} ${_selectedDate.day}, ${_selectedDate.year}',
                          style: const TextStyle(
                            fontWeight: FontWeight.w600,
                            fontSize: 14,
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.chevron_right_rounded),
                    onPressed: () {
                      setState(() {
                        _selectedDate = _selectedDate.add(
                          const Duration(days: 1),
                        );
                      });
                      _fetchLogs();
                    },
                  ),
                ],
              ),
            ),

            const SizedBox(height: AppSpacing.lg),

            // ─── Form Card ───────────────────────────────────────────────────
            Container(
              padding: const EdgeInsets.all(AppSpacing.lg),
              decoration: BoxDecoration(
                color: cardBg,
                borderRadius: BorderRadius.circular(AppRadius.lg),
                border: Border.all(color: borderColor),
              ),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(6),
                          decoration: BoxDecoration(
                            color: AppColors.projectAccentLight,
                            borderRadius: BorderRadius.circular(AppRadius.md),
                          ),
                          child: const Icon(
                            Icons.edit_note_rounded,
                            color: AppColors.projectAccent,
                            size: 18,
                          ),
                        ),
                        const SizedBox(width: 8),
                        const Text(
                          'Log Activity',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                    const Divider(height: AppSpacing.xl),

                    if (_loadingData)
                      const Center(
                        child: Padding(
                          padding: EdgeInsets.symmetric(vertical: 24.0),
                          child: CircularProgressIndicator(
                            color: AppColors.projectAccent,
                          ),
                        ),
                      )
                    else ...[
                      // 1. Client selection
                      const Text(
                        'Client *',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 6),
                      DropdownButtonFormField<Map<String, dynamic>>(
                        isExpanded: true,
                        initialValue: _selectedClient,
                        hint: const Text('Select Client'),
                        decoration: InputDecoration(
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 10,
                          ),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(AppRadius.md),
                          ),
                        ),
                        items: _clients.map((client) {
                          return DropdownMenuItem<Map<String, dynamic>>(
                            value: client,
                            child: Text(client['name'] ?? ''),
                          );
                        }).toList(),
                        onChanged: (client) {
                          setState(() {
                            _selectedClient = client;
                            _selectedProjectType = null;
                            if (client != null &&
                                client['project_types'] is List) {
                              final pTypes = client['project_types'] as List;
                              _project_typesForSelectedClient = pTypes
                                  .map((e) => Map<String, dynamic>.from(e))
                                  .toList();
                            } else {
                              _project_typesForSelectedClient = [];
                            }
                          });
                        },
                        validator: (value) =>
                            value == null ? 'Client is required' : null,
                      ),

                      const SizedBox(height: 14),

                      // 2. Project Type selection
                      const Text(
                        'Project Type *',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 6),
                      DropdownButtonFormField<Map<String, dynamic>>(
                        isExpanded: true,
                        initialValue: _selectedProjectType,
                        hint: const Text('Select Project Type'),
                        decoration: InputDecoration(
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 10,
                          ),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(AppRadius.md),
                          ),
                        ),
                        items: _project_typesForSelectedClient.map((pt) {
                          return DropdownMenuItem<Map<String, dynamic>>(
                            value: pt,
                            child: Text(pt['name'] ?? ''),
                          );
                        }).toList(),
                        onChanged: (pt) {
                          setState(() => _selectedProjectType = pt);
                        },
                        validator: (value) =>
                            value == null ? 'Project type is required' : null,
                      ),

                      const SizedBox(height: 14),

                      // 3. Task Type selection
                      const Text(
                        'Task Type *',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 6),
                      DropdownButtonFormField<Map<String, dynamic>>(
                        isExpanded: true,
                        initialValue: _selectedTaskType,
                        hint: const Text('Select Task Type'),
                        decoration: InputDecoration(
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 10,
                          ),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(AppRadius.md),
                          ),
                        ),
                        items: _task_types.map((tt) {
                          return DropdownMenuItem<Map<String, dynamic>>(
                            value: tt,
                            child: Text(tt['name'] ?? ''),
                          );
                        }).toList(),
                        onChanged: (tt) {
                          setState(() => _selectedTaskType = tt);
                        },
                        validator: (value) =>
                            value == null ? 'Task type is required' : null,
                      ),

                      const SizedBox(height: 14),

                      // 4. Description
                      const Text(
                        'Activity Description *',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 6),
                      TextFormField(
                        controller: _descController,
                        maxLines: 3,
                        decoration: InputDecoration(
                          hintText: 'What did you work on?',
                          contentPadding: const EdgeInsets.all(12),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(AppRadius.md),
                          ),
                        ),
                        validator: (value) =>
                            (value == null || value.trim().isEmpty)
                            ? 'Description is required'
                            : null,
                      ),

                      const SizedBox(height: 18),

                      // Submit Button
                      SizedBox(
                        width: double.infinity,
                        height: 48,
                        child: ElevatedButton(
                          onPressed: _submitting ? null : _submitLog,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.projectAccent,
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(AppRadius.md),
                            ),
                            elevation: 0,
                          ),
                          child: _submitting
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2.5,
                                    color: Colors.white,
                                  ),
                                )
                              : const Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(Icons.send_rounded, size: 16),
                                    SizedBox(width: 8),
                                    Text(
                                      'Log Activity',
                                      style: TextStyle(
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ],
                                ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),

            const SizedBox(height: AppSpacing.lg),

            // ─── Logs List Header ────────────────────────────────────────────
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Today\'s Activities',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
                Text(
                  '${_logs.length} logged',
                  style: TextStyle(
                    fontSize: 12,
                    color: isDark
                        ? AppColors.darkInkSubtle
                        : AppColors.inkSubtle,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.md),

            // ─── Logs List ───────────────────────────────────────────────────
            if (_loadingLogs)
              const Center(
                child: Padding(
                  padding: EdgeInsets.symmetric(vertical: 36.0),
                  child: CircularProgressIndicator(
                    color: AppColors.projectAccent,
                  ),
                ),
              )
            else if (_logs.isEmpty)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(
                  vertical: 40,
                  horizontal: 16,
                ),
                decoration: BoxDecoration(
                  color: cardBg,
                  borderRadius: BorderRadius.circular(AppRadius.lg),
                  border: Border.all(color: borderColor),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: const BoxDecoration(
                        color: AppColors.projectAccentLight,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.playlist_add_check_rounded,
                        color: AppColors.projectAccent,
                        size: 28,
                      ),
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      'No activities logged yet',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 15,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Complete the form above to record work.',
                      style: TextStyle(
                        color: isDark
                            ? AppColors.darkInkMuted
                            : AppColors.inkMuted,
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              )
            else
              ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: _logs.length,
                separatorBuilder: (context, _) =>
                    const SizedBox(height: AppSpacing.md),
                itemBuilder: (context, idx) {
                  final log = _logs[idx];
                  final clientName = log['client'] != null
                      ? (log['client']['name'] ?? '')
                      : 'No Client';
                  final projectTypeName = log['projectType'] != null
                      ? (log['projectType']['name'] ?? '')
                      : 'No Project Type';
                  final taskTypeName = log['taskType'] != null
                      ? (log['taskType']['name'] ?? '')
                      : 'General';
                  final desc = log['activity'] ?? '';
                  final status = log['status'] ?? 'Pending';

                  return Container(
                    padding: const EdgeInsets.all(AppSpacing.md),
                    decoration: BoxDecoration(
                      color: cardBg,
                      borderRadius: BorderRadius.circular(AppRadius.lg),
                      border: Border(
                        left: const BorderSide(
                          color: AppColors.projectAccent,
                          width: 4,
                        ),
                        top: BorderSide(color: borderColor),
                        right: BorderSide(color: borderColor),
                        bottom: BorderSide(color: borderColor),
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              clientName,
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 14,
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 3,
                              ),
                              decoration: BoxDecoration(
                                color: status == 'Approved'
                                    ? AppColors.successLight
                                    : AppColors.warningLight,
                                borderRadius: BorderRadius.circular(
                                  AppRadius.pill,
                                ),
                              ),
                              child: Text(
                                status,
                                style: TextStyle(
                                  color: status == 'Approved'
                                      ? AppColors.statusPresentText
                                      : AppColors.statusPendingText,
                                  fontSize: 10,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            Text(
                              projectTypeName,
                              style: TextStyle(
                                fontSize: 12,
                                color: isDark
                                    ? AppColors.darkInkSubtle
                                    : AppColors.inkSubtle,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Container(
                              width: 4,
                              height: 4,
                              decoration: BoxDecoration(
                                color: isDark
                                    ? AppColors.darkInkSubtle
                                    : AppColors.inkSubtle,
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              taskTypeName,
                              style: TextStyle(
                                fontSize: 12,
                                color: isDark
                                    ? AppColors.darkInkSubtle
                                    : AppColors.inkSubtle,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                        const Divider(height: 16),
                        Text(
                          desc,
                          style: TextStyle(
                            fontSize: 13.5,
                            color: isDark ? AppColors.darkInk : AppColors.ink,
                            height: 1.4,
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
          ],
        ),
      ),
    );
  }
}
