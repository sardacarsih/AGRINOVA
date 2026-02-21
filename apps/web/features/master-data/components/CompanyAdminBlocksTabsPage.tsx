'use client';

import React, { useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { FileText, LayoutGrid } from 'lucide-react';
import { CompanyAdminDashboardLayout } from '@/components/layouts/role-layouts/CompanyAdminDashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CompanyAdminBlocksPage from './CompanyAdminBlocksPage';
import CompanyAdminTarifBlokPage from './CompanyAdminTarifBlokPage';

interface CompanyAdminBlocksTabsPageProps {
  user?: any;
  locale?: string;
}

type BlocksTabValue = 'blocks' | 'tarif-blok';

const DEFAULT_TAB: BlocksTabValue = 'blocks';
const TARIF_BLOK_TAB: BlocksTabValue = 'tarif-blok';

export default function CompanyAdminBlocksTabsPage({ user }: CompanyAdminBlocksTabsPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeTab: BlocksTabValue = searchParams?.get('tab') === TARIF_BLOK_TAB
    ? TARIF_BLOK_TAB
    : DEFAULT_TAB;

  const handleTabChange = useCallback((nextValue: string) => {
    const nextTab = nextValue === TARIF_BLOK_TAB ? TARIF_BLOK_TAB : DEFAULT_TAB;
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
    >
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="blocks" className="flex items-center gap-2">
            <LayoutGrid className="h-4 w-4" />
            Blok
          </TabsTrigger>
          <TabsTrigger value="tarif-blok" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Tarif Blok
          </TabsTrigger>
        </TabsList>

        <TabsContent value="blocks" className="space-y-6">
          <CompanyAdminBlocksPage user={user} withLayout={false} />
        </TabsContent>
        <TabsContent value="tarif-blok" className="space-y-6">
          <CompanyAdminTarifBlokPage user={user} withLayout={false} />
        </TabsContent>
      </Tabs>
    </CompanyAdminDashboardLayout>
  );
}
