'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useMemo, useEffect } from 'react';

import { ThemeProvider } from '@/components/providers/theme-provider';
import { PureWebSocketProvider } from '@/lib/socket/pure-websocket-provider';
import { AuthProvider, useAuth } from '@/lib/auth/auth-provider';
import { NotificationProvider } from '@/lib/notifications/notification-provider';
import { GraphQLProvider } from '@/lib/apollo/provider';
import { LanguageProviderWrapper } from '@/components/providers/LanguageProviderWrapper';
import { RealtimeNotifications } from '@/components/notifications/realtime-notifications';
import { logEnvironmentValidation } from '@/lib/config/env-validation';
import { CompanyScopeProvider } from '@/contexts/company-scope-context';

function RoleAwareWebSocketProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();

  const enableWebSocket =
    !isLoading &&
    isAuthenticated &&
    user?.role !== 'SUPER_ADMIN';

  if (!enableWebSocket) {
    return <>{children}</>;
  }

  return <PureWebSocketProvider>{children}</PureWebSocketProvider>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  // Run environment validation on app startup (development only)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      logEnvironmentValidation();
    }
  }, []);
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            gcTime: 5 * 60 * 1000, // 5 minutes (was cacheTime)
            retry: 3,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
            refetchOnWindowFocus: false,
            // Basic performance optimizations
            networkMode: 'online', // Skip queries when offline
            refetchOnReconnect: 'always', // Refetch when connection restored
          },
          mutations: {
            retry: 1,
            networkMode: 'online', // Skip mutations when offline
          },
        },
      })
  );

  // Memoize provider stack to prevent unnecessary re-renders
  const providerStack = useMemo(() => (
    <ThemeProvider>
      <LanguageProviderWrapper>
        <QueryClientProvider client={queryClient}>
          <GraphQLProvider>
            <AuthProvider>
              <CompanyScopeProvider>
                <RoleAwareWebSocketProvider>
                  <NotificationProvider>
                    {children}
                    <RealtimeNotifications />
                  </NotificationProvider>
                </RoleAwareWebSocketProvider>
              </CompanyScopeProvider>
            </AuthProvider>
          </GraphQLProvider>
        </QueryClientProvider>
      </LanguageProviderWrapper>
    </ThemeProvider>
  ), [queryClient, children]);

  return providerStack;
}
