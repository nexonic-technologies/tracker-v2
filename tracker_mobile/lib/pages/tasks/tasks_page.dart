import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:file_picker/file_picker.dart';
import '../../providers/auth_provider.dart';
import '../../providers/navigation_provider.dart';
import '../../services/api.dart';
import '../../services/cache_manager.dart';
import '../../core/theme/app_theme.dart';
import '../../core/api_config.dart';
import '../../core/widgets/file_viewer.dart';
import '../../core/widgets/shimmer_loading.dart';

class TasksPage extends StatefulWidget {
  const TasksPage({super.key});

  @override
  State<TasksPage> createState() => _TasksPageState();
}

class _TasksPageState extends State<TasksPage> {
  final ApiService _api = ApiService();
  bool _loading = true;
  List<Map<String, dynamic>> _tasks = [];
  String _statusFilter = 'All';

  // My Queue Tab state variables
  String _activeTab = 'all'; // 'all' or 'queue'
  bool _queueLoading = false;
  Map<String, dynamic>? _queueData;

  // Creation dropdown caches
  List<Map<String, dynamic>> _clients = [];
  List<Map<String, dynamic>> _project_types = [];
  List<Map<String, dynamic>> _task_types = [];

  @override
  void initState() {
    super.initState();
    _loadCacheAndFetch();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadDropdownData();
    });
  }

  Future<void> _loadCacheAndFetch() async {
    final cached = await LocalCache().get('cached_tasks');
    if (cached is List && cached.isNotEmpty && mounted) {
      setState(() {
        _tasks = List<Map<String, dynamic>>.from(cached);
      });
      _fetchTasks(isSilent: true);
    } else {
      _fetchTasks(isSilent: false);
    }
  }

  Future<void> _loadDropdownData() async {
    try {
      final cRes = await _api.readModel('clients', query: {'limit': 500});
      final pRes = await _api.readModel('project_types', query: {'limit': 500});
      final tRes = await _api.readModel('task_types', query: {'limit': 500});

      if (mounted) {
        setState(() {
          _clients = List<Map<String, dynamic>>.from(cRes.data['data'] ?? []);
          _project_types = List<Map<String, dynamic>>.from(
            pRes.data['data'] ?? [],
          );
          _task_types = List<Map<String, dynamic>>.from(
            tRes.data['data'] ?? [],
          );
        });
      }
    } catch (e) {
      debugPrint("Dropdown cache load error: $e");
    }
  }

  Future<void> _fetchTasks({bool isSilent = false}) async {
    if (!mounted) return;
    if (!isSilent) setState(() => _loading = true);

    try {
      final userId = context.read<AuthProvider>().user?.id;
      final query = {
        'limit': 100,
        'sort': {'createdAt': -1},
        'filter': {'assignedTo': userId},
      };

      final response = await _api.readModel('tasks', query: query);
      if (response.statusCode == 200 && response.data != null) {
        final List<dynamic> data = response.data['data'] ?? [];
        if (mounted) {
          setState(() {
            _tasks = List<Map<String, dynamic>>.from(data);
          });
          LocalCache().set('cached_tasks', data);
        }
      }
    } catch (e) {
      debugPrint("Error fetching tasks in mobile: $e");
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _updateTaskStatus(String taskId, String nextStatus) async {
    try {
      final response = await _api.updateModel('tasks', taskId, {
        'status': nextStatus,
      });
      if (response.statusCode == 200) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Task status changed to $nextStatus')),
        );
        _fetchTasks();
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to update task status')),
      );
    }
  }

  void _showCreateTaskModal(bool isDark) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => _CreateTaskSheet(
          isDark: isDark,
          clients: _clients,
          project_types: _project_types,
          task_types: _task_types,
          api: _api,
          onTaskCreated: () {
            _fetchTasks();
          },
        ),
      ),
    );
  }

  Future<void> _fetchQueue() async {
    if (!mounted) return;
    setState(() => _queueLoading = true);
    try {
      final userId = context.read<AuthProvider>().user?.id;
      final response = await _api.dio.get('/employees/$userId/gantt-queue');
      if (response.statusCode == 200 && response.data != null) {
        if (mounted) {
          setState(() {
            _queueData = response.data['data'];
          });
        }
      }
    } catch (e) {
      debugPrint("Error fetching queue: $e");
    } finally {
      if (mounted) {
        setState(() => _queueLoading = false);
      }
    }
  }

  String _formatProjectedDate(dynamic dateStr) {
    if (dateStr == null) return '';
    try {
      final date = DateTime.parse(dateStr.toString());
      final months = [
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
      return '${months[date.month - 1]} ${date.day}';
    } catch (_) {
      return '';
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final filteredTasks = _statusFilter == 'All'
        ? _tasks
        : _tasks.where((t) => t['status'] == _statusFilter).toList();

    return Scaffold(
      backgroundColor: isDark ? AppColors.darkCanvas : AppColors.canvas,
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showCreateTaskModal(isDark),
        backgroundColor: AppColors.projectAccent,
        child: const Icon(Icons.add_rounded, color: Colors.white),
      ),
      body: Column(
        children: [
          _buildTabSelector(isDark),
          Expanded(
            child: _activeTab == 'queue'
                ? _buildQueueList(isDark)
                : Column(
                    children: [
                      _buildFilterChips(isDark),
                      Expanded(
                        child: _loading
                            ? ShimmerLoading.list()
                            : filteredTasks.isEmpty
                            ? _buildEmptyState(isDark)
                            : RefreshIndicator(
                                onRefresh: _fetchTasks,
                                color: AppColors.projectAccent,
                                child: ListView.builder(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 16,
                                    vertical: 12,
                                  ),
                                  itemCount: filteredTasks.length,
                                  itemBuilder: (context, idx) {
                                    final task = filteredTasks[idx];
                                    return _buildTaskCard(task, isDark);
                                  },
                                ),
                              ),
                      ),
                    ],
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildTabSelector(bool isDark) {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 12, 16, 4),
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkSurface1 : Colors.grey[200],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark ? AppColors.darkBorder : Colors.grey[300]!,
        ),
      ),
      child: Row(
        children: [
          Expanded(
            child: GestureDetector(
              onTap: () {
                setState(() => _activeTab = 'all');
              },
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 8),
                decoration: BoxDecoration(
                  color: _activeTab == 'all'
                      ? (isDark ? AppColors.darkSurface0 : Colors.white)
                      : Colors.transparent,
                  borderRadius: BorderRadius.circular(8),
                  boxShadow: _activeTab == 'all'
                      ? [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.05),
                            blurRadius: 4,
                            offset: const Offset(0, 2),
                          ),
                        ]
                      : null,
                ),
                child: Center(
                  child: Text(
                    "All Tasks",
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: _activeTab == 'all'
                          ? (isDark ? Colors.white : AppColors.ink)
                          : (isDark ? AppColors.darkInk : Colors.grey[600]),
                    ),
                  ),
                ),
              ),
            ),
          ),
          Expanded(
            child: GestureDetector(
              onTap: () {
                setState(() => _activeTab = 'queue');
                _fetchQueue();
              },
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 8),
                decoration: BoxDecoration(
                  color: _activeTab == 'queue'
                      ? (isDark ? AppColors.darkSurface0 : Colors.white)
                      : Colors.transparent,
                  borderRadius: BorderRadius.circular(8),
                  boxShadow: _activeTab == 'queue'
                      ? [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.05),
                            blurRadius: 4,
                            offset: const Offset(0, 2),
                          ),
                        ]
                      : null,
                ),
                child: Center(
                  child: Text(
                    "My Queue",
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: _activeTab == 'queue'
                          ? (isDark ? Colors.white : AppColors.ink)
                          : (isDark ? AppColors.darkInk : Colors.grey[600]),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQueueList(bool isDark) {
    if (_queueLoading && _queueData == null) {
      return ShimmerLoading.list();
    }

    if (_queueData == null) {
      return _buildEmptyState(isDark);
    }

    final entries = List<Map<String, dynamic>>.from(
      _queueData!['entries'] ?? [],
    );
    final utilization = _queueData!['utilizationPercent'] ?? 0;

    Color utilColor = AppColors.success;
    String utilText = 'Healthy';
    if (utilization >= 80 && utilization <= 120) {
      utilColor = AppColors.warning;
      utilText = 'Busy';
    } else if (utilization > 120) {
      utilColor = AppColors.error;
      utilText = 'Overloaded';
    }

    return RefreshIndicator(
      onRefresh: _fetchQueue,
      color: AppColors.projectAccent,
      child: Column(
        children: [
          Container(
            margin: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: isDark ? AppColors.darkSurface0 : Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: isDark ? AppColors.darkBorder : AppColors.border,
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Workload Utilization',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: isDark ? AppColors.darkInk : AppColors.ink,
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Text(
                          '$utilization%',
                          style: TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                            color: utilColor,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: utilColor.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            utilText,
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              color: utilColor,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                Icon(
                  Icons.speed_rounded,
                  size: 32,
                  color: utilColor.withValues(alpha: 0.6),
                ),
              ],
            ),
          ),

          Expanded(
            child: entries.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.playlist_add_check_rounded,
                          size: 40,
                          color: isDark
                              ? AppColors.darkBorder
                              : Colors.grey[400],
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'No tasks in your queue',
                          style: TextStyle(
                            fontSize: 13,
                            color: isDark
                                ? AppColors.darkInk
                                : Colors.grey[600],
                          ),
                        ),
                      ],
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 8,
                    ),
                    itemCount: entries.length,
                    itemBuilder: (context, idx) {
                      final item = entries[idx];
                      final isFirst = idx == 0;

                      Color priorityColor = Colors.grey;
                      if (item['priorityLevel'] == 'High' ||
                          item['priorityLevel'] == 'Critical') {
                        priorityColor = AppColors.error;
                      } else if (item['priorityLevel'] == 'Medium') {
                        priorityColor = AppColors.warning;
                      } else if (item['priorityLevel'] == 'Low') {
                        priorityColor = AppColors.success;
                      }

                      return Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: isDark ? AppColors.darkSurface0 : Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: isFirst
                                ? AppColors.projectAccent
                                : (isDark
                                      ? AppColors.darkBorder
                                      : AppColors.border),
                            width: isFirst ? 1.5 : 1.0,
                          ),
                        ),
                        child: Row(
                          children: [
                            Container(
                              width: 24,
                              height: 24,
                              decoration: BoxDecoration(
                                color: isFirst
                                    ? AppColors.projectAccent
                                    : (isDark
                                          ? AppColors.darkSurface1
                                          : Colors.grey[200]),
                                shape: BoxShape.circle,
                              ),
                              child: Center(
                                child: isFirst
                                    ? const Icon(
                                        Icons.play_arrow_rounded,
                                        size: 14,
                                        color: Colors.white,
                                      )
                                    : Text(
                                        '${idx + 1}',
                                        style: TextStyle(
                                          fontSize: 10,
                                          fontWeight: FontWeight.bold,
                                          color: isDark
                                              ? Colors.white
                                              : AppColors.ink,
                                        ),
                                      ),
                              ),
                            ),
                            const SizedBox(width: 12),

                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    item['title'] ?? 'Untitled Task',
                                    style: TextStyle(
                                      fontSize: 12.5,
                                      fontWeight: FontWeight.bold,
                                      color: isDark
                                          ? Colors.white
                                          : AppColors.ink,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Row(
                                    children: [
                                      Container(
                                        width: 6,
                                        height: 6,
                                        decoration: BoxDecoration(
                                          color: priorityColor,
                                          shape: BoxShape.circle,
                                        ),
                                      ),
                                      const SizedBox(width: 6),
                                      Text(
                                        item['priorityLevel'] ?? 'Low',
                                        style: TextStyle(
                                          fontSize: 10,
                                          color: isDark
                                              ? AppColors.darkInk
                                              : Colors.grey[600],
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      Icon(
                                        Icons.access_time_rounded,
                                        size: 10,
                                        color: isDark
                                            ? AppColors.darkInk
                                            : Colors.grey[500],
                                      ),
                                      const SizedBox(width: 3),
                                      Text(
                                        '${item['estimatedHours'] ?? 2}h estimated',
                                        style: TextStyle(
                                          fontSize: 10,
                                          color: isDark
                                              ? AppColors.darkInk
                                              : Colors.grey[600],
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),

                            if (item['projectedEnd'] != null) ...[
                              const SizedBox(width: 8),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  Text(
                                    'Est. End',
                                    style: TextStyle(
                                      fontSize: 9,
                                      color: isDark
                                          ? AppColors.darkInk
                                          : Colors.grey[500],
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    _formatProjectedDate(item['projectedEnd']),
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.bold,
                                      color: isFirst
                                          ? AppColors.projectAccent
                                          : (isDark
                                                ? Colors.white
                                                : AppColors.ink),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ],
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChips(bool isDark) {
    final filters = [
      'All',
      'Backlogs',
      'To Do',
      'In Progress',
      'In Review',
      'Completed',
    ];
    return Container(
      height: 48,
      margin: const EdgeInsets.only(top: 8),
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: filters.length,
        itemBuilder: (context, idx) {
          final filter = filters[idx];
          final isSelected = _statusFilter == filter;
          return Padding(
            padding: const EdgeInsets.only(right: 8.0),
            child: ChoiceChip(
              label: Text(
                filter,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: isSelected
                      ? Colors.white
                      : (isDark ? AppColors.darkInk : AppColors.ink),
                ),
              ),
              selected: isSelected,
              selectedColor: AppColors.projectAccent,
              backgroundColor: isDark
                  ? AppColors.darkSurface1
                  : AppColors.surface1,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(20),
              ),
              onSelected: (selected) {
                if (selected) {
                  setState(() => _statusFilter = filter);
                }
              },
            ),
          );
        },
      ),
    );
  }

  Widget _buildTaskCard(Map<String, dynamic> task, bool isDark) {
    final title = task['title'] ?? 'Untitled Task';
    final status = task['status'] ?? 'Backlogs';
    final priority = task['priorityLevel'] ?? 'Low';

    Color statusColor = AppColors.projectAccent;
    if (status == 'Completed') statusColor = Colors.green;
    if (status == 'In Review') statusColor = Colors.purple;
    if (status == 'To Do') statusColor = Colors.orange;

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
        onTap: () => _showTaskDetails(task, isDark),
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: priority == 'High'
                          ? Colors.red.withValues(alpha: 0.1)
                          : Colors.blue.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      priority,
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: priority == 'High' ? Colors.red : Colors.blue,
                      ),
                    ),
                  ),
                  PopupMenuButton<String>(
                    padding: EdgeInsets.zero,
                    tooltip: 'Change Status',
                    onSelected: (newStatus) {
                      final taskId = task['_id']?.toString();
                      if (taskId != null) {
                        _updateTaskStatus(taskId, newStatus);
                      }
                    },
                    itemBuilder: (context) =>
                        [
                              'Backlogs',
                              'To Do',
                              'In Progress',
                              'In Review',
                              'Completed',
                            ]
                            .map(
                              (st) => PopupMenuItem(
                                value: st,
                                child: Text(
                                  st,
                                  style: const TextStyle(fontSize: 12),
                                ),
                              ),
                            )
                            .toList(),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: statusColor.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            status,
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              color: statusColor,
                            ),
                          ),
                          const SizedBox(width: 2),
                          Icon(
                            Icons.arrow_drop_down,
                            size: 14,
                            color: statusColor,
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                title,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: isDark ? AppColors.darkInk : AppColors.ink,
                ),
              ),
              if (task['userStory'] != null) ...[
                const SizedBox(height: 6),
                Text(
                  task['userStory'].toString(),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 11,
                    color: isDark
                        ? AppColors.darkInkSubtle
                        : AppColors.inkSubtle,
                  ),
                ),
              ],
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
            Icons.assignment_outlined,
            size: 48,
            color: isDark ? AppColors.darkInkSubtle : AppColors.inkSubtle,
          ),
          const SizedBox(height: 12),
          Text(
            'No tasks found for $_statusFilter',
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

  void _showTaskDetails(Map<String, dynamic> task, bool isDark) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => _TaskDetailsSheet(
          task: task,
          isDark: isDark,
          api: _api,
          onTaskUpdated: () {
            _fetchTasks();
          },
        ),
      ),
    );
  }
}

