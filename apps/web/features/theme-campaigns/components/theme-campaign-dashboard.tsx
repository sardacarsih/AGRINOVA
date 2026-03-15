'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ThemeCampaignHeader } from '@/features/theme-campaigns/components/theme-campaign-header';
import { ThemeCampaignSummaryCards } from '@/features/theme-campaigns/components/theme-campaign-summary-cards';
import { ThemeCampaignTable } from '@/features/theme-campaigns/components/theme-campaign-table';
import { ThemeCampaignFormSheet } from '@/features/theme-campaigns/components/theme-campaign-form-sheet';
import { ThemePreviewDialog } from '@/features/theme-campaigns/components/theme-preview-dialog';
import { GlobalKillSwitchCard } from '@/features/theme-campaigns/components/global-kill-switch-card';
import { ThemeAuditLogTimeline } from '@/features/theme-campaigns/components/theme-audit-log-timeline';
import { ThemeMasterTable } from '@/features/theme-campaigns/components/theme-master-table';
import { ThemeMasterFormSheet } from '@/features/theme-campaigns/components/theme-master-form-sheet';
import { useThemeCampaignDashboard } from '@/features/theme-campaigns/hooks/use-theme-campaign-dashboard';
import {
  ThemeCampaign,
  ThemeCampaignFormValues,
  ThemeEntity,
  ThemeMasterFormValues,
} from '@/features/theme-campaigns/types/theme-campaign';

type CampaignFormMode = 'create' | 'edit';
type ThemeFormMode = 'create' | 'edit';

