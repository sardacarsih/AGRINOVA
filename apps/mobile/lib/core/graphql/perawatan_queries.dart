import 'package:graphql_flutter/graphql_flutter.dart';

class PerawatanQueries {
  static const String perawatanRecordFields = r'''
    id
    blockId
    block {
      id
      blockCode
      name
      divisionId
    }
    jenisPerawatan
    tanggalPerawatan
    pekerjaId
    pekerja {
      id
      name
      role
      effectiveMandorType
    }
    luasArea
    pupukDigunakan
    herbisidaDigunakan
    catatan
    status
    createdAt
    updatedAt
  ''';

  static const String materialUsageFields = r'''
    id
    perawatanRecordId
    materialCategory
    materialName
    quantity
    unit
    unitPrice
    totalCost
    createdAt
    updatedAt
    perawatanRecord {
      id
      status
      jenisPerawatan
      tanggalPerawatan
      block {
        id
        name
        blockCode
      }
    }
  ''';

  static const String getPerawatanRecordsQuery = r'''
    query GetPerawatanRecords {
      perawatanRecords {
        id
        blockId
        block {
          id
          blockCode
          name
          divisionId
        }
        jenisPerawatan
        tanggalPerawatan
        pekerjaId
        pekerja {
          id
          name
          role
          effectiveMandorType
        }
        luasArea
        pupukDigunakan
        herbisidaDigunakan
        catatan
        status
        createdAt
        updatedAt
      }
    }
  ''';

  static const String getPerawatanMaterialUsageRecordsQuery = r'''
    query GetPerawatanMaterialUsageRecords {
      perawatanMaterialUsageRecords {
        id
        perawatanRecordId
        materialCategory
        materialName
        quantity
        unit
        unitPrice
        totalCost
        createdAt
        updatedAt
        perawatanRecord {
          id
          status
          jenisPerawatan
          tanggalPerawatan
          block {
            id
            name
            blockCode
          }
        }
      }
    }
  ''';

  static const String getPerawatanMaterialUsageByRecordQuery = r'''
    query GetPerawatanMaterialUsageByRecord($perawatanRecordId: ID!) {
      perawatanMaterialUsageRecordsByRecord(perawatanRecordId: $perawatanRecordId) {
        id
        perawatanRecordId
        materialCategory
        materialName
        quantity
        unit
        unitPrice
        totalCost
        createdAt
        updatedAt
        perawatanRecord {
          id
          status
          jenisPerawatan
          tanggalPerawatan
          block {
            id
            name
            blockCode
          }
        }
      }
    }
  ''';

  static const String createPerawatanRecordMutation = r'''
    mutation CreatePerawatanRecord($input: CreatePerawatanRecordInput!) {
      createPerawatanRecord(input: $input) {
        id
        blockId
        block {
          id
          blockCode
          name
          divisionId
        }
        jenisPerawatan
        tanggalPerawatan
        pekerjaId
        pekerja {
          id
          name
          role
          effectiveMandorType
        }
        luasArea
        pupukDigunakan
        herbisidaDigunakan
        catatan
        status
        createdAt
        updatedAt
      }
    }
  ''';

  static const String updatePerawatanRecordMutation = r'''
    mutation UpdatePerawatanRecord($input: UpdatePerawatanRecordInput!) {
      updatePerawatanRecord(input: $input) {
        id
        blockId
        block {
          id
          blockCode
          name
          divisionId
        }
        jenisPerawatan
        tanggalPerawatan
        pekerjaId
        pekerja {
          id
          name
          role
          effectiveMandorType
        }
        luasArea
        pupukDigunakan
        herbisidaDigunakan
        catatan
        status
        createdAt
        updatedAt
      }
    }
  ''';

  static const String deletePerawatanRecordMutation = r'''
    mutation DeletePerawatanRecord($id: ID!) {
      deletePerawatanRecord(id: $id)
    }
  ''';

  static const String createPerawatanMaterialUsageMutation = r'''
    mutation CreatePerawatanMaterialUsage($input: CreatePerawatanMaterialUsageInput!) {
      createPerawatanMaterialUsage(input: $input) {
        id
        perawatanRecordId
        materialCategory
        materialName
        quantity
        unit
        unitPrice
        totalCost
        createdAt
        updatedAt
        perawatanRecord {
          id
          status
          jenisPerawatan
          tanggalPerawatan
          block {
            id
            name
            blockCode
          }
        }
      }
    }
  ''';

  static const String updatePerawatanMaterialUsageMutation = r'''
    mutation UpdatePerawatanMaterialUsage($input: UpdatePerawatanMaterialUsageInput!) {
      updatePerawatanMaterialUsage(input: $input) {
        id
        perawatanRecordId
        materialCategory
        materialName
        quantity
        unit
        unitPrice
        totalCost
        createdAt
        updatedAt
        perawatanRecord {
          id
          status
          jenisPerawatan
          tanggalPerawatan
          block {
            id
            name
            blockCode
          }
        }
      }
    }
  ''';

  static const String deletePerawatanMaterialUsageMutation = r'''
    mutation DeletePerawatanMaterialUsage($id: ID!) {
      deletePerawatanMaterialUsage(id: $id)
    }
  ''';

  static QueryOptions queryOptions({
    required String document,
    Map<String, dynamic>? variables,
    FetchPolicy fetchPolicy = FetchPolicy.cacheAndNetwork,
  }) {
    return QueryOptions(
      document: gql(document),
      variables: variables ?? const <String, dynamic>{},
      fetchPolicy: fetchPolicy,
    );
  }

  static MutationOptions mutationOptions({
    required String document,
    Map<String, dynamic>? variables,
  }) {
    return MutationOptions(
      document: gql(document),
      variables: variables ?? const <String, dynamic>{},
    );
  }
}
