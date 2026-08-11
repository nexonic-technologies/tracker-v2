import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:file_picker/file_picker.dart';
import '../../providers/auth_provider.dart';
import '../../services/api.dart';
import '../../services/cache_manager.dart';
import '../../core/theme/app_theme.dart';
import '../../core/api_config.dart';
import '../../core/widgets/file_viewer.dart';
import '../../core/widgets/cached_avatar.dart';
import '../../core/widgets/shimmer_loading.dart';
import 'package:flutter_widget_from_html/flutter_widget_from_html.dart';
import 'package:html_unescape/html_unescape.dart';

class FeedsPage extends StatefulWidget {
  const FeedsPage({super.key});

  @override
  State<FeedsPage> createState() => _FeedsPageState();
}

class _FeedsPageState extends State<FeedsPage> {
  final ApiService _api = ApiService();
  bool _loading = true;
  List<Map<String, dynamic>> _posts = [];
  String _selectedTypeFilter = 'All';

  @override
  void initState() {
    super.initState();
    _loadCacheAndFetch();
  }

  Future<void> _loadCacheAndFetch() async {
    final cached = await LocalCache().get('cached_feeds');
    if (cached is List && cleanCachedList(cached).isNotEmpty && mounted) {
      setState(() {
        _posts = List<Map<String, dynamic>>.from(cached);
      });
      _fetchPosts(isSilent: true);
    } else {
      _fetchPosts(isSilent: false);
    }
  }

  List<dynamic> cleanCachedList(dynamic list) {
    if (list is List) return list;
    return [];
  }

