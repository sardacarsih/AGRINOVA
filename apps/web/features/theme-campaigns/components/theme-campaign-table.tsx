'use client';

import { ArrowDown, ArrowUp, ArrowUpDown, MoreHorizontal, Search } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ThemeCampaignStatusBadge } from '@/features/theme-campaigns/components/theme-campaign-status-badge';
import {
  SortDirection,
  ThemeCampaign,
  ThemeCampaignFilters,
  ThemeCampaignSortField,
  ThemeCampaignStatus,
} from '@/features/theme-campaigns/types/theme-campaign';

interface ThemeCampaignTableProps {
  campaigns: ThemeCampaign[];
  isLoading: boolean;
  filters: ThemeCampaignFilters;
  sortField: ThemeCampaignSortField;
  sortDirection: SortDirection;
  page: number;
  pageSize: number;
  totalFiltered: number;
  totalPages: number;
  themeNameById: Record<string, string>;
  getStatus: (campaign: ThemeCampaign) => ThemeCampaignStatus;
  setFilter: <K extends keyof ThemeCampaignFilters>(key: K, value: ThemeCampaignFilters[K]) => void;
  clearFilters: () => void;
  setSort: (field: ThemeCampaignSortField) => void;
  setPage: (page: number) => void;
  onView: (campaign: ThemeCampaign) => void;
  onEdit: (campaign: ThemeCampaign) => void;
  onToggleEnabled: (campaign: ThemeCampaign) => void;
  onPreview: (campaign: ThemeCampaign) => void;
  onDuplicate: (campaign: ThemeCampaign) => void;
  onDelete: (campaign: ThemeCampaign) => void;
}

const SORTABLE_FIELDS: Array<{ label: string; field: ThemeCampaignSortField }> = [
  { label: 'Nama Kampanye', field: 'campaign_name' },
  { label: 'Nama Tema', field: 'theme_name' },
  { label: 'Status', field: 'status' },
  { label: 'Prioritas', field: 'priority' },
  { label: 'Mulai', field: 'start_at' },
  { label: 'Selesai', field: 'end_at' },
  { label: 'Diperbarui', field: 'updated_at' },
];

const formatDateTime = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const renderSortIcon = (
  field: ThemeCampaignSortField,
  activeField: ThemeCampaignSortField,
  direction: SortDirection
) => {
  if (activeField !== field) return <ArrowUpDown className="h-3.5 w-3.5" />;
  return direction === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />;
};

export function ThemeCampaignTable({
  campaigns,
  isLoading,
  filters,
  sortField,
  sortDirection,
  page,
  pageSize,
  totalFiltered,
  totalPages,
  themeNameById,
  getStatus,
  setFilter,
  clearFilters,
  setSort,
  setPage,
  onView,
  onEdit,
  onToggleEnabled,
  onPreview,
  onDuplicate,
  onDelete,
}: ThemeCampaignTableProps) {
  const from = totalFiltered === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalFiltered);

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <CardTitle>Daftar Kampanye</CardTitle>
          <div className="grid w-full gap-2 sm:grid-cols-2 xl:w-auto xl:grid-cols-2">
            <div className="relative sm:col-span-2 xl:min-w-72">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Cari kampanye, tema, deskripsi..."
                value={filters.search}
                onChange={(event) => setFilter('search', event.target.value)}
              />
            </div>
            <Select
              value={filters.status}
              onValueChange={(value: ThemeCampaignFilters['status']) => setFilter('status', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="SCHEDULED">Terjadwal</SelectItem>
                <SelectItem value="ACTIVE">Aktif</SelectItem>
                <SelectItem value="EXPIRED">Kedaluwarsa</SelectItem>
                <SelectItem value="DISABLED">Nonaktif</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {SORTABLE_FIELDS.map((item) => (
            <Button
              key={item.field}
              variant={sortField === item.field ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setSort(item.field)}
            >
              {item.label}
              <span className="ml-1">{renderSortIcon(item.field, sortField, sortDirection)}</span>
            </Button>
          ))}
          <Button variant="ghost" size="sm" onClick={clearFilters} className="ml-auto">
            Reset Filter
          </Button>
        </div>

        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Kampanye</TableHead>
                <TableHead>Nama Tema</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Prioritas</TableHead>
                <TableHead>Mulai</TableHead>
                <TableHead>Selesai</TableHead>
                <TableHead>Aktif</TableHead>
                <TableHead>Diperbarui Oleh</TableHead>
                <TableHead>Diperbarui Pada</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading &&
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={`loading-${index}`}>
                    <TableCell colSpan={10}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))}

              {!isLoading && campaigns.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                    Tidak ada kampanye yang cocok dengan filter saat ini.
                  </TableCell>
                </TableRow>
              )}

              {!isLoading &&
                campaigns.map((campaign) => {
                  const status = getStatus(campaign);
                  return (
                    <TableRow key={campaign.id}>
                      <TableCell className="min-w-48">
                        <div className="font-medium">{campaign.campaign_name}</div>
                        <div className="text-xs text-muted-foreground">{campaign.description}</div>
                      </TableCell>
                      <TableCell>{themeNameById[campaign.theme_id] ?? 'Tema Tidak Dikenal'}</TableCell>
                      <TableCell>
                        <ThemeCampaignStatusBadge status={status} />
                      </TableCell>
                      <TableCell>{campaign.priority}</TableCell>
                      <TableCell>{formatDateTime(campaign.start_at)}</TableCell>
                      <TableCell>{formatDateTime(campaign.end_at)}</TableCell>
                      <TableCell>
                        <Switch
                          checked={campaign.enabled}
                          onCheckedChange={() => onToggleEnabled(campaign)}
                          aria-label={`Toggle ${campaign.campaign_name}`}
                        />
                      </TableCell>
                      <TableCell>{campaign.updated_by}</TableCell>
                      <TableCell>{formatDateTime(campaign.updated_at)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onClick={() => onView(campaign)}>Lihat</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onEdit(campaign)}>Ubah</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onToggleEnabled(campaign)}>
                              {campaign.enabled ? 'Nonaktifkan' : 'Aktifkan'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onPreview(campaign)}>Pratinjau</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onDuplicate(campaign)}>Duplikat</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => onDelete(campaign)} className="text-destructive">
                              Hapus
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground">
            Menampilkan {from}-{to} dari {totalFiltered} kampanye
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(page - 1)} disabled={page <= 1}>
              Sebelumnya
            </Button>
            <span className="text-muted-foreground">
              Halaman {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages}
            >
              Berikutnya
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
