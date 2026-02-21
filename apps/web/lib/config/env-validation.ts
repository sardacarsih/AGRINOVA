export interface EnvValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate environment variables for GraphQL configuration
 * @param isClientSide Whether validation is running on client side
 * @returns Validation result with errors and warnings
 */
export function validateEnvironment(isClientSide = true): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate GraphQL URL
  const graphqlUrl = process.env.NEXT_PUBLIC_GRAPHQL_URL;
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL;
  const backendUrl = isClientSide ? undefined : process.env.BACKEND_GRAPHQL_URL;

  // Critical: GraphQL URL must be set
  if (!graphqlUrl) {
    errors.push('NEXT_PUBLIC_GRAPHQL_URL is not set');
  } else {
    // Check for common misconfigurations
    if (graphqlUrl.includes('/query')) {
      errors.push('NEXT_PUBLIC_GRAPHQL_URL uses /query but backend serves at /graphql');
    }
    if (!graphqlUrl.includes('/graphql')) {
      warnings.push('NEXT_PUBLIC_GRAPHQL_URL should include /graphql endpoint');
    }
    if (!graphqlUrl.startsWith('http://') && !graphqlUrl.startsWith('https://')) {
      errors.push('NEXT_PUBLIC_GRAPHQL_URL must start with http:// or https://');
    }
  }

  // Validate WebSocket URL
  if (!wsUrl) {
    warnings.push('NEXT_PUBLIC_WS_URL is not set - WebSocket subscriptions will not work');
  } else {
    if (wsUrl.includes(':8081')) {
      errors.push('WebSocket port is 8081 but backend runs on 8080');
    }
    if (wsUrl.includes('/query')) {
      errors.push('NEXT_PUBLIC_WS_URL uses /query but backend serves at /graphql');
    }
    if (!wsUrl.startsWith('ws://') && !wsUrl.startsWith('wss://')) {
      errors.push('NEXT_PUBLIC_WS_URL must start with ws:// or wss://');
    }
  }

  // Validate backend URL (for SSR) - only check on server-side
  if (!isClientSide) {
    if (!backendUrl) {
      warnings.push('BACKEND_GRAPHQL_URL is not set - SSR GraphQL calls may fail');
    } else {
      if (backendUrl.includes('/query')) {
        warnings.push('BACKEND_GRAPHQL_URL uses /query but backend serves at /graphql');
      }
    }
  }

  // Check for port consistency
  if (graphqlUrl && wsUrl) {
    const httpPort = graphqlUrl.match(/:(\d+)\//)?.[1];
    const wsPort = wsUrl.match(/:(\d+)\//)?.[1];

    if (httpPort && wsPort && httpPort !== wsPort) {
      errors.push(`Port mismatch: HTTP uses ${httpPort} but WebSocket uses ${wsPort}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Log environment validation results to console
 * Call this on app startup to catch configuration issues early
 * @param isClientSide Whether validation is running on client side
 */
export function logEnvironmentValidation(isClientSide = true): void {
  console.log('=== Environment Validation ===');
  console.log('Environment:', isClientSide ? 'Client-side' : 'Server-side');
  console.log('NEXT_PUBLIC_GRAPHQL_URL:', process.env.NEXT_PUBLIC_GRAPHQL_URL || '❌ NOT SET');
  console.log('NEXT_PUBLIC_WS_URL:', process.env.NEXT_PUBLIC_WS_URL || '⚠️ NOT SET');

  if (isClientSide) {
    console.log('BACKEND_GRAPHQL_URL:', '⚠️ NOT AVAILABLE (Server-side variable only)');
  } else {
    console.log('BACKEND_GRAPHQL_URL:', process.env.BACKEND_GRAPHQL_URL || '❌ NOT SET');
  }

  console.log('NODE_ENV:', process.env.NODE_ENV);

  const result = validateEnvironment(isClientSide);

  if (!result.valid) {
    console.error('❌ Configuration Errors:', result.errors);
  }

  if (result.warnings.length > 0) {
    console.warn('⚠️ Configuration Warnings:', result.warnings);
  }

  if (result.valid && result.warnings.length === 0) {
    console.log('✅ All environment variables configured correctly');
  }

  console.log('==============================');
}

/**
 * Throw an error if environment validation fails
 * Use this in critical paths where misconfiguration should prevent startup
 * @param isClientSide Whether validation is running on client side
 */
export function requireValidEnvironment(isClientSide = true): void {
  const result = validateEnvironment(isClientSide);

  if (!result.valid) {
    const errorMessage = `Environment validation failed:\n${result.errors.join('\n')}`;
    console.error('❌ FATAL:', errorMessage);
    throw new Error(errorMessage);
  }
}
