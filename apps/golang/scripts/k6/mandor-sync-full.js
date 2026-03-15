import http from 'k6/http';
import { check, fail, group } from 'k6';
import { Counter, Trend } from 'k6/metrics';

const DEFAULT_UPDATED_SINCE = '2025-01-01T00:00:00Z';
const DEFAULT_STATUS_SINCE = '2025-01-01T00:00:00Z';
const SAFE_HARVEST_ANCHOR_YEAR = 1000;
const MAX_SAFE_HARVEST_YEAR = 9999;
const SAFE_HARVEST_VU_WINDOW_DAYS = 75000;
const SAFE_HARVEST_RUN_BASE_OFFSET_DAYS = 750000;
const SAFE_HARVEST_RUN_SEED_WINDOW_DAYS = 50000;

const graphqlMobileLogin = new Trend('graphql_mobile_login');
const graphqlMyAssignments = new Trend('graphql_my_assignments');
const graphqlMandorBlocksFull = new Trend('graphql_mandor_blocks_full');
const graphqlMandorEmployeesFull = new Trend('graphql_mandor_employees_full');
const graphqlMandorDivisionsIncremental = new Trend(
  'graphql_mandor_divisions_incremental',
);
const graphqlMandorBlocksIncremental = new Trend(
  'graphql_mandor_blocks_incremental',
);
const graphqlMandorEmployeesIncremental = new Trend(
  'graphql_mandor_employees_incremental',
);
const graphqlSyncHarvestRecordsNoPhoto = new Trend(
  'graphql_sync_harvest_records_no_photo',
);
const graphqlSyncHarvestRecordsPhotoReference = new Trend(
  'graphql_sync_harvest_records_photo_reference',
);
const graphqlSyncHarvestRecordsPhotoInline = new Trend(
  'graphql_sync_harvest_records_photo_inline',
);
const graphqlMandorServerUpdates = new Trend('graphql_mandor_server_updates');

const graphqlErrorsTotal = new Counter('graphql_errors_total');
const graphqlAuthFailures = new Counter('graphql_auth_failures');
const graphqlMasterSyncFailures = new Counter('graphql_master_sync_failures');
const graphqlHarvestPushFailures = new Counter('graphql_harvest_push_failures');
const graphqlHarvestPhotoFailures = new Counter('graphql_harvest_photo_failures');
const graphqlServerUpdateFailures = new Counter(
  'graphql_server_update_failures',
);
const graphqlWriteSkippedTotal = new Counter('graphql_write_skipped_total');
const graphqlInlinePhotoSkippedTotal = new Counter(
  'graphql_inline_photo_skipped_total',
);
const graphqlPullSkippedAfterPushTotal = new Counter(
  'graphql_pull_skipped_after_push_total',
);
let hasLoggedHarvestBusinessFailure = false;

const MOBILE_LOGIN_MUTATION = `
mutation MobileLogin($input: MobileLoginInput!) {
  mobileLogin(input: $input) {
    accessToken
    refreshToken
    offlineToken
    tokenType
    user {
      id
      role
    }
    assignments {
      divisions {
        id
      }
    }
  }
}
`;

const MY_ASSIGNMENTS_QUERY = `
query MandorAssignmentMasters {
  myAssignments {
    companies {
      id
    }
    estates {
      id
    }
    divisions {
      id
    }
  }
}
`;

const MANDOR_BLOCKS_QUERY = `
query MandorBlocks($divisionId: ID) {
  mandorBlocks(divisionId: $divisionId) {
    id
    divisionId
    updatedAt
  }
}
`;

const MANDOR_EMPLOYEES_QUERY = `
query MandorEmployees($divisionId: ID, $search: String) {
  mandorEmployees(divisionId: $divisionId, search: $search) {
    id
    divisionId
    companyId
    updatedAt
  }
}
`;

const MANDOR_DIVISION_MASTERS_SYNC_QUERY = `
query MandorDivisionMastersSync($updatedSince: Time!) {
  mandorDivisionMastersSync(updatedSince: $updatedSince) {
    companies {
      id
      updatedAt
    }
    estates {
      id
      updatedAt
    }
    divisions {
      id
      updatedAt
    }
  }
}
`;

