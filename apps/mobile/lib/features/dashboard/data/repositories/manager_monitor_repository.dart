import 'package:agrinova_mobile/core/network/graphql_client_service.dart';
import 'package:graphql_flutter/graphql_flutter.dart';
import 'package:logger/logger.dart';

class ManagerMonitorSnapshot {
  final int totalTeam;
  final int totalMandor;
  final int totalAsisten;
  final int totalPemanen;
  final double efficiency;
  final List<ManagerMonitorMember> members;
  final String? warningMessage;

  const ManagerMonitorSnapshot({
    required this.totalTeam,
    required this.totalMandor,
    required this.totalAsisten,
    required this.totalPemanen,
    required this.efficiency,
    required this.members,
    this.warningMessage,
  });

  factory ManagerMonitorSnapshot.empty() {
    return const ManagerMonitorSnapshot(
      totalTeam: 0,
      totalMandor: 0,
      totalAsisten: 0,
      totalPemanen: 0,
      efficiency: 0,
      members: [],
    );
  }
}

class ManagerMonitorMember {
  final String id;
  final String name;
  final String role;
  final String division;
  final double performance;
  final double productionTon;
  final bool isActive;
  final int totalRecords;
  final int approvedRecords;

  const ManagerMonitorMember({
    required this.id,
    required this.name,
    required this.role,
    required this.division,
    required this.performance,
    required this.productionTon,
    required this.isActive,
    this.totalRecords = 0,
    this.approvedRecords = 0,
  });
}

class ManagerMonitorRepository {
  final GraphQLClientService _graphqlClient;
  final Logger _logger;

  ManagerMonitorRepository({
    required GraphQLClientService graphqlClient,
    Logger? logger,
  })  : _graphqlClient = graphqlClient,
        _logger = logger ?? Logger();

  static const String _managerBootstrapQuery = r'''
    query ManagerMonitorBootstrap {
      me {
        id
        role
        companyId
        companies {
          id
        }
      }
    }
  ''';

  static const String _usersByRoleQuery = r'''
    query ManagerUsersByRole(
      $companyId: String,
      $role: UserRole,
      $limit: Int,
      $offset: Int
    ) {
      users(
        companyId: $companyId,
        role: $role,
        isActive: true,
        limit: $limit,
        offset: $offset
      ) {
        users {
          id
          name
          role
          managerId
          divisions {
            id
            name
          }
        }
        totalCount
        hasNextPage
      }
    }
  ''';

  static const String _harvestRecordsQuery = r'''
    query ManagerHarvestRecords {
      harvestRecords {
        id
        tanggal
        status
        beratTbs
        jumlahJanjang
        karyawan
        createdAt
        updatedAt
        mandor {
          id
          name
          managerId
          role
        }
        block {
          id
          name
          division {
            id
            name
          }
        }
      }
    }
  ''';

  static const String _harvestRecordsByPeriodQuery = r'''
    query ManagerHarvestRecordsByPeriod($dateFrom: Time, $dateTo: Time) {
      harvestRecords(dateFrom: $dateFrom, dateTo: $dateTo) {
        id
        tanggal
        status
        beratTbs
        jumlahJanjang
        karyawan
        createdAt
        updatedAt
        mandor {
          id
          name
          managerId
          role
        }
        block {
          id
          name
          division {
            id
            name
          }
        }
      }
    }
  ''';

