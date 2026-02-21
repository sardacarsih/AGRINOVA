'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RoleDashboardProps } from '@/features/dashboard/types/dashboard';
import { TimbangDashboardLayout } from '@/components/layouts/role-layouts/TimbangDashboardLayout';

export default function TimbangDashboard({ role: _role }: RoleDashboardProps) {
    return (
        <TimbangDashboardLayout
            title="Timbangan Dashboard"
            description="Manage weighing operations"
        >
            <Card>
                <CardHeader>
                    <CardTitle>Welcome to Timbangan Dashboard</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>This feature is coming soon.</p>
                </CardContent>
            </Card>
        </TimbangDashboardLayout>
    );
}
