import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

const webLoginDuration = new Trend('web_login_duration', true);
const webCurrentUserDuration = new Trend('web_current_user_duration', true);
const webLoginSuccessRate = new Rate('web_login_success_rate');
const webSessionSuccessRate = new Rate('web_session_success_rate');
const webHttpFailures = new Counter('web_login_http_failures');

const WEB_LOGIN_MUTATION = `
  mutation WebLogin($input: WebLoginInput!) {
    webLogin(input: $input) {
      success
      message
      sessionId
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

const CURRENT_USER_QUERY = `
  query CurrentUser {
    currentUser {
      success
      sessionId
      message
      user {
        id
        username
        role
      }
    }
  }
`;

const DEFAULT_WEB_USER_POOL = [
  'superadmin',
  'companyadmin',
  'areamanager',
  'manager',
  'asisten',
  'mandor',
  'satpam',
];

const BASE_URL = (__ENV.BASE_URL || 'http://localhost:8080').replace(/\/$/, '');
const GRAPHQL_PATH = __ENV.GRAPHQL_PATH || '/graphql';
const IDENTIFIER = (__ENV.WEB_USER || '').trim();
const PASSWORD = __ENV.WEB_PASS || '';
const USER_POOL = (__ENV.WEB_USER_POOL || DEFAULT_WEB_USER_POOL.join(','))
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const POOL_PASSWORD = __ENV.WEB_POOL_PASS || __ENV.WEB_PASS || 'demo123';
const DEBUG_USERS = (__ENV.WEB_DEBUG_USERS || 'false').toLowerCase() === 'true';
const VERIFY_SESSION = (__ENV.WEB_VERIFY_SESSION || 'true').toLowerCase() !== 'false';
const SLEEP_SECONDS = Number(__ENV.WEB_SLEEP_SECONDS || 1);
let loggedVuAssignment = false;

export const options = {
  scenarios: {
    web_login: {
      executor: 'ramping-vus',
      stages: [
        { duration: '30s', target: 7 },
        { duration: '1m', target: 7 },
        { duration: '15s', target: 0 },
      ],
      gracefulRampDown: '5s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.05'],
    checks: ['rate>0.95'],
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
    webHttpFailures.add(1, tags);
  }
}

function requireCredentials() {
  if (IDENTIFIER) {
    if (!PASSWORD) {
      throw new Error('WEB_PASS must be set when WEB_USER is provided.');
    }
    return;
  }

  if (USER_POOL.length === 0) {
    throw new Error('WEB_USER_POOL must contain at least one user when WEB_USER is not provided.');
  }

  if (!POOL_PASSWORD) {
    throw new Error('WEB_POOL_PASS must be set when using WEB_USER_POOL.');
  }
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
  const response = http.post(
    url,
    JSON.stringify({
      query: WEB_LOGIN_MUTATION,
      variables: {
        input: {
          identifier: credentials.identifier,
          password: credentials.password,
        },
      },
    }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { endpoint: 'webLoginSetup', user: credentials.identifier },
    }
  );

  const body = parseJsonResponse(response);
  return response.status === 200 && !body?.errors && body?.data?.webLogin?.success === true;
}

export function setup() {
  const url = graphqlUrl();
  const validUsers = configuredCredentials().filter((credentials) => {
    const valid = validateCredentials(url, credentials);
    if (!valid) {
      console.warn(`Skipping invalid web login test credential: ${credentials.identifier}`);
    }
    return valid;
  });

  if (validUsers.length === 0) {
    throw new Error('No valid web login credentials available for the configured test pool.');
  }

  debugLog(`Validated web login users: ${validUsers.map((user) => user.identifier).join(', ')}`);

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
  const loginResponse = http.post(
    url,
    JSON.stringify({
      query: WEB_LOGIN_MUTATION,
      variables: {
        input: {
          identifier: credentials.identifier,
          password: credentials.password,
        },
      },
    }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { endpoint: 'webLogin', ...metricTags },
    }
  );

  webLoginDuration.add(loginResponse.timings.duration, metricTags);
  recordHttpFailure(loginResponse, { endpoint: 'webLogin', ...metricTags });

  const loginBody = parseJsonResponse(loginResponse);
  const loginPassed = check(loginResponse, {
    'web login http 200': (res) => res.status === 200,
    'web login json body': () => loginBody !== null,
    'web login no graphql errors': () => !loginBody || !loginBody.errors,
    'web login success true': () => loginBody?.data?.webLogin?.success === true,
    'web login user returned': () => !!loginBody?.data?.webLogin?.user?.username,
  });

  webLoginSuccessRate.add(loginPassed ? 1 : 0, metricTags);
  if (DEBUG_USERS && !loginPassed) {
    debugLog(`Login failed for ${credentials.identifier}: status=${loginResponse.status} body=${JSON.stringify(loginBody)}`);
  }

  if (VERIFY_SESSION && loginPassed) {
    const jar = http.cookieJar();
    const cookies = jar.cookiesForURL(url);
    const hasCookies = Object.keys(cookies).length > 0;

    const currentUserResponse = http.post(
      url,
      JSON.stringify({ query: CURRENT_USER_QUERY }),
      {
        headers: { 'Content-Type': 'application/json' },
        tags: { endpoint: 'currentUser', ...metricTags },
      }
    );

    webCurrentUserDuration.add(currentUserResponse.timings.duration, metricTags);
    recordHttpFailure(currentUserResponse, { endpoint: 'currentUser', ...metricTags });

    const currentUserBody = parseJsonResponse(currentUserResponse);
    const sessionPassed = check(currentUserResponse, {
      'web session cookie captured': () => hasCookies,
      'current user http 200': (res) => res.status === 200,
      'current user json body': () => currentUserBody !== null,
      'current user no graphql errors': () => !currentUserBody || !currentUserBody.errors,
      'current user success true': () => currentUserBody?.data?.currentUser?.success === true,
      'current user payload returned': () => !!currentUserBody?.data?.currentUser?.user?.username,
    });

    webSessionSuccessRate.add(sessionPassed ? 1 : 0, metricTags);
    if (DEBUG_USERS && !sessionPassed) {
      debugLog(`CurrentUser failed for ${credentials.identifier}: status=${currentUserResponse.status} body=${JSON.stringify(currentUserBody)}`);
    }
  } else if (!VERIFY_SESSION) {
    webSessionSuccessRate.add(1, metricTags);
  } else {
    webSessionSuccessRate.add(0, metricTags);
  }

  sleep(SLEEP_SECONDS);
}
