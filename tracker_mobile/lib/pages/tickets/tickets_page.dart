import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:file_picker/file_picker.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../providers/auth_provider.dart';
import '../../providers/navigation_provider.dart';
import '../../services/api.dart';
import '../../services/cache_manager.dart';
import '../../core/theme/app_theme.dart';
import '../../core/api_config.dart';
import '../../core/widgets/file_viewer.dart';
import '../../core/widgets/shimmer_loading.dart';
import 'ticket_chat_page.dart';

class TicketsPage extends StatefulWidget {
  const TicketsPage({super.key});

  @override
  State<TicketsPage> createState() => _TicketsPageState();
}

class _TicketsPageState extends State<TicketsPage> {
  final ApiService _api = ApiService();
  bool _loading = true;
  List<Map<String, dynamic>> _tickets = [];
  String _statusFilter = 'All';

  @override
  void initState() {
    super.initState();
    _loadCacheAndFetch();
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

  Future<void> _loadCacheAndFetch() async {
    final cached = await LocalCache().get('cached_tickets');
    if (cached is List && cached.isNotEmpty && mounted) {
      setState(() {
        _tickets = List<Map<String, dynamic>>.from(cached);
      });
      _fetchTickets(isSilent: true);
    } else {
      _fetchTickets(isSilent: false);
    }
  }

  Future<void> _fetchTickets({bool isSilent = false}) async {
    if (!mounted) return;
    if (!isSilent) setState(() => _loading = true);

    try {
      final auth = context.read<AuthProvider>();
      final userId = auth.user?.id;
      final userType = auth.user?.userType ?? 'employee';

      // Build target filters
      Map<String, dynamic> filter = {};
      if (auth.user?.role != 'superadmin') {
        if (userType == 'agent') {
          filter = {'createdBy': userId, 'createdByModel': 'agents'};
        } else {
          filter = {
            '\$or': [
              {'assignedTo': userId},
              {'createdBy': userId, 'createdByModel': 'employees'},
            ],
          };
        }
      }

      final query = {
        'limit': 100,
        'sort': {'createdAt': -1},
        'populateFields': {
          'assignedTo':
              'basicInfo.firstName,basicInfo.lastName,workEmail,workPhone',
          'createdBy': 'basicInfo.firstName,basicInfo.lastName,workEmail',
        },
        'filter': filter,
      };

      final response = await _api.readModel('tickets', query: query);
      if (response.statusCode == 200 && response.data != null) {
        final List<dynamic> data = response.data['data'] ?? [];
        if (mounted) {
          setState(() {
            _tickets = List<Map<String, dynamic>>.from(data);
          });
          LocalCache().set('cached_tickets', data);
        }
      }
    } catch (e) {
      debugPrint("Error fetching tickets in mobile: $e");
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    // Filtered lists
    final filteredTickets = _statusFilter == 'All'
        ? _tickets
        : _tickets.where((t) => t['status'] == _statusFilter).toList();

    return Scaffold(
      backgroundColor: isDark ? AppColors.darkCanvas : AppColors.canvas,
      body: Column(
        children: [
          // Filter Chips Row
          _buildFilterChips(isDark),

          // Ticket List view
          Expanded(
            child: _loading
                ? ShimmerLoading.list()
                : filteredTickets.isEmpty
                ? _buildEmptyState(isDark)
                : RefreshIndicator(
                    onRefresh: _fetchTickets,
                    color: AppColors.hrAccent,
                    child: ListView.builder(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 12,
                      ),
                      itemCount: filteredTickets.length,
                      itemBuilder: (context, idx) {
                        final ticket = filteredTickets[idx];
                        return _buildTicketCard(ticket, isDark);
                      },
                    ),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChips(bool isDark) {
    final filters = ['All', 'Open', 'In Progress', 'Resolved', 'Closed'];
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
              selectedColor: AppColors.hrAccent,
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

  Widget _buildTicketCard(Map<String, dynamic> ticket, bool isDark) {
    final tktId = ticket['ticketId'] ?? 'TKT';
    final title = ticket['title'] ?? 'Untitled Ticket';
    final status = ticket['status'] ?? 'Open';
    final priority = ticket['priority'] ?? 'Medium';

    Color statusColor = AppColors.hrAccent;
    if (status == 'Resolved' || status == 'Closed') statusColor = Colors.green;
    if (status == 'In Progress') statusColor = Colors.purple;

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
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => TicketChatPage(
                ticketId: tktId.toString(),
                title: title.toString(),
                initialStatus: status.toString(),
                priority: priority.toString(),
              ),
            ),
          );
        },
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
                      color: priority == 'Critical' || priority == 'High'
                          ? Colors.red.withValues(alpha: 0.1)
                          : Colors.blue.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      '$tktId • $priority',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: priority == 'Critical' || priority == 'High'
                            ? Colors.red
                            : Colors.blue,
                      ),
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
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
              const SizedBox(height: 12),
              Text(
                title,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: isDark ? AppColors.darkInk : AppColors.ink,
                ),
              ),
              if (ticket['description'] != null) ...[
                const SizedBox(height: 6),
                Text(
                  ticket['description'].toString(),
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
              if (ticket['dueDate'] != null ||
                  ticket['etaEstimatedDelivery'] != null) ...[
                const SizedBox(height: 12),
                Divider(
                  height: 1,
                  thickness: 0.5,
                  color: isDark ? AppColors.darkBorder : AppColors.border,
                ),
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    if (ticket['dueDate'] != null)
                      Row(
                        children: [
                          Icon(
                            Icons.calendar_month_outlined,
                            size: 11,
                            color: isDark
                                ? AppColors.darkInkSubtle
                                : AppColors.inkSubtle,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            'Due: ${_formatProjectedDate(ticket['dueDate'])}',
                            style: TextStyle(
                              fontSize: 10,
                              color: isDark
                                  ? AppColors.darkInkSubtle
                                  : AppColors.inkSubtle,
                            ),
                          ),
                        ],
                      )
                    else
                      const SizedBox(),

                    if (ticket['etaEstimatedDelivery'] != null)
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 6,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: AppColors.success.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Row(
                          children: [
                            const Icon(
                              Icons.timer_outlined,
                              size: 10,
                              color: AppColors.success,
                            ),
                            const SizedBox(width: 4),
                            Text(
                              'ETA: ${_formatProjectedDate(ticket['etaEstimatedDelivery'])}',
                              style: const TextStyle(
                                fontSize: 9,
                                fontWeight: FontWeight.bold,
                                color: AppColors.success,
                              ),
                            ),
                          ],
                        ),
                      ),
                  ],
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
            Icons.chat_bubble_outline_rounded,
            size: 48,
            color: isDark ? AppColors.darkInkSubtle : AppColors.inkSubtle,
          ),
          const SizedBox(height: 12),
          Text(
            'No tickets found for $_statusFilter',
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

}

// ─── TICKET DETAILS & COMMENTS SUB-WIDGET ──────────────────────────────────
class _TicketDetailsSheet extends StatefulWidget {
  final Map<String, dynamic> ticket;
  final bool isDark;
  final ApiService api;
  final VoidCallback onStatusChanged;

  const _TicketDetailsSheet({
    required this.ticket,
    required this.isDark,
    required this.api,
    required this.onStatusChanged,
  });

  @override
  State<_TicketDetailsSheet> createState() => _TicketDetailsSheetState();
}

class _TicketDetailsSheetState extends State<_TicketDetailsSheet> {
  final TextEditingController _commentController = TextEditingController();
  final TextEditingController _titleController = TextEditingController();
  final TextEditingController _descController = TextEditingController();

  List<Map<String, dynamic>> _comments = [];
  List<String> _attachments = [];
  bool _loadingComments = false;
  bool _submittingComment = false;
  bool _editingTicket = false;

  String? _editingCommentId;
  final TextEditingController _editCommentController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _titleController.text = widget.ticket['title'] ?? '';
    _descController.text = widget.ticket['description'] ?? '';
    _attachments = List<String>.from(widget.ticket['attachments'] ?? []);
    _fetchComments();
  }

  Future<void> _fetchComments() async {
    setState(() => _loadingComments = true);
    try {
      final query = {
        'limit': 100,
        'sort': {'createdAt': 1},
        'filter': {'ticketId': widget.ticket['_id']},
      };
      final response = await widget.api.readModel(
        'ticket_comments',
        query: query,
      );
      if (response.statusCode == 200 && response.data != null) {
        final List<dynamic> data = response.data['data'] ?? [];
        setState(() {
          _comments = List<Map<String, dynamic>>.from(data);
        });
      }
    } catch (e) {
      debugPrint("Error loading comments: $e");
    } finally {
      setState(() => _loadingComments = false);
    }
  }

  Future<void> _postComment() async {
    final text = _commentController.text.trim();
    if (text.isEmpty) return;

    setState(() => _submittingComment = true);
    try {
      final auth = context.read<AuthProvider>();
      final userId = auth.user?.id;
      final userType = auth.user?.userType ?? 'employee';

      final commentData = {
        'ticketId': widget.ticket['_id'],
        'commentedBy': userId,
        'commenterModel': userType == 'employee' ? 'employees' : 'agents',
        'message': text,
        'isPublic': true,
      };

      final response = await widget.api.createModel(
        'ticket_comments',
        commentData,
      );
      if (response.statusCode == 200) {
        _commentController.clear();
        _fetchComments();
      }
    } catch (e) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Failed to submit comment')));
    } finally {
      setState(() => _submittingComment = false);
    }
  }

  Future<void> _updateComment(String commentId, String nextMessage) async {
    if (nextMessage.trim().isEmpty) return;
    try {
      final response = await widget.api
          .updateModel('ticket_comments', commentId, {
            'message': nextMessage.trim(),
            'edited': true,
            'editedAt': DateTime.now().toIso8601String(),
          });
      if (response.statusCode == 200) {
        setState(() {
          _editingCommentId = null;
        });
        _fetchComments();
      }
    } catch (e) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Failed to edit comment')));
    }
  }

  Future<void> _saveTicketDetails() async {
    try {
      final response = await widget.api
          .updateModel('tickets', widget.ticket['_id'], {
            'title': _titleController.text.trim(),
            'description': _descController.text.trim(),
            'attachments': _attachments,
          });
      if (response.statusCode == 200) {
        setState(() => _editingTicket = false);
        widget.onStatusChanged();
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to update ticket details')),
      );
    }
  }

  Future<void> _addAttachment() async {
    try {
      FilePickerResult? result = await FilePicker.platform.pickFiles();
      if (result != null && result.files.single.path != null) {
        final path = result.files.single.name;
        setState(() {
          _attachments.add(path);
        });
        _saveTicketDetails();
      }
    } catch (e) {
      debugPrint("Attachment select error: $e");
    }
  }

  @override
  Widget build(BuildContext context) {
    final ticket = widget.ticket;
    final isDark = widget.isDark;
    final userId = context.read<AuthProvider>().user?.id;
    final isAgent = context.read<AuthProvider>().user?.userType == 'agent';

    return Padding(
      padding: EdgeInsets.only(
        top: 20,
        left: 20,
        right: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 30,
      ),
      child: Container(
        constraints: BoxConstraints(
          maxHeight: MediaQuery.of(context).size.height * 0.85,
        ),
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header title with actions
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: _editingTicket
                        ? TextFormField(
                            controller: _titleController,
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: isDark ? AppColors.darkInk : AppColors.ink,
                            ),
                            decoration: const InputDecoration(
                              isDense: true,
                              labelText: 'Ticket Title',
                            ),
                          )
                        : Text(
                            ticket['title'] ?? 'Ticket details',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: isDark ? AppColors.darkInk : AppColors.ink,
                            ),
                          ),
                  ),
                  IconButton(
                    icon: Icon(
                      _editingTicket
                          ? Icons.check_circle_outline_rounded
                          : Icons.edit_rounded,
                      color: isDark ? AppColors.darkInk : AppColors.ink,
                    ),
                    onPressed: () {
                      if (_editingTicket) {
                        _saveTicketDetails();
                      } else {
                        setState(() => _editingTicket = true);
                      }
                    },
                  ),
                ],
              ),
              const SizedBox(height: 8),

