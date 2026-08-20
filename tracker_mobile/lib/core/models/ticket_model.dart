class TicketModel {
  final String id;
  final String title;
  final String description;
  final String status;
  final String priority;
  final String category;
  final String? assignedAgentId;
  final String? assignedAgentName;
  final String? linkedTaskId;
  final List<String> attachments;
  final List<TicketCommentModel> comments;

  TicketModel({
    required this.id,
    required this.title,
    required this.description,
    required this.status,
    required this.priority,
    required this.category,
    this.assignedAgentId,
    this.assignedAgentName,
    this.linkedTaskId,
    required this.attachments,
    required this.comments,
  });

  factory TicketModel.fromJson(Map<String, dynamic> json) {
    // Parse attachments
    final List<String> parsedAttachments = [];
    if (json['attachments'] is List) {
      for (final a in json['attachments']) {
        if (a != null) parsedAttachments.add(a.toString());
      }
    }

    // Parse comments
    final List<TicketCommentModel> parsedComments = [];
    if (json['comments'] is List) {
      for (final c in json['comments']) {
        if (c is Map<String, dynamic>) {
          parsedComments.add(TicketCommentModel.fromJson(c));
        }
      }
    }

    // Parse agent
    String? agentId;
    String? agentName;
    if (json['assignedAgentId'] != null) {
      if (json['assignedAgentId'] is Map) {
        agentId = json['assignedAgentId']['_id']?.toString();
        final info = json['assignedAgentId']['basicInfo'];
        if (info is Map) {
          agentName = '${info['firstName'] ?? 'Someone'} ${info['lastName'] ?? ''}'.trim();
        }
      } else {
        agentId = json['assignedAgentId'].toString();
      }
    }

    return TicketModel(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      description: json['description']?.toString() ?? '',
      status: json['status']?.toString() ?? 'Open',
      priority: json['priority']?.toString() ?? 'Medium',
      category: json['category']?.toString() ?? 'General',
      assignedAgentId: agentId,
      assignedAgentName: agentName,
      linkedTaskId: json['linkedTaskId']?.toString(),
      attachments: parsedAttachments,
      comments: parsedComments,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'description': description,
      'status': status,
      'priority': priority,
      'category': category,
      'assignedAgentId': assignedAgentId,
      'linkedTaskId': linkedTaskId,
      'attachments': attachments,
      'comments': comments.map((c) => c.toJson()).toList(),
    };
  }
}

class TicketCommentModel {
  final String id;
  final String authorId;
  final String authorName;
  final String content;
  final DateTime createdAt;

  TicketCommentModel({
    required this.id,
    required this.authorId,
    required this.authorName,
    required this.content,
    required this.createdAt,
  });

  factory TicketCommentModel.fromJson(Map<String, dynamic> json) {
    String aId = '';
    String aName = 'Support Agent';
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

    return TicketCommentModel(
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
