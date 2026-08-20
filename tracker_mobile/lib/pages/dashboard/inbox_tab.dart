import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_theme.dart';
import '../../providers/auth_provider.dart';
import '../../providers/navigation_provider.dart';
import '../../services/api.dart';

class InboxTab extends StatefulWidget {
  const InboxTab({super.key});

  @override
  State<InboxTab> createState() => _InboxTabState();
}

class _InboxTabState extends State<InboxTab> {
  final ApiService _api = ApiService();

  int _selectedFilterIndex = 0;
  bool _isLoading = false;
  final Map<String, bool> _actionBusy = {};

  final List<String> _filters = [
    'All Action Items',
    'Pending Approvals',
    'Tasks',
    'Tickets',
  ];

  // Unified inbox items fetched from backend
  List<Map<String, dynamic>> _inboxItems = [];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _fetchInbox());
  }

  Future<void> _fetchInbox() async {
    final user = context.read<AuthProvider>().user;
    if (user == null) return;

    setState(() => _isLoading = true);
    try {
      final results = await Future.wait([
        // 1. Leaves pending manager approval
        _api.readModel('leaves', query: {
          'filter': {'managerId': user.id, 'status': 'Pending'},
          'sort': {'createdAt': -1},
          'limit': 20,
        }),
        // 2. Tasks assigned to this user that are due or active
        _api.readModel('tasks', query: {
          'filter': {'assignedTo': user.id, 'status': 'In Progress'},
          'sort': {'dueDate': 1},
          'limit': 10,
        }),
        // 3. Tickets assigned to user that are open or in-progress
        _api.readModel('tickets', query: {
          'filter': {
            'assignedTo': user.id,
            'status': {'\$nin': ['Resolved', 'Closed']},
          },
          'sort': {'priority': -1},
          'limit': 10,
        }),
      ]);

      final List<Map<String, dynamic>> combined = [];

      // Parse leaves
      if (results[0].statusCode == 200 && results[0].data != null) {
        final List leaves = results[0].data['data'] ?? [];
        for (final l in leaves) {
          combined.add({
            '_id': l['_id'],
            'type': 'Pending Approvals',
            'title': 'Leave: ${l['employeeName'] ?? 'Employee'}',
            'subtitle': '${l['leaveType'] ?? 'Leave'} · ${_formatDateRange(l['startDate'], l['endDate'])}',
            'time': _relativeTime(l['createdAt']),
            'icon': Icons.pending_actions_rounded,
            'color': const Color(0xFFD97706),
            'actionType': 'approval',
            'model': 'leaves',
          });
        }
      }

      // Parse tasks
      if (results[1].statusCode == 200 && results[1].data != null) {
        final List tasks = results[1].data['data'] ?? [];
        for (final t in tasks) {
          combined.add({
            '_id': t['_id'],
            'type': 'Tasks',
            'title': t['title']?.toString() ?? 'Task',
            'subtitle': 'Due: ${_formatDate(t['dueDate'])}',
            'time': _relativeTime(t['createdAt']),
            'icon': Icons.assignment_rounded,
            'color': const Color(0xFF2563EB),
            'actionType': 'navigate',
            'page': NavPage.tasks,
          });
        }
      }

      // Parse tickets
      if (results[2].statusCode == 200 && results[2].data != null) {
        final List tickets = results[2].data['data'] ?? [];
        for (final t in tickets) {
          final isUrgent = t['priority'] == 'Critical' || t['priority'] == 'High';
          combined.add({
            '_id': t['_id'],
            'type': 'Tickets',
            'title': '${t['ticketId'] ?? 'Ticket'}: ${t['title'] ?? ''}',
            'subtitle': '${t['priority'] ?? 'Normal'} Priority · ${t['status'] ?? 'Open'}',
            'time': _relativeTime(t['createdAt']),
            'icon': isUrgent ? Icons.priority_high_rounded : Icons.confirmation_number_outlined,
            'color': isUrgent ? const Color(0xFFE11D48) : const Color(0xFF0D9488),
            'actionType': 'navigate',
            'page': NavPage.tickets,
          });
        }
      }

      // Sort combined by recency (newest first)
      setState(() => _inboxItems = combined);
    } catch (e) {
      debugPrint('Error fetching inbox: $e');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _handleApproval(Map<String, dynamic> item, String status) async {
    final id = item['_id']?.toString();
    if (id == null) return;

    setState(() => _actionBusy[id] = true);
    try {
      final payload = {
        'status': status,
        if (status == 'Approved') 'approvedAt': DateTime.now().toIso8601String(),
        if (status == 'Rejected') 'rejectedAt': DateTime.now().toIso8601String(),
      };

      final res = await _api.updateModel(item['model']?.toString() ?? 'leaves', id, payload);
      if (res.statusCode == 200) {
        setState(() => _inboxItems.removeWhere((i) => i['_id'] == id));
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Request $status.'),
              backgroundColor: status == 'Approved'
                  ? const Color(0xFF059669)
                  : AppColors.error,
            ),
          );
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Action failed. Please try again.')),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _actionBusy.remove(id));
    }
  }

  String _relativeTime(dynamic raw) {
    if (raw == null) return '';
    try {
      final dt = DateTime.parse(raw.toString()).toLocal();
      final diff = DateTime.now().difference(dt);
      if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
      if (diff.inHours < 24) return '${diff.inHours}h ago';
      return '${diff.inDays}d ago';
    } catch (_) {
      return '';
    }
  }

  String _formatDate(dynamic raw) {
    if (raw == null) return 'No due date';
    try {
      final dt = DateTime.parse(raw.toString()).toLocal();
      return '${dt.day} ${_monthName(dt.month)}';
    } catch (_) {
      return '';
    }
  }

  String _formatDateRange(dynamic start, dynamic end) {
    return '${_formatDate(start)} – ${_formatDate(end)}';
  }

  String _monthName(int m) {
    const months = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[m];
  }

  @override
  Widget build(BuildContext context) {
    final nav = context.watch<NavigationProvider>();
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final filteredItems = _inboxItems.where((item) {
      if (_selectedFilterIndex == 0) return true;
      return item['type'] == _filters[_selectedFilterIndex];
    }).toList();

    return RefreshIndicator(
      onRefresh: _fetchInbox,
      color: AppColors.brandSolid,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Filter Chips
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              physics: const BouncingScrollPhysics(),
              child: Row(
                children: List.generate(_filters.length, (idx) {
                  final isSelected = _selectedFilterIndex == idx;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8.0),
                    child: ChoiceChip(
                      label: Text(_filters[idx]),
                      selected: isSelected,
                      onSelected: (_) => setState(() => _selectedFilterIndex = idx),
                      selectedColor: AppColors.brandSolid,
                      backgroundColor:
                          isDark ? AppColors.darkSurface0 : Colors.white,
                      labelStyle: TextStyle(
                        fontSize: 13,
                        fontWeight:
                            isSelected ? FontWeight.w600 : FontWeight.w500,
                        color: isSelected
                            ? Colors.white
                            : (isDark
                                ? AppColors.darkInkSubtle
                                : AppColors.inkMuted),
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(20.0),
                        side: BorderSide(
                          color: isSelected
                              ? Colors.transparent
                              : (isDark
                                  ? AppColors.darkBorder
                                  : const Color(0xFFCBD5E1)),
                        ),
                      ),
                    ),
                  );
                }),
              ),
            ),

            const SizedBox(height: 20),

            Text(
              'ACTION CENTER (${filteredItems.length})',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.8,
                color: isDark ? AppColors.darkInkSubtle : AppColors.inkTertiary,
              ),
            ),
            const SizedBox(height: 12),

            if (_isLoading)
              const Center(
                child: Padding(
                  padding: EdgeInsets.symmetric(vertical: 48),
                  child: CircularProgressIndicator(),
                ),
              )
            else if (filteredItems.isEmpty)
              Center(
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 48),
                  child: Column(
                    children: [
                      Icon(Icons.inbox_rounded,
                          size: 48,
                          color:
                              isDark ? AppColors.darkInkSubtle : AppColors.inkSubtle),
                      const SizedBox(height: 12),
                      Text(
                        'All clear — no pending actions.',
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
                itemCount: filteredItems.length,
                separatorBuilder: (_, _) => const SizedBox(height: 12),
                itemBuilder: (context, idx) {
                  final item = filteredItems[idx];
                  final isApproval = item['actionType'] == 'approval';
                  final id = item['_id']?.toString() ?? '';
                  final isBusy = _actionBusy[id] == true;

                  return InkWell(
                    borderRadius: BorderRadius.circular(16.0),
                    onTap: () {
                      final type = item['type']?.toString().toLowerCase() ?? '';
                      if (type.contains('task')) {
                        nav.navigateTo(NavPage.tasks);
                      } else if (type.contains('ticket')) {
                        nav.navigateTo(NavPage.tickets);
                      } else if (type.contains('attendance') || type.contains('leave')) {
                        nav.navigateTo(NavPage.attendance);
                      } else if (type.contains('feed')) {
                        nav.navigateTo(NavPage.feeds);
                      } else if (type.contains('crm')) {
                        nav.navigateTo(NavPage.crm);
                      }
                    },
                    child: Container(
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
                      child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: (item['color'] as Color)
                                    .withValues(alpha: 0.14),
                                shape: BoxShape.circle,
                              ),
                              child: Icon(
                                item['icon'] as IconData,
                                color: item['color'] as Color,
                                size: 18,
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                item['type'] as String,
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                  color: item['color'] as Color,
                                ),
                              ),
                            ),
                            if ((item['time'] as String).isNotEmpty)
                              Text(
                                item['time'] as String,
                                style: TextStyle(
                                  fontSize: 11,
                                  color: isDark
                                      ? AppColors.darkInkSubtle
                                      : AppColors.inkTertiary,
                                ),
                              ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        Text(
                          item['title'] as String,
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                            color: isDark
                                ? Colors.white
                                : const Color(0xFF0F172A),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          item['subtitle'] as String,
                          style: TextStyle(
                            fontSize: 13,
                            color: isDark
                                ? AppColors.darkInkSubtle
                                : AppColors.inkSubtle,
                          ),
                        ),
                        const SizedBox(height: 14),

                        // Express Approval Buttons — post to backend
                        if (isApproval)
                          isBusy
                              ? const Center(
                                  child: Padding(
                                    padding: EdgeInsets.symmetric(vertical: 8),
                                    child: CircularProgressIndicator(strokeWidth: 2),
                                  ),
                                )
                              : Row(
                                  children: [
                                    Expanded(
                                      child: OutlinedButton.icon(
                                        onPressed: () =>
                                            _handleApproval(item, 'Rejected'),
                                        icon: const Icon(Icons.close_rounded,
                                            size: 16,
                                            color: AppColors.error),
                                        label: const Text('Reject',
                                            style: TextStyle(
                                                color: AppColors.error,
                                                fontSize: 13)),
                                        style: OutlinedButton.styleFrom(
                                          side: const BorderSide(
                                              color: AppColors.error),
                                          padding: const EdgeInsets.symmetric(
                                              vertical: 8),
                                          shape: RoundedRectangleBorder(
                                              borderRadius:
                                                  BorderRadius.circular(8)),
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: ElevatedButton.icon(
                                        onPressed: () =>
                                            _handleApproval(item, 'Approved'),
                                        icon: const Icon(Icons.check_rounded,
                                            size: 16,
                                            color: Colors.white),
                                        label: const Text('Approve',
                                            style: TextStyle(
                                                color: Colors.white,
                                                fontSize: 13)),
                                        style: ElevatedButton.styleFrom(
                                          backgroundColor:
                                              const Color(0xFF059669),
                                          padding: const EdgeInsets.symmetric(
                                              vertical: 8),
                                          shape: RoundedRectangleBorder(
                                              borderRadius:
                                                  BorderRadius.circular(8)),
                                        ),
                                      ),
                                    ),
                                  ],
                                )
                        else
                          Align(
                            alignment: Alignment.centerRight,
                            child: TextButton.icon(
                              onPressed: () {
                                if (item['page'] != null) {
                                  nav.navigateTo(item['page'] as NavPage);
                                }
                              },
                              icon: const Text('View',
                                  style: TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w600)),
                              label: const Icon(Icons.arrow_forward_rounded,
                                  size: 16),
                              style: TextButton.styleFrom(
                                  foregroundColor: AppColors.brandSolid),
                            ),
                          ),
                      ],
                    ),
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