const MANDOR_BLOCKS_SYNC_QUERY = `
query MandorBlocksSync($divisionId: ID, $updatedSince: Time!) {
  mandorBlocksSync(divisionId: $divisionId, updatedSince: $updatedSince) {
    id
    divisionId
    updatedAt
  }
}
`;

const MANDOR_EMPLOYEES_SYNC_QUERY = `
query MandorEmployeesSync($divisionId: ID, $updatedSince: Time!) {
  mandorEmployeesSync(divisionId: $divisionId, updatedSince: $updatedSince) {
    id
    divisionId
    companyId
    updatedAt
  }
}
`;

const SYNC_HARVEST_RECORDS_MUTATION = `
mutation SyncHarvestRecords($input: HarvestSyncInput!) {
  syncHarvestRecords(input: $input) {
    success
    transactionId
    recordsProcessed
    recordsSuccessful
    recordsFailed
    conflictsDetected
    message
    serverTimestamp
    results {
      localId
      serverId
      success
      error
    }
  }
}
`;

const MANDOR_SERVER_UPDATES_QUERY = `
query MandorServerUpdates($since: Time!, $deviceId: String!) {
  mandorServerUpdates(since: $since, deviceId: $deviceId) {
    id
    localId
    status
    approvedBy
    approvedAt
    rejectedReason
    updatedAt
  }
}
`;

export const options = buildOptions();

export function setup() {
  const config = buildRuntimeConfig();

  if (!config.enableWriteSync) {
    console.log(
      '[k6][mandor-sync] ENABLE_WRITE_SYNC is not true. Harvest upload steps will be skipped.',
    );
  } else if (!config.enableInlinePhotoSync) {
    console.log(
      '[k6][mandor-sync] ENABLE_INLINE_PHOTO_SYNC is not true. Inline photo upload step will be skipped.',
    );
  }

  return config;
}

export default function (config) {
  const authContext = group('Mandor Login', function () {
    return loginMandor(config);
  });

  if (!authContext) {
    return;
  }

  const divisionId = pickDivisionId(config.divisionId, authContext.assignments);

  group('Mandor Full Master Sync', function () {
    runFullMasterSync(config, authContext.token, divisionId);
  });

  group('Mandor Incremental Master Sync', function () {
    runIncrementalMasterSync(config, authContext.token, divisionId);
  });

  const uploadResult = group('Mandor Harvest Upload', function () {
    return runHarvestUploadMatrix(config, authContext, divisionId);
  });

  if (uploadResult && uploadResult.didPushFreshHarvestData) {
    graphqlPullSkippedAfterPushTotal.add(1);
  } else {
    group('Mandor Pull Server Updates', function () {
      runPullServerUpdates(config, authContext.token);
    });
  }
}