  Future<ManagerMonitorSnapshot> fetchSnapshot({
    DateTime? dateFrom,
    DateTime? dateTo,
  }) async {
    final normalizedDateFrom =
        dateFrom == null ? null : _startOfDay(dateFrom.toLocal());
    final normalizedDateTo =
        dateTo == null ? null : _endOfDay(dateTo.toLocal());

    final bootstrap = await _graphqlClient.query(
      QueryOptions(
        document: gql(_managerBootstrapQuery),
        fetchPolicy: FetchPolicy.networkOnly,
      ),
    );

    if (bootstrap.hasException) {
      throw Exception(
        'Gagal mengambil profil manager: ${bootstrap.exception.toString()}',
      );
    }

    final me = bootstrap.data?['me'] as Map<String, dynamic>?;
    if (me == null) {
      throw Exception('Profil pengguna tidak ditemukan di server.');
    }

    final managerId = _toString(me['id']);
    final managerRole = _toString(me['role']).toUpperCase();
    if (managerId.isEmpty || managerRole != 'MANAGER') {
      throw Exception(
        'Akses monitor hanya untuk role manager. Role saat ini: $managerRole',
      );
    }

    final companyId = _resolveCompanyId(me);
    if (companyId.isEmpty) {
      throw Exception('Manager belum memiliki assignment company di server.');
    }

    final asistenUsers = await _fetchUsersByRole(
      companyId: companyId,
      role: 'ASISTEN',
    );
    final mandorUsers = await _fetchUsersByRole(
      companyId: companyId,
      role: 'MANDOR',
    );

    final asistenDirect = asistenUsers
        .where((user) => user.managerId == managerId)
        .toList(growable: false);
    final asistenIds = asistenDirect.map((user) => user.id).toSet();

    final mandorSubordinates = mandorUsers
        .where(
          (user) =>
              user.managerId == managerId ||
              asistenIds.contains(user.managerId),
        )
        .toList(growable: false);
    final mandorIds = mandorSubordinates.map((user) => user.id).toSet();

    final harvestRecords = await _fetchHarvestRecords(
      dateFrom: normalizedDateFrom,
      dateTo: normalizedDateTo,
    );
    final scopedRecords = harvestRecords
        .where(
          (record) =>
              mandorIds.contains(record.mandorId) &&
              _isWithinDateRange(
                record.lastActivityAt,
                dateFrom: normalizedDateFrom,
                dateTo: normalizedDateTo,
              ),
        )
        .toList(growable: false);

    final asistenMembers = _buildAsistenMembers(asistenDirect, scopedRecords);
    final mandorMembers =
        _buildMandorMembers(mandorSubordinates, scopedRecords);

    final members = <ManagerMonitorMember>[
      ...mandorMembers,
      ...asistenMembers,
    ]..sort((a, b) {
        final byPerformance = b.performance.compareTo(a.performance);
        if (byPerformance != 0) {
          return byPerformance;
        }

        final byProduction = b.productionTon.compareTo(a.productionTon);
        if (byProduction != 0) {
          return byProduction;
        }

        return a.name.toLowerCase().compareTo(b.name.toLowerCase());
      });

    final approvedCount =
        scopedRecords.where((record) => record.status == 'APPROVED').length;
    final efficiency = scopedRecords.isNotEmpty
        ? (approvedCount / scopedRecords.length) * 100
        : 0.0;

    String? warningMessage;
    if (mandorIds.isEmpty && asistenIds.isEmpty) {
      warningMessage =
          'Belum ada bawahan dengan relasi manager_id ke akun manager ini.';
    } else if (scopedRecords.isEmpty) {
      warningMessage =
          'Belum ada data panen dari bawahan manager untuk periode ini.';
    }

    final totalMandor = mandorSubordinates.length;
    final totalAsisten = asistenDirect.length;
    final totalPemanen = _countUniquePemanen(scopedRecords);
    final totalTeam = totalMandor + totalAsisten + totalPemanen;

    return ManagerMonitorSnapshot(
      totalTeam: totalTeam,
      totalMandor: totalMandor,
      totalAsisten: totalAsisten,
      totalPemanen: totalPemanen,
      efficiency: efficiency.clamp(0, 100).toDouble(),
      members: members,
      warningMessage: warningMessage,
    );
  }

