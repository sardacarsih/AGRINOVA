import 'dart:developer' as developer;
import 'package:json_annotation/json_annotation.dart';
import 'package:equatable/equatable.dart';

part 'jwt_models.g.dart';

void _debugLog(Object? message) {
  developer.log(message?.toString() ?? 'null');
}

// JWT Login Request Model
@JsonSerializable()
class JWTLoginRequest extends Equatable {
  final String username;
  final String password;
  final String deviceId;
  final String deviceFingerprint;
  final String? fingerprint;
  final String? platform;
  final String? biometricHash;
  final bool? rememberDevice;

  const JWTLoginRequest({
    required this.username,
    required this.password,
    required this.deviceId,
    required this.deviceFingerprint,
    this.fingerprint,
    this.platform,
    this.biometricHash,
    this.rememberDevice,
  });

  factory JWTLoginRequest.fromJson(Map<String, dynamic> json) =>
      _$JWTLoginRequestFromJson(json);

  Map<String, dynamic> toJson() => _$JWTLoginRequestToJson(this);

  @override
  List<Object?> get props => [
        username,
        password,
        deviceId,
        deviceFingerprint,
        fingerprint,
        platform,
        biometricHash,
        rememberDevice,
      ];
}

// Supporting Models for Enhanced User Response
@JsonSerializable()
class AssignmentScope extends Equatable {
  final List<String> companies;
  final List<String> estates;
  final List<String> divisions;

  const AssignmentScope({
    this.companies = const [],
    this.estates = const [],
    this.divisions = const [],
  });

  factory AssignmentScope.fromJson(Map<String, dynamic> json) =>
      _$AssignmentScopeFromJson(json);

  Map<String, dynamic> toJson() => _$AssignmentScopeToJson(this);

  @override
  List<Object?> get props => [companies, estates, divisions];
}

@JsonSerializable()
class RoleInfo extends Equatable {
  final String label;
  final String description;
  final String permissionSource;

  const RoleInfo({
    required this.label,
    required this.description,
    required this.permissionSource,
  });

  factory RoleInfo.fromJson(Map<String, dynamic> json) =>
      _$RoleInfoFromJson(json);

  Map<String, dynamic> toJson() => _$RoleInfoToJson(this);

  @override
  List<Object?> get props => [label, description, permissionSource];
}

// Enhanced User Model
@JsonSerializable()
class User extends Equatable {
  final String id;
  final String username;
  final String email;
  final String role;
  final String fullName;
  final bool isActive;
  final bool mustChangePassword;

  // Company information
  final String? companyId;
  final String? companyName;

  // Manager information
  final String? managerId;
  final String? managerName;
  final String? avatar;

  // Legacy fields for backward compatibility
  final String? estate;
  final String? division;

  // Enhanced fields from new API response
  final List<String> permissions;
  final List<String> availableActions;
  final List<String> companyAccess;
  final List<String> assignedEstates;
  final List<String> assignedDivisions;
  final List<String> assignedCompanies;
  final AssignmentScope? assignmentScope;
  final RoleInfo? roleInfo;

  const User({
    required this.id,
    required this.username,
    required this.email,
    required this.role,
    required this.fullName,
    this.isActive = true,
    this.mustChangePassword = false,
    this.companyId,
    this.companyName,
    this.managerId,
    this.managerName,
    this.avatar,
    this.estate,
    this.division,
    this.permissions = const [],
    this.availableActions = const [],
    this.companyAccess = const [],
    this.assignedEstates = const [],
    this.assignedDivisions = const [],
    this.assignedCompanies = const [],
    this.assignmentScope,
    this.roleInfo,
  });