// ─── CREATE TASK BOTTOM SHEET ──────────────────────────────────────────────
class _CreateTaskSheet extends StatefulWidget {
  final bool isDark;
  final List<Map<String, dynamic>> clients;
  final List<Map<String, dynamic>> project_types;
  final List<Map<String, dynamic>> task_types;
  final ApiService api;
  final VoidCallback onTaskCreated;

  const _CreateTaskSheet({
    required this.isDark,
    required this.clients,
    required this.project_types,
    required this.task_types,
    required this.api,
    required this.onTaskCreated,
  });

  @override
  State<_CreateTaskSheet> createState() => _CreateTaskSheetState();
}

class _CreateTaskSheetState extends State<_CreateTaskSheet> {
  final _formKey = GlobalKey<FormState>();
  final TextEditingController _titleController = TextEditingController();
  final TextEditingController _descController = TextEditingController();

  Map<String, dynamic>? _selectedClient;
  Map<String, dynamic>? _selectedProjectType;
  Map<String, dynamic>? _selectedTaskType;
  String _selectedPriority = 'Low';
  bool _submitting = false;

  @override
  Widget build(BuildContext context) {
    final isDark = widget.isDark;
    return Scaffold(
      backgroundColor: isDark ? AppColors.darkCanvas : AppColors.canvas,
      appBar: AppBar(title: const Text('Create New Task'), elevation: 0),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Title
              TextFormField(
                controller: _titleController,
                decoration: const InputDecoration(
                  labelText: 'Task Title *',
                  isDense: true,
                ),
                validator: (val) => val == null || val.trim().isEmpty
                    ? 'Title is required'
                    : null,
                style: TextStyle(
                  color: isDark ? AppColors.darkInk : AppColors.ink,
                ),
              ),
              const SizedBox(height: 12),

              // Description
              TextFormField(
                controller: _descController,
                decoration: const InputDecoration(
                  labelText: 'Task Description / User Story',
                  isDense: true,
                ),
                maxLines: 3,
                style: TextStyle(
                  color: isDark ? AppColors.darkInk : AppColors.ink,
                ),
              ),
              const SizedBox(height: 12),

              // Client Selector
              DropdownButtonFormField<Map<String, dynamic>>(
                decoration: const InputDecoration(
                  labelText: 'Client *',
                  isDense: true,
                ),
                initialValue: _selectedClient,
                dropdownColor: isDark ? AppColors.darkSurface1 : Colors.white,
                style: TextStyle(
                  color: isDark ? AppColors.darkInk : AppColors.ink,
                ),
                items: widget.clients.map((c) {
                  return DropdownMenuItem<Map<String, dynamic>>(
                    value: c,
                    child: Text(c['name'] ?? 'Unknown Client'),
                  );
                }).toList(),
                onChanged: (val) => setState(() => _selectedClient = val),
                validator: (val) => val == null ? 'Client is required' : null,
              ),
              const SizedBox(height: 12),

              // Project Type Selector
              DropdownButtonFormField<Map<String, dynamic>>(
                decoration: const InputDecoration(
                  labelText: 'Project Type *',
                  isDense: true,
                ),
                initialValue: _selectedProjectType,
                dropdownColor: isDark ? AppColors.darkSurface1 : Colors.white,
                style: TextStyle(
                  color: isDark ? AppColors.darkInk : AppColors.ink,
                ),
                items: widget.project_types.map((pt) {
                  return DropdownMenuItem<Map<String, dynamic>>(
                    value: pt,
                    child: Text(
                      pt['name'] ?? pt['title'] ?? 'Unknown Project Type',
                    ),
                  );
                }).toList(),
                onChanged: (val) => setState(() => _selectedProjectType = val),
                validator: (val) =>
                    val == null ? 'Project type is required' : null,
              ),
              const SizedBox(height: 12),

              // Task Type Selector
              DropdownButtonFormField<Map<String, dynamic>>(
                decoration: const InputDecoration(
                  labelText: 'Task Type *',
                  isDense: true,
                ),
                initialValue: _selectedTaskType,
                dropdownColor: isDark ? AppColors.darkSurface1 : Colors.white,
                style: TextStyle(
                  color: isDark ? AppColors.darkInk : AppColors.ink,
                ),
                items: widget.task_types.map((tt) {
                  return DropdownMenuItem<Map<String, dynamic>>(
                    value: tt,
                    child: Text(
                      tt['name'] ?? tt['title'] ?? 'Unknown Task Type',
                    ),
                  );
                }).toList(),
                onChanged: (val) => setState(() => _selectedTaskType = val),
                validator: (val) =>
                    val == null ? 'Task type is required' : null,
              ),
              const SizedBox(height: 12),

              // Priority Selector
              DropdownButtonFormField<String>(
                decoration: const InputDecoration(
                  labelText: 'Priority Level',
                  isDense: true,
                ),
                initialValue: _selectedPriority,
                dropdownColor: isDark ? AppColors.darkSurface1 : Colors.white,
                style: TextStyle(
                  color: isDark ? AppColors.darkInk : AppColors.ink,
                ),
                items: ['Low', 'Medium', 'High', 'Weekly Priority'].map((p) {
                  return DropdownMenuItem<String>(value: p, child: Text(p));
                }).toList(),
                onChanged: (val) =>
                    setState(() => _selectedPriority = val ?? 'Low'),
              ),
              const SizedBox(height: 20),

              // Submit Button
              _submitting
                  ? const Center(child: CircularProgressIndicator())
                  : SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.projectAccent,
                        ),
                        onPressed: _submit,
                        child: const Text(
                          'Create Task',
                          style: TextStyle(color: Colors.white),
                        ),
                      ),
                    ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _submitting = true);

    try {
      final userId = context.read<AuthProvider>().user?.id;
      final payload = {
        'title': _titleController.text.trim(),
        'userStory': _descController.text.trim(),
        'clientId': _selectedClient!['_id'],
        'projectTypeId': _selectedProjectType!['_id'],
        'taskTypeId': _selectedTaskType!['_id'],
        'priorityLevel': _selectedPriority,
        'status': 'Backlogs',
        'createdBy': userId,
        'assignedTo': [userId],
        'followers': [userId],
        'stageHistory': [
          {'stage': 'Backlogs', 'enteredAt': DateTime.now().toIso8601String()},
        ],
      };

      final response = await widget.api.createModel('tasks', payload);
      if (response.statusCode == 200) {
        Toast.success("Task created!");
        widget.onTaskCreated();
        Navigator.of(context).pop();
      }
    } catch (e) {
      Toast.error("Failed to create task");
    } finally {
      setState(() => _submitting = false);
    }
  }
}