              // Redirect Link to linkedTaskId task if it exists
              if (ticket['linkedTaskId'] != null) ...[
                InkWell(
                  onTap: () {
                    Navigator.of(context).pop();
                    context.read<NavigationProvider>().navigateTo(
                      NavPage.tasks,
                    );
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.green.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.assignment_turned_in_rounded,
                          size: 14,
                          color: Colors.green,
                        ),
                        SizedBox(width: 6),
                        Text(
                          'Linked Task (Click to view tasks)',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: Colors.green,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 12),
              ],

              // Description
              Text(
                'Description',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  color: isDark ? AppColors.darkInkSubtle : AppColors.inkSubtle,
                ),
              ),
              const SizedBox(height: 4),
              _editingTicket
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
                      ticket['description'] ?? 'No description provided.',
                      style: TextStyle(
                        fontSize: 13,
                        color: isDark ? AppColors.darkInk : AppColors.ink,
                      ),
                    ),
              const SizedBox(height: 16),

              // Contacts Section
              Text(
                'Assignees & Contacts',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  color: isDark ? AppColors.darkInkSubtle : AppColors.inkSubtle,
                ),
              ),
              const SizedBox(height: 6),
              _buildContactSection(ticket, isDark),
              const SizedBox(height: 16),

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
                    icon: const Icon(
                      Icons.add_circle_outline_rounded,
                      size: 18,
                    ),
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
                        _saveTicketDetails();
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

              // Status Selector Chips
              Text(
                'Status',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  color: isDark ? AppColors.darkInkSubtle : AppColors.inkSubtle,
                ),
              ),
              const SizedBox(height: 6),
              isAgent
                  ? Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.brandSolid.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        ticket['status'] ?? 'Open',
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: AppColors.brandSolid,
                        ),
                      ),
                    )
                  : Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: ['Open', 'In Progress', 'Resolved', 'Closed']
                          .map((s) {
                            return ChoiceChip(
                              label: Text(
                                s,
                                style: const TextStyle(fontSize: 11),
                              ),
                              selected: ticket['status'] == s,
                              onSelected: (selected) {
                                if (selected) {
                                  Navigator.of(context).pop();
                                  widget.api
                                      .updateModel('tickets', ticket['_id'], {
                                        'status': s,
                                      })
                                      .then((res) {
                                        if (res.statusCode == 200) {
                                          widget.onStatusChanged();
                                        }
                                      });
                                }
                              },
                            );
                          })
                          .toList(),
                    ),
              const SizedBox(height: 20),

              // Comments Feed Timeline
              Text(
                'Comments & Activity Feed',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: isDark ? AppColors.darkInkSubtle : AppColors.inkSubtle,
                ),
              ),
              const SizedBox(height: 8),

              Container(
                constraints: const BoxConstraints(maxHeight: 180),
                child: _loadingComments
                    ? const Center(
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : _comments.isEmpty
                    ? const Padding(
                        padding: EdgeInsets.symmetric(vertical: 12.0),
                        child: Text(
                          'No comments yet.',
                          style: TextStyle(fontSize: 12, color: Colors.grey),
                        ),
                      )
                    : ListView.builder(
                        shrinkWrap: true,
                        itemCount: _comments.length,
                        itemBuilder: (context, idx) {
                          final c = _comments[idx];
                          final msg = c['message'] ?? '';
                          final isAgent = c['commenterModel'] == 'agents';
                          final isMe = c['commentedBy'] == userId;

                          // 5-minute time limit check for edit capabilities
                          DateTime? cDate;
                          if (c['createdAt'] != null) {
                            cDate = DateTime.tryParse(c['createdAt']);
                          }
                          final isEditable =
                              isMe &&
                              cDate != null &&
                              DateTime.now()
                                      .difference(cDate.toLocal())
                                      .inMinutes <
                                  5;

                          return Padding(
                            padding: const EdgeInsets.only(bottom: 8.0),
                            child: Align(
                              alignment: isAgent
                                  ? Alignment.centerLeft
                                  : Alignment.centerRight,
                              child: Column(
                                crossAxisAlignment: isAgent
                                    ? CrossAxisAlignment.start
                                    : CrossAxisAlignment.end,
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 10,
                                      vertical: 8,
                                    ),
                                    decoration: BoxDecoration(
                                      color: isAgent
                                          ? (isDark
                                                ? AppColors.darkSurface1
                                                : Colors.grey[100])
                                          : AppColors.hrAccent.withValues(
                                              alpha: 0.1,
                                            ),
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: _editingCommentId == c['_id']
                                        ? Row(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              SizedBox(
                                                width: 140,
                                                child: TextField(
                                                  controller:
                                                      _editCommentController,
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
                                  if (isEditable &&
                                      _editingCommentId != c['_id'])
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
                            ),
                          );
                        },
                      ),
              ),
              const SizedBox(height: 12),

              // Comment reply composer
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
                          onPressed: _postComment,
                          icon: const Icon(
                            Icons.send_rounded,
                            color: AppColors.hrAccent,
                          ),
                        ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildContactSection(Map<String, dynamic> ticket, bool isDark) {
    final List<dynamic> assignees = ticket['assignedTo'] is List
        ? ticket['assignedTo']
        : [];
    final creator = ticket['createdBy'];

    // Quick method to call phone or email
    void launchAction(String scheme, String target) async {
      final uri = Uri.parse('$scheme:$target');
      try {
        if (await canLaunchUrl(uri)) {
          await launchUrl(uri);
        }
      } catch (_) {}
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Assignees List
        if (assignees.isEmpty)
          Text(
            'Unassigned',
            style: TextStyle(
              fontSize: 12,
              fontStyle: FontStyle.italic,
              color: isDark ? AppColors.darkInkSubtle : AppColors.inkSubtle,
            ),
          )
        else
          ...assignees.map((a) {
            if (a is! Map) return const SizedBox.shrink();
            final name = a['basicInfo'] != null
                ? '${a['basicInfo']['firstName'] ?? ''} ${a['basicInfo']['lastName'] ?? ''}'
                      .trim()
                : 'Team Member';
            final email = a['workEmail']?.toString() ?? '';
            final phone = a['workPhone']?.toString() ?? '';

            return Card(
              elevation: 0,
              margin: const EdgeInsets.only(bottom: 8),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
                side: BorderSide(
                  color: isDark ? AppColors.darkBorder : AppColors.border,
                ),
              ),
              color: isDark ? AppColors.darkSurface1 : Colors.grey[50],
              child: ListTile(
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 4,
                ),
                title: Text(
                  name,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                subtitle: email.isNotEmpty
                    ? Text(
                        email,
                        style: const TextStyle(
                          fontSize: 10,
                          color: Colors.grey,
                        ),
                      )
                    : null,
                trailing: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (email.isNotEmpty)
                      IconButton(
                        icon: const Icon(
                          Icons.mail_outline_rounded,
                          size: 18,
                          color: AppColors.brandSolid,
                        ),
                        onPressed: () => launchAction('mailto', email),
                      ),
                    if (phone.isNotEmpty)
                      IconButton(
                        icon: const Icon(
                          Icons.phone_outlined,
                          size: 18,
                          color: Colors.green,
                        ),
                        onPressed: () => launchAction('tel', phone),
                      ),
                  ],
                ),
              ),
            );
          }),

        // Creator card
        if (creator is Map) ...[
          const SizedBox(height: 10),
          const Divider(height: 1),
          const SizedBox(height: 10),
          Text(
            'Created By',
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.bold,
              color: isDark ? AppColors.darkInkSubtle : AppColors.inkSubtle,
            ),
          ),
          const SizedBox(height: 4),
          Builder(
            builder: (context) {
              final name = creator['basicInfo'] != null
                  ? '${creator['basicInfo']['firstName'] ?? ''} ${creator['basicInfo']['lastName'] ?? ''}'
                        .trim()
                  : 'Client/User';
              final email = creator['workEmail']?.toString() ?? '';

              return Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        name,
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      if (email.isNotEmpty)
                        Text(
                          email,
                          style: const TextStyle(
                            fontSize: 10,
                            color: Colors.grey,
                          ),
                        ),
                    ],
                  ),
                  if (email.isNotEmpty)
                    IconButton(
                      icon: const Icon(
                        Icons.mail_outline_rounded,
                        size: 18,
                        color: AppColors.brandSolid,
                      ),
                      onPressed: () => launchAction('mailto', email),
                    ),
                ],
              );
            },
          ),
        ],
      ],
    );
  }
}
