import http from 'k6/http';
import { check, fail, group } from 'k6';
import { Counter, Trend } from 'k6/metrics';

const loginDuration = new Trend('graphql_satpam_full_login');
const recordSyncDuration = new Trend('graphql_satpam_full_sync_records');
const photoSyncDuration = new Trend('graphql_satpam_full_sync_photos');
const employeeSyncDuration = new Trend('graphql_satpam_full_sync_employee_log');
const updatesDuration = new Trend('graphql_satpam_full_server_updates');

const graphqlErrorsTotal = new Counter('graphql_satpam_full_errors_total');
const authFailures = new Counter('graphql_satpam_full_auth_failures');
const recordSyncFailures = new Counter('graphql_satpam_full_record_sync_failures');
const photoSyncFailures = new Counter('graphql_satpam_full_photo_sync_failures');
const employeeSyncFailures = new Counter('graphql_satpam_full_employee_sync_failures');
const updateFailures = new Counter('graphql_satpam_full_update_failures');
const photoSyncSkippedTotal = new Counter('graphql_satpam_full_photo_sync_skipped_total');
const employeeSyncSkippedTotal = new Counter('graphql_satpam_full_employee_sync_skipped_total');

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
  }
}
`;

const SYNC_EMPLOYEE_LOG_MUTATION = `
mutation SyncEmployeeLog($input: EmployeeLogSyncInput!) {
  syncEmployeeLog(input: $input) {
    success
    message
    employeeLogId
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
  const config = buildRuntimeConfig();

  if (config.enablePhotoSync && !config.enableRecordSync && !config.photoGuestLogId) {
    console.log(
      '[k6][satpam-sync-full] ENABLE_PHOTO_SYNC is true but no guest log source is available. ' +
        'Set PHOTO_GUEST_LOG_ID to a server-side guest log ID or enable record sync. Photo sync will be skipped.',
    );
  }

  if (config.enableEmployeeLogSync) {
    console.log(
      '[k6][satpam-sync-full] Employee log sync is enabled.',
    );
  }

  return config;
}

export default function (config) {
  const authContext = group('Satpam Login', function () {
    return loginSatpam(config);
  });

  if (!authContext) {
    return;
  }

  let recordContext = null;
  if (config.enableRecordSync) {
    recordContext = group('Satpam Sync Records', function () {
      return syncSatpamRecords(config, authContext);
    });

    if (!recordContext) {
      return;
    }
  }

  if (config.enablePhotoSync) {
    group('Satpam Sync Photos', function () {
      syncSatpamPhotos(config, authContext, recordContext);
    });
  } else {
    photoSyncSkippedTotal.add(1);
  }

  if (config.enableEmployeeLogSync) {
    group('Satpam Sync Employee Log', function () {
      syncEmployeeLog(config, authContext);
    });
  } else {
    employeeSyncSkippedTotal.add(1);
  }

  group('Satpam Server Updates', function () {
    fetchSatpamServerUpdates(config, authContext.token);
  });
}

export function handleSummary(data) {
  const generatedAt = new Date().toISOString();
  const scenario = normalizeString(__ENV.K6_SCENARIO || 'smoke').toLowerCase();
  const latestPath =
    normalizeString(__ENV.SUMMARY_JSON_LATEST_PATH) ||
    'apps/golang/scripts/k6/satpam-sync-full-summary-latest.json';
  const requestedPath = normalizeString(__ENV.SUMMARY_JSON_PATH);
  const compact = buildCompactSummary(data, generatedAt, scenario);
  const payload = {
    generatedAt: generatedAt,
    script: 'satpam-sync-full.js',
    scenario: scenario,
    compact: compact,
    summary: data,
  };
  const outputs = {
    stdout: buildSummaryText(compact),
  };
  const json = JSON.stringify(payload, null, 2);

  outputs[latestPath] = json;

  if (requestedPath && requestedPath !== latestPath) {
    outputs[requestedPath] = json;
  }

  return outputs;
}

function buildOptions() {
  const scenario = normalizeString(__ENV.K6_SCENARIO || 'smoke').toLowerCase();
  const thresholdProfile = buildBatchThresholdProfile(
    parseRecordCount(normalizeString(__ENV.RECORD_COUNT || '1')),
  );

  if (scenario === 'load') {
    return {
      stages: [
        { duration: '20s', target: 3 },
        { duration: '40s', target: 3 },
        { duration: '10s', target: 0 },
      ],
      thresholds: buildThresholds(thresholdProfile),
    };
  }

  return {
    vus: 1,
    iterations: 1,
    thresholds: buildThresholds(thresholdProfile),
  };
}

function buildThresholds(thresholdProfile) {
  return {
    http_req_failed: ['rate<0.05'],
    checks: ['rate>0.95'],
    graphql_satpam_full_login: ['p(95)<1500'],
    graphql_satpam_full_sync_records: [
      'p(95)<' + thresholdProfile.recordSyncP95Ms,
    ],
    graphql_satpam_full_sync_photos: ['p(95)<' + thresholdProfile.photoSyncP95Ms],
    graphql_satpam_full_sync_employee_log: ['p(95)<2500'],
    graphql_satpam_full_server_updates: ['p(95)<2500'],
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
    employeeCompanyId: normalizeString(
      __ENV.EMPLOYEE_COMPANY_ID || '01234567-89ab-cdef-0123-456789abcdef',
    ),
    recordCount: parseRecordCount(normalizeString(__ENV.RECORD_COUNT || '1')),
    employeeAction: normalizeString(__ENV.EMPLOYEE_ACTION || 'ENTRY') || 'ENTRY',
    employeeDepartment:
      normalizeString(__ENV.EMPLOYEE_DEPARTMENT || 'Security') || 'Security',
    gatePosition:
      normalizeString(__ENV.GATE_POSITION || 'Gate Utama') || 'Gate Utama',
    destination: normalizeString(__ENV.DESTINATION || 'Mill') || 'Mill',
    photoGuestLogId: normalizeString(__ENV.PHOTO_GUEST_LOG_ID || ''),
    updatesSince: normalizeIsoString(
      normalizeString(__ENV.UPDATES_SINCE || '2025-01-01T00:00:00Z'),
      'UPDATES_SINCE',
    ),
    enableRecordSync: parseBooleanFlag(__ENV.ENABLE_RECORD_SYNC, true),
    enablePhotoSync: parseBooleanFlag(__ENV.ENABLE_PHOTO_SYNC, true),
    enableEmployeeLogSync: parseBooleanFlag(__ENV.ENABLE_EMPLOYEE_LOG_SYNC, false),
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
      step: 'satpam_full_login',
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
    username: payload.user.username,
    deviceId: deviceId,
  };
}

function syncSatpamRecords(config, authContext) {
  const now = new Date();
  const suffix = buildUniqueSuffix(now);
  const guestLogs = [];

  for (
    let recordIndex = 0;
    recordIndex < config.recordCount;
    recordIndex++
  ) {
    const localId = 'k6-satpam-local-' + suffix + '-' + recordIndex;
    guestLogs.push({
      id: localId,
      operation: 'CREATE',
      localVersion: 1,
      lastUpdated: now.toISOString(),
      data: {
        driverName: 'K6 Satpam ' + suffix + '-' + recordIndex,
        vehiclePlate: buildVehiclePlate(now, suffix, recordIndex),
        vehicleType: 'TRUCK',
        destination: config.destination,
        gatePosition: config.gatePosition,
        notes: 'k6 satpam full sync',
        localId: localId,
        generationIntent: 'ENTRY',
        registrationSource: 'MANUAL',
      },
    });
  }

  const result = graphqlRequest(
    config.baseUrl,
    SYNC_SATPAM_RECORDS_MUTATION,
    {
      input: {
        deviceId: authContext.deviceId,
        clientTimestamp: now.toISOString(),
        batchId: 'k6-satpam-batch-' + suffix,
        guestLogs: guestLogs,
      },
    },
    authContext.token,
    {
      operation: 'syncSatpamRecords',
      step: 'satpam_full_sync_records',
    },
  );

  recordSyncDuration.add(result.response.timings.duration);

  if (!assertGraphQLSuccess(result, 'syncSatpamRecords')) {
    recordSyncFailures.add(1);
    return null;
  }

  const payload = result.body.data.syncSatpamRecords;
  const ok = check(payload, {
    'syncSatpamRecords success': function (data) {
      return !!(data && data.success === true);
    },
    'syncSatpamRecords processed expected guest logs': function (data) {
      return !!(data && data.guestLogsProcessed === config.recordCount);
    },
    'syncSatpamRecords accepted expected guest logs': function (data) {
      return !!(data && data.guestLogsSuccessful === config.recordCount);
    },
    'syncSatpamRecords no guest log failures': function (data) {
      return !!(data && data.guestLogsFailed === 0);
    },
    'syncSatpamRecords all results accepted': function (data) {
      return !!(
        data &&
        Array.isArray(data.results) &&
        data.results.length === config.recordCount &&
        data.results.every(function (item) {
          return (
            item &&
            item.status === 'ACCEPTED' &&
            item.success === true &&
            normalizeString(item.serverId)
          );
        })
      );
    },
  });

  if (!ok) {
    recordSyncFailures.add(1);
    return null;
  }

  return {
    localIds: guestLogs.map(function (item) {
      return item.id;
    }),
    serverIds: payload.results.map(function (item) {
      return item.serverId;
    }),
    recordCount: config.recordCount,
  };
}

function syncSatpamPhotos(config, authContext, recordContext) {
  const guestLogIds =
    recordContext &&
    Array.isArray(recordContext.serverIds) &&
    recordContext.serverIds.length > 0
      ? recordContext.serverIds
      : normalizeString(config.photoGuestLogId)
        ? [normalizeString(config.photoGuestLogId)]
        : [];

  if (guestLogIds.length === 0) {
    photoSyncSkippedTotal.add(1);
    return null;
  }

  const now = new Date();
  const suffix = buildUniqueSuffix(now);
  const photos = guestLogIds.map(function (guestLogId, index) {
    const photoId = 'k6-satpam-photo-id-' + suffix + '-' + index;
    return {
      localId: 'k6-satpam-photo-local-' + suffix + '-' + index,
      photoId: photoId,
      guestLogId: guestLogId,
      photoType: 'ENTRY',
      localPath:
        '/storage/emulated/0/DCIM/k6-satpam-' + suffix + '-' + index + '.jpg',
      fileName: 'k6-satpam-' + suffix + '-' + index + '.jpg',
      fileSize: 8,
      fileHash: 'k6-hash-' + suffix + '-' + index,
      photoData: config.photoDataBase64,
      takenAt: now.toISOString(),
    };
  });
  const result = graphqlRequest(
    config.baseUrl,
    SYNC_SATPAM_PHOTOS_MUTATION,
    {
      input: {
        deviceId: authContext.deviceId,
        batchId: 'k6-satpam-photo-batch-' + suffix,
        photos: photos,
      },
    },
    authContext.token,
    {
      operation: 'syncSatpamPhotos',
      step: 'satpam_full_sync_photos',
    },
  );

  photoSyncDuration.add(result.response.timings.duration);

  if (!assertGraphQLSuccess(result, 'syncSatpamPhotos')) {
    photoSyncFailures.add(1);
    return null;
  }

  const payload = result.body.data.syncSatpamPhotos;
  const ok = check(payload, {
    'syncSatpamPhotos processed expected photos': function (data) {
      return !!(data && data.photosProcessed === photos.length);
    },
    'syncSatpamPhotos uploaded expected photos': function (data) {
      return !!(data && data.successfulUploads === photos.length);
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
    photoCount: photos.length,
  };
}

function syncEmployeeLog(config, authContext) {
  const now = new Date();
  const suffix = buildUniqueSuffix(now);
  const result = graphqlRequest(
    config.baseUrl,
    SYNC_EMPLOYEE_LOG_MUTATION,
    {
      input: {
        deviceId: authContext.deviceId,
        clientTimestamp: now.toISOString(),
        record: {
          localId: 'k6-satpam-employee-' + suffix,
          companyId: config.employeeCompanyId,
          iddata: 'EMP-K6-' + suffix,
          nik: 'K6' + String(now.getTime()).slice(-6),
          nama: 'K6 Employee ' + suffix,
          departement: config.employeeDepartment,
          action: config.employeeAction,
          gatePosition: config.gatePosition,
          scannedAt: now.toISOString(),
          scannedById: authContext.userId,
          deviceId: authContext.deviceId,
          notes: 'k6 employee log sync',
          localVersion: 1,
        },
      },
    },
    authContext.token,
    {
      operation: 'syncEmployeeLog',
      step: 'satpam_full_sync_employee_log',
    },
  );

  employeeSyncDuration.add(result.response.timings.duration);

  if (!assertGraphQLSuccess(result, 'syncEmployeeLog')) {
    employeeSyncFailures.add(1);
    return null;
  }

  const payload = result.body.data.syncEmployeeLog;
  const ok = check(payload, {
    'syncEmployeeLog app success': function (data) {
      return !!(data && data.success === true);
    },
    'syncEmployeeLog server id exists': function (data) {
      return !!(data && normalizeString(data.employeeLogId));
    },
  });

  if (!ok) {
    employeeSyncFailures.add(1);
    return null;
  }

  return {
    employeeLogId: payload.employeeLogId,
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
      step: 'satpam_full_server_updates',
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

function buildCompactSummary(data, generatedAt, scenario) {
  const checks = metricValues(data, 'checks');
  const httpReqFailed = metricValues(data, 'http_req_failed');
  const recordCount = parseRecordCount(normalizeString(__ENV.RECORD_COUNT || '1'));

  return {
    generatedAt: generatedAt,
    scenario: scenario,
    recordCount: recordCount,
    iterations: readMetricValue(metricValues(data, 'iterations'), ['count']),
    httpRequests: readMetricValue(metricValues(data, 'http_reqs'), ['count']),
    checksPassRate: checks.rate,
    httpFailureRate: httpReqFailed.rate,
    durations: {
      loginP95Ms: readP95Metric(data, 'graphql_satpam_full_login'),
      recordSyncP95Ms: readP95Metric(data, 'graphql_satpam_full_sync_records'),
      photoSyncP95Ms: readP95Metric(data, 'graphql_satpam_full_sync_photos'),
      employeeSyncP95Ms: readP95Metric(
        data,
        'graphql_satpam_full_sync_employee_log',
      ),
      serverUpdatesP95Ms: readP95Metric(
        data,
        'graphql_satpam_full_server_updates',
      ),
      httpReqDurationP95Ms: readP95Metric(data, 'http_req_duration'),
    },
  };
}

function metricValues(data, metricName) {
  const metric = data && data.metrics ? data.metrics[metricName] : null;
  return metric && metric.values ? metric.values : {};
}

function readMetricValue(values, keys) {
  for (let index = 0; index < keys.length; index++) {
    const key = keys[index];
    if (typeof values[key] === 'number') {
      return values[key];
    }
  }

  return null;
}

function readP95Metric(data, metricName) {
  return readMetricValue(metricValues(data, metricName), ['p(95)', 'p95']);
}

function formatPercent(value) {
  if (typeof value !== 'number') {
    return 'n/a';
  }

  return (value * 100).toFixed(2) + '%';
}

function formatNumber(value) {
  if (typeof value !== 'number') {
    return 'n/a';
  }

  return value.toFixed(2);
}

function buildSummaryText(compact) {
  return [
    '[k6][satpam-sync-full] Summary',
    'generatedAt=' + compact.generatedAt,
    'scenario=' + compact.scenario,
    'recordCount=' + compact.recordCount,
    'iterations=' + compact.iterations,
    'httpRequests=' + compact.httpRequests,
    'checksPassRate=' + formatPercent(compact.checksPassRate),
    'httpFailureRate=' + formatPercent(compact.httpFailureRate),
    'loginP95Ms=' + formatNumber(compact.durations.loginP95Ms),
    'recordSyncP95Ms=' + formatNumber(compact.durations.recordSyncP95Ms),
    'photoSyncP95Ms=' + formatNumber(compact.durations.photoSyncP95Ms),
    'employeeSyncP95Ms=' + formatNumber(compact.durations.employeeSyncP95Ms),
    'serverUpdatesP95Ms=' + formatNumber(compact.durations.serverUpdatesP95Ms),
    'httpReqDurationP95Ms=' + formatNumber(compact.durations.httpReqDurationP95Ms),
    '',
  ].join('\n');
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

function buildUniqueSuffix(now) {
  return String(now.getTime()) + '-' + __VU + '-' + __ITER;
}

function buildVehiclePlate(now, suffix, recordIndex) {
  const base = String(now.getTime()).slice(-6);
  const serial = String(recordIndex).padStart(3, '0');
  return 'K' + base + 'R' + serial;
}

function buildBatchThresholdProfile(recordCount) {
  if (recordCount >= 500) {
    return {
      recordSyncP95Ms: 30000,
      photoSyncP95Ms: 30000,
    };
  }

  if (recordCount >= 200) {
    return {
      recordSyncP95Ms: 15000,
      photoSyncP95Ms: 15000,
    };
  }

  if (recordCount >= 100) {
    return {
      recordSyncP95Ms: 8000,
      photoSyncP95Ms: 8000,
    };
  }

  if (recordCount >= 50) {
    return {
      recordSyncP95Ms: 5000,
      photoSyncP95Ms: 5000,
    };
  }

  return {
    recordSyncP95Ms: 2500,
    photoSyncP95Ms: 2500,
  };
}

function parseBooleanFlag(value, defaultValue) {
  const normalized = normalizeString(value);

  if (!normalized) {
    return defaultValue;
  }

  return normalized.toLowerCase() === 'true';
}

function parseRecordCount(value) {
  const normalized = normalizeString(value);
  const parsed = Number.parseInt(normalized || '1', 10);

  if (!Number.isInteger(parsed) || parsed < 1) {
    fail('RECORD_COUNT must be a positive integer.');
  }

  return parsed;
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
