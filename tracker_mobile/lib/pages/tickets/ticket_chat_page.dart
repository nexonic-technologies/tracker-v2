import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_theme.dart';
import '../../providers/auth_provider.dart';
import '../../services/api.dart';

class TicketChatPage extends StatefulWidget {
  final String ticketId;
  final String title;
  final String initialStatus;
  final String priority;

  const TicketChatPage({
    super.key,
    required this.ticketId,
    required this.title,
    this.initialStatus = 'In Progress',
    this.priority = 'High',
  });

  @override
  State<TicketChatPage> createState() => _TicketChatPageState();
}

class _TicketChatPageState extends State<TicketChatPage> {
  final ApiService _api = ApiService();
  final TextEditingController _replyController = TextEditingController();
  final ScrollController _scrollController = ScrollController();

  late String _currentStatus;
  bool _isLoadingMessages = false;
  bool _isSending = false;
  bool _isUpdatingStatus = false;
  List<Map<String, dynamic>> _messages = [];

  @override
  void initState() {
    super.initState();
    _currentStatus = widget.initialStatus;
    WidgetsBinding.instance.addPostFrameCallback((_) => _fetchMessages());
  }

  @override
  void dispose() {
    _replyController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _fetchMessages() async {
    setState(() => _isLoadingMessages = true);
    try {
      final res = await _api.readModel('ticket_comments', query: {
        'filter': {'ticket': widget.ticketId},
        'sort': {'createdAt': 1},
        'limit': 100,
      });
      if (res.statusCode == 200 && res.data != null) {
        final List list = res.data['data'] ?? [];
        final me = context.read<AuthProvider>().user?.id;
        setState(() {
          _messages = list.map((m) {
            final item = Map<String, dynamic>.from(m);
            item['isMe'] = (item['author'] == me || item['authorId'] == me);
            return item;
          }).toList();
        });
        _scrollToBottom();
      }
    } catch (e) {
      debugPrint('Error fetching ticket comments: $e');
    } finally {
      if (mounted) setState(() => _isLoadingMessages = false);
    }
  }

  Future<void> _sendReply() async {
    final text = _replyController.text.trim();
    if (text.isEmpty || _isSending) return;

    final user = context.read<AuthProvider>().user;
    if (user == null) return;

    setState(() => _isSending = true);
    try {
      final res = await _api.createModel('ticket_comments', {
        'ticket': widget.ticketId,
        'author': user.id,
        'authorName': user.name,
        'message': text,
        'createdAt': DateTime.now().toIso8601String(),
      });

      if (res.statusCode == 200 || res.statusCode == 201) {
        _replyController.clear();
        FocusScope.of(context).unfocus();
        // Optimistic append then re-fetch for consistency
        setState(() {
          _messages.add({
            'authorName': user.name,
            'role': user.designation ?? 'Employee',
            'message': text,
            'createdAt': DateTime.now().toIso8601String(),
            'isMe': true,
          });
        });
        _scrollToBottom();
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Failed to send reply. Please try again.')),
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
      if (mounted) setState(() => _isSending = false);
    }
  }

  Future<void> _updateStatus(String newStatus) async {
    setState(() => _isUpdatingStatus = true);
    try {
      final res = await _api.updateModel('tickets', widget.ticketId, {
        'status': newStatus,
        'updatedAt': DateTime.now().toIso8601String(),
      });
      if (res.statusCode == 200) {
        setState(() => _currentStatus = newStatus);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Status updated to $newStatus')),
          );
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Status update failed. Please try again.')),
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
      if (mounted) setState(() => _isUpdatingStatus = false);
    }
  }

  void _showStatusSheet() {
    final statuses = ['Open', 'In Progress', 'Pending Customer', 'Resolved', 'Closed'];
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return Container(
          padding: const EdgeInsets.all(20.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Update Ticket Status',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              for (final st in statuses)
                ListTile(
                  title: Text(st),
                  trailing: _currentStatus == st
                      ? const Icon(Icons.check_circle, color: AppColors.brandSolid)
                      : null,
                  onTap: () {
                    Navigator.pop(ctx);
                    _updateStatus(st);
                  },
                ),
            ],
          ),
        );
      },
    );
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