  Future<List<_UserNode>> _fetchUsersByRole({
    required String companyId,
    required String role,
  }) async {
    const pageSize = 200;
    var offset = 0;
    final users = <_UserNode>[];

    while (true) {
      final result = await _graphqlClient.query(
        QueryOptions(
          document: gql(_usersByRoleQuery),
          variables: {
            'companyId': companyId,
            'role': role,
            'limit': pageSize,
            'offset': offset,
          },
          fetchPolicy: FetchPolicy.networkOnly,
        ),
      );

      if (result.hasException) {
        throw Exception(
          'Gagal mengambil user role $role dari server: ${result.exception.toString()}',
        );
      }

      final response = result.data?['users'] as Map<String, dynamic>?;
      if (response == null) {
        break;
      }

      final items = response['users'] as List<dynamic>? ?? const [];
      for (final item in items) {
        if (item is! Map<String, dynamic>) {
          continue;
        }
        final parsed = _parseUserNode(item);
        if (parsed.id.isNotEmpty) {
          users.add(parsed);
        }
      }

      final hasNextPage = _toBool(response['hasNextPage']);
      if (!hasNextPage || items.isEmpty) {
        break;
      }

      offset += pageSize;
      if (offset > 2000) {
        _logger.w('Stopped users pagination early to avoid unbounded request.');
        break;
      }
    }

    return users;
  }

  Future<List<_HarvestRecordNode>> _fetchHarvestRecords({
    DateTime? dateFrom,
    DateTime? dateTo,
  }) async {
    QueryResult result;
    final hasDateFilter = dateFrom != null || dateTo != null;

    if (hasDateFilter) {
      result = await _graphqlClient.query(
        QueryOptions(
          document: gql(_harvestRecordsByPeriodQuery),
          variables: {
            if (dateFrom != null)
              'dateFrom': dateFrom.toUtc().toIso8601String(),
            if (dateTo != null) 'dateTo': dateTo.toUtc().toIso8601String(),
          },
          fetchPolicy: FetchPolicy.networkOnly,
        ),
      );

      if (result.hasException &&
          _isUnsupportedHarvestDateFilter(result.exception)) {
        _logger.w(
          'Query harvestRecords belum support dateFrom/dateTo, fallback ke query standar lalu filter di client.',
        );
        result = await _graphqlClient.query(
          QueryOptions(
            document: gql(_harvestRecordsQuery),
            fetchPolicy: FetchPolicy.networkOnly,
          ),
        );
      }
    } else {
      result = await _graphqlClient.query(
        QueryOptions(
          document: gql(_harvestRecordsQuery),
          fetchPolicy: FetchPolicy.networkOnly,
        ),
      );
    }

    if (result.hasException) {
      throw Exception(
        'Gagal mengambil data panen dari server: ${result.exception.toString()}',
      );
    }

    final rows = result.data?['harvestRecords'] as List<dynamic>? ?? const [];
    final records = <_HarvestRecordNode>[];
    for (final row in rows) {
      if (row is! Map<String, dynamic>) {
        continue;
      }
      records.add(_parseHarvestRecord(row));
    }

    return records
        .where(
          (record) => _isWithinDateRange(
            record.lastActivityAt,
            dateFrom: dateFrom,
            dateTo: dateTo,
          ),
        )
        .toList(growable: false);
  }

  List<ManagerMonitorMember> _buildAsistenMembers(
    List<_UserNode> asistens,
    List<_HarvestRecordNode> records,
  ) {
    return asistens.map((asisten) {
      final asistenRecords = records
          .where((record) => record.mandorManagerId == asisten.id)
          .toList(growable: false);

      final total = asistenRecords.length;
      final approved =
          asistenRecords.where((record) => record.status == 'APPROVED').length;
      final productionTon =
          asistenRecords.fold<double>(0, (sum, row) => sum + row.weightKg) /
              1000;

      final performance = total > 0 ? (approved / total) * 100 : 0.0;
      final dominantDivision = _dominantDivision(
        asistenRecords.map((record) => record.divisionName),
      );

      return ManagerMonitorMember(
        id: asisten.id,
        name: asisten.name,
        role: 'Asisten',
        division: dominantDivision ?? asisten.primaryDivision ?? '-',
        performance: performance.clamp(0, 100).toDouble(),
        productionTon: productionTon < 0 ? 0 : productionTon,
        isActive: _isActive(asistenRecords),
        totalRecords: total,
        approvedRecords: approved,
      );
    }).toList(growable: false);
  }