  User copyWith({
    String? id,
    String? username,
    String? email,
    String? role,
    String? fullName,
    bool? isActive,
    bool? mustChangePassword,
    String? companyId,
    String? companyName,
    String? managerId,
    String? managerName,
    String? avatar,
    String? estate,
    String? division,
    List<String>? permissions,
    List<String>? availableActions,
    List<String>? companyAccess,
    List<String>? assignedEstates,
    List<String>? assignedDivisions,
    List<String>? assignedCompanies,
    AssignmentScope? assignmentScope,
    RoleInfo? roleInfo,
  }) {
    return User(
      id: id ?? this.id,
      username: username ?? this.username,
      email: email ?? this.email,
      role: role ?? this.role,
      fullName: fullName ?? this.fullName,
      isActive: isActive ?? this.isActive,
      mustChangePassword: mustChangePassword ?? this.mustChangePassword,
      companyId: companyId ?? this.companyId,
      companyName: companyName ?? this.companyName,
      managerId: managerId ?? this.managerId,
      managerName: managerName ?? this.managerName,
      avatar: avatar ?? this.avatar,
      estate: estate ?? this.estate,
      division: division ?? this.division,
      permissions: permissions ?? this.permissions,
      availableActions: availableActions ?? this.availableActions,
      companyAccess: companyAccess ?? this.companyAccess,
      assignedEstates: assignedEstates ?? this.assignedEstates,
      assignedDivisions: assignedDivisions ?? this.assignedDivisions,
      assignedCompanies: assignedCompanies ?? this.assignedCompanies,
      assignmentScope: assignmentScope ?? this.assignmentScope,
      roleInfo: roleInfo ?? this.roleInfo,
    );
  }

  factory User.fromJson(Map<String, dynamic> json) {
    // Helper function to safely parse string lists
    List<String> parseStringList(dynamic value) {
      if (value == null) return const [];
      if (value is List) {
        return value.map((e) => e.toString()).toList();
      }
      return const [];
    }

    // Parse fullName with fallback - also check 'nama' from GraphQL response
    String fullName = json['fullName'] as String? ??
        json['full_name'] as String? ??
        json['name'] as String? ??
        json['nama'] as String? ??
        json['displayName'] as String? ??
        json['username'] as String? ??
        'Unknown User';

    // Parse companyName - handle nested company object from GraphQL
    String? companyName = json['companyName'] as String?;
    if (companyName == null && json['company'] != null) {
      // GraphQL returns nested company object with 'name' field (or 'nama' for legacy)
      final company = json['company'];
      if (company is Map<String, dynamic>) {
        companyName = company['name'] as String? ?? company['nama'] as String?;
      }
    }

    // Parse manager fields - handle nested manager object from GraphQL.
    String? managerName = json['managerName'] as String?;
    String? managerId = json['managerId'] as String?;
    if (managerName == null && json['manager'] != null) {
      final manager = json['manager'];
      if (manager is Map<String, dynamic>) {
        managerName = manager['name'] as String? ??
            manager['nama'] as String? ??
            manager['fullName'] as String? ??
            manager['full_name'] as String? ??
            manager['username'] as String?;
        managerId ??= manager['id'] as String?;
      }
    }

    // Parse nested objects with null safety
    AssignmentScope? assignmentScope;
    if (json['assignmentScope'] != null) {
      try {
        assignmentScope = AssignmentScope.fromJson(
            json['assignmentScope'] as Map<String, dynamic>);
      } catch (e) {
        _debugLog('⚠️ Failed to parse assignmentScope: $e');
      }
    }

    RoleInfo? roleInfo;
    if (json['roleInfo'] != null) {
      try {
        roleInfo = RoleInfo.fromJson(json['roleInfo'] as Map<String, dynamic>);
      } catch (e) {
        _debugLog('⚠️ Failed to parse roleInfo: $e');
      }
    }

    // Handle email being null in GraphQL response
    final email = json['email'] as String? ?? '';

    return User(
      id: json['id'] as String,
      username: json['username'] as String,
      email: email,
      role: json['role'] as String,
      fullName: fullName,
      isActive: json['isActive'] as bool? ?? true,
      mustChangePassword: json['mustChangePassword'] as bool? ?? false,
      companyId: json['companyId'] as String?,
      companyName: companyName,
      managerId: managerId,
      managerName: managerName,
      avatar: json['avatar'] as String?,
      estate: json['estate'] as String?,
      division: json['division'] as String?,
      permissions: parseStringList(json['permissions']),
      availableActions: parseStringList(json['availableActions']),
      companyAccess: parseStringList(json['companyAccess']),
      assignedEstates: parseStringList(json['assignedEstates']),
      assignedDivisions: parseStringList(json['assignedDivisions']),
      assignedCompanies: parseStringList(json['assignedCompanies']),
      assignmentScope: assignmentScope,
      roleInfo: roleInfo,
    );
  }