  Future<void> _fetchPosts({bool isSilent = false}) async {
    if (!mounted) return;
    if (!isSilent) setState(() => _loading = true);

    try {
      final query = {
        'limit': 100,
        'sort': {'createdAt': -1},
        'populateFields': {
          'author':
              'basicInfo.firstName,basicInfo.lastName,basicInfo.profileImage,professionalInfo.department',
        },
      };

      final response = await _api.readModel('feed_posts', query: query);
      if (response.statusCode == 200 && response.data != null) {
        final List<dynamic> data = response.data['data'] ?? [];
        if (mounted) {
          setState(() {
            _posts = List<Map<String, dynamic>>.from(data);
          });
          LocalCache().set('cached_feeds', data);
        }
      }
    } catch (e) {
      debugPrint("Error fetching company feeds: $e");
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _showComposePostModal(bool isDark) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: isDark ? AppColors.darkSurface0 : Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return _ComposePostSheet(
          isDark: isDark,
          api: _api,
          onPostCreated: _fetchPosts,
        );
      },
    );
  }

  Widget _buildFilterChips(bool isDark) {
    final types = ['All', 'Announcement', 'Update', 'Question', 'General'];
    return SizedBox(
      height: 48,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        itemCount: types.length,
        itemBuilder: (context, idx) {
          final t = types[idx];
          final isSelected = _selectedTypeFilter == t;
          return Padding(
            padding: const EdgeInsets.only(right: 8.0),
            child: ChoiceChip(
              label: Text(t, style: const TextStyle(fontSize: 11)),
              selected: isSelected,
              selectedColor: AppColors.brandSolid.withValues(alpha: 0.15),
              onSelected: (selected) {
                if (selected) {
                  setState(() => _selectedTypeFilter = t);
                }
              },
            ),
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final filteredPosts = _selectedTypeFilter == 'All'
        ? _posts
        : _posts.where((p) => p['postType'] == _selectedTypeFilter).toList();

    return Scaffold(
      backgroundColor: isDark ? AppColors.darkCanvas : AppColors.canvas,
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showComposePostModal(isDark),
        backgroundColor: AppColors.brandSolid,
        child: const Icon(
          Icons.edit_note_rounded,
          color: Colors.white,
          size: 28,
        ),
      ),
      body: Column(
        children: [
          _buildFilterChips(isDark),
          Expanded(
            child: _loading
                ? ShimmerLoading.list()
                : filteredPosts.isEmpty
                ? _buildEmptyState(isDark)
                : RefreshIndicator(
                    onRefresh: _fetchPosts,
                    color: AppColors.brandSolid,
                    child: ListView.builder(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 12,
                      ),
                      itemCount: filteredPosts.length,
                      itemBuilder: (context, idx) {
                        final post = filteredPosts[idx];
                        return _buildFeedPostCard(post, isDark);
                      },
                    ),
                  ),
          ),
        ],
      ),
    );
  }

  String _stripHtml(String htmlString) {
    if (htmlString.isEmpty) return '';
    final regExp = RegExp(r'<[^>]*>', multiLine: true, caseSensitive: true);
    final clean = htmlString.replaceAll(regExp, '');
    try {
      return HtmlUnescape().convert(clean).trim();
    } catch (_) {
      return clean.replaceAll('&nbsp;', ' ').trim();
    }
  }

  Widget _buildFeedPostCard(Map<String, dynamic> post, bool isDark) {
    final subject = post['subject'] ?? 'Post Update';
    final content = post['content'] ?? '';
    final type = post['postType'] ?? 'General';
    final author = post['author'];
    final authorName = author is Map && author['basicInfo'] != null
        ? '${author['basicInfo']['firstName'] ?? 'Someone'} ${author['basicInfo']['lastName'] ?? ''}'
        : 'Company Member';

    final reactionsCount = (post['reactions'] as List?)?.length ?? 0;
    final viewsCount = (post['viewsCount'] as int?) ?? 0;
    final commentsCount = (post['commentsCount'] as int?) ?? 0;

    Color typeColor = Colors.grey;
    if (type == 'Announcement') typeColor = Colors.red;
    if (type == 'Question') typeColor = Colors.orange;
    if (type == 'Update') typeColor = Colors.blue;

    final authorDeptObj = author is Map && author['professionalInfo'] != null
        ? author['professionalInfo']['department']
        : null;
    final authorDept = authorDeptObj is Map
        ? (authorDeptObj['name'] ?? authorDeptObj['departmentName'] ?? '')
        : '';

    return Card(
      elevation: 0,
      margin: const EdgeInsets.only(bottom: 16),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(
          color: isDark ? AppColors.darkBorder : AppColors.border,
        ),
      ),
      color: isDark ? AppColors.darkSurface0 : Colors.white,
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () => _showFeedPostDetails(post, isDark),
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Author details and tag
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      CachedAvatar(
                        name: authorName,
                        imageUrl: author is Map
                            ? author['basicInfo']['profileImage']?.toString()
                            : null,
                        radius: 18,
                      ),
                      const SizedBox(width: 10),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '$authorName${authorDept.toString().isNotEmpty ? ' • ${authorDept.toString()}' : ''}',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                              color: isDark ? AppColors.darkInk : AppColors.ink,
                            ),
                          ),
                          Text(
                            post['createdAt'] != null
                                ? DateTime.parse(
                                    post['createdAt'],
                                  ).toLocal().toString().substring(0, 16)
                                : 'Just now',
                            style: const TextStyle(
                              fontSize: 9,
                              color: Colors.grey,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),

                  // Post Type tag
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 3,
                    ),
                    decoration: BoxDecoration(
                      color: typeColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      type,
                      style: TextStyle(
                        fontSize: 9,
                        fontWeight: FontWeight.bold,
                        color: typeColor,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              // Title Subject
              Text(
                subject,
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.bold,
                  color: isDark ? AppColors.darkInk : AppColors.ink,
                ),
              ),
              const SizedBox(height: 6),

              // Content Snip
              Text(
                _stripHtml(content),
                maxLines: 3,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 12,
                  color: isDark ? AppColors.darkInkSubtle : AppColors.inkSubtle,
                ),
              ),
              const SizedBox(height: 14),

              // Bottom Stats Row
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Icon(
                        Icons.favorite_rounded,
                        size: 14,
                        color: reactionsCount > 0 ? Colors.red : Colors.grey,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        '$reactionsCount',
                        style: const TextStyle(
                          fontSize: 11,
                          color: Colors.grey,
                        ),
                      ),
                      const SizedBox(width: 14),
                      const Icon(
                        Icons.chat_bubble_outline_rounded,
                        size: 14,
                        color: Colors.grey,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        '$commentsCount',
                        style: const TextStyle(
                          fontSize: 11,
                          color: Colors.grey,
                        ),
                      ),
                    ],
                  ),
                  Row(
                    children: [
                      const Icon(
                        Icons.remove_red_eye_outlined,
                        size: 14,
                        color: Colors.grey,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        '$viewsCount views',
                        style: const TextStyle(
                          fontSize: 11,
                          color: Colors.grey,
                        ),
                      ),
                    ],
                  ),
                ],
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
            Icons.rss_feed_rounded,
            size: 48,
            color: isDark ? AppColors.darkInkSubtle : AppColors.inkSubtle,
          ),
          const SizedBox(height: 12),
          Text(
            'Company feed is quiet right now.',
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

  void _showFeedPostDetails(Map<String, dynamic> post, bool isDark) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: isDark ? AppColors.darkSurface0 : Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return _FeedPostDetailsSheet(
          post: post,
          isDark: isDark,
          api: _api,
          onPostUpdated: _fetchPosts,
        );
      },
    );
  }
}

