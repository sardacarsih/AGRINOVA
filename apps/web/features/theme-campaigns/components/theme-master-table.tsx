'use client';

import { MoreHorizontal, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ThemeEntity } from '@/features/theme-campaigns/types/theme-campaign';

interface ThemeMasterTableProps {
  themes: ThemeEntity[];
  defaultThemeID: string;
  onCreate: () => void;
  onEdit: (theme: ThemeEntity) => void;
  onToggleActive: (theme: ThemeEntity) => void;
  onSetDefault: (theme: ThemeEntity) => void;
}

export function ThemeMasterTable({
  themes,
  defaultThemeID,
  onCreate,
  onEdit,
  onToggleActive,
  onSetDefault,
}: ThemeMasterTableProps) {
  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle>Theme Master</CardTitle>
            <p className="text-sm text-muted-foreground">
              Definisi tema global yang bisa dipakai oleh campaign.
            </p>
          </div>
          <Button onClick={onCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Tambah Theme
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Default</TableHead>
                <TableHead>Icon Pack</TableHead>
                <TableHead>Accent</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {themes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    Belum ada data Theme Master.
                  </TableCell>
                </TableRow>
              )}
              {themes.map((theme) => {
                const isDefault = theme.id === defaultThemeID;
                return (
                  <TableRow key={theme.id}>
                    <TableCell className="min-w-48 font-medium">{theme.name}</TableCell>
                    <TableCell>{theme.code}</TableCell>
                    <TableCell>
                      <Badge variant={theme.type === 'base' ? 'default' : 'secondary'}>
                        {theme.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={theme.is_active}
                        onCheckedChange={() => onToggleActive(theme)}
                        aria-label={`Toggle active ${theme.name}`}
                      />
                    </TableCell>
                    <TableCell>
                      {isDefault ? <Badge variant="outline">Default Aktif</Badge> : '-'}
                    </TableCell>
                    <TableCell>{theme.asset_manifest_json.iconPack || '-'}</TableCell>
                    <TableCell>{theme.asset_manifest_json.accentAsset || '-'}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem onClick={() => onEdit(theme)}>Ubah</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onToggleActive(theme)}>
                            {theme.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => onSetDefault(theme)}
                            disabled={isDefault || !theme.is_active}
                          >
                            Jadikan Default
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
      </CardContent>
    </Card>
  );
}