  Map<String, dynamic> toJson() => _$UserToJson(this);

  @override
  List<Object?> get props => [
        id,
        username,
        email,
        role,
        fullName,
        isActive,
        mustChangePassword,
        companyId,
        companyName,
        managerId,
        managerName,
        avatar,
        estate,
        division,
        permissions,
        availableActions,
        companyAccess,
        assignedEstates,
        assignedDivisions,
        assignedCompanies,
        assignmentScope,
        roleInfo,
      ];

  // Utility methods for role-based access
  bool get hasAssignedEstates => assignedEstates.isNotEmpty;
  bool get hasAssignedDivisions => assignedDivisions.isNotEmpty;
  bool get hasAssignedCompanies => assignedCompanies.isNotEmpty;

  bool hasPermission(String permission) => permissions.contains(permission);
  bool canPerformAction(String action) => availableActions.contains(action);

  // Get effective assignment scope
  List<String> getEffectiveCompanies() {
    if (assignmentScope?.companies.isNotEmpty == true) {
      return assignmentScope!.companies;
    }
    return assignedCompanies.isNotEmpty
        ? assignedCompanies
        : (companyId != null ? [companyId!] : companyAccess);
  }

  List<String> getEffectiveEstates() {
    if (assignmentScope?.estates.isNotEmpty == true) {
      return assignmentScope!.estates;
    }
    return assignedEstates;
  }

  List<String> getEffectiveDivisions() {
    if (assignmentScope?.divisions.isNotEmpty == true) {
      return assignmentScope!.divisions;
    }
    return assignedDivisions;
  }
}

// Session Model
@JsonSerializable()
class Session extends Equatable {
  final String sessionId;
  final String deviceId;
  final DateTime createdAt;

  const Session({
    required this.sessionId,
    required this.deviceId,
    required this.createdAt,
  });

  factory Session.fromJson(Map<String, dynamic> json) =>
      _$SessionFromJson(json);
  Map<String, dynamic> toJson() => _$SessionToJson(this);

  @override
  List<Object?> get props => [sessionId, deviceId, createdAt];
}

// Go GraphQL AuthPayload Models (matching Go server schema)

@JsonSerializable()
class AuthCompany extends Equatable {
  final String id;
  final String name;
  final String? kodePabrik;
  final String? alamat;
  final double? latitude;
  final double? longitude;
  final String? contactPerson;
  final String? telepon;
  final String? email;
  final String? status;
  final String? tanggalBerdiri;
  final double? luasLahan;
  final int? jumlahBlok;
  final String? varietasUtama;
  final double? kapasitasPabrik;
  final String? createdAt;
  final String? updatedAt;

  const AuthCompany({
    required this.id,
    required this.name,
    this.kodePabrik,
    this.alamat,
    this.latitude,
    this.longitude,
    this.contactPerson,
    this.telepon,
    this.email,
    this.status,
    this.tanggalBerdiri,
    this.luasLahan,
    this.jumlahBlok,
    this.varietasUtama,
    this.kapasitasPabrik,
    this.createdAt,
    this.updatedAt,
  });

  factory AuthCompany.fromJson(Map<String, dynamic> json) =>
      _$AuthCompanyFromJson(json);
  Map<String, dynamic> toJson() => _$AuthCompanyToJson(this);

  @override
  List<Object?> get props => [
        id,
        name,
        kodePabrik,
        alamat,
        latitude,
        longitude,
        contactPerson,
        telepon,
        email,
        status,
        tanggalBerdiri,
        luasLahan,
        jumlahBlok,
        varietasUtama,
        kapasitasPabrik,
        createdAt,
        updatedAt
      ];
}