function buildOptions() {
  const scenario = normalizeString(__ENV.K6_SCENARIO || 'load').toLowerCase();
  const thresholdProfile = getHarvestThresholdProfile(
    scenario,
    optionalEnv('HARVEST_RECORD_COUNT'),
  );
  let config;

  switch (scenario) {
    case 'smoke':
      config = {
        vus: 1,
        iterations: 1,
      };
      break;
    case 'stress':
      config = {
        stages: [
          { duration: '30s', target: 10 },
          { duration: '1m', target: 25 },
          { duration: '2m', target: 25 },
          { duration: '30s', target: 0 },
        ],
      };
      break;
    case 'batch50':
    case 'batch100':
      config = {
        stages: [
          { duration: '30s', target: 5 },
          { duration: '2m', target: 10 },
          { duration: '30s', target: 0 },
        ],
      };
      break;
    case 'batch500':
      config = {
        stages: [
          { duration: '30s', target: 2 },
          { duration: '2m', target: 5 },
          { duration: '30s', target: 0 },
        ],
      };
      break;
    case 'batch1000':
      config = {
        stages: [
          { duration: '30s', target: 1 },
          { duration: '2m', target: 3 },
          { duration: '30s', target: 0 },
        ],
      };
      break;
    case 'load':
    default:
      config = {
        stages: [
          { duration: '30s', target: 5 },
          { duration: '2m', target: 10 },
          { duration: '30s', target: 0 },
        ],
      };
      break;
  }

  config.thresholds = {
    http_req_failed: ['rate<0.05'],
    checks: ['rate>0.95'],
    graphql_mobile_login: ['p(95)<1500'],
    graphql_my_assignments: ['p(95)<2000'],
    graphql_mandor_blocks_full: ['p(95)<2500'],
    graphql_mandor_employees_full: ['p(95)<3000'],
    graphql_mandor_divisions_incremental: ['p(95)<2000'],
    graphql_mandor_blocks_incremental: ['p(95)<2000'],
    graphql_mandor_employees_incremental: ['p(95)<2500'],
    graphql_sync_harvest_records_no_photo: [
      'p(95)<' + thresholdProfile.noPhotoP95Ms,
    ],
    graphql_sync_harvest_records_photo_reference: [
      'p(95)<' + thresholdProfile.photoReferenceP95Ms,
    ],
    graphql_sync_harvest_records_photo_inline: [
      'p(95)<' + thresholdProfile.photoInlineP95Ms,
    ],
    graphql_mandor_server_updates: ['p(95)<2500'],
  };

  return config;
}

function buildRuntimeConfig() {
  const scenario = normalizeString(__ENV.K6_SCENARIO || 'load').toLowerCase();
  const config = {
    baseUrl: requireEnv('BASE_URL'),
    scenario: scenario,
    identifier: requireEnv('MANDOR_IDENTIFIER'),
    password: requireEnv('MANDOR_PASSWORD'),
    deviceId: requireEnv('DEVICE_ID'),
    deviceFingerprint: requireEnv('DEVICE_FINGERPRINT'),
    platform: normalizeString(__ENV.PLATFORM || 'ANDROID') || 'ANDROID',
    divisionId: optionalEnv('DIVISION_ID'),
    updatedSince: normalizeIsoString(
      optionalEnv('UPDATED_SINCE') || DEFAULT_UPDATED_SINCE,
      'UPDATED_SINCE',
    ),
    statusSince: normalizeIsoString(
      optionalEnv('STATUS_SINCE') || DEFAULT_STATUS_SINCE,
      'STATUS_SINCE',
    ),
    enableWriteSync: isTrueFlag(__ENV.ENABLE_WRITE_SYNC),
    enableInlinePhotoSync: isTrueFlag(__ENV.ENABLE_INLINE_PHOTO_SYNC),
    photoUrlReference: optionalEnv('PHOTO_URL_REFERENCE'),
    photoDataUri: optionalEnv('PHOTO_DATA_URI'),
    maxVuSlots: getScenarioMaxVuCount(scenario),
    harvestRunDaySeed: resolveHarvestRunDaySeed(
      optionalEnv('HARVEST_RUN_DAY_SEED'),
    ),
    harvestRecordCount: 1,
    harvestTemplate: null,
  };

  if (!config.enableWriteSync && config.enableInlinePhotoSync) {
    fail(
      'ENABLE_INLINE_PHOTO_SYNC=true requires ENABLE_WRITE_SYNC=true because inline photo is part of syncHarvestRecords.',
    );
  }

  if (config.enableWriteSync) {
    const rawTemplate = requireEnv('HARVEST_TEMPLATE_JSON');
    config.harvestRecordCount = parseHarvestRecordCount(
      optionalEnv('HARVEST_RECORD_COUNT') || getScenarioHarvestRecordCount(scenario),
    );
    config.harvestTemplate = parseJsonEnv(rawTemplate, 'HARVEST_TEMPLATE_JSON');
    validateHarvestTemplate(config.harvestTemplate);
  }

  if (config.enableInlinePhotoSync) {
    if (!config.photoDataUri) {
      fail(
        'PHOTO_DATA_URI is required when ENABLE_INLINE_PHOTO_SYNC=true.',
      );
    }
    if (config.photoDataUri.indexOf('data:image/') !== 0) {
      fail(
        'PHOTO_DATA_URI must start with "data:image/" when ENABLE_INLINE_PHOTO_SYNC=true.',
      );
    }
  }

  return config;
}