// ─── COMPOSE POST SHEET ───────────────────────────────────────────────────
class _ComposePostSheet extends StatefulWidget {
  final bool isDark;
  final ApiService api;
  final VoidCallback onPostCreated;

  const _ComposePostSheet({
    required this.isDark,
    required this.api,
    required this.onPostCreated,
  });

  @override
  State<_ComposePostSheet> createState() => _ComposePostSheetState();
}

class _ComposePostSheetState extends State<_ComposePostSheet> {
  final _formKey = GlobalKey<FormState>();
  final TextEditingController _subController = TextEditingController();
  final TextEditingController _contentController = TextEditingController();
  String _selectedType = 'General';
  final List<String> _attachments = [];
  bool _submitting = false;

  Future<void> _addAttachment() async {
    try {
      FilePickerResult? result = await FilePicker.platform.pickFiles();
      if (result != null && result.files.single.path != null) {
        setState(() {
          _attachments.add(result.files.single.name);
        });
      }
    } catch (e) {
      debugPrint("Attachment add error: $e");
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _submitting = true);

    try {
      final userId = context.read<AuthProvider>().user?.id;
      final payload = {
        'author': userId,
        'subject': _subController.text.trim(),
        'content': _contentController.text.trim(),
        'postType': _selectedType,
        'attachments': _attachments,
        'reactions': [],
        'viewedBy': [
          {'employee': userId, 'viewedAt': DateTime.now().toIso8601String()},
        ],
        'viewsCount': 1,
      };

      final res = await widget.api.createModel('feed_posts', payload);
      if (res.statusCode == 200) {
        widget.onPostCreated();
        Navigator.of(context).pop();
      }
    } catch (e) {
      debugPrint("Compose post error: $e");
    } finally {
      setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = widget.isDark;

    return Padding(
      padding: EdgeInsets.only(
        top: 20,
        left: 20,
        right: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 30,
      ),
      child: SingleChildScrollView(
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Compose Post update',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: isDark ? AppColors.darkInk : AppColors.ink,
                ),
              ),
              const SizedBox(height: 16),

              TextFormField(
                controller: _subController,
                decoration: const InputDecoration(
                  labelText: 'Subject / Title *',
                  isDense: true,
                ),
                validator: (val) =>
                    val == null || val.isEmpty ? 'Subject required' : null,
                style: TextStyle(
                  color: isDark ? AppColors.darkInk : AppColors.ink,
                ),
              ),
              const SizedBox(height: 12),

              DropdownButtonFormField<String>(
                decoration: const InputDecoration(
                  labelText: 'Post Type',
                  isDense: true,
                ),
                initialValue: _selectedType,
                dropdownColor: isDark ? AppColors.darkSurface1 : Colors.white,
                style: TextStyle(
                  color: isDark ? AppColors.darkInk : AppColors.ink,
                ),
                items: ['General', 'Update', 'Announcement', 'Question'].map((
                  t,
                ) {
                  return DropdownMenuItem<String>(value: t, child: Text(t));
                }).toList(),
                onChanged: (val) =>
                    setState(() => _selectedType = val ?? 'General'),
              ),
              const SizedBox(height: 12),

              TextFormField(
                controller: _contentController,
                decoration: const InputDecoration(
                  labelText: 'Content body *',
                  isDense: true,
                ),
                maxLines: 4,
                validator: (val) =>
                    val == null || val.isEmpty ? 'Content body required' : null,
                style: TextStyle(
                  color: isDark ? AppColors.darkInk : AppColors.ink,
                ),
              ),
              const SizedBox(height: 16),

              // File attachment controls
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Attach Media (Photos/Videos/Docs)'),
                  IconButton(
                    icon: const Icon(
                      Icons.add_photo_alternate_rounded,
                      color: AppColors.brandSolid,
                    ),
                    onPressed: _addAttachment,
                  ),
                ],
              ),
              if (_attachments.isNotEmpty)
                Wrap(
                  spacing: 6,
                  children: _attachments
                      .map(
                        (a) => Chip(
                          label: Text(a, style: const TextStyle(fontSize: 10)),
                          onDeleted: () =>
                              setState(() => _attachments.remove(a)),
                        ),
                      )
                      .toList(),
                ),
              const SizedBox(height: 20),

              _submitting
                  ? const Center(child: CircularProgressIndicator())
                  : SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.brandSolid,
                        ),
                        onPressed: _submit,
                        child: const Text(
                          'Post to Feed',
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
}