export function ThemeCampaignDashboard() {
  const {
    isLoading,
    error,
    themes,
    settings,
    auditLogs,
    filters,
    sortField,
    sortDirection,
    page,
    pageSize,
    totalPages,
    totalFiltered,
    paginatedCampaigns,
    stats,
    activeCampaign,
    setFilter,
    clearFilters,
    setPage,
    setSort,
    refresh,
    createCampaign,
    updateCampaign,
    createTheme,
    updateTheme,
    toggleThemeActive,
    setDefaultTheme,
    toggleCampaignEnabled,
    duplicateCampaign,
    deleteCampaign,
    toggleKillSwitch,
    availableVisualOptions,
    getStatus,
  } = useThemeCampaignDashboard();

  const themeNameById = useMemo(
    () =>
      themes.reduce<Record<string, string>>((acc, theme) => {
        acc[theme.id] = theme.name;
        return acc;
      }, {}),
    [themes]
  );

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<CampaignFormMode>('create');
  const [activeFormCampaign, setActiveFormCampaign] = useState<ThemeCampaign | null>(null);
  const [isThemeFormOpen, setIsThemeFormOpen] = useState(false);
  const [themeFormMode, setThemeFormMode] = useState<ThemeFormMode>('create');
  const [activeTheme, setActiveTheme] = useState<ThemeEntity | null>(null);
  const [activeTab, setActiveTab] = useState<'campaigns' | 'themes'>('campaigns');
  const [previewCampaign, setPreviewCampaign] = useState<ThemeCampaign | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<ThemeCampaign | null>(null);
  const [isKillSwitchConfirmOpen, setIsKillSwitchConfirmOpen] = useState(false);

  const openCreateSheet = () => {
    setFormMode('create');
    setActiveFormCampaign(null);
    setIsFormOpen(true);
  };

  const openEditSheet = (campaign: ThemeCampaign) => {
    setFormMode('edit');
    setActiveFormCampaign(campaign);
    setIsFormOpen(true);
  };

  const openPreview = (campaign: ThemeCampaign | null) => {
    setPreviewCampaign(campaign);
    setIsPreviewOpen(true);
  };

  const openCreateThemeSheet = () => {
    setThemeFormMode('create');
    setActiveTheme(null);
    setIsThemeFormOpen(true);
  };

  const openEditThemeSheet = (theme: ThemeEntity) => {
    setThemeFormMode('edit');
    setActiveTheme(theme);
    setIsThemeFormOpen(true);
  };

  const handleFormSubmit = async (values: ThemeCampaignFormValues) => {
    if (formMode === 'edit' && activeFormCampaign) {
      const updated = await updateCampaign(activeFormCampaign.id, values);
      if (!updated) {
        throw new Error('Gagal memperbarui kampanye');
      }
      toast.success('Kampanye berhasil diperbarui');
      return;
    }
    const created = await createCampaign(values);
    if (!created) {
      throw new Error('Gagal membuat kampanye');
    }
    toast.success('Kampanye berhasil dibuat');
  };

  const handleThemeFormSubmit = async (values: ThemeMasterFormValues) => {
    if (themeFormMode === 'edit' && activeTheme) {
      const updated = await updateTheme(activeTheme.id, values);
      if (!updated) {
        throw new Error('Gagal memperbarui tema');
      }
      toast.success('Theme berhasil diperbarui');
      return;
    }

    const created = await createTheme(values);
    if (!created) {
      throw new Error('Gagal membuat tema');
    }
    toast.success('Theme berhasil dibuat');
  };

  const previewTheme = useMemo(
    () => themes.find((theme) => theme.id === previewCampaign?.theme_id) ?? null,
    [previewCampaign, themes]
  );

  return (
    <div className="space-y-5">
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Gagal memuat data kampanye terbaru</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-2">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={refresh}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Coba lagi
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as 'campaigns' | 'themes')}
        className="space-y-5"
      >
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="campaigns">Campaign</TabsTrigger>
          <TabsTrigger value="themes">Theme Master</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="space-y-5">
          <ThemeCampaignHeader
            onCreate={openCreateSheet}
            onPreviewActive={() => openPreview(activeCampaign)}
            onOpenKillSwitchConfirm={() => setIsKillSwitchConfirmOpen(true)}
          />

          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-28 rounded-xl" />
              ))}
            </div>
          ) : (
            <ThemeCampaignSummaryCards stats={stats} />
          )}

          <GlobalKillSwitchCard
            enabled={settings.global_kill_switch}
            onTrigger={() => setIsKillSwitchConfirmOpen(true)}
          />

          <ThemeCampaignTable
            campaigns={paginatedCampaigns}
            isLoading={isLoading}
            filters={filters}
            sortField={sortField}
            sortDirection={sortDirection}
            page={page}
            pageSize={pageSize}
            totalFiltered={totalFiltered}
            totalPages={totalPages}
            themeNameById={themeNameById}
            getStatus={getStatus}
            setFilter={setFilter}
            clearFilters={clearFilters}
            setSort={setSort}
            setPage={setPage}
            onView={(campaign) => openPreview(campaign)}
            onEdit={openEditSheet}
            onToggleEnabled={(campaign) => {
              void (async () => {
                const updated = await toggleCampaignEnabled(campaign.id);
                if (updated) {
                  toast.success(updated.enabled ? 'Kampanye diaktifkan' : 'Kampanye dinonaktifkan');
                }
              })();
            }}
            onPreview={(campaign) => openPreview(campaign)}
            onDuplicate={(campaign) => {
              void (async () => {
                const duplicated = await duplicateCampaign(campaign.id);
                if (duplicated) {
                  toast.success('Kampanye berhasil diduplikasi');
                }
              })();
            }}
            onDelete={(campaign) => setCampaignToDelete(campaign)}
          />

          <ThemeAuditLogTimeline logs={auditLogs} />
        </TabsContent>

        <TabsContent value="themes" className="space-y-5">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>Default theme aktif:</span>
            <Badge variant="outline">
              {themes.find((item) => item.id === settings.default_theme_id)?.name || '-'}
            </Badge>
            <span className="text-xs">({settings.default_theme_id || '-'})</span>
          </div>
          <ThemeMasterTable
            themes={themes}
            defaultThemeID={settings.default_theme_id}
            onCreate={openCreateThemeSheet}
            onEdit={openEditThemeSheet}
            onToggleActive={(theme) => {
              void (async () => {
                const updated = await toggleThemeActive(theme.id);
                if (updated) {
                  toast.success(updated.is_active ? 'Theme diaktifkan' : 'Theme dinonaktifkan');
                }
              })();
            }}
            onSetDefault={(theme) => {
              void (async () => {
                const updated = await setDefaultTheme(theme.id);
                if (updated) {
                  toast.success('Default theme berhasil diubah');
                }
              })();
            }}
          />
        </TabsContent>
      </Tabs>

      <ThemeCampaignFormSheet
        open={isFormOpen}
        mode={formMode}
        campaign={activeFormCampaign}
        themes={themes}
        iconPackOptions={availableVisualOptions.iconPacks}
        accentAssetOptions={availableVisualOptions.accentAssets}
        onOpenChange={setIsFormOpen}
        onSubmit={handleFormSubmit}
      />

      <ThemePreviewDialog
        open={isPreviewOpen}
        campaign={previewCampaign}
        theme={previewTheme}
        onOpenChange={setIsPreviewOpen}
      />

      <ThemeMasterFormSheet
        open={isThemeFormOpen}
        mode={themeFormMode}
        theme={activeTheme}
        iconPackOptions={availableVisualOptions.iconPacks}
        accentAssetOptions={availableVisualOptions.accentAssets}
        onOpenChange={setIsThemeFormOpen}
        onSubmit={handleThemeFormSubmit}
      />

      <AlertDialog open={Boolean(campaignToDelete)} onOpenChange={(open) => !open && setCampaignToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Kampanye</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Kampanye terpilih akan dihapus dari manajemen runtime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!campaignToDelete) return;
                void (async () => {
                  const deleted = await deleteCampaign(campaignToDelete.id);
                  if (deleted) {
                    toast.success('Kampanye berhasil dihapus');
                  }
                  setCampaignToDelete(null);
                })();
              }}
            >
              Hapus Kampanye
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isKillSwitchConfirmOpen} onOpenChange={setIsKillSwitchConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Global Kill Switch</AlertDialogTitle>
            <AlertDialogDescription>
              {settings.global_kill_switch
                ? 'Nonaktifkan global kill switch dan izinkan kampanye musiman aktif kembali?'
                : 'Aktifkan global kill switch dan rollback semua tema musiman ke tema dasar sekarang?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                void (async () => {
                  await toggleKillSwitch();
                  toast.success(
                    settings.global_kill_switch
                      ? 'Global kill switch dinonaktifkan'
                      : 'Global kill switch diaktifkan'
                  );
                  setIsKillSwitchConfirmOpen(false);
                })();
              }}
            >
              {settings.global_kill_switch ? 'Nonaktifkan Kill Switch' : 'Aktifkan Kill Switch'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
