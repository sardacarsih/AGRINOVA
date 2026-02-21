'use client';

import { useState, useEffect } from 'react';
import { User } from '@/types/auth';
import type { IPermissionManager } from '@/lib/auth/unified-permission-interface';

interface RBACTabProps {
  id: string;
  label: string;
  permissions: string[];
}

interface RBACTabsProps {
  tabs: RBACTabProps[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  user: User | null;
  permissionManager: IPermissionManager | null;
}

// Loading skeleton component
function RBACTabsSkeleton() {
  return (
    <div className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-10 w-24 bg-gray-300 rounded"></div>
              </div>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}

export default function RBACTabs({
  tabs,
  activeTab,
  onTabChange,
  user,
  permissionManager
}: RBACTabsProps) {
  const [tabPermissions, setTabPermissions] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkTabPermissions = async () => {
      if (!user || !permissionManager) {
        setError('User or permission manager not available');
        setLoading(false);
        return;
      }

      if (!tabs || tabs.length === 0) {
        setTabPermissions({});
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const permissions: Record<string, boolean> = {};

        for (const tab of tabs) {
          try {
            if (!tab.permissions || tab.permissions.length === 0) {
              permissions[tab.id] = true; // No permissions required
            } else {
              const hasPermission = await permissionManager.hasAllPermissions(
                user,
                tab.permissions
              );
              permissions[tab.id] = hasPermission;
            }
          } catch (tabError) {
            console.error(`Failed to check permissions for tab ${tab.id}:`, tabError);
            permissions[tab.id] = false; // Fail safe - deny access on error
          }
        }

        setTabPermissions(permissions);
      } catch (err) {
        console.error('Failed to check tab permissions:', err);
        setError('Failed to check permissions');
      } finally {
        setLoading(false);
      }
    };

    checkTabPermissions();
  }, [tabs, user, permissionManager]);

  // Loading state
  if (loading) {
    return <RBACTabsSkeleton />;
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4 m-4">
        <div className="text-red-800">
          <h3 className="text-sm font-medium">Permission Error</h3>
          <p className="text-sm mt-1">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 text-xs bg-red-100 hover:bg-red-200 px-2 py-1 rounded"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {tabs.map((tab) => {
              const hasPermission = tabPermissions[tab.id] !== false; // Default to true if not checked
              const isActive = activeTab === tab.id;

              // Don't render tabs user doesn't have permission for
              if (!hasPermission) {
                return null;
              }

              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`
                    relative py-4 px-1 border-b-2 font-medium text-sm
                    ${isActive
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                    transition-colors duration-200
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                  `}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {tab.label}
                  {isActive && (
                    <span className="absolute inset-x-0 bottom-0 h-0.5 bg-blue-500"></span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}