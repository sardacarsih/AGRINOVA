'use client';

import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useSidebarCollapse } from '@/hooks/use-sidebar-collapse';
import { UnifiedSidebar } from '@/components/dashboard/unified-sidebar';
import { Topbar } from '@/components/layout/topbar';
import { RoleLayoutContent } from './RoleLayoutContent';
import {
    SidebarProvider,
    SidebarInset
} from '@/components/ui/layout-shell';

interface GradingDashboardLayoutProps {
    children: React.ReactNode;
    title?: string;
    description?: string;
    actions?: React.ReactNode;
    showBreadcrumb?: boolean;
    breadcrumbItems?: Array<{ label: string; href?: string }>;
}

export function GradingDashboardLayout({
    children,
    title = 'Dashboard Grading',
    description = 'Inspeksi kualitas TBS dan penilaian mutu',
    actions,
    showBreadcrumb = true,
    breadcrumbItems = [],
}: GradingDashboardLayoutProps) {
    const { user } = useAuth();
    const [isFullscreen, setIsFullscreen] = React.useState(false);
    const { isSidebarCollapsed, toggleSidebarCollapsed } = useSidebarCollapse('role-grading');
    const normalizedUserRole = user?.role?.toString().trim().toUpperCase().replace(/[\s-]+/g, '_') || 'GRADING';

    const toggleFullscreen = React.useCallback(() => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    }, []);

    React.useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const defaultBreadcrumbs = React.useMemo(() => [
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Grading' }
    ], []);

    if (!user) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <p className="text-muted-foreground">Memuat data pengguna...</p>
                </div>
            </div>
        );
    }

    return (
        <SidebarProvider defaultOpen>
            <UnifiedSidebar
                userRole={normalizedUserRole}
                userName={user.name || user.username}
                isCollapsed={isSidebarCollapsed}
                onToggleCollapse={toggleSidebarCollapsed}
            />
            <SidebarInset>
                <Topbar
                    title={title}
                    description={description}
                    breadcrumbItems={showBreadcrumb ? [...defaultBreadcrumbs, ...breadcrumbItems] : []}
                    actions={actions}
                    isFullscreen={isFullscreen}
                    onToggleFullscreen={toggleFullscreen}
                />

                <RoleLayoutContent
                    statusLabel="Inspeksi: Aktif"
                    statusVariant="warning"
                    orbPrimaryClass="bg-fuchsia-500/12"
                    orbSecondaryClass="bg-rose-500/10"
                    dotClass="bg-status-warning"
                    maxWidthClass="max-w-6xl"
                    showDate
                >
                    {children}
                </RoleLayoutContent>
            </SidebarInset>
        </SidebarProvider>
    );
}
