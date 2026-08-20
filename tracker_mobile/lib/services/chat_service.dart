import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'api.dart';

class ChatMessageModel {
  final String id;
  final String conversationId;
  final String senderId;
  final String recipientId;
  final String message;
  final String type;
  final List<dynamic> attachments;
  String status; // 'sending', 'sent', 'delivered', 'read'
  final DateTime sentAt;
  DateTime? readAt;

  ChatMessageModel({
    required this.id,
    required this.conversationId,
    required this.senderId,
    required this.recipientId,
    required this.message,
    this.type = 'text',
    this.attachments = const [],
    this.status = 'sent',
    required this.sentAt,
    this.readAt,
  });

  factory ChatMessageModel.fromJson(Map<String, dynamic> json) {
    final senderObj = json['sender'];
    final sId = senderObj is Map
        ? (senderObj['_id'] ?? senderObj['id'])?.toString()
        : senderObj?.toString();

    final recipientObj = json['recipient'];
    final rId = recipientObj is Map
        ? (recipientObj['_id'] ?? recipientObj['id'])?.toString()
        : recipientObj?.toString();

    return ChatMessageModel(
      id:
          (json['_id'] ??
                  json['id'] ??
                  DateTime.now().millisecondsSinceEpoch.toString())
              .toString(),
      conversationId: json['conversationId'] ?? '',
      senderId: sId ?? '',
      recipientId: rId ?? '',
      message: json['message'] ?? '',
      type: json['type'] ?? 'text',
      attachments: json['attachments'] is List ? json['attachments'] : [],
      status: json['status'] ?? 'sent',
      sentAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt']).toLocal()
          : (json['sentAt'] != null
                ? DateTime.parse(json['sentAt']).toLocal()
                : DateTime.now()),
      readAt: json['readAt'] != null
          ? DateTime.parse(json['readAt']).toLocal()
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'conversationId': conversationId,
      'senderId': senderId,
      'recipientId': recipientId,
      'message': message,
      'type': type,
      'attachments': attachments,
      'status': status,
      'sentAt': sentAt.toIso8601String(),
      'readAt': readAt?.toIso8601String(),
    };
  }
}

class ChatService {
  static final ChatService _instance = ChatService._internal();
  factory ChatService() => _instance;
  ChatService._internal();

  final ApiService _api = ApiService();

  // Helper to generate deterministic conversationId
  static String getConversationId(String userA, String userB) {
    final ids = [userA, userB]..sort();
    return '${ids[0]}_${ids[1]}';
  }

  // Fetch initial chat history via REST (One-time call on chat open)
  Future<List<ChatMessageModel>> fetchHistory(String conversationId) async {
    try {
      final res = await _api.readModel(
        'team_messages',
        query: {
          'filter': {'conversationId': conversationId},
          'sort': {'createdAt': 1},
          'limit': 200,
          'populateFields': {
            'sender':
                'basicInfo.firstName,basicInfo.lastName,basicInfo.profileImage',
            'recipient':
                'basicInfo.firstName,basicInfo.lastName,basicInfo.profileImage',
          },
        },
      );

      if (res.statusCode == 200 && res.data != null) {
        final List<dynamic> data = res.data['data'] ?? [];
        return data.map((json) => ChatMessageModel.fromJson(json)).toList();
      }
    } catch (e) {
      debugPrint('[ChatService] Error fetching history: $e');
    }
    return [];
  }

  // Post new message to REST API (Fallback / standard persistence)
  Future<ChatMessageModel?> sendMessage({
    required String senderId,
    required String recipientId,
    required String message,
    String type = 'text',
    List<dynamic> attachments = const [],
  }) async {
    final conversationId = getConversationId(senderId, recipientId);

    try {
      final res = await _api.createModel('team_messages', {
        'conversationId': conversationId,
        'sender': senderId,
        'recipient': recipientId,
        'message': message,
        'type': type,
        'attachments': attachments,
        'status': 'sent',
        'sentAt': DateTime.now().toIso8601String(),
      });

      if (res.statusCode == 201 || res.statusCode == 200) {
        final data = res.data['data'] ?? res.data;
        if (data is Map<String, dynamic>) {
          return ChatMessageModel.fromJson(data);
        }
      }
    } catch (e) {
      debugPrint('[ChatService] Error sending message via REST: $e');
    }
    return null;
  }

  // Mark unread messages as read
  Future<void> markMessagesAsRead(
    String conversationId,
    String currentUserId,
  ) async {
    try {
      final unreadRes = await _api.readModel(
        'team_messages',
        query: {
          'filter': {
            'conversationId': conversationId,
            'recipient': currentUserId,
            'status': {'\$ne': 'read'},
          },
          'limit': 100,
        },
      );

      if (unreadRes.statusCode == 200 && unreadRes.data != null) {
        final List<dynamic> unreadMsgs = unreadRes.data['data'] ?? [];
        for (var msg in unreadMsgs) {
          final msgId = msg['_id'] ?? msg['id'];
          if (msgId != null) {
            await _api.updateModel('team_messages', msgId.toString(), {
              'status': 'read',
              'readAt': DateTime.now().toIso8601String(),
            });
          }
        }
      }
    } catch (e) {
      debugPrint('[ChatService] Error marking read: $e');
    }
  }

  // Local draft management (Draft persistence)
  Future<void> saveDraft(String conversationId, String text) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      if (text.trim().isEmpty) {
        await prefs.remove('chat_draft_$conversationId');
      } else {
        await prefs.setString('chat_draft_$conversationId', text);
      }
    } catch (_) {}
  }

  Future<String> loadDraft(String conversationId) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      return prefs.getString('chat_draft_$conversationId') ?? '';
    } catch (_) {
      return '';
    }
  }
}