function loginMandor(config) {
  const variables = {
    input: {
      identifier: config.identifier,
      password: config.password,
      platform: config.platform,
      deviceId: getVuScopedValue(config.deviceId),
      deviceFingerprint: getVuScopedValue(config.deviceFingerprint),
    },
  };

  const result = graphqlRequest(
    config.baseUrl,
    MOBILE_LOGIN_MUTATION,
    variables,
    null,
    {
      operation: 'mobileLogin',
      step: 'mandor_login',
    },
  );
  graphqlMobileLogin.add(result.response.timings.duration);

  if (!assertGraphQLSuccess(result, 'mobileLogin')) {
    graphqlAuthFailures.add(1);
    return null;
  }

  const payload = result.body.data.mobileLogin;
  const loginOk = check(payload, {
    'mobileLogin token exists': function (data) {
      return !!(data && normalizeString(data.accessToken));
    },
    'mobileLogin user id exists': function (data) {
      return !!(data && data.user && normalizeString(data.user.id));
    },
  });

  if (!loginOk) {
    graphqlAuthFailures.add(1);
    return null;
  }

  return {
    token: payload.accessToken,
    userId: payload.user.id,
    assignments: payload.assignments || {},
  };
}

function runFullMasterSync(config, token, divisionId) {
  const assignmentsResult = graphqlRequest(
    config.baseUrl,
    MY_ASSIGNMENTS_QUERY,
    {},
    token,
    {
      operation: 'myAssignments',
      step: 'full_master_sync_assignments',
    },
  );
  graphqlMyAssignments.add(assignmentsResult.response.timings.duration);
  if (!assertGraphQLSuccess(assignmentsResult, 'myAssignments')) {
    graphqlMasterSyncFailures.add(1);
  } else {
    check(assignmentsResult.body.data.myAssignments, {
      'myAssignments payload shape valid': function (data) {
        return !!(
          data &&
          Array.isArray(data.companies) &&
          Array.isArray(data.estates) &&
          Array.isArray(data.divisions)
        );
      },
    });
  }

  const blocksResult = graphqlRequest(
    config.baseUrl,
    MANDOR_BLOCKS_QUERY,
    buildDivisionVariables(divisionId),
    token,
    {
      operation: 'mandorBlocks',
      step: 'full_master_sync_blocks',
    },
  );
  graphqlMandorBlocksFull.add(blocksResult.response.timings.duration);
  if (!assertGraphQLSuccess(blocksResult, 'mandorBlocks')) {
    graphqlMasterSyncFailures.add(1);
  } else {
    check(blocksResult.body.data.mandorBlocks, {
      'mandorBlocks payload is array': function (data) {
        return Array.isArray(data);
      },
    });
  }

  const employeesResult = graphqlRequest(
    config.baseUrl,
    MANDOR_EMPLOYEES_QUERY,
    buildEmployeeVariables(divisionId),
    token,
    {
      operation: 'mandorEmployees',
      step: 'full_master_sync_employees',
    },
  );
  graphqlMandorEmployeesFull.add(employeesResult.response.timings.duration);
  if (!assertGraphQLSuccess(employeesResult, 'mandorEmployees')) {
    graphqlMasterSyncFailures.add(1);
  } else {
    check(employeesResult.body.data.mandorEmployees, {
      'mandorEmployees payload is array': function (data) {
        return Array.isArray(data);
      },
    });
  }
}

