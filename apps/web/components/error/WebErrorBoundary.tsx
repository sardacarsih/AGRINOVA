import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertTriangle,
  RefreshCw,
  Home,
  Bug,
  Settings,
  WifiOff,
  Database,
  Shield,
  Battery
} from 'lucide-react';

interface WebErrorBoundaryProps {
  children: ReactNode;
  fallbackComponent?: React.ComponentType<any>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showRetry?: boolean;
  showDetails?: boolean;
  maxRetries?: number;
}

interface WebErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
  isOffline: boolean;
  isLowBattery: boolean;
  isStorageQuotaExceeded: boolean;
}

export class WebErrorBoundary extends Component<WebErrorBoundaryProps, WebErrorBoundaryState> {
  private retryTimeouts: NodeJS.Timeout[] = [];

  constructor(props: WebErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isOffline: false,
      isLowBattery: false,
      isStorageQuotaExceeded: false
    };
  }

  static getDerivedStateFromError(error: Error, errorInfo: ErrorInfo): WebErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorInfo,
      retryCount: 0,
      isOffline: false,
      isLowBattery: false,
      isStorageQuotaExceeded: false
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      hasError: true,
      error,
      errorInfo,
      retryCount: this.state.retryCount
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // Check for specific error types
    this.detectErrorConditions(error);
  }

  componentWillUnmount() {
    // Clear any pending timeouts
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout));
  }

  detectErrorConditions = (error: Error) => {
    const errorMessage = error.message.toLowerCase();

    // Check for network errors
    if (errorMessage.includes('network') ||
      errorMessage.includes('fetch') ||
      errorMessage.includes('connection')) {
      this.setState({ isOffline: true });
    }

    // Check for storage errors
    if (errorMessage.includes('quota') ||
      errorMessage.includes('storage') ||
      errorMessage.includes('disk space')) {
      this.setState({ isStorageQuotaExceeded: true });
    }

    // Check for battery errors (if Battery API is available)
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        if (battery.level < 0.2) {
          this.setState({ isLowBattery: true });
        }
      }).catch(() => {
        // Battery API not available or failed
      });
    }
  };

  handleRetry = () => {
    const { maxRetries = 3 } = this.props;
    const { retryCount, isOffline, isLowBattery, isStorageQuotaExceeded } = this.state;

    // Don't retry if we've hit the limit or have critical issues
    if (retryCount >= maxRetries || isOffline || isLowBattery || isStorageQuotaExceeded) {
      return;
    }

    this.setState({ retryCount: retryCount + 1 });

    // Clear any existing retry timeout
    if (this.retryTimeouts.length > 0) {
      this.retryTimeouts.forEach(timeout => clearTimeout(timeout));
    }

    // Add exponential backoff for retries
    const backoffDelay = Math.min(1000 * Math.pow(2, retryCount), 10000);

    const timeout = setTimeout(() => {
      window.location.reload();
    }, backoffDelay);

    this.retryTimeouts.push(timeout);
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  handleReportError = () => {
    // Open email client with error details
    const subject = encodeURIComponent('Error Report - Mandor Dashboard');
    const body = encodeURIComponent(
      `Error Details:\n\n` +
      `Error: ${this.state.error?.message}\n` +
      `Component Stack: ${this.state.errorInfo?.componentStack}\n` +
      `URL: ${window.location.href}\n` +
      `User Agent: ${navigator.userAgent}\n` +
      `Timestamp: ${new Date().toISOString()}\n\n` +
      `Please provide additional context about what you were doing when the error occurred.`
    );

    window.location.href = `mailto:support@agrinova.com?subject=${subject}&body=${body}`;
  };

  handleSettings = () => {
    // Open browser settings
    if ((window as any).openSettings) {
      (window as any).openSettings();
    } else {
      window.open('chrome://settings/', '_blank');
    }
  };

  render() {
    if (this.state.hasError) {
      return this.renderErrorUI();
    }

    return this.props.children;
  }

  renderErrorUI() {
    const { hasError, error, errorInfo, retryCount, isOffline, isLowBattery, isStorageQuotaExceeded } = this.state;
    const { showRetry = true, showDetails = true, maxRetries = 3 } = this.props;

    // Use custom fallback component if provided
    if (this.props.fallbackComponent) {
      const FallbackComponent = this.props.fallbackComponent;
      return <FallbackComponent error={error} errorInfo={errorInfo} retry={this.handleRetry} />;
    }

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          {/* Error Card */}
          <Card className="shadow-lg">
            <CardHeader className="text-center pb-4">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
              </div>

              <CardTitle className="text-xl font-bold text-gray-900">
                Terjadi Kesalahan
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Error Message */}
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {this.getErrorMessage(error)}
                </AlertDescription>
              </Alert>

              {/* Contextual Information */}
              <div className="space-y-2 text-sm">
                {isOffline && (
                  <Alert>
                    <WifiOff className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Koneksi Terputus:</strong> Coba periksa koneksi internet Anda.
                    </AlertDescription>
                  </Alert>
                )}

                {isLowBattery && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Baterai Lemah:</strong> Isikan daya perangkat Anda sebelum melanjutkan.
                    </AlertDescription>
                  </Alert>
                )}

                {isStorageQuotaExceeded && (
                  <Alert>
                    <Database className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Penyimpanan Penuh:</strong> Hapus beberapa data atau kosongkan cache browser.
                    </AlertDescription>
                  </Alert>
                )}

                {retryCount > 0 && (
                  <Alert>
                    <RefreshCw className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Percoba Gagal:</strong> Telah mencoba {retryCount} kali.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Error Details (if enabled) */}
              {showDetails && error && (
                <details className="bg-gray-100 p-4 rounded-lg">
                  <summary className="cursor-pointer font-medium text-sm mb-2">
                    Detail Teknis (Klik untuk melihat)
                  </summary>
                  <div className="mt-2 text-xs font-mono text-gray-600 space-y-1">
                    <div>
                      <strong>Error:</strong> {error.name}
                    </div>
                    <div>
                      <strong>Message:</strong> {error.message}
                    </div>
                    <div>
                      <strong>Stack:</strong>
                    </div>
                    <pre className="bg-white p-2 rounded border overflow-x-auto text-xs">
                      {errorInfo?.componentStack}
                    </pre>
                  </div>
                </details>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 justify-center">
                {showRetry && maxRetries > 0 && retryCount < maxRetries && !isOffline && !isLowBattery && !isStorageQuotaExceeded && (
                  <Button
                    onClick={this.handleRetry}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Coba Lagi ({maxRetries - retryCount} tersisa)
                  </Button>
                )}

                <Button
                  variant="outline"
                  onClick={this.handleGoHome}
                >
                  <Home className="h-4 w-4 mr-2" />
                  Beranda
                </Button>

                <Button
                  variant="outline"
                  onClick={this.handleReportError}
                >
                  <Bug className="h-4 w-4 mr-2" />
                  Laporkan
                </Button>

                <Button
                  variant="outline"
                  onClick={this.handleSettings}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Pengaturan
                </Button>
              </div>

              {/* Recovery Suggestions */}
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Saran Pemulihan
                </h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  {isOffline && (
                    <li>• Periksa koneksi Wi-Fi atau jaringan internet</li>
                  )}
                  {isLowBattery && (
                    <li>• Isikan perangkat atau colokkan daya</li>
                  )}
                  {isStorageQuotaExceeded && (
                    <li>• Hapus cache browser atau riwayat penyimpanan</li>
                  )}
                  {error?.message?.includes('ChunkLoadError') && (
                    <li>• Refresh halaman atau coba koneksi internet yang lebih stabil</li>
                  )}
                  {error?.message?.includes('TypeError') && (
                    <li>muat ulangi dengan membersihkan cache browser</li>
                  )}
                  <li>• Muat ulang halaman dengan menekan tombol Refresh</li>
                  <li>• Laporkan masalah ke tim teknis jika berlanjutan</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* System Status Indicators */}
          <div className="mt-4 flex justify-center gap-4">
            <div className="text-center">
              <div className={`w-3 h-3 rounded-full ${isOffline ? 'bg-red-500' : 'bg-green-500'}`} />
              <p className="text-xs mt-1">Network</p>
            </div>
            <div className="text-center">
              <div className={`w-3 h-3 rounded-full ${isLowBattery ? 'bg-red-500' : 'bg-green-500'}`} />
              <p className="text-xs mt-1">Battery</p>
            </div>
            <div className="text-center">
              <div className={`w-3 h-3 rounded-full ${isStorageQuotaExceeded ? 'bg-red-500' : 'bg-green-500'}`} />
              <p className="text-xs mt-1">Storage</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  private getErrorMessage(error: Error | null): string {
    if (!error) return 'Terjadi kesalahan yang tidak diketahui';

    // User-friendly error messages for common errors
    const errorMessages: Record<string, string> = {
      'ChunkLoadError': 'Halaman gagal dimuat. Silakan refresh halaman.',
      'NetworkError': 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.',
      'TypeError': 'Terjadi kesalahan dalam memuat data. Silakan refresh halaman.',
      'ReferenceError': 'Komponen tidak ditemukan. Silakan refresh halaman.',
      'PermissionDeniedError': 'Tidak memiliki izin untuk mengakses sumber daya ini.',
      'AuthenticationError': 'Sesi berakhir. Silakan login kembali.',
      'ValidationError': 'Data yang dimasukkan tidak valid.',
      'ServerError': 'Server sedang mengalami masalah. Silakan coba lagi nanti.'
    };

    // Return custom message if available, otherwise use generic message
    const customMessage = errorMessages[error.name];
    return customMessage || error.message || 'Terjadi kesalahan yang tidak diketahui';
  }
}

// HOC for wrapping components with error boundary
export function withWebErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    fallbackComponent?: React.ComponentType<any>;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
    showRetry?: boolean;
    showDetails?: boolean;
    maxRetries?: number;
  }
) {
  return function WrappedComponent(props: P) {
    return (
      <WebErrorBoundary
        fallbackComponent={options?.fallbackComponent}
        onError={options?.onError}
        showRetry={options?.showRetry}
        showDetails={options?.showDetails}
        maxRetries={options?.maxRetries}
      >
        <Component {...props} />
      </WebErrorBoundary>
    );
  };
}