@JsonSerializable()
class AuthEstate extends Equatable {
  final String id;
  final String name;
  final String? kode;
  final String? companyId;
  final String? areaManager;
  final String? manager;
  final String? alamat;
  final double? latitude;
  final double? longitude;
  final double? luasTotal;
  final double? luasPlantingArea;
  final int? jumlahBlok;
  final String? varietasUtama;
  final String? tahunTanam;
  final String? statusOperasional;
  final String? createdAt;
  final String? updatedAt;

  const AuthEstate({
    required this.id,
    required this.name,
    this.kode,
    this.companyId,
    this.areaManager,
    this.manager,
    this.alamat,
    this.latitude,
    this.longitude,
    this.luasTotal,
    this.luasPlantingArea,
    this.jumlahBlok,
    this.varietasUtama,
    this.tahunTanam,
    this.statusOperasional,
    this.createdAt,
    this.updatedAt,
  });

  factory AuthEstate.fromJson(Map<String, dynamic> json) =>
      _$AuthEstateFromJson(json);
  Map<String, dynamic> toJson() => _$AuthEstateToJson(this);

  @override
  List<Object?> get props => [
        id,
        name,
        kode,
        companyId,
        areaManager,
        manager,
        alamat,
        latitude,
        longitude,
        luasTotal,
        luasPlantingArea,
        jumlahBlok,
        varietasUtama,
        tahunTanam,
        statusOperasional,
        createdAt,
        updatedAt
      ];
}

@JsonSerializable()
class AuthDivision extends Equatable {
  final String id;
  final String name;
  final String? kode;
  final String? estateId;
  final String? asisten;
  final String? mandor;
  final double? luasDivisi;
  final int? jumlahBlok;
  final String? varietasDominan;
  final int? umurTanamanRataRata;
  final double? targetProduksi;
  final String? statusOperasional;
  final String? createdAt;
  final String? updatedAt;

  const AuthDivision({
    required this.id,
    required this.name,
    this.kode,
    this.estateId,
    this.asisten,
    this.mandor,
    this.luasDivisi,
    this.jumlahBlok,
    this.varietasDominan,
    this.umurTanamanRataRata,
    this.targetProduksi,
    this.statusOperasional,
    this.createdAt,
    this.updatedAt,
  });

  factory AuthDivision.fromJson(Map<String, dynamic> json) =>
      _$AuthDivisionFromJson(json);
  Map<String, dynamic> toJson() => _$AuthDivisionToJson(this);

  @override
  List<Object?> get props => [
        id,
        name,
        kode,
        estateId,
        asisten,
        mandor,
        luasDivisi,
        jumlahBlok,
        varietasDominan,
        umurTanamanRataRata,
        targetProduksi,
        statusOperasional,
        createdAt,
        updatedAt
      ];
}

@JsonSerializable()
class UserAssignments extends Equatable {
  final List<AuthCompany> companies;
  final List<AuthEstate> estates;
  final List<AuthDivision> divisions;

  const UserAssignments({
    this.companies = const [],
    this.estates = const [],
    this.divisions = const [],
  });

  factory UserAssignments.fromJson(Map<String, dynamic> json) =>
      _$UserAssignmentsFromJson(json);
  Map<String, dynamic> toJson() => _$UserAssignmentsToJson(this);

  @override
  List<Object?> get props => [companies, estates, divisions];
}

@JsonSerializable()
class AuthUser extends Equatable {
  final String id;
  final String username;
  final String? name;
  final String? email;
  final String role;
  final String? companyId;
  final String? companyName;
  final String? managerId;
  final String? managerName;
  final List<String>? permissions;
  final Map<String, dynamic>? profile;
  final String? createdAt;
  final String? updatedAt;

  const AuthUser({
    required this.id,
    required this.username,
    this.name,
    this.email,
    required this.role,
    this.companyId,
    this.companyName,
    this.managerId,
    this.managerName,
    this.permissions,
    this.profile,
    this.createdAt,
    this.updatedAt,
  });