function runIncrementalMasterSync(config, token, divisionId) {
  const divisionsResult = graphqlRequest(
    config.baseUrl,
    MANDOR_DIVISION_MASTERS_SYNC_QUERY,
    { updatedSince: config.updatedSince },
    token,
    {
      operation: 'mandorDivisionMastersSync',
      step: 'incremental_master_sync_divisions',
    },
  );
  graphqlMandorDivisionsIncremental.add(divisionsResult.response.timings.duration);
  if (!assertGraphQLSuccess(divisionsResult, 'mandorDivisionMastersSync')) {
    graphqlMasterSyncFailures.add(1);
  } else {
    check(divisionsResult.body.data.mandorDivisionMastersSync, {
      'mandorDivisionMastersSync payload shape valid': function (data) {
        return !!(
          data &&
          Array.isArray(data.companies) &&
          Array.isArray(data.estates) &&
          Array.isArray(data.divisions)
        );
      },
    });
  }

  const blocksResult = graphqlRequest(
    config.baseUrl,
    MANDOR_BLOCKS_SYNC_QUERY,
    {
      divisionId: divisionId,
      updatedSince: config.updatedSince,
    },
    token,
    {
      operation: 'mandorBlocksSync',
      step: 'incremental_master_sync_blocks',
    },
  );
  graphqlMandorBlocksIncremental.add(blocksResult.response.timings.duration);
  if (!assertGraphQLSuccess(blocksResult, 'mandorBlocksSync')) {
    graphqlMasterSyncFailures.add(1);
  } else {
    check(blocksResult.body.data.mandorBlocksSync, {
      'mandorBlocksSync payload is array': function (data) {
        return Array.isArray(data);
      },
    });
  }

  const employeesResult = graphqlRequest(
    config.baseUrl,
    MANDOR_EMPLOYEES_SYNC_QUERY,
    {
      divisionId: divisionId,
      updatedSince: config.updatedSince,
    },
    token,
    {
      operation: 'mandorEmployeesSync',
      step: 'incremental_master_sync_employees',
    },
  );
  graphqlMandorEmployeesIncremental.add(
    employeesResult.response.timings.duration,
  );
  if (!assertGraphQLSuccess(employeesResult, 'mandorEmployeesSync')) {
    graphqlMasterSyncFailures.add(1);
  } else {
    check(employeesResult.body.data.mandorEmployeesSync, {
      'mandorEmployeesSync payload is array': function (data) {
        return Array.isArray(data);
      },
    });
  }
}

function runHarvestUploadMatrix(config, authContext, divisionId) {
  if (!config.enableWriteSync) {
    graphqlWriteSkippedTotal.add(1);
    return { didPushFreshHarvestData: false };
  }

  let didPushFreshHarvestData = runHarvestUploadRequest(
    config,
    authContext,
    divisionId,
    'no_photo',
  );

  if (config.photoUrlReference) {
    didPushFreshHarvestData =
      runHarvestUploadRequest(
        config,
        authContext,
        divisionId,
        'photo_reference',
      ) || didPushFreshHarvestData;
  }

  if (config.enableInlinePhotoSync) {
    didPushFreshHarvestData =
      runHarvestUploadRequest(
        config,
        authContext,
        divisionId,
        'photo_inline',
      ) || didPushFreshHarvestData;
  } else {
    graphqlInlinePhotoSkippedTotal.add(1);
  }

  return {
    didPushFreshHarvestData: didPushFreshHarvestData,
  };
}

