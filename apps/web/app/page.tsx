'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { AlertTriangle, Loader2, LogIn, RefreshCw, ShieldAlert, WifiOff } from 'lucide-react';
import { useLanguageChange } from '@/hooks/useLanguageChange';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { UserRole } from '@/types/auth';
// Import our new role-specific dashboard adapter system
import {
  DASHBOARD_COMPONENTS,
  getDashboardComponent
} from '@/components/role-adapters/DashboardAdapter';

const normalizeRuntimeRole = (role: unknown): UserRole | null => {
  if (typeof role !== 'string') return null;

  const normalized = role.trim().toUpperCase().replace(/[\s-]+/g, '_') as UserRole;
  return normalized in DASHBOARD_COMPONENTS ? normalized : null;
};

// Enhanced dashboard loading component with progressive loading indicators
interface DashboardLoadingProps {
  stage?: 'auth' | 'data' | 'components' | 'complete';
  progress?: number;
  message?: string;
}

function DashboardLoading({ stage = 'auth', progress = 0, message = 'Memuat dashboard...' }: DashboardLoadingProps) {
  const [detailedMessage, setDetailedMessage] = useState(message);
  const { t } = useLanguageChange('dashboard.loading');
  const safeProgress = Math.min(Math.max(progress, 0), 100);

  useEffect(() => {
    const messages = {
      auth: [t('auth'), t('authDetail'), 'Menyiapkan sesi...'],
      data: [t('data'), t('dataDetail'), 'Menyiapkan ruang kerja...'],
      components: [t('components'), t('componentsDetail'), 'Hampir selesai...'],
      complete: [t('complete'), t('completeDetail'), ''],
    };

    const stageMessages = messages[stage] || [];
    if (stageMessages.length > 0 && safeProgress < 90) {
      const messageIndex = Math.min(Math.floor(safeProgress / 30), stageMessages.length - 1);
      setDetailedMessage(stageMessages[messageIndex]);
    } else {
      setDetailedMessage(message);
    }
  }, [message, safeProgress, stage, t]);

  const stageDescription =
    stage === 'auth'
      ? t('authDetail')
      : stage === 'data'
        ? t('dataDetail')
        : stage === 'components'
          ? t('componentsDetail')
          : t('completeDetail');

  const stageTip =
    stage === 'auth'
      ? t('authTip')
      : stage === 'data'
        ? t('dataTip')
        : stage === 'components'
          ? t('componentsTip')
          : t('completeTip');

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-16 top-10 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-10 right-0 h-72 w-72 rounded-full bg-secondary/50 blur-3xl" />
      </div>

      <Card className="relative z-10 w-full max-w-lg border-border/70 bg-card/90 shadow-2xl backdrop-blur-md">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
          </div>
          <CardTitle className="text-xl">{detailedMessage}</CardTitle>
          <CardDescription>{stageDescription}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{t('progress')}</span>
              <span>{Math.round(safeProgress)}%</span>
            </div>
            <Progress value={safeProgress} className="h-2" />
          </div>

          <Alert variant="info" className="bg-muted/20">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{t('progress')}</AlertTitle>
            <AlertDescription>{stageTip}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}

// Enhanced error component with detailed error handling
interface DashboardErrorProps {
  error: string;
  retry: () => void;
  errorType?: 'network' | 'auth' | 'data' | 'component';
  retryCount?: number;
}

