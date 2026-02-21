'use client';

import React from 'react';
import { gql } from '@apollo/client/core';
import { useQuery } from '@apollo/client/react';
import { SuperAdminDashboardLayout } from '@/components/layouts/role-layouts/SuperAdminDashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCw, Smartphone, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';

// GraphQL Query
const ADMIN_DEVICE_STATS_QUERY = gql`
  query AdminDeviceStats {
    adminDeviceStats {
      companyId
      companyName
      deviceCount
      lastActive
    }
  }
`;

interface DeviceStat {
    companyId: string;
    companyName: string;
    deviceCount: number;
    lastActive: string | null;
}

export default function DeviceStatsPage() {
    const router = useRouter();
    const { data, loading, error, refetch } = useQuery<{ adminDeviceStats: DeviceStat[] }>(ADMIN_DEVICE_STATS_QUERY);

    // Calculate total devices
    const totalDevices = data?.adminDeviceStats.reduce((acc, curr) => acc + curr.deviceCount, 0) || 0;
    const totalCompanies = data?.adminDeviceStats.length || 0;

    return (
        <SuperAdminDashboardLayout
            title="Device Statistics"
            description="Monitor device usage across all companies"
            breadcrumbItems={[
                { label: 'Device Stats', href: '/admin/device-stats' }
            ]}
        >
            <div className="space-y-6">
                {/* Actions Row */}
                <div className="flex items-center justify-between">
                    <Button variant="outline" onClick={() => router.back()}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Dashboard
                    </Button>
                    <Button onClick={() => refetch()} disabled={loading}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh Data
                    </Button>
                </div>

                {/* Summary Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Active Devices</CardTitle>
                            <Smartphone className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{loading ? '...' : totalDevices}</div>
                            <p className="text-xs text-muted-foreground">Across all companies</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Companies with Devices</CardTitle>
                            <Clock className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{loading ? '...' : totalCompanies}</div>
                            <p className="text-xs text-muted-foreground">Using gate check system</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Data Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Device Usage per Company</CardTitle>
                        <CardDescription>
                            List of companies and their unique device counts based on sync logs.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {error ? (
                            <div className="text-center p-6 text-red-500 bg-red-50 rounded-lg">
                                <p>Error loading data: {error.message}</p>
                                <Button variant="outline" className="mt-2" onClick={() => refetch()}>Retry</Button>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Company Name</TableHead>
                                        <TableHead>Company ID</TableHead>
                                        <TableHead className="text-right">Device Count</TableHead>
                                        <TableHead className="text-right">Last Active</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-24 text-center">
                                                Loading statistics...
                                            </TableCell>
                                        </TableRow>
                                    ) : data?.adminDeviceStats.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                                No device usage data found.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        data?.adminDeviceStats.map((stat) => (
                                            <TableRow key={stat.companyId}>
                                                <TableCell className="font-medium">{stat.companyName}</TableCell>
                                                <TableCell className="font-mono text-xs text-muted-foreground">{stat.companyId}</TableCell>
                                                <TableCell className="text-right">
                                                    <Badge variant="secondary" className="font-bold">
                                                        {stat.deviceCount}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right text-muted-foreground">
                                                    {stat.lastActive ? new Date(stat.lastActive).toLocaleString('id-ID') : '-'}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </SuperAdminDashboardLayout>
    );
}
