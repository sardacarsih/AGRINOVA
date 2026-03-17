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

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const readModeString = (
  source: unknown,
  key: string,
  mode: 'light' | 'dark',
  fallback = '-'
): string => {
  const root = asRecord(source);
  const topLevel = typeof root[key] === 'string' ? String(root[key]).trim() : '';
  const modes = asRecord(root.modes);
  const modeEntry = asRecord(modes[mode]);
  const modeValue =
    typeof modeEntry[key] === 'string' ? String(modeEntry[key]).trim() : '';

  return modeValue || topLevel || fallback;
};

const readModeAccentColor = (
  theme: ThemeEntity,
  mode: 'light' | 'dark'
): string => readModeString(theme.token_json, 'accentColor', mode, '#999999');

function ModePairValue({
  light,
  dark,
}: {
  light: string;
  dark: string;
}) {
  if (light === dark) {
    return <span>{light || '-'}</span>;
  }

  return (
    <div className="space-y-1 text-xs">
      <div>
        <span className="font-medium text-muted-foreground">L:</span> {light || '-'}
      </div>
      <div>
        <span className="font-medium text-muted-foreground">D:</span> {dark || '-'}
      </div>
    </div>
  );
}

function AccentModePair({ theme }: { theme: ThemeEntity }) {
  const lightAccent = readModeAccentColor(theme, 'light');
  const darkAccent = readModeAccentColor(theme, 'dark');

  if (lightAccent === darkAccent) {
    return (
      <div className="flex items-center gap-2">
        <span
          className="h-3 w-3 rounded-full border"
          style={{ backgroundColor: lightAccent }}
          aria-hidden="true"
        />
        <span>{lightAccent}</span>
      </div>
    );
  }

  return (
    <div className="space-y-1 text-xs">
      <div className="flex items-center gap-2">
        <span className="font-medium text-muted-foreground">L:</span>
        <span
          className="h-3 w-3 rounded-full border"
          style={{ backgroundColor: lightAccent }}
          aria-hidden="true"
        />
        <span>{lightAccent}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-medium text-muted-foreground">D:</span>
        <span
          className="h-3 w-3 rounded-full border"
          style={{ backgroundColor: darkAccent }}
          aria-hidden="true"
        />
        <span>{darkAccent}</span>
      </div>
    </div>
  );
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
                const iconPackLight = readModeString(
                  theme.asset_manifest_json,
                  'iconPack',
                  'light'
                );
                const iconPackDark = readModeString(
                  theme.asset_manifest_json,
                  'iconPack',
                  'dark'
                );
                const accentAssetLight = readModeString(
                  theme.asset_manifest_json,
                  'accentAsset',
                  'light'
                );
                const accentAssetDark = readModeString(
                  theme.asset_manifest_json,
                  'accentAsset',
                  'dark'
                );
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
                    <TableCell>
                      <ModePairValue light={iconPackLight} dark={iconPackDark} />
                    </TableCell>
                    <TableCell>
                      <div className="space-y-2">
                        <ModePairValue light={accentAssetLight} dark={accentAssetDark} />
                        <AccentModePair theme={theme} />
                      </div>
                    </TableCell>
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
