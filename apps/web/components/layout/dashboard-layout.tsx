'use client';

import * as React from 'react';
import { motion } from 'framer-motion';

import { useAuth } from '@/hooks/use-auth';
import { useSidebarCollapse } from '@/hooks/use-sidebar-collapse';
import { UnifiedSidebar } from '@/components/dashboard/unified-sidebar';
import { Topbar } from './topbar';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  showBreadcrumb?: boolean;
  breadcrumbItems?: Array<{ label: string; href?: string }>;
}

export function DashboardLayout({
  children,
  title,
  description,
  actions,
  showBreadcrumb = true,
  breadcrumbItems = [],
}: DashboardLayoutProps) {
  const { user } = useAuth();
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const { isSidebarCollapsed, toggleSidebarCollapsed } = useSidebarCollapse('global-dashboard-layout');

  // Handle fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Listen for fullscreen changes
  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  if (!user) return null;

  // Convert role format to match what UnifiedSidebar expects
  const userRole = user.role.toUpperCase().replace('_', ' ');

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <UnifiedSidebar
        userRole={userRole}
        userName={user.name || user.username}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapsed}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top navigation */}
        <Topbar
          title={title}
          description={description}
          breadcrumbItems={showBreadcrumb ? breadcrumbItems : []}
          actions={actions}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
        />

        {/* Main content area */}
        <motion.main
          className="flex-1 overflow-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          {children}
        </motion.main>
      </div>
    </div>
  );
}