function runHarvestUploadRequest(config, authContext, divisionId, mode) {
  const input = buildHarvestSyncInput(config, authContext, divisionId, mode);
  const result = graphqlRequest(
    config.baseUrl,
    SYNC_HARVEST_RECORDS_MUTATION,
    { input: input },
    authContext.token,
    {
      operation: 'syncHarvestRecords',
      step: 'harvest_upload_' + mode,
    },
  );

  recordHarvestMetric(mode, result.response.timings.duration);

  if (!assertGraphQLSuccess(result, 'syncHarvestRecords:' + mode)) {
    markHarvestFailure(mode);
    return false;
  }

  const payload = result.body.data.syncHarvestRecords;
  const payloadOk = check(payload, {
    ['syncHarvestRecords:' + mode + ' result shape valid']: function (data) {
      return !!(
        data &&
        typeof data.success === 'boolean' &&
        typeof data.recordsProcessed === 'number' &&
        typeof data.recordsSuccessful === 'number' &&
        typeof data.recordsFailed === 'number' &&
        Array.isArray(data.results)
      );
    },
  });

  if (!payloadOk) {
    markHarvestFailure(mode);
    return false;
  }

  const businessSuccess =
    payload.success === true &&
    payload.recordsFailed === 0 &&
    payload.results.every(function (item) {
      return item && item.success === true;
    });

  check(payload, {
    ['syncHarvestRecords:' + mode + ' business success']: function () {
      return businessSuccess;
    },
  });

  if (!businessSuccess) {
    if (
      optionalEnv('DEBUG_HARVEST_FAILURES') === 'true' &&
      !hasLoggedHarvestBusinessFailure
    ) {
      const firstFailedItem = payload.results.find(function (item) {
        return item && item.success !== true;
      });
      console.log(
        '[harvest-business-failure][' +
          mode +
          '][vu=' +
          __VU +
          '][iter=' +
          __ITER +
          '] ' +
          JSON.stringify({
            message: payload.message,
            recordsProcessed: payload.recordsProcessed,
            recordsSuccessful: payload.recordsSuccessful,
            recordsFailed: payload.recordsFailed,
            firstFailedResult: firstFailedItem || null,
          }),
      );
      hasLoggedHarvestBusinessFailure = true;
    }
    markHarvestFailure(mode);
  }

  return businessSuccess && payload.recordsSuccessful > 0;
}

function runPullServerUpdates(config, token) {
  const result = graphqlRequest(
    config.baseUrl,
    MANDOR_SERVER_UPDATES_QUERY,
    {
      since: config.statusSince,
      deviceId: getVuScopedValue(config.deviceId),
    },
    token,
    {
      operation: 'mandorServerUpdates',
      step: 'pull_server_updates',
    },
  );
  graphqlMandorServerUpdates.add(result.response.timings.duration);

  if (!assertGraphQLSuccess(result, 'mandorServerUpdates')) {
    graphqlServerUpdateFailures.add(1);
    return;
  }

  check(result.body.data.mandorServerUpdates, {
    'mandorServerUpdates payload is array': function (data) {
      return Array.isArray(data);
    },
  });
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
  if (
    graphQLErrorCount > 0 &&
    optionalEnv('DEBUG_GRAPHQL_ERRORS') === 'true' &&
    result.body.errors[0]
  ) {
    console.log(
      '[graphql-error][' +
        stepName +
        '][vu=' +
        __VU +
        '][iter=' +
        __ITER +
        '] ' +
        JSON.stringify(result.body.errors[0]),
    );
  }

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
        return data.body !== null && data.body.data !== undefined;
      },
    },
  );

  if (!ok) {
    graphqlErrorsTotal.add(1);
  }

  return ok;
}

function pickDivisionId(preferredDivisionId, assignments) {
  if (preferredDivisionId) {
    return preferredDivisionId;
  }

  if (
    assignments &&
    Array.isArray(assignments.divisions) &&
    assignments.divisions.length > 0
  ) {
    const firstDivision = assignments.divisions[0];
    if (firstDivision && normalizeString(firstDivision.id)) {
      return normalizeString(firstDivision.id);
    }
  }

  return null;
}

function buildDivisionVariables(divisionId) {
  if (!divisionId) {
    return {};
  }
  return { divisionId: divisionId };
}

function buildEmployeeVariables(divisionId) {
  if (!divisionId) {
    return {};
  }
  return {
    divisionId: divisionId,
    search: null,
  };
}

function getVuScopedValue(baseValue) {
  const normalized = normalizeString(baseValue);
  if (!normalized) {
    return normalized;
  }
  return normalized + '-vu-' + __VU;
}

function getHarvestDateOffsetDays(mode) {
  if (mode === 'photo_reference') {
    return 1;
  }
  if (mode === 'photo_inline') {
    return 2;
  }
  return 0;
}