  factory AuthUser.fromJson(Map<String, dynamic> json) {
    List<String>? permissions;
    if (json['permissions'] != null) {
      if (json['permissions'] is List) {
        permissions =
            (json['permissions'] as List).map((e) => e.toString()).toList();
      }
    }

    String? companyName = json['companyName'] as String?;
    if (companyName == null && json['company'] != null) {
      final company = json['company'];
      if (company is Map<String, dynamic>) {
        companyName = company['name'] as String? ?? company['nama'] as String?;
      }
    }

    // Parse managerName - handle nested manager object from GraphQL
    String? managerName = json['managerName'] as String?;
    String? managerId = json['managerId'] as String?;

    if (json['manager'] != null) {
      final manager = json['manager'];
      if (manager is Map<String, dynamic>) {
        managerName ??=
            manager['name'] as String? ?? manager['nama'] as String?;
        managerId ??= manager['id'] as String?;
      }
    }

    return AuthUser(
      id: json['id'] as String,
      username: json['username'] as String,
      name: json['name'] as String?,
      email: json['email'] as String?,
      role: json['role'] as String,
      companyId: json['companyId'] as String?,
      companyName: companyName,
      managerId: managerId,
      managerName: managerName,
      permissions: permissions,
      profile: json['profile'] as Map<String, dynamic>?,
      createdAt: json['createdAt'] as String?,
      updatedAt: json['updatedAt'] as String?,
    );
  }

  Map<String, dynamic> toJson() => _$AuthUserToJson(this);

  @override
  List<Object?> get props => [
        id,
        username,
        name,
        email,
        role,
        companyId,
        companyName,
        managerId,
        managerName,
        permissions,
        profile,
        createdAt,
        updatedAt
      ];
}

@JsonSerializable()
class AuthPayload extends Equatable {
  final String accessToken;
  final String refreshToken;
  final String? offlineToken;
  final String tokenType;
  final int expiresIn;
  final String expiresAt;
  final String? refreshExpiresAt;
  final String? offlineExpiresAt;
  final AuthUser user;
  final UserAssignments? assignments;

  const AuthPayload({
    required this.accessToken,
    required this.refreshToken,
    this.offlineToken,
    required this.tokenType,
    required this.expiresIn,
    required this.expiresAt,
    this.refreshExpiresAt,
    this.offlineExpiresAt,
    required this.user,
    this.assignments,
  });

  factory AuthPayload.fromJson(Map<String, dynamic> json) =>
      _$AuthPayloadFromJson(json);
  Map<String, dynamic> toJson() => _$AuthPayloadToJson(this);

  @override
  List<Object?> get props => [
        accessToken,
        refreshToken,
        offlineToken,
        tokenType,
        expiresIn,
        expiresAt,
        refreshExpiresAt,
        offlineExpiresAt,
        user,
        assignments
      ];
}

@JsonSerializable()
class WebLoginPayload extends Equatable {
  final bool success;
  final String message;
  final String? sessionId;
  final AuthUser? user;
  final UserAssignments? assignments;

  const WebLoginPayload({
    required this.success,
    required this.message,
    this.sessionId,
    this.user,
    this.assignments,
  });

  factory WebLoginPayload.fromJson(Map<String, dynamic> json) =>
      _$WebLoginPayloadFromJson(json);
  Map<String, dynamic> toJson() => _$WebLoginPayloadToJson(this);

  @override
  List<Object?> get props => [success, message, sessionId, user, assignments];
}

// JWT Login Response Model (Legacy - keep for backward compatibility)
@JsonSerializable()
class JWTLoginResponse extends Equatable {
  final String accessToken;
  final String refreshToken;
  final String? offlineToken;
  final String? deviceBinding;
  final String tokenType;
  final int expiresIn;
  final DateTime expiresAt;
  final DateTime? offlineExpiresAt;
  final User user;
  final Session? session;
  final bool deviceTrusted;
  final bool? isFirstLogin;

  const JWTLoginResponse({
    required this.accessToken,
    required this.refreshToken,
    this.offlineToken,
    this.deviceBinding,
    required this.tokenType,
    required this.expiresIn,
    required this.expiresAt,
    this.offlineExpiresAt,
    required this.user,
    this.session,
    required this.deviceTrusted,
    this.isFirstLogin,
  });