  List<ManagerMonitorMember> _buildMandorMembers(
    List<_UserNode> mandors,
    List<_HarvestRecordNode> records,
  ) {
    return mandors.map((mandor) {
      final mandorRecords = records
          .where((record) => record.mandorId == mandor.id)
          .toList(growable: false);

      final total = mandorRecords.length;
      final approved =
          mandorRecords.where((record) => record.status == 'APPROVED').length;
      final productionTon =
          mandorRecords.fold<double>(0, (sum, row) => sum + row.weightKg) /
              1000;
      final performance = total > 0 ? (approved / total) * 100 : 0.0;
      final dominantDivision = _dominantDivision(
        mandorRecords.map((record) => record.divisionName),
      );

      return ManagerMonitorMember(
        id: mandor.id,
        name: mandor.name,
        role: 'Mandor',
        division: dominantDivision ?? mandor.primaryDivision ?? '-',
        performance: performance.clamp(0, 100).toDouble(),
        productionTon: productionTon < 0 ? 0 : productionTon,
        isActive: _isActive(mandorRecords),
        totalRecords: total,
        approvedRecords: approved,
      );
    }).toList(growable: false);
  }

  String _resolveCompanyId(Map<String, dynamic> me) {
    final direct = _toString(me['companyId']).trim();
    if (direct.isNotEmpty) {
      return direct;
    }

    final companies = me['companies'] as List<dynamic>? ?? const [];
    for (final company in companies) {
      if (company is! Map<String, dynamic>) {
        continue;
      }
      final id = _toString(company['id']).trim();
      if (id.isNotEmpty) {
        return id;
      }
    }
    return '';
  }

  _UserNode _parseUserNode(Map<String, dynamic> map) {
    final divisionsRaw = map['divisions'] as List<dynamic>? ?? const [];
    final divisionNames = <String>[];
    for (final division in divisionsRaw) {
      if (division is! Map<String, dynamic>) {
        continue;
      }
      final name = _toString(division['name']).trim();
      if (name.isNotEmpty) {
        divisionNames.add(name);
      }
    }

    return _UserNode(
      id: _toString(map['id']).trim(),
      name: _toString(map['name']).trim().isEmpty
          ? 'Tanpa Nama'
          : _toString(map['name']).trim(),
      role: _toString(map['role']).toUpperCase(),
      managerId: _toString(map['managerId']).trim(),
      primaryDivision: divisionNames.isNotEmpty ? divisionNames.first : null,
    );
  }

  _HarvestRecordNode _parseHarvestRecord(Map<String, dynamic> map) {
    final mandor = map['mandor'] as Map<String, dynamic>? ?? const {};
    final block = map['block'] as Map<String, dynamic>? ?? const {};
    final division = block['division'] as Map<String, dynamic>? ?? const {};

    final date = _parseDateTime(map['tanggal']) ??
        _parseDateTime(map['updatedAt']) ??
        _parseDateTime(map['createdAt']) ??
        DateTime.fromMillisecondsSinceEpoch(0);

    return _HarvestRecordNode(
      id: _toString(map['id']),
      mandorId: _toString(mandor['id']).trim(),
      mandorManagerId: _toString(mandor['managerId']).trim(),
      workerName: _toString(map['karyawan']).trim(),
      divisionName: _toString(division['name']).trim().isEmpty
          ? '-'
          : _toString(division['name']).trim(),
      status: _toString(map['status']).toUpperCase(),
      weightKg: _toDouble(map['beratTbs']),
      lastActivityAt: date,
    );
  }

