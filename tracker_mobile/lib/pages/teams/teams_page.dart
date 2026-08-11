import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher_string.dart';
import '../../providers/auth_provider.dart';
import '../../services/api.dart';
import '../../services/chat_service.dart';
import '../../core/theme/app_theme.dart';

class TeamsPage extends StatefulWidget {
  const TeamsPage({super.key});

  @override
  State<TeamsPage> createState() => _TeamsPageState();
}

class _TeamsPageState extends State<TeamsPage> {
  final ApiService _api = ApiService();
  bool _loading = true;
  List<dynamic> _employees = [];
  List<dynamic> _attendances = [];
  String _viewMode = 'grid'; // 'grid' or 'tree'
  String _selectedDept = 'all';

  @override
  void initState() {
    super.initState();
    _fetchTeamsData();
  }

  Future<void> _fetchTeamsData() async {
    if (!mounted) return;
    setState(() => _loading = true);

    try {
      final empRes = await _api.readModel(
        'employees',
        query: {
          'filter': {'status': 'Active'},
          'limit': 1000,
        },
      );

      final todayStr = DateTime.now().toIso8601String().split('T')[0];
      final attRes = await _api.readModel(
        'attendances',
        query: {
          'filter': {'dateStr': todayStr},
          'limit': 1000,
        },
      );

      if (mounted) {
        setState(() {
          _employees = empRes.data['data'] ?? [];
          _attendances = attRes.data['data'] ?? [];
          _loading = false;
        });
      }
    } catch (e) {
      debugPrint("Error fetching teams data: $e");
      if (mounted) setState(() => _loading = false);
    }
  }

