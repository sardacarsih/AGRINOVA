'use client';

import React, { useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { FileText, History, LandPlot, LayoutGrid } from 'lucide-react';
import { CompanyAdminDashboardLayout } from '@/components/layouts/role-layouts/CompanyAdminDashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CompanyAdminLandTypesPage from './CompanyAdminLandTypesPage';
import CompanyAdminBlocksPage from './CompanyAdminBlocksPage';
import CompanyAdminTarifBlokPage from './CompanyAdminTarifBlokPage';
import CompanyAdminBlockAuditPage from './CompanyAdminBlockAuditPage';

interface CompanyAdminBlocksTabsPageProps {
  user?: unknown;
  locale?: string;
}

type BlocksTabValue = 'land-types' | 'blocks' | 'tarif-blok' | 'audit';

const DEFAULT_TAB: BlocksTabValue = 'blocks';
const LAND_TYPES_TAB: BlocksTabValue = 'land-types';
const TARIF_BLOK_TAB: BlocksTabValue = 'tarif-blok';
const AUDIT_TAB: BlocksTabValue = 'audit';

export default function CompanyAdminBlocksTabsPage({ user }: CompanyAdminBlocksTabsPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeTab: BlocksTabValue = searchParams?.get('tab') === LAND_TYPES_TAB
    ? LAND_TYPES_TAB
    : searchParams?.get('tab') === TARIF_BLOK_TAB
      ? TARIF_BLOK_TAB
      : searchParams?.get('tab') === AUDIT_TAB
        ? AUDIT_TAB
      : DEFAULT_TAB;

  const handleTabChange = useCallback((nextValue: string) => {
    const nextTab = nextValue === LAND_TYPES_TAB
      ? LAND_TYPES_TAB
      : nextValue === TARIF_BLOK_TAB
        ? TARIF_BLOK_TAB
        : nextValue === AUDIT_TAB
          ? AUDIT_TAB
        : DEFAULT_TAB;
    const params = new URLSearchParams(searchParams?.toString());

    if (nextTab === DEFAULT_TAB) {
      params.delete('tab');
    } else {
      params.set('tab', nextTab);
    }

    const query = params.toString();
    const targetPath = query ? `${pathname}?${query}` : pathname;
    router.replace(targetPath, { scroll: false });
  }, [pathname, router, searchParams]);

  return (
    <CompanyAdminDashboardLayout
      title="Block Management"
      description="Kelola data blok dan master tarif blok dalam satu halaman"
      contentMaxWidthClass="max-w-[96vw]"
      contentPaddingClass="px-2 py-4 sm:px-3 sm:py-5 lg:px-4 lg:py-6"
    >
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid w-full max-w-4xl grid-cols-4">
          <TabsTrigger value="land-types" className="flex items-center gap-2">
            <LandPlot className="h-4 w-4" />
            Land Types
          </TabsTrigger>
          <TabsTrigger value="blocks" className="flex items-center gap-2">
            <LayoutGrid className="h-4 w-4" />
            Blok
          </TabsTrigger>
          <TabsTrigger value="tarif-blok" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Tarif Blok
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Audit Blok
          </TabsTrigger>
        </TabsList>

        <TabsContent value="land-types" className="space-y-6">
          <CompanyAdminLandTypesPage user={user} withLayout={false} />
        </TabsContent>
        <TabsContent value="blocks" className="space-y-6">
          <CompanyAdminBlocksPage user={user} withLayout={false} />
        </TabsContent>
        <TabsContent value="tarif-blok" className="space-y-6">
          <CompanyAdminTarifBlokPage user={user} withLayout={false} />
        </TabsContent>
        <TabsContent value="audit" className="space-y-6">
          <CompanyAdminBlockAuditPage user={user} withLayout={false} />
        </TabsContent>
      </Tabs>
    </CompanyAdminDashboardLayout>
  );
}
