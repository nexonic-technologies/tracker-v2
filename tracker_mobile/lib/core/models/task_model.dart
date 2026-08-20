class TaskModel {
  final String id;
  final String title;
  final String description;
  final String priority;
  final String status;
  final String deliveryStage;
  final DateTime? dueDate;
  final String? milestoneId;
  final String? milestoneName;
  final List<String> followers;
  final List<String> attachments;
  final List<TaskCommentModel> comments;

  TaskModel({
    required this.id,
    required this.title,
    required this.description,
    required this.priority,
    required this.status,
    required this.deliveryStage,
    this.dueDate,
    this.milestoneId,
    this.milestoneName,
    required this.followers,
    required this.attachments,
    required this.comments,
  });

  factory TaskModel.fromJson(Map<String, dynamic> json) {
    // Parse followers
    final List<String> parsedFollowers = [];
    if (json['followers'] is List) {
      for (final f in json['followers']) {
        if (f is String) parsedFollowers.add(f);
        if (f is Map) {
          final fName = f['name'] ?? f['_id'] ?? '';
          if (fName.isNotEmpty) parsedFollowers.add(fName.toString());
        }
      }
    }

    // Parse attachments
    final List<String> parsedAttachments = [];
    if (json['attachments'] is List) {
      for (final a in json['attachments']) {
        if (a != null) parsedAttachments.add(a.toString());
      }
    }

    // Parse comments
    final List<TaskCommentModel> parsedComments = [];
    if (json['comments'] is List) {
      for (final c in json['comments']) {
        if (c is Map<String, dynamic>) {
          parsedComments.add(TaskCommentModel.fromJson(c));
        }
      }
    }

    // Parse milestone
    String? mId;
    String? mName;
    if (json['milestoneId'] != null) {
      if (json['milestoneId'] is Map) {
        mId = json['milestoneId']['_id']?.toString();
        mName = json['milestoneId']['name']?.toString();
      } else {
        mId = json['milestoneId'].toString();
      }
    }

    return TaskModel(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      description: json['description']?.toString() ?? '',
      priority: json['priority']?.toString() ?? 'Medium',
      status: json['status']?.toString() ?? 'Pending',
      deliveryStage: json['deliveryStage']?.toString() ?? 'Development',
      dueDate: json['dueDate'] != null ? DateTime.tryParse(json['dueDate'].toString()) : null,
      milestoneId: mId,
      milestoneName: mName,
      followers: parsedFollowers,
      attachments: parsedAttachments,
      comments: parsedComments,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'description': description,
      'priority': priority,
      'status': status,
      'deliveryStage': deliveryStage,
      'dueDate': dueDate?.toIso8601String(),
      'milestoneId': milestoneId,
      'followers': followers,
      'attachments': attachments,
      'comments': comments.map((c) => c.toJson()).toList(),
    };
  }
}

class TaskCommentModel {
  final String id;
  final String authorId;
  final String authorName;
  final String content;
  final DateTime createdAt;

  TaskCommentModel({
    required this.id,
    required this.authorId,
    required this.authorName,
    required this.content,
    required this.createdAt,
  });

  factory TaskCommentModel.fromJson(Map<String, dynamic> json) {
    String aId = '';
    String aName = 'Team Member';
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

    return TaskCommentModel(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      authorId: aId,
      authorName: aName,
      content: json['content']?.toString() ?? '',
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString()) ?? DateTime.now()
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'authorId': authorId,
      'content': content,
      'createdAt': createdAt.toIso8601String(),
    };
  }
}