  // Determine current active/attendance status of employee
  Map<String, dynamic> _getLiveStatus(String empId) {
    final att = _attendances.firstWhere(
      (a) =>
          (a['employeeId'] is Map ? a['employeeId']['_id'] : a['employeeId']) ==
          empId,
      orElse: () => null,
    );

    if (att == null) {
      return {
        'label': 'Offline',
        'color': Colors.blueGrey,
        'icon': Icons.circle,
      };
    }
    if (att['checkOut'] != null) {
      return {
        'label': 'Checked Out',
        'color': Colors.amber,
        'icon': Icons.circle,
      };
    }
    if (att['status'] == 'On Break') {
      return {
        'label': 'On Break',
        'color': Colors.orange,
        'icon': Icons.coffee_rounded,
      };
    }
    return {
      'label': 'Present',
      'color': Colors.green,
      'icon': Icons.check_circle_rounded,
    };
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final user = context.read<AuthProvider>().user;

    // Extract all unique departments
    final depts = <String, String>{};
    for (var emp in _employees) {
      final dept = emp['professionalInfo']?['department'];
      if (dept != null && dept is Map) {
        depts[dept['_id']] = dept['name'] ?? 'General';
      }
    }

    // Group employees by department
    final grouped = <String, Map<String, dynamic>>{};
    for (var emp in _employees) {
      final dept = emp['professionalInfo']?['department'];
      final deptId = dept != null && dept is Map ? dept['_id'] : 'no-dept';
      final deptName = dept != null && dept is Map ? dept['name'] : 'General';

      if (!grouped.containsKey(deptId)) {
        grouped[deptId] = {'id': deptId, 'name': deptName, 'members': []};
      }

      final status = _getLiveStatus(emp['_id']);
      grouped[deptId]!['members'].add({...emp, 'liveStatus': status});
    }

    final activeGroups = grouped.values.where((g) {
      if (_selectedDept == 'all') return true;
      return g['id'] == _selectedDept;
    }).toList();

    return Scaffold(
      backgroundColor: isDark ? AppColors.darkCanvas : AppColors.canvas,
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                // Control filter bar
                _buildControlBar(isDark, depts),

                Expanded(
                  child: ListView.builder(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 12,
                    ),
                    itemCount: activeGroups.length,
                    itemBuilder: (context, index) {
                      final group = activeGroups[index];
                      final name = group['name'] as String;
                      final members = group['members'] as List;

                      return Container(
                        margin: const EdgeInsets.only(bottom: 16),
                        decoration: BoxDecoration(
                          color: isDark ? AppColors.darkSurface0 : Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: isDark
                                ? AppColors.darkBorder
                                : AppColors.border,
                          ),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Department title
                            Padding(
                              padding: const EdgeInsets.all(16.0),
                              child: Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    name,
                                    style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 15,
                                      color: isDark
                                          ? AppColors.darkInk
                                          : AppColors.ink,
                                    ),
                                  ),
                                  Text(
                                    '${members.length} members',
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
                            const Divider(height: 1),

                            // Members view
                            _viewMode == 'grid'
                                ? _buildMembersList(members, user?.id, isDark)
                                : _buildTreeHierarchy(
                                    members,
                                    user?.id,
                                    isDark,
                                  ),
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

  // Visual control toggle headers
  Widget _buildControlBar(bool isDark, Map<String, String> depts) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkSurface0 : Colors.white,
        border: Border(
          bottom: BorderSide(
            color: isDark ? AppColors.darkBorder : AppColors.border,
          ),
        ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          // Department filter dropdown
          DropdownButton<String>(
            value: _selectedDept,
            dropdownColor: isDark ? AppColors.darkSurface0 : Colors.white,
            underline: const SizedBox(),
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.bold,
              color: isDark ? AppColors.darkInk : AppColors.ink,
            ),
            items: [
              const DropdownMenuItem(
                value: 'all',
                child: Text('All Departments'),
              ),
              ...depts.entries.map(
                (d) => DropdownMenuItem(value: d.key, child: Text(d.value)),
              ),
            ],
            onChanged: (val) {
              if (val != null) {
                setState(() => _selectedDept = val);
              }
            },
          ),

          // Grid vs Tree Toggle
          Row(
            children: [
              IconButton(
                icon: Icon(
                  Icons.grid_view_rounded,
                  color: _viewMode == 'grid' ? AppColors.hrAccent : Colors.grey,
                  size: 20,
                ),
                onPressed: () => setState(() => _viewMode = 'grid'),
              ),
              IconButton(
                icon: Icon(
                  Icons.account_tree_rounded,
                  color: _viewMode == 'tree' ? AppColors.hrAccent : Colors.grey,
                  size: 20,
                ),
                onPressed: () => setState(() => _viewMode = 'tree'),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // Grid layout member builder
  Widget _buildMembersList(List members, String? currentUserId, bool isDark) {
    return ListView.separated(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      padding: const EdgeInsets.all(12),
      itemCount: members.length,
      separatorBuilder: (_, _) => const SizedBox(height: 10),
      itemBuilder: (context, index) {
        final m = members[index];
        final isMe = m['_id'] == currentUserId;
        final name =
            '${m['basicInfo']?['firstName'] ?? ""} ${m['basicInfo']?['lastName'] ?? ""}'
                .trim();
        final designation =
            m['professionalInfo']?['designation']?['title'] ?? 'Staff';
        final status = m['liveStatus'] as Map<String, dynamic>;

        return ListTile(
          onTap: () => _showContactBottomSheet(context, m, isDark),
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 8,
            vertical: 2,
          ),
          leading: Stack(
            children: [
              CircleAvatar(
                backgroundColor: isMe
                    ? Colors.green.shade100
                    : Colors.indigo.shade50,
                radius: 20,
                child: Text(
                  name.isNotEmpty ? name[0].toUpperCase() : 'U',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: isMe
                        ? Colors.green.shade800
                        : Colors.indigo.shade800,
                  ),
                ),
              ),
              Positioned(
                bottom: 0,
                right: 0,
                child: Container(
                  width: 10,
                  height: 10,
                  decoration: BoxDecoration(
                    color: status['color'] as Color,
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 1.5),
                  ),
                ),
              ),
            ],
          ),
          title: Text(
            '$name ${isMe ? "(You)" : ""}',
            style: TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 13,
              color: isDark ? AppColors.darkInk : AppColors.ink,
            ),
          ),
          subtitle: Text(
            designation,
            style: TextStyle(
              fontSize: 11,
              color: isDark ? AppColors.darkInkSubtle : AppColors.inkSubtle,
            ),
          ),
          trailing: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                status['label'] as String,
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                  color: status['color'] as Color,
                ),
              ),
              const SizedBox(width: 8),
              const Icon(Icons.chevron_right_rounded, size: 18),
            ],
          ),
        );
      },
    );
  }

