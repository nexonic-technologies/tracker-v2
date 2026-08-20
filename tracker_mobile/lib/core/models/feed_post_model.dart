class FeedPostModel {
  final String id;
  final String authorId;
  final String authorName;
  final String postType;
  final String subject;
  final String content;
  final List<String> attachments;
  final List<FeedReactionModel> reactions;
  final int commentsCount;
  final int viewsCount;
  final List<FeedViewedByModel> viewedBy;
  final DateTime createdAt;

  FeedPostModel({
    required this.id,
    required this.authorId,
    required this.authorName,
    required this.postType,
    required this.subject,
    required this.content,
    required this.attachments,
    required this.reactions,
    required this.commentsCount,
    required this.viewsCount,
    required this.viewedBy,
    required this.createdAt,
  });

  factory FeedPostModel.fromJson(Map<String, dynamic> json) {
    // Parse author info
    String aId = '';
    String aName = 'Company Member';
    if (json['author'] != null) {
      if (json['author'] is Map) {
        aId = json['author']['_id']?.toString() ?? '';
        final info = json['author']['basicInfo'];
        if (info is Map) {
          aName = '${info['firstName'] ?? 'Someone'} ${info['lastName'] ?? ''}'.trim();
        }
      } else {
        aId = json['author'].toString();
      }
    }

    // Parse attachments
    final List<String> parsedAttachments = [];
    if (json['attachments'] is List) {
      for (final a in json['attachments']) {
        if (a != null) parsedAttachments.add(a.toString());
      }
    }

    // Parse reactions
    final List<FeedReactionModel> parsedReactions = [];
    if (json['reactions'] is List) {
      for (final r in json['reactions']) {
        if (r is Map<String, dynamic>) {
          parsedReactions.add(FeedReactionModel.fromJson(r));
        }
      }
    }

    // Parse viewedBy
    final List<FeedViewedByModel> parsedViewedBy = [];
    if (json['viewedBy'] is List) {
      for (final v in json['viewedBy']) {
        if (v is Map<String, dynamic>) {
          parsedViewedBy.add(FeedViewedByModel.fromJson(v));
        }
      }
    }

    return FeedPostModel(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      authorId: aId,
      authorName: aName,
      postType: json['postType']?.toString() ?? 'General',
      subject: json['subject']?.toString() ?? '',
      content: json['content']?.toString() ?? '',
      attachments: parsedAttachments,
      reactions: parsedReactions,
      commentsCount: json['commentsCount'] as int? ?? 0,
      viewsCount: json['viewsCount'] as int? ?? 0,
      viewedBy: parsedViewedBy,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString()) ?? DateTime.now()
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'author': authorId,
      'postType': postType,
      'subject': subject,
      'content': content,
      'attachments': attachments,
      'reactions': reactions.map((r) => r.toJson()).toList(),
      'commentsCount': commentsCount,
      'viewsCount': viewsCount,
      'viewedBy': viewedBy.map((v) => v.toJson()).toList(),
      'createdAt': createdAt.toIso8601String(),
    };
  }
}

class FeedReactionModel {
  final String employeeId;
  final String reactionType;

  FeedReactionModel({
    required this.employeeId,
    required this.reactionType,
  });

  factory FeedReactionModel.fromJson(Map<String, dynamic> json) {
    return FeedReactionModel(
      employeeId: json['employee']?.toString() ?? '',
      reactionType: json['reactionType']?.toString() ?? 'Like',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'employee': employeeId,
      'reactionType': reactionType,
    };
  }
}

class FeedViewedByModel {
  final String employeeId;
  final DateTime viewedAt;

  FeedViewedByModel({
    required this.employeeId,
    required this.viewedAt,
  });

  factory FeedViewedByModel.fromJson(Map<String, dynamic> json) {
    return FeedViewedByModel(
      employeeId: json['employee']?.toString() ?? '',
      viewedAt: json['viewedAt'] != null
          ? DateTime.tryParse(json['viewedAt'].toString()) ?? DateTime.now()
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'employee': employeeId,
      'viewedAt': viewedAt.toIso8601String(),
    };
  }
}
