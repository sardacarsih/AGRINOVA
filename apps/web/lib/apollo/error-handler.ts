import { ApolloError } from '@apollo/client/errors';
import { GraphQLError } from 'graphql';

// Local type definitions for network error types
interface ServerError extends Error {
  result: Record<string, unknown>;
  statusCode: number;
}

interface ServerParseError extends Error {
  response: Response;
  bodyText: string;
  statusCode: number;
}

export interface GraphQLErrorInfo {
  type: 'network' | 'graphql' | 'server' | 'authentication' | 'validation' | 'unknown';
  message: string;
  code?: string;
  field?: string;
  statusCode?: number;
  originalError?: any;
}

/**
 * Parse Apollo GraphQL errors into a structured format
 */
export function parseGraphQLError(error: ApolloError): GraphQLErrorInfo[] {
  const errors: GraphQLErrorInfo[] = [];

  // Handle GraphQL errors
  if (error.graphQLErrors && error.graphQLErrors.length > 0) {
    error.graphQLErrors.forEach((graphQLError: GraphQLError) => {
      const extensions = graphQLError.extensions || {};
      
      errors.push({
        type: getErrorType(extensions.code as string),
        message: graphQLError.message,
        code: extensions.code as string,
        field: extensions.field as string,
        originalError: graphQLError
      });
    });
  }

  // Handle network errors
  if (error.networkError) {
    const networkError = error.networkError;

    if ('statusCode' in networkError) {
      const serverError = networkError as unknown as ServerError;
      errors.push({
        type: getNetworkErrorType(serverError.statusCode),
        message: getNetworkErrorMessage(serverError.statusCode),
        statusCode: serverError.statusCode,
        originalError: networkError
      });
    } else if ('parseError' in networkError) {
      const parseError = networkError as unknown as ServerParseError;
      errors.push({
        type: 'server',
        message: 'Server response could not be parsed',
        statusCode: parseError.statusCode,
        originalError: networkError
      });
    } else {
      errors.push({
        type: 'network',
        message: networkError.message || 'Network error occurred',
        originalError: networkError
      });
    }
  }

  // If no specific errors found, create a generic one
  if (errors.length === 0) {
    errors.push({
      type: 'unknown',
      message: error.message || 'An unknown error occurred',
      originalError: error
    });
  }

  return errors;
}

/**
 * Determine error type based on GraphQL error code
 */
function getErrorType(code: string): GraphQLErrorInfo['type'] {
  if (!code) return 'graphql';

  const codeUpper = code.toUpperCase();
  
  if (codeUpper.includes('AUTH') || codeUpper.includes('UNAUTHORIZED') || codeUpper.includes('FORBIDDEN')) {
    return 'authentication';
  }
  
  if (codeUpper.includes('VALIDATION') || codeUpper.includes('INPUT') || codeUpper.includes('INVALID')) {
    return 'validation';
  }
  
  if (codeUpper.includes('SERVER') || codeUpper.includes('INTERNAL')) {
    return 'server';
  }
  
  if (codeUpper.includes('NETWORK')) {
    return 'network';
  }

  return 'graphql';
}

/**
 * Determine error type based on HTTP status code
 */
function getNetworkErrorType(statusCode: number): GraphQLErrorInfo['type'] {
  if (statusCode === 401 || statusCode === 403) {
    return 'authentication';
  }
  
  if (statusCode >= 400 && statusCode < 500) {
    return 'validation';
  }
  
  if (statusCode >= 500) {
    return 'server';
  }

  return 'network';
}

/**
 * Get user-friendly error message based on HTTP status code
 */
function getNetworkErrorMessage(statusCode: number): string {
  switch (statusCode) {
    case 400:
      return 'Bad request. Please check your input and try again.';
    case 401:
      return 'You are not authenticated. Please log in and try again.';
    case 403:
      return 'You do not have permission to perform this action.';
    case 404:
      return 'The requested resource was not found.';
    case 408:
      return 'Request timeout. Please try again.';
    case 429:
      return 'Too many requests. Please wait a moment and try again.';
    case 500:
      return 'Internal server error. Please try again later.';
    case 502:
      return 'Bad gateway. The server is temporarily unavailable.';
    case 503:
      return 'Service unavailable. Please try again later.';
    case 504:
      return 'Gateway timeout. The server took too long to respond.';
    default:
      return `Network error (${statusCode}). Please try again.`;
  }
}

/**
 * Create user-friendly error message from parsed errors
 */
export function formatErrorMessage(errors: GraphQLErrorInfo[]): string {
  if (errors.length === 0) {
    return 'An unknown error occurred';
  }

  if (errors.length === 1) {
    return errors[0].message;
  }

  // Group errors by type
  const authErrors = errors.filter(e => e.type === 'authentication');
  const validationErrors = errors.filter(e => e.type === 'validation');
  const serverErrors = errors.filter(e => e.type === 'server');
  const networkErrors = errors.filter(e => e.type === 'network');

  // Prioritize error types
  if (authErrors.length > 0) {
    return authErrors[0].message;
  }

  if (serverErrors.length > 0) {
    return serverErrors[0].message;
  }

  if (networkErrors.length > 0) {
    return networkErrors[0].message;
  }

  if (validationErrors.length > 0) {
    if (validationErrors.length === 1) {
      return validationErrors[0].message;
    }
    return `Please fix the following errors: ${validationErrors.map(e => e.message).join(', ')}`;
  }

  return errors[0].message;
}

/**
 * Get validation errors by field
 */
export function getValidationErrors(errors: GraphQLErrorInfo[]): Record<string, string[]> {
  const validationErrors: Record<string, string[]> = {};

  errors
    .filter(error => error.type === 'validation' && error.field)
    .forEach(error => {
      if (!validationErrors[error.field!]) {
        validationErrors[error.field!] = [];
      }
      validationErrors[error.field!].push(error.message);
    });

  return validationErrors;
}

/**
 * Check if error indicates authentication failure
 */
export function isAuthenticationError(error: ApolloError): boolean {
  const parsed = parseGraphQLError(error);
  return parsed.some(e => e.type === 'authentication');
}

/**
 * Check if error indicates server/network issues
 */
export function isServerError(error: ApolloError): boolean {
  const parsed = parseGraphQLError(error);
  return parsed.some(e => e.type === 'server' || e.type === 'network');
}

/**
 * Check if error indicates validation issues
 */
export function isValidationError(error: ApolloError): boolean {
  const parsed = parseGraphQLError(error);
  return parsed.some(e => e.type === 'validation');
}

/**
 * Handle common GraphQL error scenarios
 */
export function handleGraphQLError(error: ApolloError, context?: string): {
  message: string;
  shouldRetry: boolean;
  shouldRedirectToLogin: boolean;
  validationErrors?: Record<string, string[]>;
} {
  const parsedErrors = parseGraphQLError(error);
  const message = formatErrorMessage(parsedErrors);
  const isAuth = isAuthenticationError(error);
  const isServer = isServerError(error);
  const isValidation = isValidationError(error);

  console.error(`GraphQL Error${context ? ` in ${context}` : ''}:`, {
    message,
    errors: parsedErrors,
    originalError: error
  });

  return {
    message,
    shouldRetry: isServer && !isAuth, // Retry server errors but not auth errors
    shouldRedirectToLogin: isAuth,
    validationErrors: isValidation ? getValidationErrors(parsedErrors) : undefined
  };
}

export default {
  parseGraphQLError,
  formatErrorMessage,
  getValidationErrors,
  isAuthenticationError,
  isServerError,
  isValidationError,
  handleGraphQLError
};