// Network-aware error boundary component
export function NetworkAwareErrorBoundary({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOnline) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="text-center py-8">
            <WifiOff className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              Tidak Ada Koneksi Internet
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Periksa koneksi internet Anda dan coba lagi.
            </p>
            <Button onClick={() => window.location.reload()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Muat Ulang
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}

// Low-power mode error boundary for mobile
export function LowPowerModeErrorBoundary({ children }: { children: ReactNode }) {
  const [isLowPowerMode, setIsLowPowerMode] = React.useState(false);

  React.useEffect(() => {
    const checkBatteryLevel = async () => {
      if ('getBattery' in navigator) {
        try {
          const battery = await (navigator as any).getBattery();
          setIsLowPowerMode(battery.level < 0.2);
        } catch {
          // Battery API not available
        }
      }
    };

    checkBatteryLevel();

    // Check battery level periodically
    const interval = setInterval(checkBatteryLevel, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, []);

  if (isLowPowerMode) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="text-center py-8">
            <Battery className="h-12 w-12 text-orange-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-orange-700 mb-2">
              Daya Perangkat Lemah
            </h3>
            <p className="text-sm text-orange-600 mb-4">
              Isikan perangkat Anda untuk melanjutkan.
              Aplikasi akan berjalan dengan performa yang terbatas.
            </p>
            <Button onClick={() => window.location.reload()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Muat Ulang
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}