// ─── TASK DETAILS SHEET (EDIT, COMMENT & FEED ACTIONS) ─────────────────────
class _TaskDetailsSheet extends StatefulWidget {
  final Map<String, dynamic> task;
  final bool isDark;
  final ApiService api;
  final VoidCallback onTaskUpdated;

  const _TaskDetailsSheet({
    required this.task,
    required this.isDark,
    required this.api,
    required this.onTaskUpdated,
  });

  @override
  State<_TaskDetailsSheet> createState() => _TaskDetailsSheetState();
}

class _TaskDetailsSheetState extends State<_TaskDetailsSheet> {
  final TextEditingController _commentController = TextEditingController();
  final TextEditingController _titleController = TextEditingController();
  final TextEditingController _descController = TextEditingController();

  Map<String, dynamic>? _commentsThreadDoc;
  List<Map<String, dynamic>> _milestones = [];
  Map<String, dynamic>? _selectedMilestone;
  List<String> _attachments = [];
  bool _loadingComments = false;
  bool _submittingComment = false;
  bool _editingTask = false;
  bool _following = false;

  // Editing comment details
  String? _editingCommentId;
  final TextEditingController _editCommentController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _titleController.text = widget.task['title'] ?? '';
    _descController.text = widget.task['userStory'] ?? '';
    final followersList = List<dynamic>.from(widget.task['followers'] ?? []);
    final userId = context.read<AuthProvider>().user?.id;
    _following = followersList.contains(userId);
    _attachments = List<String>.from(widget.task['attachments'] ?? []);