// ─── FEED POST DETAILS SHEET (VIEWING & REACTIONS) ────────────────────────
class _FeedPostDetailsSheet extends StatefulWidget {
  final Map<String, dynamic> post;
  final bool isDark;
  final ApiService api;
  final VoidCallback onPostUpdated;

  const _FeedPostDetailsSheet({
    required this.post,
    required this.isDark,
    required this.api,
    required this.onPostUpdated,
  });

  @override
  State<_FeedPostDetailsSheet> createState() => _FeedPostDetailsSheetState();
}

class _FeedPostDetailsSheetState extends State<_FeedPostDetailsSheet> {
  final TextEditingController _commentController = TextEditingController();
  List<Map<String, dynamic>> _comments = [];
  bool _loadingComments = false;
  bool _submittingComment = false;

  List<dynamic> _reactions = [];
  List<dynamic> _viewedBy = [];
  bool _hasReacted = false;

  @override
  void initState() {
    super.initState();
    _reactions = List<dynamic>.from(widget.post['reactions'] ?? []);
    _viewedBy = List<dynamic>.from(widget.post['viewedBy'] ?? []);

    final userId = context.read<AuthProvider>().user?.id;
    _hasReacted = _reactions.any((r) => r['employee']?.toString() == userId);

    _logFeedView();
    _fetchComments();
  }

  Future<void> _logFeedView() async {
    final userId = context.read<AuthProvider>().user?.id;
    if (userId == null) return;

    final alreadyViewed = _viewedBy.any(
      (v) => v['employee']?.toString() == userId,
    );
    if (!alreadyViewed) {
      _viewedBy.add({
        'employee': userId,
        'viewedAt': DateTime.now().toIso8601String(),
      });
      final nextViewsCount = (widget.post['viewsCount'] as int? ?? 0) + 1;

      try {
        await widget.api.updateModel('feed_posts', widget.post['_id'], {
          'viewedBy': _viewedBy,
          'viewsCount': nextViewsCount,
        });
        widget.onPostUpdated();
      } catch (e) {
        debugPrint("View logging failed: $e");
      }
    }
  }

  Future<void> _fetchComments() async {
    setState(() => _loadingComments = true);
    try {
      final query = {
        'filter': {'postId': widget.post['_id']},
        'limit': 100,
        'sort': {'createdAt': 1},
      };
      final res = await widget.api.readModel('feed_comments', query: query);
      if (res.statusCode == 200 && res.data != null) {
        final List<dynamic> data = res.data['data'] ?? [];
        setState(() {
          _comments = List<Map<String, dynamic>>.from(data);
        });
      }
    } catch (e) {
      debugPrint("Error fetching feed comments: $e");
    } finally {
      setState(() => _loadingComments = false);
    }
  }

  Future<void> _postComment() async {
    final text = _commentController.text.trim();
    if (text.isEmpty) return;

    setState(() => _submittingComment = true);
    try {
      final userId = context.read<AuthProvider>().user?.id;
      final payload = {
        'postId': widget.post['_id'],
        'author': userId,
        'content': text,
        'attachments': [],
        'reactions': [],
        'replies': [],
      };

      final res = await widget.api.createModel('feed_comments', payload);
      if (res.statusCode == 200) {
        _commentController.clear();
        // Increment commentsCount locally or trigger reload
        final nextCommentsCount =
            (widget.post['commentsCount'] as int? ?? 0) + 1;
        await widget.api.updateModel('feed_posts', widget.post['_id'], {
          'commentsCount': nextCommentsCount,
        });

        _fetchComments();
        widget.onPostUpdated();
      }
    } catch (e) {
      debugPrint("Post comment error: $e");
    } finally {
      setState(() => _submittingComment = false);
    }
  }

  Future<void> _toggleReaction() async {
    final userId = context.read<AuthProvider>().user?.id;
    if (userId == null) return;

    try {
      if (_hasReacted) {
        _reactions.removeWhere((r) => r['employee']?.toString() == userId);
      } else {
        _reactions.add({'employee': userId, 'reactionType': 'Like'});
      }

      final res = await widget.api.updateModel(
        'feed_posts',
        widget.post['_id'],
        {'reactions': _reactions},
      );
      if (res.statusCode == 200) {
        setState(() {
          _hasReacted = !_hasReacted;
        });
        widget.onPostUpdated();
      }
    } catch (e) {
      debugPrint("Reaction toggle error: $e");
    }
  }