  String? _dominantDivision(Iterable<String?> names) {
    final counter = <String, int>{};
    for (final raw in names) {
      final name = (raw ?? '').trim();
      if (name.isEmpty || name == '-') {
        continue;
      }
      counter[name] = (counter[name] ?? 0) + 1;
    }
    if (counter.isEmpty) {
      return null;
    }

    String? selected;
    var selectedCount = -1;
    for (final entry in counter.entries) {
      if (entry.value > selectedCount) {
        selected = entry.key;
        selectedCount = entry.value;
      }
    }
    return selected;
  }

  int _countUniquePemanen(List<_HarvestRecordNode> records) {
    final names = <String>{};
    for (final record in records) {
      final worker = record.workerName.trim();
      if (worker.isEmpty) {
        continue;
      }
      names.add(worker.toLowerCase());
    }
    return names.length;
  }

  bool _isActive(List<_HarvestRecordNode> records) {
    if (records.isEmpty) return false;
    var latest = DateTime.fromMillisecondsSinceEpoch(0);
    for (final record in records) {
      if (record.lastActivityAt.isAfter(latest)) {
        latest = record.lastActivityAt;
      }
    }
    return _isActiveByTime(latest);
  }

  bool _isActiveByTime(DateTime activityTime) {
    return activityTime.isAfter(
      DateTime.now().subtract(const Duration(hours: 24)),
    );
  }

  DateTime? _parseDateTime(dynamic raw) {
    if (raw == null) return null;
    if (raw is DateTime) return raw;
    if (raw is String) {
      return DateTime.tryParse(raw)?.toLocal();
    }
    return null;
  }

  DateTime _startOfDay(DateTime value) {
    return DateTime(value.year, value.month, value.day);
  }

  DateTime _endOfDay(DateTime value) {
    return DateTime(value.year, value.month, value.day, 23, 59, 59, 999);
  }

  bool _isWithinDateRange(
    DateTime value, {
    DateTime? dateFrom,
    DateTime? dateTo,
  }) {
    if (dateFrom != null && value.isBefore(dateFrom)) {
      return false;
    }
    if (dateTo != null && value.isAfter(dateTo)) {
      return false;
    }
    return true;
  }

  bool _isUnsupportedHarvestDateFilter(OperationException? exception) {
    if (exception == null) {
      return false;
    }

    final messages = <String>[
      ...exception.graphqlErrors.map((error) => error.message),
      exception.linkException?.toString() ?? '',
    ].join(' ');

    final lowerMessage = messages.toLowerCase();
    final hasUnknownArgument = lowerMessage.contains('unknown argument') ||
        lowerMessage.contains('cannot query field') ||
        lowerMessage.contains('validation');
    final hasDateArgument =
        lowerMessage.contains('datefrom') || lowerMessage.contains('dateto');

    return hasUnknownArgument && hasDateArgument;
  }

  bool _toBool(dynamic value) {
    if (value is bool) return value;
    if (value is String) return value.toLowerCase() == 'true';
    if (value is num) return value != 0;
    return false;
  }

  String _toString(dynamic value) {
    if (value == null) return '';
    return value.toString();
  }

  double _toDouble(dynamic value) {
    if (value is double) return value;
    if (value is num) return value.toDouble();
    if (value is String) return double.tryParse(value) ?? 0;
    return 0;
  }
}

class _UserNode {
  final String id;
  final String name;
  final String role;
  final String managerId;
  final String? primaryDivision;

  const _UserNode({
    required this.id,
    required this.name,
    required this.role,
    required this.managerId,
    required this.primaryDivision,
  });
}

class _HarvestRecordNode {
  final String id;
  final String mandorId;
  final String mandorManagerId;
  final String workerName;
  final String divisionName;
  final String status;
  final double weightKg;
  final DateTime lastActivityAt;

  const _HarvestRecordNode({
    required this.id,
    required this.mandorId,
    required this.mandorManagerId,
    required this.workerName,
    required this.divisionName,
    required this.status,
    required this.weightKg,
    required this.lastActivityAt,
  });
}