  factory JWTLoginResponse.fromJson(Map<String, dynamic> json) {
    // Parse user with null safety
    final userData = json['user'];
    if (userData == null) {
      throw Exception('Missing user data in response');
    }

    // Parse session with null safety
    Session? session;
    if (json['session'] != null) {
      try {
        session = Session.fromJson(json['session'] as Map<String, dynamic>);
      } catch (e) {
        _debugLog('⚠️ Failed to parse session: $e');
      }
    }

    // Parse expiresAt with fallback
    DateTime expiresAt;
    if (json['expiresAt'] != null) {
      expiresAt = json['expiresAt'] is String
          ? DateTime.parse(json['expiresAt'] as String)
          : DateTime.fromMillisecondsSinceEpoch(
              (json['expiresAt'] as int) * 1000);
    } else {
      // Default: 1 hour from now
      expiresAt = DateTime.now().add(const Duration(hours: 1));
    }

    // Parse offlineExpiresAt with null safety
    DateTime? offlineExpiresAt;
    if (json['offlineExpiresAt'] != null) {
      offlineExpiresAt = json['offlineExpiresAt'] is String
          ? DateTime.parse(json['offlineExpiresAt'] as String)
          : DateTime.fromMillisecondsSinceEpoch(
              (json['offlineExpiresAt'] as int) * 1000);
    }

    // Normalize user payload so legacy callers do not depend on root-level
    // assignments just to derive company/estate/division labels.
    final mergedUserData = Map<String, dynamic>.from(userData as Map<String, dynamic>);

    final company = mergedUserData['company'];
    if (company is Map<String, dynamic>) {
      final companyId = company['id'] as String?;
      final companyName = company['name'] as String? ?? company['nama'] as String?;
      if (companyId != null && mergedUserData['companyId'] == null) {
        mergedUserData['companyId'] = companyId;
      }
      if (companyName != null && mergedUserData['companyName'] == null) {
        mergedUserData['companyName'] = companyName;
      }
    }

    final estates = mergedUserData['estates'];
    if (estates is List && estates.isNotEmpty) {
      final firstEstate = estates.first;
      if (firstEstate is Map<String, dynamic>) {
        final estateName =
            firstEstate['name'] as String? ?? firstEstate['nama'] as String?;
        if (estateName != null && mergedUserData['estate'] == null) {
          mergedUserData['estate'] = estateName;
        }
      }
    }

    final divisions = mergedUserData['divisions'];
    if (divisions is List && divisions.isNotEmpty) {
      final firstDivision = divisions.first;
      if (firstDivision is Map<String, dynamic>) {
        final divisionName =
            firstDivision['name'] as String? ?? firstDivision['nama'] as String?;
        if (divisionName != null && mergedUserData['division'] == null) {
          mergedUserData['division'] = divisionName;
        }
      }
    }

    return JWTLoginResponse(
      accessToken: json['accessToken'] as String,
      refreshToken: json['refreshToken'] as String,
      offlineToken: json['offlineToken'] as String?,
      deviceBinding: json['deviceBinding'] as String?,
      tokenType: json['tokenType'] as String? ?? 'Bearer',
      expiresIn: json['expiresIn'] as int? ?? 3600,
      expiresAt: expiresAt,
      offlineExpiresAt: offlineExpiresAt,
      user: User.fromJson(mergedUserData),
      session: session,
      deviceTrusted: json['deviceTrusted'] as bool? ?? false,
      isFirstLogin: json['isFirstLogin'] as bool?,
    );
  }

  Map<String, dynamic> toJson() => _$JWTLoginResponseToJson(this);

  @override
  List<Object?> get props => [
        accessToken,
        refreshToken,
        offlineToken,
        deviceBinding,
        tokenType,
        expiresIn,
        expiresAt,
        offlineExpiresAt,
        user,
        session,
        deviceTrusted,
        isFirstLogin,
      ];
}

// JWT Refresh Request Model
@JsonSerializable()
class JWTRefreshRequest extends Equatable {
  final String refreshToken;
  final String?
      deviceId; // Nullable if not always required by refresh endpoint (standard OAuth)
  final String? fingerprint; // Nullable for standard OAuth flow