  // Tree hierarchy visual layout
  Widget _buildTreeHierarchy(List members, String? currentUserId, bool isDark) {
    // Construct local tree within department
    final map = <String, Map<String, dynamic>>{};
    for (var m in members) {
      map[m['_id']] = {'member': m, 'children': []};
    }

    final roots = <Map<String, dynamic>>[];
    for (var m in members) {
      final parentId = m['professionalInfo']?['reportingManager'];
      if (parentId != null && map.containsKey(parentId)) {
        map[parentId]!['children'].add(map[m['_id']]);
      } else {
        roots.add(map[m['_id']]!);
      }
    }

    Widget buildNodeWidget(Map<String, dynamic> node, int depth) {
      final m = node['member'];
      final name =
          '${m['basicInfo']?['firstName'] ?? ""} ${m['basicInfo']?['lastName'] ?? ""}'
              .trim();
      final title = m['professionalInfo']?['designation']?['title'] ?? 'Staff';
      final status = m['liveStatus'] as Map<String, dynamic>;
      final children = node['children'] as List;

      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: EdgeInsets.only(
              left: 12.0 * depth + 8.0,
              top: 4,
              bottom: 4,
            ),
            child: Row(
              children: [
                // Elbow connector line
                if (depth > 0)
                  Container(
                    width: 14,
                    height: 20,
                    margin: const EdgeInsets.only(right: 6),
                    decoration: BoxDecoration(
                      border: Border(
                        left: BorderSide(
                          color: Colors.grey.shade400,
                          width: 1.5,
                        ),
                        bottom: BorderSide(
                          color: Colors.grey.shade400,
                          width: 1.5,
                        ),
                      ),
                    ),
                  ),

                // Member Node Info card
                Expanded(
                  child: InkWell(
                    onTap: () => _showContactBottomSheet(context, m, isDark),
                    borderRadius: BorderRadius.circular(8),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 8,
                      ),
                      decoration: BoxDecoration(
                        color: isDark
                            ? AppColors.darkSurface1
                            : Colors.grey.shade50,
                        border: Border.all(
                          color: isDark
                              ? AppColors.darkBorder
                              : Colors.grey.shade200,
                        ),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 8,
                            height: 8,
                            decoration: BoxDecoration(
                              color: status['color'] as Color,
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  name,
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 12,
                                    color: isDark
                                        ? AppColors.darkInk
                                        : AppColors.ink,
                                  ),
                                ),
                                Text(
                                  title,
                                  style: const TextStyle(
                                    fontSize: 10,
                                    color: Colors.grey,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const Icon(Icons.chevron_right_rounded, size: 16),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          for (var child in children)
            buildNodeWidget(child as Map<String, dynamic>, depth + 1),
        ],
      );
    }

    return Padding(
      padding: const EdgeInsets.all(12.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: roots.map((root) => buildNodeWidget(root, 0)).toList(),
      ),
    );
  }

  // Shows Contact Bottom Sheet with Call & Chat options
  void _showContactBottomSheet(
    BuildContext context,
    dynamic member,
    bool isDark,
  ) {
    final currentUserId = context.read<AuthProvider>().user?.id;
    final memberId = member['_id']?.toString() ?? member['id']?.toString();
    final isMe = memberId != null && memberId == currentUserId;

    final name =
        '${member['basicInfo']?['firstName'] ?? ""} ${member['basicInfo']?['lastName'] ?? ""}'
            .trim();
    final phone = member['basicInfo']?['phone'] ?? '';

    showModalBottomSheet(
      context: context,
      backgroundColor: isDark ? AppColors.darkSurface0 : Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                '$name ${isMe ? "(You)" : ""}',
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                member['professionalInfo']?['designation']?['title'] ?? 'Staff',
                style: const TextStyle(fontSize: 13, color: Colors.grey),
              ),
              const SizedBox(height: 24),

              // Action Buttons
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () {
                        Navigator.pop(context);
                        _showCallDialog(context, name, phone, isDark);
                      },
                      icon: const Icon(Icons.phone_rounded),
                      label: const Text('Call Member'),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        foregroundColor: AppColors.hrAccent,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: isMe
                          ? null
                          : () {
                              Navigator.pop(context);
                              _openChatScreen(context, member, isDark);
                            },
                      icon: Icon(
                        isMe ? Icons.person_rounded : Icons.chat_bubble_rounded,
                      ),
                      label: Text(isMe ? 'Your Profile' : 'Direct Chat'),
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        backgroundColor: isMe
                            ? Colors.grey[300]
                            : AppColors.hrAccent,
                        foregroundColor: isMe ? Colors.grey[700] : Colors.white,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
            ],
          ),
        );
      },
    );
  }

  // Call options dialog
  void _showCallDialog(
    BuildContext context,
    String name,
    String phone,
    bool isDark,
  ) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: isDark ? AppColors.darkSurface0 : Colors.white,
        title: const Text(
          'Call Team Member',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(name, style: const TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(12),
              width: double.infinity,
              decoration: BoxDecoration(
                color: isDark ? AppColors.darkSurface1 : Colors.grey.shade50,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                phone.isNotEmpty ? phone : 'No number provided',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: AppColors.hrAccent,
                ),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
          if (phone.isNotEmpty)
            ElevatedButton(
              onPressed: () async {
                Navigator.pop(context);
                final url = 'tel:$phone';
                if (await launchUrlString(url)) {
                  // Dialer opened
                }
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.hrAccent,
              ),
              child: const Text('Dial Now'),
            ),
        ],
      ),
    );
  }

  // Interactive direct chat simulator route page
  void _openChatScreen(BuildContext context, dynamic member, bool isDark) {
    final currentUserId = context.read<AuthProvider>().user?.id;
    final memberId = (member['_id'] ?? member['id'])?.toString();

    if (memberId == null ||
        currentUserId == null ||
        memberId == currentUserId) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Cannot initiate chat with yourself.')),
      );
      return;
    }

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => DirectChatScreen(
          member: member,
          currentUserId: currentUserId,
          isDark: isDark,
        ),
      ),
    );
  }
}

