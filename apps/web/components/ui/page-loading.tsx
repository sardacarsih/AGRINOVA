'use client';

import { Loader2 } from 'lucide-react';

interface PageLoadingProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function PageLoading({ message = 'Loading...', size = 'md' }: PageLoadingProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className={`animate-spin ${sizeClasses[size]} mx-auto text-primary mb-4`} />
        <p className="text-gray-600">{message}</p>
      </div>
    </div>
  );
}