import http from 'k6/http';
import { check, fail, group } from 'k6';
import { Counter, Trend } from 'k6/metrics';

const loginDuration = new Trend('graphql_satpam_login');
const syncDuration = new Trend('graphql_satpam_sync_records');
const photoSyncDuration = new Trend('graphql_satpam_sync_photos');
const updatesDuration = new Trend('graphql_satpam_server_updates');

const graphqlErrorsTotal = new Counter('graphql_satpam_errors_total');
const authFailures = new Counter('graphql_satpam_auth_failures');
const syncFailures = new Counter('graphql_satpam_sync_failures');
const photoSyncFailures = new Counter('graphql_satpam_photo_sync_failures');
const updateFailures = new Counter('graphql_satpam_update_failures');

const MOBILE_LOGIN_MUTATION = `
mutation MobileLogin($input: MobileLoginInput!) {
  mobileLogin(input: $input) {
    accessToken
    user {
      id
      username
      role
    }
  }
}
`;

const SYNC_SATPAM_RECORDS_MUTATION = `
mutation SyncSatpamRecords($input: SatpamSyncInput!) {
  syncSatpamRecords(input: $input) {
    success
    transactionId
    guestLogsProcessed
    guestLogsSuccessful
    guestLogsFailed
    conflictsDetected
    message
    serverTimestamp
    results {
      id
      recordType
      serverId
      success
      status
      reason
      error
      hasConflict
    }
  }
}
`;

const SYNC_SATPAM_PHOTOS_MUTATION = `
mutation SyncSatpamPhotos($input: SatpamPhotoSyncInput!) {
  syncSatpamPhotos(input: $input) {
    photosProcessed
    successfulUploads
    failedUploads
    totalBytesUploaded
    errors {
      photoId
      error
      code
    }
    syncedAt
  }
}
`;

const SATPAM_SERVER_UPDATES_QUERY = `
query SatpamServerUpdates($since: Time!, $deviceId: String!) {
  satpamServerUpdates(since: $since, deviceId: $deviceId) {
    id
    localId
    driverName
    vehiclePlate
    syncStatus
    createdAt
  }
}
`;

export const options = buildOptions();

export function setup() {
  return buildRuntimeConfig();
}

export default function (config) {
  const authContext = group('Satpam Login', function () {
    return loginSatpam(config);
  });

  if (!authContext) {
    return;
  }

  const syncContext = group('Satpam Sync Records', function () {
    return syncSatpamRecords(config, authContext);
  });

  if (!syncContext) {
    return;
  }

  const photoContext = group('Satpam Sync Photos', function () {
    return syncSatpamPhotos(config, authContext, syncContext);
  });

  if (!photoContext) {
    return;
  }

  group('Satpam Server Updates', function () {
    fetchSatpamServerUpdates(config, authContext.token);
  });
}

function buildOptions() {
  const scenario = normalizeString(__ENV.K6_SCENARIO || 'smoke').toLowerCase();

  if (scenario === 'load') {
    return {
      stages: [
        { duration: '20s', target: 3 },
        { duration: '40s', target: 3 },
        { duration: '10s', target: 0 },
      ],
      thresholds: buildThresholds(),
    };
  }

  return {
    vus: 1,
    iterations: 1,
    thresholds: buildThresholds(),
  };
}

function buildThresholds() {
  return {
    http_req_failed: ['rate<0.05'],
    checks: ['rate>0.95'],
    graphql_satpam_login: ['p(95)<1500'],
    graphql_satpam_sync_records: ['p(95)<2500'],
    graphql_satpam_sync_photos: ['p(95)<2500'],
    graphql_satpam_server_updates: ['p(95)<2500'],
  };
}

function buildRuntimeConfig() {
  return {
    baseUrl: normalizeGraphqlUrl(
      normalizeString(__ENV.BASE_URL || 'http://localhost:8080/graphql'),
    ),
    identifier: normalizeString(__ENV.SATPAM_IDENTIFIER || 'satpam'),
    password: normalizeString(__ENV.SATPAM_PASSWORD || 'demo123'),
    platform: normalizeString(__ENV.PLATFORM || 'ANDROID') || 'ANDROID',
    deviceId: normalizeString(__ENV.DEVICE_ID || 'k6-satpam-device'),
    deviceFingerprint:
      normalizeString(__ENV.DEVICE_FINGERPRINT || 'k6-satpam-fingerprint'),
    photoDataBase64: normalizeString(__ENV.PHOTO_DATA_BASE64 || 'azYtcGhvdG8='),
    updatesSince: normalizeIsoString(
      normalizeString(__ENV.UPDATES_SINCE || '2025-01-01T00:00:00Z'),
      'UPDATES_SINCE',
    ),
  };
}