class DirectChatScreen extends StatefulWidget {
  final dynamic member;
  final String currentUserId;
  final bool isDark;

  const DirectChatScreen({
    super.key,
    required this.member,
    required this.currentUserId,
    required this.isDark,
  });

  @override
  State<DirectChatScreen> createState() => _DirectChatScreenState();
}

class _DirectChatScreenState extends State<DirectChatScreen> {
  final TextEditingController _controller = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final ChatService _chatService = ChatService();
  bool _loading = true;
  List<ChatMessageModel> _messages = [];
  String _conversationId = '';

  @override
  void initState() {
    super.initState();
    final recipientId =
        (widget.member['_id'] ?? widget.member['id'])?.toString() ?? '';
    _conversationId = ChatService.getConversationId(
      widget.currentUserId,
      recipientId,
    );
    _initChat();
  }

  Future<void> _initChat() async {
    // Load local draft
    final draft = await _chatService.loadDraft(_conversationId);
    if (draft.isNotEmpty && mounted) {
      _controller.text = draft;
    }

    // Fetch initial chat history
    final history = await _chatService.fetchHistory(_conversationId);
    if (mounted) {
      setState(() {
        _messages = history;
        _loading = false;
      });
      _scrollToBottom();
      _chatService.markMessagesAsRead(_conversationId, widget.currentUserId);
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _handleSendMessage() async {
    final text = _controller.text.trim();
    if (text.isEmpty) return;

    final recipientId =
        (widget.member['_id'] ?? widget.member['id'])?.toString() ?? '';

    // Clear draft & controller
    _controller.clear();
    _chatService.saveDraft(_conversationId, '');

    // 1. Optimistic UI insertion
    final tempId = DateTime.now().millisecondsSinceEpoch.toString();
    final optimisticMsg = ChatMessageModel(
      id: tempId,
      conversationId: _conversationId,
      senderId: widget.currentUserId,
      recipientId: recipientId,
      message: text,
      status: 'sending',
      sentAt: DateTime.now(),
    );

    setState(() {
      _messages.add(optimisticMsg);
    });
    _scrollToBottom();

    // 2. Server Persistence
    final sentMsg = await _chatService.sendMessage(
      senderId: widget.currentUserId,
      recipientId: recipientId,
      message: text,
    );

    if (sentMsg != null && mounted) {
      setState(() {
        final idx = _messages.indexWhere((m) => m.id == tempId);
        if (idx != -1) {
          _messages[idx] = sentMsg;
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final memberName =
        '${widget.member['basicInfo']?['firstName'] ?? ""} ${widget.member['basicInfo']?['lastName'] ?? ""}'
            .trim();
    final designation =
        widget.member['professionalInfo']?['designation']?['title'] ??
        'Team Member';
    final isDark = widget.isDark;

    return Scaffold(
      backgroundColor: isDark ? AppColors.darkCanvas : AppColors.canvas,
      appBar: AppBar(
        backgroundColor: isDark ? AppColors.darkSurface0 : Colors.white,
        foregroundColor: isDark ? Colors.white : Colors.black,
        elevation: 0.5,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              memberName,
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
            ),
            Text(
              designation,
              style: const TextStyle(fontSize: 10, color: Colors.grey),
            ),
          ],
        ),
      ),
      body: Column(
        children: [
          // Timeline Messages List
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator(strokeWidth: 2))
                : _messages.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.chat_bubble_outline_rounded,
                          size: 44,
                          color: Colors.grey.shade400,
                        ),
                        const SizedBox(height: 12),
                        Text(
                          'No messages yet with $memberName.',
                          style: const TextStyle(
                            fontSize: 13,
                            color: Colors.grey,
                          ),
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          'Type a message below to start chatting!',
                          style: TextStyle(fontSize: 11, color: Colors.grey),
                        ),
                      ],
                    ),
                  )
                : ListView.builder(
                    controller: _scrollController,
                    padding: const EdgeInsets.all(16),
                    itemCount: _messages.length,
                    itemBuilder: (context, index) {
                      final msg = _messages[index];
                      final isMe = msg.senderId == widget.currentUserId;
                      final timeStr =
                          '${msg.sentAt.hour.toString().padLeft(2, '0')}:${msg.sentAt.minute.toString().padLeft(2, '0')}';

                      Widget statusIcon;
                      if (msg.status == 'sending') {
                        statusIcon = const Icon(
                          Icons.access_time_rounded,
                          size: 11,
                          color: Colors.white70,
                        );
                      } else if (msg.status == 'read') {
                        statusIcon = const Icon(
                          Icons.done_all_rounded,
                          size: 13,
                          color: Colors.lightBlueAccent,
                        );
                      } else if (msg.status == 'delivered') {
                        statusIcon = const Icon(
                          Icons.done_all_rounded,
                          size: 13,
                          color: Colors.white70,
                        );
                      } else {
                        statusIcon = const Icon(
                          Icons.check_rounded,
                          size: 13,
                          color: Colors.white70,
                        );
                      }

                      return Align(
                        alignment: isMe
                            ? Alignment.centerRight
                            : Alignment.centerLeft,
                        child: Container(
                          margin: const EdgeInsets.only(bottom: 10),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 14,
                            vertical: 10,
                          ),
                          constraints: BoxConstraints(
                            maxWidth: MediaQuery.of(context).size.width * 0.75,
                          ),
                          decoration: BoxDecoration(
                            color: isMe
                                ? AppColors.hrAccent
                                : (isDark
                                      ? AppColors.darkSurface0
                                      : Colors.white),
                            border: isMe
                                ? null
                                : Border.all(
                                    color: isDark
                                        ? AppColors.darkBorder
                                        : Colors.grey.shade200,
                                  ),
                            borderRadius: BorderRadius.only(
                              topLeft: const Radius.circular(14),
                              topRight: const Radius.circular(14),
                              bottomLeft: isMe
                                  ? const Radius.circular(14)
                                  : Radius.zero,
                              bottomRight: isMe
                                  ? Radius.zero
                                  : const Radius.circular(14),
                            ),
                          ),
                          child: Column(
                            crossAxisAlignment: isMe
                                ? CrossAxisAlignment.end
                                : CrossAxisAlignment.start,
                            children: [
                              Text(
                                msg.message,
                                style: TextStyle(
                                  fontSize: 13,
                                  color: isMe
                                      ? Colors.white
                                      : (isDark ? Colors.white : Colors.black),
                                ),
                              ),
                              const SizedBox(height: 4),
                              Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Text(
                                    timeStr,
                                    style: TextStyle(
                                      fontSize: 9,
                                      color: isMe
                                          ? Colors.white70
                                          : Colors.grey,
                                    ),
                                  ),
                                  if (isMe) ...[
                                    const SizedBox(width: 4),
                                    statusIcon,
                                  ],
                                ],
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
          ),

          // Message Input Bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: isDark ? AppColors.darkSurface0 : Colors.white,
              border: Border(
                top: BorderSide(
                  color: isDark ? AppColors.darkBorder : Colors.grey.shade200,
                ),
              ),
            ),
            child: SafeArea(
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _controller,
                      onChanged: (val) {
                        _chatService.saveDraft(_conversationId, val);
                      },
                      style: TextStyle(
                        color: isDark ? Colors.white : Colors.black,
                        fontSize: 13,
                      ),
                      decoration: InputDecoration(
                        hintText: 'Type a message...',
                        hintStyle: const TextStyle(
                          color: Colors.grey,
                          fontSize: 13,
                        ),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(20),
                          borderSide: BorderSide.none,
                        ),
                        filled: true,
                        fillColor: isDark
                            ? AppColors.darkSurface1
                            : Colors.grey.shade100,
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 8,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton(
                    icon: const Icon(
                      Icons.send_rounded,
                      color: AppColors.hrAccent,
                    ),
                    onPressed: _handleSendMessage,
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
