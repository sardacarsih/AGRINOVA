'use client';

import React, { memo, useMemo, useCallback, useRef, useEffect } from 'react';
import { performance } from '../../lib/performance/perf-monitor';

interface OptimizedDashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  actions?: React.ReactNode;
  className?: string;
}

// Memoized breadcrumb component
const Breadcrumbs = memo(({ breadcrumbs }: { breadcrumbs: Array<{ label: string; href?: string }> }) => {
  const breadcrumbItems = useMemo(() => {
    return breadcrumbs.map((crumb, index) => (
      <div key={index} className="flex items-center">
        {crumb.href ? (
          <a
            href={crumb.href}
            className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
          >
            {crumb.label}
          </a>
        ) : (
          <span className="text-sm font-medium text-gray-500">{crumb.label}</span>
        )}
        {index < breadcrumbs.length - 1 && (
          <svg
            className="w-4 h-4 text-gray-400 mx-2"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </div>
    ));
  }, [breadcrumbs]);

  return (
    <nav className="flex items-center space-x-1" aria-label="Breadcrumb">
      {breadcrumbItems}
    </nav>
  );
});

Breadcrumbs.displayName = 'Breadcrumbs';

// Memoized header component
const Header = memo(({
  title,
  subtitle,
  breadcrumbs,
  actions
}: {
  title?: string;
  subtitle?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  actions?: React.ReactNode;
}) => {
  return (
    <div className="mb-6 space-y-4">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumbs breadcrumbs={breadcrumbs} />
      )}

      <div className="flex items-center justify-between">
        <div>
          {title && (
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              {title}
            </h1>
          )}
          {subtitle && (
            <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
          )}
        </div>

        {actions && (
          <div className="flex items-center space-x-3">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
});

Header.displayName = 'Header';

// Performance monitoring wrapper
const withPerformanceMonitoring = <P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) => {
  const WrappedComponent = memo((props: P) => {
    const renderTimer = useRef<(() => void) | null>(null);

    useEffect(() => {
      renderTimer.current = performance.startTimer(`render.${componentName}`);

      return () => {
        if (renderTimer.current) {
          // Timer automatically records the duration when called
          renderTimer.current();
        }
      };
    });

    // Track render count
    useEffect(() => {
      performance.recordMetric(`render.${componentName}.count`, 1);
    });

    return <Component {...props} />;
  });

  WrappedComponent.displayName = `withPerformanceMonitoring(${componentName})`;
  return WrappedComponent;
};

// Optimized Dashboard Layout with comprehensive performance tracking
const OptimizedDashboardLayout = withPerformanceMonitoring(
  memo(({
    children,
    title,
    subtitle,
    breadcrumbs,
    actions,
    className = '',
  }: OptimizedDashboardLayoutProps) => {
    // Track mount/unmount
    useEffect(() => {
      performance.recordMetric('dashboard.layout.mount', 1);

      return () => {
        performance.recordMetric('dashboard.layout.unmount', 1);
      };
    }, []);

    // Memoize children to prevent unnecessary re-renders
    const memoizedChildren = useMemo(() => children, [children]);

    // Optimized scroll handler with throttling
    const handleScroll = useCallback(() => {
      performance.recordMetric('dashboard.scroll', 1);

      // Debounce expensive operations
      requestAnimationFrame(() => {
        // Add scroll-based performance optimizations here
        const scrollTop = window.pageYOffset;
        performance.recordMetric('dashboard.scroll.position', scrollTop);
      });
    }, []);

    // Add scroll listener with cleanup
    useEffect(() => {
      let rafId: number;

      const throttledScroll = () => {
        if (rafId) {
          cancelAnimationFrame(rafId);
        }
        rafId = requestAnimationFrame(handleScroll);
      };

      window.addEventListener('scroll', throttledScroll, { passive: true });

      return () => {
        window.removeEventListener('scroll', throttledScroll);
        if (rafId) {
          cancelAnimationFrame(rafId);
        }
      };
    }, [handleScroll]);

    // Track interaction performance
    const handleClick = useCallback((event: React.MouseEvent) => {
      const target = event.target as HTMLElement;
      const interactiveElement = target.closest('button, a, input, select, textarea');

      if (interactiveElement) {
        performance.recordMetric('dashboard.interaction.click', 1, {
          element_type: interactiveElement.tagName.toLowerCase(),
          element_id: interactiveElement.id || 'no-id',
        });
      }
    }, []);

    // Performance-optimized container
    return (
      <div
        className={`min-h-screen bg-gray-50 ${className}`}
        onClick={handleClick}
      >
        {/* Skip to content for accessibility - only visible on keyboard focus */}
        <a
          href="#main-content"
          className="absolute -top-96 left-0 focus:top-4 focus:left-4 focus:fixed z-50 bg-blue-600 text-white px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all"
        >
          Skip to main content
        </a>

        {/* Main content area with performance monitoring */}
        <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Optimized header section */}
          {(title || subtitle || breadcrumbs || actions) && (
            <Header
              title={title}
              subtitle={subtitle}
              breadcrumbs={breadcrumbs}
              actions={actions}
            />
          )}

          {/* Content area with error boundary */}
          <div className="space-y-6">
            <ErrorBoundary
              fallback={
                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                  <h3 className="text-red-800 font-semibold mb-2">Something went wrong</h3>
                  <p className="text-red-600 mb-4">
                    We're having trouble loading this section. Please try refreshing the page.
                  </p>
                  <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                  >
                  Refresh Page
                </button>
                </div>
              }
          onError={(error, errorInfo) => {
            performance.recordMetric('dashboard.layout.error', 1, {
              error_name: error.name,
              error_message: error.message,
              component_stack: errorInfo.componentStack?.substring(0, 500) || 'no-stack',
            });
          }}
            >
          <div className="dashboard-content">
            {memoizedChildren}
          </div>
        </ErrorBoundary>
      </div>

          {/* Performance indicator (development only) */ }
    {
      process.env.NODE_ENV === 'development' && (
        <PerformanceIndicator />
      )
    }
        </main>
      </div>
    );
  }),
  'OptimizedDashboardLayout'
);

OptimizedDashboardLayout.displayName = 'OptimizedDashboardLayout';

// Error Boundary component
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Dashboard Layout Error:', error, errorInfo);

    performance.recordMetric('dashboard.error.boundary', 1, {
      error_name: error.name,
      error_message: error.message,
      stack: error.stack?.substring(0, 500) || 'no-stack',
    });

    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-red-800 font-semibold mb-2">Something went wrong</h3>
          <p className="text-red-600">
            An error occurred while rendering the dashboard. Please try refreshing the page.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

// Performance indicator for development
const PerformanceIndicator = memo(() => {
  const [metrics, setMetrics] = React.useState({
    renderTime: 0,
    interactionCount: 0,
    errorCount: 0,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const renderStats = performance.getMetricStats('render.dashboard.layout.duration');
      const interactionCount = performance.getMetrics('dashboard.interaction.click').length;
      const errorCount = performance.getMetrics('dashboard.error.boundary').length;

      setMetrics({
        renderTime: renderStats?.avg || 0,
        interactionCount,
        errorCount,
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-75 text-white p-3 rounded-lg text-xs space-y-1 z-50">
      <div>Render: {metrics.renderTime.toFixed(2)}ms</div>
      <div>Interactions: {metrics.interactionCount}</div>
      <div>Errors: {metrics.errorCount}</div>
    </div>
  );
});

PerformanceIndicator.displayName = 'PerformanceIndicator';

export default OptimizedDashboardLayout;
export { ErrorBoundary, PerformanceIndicator };