  void _showViewersList() {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          backgroundColor: widget.isDark
              ? AppColors.darkSurface0
              : Colors.white,
          title: const Text(
            'Post Viewers',
            style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
          ),
          content: Container(
            width: double.maxFinite,
            constraints: const BoxConstraints(maxHeight: 250),
            child: _viewedBy.isEmpty
                ? const Center(child: Text('No viewers yet.'))
                : ListView.builder(
                    shrinkWrap: true,
                    itemCount: _viewedBy.length,
                    itemBuilder: (context, idx) {
                      final v = _viewedBy[idx];
                      return ListTile(
                        leading: CircleAvatar(
                          radius: 14,
                          child: Text(idx.toString()),
                        ),
                        title: Text(
                          'Employee ID: ${v['employee'] ?? 'Anonymous'}',
                          style: const TextStyle(fontSize: 12),
                        ),
                        subtitle: Text(
                          v['viewedAt'] != null
                              ? DateTime.parse(
                                  v['viewedAt'],
                                ).toLocal().toString().substring(0, 16)
                              : '',
                          style: const TextStyle(fontSize: 9),
                        ),
                      );
                    },
                  ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final post = widget.post;
    final isDark = widget.isDark;

    final subject = post['subject'] ?? 'Post details';
    final content = post['content'] ?? '';
    final List<dynamic> attachments = post['attachments'] ?? [];

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
              // Pull Handle
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

              // Title Subject
              Text(
                subject,
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: isDark ? AppColors.darkInk : AppColors.ink,
                ),
              ),
              const SizedBox(height: 12),

              // Content description
              HtmlWidget(
                content,
                textStyle: TextStyle(
                  fontSize: 13,
                  color: isDark ? AppColors.darkInk : AppColors.ink,
                  height: 1.4,
                ),
              ),
              const SizedBox(height: 16),

              // Attachments
              if (attachments.isNotEmpty) ...[
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
                const SizedBox(height: 6),
                Wrap(
                  spacing: 8,
                  children: attachments.map((a) {
                    return InputChip(
                      label: Text(
                        a.toString(),
                        style: const TextStyle(fontSize: 10),
                      ),
                      onPressed: () {
                        final url = a.toString().startsWith('http')
                            ? a.toString()
                            : '${ApiConfig.baseUrl}/files/serve/$a';
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (context) => FileViewerPage(
                              fileUrl: url,
                              fileName: a.toString(),
                            ),
                          ),
                        );
                      },
                    );
                  }).toList(),
                ),
                const SizedBox(height: 20),
              ],

              // Reactions and Views row
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  // Reaction like button
                  Row(
                    children: [
                      ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          elevation: 0,
                          backgroundColor: _hasReacted
                              ? Colors.red.withValues(alpha: 0.1)
                              : (isDark
                                    ? AppColors.darkSurface1
                                    : Colors.grey[100]),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 14,
                            vertical: 8,
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(20),
                          ),
                        ),
                        onPressed: _toggleFollow, // toggle reaction
                        icon: Icon(
                          Icons.favorite_rounded,
                          size: 16,
                          color: _hasReacted ? Colors.red : Colors.grey,
                        ),
                        label: Text(
                          _hasReacted ? 'Liked' : 'Like',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: _hasReacted
                                ? Colors.red
                                : (isDark ? AppColors.darkInk : AppColors.ink),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        '${_reactions.length} reactions',
                        style: const TextStyle(
                          fontSize: 11,
                          color: Colors.grey,
                        ),
                      ),
                    ],
                  ),

                  // Viewers click list
                  InkWell(
                    onTap: _showViewersList,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: isDark
                            ? AppColors.darkSurface1
                            : Colors.grey[100],
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Row(
                        children: [
                          const Icon(
                            Icons.remove_red_eye_outlined,
                            size: 14,
                            color: Colors.grey,
                          ),
                          const SizedBox(width: 6),
                          Text(
                            '${_viewedBy.length} viewers',
                            style: const TextStyle(
                              fontSize: 11,
                              color: Colors.grey,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
              const Divider(height: 32),

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
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: _comments.length,
                      itemBuilder: (context, idx) {
                        final c = _comments[idx];
                        final authorName = 'Employee Member';
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 8.0),
                          child: Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: isDark
                                  ? AppColors.darkSurface1
                                  : Colors.grey[100],
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  authorName,
                                  style: const TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.grey,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  c['content'] ?? '',
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: isDark
                                        ? AppColors.darkInk
                                        : AppColors.ink,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
              const SizedBox(height: 16),

              // Post Comment Box
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _commentController,
                      decoration: InputDecoration(
                        hintText: 'Type a comment...',
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
                            color: AppColors.brandSolid,
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

  void _toggleFollow() {
    _toggleReaction();
  }
}