    _loadCacheAndFetchComments();
    _fetchMilestones();
  }

  Future<void> _loadCacheAndFetchComments() async {
    final taskId = widget.task['_id']?.toString() ?? '';
    if (taskId.isNotEmpty) {
      final cached = await LocalCache().get('cached_comments_task_$taskId');
      if (cached is Map && mounted) {
        setState(() {
          _commentsThreadDoc = Map<String, dynamic>.from(cached);
        });
      }
    }
    _fetchCommentsThread(isSilent: _commentsThreadDoc != null);
  }

  Future<void> _fetchMilestones() async {
    try {
      final res = await widget.api.readModel(
        'milestones',
        query: {
          'filter': {'clientId': widget.task['clientId']},
          'limit': 200,
        },
      );
      if (res.statusCode == 200 && res.data != null) {
        setState(() {
          _milestones = List<Map<String, dynamic>>.from(res.data['data'] ?? []);
          if (widget.task['milestoneId'] != null) {
            _selectedMilestone = _milestones.firstWhere(
              (m) => m['_id'] == widget.task['milestoneId'],
              orElse: () => <String, dynamic>{},
            );
            if (_selectedMilestone?.isEmpty ?? true) {
              _selectedMilestone = null;
            }
          }
        });
      }
    } catch (e) {
      debugPrint("Error loading milestones: $e");
    }
  }

  Future<void> _fetchCommentsThread({bool isSilent = false}) async {
    if (!isSilent) setState(() => _loadingComments = true);
    try {
      final query = {
        'filter': {'taskId': widget.task['_id']},
        'limit': 1,
      };
      final res = await widget.api.readModel('comments_threads', query: query);
      if (res.statusCode == 200 && res.data != null) {
        final List<dynamic> data = res.data['data'] ?? [];
        if (data.isNotEmpty && mounted) {
          final thread = Map<String, dynamic>.from(data.first);
          setState(() {
            _commentsThreadDoc = thread;
          });
          final taskId = widget.task['_id']?.toString() ?? '';
          if (taskId.isNotEmpty) {
            LocalCache().set('cached_comments_task_$taskId', thread);
          }
        }
      }
    } catch (e) {
      debugPrint("Error fetching task comments thread: $e");
    } finally {
      if (mounted) setState(() => _loadingComments = false);
    }
  }

  Future<void> _postComment({String? overrideText}) async {
    final text = overrideText ?? _commentController.text.trim();
    if (text.isEmpty) return;

    setState(() => _submittingComment = true);
    try {
      final userId = context.read<AuthProvider>().user?.id;
      final newComment = {
        'commentedBy': userId,
        'message': text,
        'attachments': [],
        'createdAt': DateTime.now().toIso8601String(),
      };

      if (_commentsThreadDoc == null) {
        final payload = {
          'taskId': widget.task['_id'],
          'comments': [newComment],
        };
        final res = await widget.api.createModel('comments_threads', payload);
        if (res.statusCode == 200) {
          _commentController.clear();
          _fetchCommentsThread();
        }
      } else {
        final List<dynamic> comments = List<dynamic>.from(
          _commentsThreadDoc!['comments'] ?? [],
        );
        comments.add(newComment);
        final res = await widget.api.updateModel(
          'comments_threads',
          _commentsThreadDoc!['_id'],
          {'comments': comments},
        );
        if (res.statusCode == 200) {
          _commentController.clear();
          _fetchCommentsThread();
        }
      }
    } catch (e) {
      Toast.error("Failed to add comment");
    } finally {
      setState(() => _submittingComment = false);
    }
  }

  Future<void> _updateComment(String commentId, String nextMessage) async {
    if (_commentsThreadDoc == null || nextMessage.trim().isEmpty) return;
    try {
      final List<dynamic> comments = List<dynamic>.from(
        _commentsThreadDoc!['comments'] ?? [],
      );
      final idx = comments.indexWhere((c) => c['_id'] == commentId);
      if (idx != -1) {
        comments[idx]['message'] = nextMessage.trim();
        comments[idx]['edited'] = true;
        comments[idx]['editedAt'] = DateTime.now().toIso8601String();

        final res = await widget.api.updateModel(
          'comments_threads',
          _commentsThreadDoc!['_id'],
          {'comments': comments},
        );
        if (res.statusCode == 200) {
          setState(() {
            _editingCommentId = null;
          });
          _fetchCommentsThread();
          Toast.success("Comment edited");
        }
      }
    } catch (e) {
      Toast.error("Failed to edit comment");
    }
  }

  Future<void> _toggleFollow() async {
    try {
      final userId = context.read<AuthProvider>().user?.id;
      final List<dynamic> followers = List<dynamic>.from(
        widget.task['followers'] ?? [],
      );
      if (_following) {
        followers.remove(userId);
      } else {
        followers.add(userId);
      }

      final res = await widget.api.updateModel('tasks', widget.task['_id'], {
        'followers': followers,
      });
      if (res.statusCode == 200) {
        setState(() {
          _following = !_following;
        });
        widget.onTaskUpdated();
        Toast.success(
          _following ? "Following task updates" : "Stopped following",
        );
      }
    } catch (e) {
      Toast.error("Failed to toggle follow status");
    }
  }

  Future<void> _saveTaskDetails() async {
    try {
      final updateData = {
        'title': _titleController.text.trim(),
        'userStory': _descController.text.trim(),
        'attachments': _attachments,
        if (_selectedMilestone != null)
          'milestoneId': _selectedMilestone!['_id'],
      };

      final res = await widget.api.updateModel(
        'tasks',
        widget.task['_id'],
        updateData,
      );
      if (res.statusCode == 200) {
        setState(() => _editingTask = false);
        widget.onTaskUpdated();
        Toast.success("Task details saved");
      }
    } catch (e) {
      Toast.error("Failed to save changes");
    }
  }

  Future<void> _addAttachment() async {
    try {
      FilePickerResult? result = await FilePicker.platform.pickFiles();
      if (result != null && result.files.single.path != null) {
        final path = result.files.single.name; // Mock name/path upload
        setState(() {
          _attachments.add(path);
        });
        Toast.success("Attachment selected: $path");
      }
    } catch (e) {
      debugPrint("Attachment selection error: $e");
    }
  }

  Future<void> _updateDeliveryStage(String stage) async {
    try {
      final res = await widget.api.updateModel('tasks', widget.task['_id'], {
        'deliveryStage': stage,
      });
      if (res.statusCode == 200) {
        widget.onTaskUpdated();
        _postComment(overrideText: "Moved task Delivery Stage to $stage");
        Toast.success("Delivery stage updated to $stage");
      }
    } catch (e) {
      Toast.error("Failed to update delivery stage");
    }
  }

  @override
  Widget build(BuildContext context) {
    final task = widget.task;
    final isDark = widget.isDark;

    // Parse comments
    final List<dynamic> comments = _commentsThreadDoc != null
        ? (_commentsThreadDoc!['comments'] ?? [])
        : [];

    final userId = context.read<AuthProvider>().user?.id;

    return Scaffold(
      backgroundColor: isDark ? AppColors.darkCanvas : AppColors.canvas,
      appBar: AppBar(title: const Text('Task Details'), elevation: 0),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header title with actions
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: _editingTask
                      ? TextFormField(
                          controller: _titleController,
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: isDark ? AppColors.darkInk : AppColors.ink,
                          ),
                          decoration: const InputDecoration(
                            isDense: true,
                            labelText: 'Task Title',
                          ),
                        )
                      : Text(
                          task['title'] ?? 'Task details',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: isDark ? AppColors.darkInk : AppColors.ink,
                          ),
                        ),
                ),

                // Actions Group
                Row(
                  children: [
                    IconButton(
                      icon: Icon(
                        _following
                            ? Icons.star_rounded
                            : Icons.star_outline_rounded,
                        color: _following
                            ? Colors.amber
                            : (isDark
                                  ? AppColors.darkInkSubtle
                                  : AppColors.inkSubtle),
                      ),
                      onPressed: _toggleFollow,
                    ),
                    IconButton(
                      icon: Icon(
                        _editingTask
                            ? Icons.check_circle_outline_rounded
                            : Icons.edit_rounded,
                        color: isDark ? AppColors.darkInk : AppColors.ink,
                      ),
                      onPressed: () {
                        if (_editingTask) {
                          _saveTaskDetails();
                        } else {
                          setState(() => _editingTask = true);
                        }
                      },
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 8),

            // Redirect Link to tickets if linked
            if (task['linkedTicketId'] != null) ...[
              InkWell(
                onTap: () {
                  Navigator.of(context).pop();
                  context.read<NavigationProvider>().navigateTo(
                    NavPage.tickets,
                  );
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 6,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.blue.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.link_rounded, size: 14, color: Colors.blue),
                      SizedBox(width: 6),
                      Text(
                        'Linked Ticket (Click to view tickets)',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: Colors.blue,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 12),
            ],

            // Description / User Story
            Text(
              'Description / User Story',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.bold,
                color: isDark ? AppColors.darkInkSubtle : AppColors.inkSubtle,
              ),
            ),
            const SizedBox(height: 4),
            _editingTask
                ? TextFormField(
                    controller: _descController,
                    style: TextStyle(
                      fontSize: 13,
                      color: isDark ? AppColors.darkInk : AppColors.ink,
                    ),
                    maxLines: 3,
                    decoration: const InputDecoration(isDense: true),
                  )
                : Text(
                    task['userStory'] ?? 'No description provided.',
                    style: TextStyle(
                      fontSize: 13,
                      color: isDark ? AppColors.darkInk : AppColors.ink,
                    ),
                  ),
            const SizedBox(height: 16),

            // Milestone Selector
            if (_editingTask) ...[
              DropdownButtonFormField<Map<String, dynamic>>(
                decoration: const InputDecoration(
                  labelText: 'Milestone',
                  isDense: true,
                ),
                initialValue: _selectedMilestone,
                dropdownColor: isDark ? AppColors.darkSurface1 : Colors.white,
                style: TextStyle(
                  color: isDark ? AppColors.darkInk : AppColors.ink,
                ),
                items: _milestones.map((m) {
                  return DropdownMenuItem<Map<String, dynamic>>(
                    value: m,
                    child: Text(m['name'] ?? 'Unknown Milestone'),
                  );
                }).toList(),
                onChanged: (val) => setState(() => _selectedMilestone = val),
              ),
              const SizedBox(height: 12),
            ] else if (task['milestoneId'] != null) ...[
              Text(
                'Milestone',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  color: isDark ? AppColors.darkInkSubtle : AppColors.inkSubtle,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                _selectedMilestone?['name'] ?? 'Assigned Milestone',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.bold,
                  color: isDark ? AppColors.darkInk : AppColors.ink,
                ),
              ),
              const SizedBox(height: 16),
            ],

            // Delivery Maturity Stage Dropdown
            Text(
              'Delivery Stage',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.bold,
                color: isDark ? AppColors.darkInkSubtle : AppColors.inkSubtle,
              ),
            ),
            const SizedBox(height: 6),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children:
                  [
                    'Development',
                    'QAT',
                    'Review',
                    'Deployment',
                    'Delivery',
                  ].map((stage) {
                    final isCurrent = task['deliveryStage'] == stage;
                    return ChoiceChip(
                      label: Text(stage, style: const TextStyle(fontSize: 11)),
                      selected: isCurrent,
                      selectedColor: AppColors.projectAccent,
                      onSelected: (selected) {
                        if (selected) {
                          _updateDeliveryStage(stage);
                        }
                      },
                    );
                  }).toList(),
            ),
            const SizedBox(height: 20),

            // Attachments
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Attachments',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: isDark
                        ? AppColors.darkInkSubtle
                        : AppColors.inkSubtle,
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.add_circle_outline_rounded, size: 18),
                  onPressed: _addAttachment,
                ),
              ],
            ),
            if (_attachments.isNotEmpty)
              Wrap(
                spacing: 8,
                children: _attachments.map((a) {
                  return InputChip(
                    label: Text(a, style: const TextStyle(fontSize: 10)),
                    onPressed: () {
                      final url = a.startsWith('http')
                          ? a
                          : '${ApiConfig.baseUrl}/files/serve/$a';
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (context) =>
                              FileViewerPage(fileUrl: url, fileName: a),
                        ),
                      );
                    },
                    onDeleted: () {
                      setState(() {
                        _attachments.remove(a);
                      });
                      _saveTaskDetails();
                    },
                  );
                }).toList(),
              )
            else
              const Text(
                'No files attached.',
                style: TextStyle(fontSize: 11, color: Colors.grey),
              ),
            const SizedBox(height: 20),

            // Comments List
            Text(
              'Comments Thread',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                color: isDark ? AppColors.darkInkSubtle : AppColors.inkSubtle,
              ),
            ),
            const SizedBox(height: 8),

            _loadingComments
                ? const Center(child: CircularProgressIndicator(strokeWidth: 2))
                : comments.isEmpty
                ? const Padding(
                    padding: EdgeInsets.symmetric(vertical: 12.0),
                    child: Text(
                      'No comments yet.',
                      style: TextStyle(fontSize: 12, color: Colors.grey),
                    ),
                  )
                : ListView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: comments.length,
                    itemBuilder: (context, idx) {
                      final c = comments[idx];
                      final msg = c['message'] ?? '';
                      final cBy = c['commentedBy'];
                      final isMe = cBy == userId;

                      // 5 minutes time limit check for edit capabilities
                      DateTime? cDate;
                      if (c['createdAt'] != null) {
                        cDate = DateTime.tryParse(c['createdAt']);
                      }
                      final isEditable =
                          isMe &&
                          cDate != null &&
                          DateTime.now().difference(cDate.toLocal()).inMinutes <
                              5;

                      return Padding(
                        padding: const EdgeInsets.only(bottom: 8.0),
                        child: Column(
                          crossAxisAlignment: isMe
                              ? CrossAxisAlignment.end
                              : CrossAxisAlignment.start,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 10,
                                vertical: 8,
                              ),
                              decoration: BoxDecoration(
                                color: isMe
                                    ? AppColors.projectAccent.withValues(
                                        alpha: 0.1,
                                      )
                                    : (isDark
                                          ? AppColors.darkSurface1
                                          : Colors.grey[100]),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: _editingCommentId == c['_id']
                                  ? Row(
                                      children: [
                                        Expanded(
                                          child: TextField(
                                            controller: _editCommentController,
                                            style: const TextStyle(
                                              fontSize: 12,
                                            ),
                                          ),
                                        ),
                                        IconButton(
                                          icon: const Icon(
                                            Icons.check,
                                            size: 16,
                                          ),
                                          onPressed: () => _updateComment(
                                            c['_id'],
                                            _editCommentController.text,
                                          ),
                                        ),
                                      ],
                                    )
                                  : Text(
                                      msg,
                                      style: TextStyle(
                                        fontSize: 12,
                                        color: isDark
                                            ? AppColors.darkInk
                                            : AppColors.ink,
                                      ),
                                    ),
                            ),
                            if (isEditable && _editingCommentId != c['_id'])
                              TextButton(
                                style: TextButton.styleFrom(
                                  padding: EdgeInsets.zero,
                                  minimumSize: const Size(40, 20),
                                  tapTargetSize:
                                      MaterialTapTargetSize.shrinkWrap,
                                ),
                                onPressed: () {
                                  setState(() {
                                    _editingCommentId = c['_id'];
                                    _editCommentController.text = msg;
                                  });
                                },
                                child: const Text(
                                  'Edit (5m limit)',
                                  style: TextStyle(
                                    fontSize: 10,
                                    color: Colors.blue,
                                  ),
                                ),
                              ),
                          ],
                        ),
                      );
                    },
                  ),
            const SizedBox(height: 12),

            // Post Comment Box
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _commentController,
                    decoration: InputDecoration(
                      hintText: 'Type a reply...',
                      hintStyle: TextStyle(
                        color: isDark
                            ? AppColors.darkInkSubtle
                            : AppColors.inkSubtle,
                        fontSize: 13,
                      ),
                      isDense: true,
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 10,
                      ),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: BorderSide(
                          color: isDark
                              ? AppColors.darkBorder
                              : AppColors.border,
                        ),
                      ),
                    ),
                    style: TextStyle(
                      color: isDark ? AppColors.darkInk : AppColors.ink,
                      fontSize: 13,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                _submittingComment
                    ? const SizedBox(
                        width: 36,
                        height: 36,
                        child: Padding(
                          padding: EdgeInsets.all(8.0),
                          child: CircularProgressIndicator(strokeWidth: 2),
                        ),
                      )
                    : IconButton(
                        onPressed: () => _postComment(),
                        icon: const Icon(
                          Icons.send_rounded,
                          color: AppColors.projectAccent,
                        ),
                      ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

// Global short Toast indicator helper
class Toast {
  static void success(String msg) {
    debugPrint("[SUCCESS Toast]: $msg");
  }

  static void error(String msg) {
    debugPrint("[ERROR Toast]: $msg");
  }
}
