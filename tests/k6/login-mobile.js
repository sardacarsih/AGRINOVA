import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

const mobileLoginDuration = new Trend('mobile_login_duration', true);
const mobileMeDuration = new Trend('mobile_me_duration', true);
const mobileLoginSuccessRate = new Rate('mobile_login_success_rate');
const mobileTokenSuccessRate = new Rate('mobile_token_success_rate');
const mobileHttpFailures = new Counter('mobile_login_http_failures');

const MOBILE_LOGIN_MUTATION = `
  mutation MobileLogin($input: MobileLoginInput!) {
    mobileLogin(input: $input) {
      accessToken
      refreshToken
      offlineToken
      tokenType
      expiresIn
      expiresAt
      user {
        id
        username
        role
      }
      assignments {
        companies {
          id
          name
        }
      }
    }
  }
`;

const ME_QUERY = `
  query Me {
    me {
      id
      username
      role
      isActive
    }
  }
`;

const DEFAULT_MOBILE_USER_POOL = [
  'areamanager',
  'manager',
  'asisten',
  'mandor',
  'satpam',
];

const BASE_URL = (__ENV.BASE_URL || 'http://localhost:8080').replace(/\/$/, '');
const GRAPHQL_PATH = __ENV.GRAPHQL_PATH || '/graphql';
const IDENTIFIER = (__ENV.MOBILE_USER || '').trim();
const PASSWORD = __ENV.MOBILE_PASS || '';
const USER_POOL = (__ENV.MOBILE_USER_POOL || DEFAULT_MOBILE_USER_POOL.join(','))
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const POOL_PASSWORD = __ENV.MOBILE_POOL_PASS || __ENV.MOBILE_PASS || 'demo123';
const PLATFORM = (__ENV.MOBILE_PLATFORM || 'ANDROID').toUpperCase();
const DEVICE_ID_PREFIX = __ENV.MOBILE_DEVICE_ID_PREFIX || 'k6-device';
const DEBUG_USERS = (__ENV.MOBILE_DEBUG_USERS || 'false').toLowerCase() === 'true';
const VERIFY_TOKEN = (__ENV.MOBILE_VERIFY_TOKEN || 'true').toLowerCase() !== 'false';
const SLEEP_SECONDS = Number(__ENV.MOBILE_SLEEP_SECONDS || 1);
let loggedVuAssignment = false;

export const options = {
  scenarios: {
    mobile_login: {
      executor: 'ramping-vus',
      stages: [
        { duration: '30s', target: 5 },
        { duration: '1m', target: 5 },
        { duration: '15s', target: 0 },
      ],
      gracefulRampDown: '5s',
    },
  },
  thresholds: {
    mobile_login_duration: ['p(95)<1000'],
    mobile_login_success_rate: ['rate>0.99'],
    mobile_token_success_rate: ['rate>0.99'],
    mobile_login_http_failures: ['count<1'],
  },
};

function graphqlUrl() {
  return `${BASE_URL}${GRAPHQL_PATH.startsWith('/') ? GRAPHQL_PATH : `/${GRAPHQL_PATH}`}`;
}

function parseJsonResponse(response) {
  try {
    return response.json();
  } catch (_error) {
    return null;
  }
}

function debugLog(message) {
  if (DEBUG_USERS) {
    console.log(message);
  }
}

function recordHttpFailure(response, tags = {}) {
  if (!response || response.error || response.status === 0 || response.status >= 400) {
    mobileHttpFailures.add(1, tags);
  }
}

function requireCredentials() {
  if (IDENTIFIER) {
    if (!PASSWORD) {
      throw new Error('MOBILE_PASS must be set when MOBILE_USER is provided.');
    }
    return;
  }

  if (USER_POOL.length === 0) {
    throw new Error('MOBILE_USER_POOL must contain at least one user when MOBILE_USER is not provided.');
  }

  if (!POOL_PASSWORD) {
    throw new Error('MOBILE_POOL_PASS must be set when using MOBILE_USER_POOL.');
  }
}

function buildDeviceId(credentials, suffix = `${__VU}-${__ITER}`) {
  return `${DEVICE_ID_PREFIX}-${credentials.identifier}-${suffix}`;
}

function configuredCredentials() {
  if (IDENTIFIER) {
    return [{ identifier: IDENTIFIER, password: PASSWORD }];
  }

  return USER_POOL.map((identifier) => ({
    identifier,
    password: POOL_PASSWORD,
  }));
}

