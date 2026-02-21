'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RoleDashboardProps } from '@/features/dashboard/types/dashboard';
import { GradingDashboardLayout } from '@/components/layouts/role-layouts/GradingDashboardLayout';

export default function GradingDashboard({ role: _role }: RoleDashboardProps) {
    return (
        <GradingDashboardLayout
            title="Grading Dashboard"
            description="Manage grading operations"
        >
            <Card>
                <CardHeader>
                    <CardTitle>Welcome to Grading Dashboard</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>This feature is coming soon.</p>
                </CardContent>
            </Card>
        </GradingDashboardLayout>
    );
}
