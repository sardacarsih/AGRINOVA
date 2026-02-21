'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CircleAlert, Home } from 'lucide-react';

interface AccessDeniedProps {
  role?: string;
  path?: string;
  onBackToDashboard?: () => void;
}

export function AccessDenied({ role, path, onBackToDashboard }: AccessDeniedProps) {
  const t = useTranslations('auth');

  const handleBackToDashboard = () => {
    if (onBackToDashboard) {
      onBackToDashboard();
    } else {
      window.location.href = '/dashboard';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <CircleAlert className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Access Denied
          </CardTitle>
          <CardDescription>
            You don't have permission to access this page
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {role && (
            <div className="text-sm text-gray-600 text-center">
              Your role: <span className="font-medium">{role}</span>
            </div>
          )}
          {path && (
            <div className="text-sm text-gray-600 text-center">
              Requested page: <span className="font-medium">{path}</span>
            </div>
          )}
          <div className="text-sm text-gray-500 text-center">
            If you believe this is an error, please contact your administrator.
          </div>
          <Button
            onClick={handleBackToDashboard}
            className="w-full"
            variant="default"
          >
            <Home className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}