function loginSatpam(config) {
  const deviceId = getVuScopedValue(config.deviceId);
  const deviceFingerprint = getVuScopedValue(config.deviceFingerprint);
  const result = graphqlRequest(
    config.baseUrl,
    MOBILE_LOGIN_MUTATION,
    {
      input: {
        identifier: config.identifier,
        password: config.password,
        platform: config.platform,
        deviceId: deviceId,
        deviceFingerprint: deviceFingerprint,
      },
    },
    null,
    {
      operation: 'mobileLogin',
      step: 'satpam_login',
    },
  );

  loginDuration.add(result.response.timings.duration);

  if (!assertGraphQLSuccess(result, 'mobileLogin')) {
    authFailures.add(1);
    return null;
  }

  const payload = result.body.data.mobileLogin;
  const ok = check(payload, {
    'mobileLogin access token exists': function (data) {
      return !!(data && normalizeString(data.accessToken));
    },
    'mobileLogin role is SATPAM': function (data) {
      return !!(data && data.user && data.user.role === 'SATPAM');
    },
  });

  if (!ok) {
    authFailures.add(1);
    return null;
  }

  return {
    token: payload.accessToken,
    userId: payload.user.id,
    deviceId: deviceId,
  };
}

function syncSatpamRecords(config, authContext) {
  const now = new Date();
  const suffix = String(now.getTime()) + '-' + __VU + '-' + __ITER;
  const localId = 'k6-satpam-local-' + suffix;
  const vehiclePlate = 'B' + String(now.getTime()).slice(-8) + 'K6';
  const variables = {
    input: {
      deviceId: authContext.deviceId,
      clientTimestamp: now.toISOString(),
      batchId: 'k6-satpam-batch-' + suffix,
      guestLogs: [
        {
          id: localId,
          operation: 'CREATE',
          localVersion: 1,
          lastUpdated: now.toISOString(),
          data: {
            driverName: 'K6 Satpam ' + suffix,
            vehiclePlate: vehiclePlate,
            vehicleType: 'TRUCK',
            destination: 'Mill',
            gatePosition: 'Gate Utama',
            notes: 'k6 satpam sync smoke',
            localId: localId,
            generationIntent: 'ENTRY',
            registrationSource: 'MANUAL',
          },
        },
      ],
    },
  };

  const result = graphqlRequest(
    config.baseUrl,
    SYNC_SATPAM_RECORDS_MUTATION,
    variables,
    authContext.token,
    {
      operation: 'syncSatpamRecords',
      step: 'satpam_sync_records',
    },
  );

  syncDuration.add(result.response.timings.duration);

  if (!assertGraphQLSuccess(result, 'syncSatpamRecords')) {
    syncFailures.add(1);
    return null;
  }

  const payload = result.body.data.syncSatpamRecords;
  const ok = check(payload, {
    'syncSatpamRecords success': function (data) {
      return !!(data && data.success === true);
    },
    'syncSatpamRecords processed one guest log': function (data) {
      return !!(data && data.guestLogsProcessed === 1);
    },
    'syncSatpamRecords accepted one guest log': function (data) {
      return !!(data && data.guestLogsSuccessful === 1);
    },
    'syncSatpamRecords no guest log failures': function (data) {
      return !!(data && data.guestLogsFailed === 0);
    },
    'syncSatpamRecords result accepted': function (data) {
      return !!(
        data &&
        Array.isArray(data.results) &&
        data.results.length === 1 &&
        data.results[0] &&
        data.results[0].status === 'ACCEPTED' &&
        data.results[0].success === true
      );
    },
  });

  if (!ok) {
    syncFailures.add(1);
    return null;
  }

  return {
    localId: localId,
    serverId: payload.results[0].serverId,
  };
}