function DashboardError({ error, retry, errorType = 'network', retryCount = 0 }: DashboardErrorProps) {
  const { t } = useLanguageChange('dashboard.error');
  const errorMeta = {
    network: {
      icon: WifiOff,
      title: t('connectionTitle'),
      message: t('networkMessage'),
      alertVariant: 'destructive' as const,
      iconClassName: 'text-status-error',
      suggestions: [t('checkConnection'), t('refreshPage'), t('contactSupport')],
    },
    auth: {
      icon: ShieldAlert,
      title: t('authTitle'),
      message: t('authMessage'),
      alertVariant: 'warning' as const,
      iconClassName: 'text-status-warning',
      suggestions: [t('loginAgain'), t('clearCache'), t('checkSession')],
    },
    data: {
      icon: AlertTriangle,
      title: t('dataTitle'),
      message: t('dataMessage'),
      alertVariant: 'warning' as const,
      iconClassName: 'text-status-warning',
      suggestions: [t('waitMoment'), t('refreshPage'), t('contactAdmin')],
    },
    component: {
      icon: AlertTriangle,
      title: t('defaultTitle'),
      message: t('defaultMessage'),
      alertVariant: 'destructive' as const,
      iconClassName: 'text-status-error',
      suggestions: [t('retry'), t('refreshPage'), t('contactSupport')],
    },
  };
  const current = errorMeta[errorType] ?? errorMeta.component;
  const ErrorIcon = current.icon;
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-16 top-10 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-10 right-0 h-72 w-72 rounded-full bg-secondary/50 blur-3xl" />
      </div>
      <Card className="relative z-10 w-full max-w-2xl border-border/70 bg-card/90 shadow-2xl backdrop-blur-md">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-border/60 bg-muted/40">
            <ErrorIcon className={`h-8 w-8 ${current.iconClassName}`} aria-hidden="true" />
          </div>
          <CardTitle className="text-2xl">{current.title}</CardTitle>
          <CardDescription>{current.message}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <Alert variant={current.alertVariant}>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{t('defaultTitle')}</AlertTitle>
            <AlertDescription>{error || current.message}</AlertDescription>
          </Alert>
          {retryCount > 0 && (
            <Alert variant="warning">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{t('retry')}</AlertTitle>
              <AlertDescription>
                {t('attempt', { current: retryCount, max: retryCount < 3 ? 3 : 'unlimited' })}
              </AlertDescription>
            </Alert>
          )}
          {process.env.NODE_ENV === 'development' && error && (
            <details className="rounded-md border border-border/60 bg-muted/20 p-3">
              <summary className="cursor-pointer text-sm text-muted-foreground">{t('showDetails')}</summary>
              <pre className="mt-3 max-h-44 overflow-auto rounded bg-muted p-3 text-xs text-muted-foreground">{error}</pre>
            </details>
          )}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button onClick={retry} variant="default">
              <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
              {t('retry')}
            </Button>
            <Button onClick={() => window.location.reload()} variant="secondary">
              {t('refresh')}
            </Button>
            {errorType === 'auth' && (
              <Button onClick={() => window.location.assign('/login')} variant="info">
                <LogIn className="mr-2 h-4 w-4" aria-hidden="true" />
                {t('login')}
              </Button>
            )}
          </div>
          <div className="space-y-3 rounded-md border border-border/60 bg-muted/10 p-4">
            <p className="text-sm font-semibold">{t('suggestedActions')}</p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {current.suggestions.map((action, index) => (
                <li key={index}>{action}</li>
              ))}
            </ul>
          </div>
          <p className="border-t border-border/60 pt-4 text-center text-sm text-muted-foreground">
            {t('needHelp')}{' '}
            <a href="mailto:support@agrinova.com" className="font-medium text-primary hover:underline">
              support@agrinova.com
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// Main dashboard content component
function DashboardContent() {
  const { user } = useAuth();
  const { t } = useLanguageChange('dashboard.error');
  const router = useRouter();
  const normalizedRole = React.useMemo(() => normalizeRuntimeRole(user?.role), [user?.role]);

  // Redirect if no user or invalid role
  React.useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (!normalizedRole) {
      console.error('Invalid or missing user role:', user.role);
      router.push('/login?error=invalid_role');
      return;
    }
  }, [user, normalizedRole, router]);

  // Let ProtectedRoute handle auth loading; only keep a lightweight fallback here.
  if (!user) {
    return <DashboardLoading stage="auth" progress={25} />;
  }

  // Show invalid role error
  if (!normalizedRole) {
    return (
      <DashboardError
        error={t('invalidRole', { role: user.role })}
        retry={() => router.push('/login')}
      />
    );
  }

  // Get role-specific dashboard component from our new adapter system
  const DashboardComponent = getDashboardComponent(normalizedRole);

  if (!DashboardComponent) {
    return (
      <DashboardError
        error={t('invalidRole', { role: user.role })}
        retry={() => router.push('/login')}
      />
    );
  }

  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardComponent role={normalizedRole} user={user} />
    </Suspense>
  );
}

// Error boundary for dashboard
class DashboardErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Dashboard Error Boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <DashboardError
          error="An unexpected error occurred while loading the dashboard."
          retry={() => {
            this.setState({ hasError: false, error: null });
            window.location.reload();
          }}
        />
      );
    }

    return this.props.children;
  }
}

// Main dashboard page component
export default function DashboardPage() {
  return (
    <ProtectedRoute
      allowedRoles={['SUPER_ADMIN', 'COMPANY_ADMIN', 'AREA_MANAGER', 'MANAGER', 'ASISTEN', 'MANDOR', 'SATPAM', 'TIMBANGAN', 'GRADING']}
      fallbackPath="/login"
    >
      <DashboardErrorBoundary>
        <DashboardContent />
      </DashboardErrorBoundary>
    </ProtectedRoute>
  );
}


