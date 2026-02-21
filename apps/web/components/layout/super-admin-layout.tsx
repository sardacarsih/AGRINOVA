'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/use-auth';
import { useSidebarCollapse } from '@/hooks/use-sidebar-collapse';
import { UnifiedSidebar } from '@/components/dashboard/unified-sidebar';
import { Topbar } from './topbar';
import { 
  SidebarProvider, 
  SidebarInset 
} from '@/components/ui/layout-shell';

interface SuperAdminLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  showBreadcrumb?: boolean;
  breadcrumbItems?: Array<{ label: string; href?: string }>;
}

export function SuperAdminLayout({
  children,
  title,
  description,
  actions,
  showBreadcrumb = true,
  breadcrumbItems = [],
}: SuperAdminLayoutProps) {
  const { user } = useAuth();
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const { isSidebarCollapsed, toggleSidebarCollapsed } = useSidebarCollapse('role-super-admin');

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

  return (
    <SidebarProvider defaultOpen>
      <UnifiedSidebar
        userRole={user.role.toString().trim().toUpperCase().replace(/[\s-]+/g, '_')}
        userName={user.name || user.username || user.email || 'Super Admin'}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapsed}
      />
      <SidebarInset>
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
          className="flex-1 overflow-auto bg-gradient-to-br from-gray-50/50 to-blue-50/30 dark:from-gray-900/50 dark:to-blue-950/30 min-h-screen"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <div className="p-6 lg:p-8 max-w-7xl mx-auto">
            {children}
          </div>
        </motion.main>
      </SidebarInset>
    </SidebarProvider>
  );
}
