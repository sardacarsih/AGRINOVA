/// GraphQL queries for Mandor master data sync
/// Used for pulling employee and block data from server to local SQLite
class MandorMasterSyncQueries {
  /// Query to fetch assignment scope master data (companies, estates, divisions)
  static const String getAssignmentMasters = '''
    query MandorAssignmentMasters {
      myAssignments {
        companies {
          id
          code
          name
        }
        estates {
          id
          code
          name
          companyId
          luasHa
        }
        divisions {
          id
          name
          code
          estateId
        }
      }
    }
  ''';

  /// Query to fetch employees filtered by mandor's company
  static const String getEmployees = '''
    query MandorEmployees(\$divisionId: ID, \$search: String) {
      mandorEmployees(divisionId: \$divisionId, search: \$search) {
        id
        nik
        name
        role
        companyId
        divisionId
        photoUrl
        isActive
        createdAt
        updatedAt
      }
    }
  ''';

  /// Query to fetch blocks filtered by mandor's company/divisions
  static const String getBlocks = '''
    query MandorBlocks(\$divisionId: ID) {
      mandorBlocks(divisionId: \$divisionId) {
        id
        blockCode
        name
        luasHa
        cropType
        plantingYear
        divisionId
        createdAt
        updatedAt
      }
    }
  ''';

  /// Query to fetch harvest updates since last sync (approved/rejected status)
  static const String getServerUpdates = '''
    query MandorServerUpdates(\$since: Time!, \$deviceId: String!) {
      mandorServerUpdates(since: \$since, deviceId: \$deviceId) {
        id
        localId
        tanggal
        mandorId
        blockId
        blockName
        divisionId
        divisionName
        karyawan
        jumlahJanjang
        beratTbs
        status
        approvedBy
        approvedByName
        approvedAt
        rejectedReason
        notes
        createdAt
        updatedAt
        syncStatus
        serverVersion
      }
    }
  ''';
}
