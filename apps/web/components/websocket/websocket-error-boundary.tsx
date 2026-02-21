'use client';

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Wifi, WifiOff, Info, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface WebSocketErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: any;
  retryCount: number;
  isRetrying: boolean;
  errorType: 'connection' | 'data' | 'auth' | 'unknown';
}

interface WebSocketErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  maxRetries?: number;
  onError?: (error: Error, errorInfo: any) => void;
  enableRetry?: boolean;
  showErrorDetails?: boolean;
}

export class WebSocketErrorBoundary extends Component<
  WebSocketErrorBoundaryProps,
  WebSocketErrorBoundaryState
> {
  private retryTimeouts: NodeJS.Timeout[] = [];

  constructor(props: WebSocketErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRetrying: false,
      errorType: 'unknown',
    };
  }

  static getDerivedStateFromError(error: Error): Partial<WebSocketErrorBoundaryState> {
    const errorType = WebSocketErrorBoundary.classifyError(error);
    return {
      hasError: true,
      error,
      errorType,
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    this.setState({ errorInfo });
    
    console.error('🚨 WebSocket Error Boundary caught error:', {
      error: error.message,
      stack: error.stack,
      errorInfo,
      component: errorInfo.componentStack,
    });

    // Report to error monitoring service
    this.reportError(error, errorInfo);

    // Call custom error handler
    this.props.onError?.(error, errorInfo);
  }

  private static classifyError(error: Error): 'connection' | 'data' | 'auth' | 'unknown' {
    const message = error.message.toLowerCase();
    
    if (message.includes('websocket') || message.includes('connection') || message.includes('network')) {
      return 'connection';
    }
    
    if (message.includes('unauthorized') || message.includes('auth') || message.includes('token')) {
      return 'auth';
    }
    
    if (message.includes('data') || message.includes('parse') || message.includes('json')) {
      return 'data';
    }
    
    return 'unknown';
  }

  private reportError(error: Error, errorInfo: any) {
    // In production, send to error monitoring service (Sentry, LogRocket, etc.)
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry.captureException(error, { extra: errorInfo });
      console.error('Production error reported:', { error, errorInfo });
    }
  }

  private handleRetry = async () => {
    const { maxRetries = 3 } = this.props;
    
    if (this.state.retryCount >= maxRetries) {
      console.log('🚫 WebSocket Error Boundary: Max retries reached, not retrying');
      return;
    }

    this.setState({ isRetrying: true });
    
    console.log(`🔄 WebSocket Error Boundary: Retry attempt ${this.state.retryCount + 1}/${maxRetries}`);

    // Progressive delay: 1s, 2s, 4s, etc.
    const delay = Math.min(1000 * Math.pow(2, this.state.retryCount), 10000);
    
    const timeout = setTimeout(() => {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1,
        isRetrying: false,
      }));
    }, delay);

    this.retryTimeouts.push(timeout);
  };

  private handleReset = () => {
    // Clear all pending retries
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout));
    this.retryTimeouts = [];

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRetrying: false,
      errorType: 'unknown',
    });

    console.log('🔄 WebSocket Error Boundary: Manual reset performed');
  };

  componentWillUnmount() {
    // Clear all timeouts on unmount
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout));
  }

  private getErrorIcon() {
    switch (this.state.errorType) {
      case 'connection':
        return WifiOff;
      case 'auth':
        return X;
      case 'data':
        return Info;
      default:
        return AlertTriangle;
    }
  }

  private getErrorTitle() {
    switch (this.state.errorType) {
      case 'connection':
        return 'Connection Error';
      case 'auth':
        return 'Authentication Error';
      case 'data':
        return 'Data Processing Error';
      default:
        return 'Unexpected Error';
    }
  }

  private getErrorDescription() {
    switch (this.state.errorType) {
      case 'connection':
        return 'Lost connection to the server. Real-time updates are temporarily unavailable.';
      case 'auth':
        return 'Authentication failed. Please refresh the page or log in again.';
      case 'data':
        return 'There was an error processing the received data. Some information may be incomplete.';
      default:
        return 'An unexpected error occurred in the dashboard system.';
    }
  }

  private getRecoveryActions() {
    const { enableRetry = true, maxRetries = 3 } = this.props;
    const canRetry = enableRetry && this.state.retryCount < maxRetries;
    const IconComponent = this.getErrorIcon();

    return (
      <div className="flex flex-col sm:flex-row gap-3">
        {canRetry && (
          <Button
            onClick={this.handleRetry}
            disabled={this.state.isRetrying}
            variant="default"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${this.state.isRetrying ? 'animate-spin' : ''}`} />
            {this.state.isRetrying 
              ? `Retrying... (${this.state.retryCount + 1}/${maxRetries})` 
              : `Retry (${this.state.retryCount}/${maxRetries})`
            }
          </Button>
        )}
        
        <Button
          onClick={this.handleReset}
          variant="outline"
          className="flex items-center gap-2"
        >
          <IconComponent className="h-4 w-4" />
          Reset Dashboard
        </Button>
        
        <Button
          onClick={() => window.location.reload()}
          variant="ghost"
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Reload Page
        </Button>
      </div>
    );
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { showErrorDetails = process.env.NODE_ENV === 'development' } = this.props;
      const IconComponent = this.getErrorIcon();

      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
          <div className="max-w-4xl mx-auto">
            {/* Error Alert */}
            <Alert className="mb-6 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20">
              <IconComponent className="h-4 w-4 text-red-600 dark:text-red-400" />
              <AlertTitle className="text-red-800 dark:text-red-200">
                {this.getErrorTitle()}
              </AlertTitle>
              <AlertDescription className="text-red-700 dark:text-red-300">
                {this.getErrorDescription()}
              </AlertDescription>
            </Alert>

            {/* Main Error Card */}
            <Card className="border-red-200 dark:border-red-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-red-800 dark:text-red-200">
                      <IconComponent className="h-5 w-5" />
                      Dashboard Error
                    </CardTitle>
                    <CardDescription className="text-red-600 dark:text-red-400">
                      The dashboard encountered an error and needs to be recovered
                    </CardDescription>
                  </div>
                  <Badge 
                    variant="destructive" 
                    className="bg-red-100 text-red-800 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-800"
                  >
                    {this.state.errorType.toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Recovery Actions */}
                <div>
                  <h4 className="font-semibold mb-3 text-gray-800 dark:text-gray-200">
                    Recovery Options
                  </h4>
                  {this.getRecoveryActions()}
                </div>

                {/* Error Details (Development Only) */}
                {showErrorDetails && this.state.error && (
                  <div>
                    <h4 className="font-semibold mb-3 text-gray-800 dark:text-gray-200">
                      Technical Details
                    </h4>
                    <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                      <details className="space-y-3">
                        <summary className="cursor-pointer font-medium text-gray-700 dark:text-gray-300">
                          Error Message
                        </summary>
                        <pre className="text-sm text-red-600 dark:text-red-400 overflow-auto p-3 bg-red-50 dark:bg-red-950/20 rounded border-red-200 dark:border-red-800 border">
                          {this.state.error.message}
                        </pre>
                      </details>
                      
                      {this.state.error.stack && (
                        <details className="mt-3">
                          <summary className="cursor-pointer font-medium text-gray-700 dark:text-gray-300">
                            Stack Trace
                          </summary>
                          <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-auto p-3 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 mt-2 max-h-64">
                            {this.state.error.stack}
                          </pre>
                        </details>
                      )}
                      
                      {this.state.errorInfo && (
                        <details className="mt-3">
                          <summary className="cursor-pointer font-medium text-gray-700 dark:text-gray-300">
                            Component Stack
                          </summary>
                          <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-auto p-3 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 mt-2 max-h-64">
                            {this.state.errorInfo.componentStack}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                )}

                {/* Help Information */}
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h4 className="font-semibold mb-2 text-blue-800 dark:text-blue-200">
                    💡 What to try next:
                  </h4>
                  <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                    <li>• Check your internet connection</li>
                    <li>• Try refreshing the page</li>
                    <li>• Clear your browser cache</li>
                    <li>• Contact support if the issue persists</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Connection Status */}
            <div className="mt-6 text-center">
              <Badge variant="outline" className="flex items-center gap-2 w-fit mx-auto">
                <WifiOff className="h-3 w-3" />
                WebSocket Connection: Offline
              </Badge>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default WebSocketErrorBoundary;