function syncSatpamPhotos(config, authContext, syncContext) {
  const now = new Date();
  const suffix = String(now.getTime()) + '-' + __VU + '-' + __ITER;
  const photoId = 'k6-satpam-photo-id-' + suffix;
  const result = graphqlRequest(
    config.baseUrl,
    SYNC_SATPAM_PHOTOS_MUTATION,
    {
      input: {
        deviceId: authContext.deviceId,
        batchId: 'k6-satpam-photo-batch-' + suffix,
        photos: [
          {
            localId: 'k6-satpam-photo-local-' + suffix,
            photoId: photoId,
            guestLogId: syncContext.serverId,
            photoType: 'ENTRY',
            localPath: '/storage/emulated/0/DCIM/k6-satpam-' + suffix + '.jpg',
            fileName: 'k6-satpam-' + suffix + '.jpg',
            fileSize: 8,
            fileHash: 'k6-hash-' + suffix,
            photoData: config.photoDataBase64,
            takenAt: now.toISOString(),
          },
        ],
      },
    },
    authContext.token,
    {
      operation: 'syncSatpamPhotos',
      step: 'satpam_sync_photos',
    },
  );

  photoSyncDuration.add(result.response.timings.duration);

  if (!assertGraphQLSuccess(result, 'syncSatpamPhotos')) {
    photoSyncFailures.add(1);
    return null;
  }

  const payload = result.body.data.syncSatpamPhotos;
  const ok = check(payload, {
    'syncSatpamPhotos processed one photo': function (data) {
      return !!(data && data.photosProcessed === 1);
    },
    'syncSatpamPhotos uploaded one photo': function (data) {
      return !!(data && data.successfulUploads === 1);
    },
    'syncSatpamPhotos no failed uploads': function (data) {
      return !!(data && data.failedUploads === 0);
    },
    'syncSatpamPhotos no sync errors': function (data) {
      return !!(data && Array.isArray(data.errors) && data.errors.length === 0);
    },
  });

  if (!ok) {
    photoSyncFailures.add(1);
    return null;
  }

  return {
    photoId: photoId,
  };
}

function fetchSatpamServerUpdates(config, token) {
  const result = graphqlRequest(
    config.baseUrl,
    SATPAM_SERVER_UPDATES_QUERY,
    {
      since: config.updatesSince,
      deviceId: getVuScopedValue(config.deviceId),
    },
    token,
    {
      operation: 'satpamServerUpdates',
      step: 'satpam_server_updates',
    },
  );

  updatesDuration.add(result.response.timings.duration);

  if (!assertGraphQLSuccess(result, 'satpamServerUpdates')) {
    updateFailures.add(1);
    return;
  }

  const ok = check(result.body.data.satpamServerUpdates, {
    'satpamServerUpdates payload is array': function (data) {
      return Array.isArray(data);
    },
  });

  if (!ok) {
    updateFailures.add(1);
  }
}

function graphqlRequest(baseUrl, query, variables, token, tags) {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers.Authorization = 'Bearer ' + token;
  }

  const response = http.post(
    baseUrl,
    JSON.stringify({
      query: query,
      variables: variables || {},
    }),
    {
      headers: headers,
      tags: tags || {},
    },
  );

  let body = null;
  let parseError = null;

  try {
    body = JSON.parse(response.body);
  } catch (error) {
    parseError = error;
  }

  return {
    response: response,
    body: body,
    parseError: parseError,
  };
}

function assertGraphQLSuccess(result, stepName) {
  const graphQLErrorCount =
    result.body && Array.isArray(result.body.errors)
      ? result.body.errors.length
      : 0;

  const ok = check(
    {
      response: result.response,
      body: result.body,
      parseError: result.parseError,
      graphQLErrorCount: graphQLErrorCount,
    },
    {
      [stepName + ' http 200']: function (data) {
        return data.response.status === 200;
      },
      [stepName + ' response parsed']: function (data) {
        return data.parseError === null && data.body !== null;
      },
      [stepName + ' no graphql errors']: function (data) {
        return data.graphQLErrorCount === 0;
      },
      [stepName + ' has data field']: function (data) {
        return data.body !== null && data.body.data !== undefined && data.body.data !== null;
      },
    },
  );

  if (!ok) {
    graphqlErrorsTotal.add(1);
  }

  return ok;
}

function normalizeGraphqlUrl(value) {
  const normalized = normalizeString(value);

  if (!normalized) {
    fail('BASE_URL is required.');
  }

  if (normalized.slice(-8).toLowerCase() === '/graphql') {
    return normalized;
  }

  return normalized.replace(/\/+$/, '') + '/graphql';
}

function getVuScopedValue(baseValue) {
  const normalized = normalizeString(baseValue);

  if (!normalized) {
    return normalized;
  }

  return normalized + '-vu-' + __VU;
}

function normalizeString(value) {
  return String(value || '').trim();
}

function normalizeIsoString(value, key) {
  const normalized = normalizeString(value);
  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    fail(key + ' must be a valid ISO-8601 datetime.');
  }

  return date.toISOString();
}
