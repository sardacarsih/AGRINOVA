// GENERATED CODE - DO NOT MODIFY BY HAND

// ignore_for_file: unused_element

part of 'jwt_models.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

JWTLoginRequest _$JWTLoginRequestFromJson(Map<String, dynamic> json) =>
    JWTLoginRequest(
      username: json['username'] as String,
      password: json['password'] as String,
      deviceId: json['deviceId'] as String,
      deviceFingerprint: json['deviceFingerprint'] as String,
      fingerprint: json['fingerprint'] as String?,
      platform: json['platform'] as String?,
      biometricHash: json['biometricHash'] as String?,
      rememberDevice: json['rememberDevice'] as bool?,
    );

Map<String, dynamic> _$JWTLoginRequestToJson(JWTLoginRequest instance) =>
    <String, dynamic>{
      'username': instance.username,
      'password': instance.password,
      'deviceId': instance.deviceId,
      'deviceFingerprint': instance.deviceFingerprint,
      'fingerprint': instance.fingerprint,
      'platform': instance.platform,
      'biometricHash': instance.biometricHash,
      'rememberDevice': instance.rememberDevice,
    };

AssignmentScope _$AssignmentScopeFromJson(Map<String, dynamic> json) =>
    AssignmentScope(
      companies: (json['companies'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          const [],
      estates: (json['estates'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          const [],
      divisions: (json['divisions'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          const [],
    );

Map<String, dynamic> _$AssignmentScopeToJson(AssignmentScope instance) =>
    <String, dynamic>{
      'companies': instance.companies,
      'estates': instance.estates,
      'divisions': instance.divisions,
    };

RoleInfo _$RoleInfoFromJson(Map<String, dynamic> json) => RoleInfo(
      label: json['label'] as String,
      description: json['description'] as String,
      permissionSource: json['permissionSource'] as String,
    );

Map<String, dynamic> _$RoleInfoToJson(RoleInfo instance) => <String, dynamic>{
      'label': instance.label,
      'description': instance.description,
      'permissionSource': instance.permissionSource,
    };

User _$UserFromJson(Map<String, dynamic> json) => User(
      id: json['id'] as String,
      username: json['username'] as String,
      email: json['email'] as String,
      role: json['role'] as String,
      fullName: json['fullName'] as String,
      isActive: json['isActive'] as bool? ?? true,
      mustChangePassword: json['mustChangePassword'] as bool? ?? false,
      companyId: json['companyId'] as String?,
      companyName: json['companyName'] as String?,
      managerId: json['managerId'] as String?,
      managerName: json['managerName'] as String?,
      avatar: json['avatar'] as String?,
      estate: json['estate'] as String?,
      division: json['division'] as String?,
      permissions: (json['permissions'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          const [],
      availableActions: (json['availableActions'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          const [],
      companyAccess: (json['companyAccess'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          const [],
      assignedEstates: (json['assignedEstates'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          const [],
      assignedDivisions: (json['assignedDivisions'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          const [],
      assignedCompanies: (json['assignedCompanies'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          const [],
      assignmentScope: json['assignmentScope'] == null
          ? null
          : AssignmentScope.fromJson(
              json['assignmentScope'] as Map<String, dynamic>),
      roleInfo: json['roleInfo'] == null
          ? null
          : RoleInfo.fromJson(json['roleInfo'] as Map<String, dynamic>),
    );

Map<String, dynamic> _$UserToJson(User instance) => <String, dynamic>{
      'id': instance.id,
      'username': instance.username,
      'email': instance.email,
      'role': instance.role,
      'fullName': instance.fullName,
      'isActive': instance.isActive,
      'mustChangePassword': instance.mustChangePassword,
      'companyId': instance.companyId,
      'companyName': instance.companyName,
      'managerId': instance.managerId,
      'managerName': instance.managerName,
      'avatar': instance.avatar,
      'estate': instance.estate,
      'division': instance.division,
      'permissions': instance.permissions,
      'availableActions': instance.availableActions,
      'companyAccess': instance.companyAccess,
      'assignedEstates': instance.assignedEstates,
      'assignedDivisions': instance.assignedDivisions,
      'assignedCompanies': instance.assignedCompanies,
      'assignmentScope': instance.assignmentScope,
      'roleInfo': instance.roleInfo,
    };

Session _$SessionFromJson(Map<String, dynamic> json) => Session(
      sessionId: json['sessionId'] as String,
      deviceId: json['deviceId'] as String,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );

Map<String, dynamic> _$SessionToJson(Session instance) => <String, dynamic>{
      'sessionId': instance.sessionId,
      'deviceId': instance.deviceId,
      'createdAt': instance.createdAt.toIso8601String(),
    };

AuthCompany _$AuthCompanyFromJson(Map<String, dynamic> json) => AuthCompany(
      id: json['id'] as String,
      name: json['name'] as String,
      kodePabrik: json['kodePabrik'] as String?,
      alamat: json['alamat'] as String?,
      latitude: (json['latitude'] as num?)?.toDouble(),
      longitude: (json['longitude'] as num?)?.toDouble(),
      contactPerson: json['contactPerson'] as String?,
      telepon: json['telepon'] as String?,
      email: json['email'] as String?,
      status: json['status'] as String?,
      tanggalBerdiri: json['tanggalBerdiri'] as String?,
      luasLahan: (json['luasLahan'] as num?)?.toDouble(),
      jumlahBlok: (json['jumlahBlok'] as num?)?.toInt(),
      varietasUtama: json['varietasUtama'] as String?,
      kapasitasPabrik: (json['kapasitasPabrik'] as num?)?.toDouble(),
      createdAt: json['createdAt'] as String?,
      updatedAt: json['updatedAt'] as String?,
    );

Map<String, dynamic> _$AuthCompanyToJson(AuthCompany instance) =>
    <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'kodePabrik': instance.kodePabrik,
      'alamat': instance.alamat,
      'latitude': instance.latitude,
      'longitude': instance.longitude,
      'contactPerson': instance.contactPerson,
      'telepon': instance.telepon,
      'email': instance.email,
      'status': instance.status,
      'tanggalBerdiri': instance.tanggalBerdiri,
      'luasLahan': instance.luasLahan,
      'jumlahBlok': instance.jumlahBlok,
      'varietasUtama': instance.varietasUtama,
      'kapasitasPabrik': instance.kapasitasPabrik,
      'createdAt': instance.createdAt,
      'updatedAt': instance.updatedAt,
    };

AuthEstate _$AuthEstateFromJson(Map<String, dynamic> json) => AuthEstate(
      id: json['id'] as String,
      name: json['name'] as String,
      kode: json['kode'] as String?,
      companyId: json['companyId'] as String?,
      areaManager: json['areaManager'] as String?,
      manager: json['manager'] as String?,
      alamat: json['alamat'] as String?,
      latitude: (json['latitude'] as num?)?.toDouble(),
      longitude: (json['longitude'] as num?)?.toDouble(),
      luasTotal: (json['luasTotal'] as num?)?.toDouble(),
      luasPlantingArea: (json['luasPlantingArea'] as num?)?.toDouble(),
      jumlahBlok: (json['jumlahBlok'] as num?)?.toInt(),
      varietasUtama: json['varietasUtama'] as String?,
      tahunTanam: json['tahunTanam'] as String?,
      statusOperasional: json['statusOperasional'] as String?,
      createdAt: json['createdAt'] as String?,
      updatedAt: json['updatedAt'] as String?,
    );

Map<String, dynamic> _$AuthEstateToJson(AuthEstate instance) =>
    <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'kode': instance.kode,
      'companyId': instance.companyId,
      'areaManager': instance.areaManager,
      'manager': instance.manager,
      'alamat': instance.alamat,
      'latitude': instance.latitude,
      'longitude': instance.longitude,
      'luasTotal': instance.luasTotal,
      'luasPlantingArea': instance.luasPlantingArea,
      'jumlahBlok': instance.jumlahBlok,
      'varietasUtama': instance.varietasUtama,
      'tahunTanam': instance.tahunTanam,
      'statusOperasional': instance.statusOperasional,
      'createdAt': instance.createdAt,
      'updatedAt': instance.updatedAt,
    };

AuthDivision _$AuthDivisionFromJson(Map<String, dynamic> json) => AuthDivision(
      id: json['id'] as String,
      name: json['name'] as String,
      kode: json['kode'] as String?,
      estateId: json['estateId'] as String?,
      asisten: json['asisten'] as String?,
      mandor: json['mandor'] as String?,
      luasDivisi: (json['luasDivisi'] as num?)?.toDouble(),
      jumlahBlok: (json['jumlahBlok'] as num?)?.toInt(),
      varietasDominan: json['varietasDominan'] as String?,
      umurTanamanRataRata: (json['umurTanamanRataRata'] as num?)?.toInt(),
      targetProduksi: (json['targetProduksi'] as num?)?.toDouble(),
      statusOperasional: json['statusOperasional'] as String?,
      createdAt: json['createdAt'] as String?,
      updatedAt: json['updatedAt'] as String?,
    );

Map<String, dynamic> _$AuthDivisionToJson(AuthDivision instance) =>
    <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'kode': instance.kode,
      'estateId': instance.estateId,
      'asisten': instance.asisten,
      'mandor': instance.mandor,
      'luasDivisi': instance.luasDivisi,
      'jumlahBlok': instance.jumlahBlok,
      'varietasDominan': instance.varietasDominan,
      'umurTanamanRataRata': instance.umurTanamanRataRata,
      'targetProduksi': instance.targetProduksi,
      'statusOperasional': instance.statusOperasional,
      'createdAt': instance.createdAt,
      'updatedAt': instance.updatedAt,
    };

UserAssignments _$UserAssignmentsFromJson(Map<String, dynamic> json) =>
    UserAssignments(
      companies: (json['companies'] as List<dynamic>?)
              ?.map((e) => AuthCompany.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      estates: (json['estates'] as List<dynamic>?)
              ?.map((e) => AuthEstate.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      divisions: (json['divisions'] as List<dynamic>?)
              ?.map((e) => AuthDivision.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
    );

Map<String, dynamic> _$UserAssignmentsToJson(UserAssignments instance) =>
    <String, dynamic>{
      'companies': instance.companies,
      'estates': instance.estates,
      'divisions': instance.divisions,
    };

AuthUser _$AuthUserFromJson(Map<String, dynamic> json) => AuthUser(
      id: json['id'] as String,
      username: json['username'] as String,
      name: json['name'] as String?,
      email: json['email'] as String?,
      role: json['role'] as String,
      companyId: json['companyId'] as String?,
      companyName: json['companyName'] as String?,
      managerId: json['managerId'] as String?,
      managerName: json['managerName'] as String?,
      permissions: (json['permissions'] as List<dynamic>?)
          ?.map((e) => e as String)
          .toList(),
      profile: json['profile'] as Map<String, dynamic>?,
      createdAt: json['createdAt'] as String?,
      updatedAt: json['updatedAt'] as String?,
    );

Map<String, dynamic> _$AuthUserToJson(AuthUser instance) => <String, dynamic>{
      'id': instance.id,
      'username': instance.username,
      'name': instance.name,
      'email': instance.email,
      'role': instance.role,
      'companyId': instance.companyId,
      'companyName': instance.companyName,
      'managerId': instance.managerId,
      'managerName': instance.managerName,
      'permissions': instance.permissions,
      'profile': instance.profile,
      'createdAt': instance.createdAt,
      'updatedAt': instance.updatedAt,
    };

AuthPayload _$AuthPayloadFromJson(Map<String, dynamic> json) => AuthPayload(
      accessToken: json['accessToken'] as String,
      refreshToken: json['refreshToken'] as String,
      offlineToken: json['offlineToken'] as String?,
      tokenType: json['tokenType'] as String,
      expiresIn: (json['expiresIn'] as num).toInt(),
      expiresAt: json['expiresAt'] as String,
      refreshExpiresAt: json['refreshExpiresAt'] as String?,
      offlineExpiresAt: json['offlineExpiresAt'] as String?,
      user: AuthUser.fromJson(json['user'] as Map<String, dynamic>),
      assignments: json['assignments'] == null
          ? null
          : UserAssignments.fromJson(
              json['assignments'] as Map<String, dynamic>),
    );

Map<String, dynamic> _$AuthPayloadToJson(AuthPayload instance) =>
    <String, dynamic>{
      'accessToken': instance.accessToken,
      'refreshToken': instance.refreshToken,
      'offlineToken': instance.offlineToken,
      'tokenType': instance.tokenType,
      'expiresIn': instance.expiresIn,
      'expiresAt': instance.expiresAt,
      'refreshExpiresAt': instance.refreshExpiresAt,
      'offlineExpiresAt': instance.offlineExpiresAt,
      'user': instance.user,
      'assignments': instance.assignments,
    };

WebLoginPayload _$WebLoginPayloadFromJson(Map<String, dynamic> json) =>
    WebLoginPayload(
      success: json['success'] as bool,
      message: json['message'] as String,
      sessionId: json['sessionId'] as String?,
      user: json['user'] == null
          ? null
          : AuthUser.fromJson(json['user'] as Map<String, dynamic>),
      assignments: json['assignments'] == null
          ? null
          : UserAssignments.fromJson(
              json['assignments'] as Map<String, dynamic>),
    );

Map<String, dynamic> _$WebLoginPayloadToJson(WebLoginPayload instance) =>
    <String, dynamic>{
      'success': instance.success,
      'message': instance.message,
      'sessionId': instance.sessionId,
      'user': instance.user,
      'assignments': instance.assignments,
    };

JWTLoginResponse _$JWTLoginResponseFromJson(Map<String, dynamic> json) =>
    JWTLoginResponse(
      accessToken: json['accessToken'] as String,
      refreshToken: json['refreshToken'] as String,
      offlineToken: json['offlineToken'] as String?,
      deviceBinding: json['deviceBinding'] as String?,
      tokenType: json['tokenType'] as String,
      expiresIn: (json['expiresIn'] as num).toInt(),
      expiresAt: DateTime.parse(json['expiresAt'] as String),
      offlineExpiresAt: json['offlineExpiresAt'] == null
          ? null
          : DateTime.parse(json['offlineExpiresAt'] as String),
      user: User.fromJson(json['user'] as Map<String, dynamic>),
      session: json['session'] == null
          ? null
          : Session.fromJson(json['session'] as Map<String, dynamic>),
      deviceTrusted: json['deviceTrusted'] as bool,
      isFirstLogin: json['isFirstLogin'] as bool?,
    );

Map<String, dynamic> _$JWTLoginResponseToJson(JWTLoginResponse instance) =>
    <String, dynamic>{
      'accessToken': instance.accessToken,
      'refreshToken': instance.refreshToken,
      'offlineToken': instance.offlineToken,
      'deviceBinding': instance.deviceBinding,
      'tokenType': instance.tokenType,
      'expiresIn': instance.expiresIn,
      'expiresAt': instance.expiresAt.toIso8601String(),
      'offlineExpiresAt': instance.offlineExpiresAt?.toIso8601String(),
      'user': instance.user,
      'session': instance.session,
      'deviceTrusted': instance.deviceTrusted,
      'isFirstLogin': instance.isFirstLogin,
    };

JWTRefreshRequest _$JWTRefreshRequestFromJson(Map<String, dynamic> json) =>
    JWTRefreshRequest(
      refreshToken: json['refreshToken'] as String,
      deviceId: json['deviceId'] as String?,
      fingerprint: json['fingerprint'] as String?,
    );

Map<String, dynamic> _$JWTRefreshRequestToJson(JWTRefreshRequest instance) =>
    <String, dynamic>{
      'refreshToken': instance.refreshToken,
      'deviceId': instance.deviceId,
      'fingerprint': instance.fingerprint,
    };

JWTRefreshResponse _$JWTRefreshResponseFromJson(Map<String, dynamic> json) =>
    JWTRefreshResponse(
      accessToken: json['accessToken'] as String,
      refreshToken: json['refreshToken'] as String,
      offlineToken: json['offlineToken'] as String?,
      deviceBinding: json['deviceBinding'] as String?,
      tokenType: json['tokenType'] as String,
      expiresIn: (json['expiresIn'] as num).toInt(),
      expiresAt: json['expiresAt'] == null
          ? null
          : DateTime.parse(json['expiresAt'] as String),
      offlineExpiresAt: json['offlineExpiresAt'] == null
          ? null
          : DateTime.parse(json['offlineExpiresAt'] as String),
      session: json['session'] == null
          ? null
          : Session.fromJson(json['session'] as Map<String, dynamic>),
      deviceTrusted: json['deviceTrusted'] as bool?,
    );

Map<String, dynamic> _$JWTRefreshResponseToJson(JWTRefreshResponse instance) =>
    <String, dynamic>{
      'accessToken': instance.accessToken,
      'refreshToken': instance.refreshToken,
      'offlineToken': instance.offlineToken,
      'deviceBinding': instance.deviceBinding,
      'tokenType': instance.tokenType,
      'expiresIn': instance.expiresIn,
      'expiresAt': instance.expiresAt?.toIso8601String(),
      'offlineExpiresAt': instance.offlineExpiresAt?.toIso8601String(),
      'session': instance.session,
      'deviceTrusted': instance.deviceTrusted,
    };

JWTPayload _$JWTPayloadFromJson(Map<String, dynamic> json) => JWTPayload(
      sub: json['sub'] as String,
      username: json['username'] as String?,
      role: json['role'] as String,
      companyId: json['companyId'] as String?,
      deviceId: json['deviceId'] as String?,
      deviceFingerprint: json['deviceFingerprint'] as String?,
      sessionId: json['sessionId'] as String?,
      permissions: (json['permissions'] as List<dynamic>)
          .map((e) => e as String)
          .toList(),
      iat: (json['iat'] as num).toInt(),
      exp: (json['exp'] as num).toInt(),
      jti: json['jti'] as String,
    );

Map<String, dynamic> _$JWTPayloadToJson(JWTPayload instance) =>
    <String, dynamic>{
      'sub': instance.sub,
      'username': instance.username,
      'role': instance.role,
      'companyId': instance.companyId,
      'deviceId': instance.deviceId,
      'deviceFingerprint': instance.deviceFingerprint,
      'sessionId': instance.sessionId,
      'permissions': instance.permissions,
      'iat': instance.iat,
      'exp': instance.exp,
      'jti': instance.jti,
    };

DeviceRegistrationRequest _$DeviceRegistrationRequestFromJson(
        Map<String, dynamic> json) =>
    DeviceRegistrationRequest(
      deviceId: json['deviceId'] as String,
      fingerprint: json['fingerprint'] as String,
      platform: json['platform'] as String,
      osVersion: json['osVersion'] as String,
      appVersion: json['appVersion'] as String,
      buildNumber: json['buildNumber'] as String?,
      model: json['model'] as String?,
      brand: json['brand'] as String?,
      deviceName: json['deviceName'] as String?,
    );

Map<String, dynamic> _$DeviceRegistrationRequestToJson(
        DeviceRegistrationRequest instance) =>
    <String, dynamic>{
      'deviceId': instance.deviceId,
      'fingerprint': instance.fingerprint,
      'platform': instance.platform,
      'osVersion': instance.osVersion,
      'appVersion': instance.appVersion,
      'buildNumber': instance.buildNumber,
      'model': instance.model,
      'brand': instance.brand,
      'deviceName': instance.deviceName,
    };

JWTOfflineValidationRequest _$JWTOfflineValidationRequestFromJson(
        Map<String, dynamic> json) =>
    JWTOfflineValidationRequest(
      offlineToken: json['offlineToken'] as String,
      deviceId: json['deviceId'] as String,
      fingerprint: json['fingerprint'] as String,
    );

Map<String, dynamic> _$JWTOfflineValidationRequestToJson(
        JWTOfflineValidationRequest instance) =>
    <String, dynamic>{
      'offlineToken': instance.offlineToken,
      'deviceId': instance.deviceId,
      'fingerprint': instance.fingerprint,
    };

JWTOfflineValidationResponse _$JWTOfflineValidationResponseFromJson(
        Map<String, dynamic> json) =>
    JWTOfflineValidationResponse(
      valid: json['valid'] as bool,
      payload: json['payload'] == null
          ? null
          : JWTPayload.fromJson(json['payload'] as Map<String, dynamic>),
      reason: json['reason'] as String?,
    );

Map<String, dynamic> _$JWTOfflineValidationResponseToJson(
        JWTOfflineValidationResponse instance) =>
    <String, dynamic>{
      'valid': instance.valid,
      'payload': instance.payload,
      'reason': instance.reason,
    };

DeviceInfo _$DeviceInfoFromJson(Map<String, dynamic> json) => DeviceInfo(
      deviceId: json['deviceId'] as String,
      fingerprint: json['fingerprint'] as String,
      platform: json['platform'] as String,
      osVersion: json['osVersion'] as String,
      appVersion: json['appVersion'] as String,
      buildNumber: json['buildNumber'] as String?,
      model: json['model'] as String?,
      brand: json['brand'] as String?,
      deviceName: json['deviceName'] as String?,
    );

Map<String, dynamic> _$DeviceInfoToJson(DeviceInfo instance) =>
    <String, dynamic>{
      'deviceId': instance.deviceId,
      'fingerprint': instance.fingerprint,
      'platform': instance.platform,
      'osVersion': instance.osVersion,
      'appVersion': instance.appVersion,
      'buildNumber': instance.buildNumber,
      'model': instance.model,
      'brand': instance.brand,
      'deviceName': instance.deviceName,
    };
