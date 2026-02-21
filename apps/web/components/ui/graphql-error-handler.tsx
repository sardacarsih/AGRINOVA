'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CircleAlert, RefreshCw } from 'lucide-react';

// Type alias for Apollo error since ApolloError is not exported in v4
type ApolloError = any;

interface GraphQLErrorHandlerProps {
  error: ApolloError;
  onRetry?: () => void;
  title?: string;
  description?: string;
  className?: string;
  showDebugInfo?: boolean;
}

export function GraphQLErrorHandler({ 
  error, 
  onRetry, 
  title,
  description,
  className = '',
  showDebugInfo = process.env.NODE_ENV === 'development'
}: GraphQLErrorHandlerProps) {
  const isAuthError = error.message.includes('authentication required') ||
                     error.message.includes('authentication') ||
                     error.message.includes('unauthorized') ||
                     error.graphQLErrors?.some(e =>
                       e.message.includes('authentication required') ||
                       e.message.includes('authentication') ||
                       e.message.includes('unauthorized') ||
                       e.extensions?.code === 'UNAUTHENTICATED'
                     );

  const defaultTitle = isAuthError ? 'Masalah Autentikasi' : 'Gagal Memuat Data';
  const displayTitle = title || defaultTitle;

  const getDefaultDescription = () => {
    if (description) return description;
    if (isAuthError) {
      return 'Sesi login Anda mungkin telah berakhir. Silakan refresh halaman atau login ulang.';
    }
    return `Error: ${error.message}`;
  };

  return (
    <Alert variant="destructive" className={className}>
      <CircleAlert className="h-4 w-4" />
      <AlertDescription>
        <div className="space-y-3">
          <div>
            <p className="font-medium">{displayTitle}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {getDefaultDescription()}
            </p>
          </div>
          
          <div className="flex gap-2">
            {onRetry && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={onRetry}
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Coba Lagi
              </Button>
            )}
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.location.reload()}
            >
              Refresh Halaman
            </Button>
            {isAuthError && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.location.href = '/login'}
              >
                Login Ulang
              </Button>
            )}
          </div>

          {/* Debug information for development */}
          {showDebugInfo && (
            <details className="mt-4">
              <summary className="text-xs cursor-pointer text-muted-foreground">
                Debug Info (Development Only)
              </summary>
              <pre className="text-xs bg-gray-100 p-2 mt-2 rounded overflow-auto max-h-32">
                {JSON.stringify(error, null, 2)}
              </pre>
            </details>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}

interface GraphQLErrorWrapperProps {
  error: ApolloError;
  onRetry?: () => void;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  showDebugInfo?: boolean;
}

export function GraphQLErrorWrapper({ 
  error, 
  onRetry, 
  title, 
  description,
  children,
  showDebugInfo
}: GraphQLErrorWrapperProps) {
  return (
    <div className="py-8">
      <GraphQLErrorHandler 
        error={error}
        onRetry={onRetry}
        title={title}
        description={description}
        showDebugInfo={showDebugInfo}
      />
      {children}
    </div>
  );
}