  String _formatTime(dynamic raw) {
    if (raw == null) return '';
    try {
      final dt = DateTime.parse(raw.toString()).toLocal();
      final h = dt.hour % 12 == 0 ? 12 : dt.hour % 12;
      final m = dt.minute.toString().padLeft(2, '0');
      final ampm = dt.hour < 12 ? 'AM' : 'PM';
      return '$h:$m $ampm';
    } catch (_) {
      return '';
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isCritical = widget.priority == 'Critical' || widget.priority == 'High';

    return Scaffold(
      backgroundColor: isDark ? AppColors.darkCanvas : const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: isDark ? AppColors.darkSurface0 : Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18),
          onPressed: () => Navigator.pop(context),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              widget.title,
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
              overflow: TextOverflow.ellipsis,
            ),
            Text(
              widget.ticketId,
              style: TextStyle(
                fontSize: 11,
                color: isDark ? AppColors.darkInkSubtle : AppColors.inkSubtle,
              ),
            ),
          ],
        ),
        actions: [
          _isUpdatingStatus
              ? const Padding(
                  padding: EdgeInsets.all(14),
                  child: SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2)),
                )
              : TextButton(
                  onPressed: _showStatusSheet,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.brandSolid.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      _currentStatus,
                      style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: AppColors.brandSolid),
                    ),
                  ),
                ),
          IconButton(
            icon: const Icon(Icons.refresh_rounded, size: 20),
            onPressed: _fetchMessages,
            tooltip: 'Refresh thread',
          ),
        ],
      ),
      body: Column(
        children: [
          // SLA Priority Banner
          if (isCritical)
            Container(
              color: Colors.red.shade50,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Row(
                children: [
                  Icon(Icons.warning_amber_rounded,
                      color: Colors.red.shade700, size: 16),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      '${widget.priority} priority — SLA clock is running. Respond promptly.',
                      style: TextStyle(
                          fontSize: 12,
                          color: Colors.red.shade700,
                          fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
              ),
            ),

          // Message Thread
          Expanded(
            child: _isLoadingMessages
                ? const Center(child: CircularProgressIndicator())
                : _messages.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.chat_bubble_outline_rounded,
                                size: 48,
                                color: isDark
                                    ? AppColors.darkInkSubtle
                                    : AppColors.inkSubtle),
                            const SizedBox(height: 12),
                            Text(
                              'No messages yet.\nBe the first to reply.',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                color: isDark
                                    ? AppColors.darkInkSubtle
                                    : AppColors.inkSubtle,
                              ),
                            ),
                          ],
                        ),
                      )
                    : ListView.builder(
                        controller: _scrollController,
                        padding: const EdgeInsets.all(16),
                        itemCount: _messages.length,
                        itemBuilder: (context, idx) {
                          final msg = _messages[idx];
                          final isMe = msg['isMe'] as bool? ?? false;
                          final authorName =
                              msg['authorName']?.toString() ?? 'Unknown';
                          final role = msg['role']?.toString() ?? '';
                          final message = msg['message']?.toString() ?? '';
                          final time = _formatTime(msg['createdAt']);

                          return Align(
                            alignment: isMe
                                ? Alignment.centerRight
                                : Alignment.centerLeft,
                            child: Container(
                              constraints: BoxConstraints(
                                maxWidth:
                                    MediaQuery.of(context).size.width * 0.78,
                              ),
                              margin: const EdgeInsets.only(bottom: 12.0),
                              padding: const EdgeInsets.all(14.0),
                              decoration: BoxDecoration(
                                color: isMe
                                    ? AppColors.brandSolid
                                    : (isDark
                                        ? AppColors.darkSurface0
                                        : Colors.white),
                                borderRadius: BorderRadius.only(
                                  topLeft: const Radius.circular(16),
                                  topRight: const Radius.circular(16),
                                  bottomLeft: Radius.circular(isMe ? 16 : 4),
                                  bottomRight: Radius.circular(isMe ? 4 : 16),
                                ),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withValues(alpha: 0.05),
                                    blurRadius: 4,
                                    offset: const Offset(0, 2),
                                  ),
                                ],
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  if (!isMe) ...[
                                    Text(
                                      authorName,
                                      style: TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.bold,
                                        color: isMe
                                            ? Colors.white70
                                            : AppColors.brandSolid,
                                      ),
                                    ),
                                    if (role.isNotEmpty)
                                      Text(
                                        role,
                                        style: TextStyle(
                                          fontSize: 10,
                                          color: isDark
                                              ? AppColors.darkInkSubtle
                                              : AppColors.inkTertiary,
                                        ),
                                      ),
                                    const SizedBox(height: 6),
                                  ],
                                  Text(
                                    message,
                                    style: TextStyle(
                                      fontSize: 14,
                                      color: isMe ? Colors.white : null,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Align(
                                    alignment: Alignment.bottomRight,
                                    child: Text(
                                      time,
                                      style: TextStyle(
                                        fontSize: 10,
                                        color: isMe
                                            ? Colors.white60
                                            : (isDark
                                                ? AppColors.darkInkSubtle
                                                : AppColors.inkTertiary),
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

          // Reply Input
          Container(
            color: isDark ? AppColors.darkSurface0 : Colors.white,
            padding: EdgeInsets.only(
              left: 16,
              right: 8,
              top: 10,
              bottom: MediaQuery.of(context).viewInsets.bottom + 10,
            ),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _replyController,
                    maxLines: 3,
                    minLines: 1,
                    decoration: InputDecoration(
                      hintText: 'Write a reply...',
                      filled: true,
                      fillColor:
                          isDark ? AppColors.darkCanvas : const Color(0xFFF8FAFC),
                      contentPadding: const EdgeInsets.symmetric(
                          horizontal: 14, vertical: 10),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide.none,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                _isSending
                    ? const Padding(
                        padding: EdgeInsets.all(12),
                        child: SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2)),
                      )
                    : IconButton(
                        onPressed: _sendReply,
                        icon: const Icon(Icons.send_rounded),
                        color: AppColors.brandSolid,
                        style: IconButton.styleFrom(
                          backgroundColor:
                              AppColors.brandSolid.withValues(alpha: 0.12),
                          padding: const EdgeInsets.all(12),
                        ),
                      ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
