import { useMutation, type MutationResult, type MutationHookOptions } from '@apollo/client/react';
import { useState, useCallback } from 'react';
import { handleGraphQLError } from '@/lib/apollo/error-handler';
import type { DocumentNode } from 'graphql';

export interface GraphQLMutationState {
  loading: boolean;
  error: string | null;
  validationErrors: Record<string, string[]> | null;
  shouldRetry: boolean;
  shouldRedirectToLogin: boolean;
}

export interface UseGraphQLMutationReturn<TData, TVariables> {
  mutate: (variables: TVariables) => Promise<TData | null>;
  state: GraphQLMutationState;
  reset: () => void;
  retry: () => Promise<TData | null>;
}

/**
 * Enhanced GraphQL mutation hook with error handling and state management
 */
export function useGraphQLMutation<TData = any, TVariables = any>(
  mutation: DocumentNode,
  options?: Omit<MutationHookOptions<TData, TVariables>, 'context'> & {
    errorContext?: string;
    onSuccess?: (data: TData) => void;
    onError?: (error: string, validationErrors?: Record<string, string[]>) => void;
  }
): UseGraphQLMutationReturn<TData, TVariables> {

  const [state, setState] = useState<GraphQLMutationState>({
    loading: false,
    error: null,
    validationErrors: null,
    shouldRetry: false,
    shouldRedirectToLogin: false,
  });

  const [lastVariables, setLastVariables] = useState<TVariables | null>(null);

  // Destructure custom options to avoid passing them to Apollo and causing type conflicts
  const { onError: customOnError, onSuccess: customOnSuccess, errorContext, ...apolloOptions } = options || {};

  const [mutateFunction] = useMutation<TData, TVariables>(mutation, {
    ...apolloOptions,
    onCompleted: undefined, // We'll handle this ourselves
    onError: undefined, // We'll handle this ourselves
  });

  const mutate = useCallback(async (variables: TVariables): Promise<TData | null> => {
    setState(prev => ({ ...prev, loading: true, error: null, validationErrors: null }));
    setLastVariables(variables);

    try {
      const result = await mutateFunction({
        variables,
        ...apolloOptions,
      });

      const data = result.data;

      if (data) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: null,
          validationErrors: null,
          shouldRetry: false,
          shouldRedirectToLogin: false,
        }));

        // Call success handler if provided
        if (customOnSuccess) {
          customOnSuccess(data);
        }

        // Call original onCompleted if provided (from apolloOptions)
        if (apolloOptions?.onCompleted) {
          apolloOptions.onCompleted(data);
        }

        return data;
      }

      // No data returned
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'No data returned from mutation',
        shouldRetry: false,
        shouldRedirectToLogin: false,
      }));

      if (customOnError) {
        customOnError('No data returned from mutation');
      }

      return null;
    } catch (apolloError: any) {
      const errorInfo = handleGraphQLError(apolloError, errorContext);

      setState(prev => ({
        ...prev,
        loading: false,
        error: errorInfo.message,
        validationErrors: errorInfo.validationErrors || null,
        shouldRetry: errorInfo.shouldRetry,
        shouldRedirectToLogin: errorInfo.shouldRedirectToLogin,
      }));

      // Call error handler if provided
      if (customOnError) {
        customOnError(errorInfo.message, errorInfo.validationErrors);
      }

      // Redirect to login if needed
      if (errorInfo.shouldRedirectToLogin && typeof window !== 'undefined') {
        console.warn('Authentication error detected, redirecting to login...');
        // You might want to clear auth state here
        window.location.href = '/login';
      }

      return null;
    }
  }, [mutateFunction, apolloOptions, customOnSuccess, customOnError, errorContext]);

  const reset = useCallback(() => {
    setState({
      loading: false,
      error: null,
      validationErrors: null,
      shouldRetry: false,
      shouldRedirectToLogin: false,
    });
    setLastVariables(null);
  }, []);

  const retry = useCallback(async (): Promise<TData | null> => {
    if (!lastVariables) {
      console.warn('No previous variables found for retry');
      return null;
    }
    return mutate(lastVariables);
  }, [mutate, lastVariables]);

  return {
    mutate,
    state,
    reset,
    retry,
  };
}

export default useGraphQLMutation;