  const JWTRefreshRequest({
    required this.refreshToken,
    this.deviceId,
    this.fingerprint,
  });

  factory JWTRefreshRequest.fromJson(Map<String, dynamic> json) =>
      _$JWTRefreshRequestFromJson(json);

  Map<String, dynamic> toJson() => _$JWTRefreshRequestToJson(this);

  @override
  List<Object?> get props => [refreshToken, deviceId, fingerprint];
}

// JWT Refresh Response Model
@JsonSerializable()
class JWTRefreshResponse extends Equatable {
  final String accessToken;
  final String refreshToken;
  final String? offlineToken;
  final String? deviceBinding;
  final String tokenType;
  final int expiresIn;
  final DateTime?
      expiresAt; // Changed to DateTime? for consistency or keep formatted string if simpler
  final DateTime? offlineExpiresAt;
  final Session? session;
  final bool? deviceTrusted;

  const JWTRefreshResponse({
    required this.accessToken,
    required this.refreshToken,
    this.offlineToken,
    this.deviceBinding,
    required this.tokenType,
    required this.expiresIn,
    this.expiresAt,
    this.offlineExpiresAt,
    this.session,
    this.deviceTrusted,
  });

  factory JWTRefreshResponse.fromJson(Map<String, dynamic> json) {
    // Parse expiresAt with fallback
    DateTime? expiresAt;
    if (json['expiresAt'] != null) {
      expiresAt = json['expiresAt'] is String
          ? DateTime.parse(json['expiresAt'] as String)
          : DateTime.fromMillisecondsSinceEpoch(
              (json['expiresAt'] as int) * 1000);
    }

    // Parse offlineExpiresAt with null safety
    DateTime? offlineExpiresAt;
    if (json['offlineExpiresAt'] != null) {
      offlineExpiresAt = json['offlineExpiresAt'] is String
          ? DateTime.parse(json['offlineExpiresAt'] as String)
          : DateTime.fromMillisecondsSinceEpoch(
              (json['offlineExpiresAt'] as int) * 1000);
    }

    // Parse session with null safety
    Session? session;
    if (json['session'] != null) {
      try {
        session = Session.fromJson(json['session'] as Map<String, dynamic>);
      } catch (e) {
        _debugLog('⚠️ Failed to parse session: $e');
      }
    }

    return JWTRefreshResponse(
      accessToken: json['accessToken'] as String,
      refreshToken: json['refreshToken'] as String,
      offlineToken: json['offlineToken'] as String?,
      deviceBinding: json['deviceBinding'] as String?,
      tokenType: json['tokenType'] as String? ?? 'Bearer',
      expiresIn: json['expiresIn'] as int? ?? 3600,
      expiresAt: expiresAt,
      offlineExpiresAt: offlineExpiresAt,
      session: session,
      deviceTrusted: json['deviceTrusted'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() => _$JWTRefreshResponseToJson(this);

  @override
  List<Object?> get props => [
        accessToken,
        refreshToken,
        offlineToken,
        deviceBinding,
        tokenType,
        expiresIn,
        expiresAt,
        offlineExpiresAt,
        session,
        deviceTrusted,
      ];
}

// JWT Payload Model (for parsing JWT tokens)
@JsonSerializable()
class JWTPayload extends Equatable {
  final String sub;
  final String? username; // Made optional to handle missing username field
  final String role;
  final String? companyId;
  final String? deviceId;
  final String? deviceFingerprint;
  final String? sessionId;
  final List<String> permissions;
  final int iat;
  final int exp;
  final String jti;

  const JWTPayload({
    required this.sub,
    this.username, // Made optional
    required this.role,
    this.companyId,
    this.deviceId,
    this.deviceFingerprint,
    this.sessionId,
    required this.permissions,
    required this.iat,
    required this.exp,
    required this.jti,
  });

  // Getter to provide username fallback
  String get effectiveUsername => username ?? sub;

  factory JWTPayload.fromJson(Map<String, dynamic> json) =>
      _$JWTPayloadFromJson(json);

  Map<String, dynamic> toJson() => _$JWTPayloadToJson(this);

  // Utility methods
  bool get isExpired =>
      DateTime.fromMillisecondsSinceEpoch(exp * 1000).isBefore(DateTime.now());

  bool get shouldRefresh => DateTime.fromMillisecondsSinceEpoch(exp * 1000)
      .subtract(Duration(minutes: 2))
      .isBefore(DateTime.now());

  DateTime get expirationDate =>
      DateTime.fromMillisecondsSinceEpoch(exp * 1000);

  DateTime get issuedAtDate => DateTime.fromMillisecondsSinceEpoch(iat * 1000);

  @override
  List<Object?> get props => [
        sub,
        username,
        role,
        companyId,
        deviceId,
        deviceFingerprint,
        sessionId,
        permissions,
        iat,
        exp,
        jti,
      ];
}

// Device Registration Request Model
@JsonSerializable()
class DeviceRegistrationRequest extends Equatable {
  final String deviceId;
  final String fingerprint;
  final String platform;
  final String osVersion;
  final String appVersion;
  final String? buildNumber;
  final String? model;
  final String? brand;
  final String? deviceName;

  const DeviceRegistrationRequest({
    required this.deviceId,
    required this.fingerprint,
    required this.platform,
    required this.osVersion,
    required this.appVersion,
    this.buildNumber,
    this.model,
    this.brand,
    this.deviceName,
  });

  factory DeviceRegistrationRequest.fromJson(Map<String, dynamic> json) =>
      _$DeviceRegistrationRequestFromJson(json);

  Map<String, dynamic> toJson() => _$DeviceRegistrationRequestToJson(this);

  @override
  List<Object?> get props => [
        deviceId,
        fingerprint,
        platform,
        osVersion,
        appVersion,
        buildNumber,
        model,
        brand,
        deviceName,
      ];
}

// JWT Offline Token Validation Request Model
@JsonSerializable()
class JWTOfflineValidationRequest extends Equatable {
  final String offlineToken;
  final String deviceId;
  final String fingerprint;

  const JWTOfflineValidationRequest({
    required this.offlineToken,
    required this.deviceId,
    required this.fingerprint,
  });

  factory JWTOfflineValidationRequest.fromJson(Map<String, dynamic> json) =>
      _$JWTOfflineValidationRequestFromJson(json);

  Map<String, dynamic> toJson() => _$JWTOfflineValidationRequestToJson(this);

  @override
  List<Object?> get props => [offlineToken, deviceId, fingerprint];
}

// JWT Offline Token Validation Response Model
@JsonSerializable()
class JWTOfflineValidationResponse extends Equatable {
  final bool valid;
  final JWTPayload? payload;
  final String? reason;

  const JWTOfflineValidationResponse({
    required this.valid,
    this.payload,
    this.reason,
  });

  factory JWTOfflineValidationResponse.fromJson(Map<String, dynamic> json) =>
      _$JWTOfflineValidationResponseFromJson(json);

  Map<String, dynamic> toJson() => _$JWTOfflineValidationResponseToJson(this);

  @override
  List<Object?> get props => [valid, payload, reason];
}

// Device Info Model
@JsonSerializable()
class DeviceInfo extends Equatable {
  final String deviceId;
  final String fingerprint;
  final String platform;
  final String osVersion;
  final String appVersion;
  final String? buildNumber;
  final String? model;
  final String? brand;
  final String? deviceName;

  const DeviceInfo({
    required this.deviceId,
    required this.fingerprint,
    required this.platform,
    required this.osVersion,
    required this.appVersion,
    this.buildNumber,
    this.model,
    this.brand,
    this.deviceName,
  });

  factory DeviceInfo.fromJson(Map<String, dynamic> json) =>
      _$DeviceInfoFromJson(json);

  Map<String, dynamic> toJson() => _$DeviceInfoToJson(this);

  @override
  List<Object?> get props => [
        deviceId,
        fingerprint,
        platform,
        osVersion,
        appVersion,
        buildNumber,
        model,
        brand,
        deviceName,
      ];
}