function getUniqueHarvestDateOffsetDays(config, mode, recordIndex) {
  const recordsPerMode = config.harvestRecordCount;
  const recordsPerIteration = recordsPerMode * 3;
  const modeOffsetDays = getHarvestDateOffsetDays(mode) * recordsPerMode;
  const rawIterationOffsetDays = __ITER * recordsPerIteration;
  const boundedIterationOffsetDays =
    rawIterationOffsetDays % SAFE_HARVEST_VU_WINDOW_DAYS;
  const vuOffsetDays = (__VU - 1) * SAFE_HARVEST_VU_WINDOW_DAYS;
  return (
    config.harvestRunDaySeed +
    vuOffsetDays +
    boundedIterationOffsetDays +
    modeOffsetDays +
    recordIndex
  );
}

function resolveSafeHarvestBaseDate(config, baseHarvestDate) {
  const maxProjectedOffsetDays =
    config.harvestRunDaySeed +
    SAFE_HARVEST_VU_WINDOW_DAYS * Math.max(config.maxVuSlots || 1, 1);
  const projectedDate = new Date(baseHarvestDate.getTime());
  projectedDate.setUTCDate(
    projectedDate.getUTCDate() + maxProjectedOffsetDays,
  );

  if (projectedDate.getUTCFullYear() <= MAX_SAFE_HARVEST_YEAR) {
    return new Date(baseHarvestDate.getTime());
  }

  return new Date(
    Date.UTC(
      SAFE_HARVEST_ANCHOR_YEAR,
      baseHarvestDate.getUTCMonth(),
      baseHarvestDate.getUTCDate(),
      baseHarvestDate.getUTCHours(),
      baseHarvestDate.getUTCMinutes(),
      baseHarvestDate.getUTCSeconds(),
      baseHarvestDate.getUTCMilliseconds(),
    ),
  );
}

function resolveHarvestRunDaySeed(rawValue) {
  if (!rawValue) {
    return (
      SAFE_HARVEST_RUN_BASE_OFFSET_DAYS +
      (Math.floor(Date.now() / 1000) % SAFE_HARVEST_RUN_SEED_WINDOW_DAYS)
    );
  }

  const parsed = Number.parseInt(String(rawValue), 10);
  if (
    Number.isNaN(parsed) ||
    parsed < 0 ||
    parsed >= SAFE_HARVEST_RUN_SEED_WINDOW_DAYS
  ) {
    fail(
      'HARVEST_RUN_DAY_SEED must be an integer between 0 and ' +
        (SAFE_HARVEST_RUN_SEED_WINDOW_DAYS - 1) +
        '.',
    );
  }

  return SAFE_HARVEST_RUN_BASE_OFFSET_DAYS + parsed;
}

function buildHarvestSyncInput(config, authContext, divisionId, mode) {
  const now = new Date();
  const suffix = __VU + '-' + __ITER + '-' + now.getTime();
  const requestedHarvestDate = normalizeString(config.harvestTemplate.tanggal)
    ? new Date(config.harvestTemplate.tanggal)
    : new Date(now.getTime());

  if (Number.isNaN(requestedHarvestDate.getTime())) {
    fail(
      'HARVEST_TEMPLATE_JSON field "tanggal" must be a valid ISO-8601 date/time string.',
    );
  }
  const harvestDate = resolveSafeHarvestBaseDate(config, requestedHarvestDate);
  const baseHarvestTimestampMs = harvestDate.getTime();
  const records = [];

  for (let recordIndex = 0; recordIndex < config.harvestRecordCount; recordIndex++) {
    const record = cloneJson(config.harvestTemplate);
    const recordDate = new Date(baseHarvestTimestampMs);

    record.localId = 'k6-' + mode + '-' + suffix + '-' + recordIndex;
    record.mandorId = authContext.userId;
    record.lastUpdated = now.toISOString();

    recordDate.setUTCDate(
      recordDate.getUTCDate() +
        getUniqueHarvestDateOffsetDays(config, mode, recordIndex),
    );
    record.tanggal = recordDate.toISOString();

    if (divisionId) {
      record.divisionId = divisionId;
    }

    if (mode === 'no_photo') {
      delete record.photoUrl;
    } else if (mode === 'photo_reference') {
      record.photoUrl = config.photoUrlReference;
    } else if (mode === 'photo_inline') {
      record.photoUrl = config.photoDataUri;
    }

    records.push(record);
  }

  return {
    deviceId: getVuScopedValue(config.deviceId),
    clientTimestamp: now.toISOString(),
    batchId: 'batch-' + mode + '-' + suffix,
    records: records,
  };
}

