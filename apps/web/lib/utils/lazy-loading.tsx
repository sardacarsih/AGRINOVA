'use client';

import React, { lazy, Suspense, ComponentType, ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { performance } from '../performance/perf-monitor';

// Enhanced loading states
export const LoadingSpinner = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className="flex items-center justify-center p-4">
      <div className={`animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 ${sizeClasses[size]}`} />
    </div>
  );
};

export const LoadingSkeleton = ({
  lines = 3,
  className = ''
}: {
  lines?: number;
  className?: string;
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 bg-gray-200 rounded animate-pulse"
          style={{ width: `${Math.max(40, Math.random() * 100)}%` }}
        />
      ))}
    </div>
  );
};

export const CardSkeleton = () => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
    <div className="animate-pulse">
      <div className="h-6 bg-gray-200 rounded w-3/4 mb-4" />
      <div className="h-4 bg-gray-200 rounded w-full mb-2" />
      <div className="h-4 bg-gray-200 rounded w-2/3" />
    </div>
  </div>
);

export const TableSkeleton = ({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
    <div className="animate-pulse">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, i) => (
            <div key={i} className="h-4 bg-gray-200 rounded" />
          ))}
        </div>
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="border-b border-gray-200 p-4 last:border-b-0">
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
            {Array.from({ length: columns }).map((_, colIndex) => (
              <div key={colIndex} className="h-4 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Enhanced lazy loading with performance tracking
export function createLazyComponent<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  options: {
    fallback?: ReactNode;
    preload?: boolean;
  } = {}
) {
  const { fallback = <LoadingSpinner />, preload = false } = options;

  // Create lazy component
  const LazyComponent = lazy(() => {
    const timer = performance.startTimer('lazy.component.load');

    return importFunc()
      .then(module => {
        timer();
        performance.recordMetric('lazy.component.success', 1, {
          component_name: module.default.name || 'Unknown',
        });
        return module;
      })
      .catch(error => {
        timer();
        performance.recordMetric('lazy.component.error', 1, {
          component_name: 'Unknown',
          error_type: error.constructor.name,
        });
        throw error;
      });
  });

  // Preload component if requested
  if (preload && typeof window !== 'undefined') {
    importFunc();
  }

  // Return wrapped component
  return function LazyWrapper(props: React.ComponentProps<T>) {
    return (
      <Suspense fallback={fallback}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

// Note: Lazy component definitions removed - modules not yet implemented
// Use createLazyComponent() to create lazy-loaded components when the modules exist

// Intersection Observer hook
export function useIntersectionObserver({
  threshold = 0,
  root = null,
  rootMargin = '0px',
  triggerOnce = false,
}: {
  threshold?: number;
  root?: Element | null;
  rootMargin?: string;
  triggerOnce?: boolean;
}) {
  const [ref, setRef] = React.useState<Element | null>(null);
  const [inView, setInView] = React.useState(false);

  React.useEffect(() => {
    if (!ref) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (triggerOnce) {
            observer.disconnect();
          }
        } else {
          if (!triggerOnce) {
            setInView(false);
          }
        }
      },
      { threshold, root, rootMargin }
    );

    observer.observe(ref);

    return () => {
      observer.disconnect();
    };
  }, [ref, threshold, root, rootMargin, triggerOnce]);

  return [setRef, inView] as [typeof setRef, typeof inView];
}

// Intersection Observer for image lazy loading
export const LazyImage = ({
  src,
  alt,
  className,
  placeholder = '/images/placeholder.jpg',
  ...props
}: {
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
  [key: string]: any;
}) => {
  const [imageSrc, setImageSrc] = React.useState(placeholder);
  const [imageRef, inView] = useIntersectionObserver({
    threshold: 0.1,
    triggerOnce: true,
  });

  React.useEffect(() => {
    if (inView && src !== imageSrc) {
      const img = new Image();
      img.onload = () => {
        setImageSrc(src);
        performance.recordMetric('lazy.image.loaded', 1, { src });
      };
      img.onerror = () => {
        performance.recordMetric('lazy.image.error', 1, { src });
      };
      img.src = src;
    }
  }, [inView, src, imageSrc]);

  return (
    <img
      ref={imageRef as any}
      src={imageSrc}
      alt={alt}
      className={`transition-opacity duration-300 ${inView ? 'opacity-100' : 'opacity-50'} ${className}`}
      {...props}
    />
  );
};