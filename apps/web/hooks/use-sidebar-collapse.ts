'use client';

import * as React from 'react';

const SIDEBAR_COLLAPSE_STORAGE_PREFIX = 'agrinova.sidebar.collapsed';

export function useSidebarCollapse(storageKey: string, defaultCollapsed = false) {
  const storageId = `${SIDEBAR_COLLAPSE_STORAGE_PREFIX}.${storageKey}`;

  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return defaultCollapsed;
    }

    try {
      const storedValue = window.localStorage.getItem(storageId);
      if (storedValue === null) {
        return defaultCollapsed;
      }

      return storedValue === '1';
    } catch {
      return defaultCollapsed;
    }
  });

  React.useEffect(() => {
    try {
      window.localStorage.setItem(storageId, isSidebarCollapsed ? '1' : '0');
    } catch {
      // Ignore storage errors (private mode, quota, etc.)
    }
  }, [isSidebarCollapsed, storageId]);

  const toggleSidebarCollapsed = React.useCallback(() => {
    setIsSidebarCollapsed((previous) => !previous);
  }, []);

  return {
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    toggleSidebarCollapsed,
  };
}