function validateHarvestTemplate(template) {
  const requiredFields = [
    'blockId',
    'karyawanId',
    'nik',
    'beratTbs',
    'jumlahJanjang',
    'status',
    'localVersion',
    'lastUpdated',
  ];

  if (!template || typeof template !== 'object' || Array.isArray(template)) {
    fail('HARVEST_TEMPLATE_JSON must decode to a JSON object.');
  }

  const missingFields = requiredFields.filter(function (field) {
    if (!(field in template)) {
      return true;
    }
    const value = template[field];
    if (typeof value === 'string') {
      return normalizeString(value) === '';
    }
    return value === null || value === undefined;
  });

  if (missingFields.length > 0) {
    fail(
      'HARVEST_TEMPLATE_JSON is missing required field(s): ' +
        missingFields.join(', '),
    );
  }
}

function recordHarvestMetric(mode, durationMs) {
  if (mode === 'photo_reference') {
    graphqlSyncHarvestRecordsPhotoReference.add(durationMs);
    return;
  }
  if (mode === 'photo_inline') {
    graphqlSyncHarvestRecordsPhotoInline.add(durationMs);
    return;
  }
  graphqlSyncHarvestRecordsNoPhoto.add(durationMs);
}

function markHarvestFailure(mode) {
  graphqlHarvestPushFailures.add(1);
  if (mode === 'photo_inline') {
    graphqlHarvestPhotoFailures.add(1);
  }
}

function requireEnv(key) {
  const value = optionalEnv(key);
  if (!value) {
    fail(key + ' is required.');
  }
  return value;
}

function optionalEnv(key) {
  return normalizeString(__ENV[key] || '');
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

function isTrueFlag(value) {
  return normalizeString(value).toLowerCase() === 'true';
}

function parseHarvestRecordCount(value) {
  const normalized = normalizeString(value);
  const parsed = Number.parseInt(normalized, 10);
  const allowedCounts = [1, 50, 100, 500, 1000];

  if (!Number.isInteger(parsed) || allowedCounts.indexOf(parsed) === -1) {
    fail(
      'HARVEST_RECORD_COUNT must be one of: ' + allowedCounts.join(', ') + '.',
    );
  }

  return parsed;
}

function getScenarioHarvestRecordCount(scenario) {
  switch (scenario) {
    case 'batch50':
      return '50';
    case 'batch100':
      return '100';
    case 'batch500':
      return '500';
    case 'batch1000':
      return '1000';
    default:
      return '1';
  }
}

function getScenarioMaxVuCount(scenario) {
  switch (scenario) {
    case 'smoke':
      return 1;
    case 'stress':
      return 25;
    case 'batch500':
      return 5;
    case 'batch1000':
      return 3;
    case 'batch50':
    case 'batch100':
    case 'load':
    default:
      return 10;
  }
}

function getHarvestThresholdProfile(scenario, harvestRecordCountEnv) {
  const requestedCount = normalizeString(harvestRecordCountEnv);
  const isBatch1000 = scenario === 'batch1000' || requestedCount === '1000';

  if (isBatch1000) {
    return {
      noPhotoP95Ms: 6500,
      photoReferenceP95Ms: 6500,
      photoInlineP95Ms: 6500,
    };
  }

  return {
    noPhotoP95Ms: 3500,
    photoReferenceP95Ms: 3500,
    photoInlineP95Ms: 5000,
  };
}

function parseJsonEnv(rawValue, key) {
  try {
    return JSON.parse(rawValue);
  } catch (error) {
    fail(key + ' must be valid JSON. Parsing failed: ' + error.message);
  }
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}
