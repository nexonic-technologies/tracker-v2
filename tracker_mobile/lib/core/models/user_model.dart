class UserModel {
  final String id;
  final String name;
  final String? role;
  final String? department;
  final String? designation;
  final String? managerId;
  final String? profileImage;
  final String platform;
  final String? userType;
  final String? clientId;
  final String? workEmail;

  UserModel({
    required this.id,
    required this.name,
    this.role,
    this.department,
    this.designation,
    this.managerId,
    this.profileImage,
    required this.platform,
    this.userType,
    this.clientId,
    this.workEmail,
  });

  static String? _safeString(dynamic val) {
    if (val == null) return null;
    if (val is String) {
      final trimmed = val.trim();
      // Filter out raw unpopulated 24-hex Mongo ObjectIDs
      if (RegExp(r'^[0-9a-fA-F]{24}$').hasMatch(trimmed)) {
        return null;
      }
      return val;
    }
    if (val is Map) {
      final nameOrTitle = val['name'] ??
          val['departmentName'] ??
          val['roleName'] ??
          val['title'] ??
          val['label'];
      if (nameOrTitle != null) {
        final str = nameOrTitle.toString().trim();
        if (!RegExp(r'^[0-9a-fA-F]{24}$').hasMatch(str)) {
          return str;
        }
      }
    }
    return null;
  }

  factory UserModel.fromJson(Map<String, dynamic> json) {
    Map<String, dynamic> bInfo = {};
    if (json['basicInfo'] is Map) {
      bInfo = Map<String, dynamic>.from(json['basicInfo']);
    }

    Map<String, dynamic> pInfo = {};
    if (json['professionalInfo'] is Map) {
      pInfo = Map<String, dynamic>.from(json['professionalInfo']);
    }

    Map<String, dynamic> aInfo = {};
    if (json['authInfo'] is Map) {
      aInfo = Map<String, dynamic>.from(json['authInfo']);
    }

    // 1. Work Email (Resolved primarily from authInfo.workEmail)
    String? resolvedEmail = _safeString(aInfo['workEmail']) ??
        _safeString(json['workEmail']) ??
        _safeString(bInfo['workEmail']) ??
        _safeString(bInfo['email']) ??
        _safeString(json['email']);

    // 2. Department (Resolved from professionalInfo.department or top-level department)
    String? resolvedDept = _safeString(pInfo['department']) ??
        _safeString(json['department']) ??
        _safeString(bInfo['department']);

    // 3. Role (Resolved from professionalInfo.role, userType, or top-level role)
    String? resolvedRole = _safeString(pInfo['role']) ??
        _safeString(json['role']) ??
        _safeString(json['userType']) ??
        _safeString(bInfo['role']);

    // 4. Designation (Resolved from professionalInfo.designation or top-level designation)
    String? resolvedDesignation = _safeString(pInfo['designation']) ??
        _safeString(json['designation']) ??
        _safeString(bInfo['designation']);

    // 5. Name (Resolved from basicInfo.firstName + lastName or top-level name)
    String resolvedName = _safeString(json['name']) ?? '';
    if (resolvedName.isEmpty && (bInfo['firstName'] != null || bInfo['lastName'] != null)) {
      resolvedName = '${bInfo['firstName'] ?? ''} ${bInfo['lastName'] ?? ''}'.trim();
    }

    // 6. Profile Image
    String? imgUrl = _safeString(json['profileImage']) ?? _safeString(bInfo['profileImage']);

    return UserModel(
      id: _safeString(json['id'] ?? json['_id']) ?? '',
      name: resolvedName.isNotEmpty ? resolvedName : 'Employee',
      role: resolvedRole,
      department: resolvedDept,
      designation: resolvedDesignation,
      managerId: _safeString(pInfo['reportingManager'] ?? json['managerId']),
      profileImage: imgUrl,
      platform: _safeString(json['platform']) ?? 'mobile',
      userType: _safeString(json['userType']),
      clientId: _safeString(json['clientId']),
      workEmail: resolvedEmail,
    );
  }

  Map<String, dynamic> toJson() {
    return {
  'id': id,
  'name': name,
  'role': role,
  'department': department,
  'designation': designation,
  'managerId': managerId,
  'profileImage': profileImage,
  'platform': platform,
  'userType': userType,
  'clientId': clientId,
  'workEmail': workEmail,
};
  }
}

class UserSession {
  final String accessToken;
  final String refreshToken;
  final String sessionId;
  final UserModel user;

  UserSession({
    required this.accessToken,
    required this.refreshToken,
    required this.sessionId,
    required this.user,
  });

  factory UserSession.fromJson(Map<String, dynamic> json, Map<String, dynamic> decodedJwt) {
    return UserSession(
      accessToken: json['accessToken'] ?? '',
      refreshToken: json['refreshToken'] ?? '',
      sessionId: json['sessionId'] ?? '',
      user: UserModel.fromJson(decodedJwt),
    );
  }
}