function validateCredentials(url, credentials) {
  const probeDeviceId = buildDeviceId(credentials, 'setup');
  const response = http.post(
    url,
    JSON.stringify({
      query: MOBILE_LOGIN_MUTATION,
      variables: {
        input: {
          identifier: credentials.identifier,
          password: credentials.password,
          platform: PLATFORM,
          deviceId: probeDeviceId,
          deviceFingerprint: `fingerprint-${probeDeviceId}`,
        },
      },
    }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { endpoint: 'mobileLoginSetup', user: credentials.identifier },
    }
  );

  const body = parseJsonResponse(response);
  return response.status === 200 && !body?.errors && !!body?.data?.mobileLogin?.accessToken;
}

export function setup() {
  const url = graphqlUrl();
  const validUsers = configuredCredentials().filter((credentials) => {
    const valid = validateCredentials(url, credentials);
    if (!valid) {
      console.warn(`Skipping invalid mobile login test credential: ${credentials.identifier}`);
    }
    return valid;
  });

  if (validUsers.length === 0) {
    throw new Error('No valid mobile login credentials available for the configured test pool.');
  }

  debugLog(`Validated mobile login users: ${validUsers.map((user) => user.identifier).join(', ')}`);

  return { users: validUsers };
}

function resolveCredentials(setupData) {
  const users = setupData?.users?.length ? setupData.users : configuredCredentials();
  const poolIndex = Math.max(__VU - 1, 0) % users.length;
  return users[poolIndex];
}

requireCredentials();

export default function (setupData) {
  const credentials = resolveCredentials(setupData);
  const metricTags = { user: credentials.identifier };
  if (DEBUG_USERS && !loggedVuAssignment) {
    debugLog(`VU ${__VU} uses ${credentials.identifier}`);
    loggedVuAssignment = true;
  }

  const url = graphqlUrl();
  const deviceId = buildDeviceId(credentials);
  const loginResponse = http.post(
    url,
    JSON.stringify({
      query: MOBILE_LOGIN_MUTATION,
      variables: {
        input: {
          identifier: credentials.identifier,
          password: credentials.password,
          platform: PLATFORM,
          deviceId,
          deviceFingerprint: `fingerprint-${deviceId}`,
        },
      },
    }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { endpoint: 'mobileLogin', ...metricTags },
    }
  );

  mobileLoginDuration.add(loginResponse.timings.duration, metricTags);
  recordHttpFailure(loginResponse, { endpoint: 'mobileLogin', ...metricTags });

  const loginBody = parseJsonResponse(loginResponse);
  const accessToken = loginBody?.data?.mobileLogin?.accessToken;
  const loginPassed = check(loginResponse, {
    'mobile login http 200': (res) => res.status === 200,
    'mobile login json body': () => loginBody !== null,
    'mobile login no graphql errors': () => !loginBody || !loginBody.errors,
    'mobile login access token returned': () => !!accessToken,
    'mobile login user returned': () => !!loginBody?.data?.mobileLogin?.user?.username,
  });

  mobileLoginSuccessRate.add(loginPassed ? 1 : 0, metricTags);
  if (DEBUG_USERS && !loginPassed) {
    debugLog(`Mobile login failed for ${credentials.identifier}: status=${loginResponse.status} body=${JSON.stringify(loginBody)}`);
  }

  if (VERIFY_TOKEN && loginPassed && accessToken) {
    const meResponse = http.post(
      url,
      JSON.stringify({ query: ME_QUERY }),
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        tags: { endpoint: 'me', ...metricTags },
      }
    );

    mobileMeDuration.add(meResponse.timings.duration, metricTags);
    recordHttpFailure(meResponse, { endpoint: 'me', ...metricTags });

    const meBody = parseJsonResponse(meResponse);
    const tokenPassed = check(meResponse, {
      'mobile me http 200': (res) => res.status === 200,
      'mobile me json body': () => meBody !== null,
      'mobile me no graphql errors': () => !meBody || !meBody.errors,
      'mobile me payload returned': () => !!meBody?.data?.me?.username,
    });

    mobileTokenSuccessRate.add(tokenPassed ? 1 : 0, metricTags);
    if (DEBUG_USERS && !tokenPassed) {
      debugLog(`Mobile me failed for ${credentials.identifier}: status=${meResponse.status} body=${JSON.stringify(meBody)}`);
    }
  } else if (!VERIFY_TOKEN) {
    mobileTokenSuccessRate.add(1, metricTags);
  } else {
    mobileTokenSuccessRate.add(0, metricTags);
  }

  sleep(SLEEP_SECONDS);
}
