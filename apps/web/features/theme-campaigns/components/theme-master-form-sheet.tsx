'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ThemeAssetManifest,
  ThemeEntity,
  ThemeMasterFormValues,
  ThemeTokenConfig,
} from '@/features/theme-campaigns/types/theme-campaign';

type FormMode = 'create' | 'edit';

interface ThemeMasterFormSheetProps {
  open: boolean;
  mode: FormMode;
  theme: ThemeEntity | null;
  iconPackOptions: string[];
  accentAssetOptions: string[];
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ThemeMasterFormValues) => Promise<void> | void;
}

interface FormDraft {
  code: string;
  name: string;
  type: 'base' | 'seasonal';
  is_active: boolean;
  token_json: ThemeTokenConfig;
  asset_manifest_json: ThemeAssetManifest;
}

const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const normalizeHexColor = (raw: string): string | null => {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  if (!HEX_COLOR_REGEX.test(withHash)) return null;

  if (withHash.length === 4) {
    const r = withHash[1];
    const g = withHash[2];
    const b = withHash[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }

  return withHash.toLowerCase();
};

const getColorPickerValue = (value: string, fallback: string): string =>
  normalizeHexColor(value) ?? fallback;

const EMPTY_TOKENS: ThemeTokenConfig = {
  accentColor: '#059669',
  accentSoftColor: '#d1fae5',
  loginCardBorder: '#34d399',
};

const EMPTY_ASSETS: ThemeAssetManifest = {
  backgroundImage: '',
  illustration: '',
  iconPack: 'outline-enterprise',
  accentAsset: 'none',
};

const EMPTY_FORM: FormDraft = {
  code: '',
  name: '',
  type: 'seasonal',
  is_active: true,
  token_json: { ...EMPTY_TOKENS },
  asset_manifest_json: { ...EMPTY_ASSETS },
};

const mapTokens = (value?: ThemeTokenConfig): ThemeTokenConfig => ({
  accentColor: value?.accentColor || EMPTY_TOKENS.accentColor,
  accentSoftColor: value?.accentSoftColor || EMPTY_TOKENS.accentSoftColor,
  loginCardBorder: value?.loginCardBorder || EMPTY_TOKENS.loginCardBorder,
});

const mapAssets = (value?: ThemeAssetManifest): ThemeAssetManifest => ({
  backgroundImage: value?.backgroundImage || '',
  illustration: value?.illustration || '',
  iconPack: value?.iconPack || EMPTY_ASSETS.iconPack,
  accentAsset: value?.accentAsset || EMPTY_ASSETS.accentAsset,
});

export function ThemeMasterFormSheet({
  open,
  mode,
  theme,
  iconPackOptions,
  accentAssetOptions,
  onOpenChange,
  onSubmit,
}: ThemeMasterFormSheetProps) {
  const [form, setForm] = useState<FormDraft>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && theme) {
      setForm({
        code: theme.code,
        name: theme.name,
        type: theme.type,
        is_active: theme.is_active,
        token_json: mapTokens(theme.token_json),
        asset_manifest_json: mapAssets(theme.asset_manifest_json),
      });
      setErrors({});
      setSubmitError(null);
      return;
    }

    setForm({
      ...EMPTY_FORM,
      token_json: { ...EMPTY_TOKENS },
      asset_manifest_json: { ...EMPTY_ASSETS },
    });
    setErrors({});
    setSubmitError(null);
  }, [mode, open, theme]);

  const updateField = <K extends keyof FormDraft>(key: K, value: FormDraft[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const updateTokenField = (key: keyof ThemeTokenConfig, value: string) => {
    setForm((current) => ({
      ...current,
      token_json: {
        ...current.token_json,
        [key]: value,
      },
    }));
  };

  const updateAssetField = (key: keyof ThemeAssetManifest, value: string) => {
    setForm((current) => ({
      ...current,
      asset_manifest_json: {
        ...current.asset_manifest_json,
        [key]: value,
      },
    }));
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    const normalizedAccentColor = normalizeHexColor(form.token_json.accentColor);
    const normalizedAccentSoftColor = normalizeHexColor(form.token_json.accentSoftColor);
    const normalizedLoginCardBorder = normalizeHexColor(form.token_json.loginCardBorder);

    if (!form.code.trim()) nextErrors.code = 'code wajib diisi.';
    if (!form.name.trim()) nextErrors.name = 'name wajib diisi.';
    if (!form.type) nextErrors.type = 'type wajib dipilih.';
    if (!normalizedAccentColor) {
      nextErrors.token_accentColor = 'accentColor harus HEX valid (contoh: #0f766e).';
    }
    if (!normalizedAccentSoftColor) {
      nextErrors.token_accentSoftColor = 'accentSoftColor harus HEX valid (contoh: #ccfbf1).';
    }
    if (!normalizedLoginCardBorder) {
      nextErrors.token_loginCardBorder = 'loginCardBorder harus HEX valid (contoh: #2dd4bf).';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return null;
    }

    return {
      accentColor: normalizedAccentColor!,
      accentSoftColor: normalizedAccentSoftColor!,
      loginCardBorder: normalizedLoginCardBorder!,
    } satisfies ThemeTokenConfig;
  };

  const handleSubmit = async () => {
    const normalizedTokens = validate();
    if (!normalizedTokens) return;
    setIsSubmitting(true);
    setSubmitError(null);

    const payload: ThemeMasterFormValues = {
      code: form.code.trim(),
      name: form.name.trim(),
      type: form.type,
      is_active: form.is_active,
      token_json: normalizedTokens,
      asset_manifest_json: { ...form.asset_manifest_json },
    };

    try {
      await onSubmit(payload);
      onOpenChange(false);
    } catch (error: unknown) {
      setSubmitError(error instanceof Error ? error.message : 'Gagal menyimpan tema');
    } finally {
      setIsSubmitting(false);
    }
  };

  const normalizedIconPackOptions =
    iconPackOptions.length > 0 ? Array.from(new Set(iconPackOptions)) : ['outline-enterprise'];
  const normalizedAccentAssetOptions =
    accentAssetOptions.length > 0 ? Array.from(new Set(accentAssetOptions)) : ['none'];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{mode === 'create' ? 'Tambah Theme Master' : 'Ubah Theme Master'}</SheetTitle>
          <SheetDescription>
            Kelola definisi tema dasar/musiman dan token visual global.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-180px)] pr-4">
          <div className="space-y-4">
            <section className="space-y-3 rounded-xl border bg-muted/20 p-4">
              <h3 className="font-medium">Informasi Dasar</h3>
              <div className="space-y-2">
                <Label htmlFor="theme_code">code *</Label>
                <Input
                  id="theme_code"
                  value={form.code}
                  onChange={(event) => updateField('code', event.target.value)}
                  placeholder="seasonal-lebaran-2026"
                />
                {errors.code && <p className="text-xs text-destructive">{errors.code}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="theme_name">name *</Label>
                <Input
                  id="theme_name"
                  value={form.name}
                  onChange={(event) => updateField('name', event.target.value)}
                  placeholder="Lebaran Ceria 2026"
                />
                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="theme_type">type *</Label>
                  <Select value={form.type} onValueChange={(value: 'base' | 'seasonal') => updateField('type', value)}>
                    <SelectTrigger id="theme_type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="base">base</SelectItem>
                      <SelectItem value="seasonal">seasonal</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.type && <p className="text-xs text-destructive">{errors.type}</p>}
                </div>
                <div className="flex items-center justify-between rounded-lg border bg-card p-3">
                  <Label htmlFor="theme_active">is_active</Label>
                  <Switch
                    id="theme_active"
                    checked={form.is_active}
                    onCheckedChange={(value) => updateField('is_active', value)}
                  />
                </div>
              </div>
            </section>

            <section className="space-y-3 rounded-xl border bg-muted/20 p-4">
              <h3 className="font-medium">Token Warna</h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <TokenColorField
                  id="token_accent"
                  label="accentColor"
                  value={form.token_json.accentColor}
                  fallback={EMPTY_TOKENS.accentColor}
                  error={errors.token_accentColor}
                  onTextChange={(value) => updateTokenField('accentColor', value)}
                  onColorChange={(value) => updateTokenField('accentColor', value)}
                />
                <TokenColorField
                  id="token_soft"
                  label="accentSoftColor"
                  value={form.token_json.accentSoftColor}
                  fallback={EMPTY_TOKENS.accentSoftColor}
                  error={errors.token_accentSoftColor}
                  onTextChange={(value) => updateTokenField('accentSoftColor', value)}
                  onColorChange={(value) => updateTokenField('accentSoftColor', value)}
                />
                <TokenColorField
                  id="token_border"
                  label="loginCardBorder"
                  value={form.token_json.loginCardBorder}
                  fallback={EMPTY_TOKENS.loginCardBorder}
                  error={errors.token_loginCardBorder}
                  onTextChange={(value) => updateTokenField('loginCardBorder', value)}
                  onColorChange={(value) => updateTokenField('loginCardBorder', value)}
                />
              </div>
            </section>

            <section className="space-y-3 rounded-xl border bg-muted/20 p-4">
              <h3 className="font-medium">Asset Manifest</h3>
              <div className="space-y-2">
                <Label htmlFor="asset_bg">backgroundImage</Label>
                <Input
                  id="asset_bg"
                  value={form.asset_manifest_json.backgroundImage}
                  onChange={(event) => updateAssetField('backgroundImage', event.target.value)}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="asset_illustration">illustration</Label>
                <Input
                  id="asset_illustration"
                  value={form.asset_manifest_json.illustration}
                  onChange={(event) => updateAssetField('illustration', event.target.value)}
                  placeholder="https://..."
                />
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="asset_icon_pack">iconPack</Label>
                  <Select
                    value={form.asset_manifest_json.iconPack}
                    onValueChange={(value) => updateAssetField('iconPack', value)}
                  >
                    <SelectTrigger id="asset_icon_pack">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {normalizedIconPackOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="asset_accent">accentAsset</Label>
                  <Select
                    value={form.asset_manifest_json.accentAsset}
                    onValueChange={(value) => updateAssetField('accentAsset', value)}
                  >
                    <SelectTrigger id="asset_accent">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {normalizedAccentAssetOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>

            <Separator />
            {submitError ? <p className="text-sm text-destructive">{submitError}</p> : null}
          </div>
        </ScrollArea>

        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Batal
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={isSubmitting}>
            {isSubmitting ? 'Menyimpan...' : mode === 'create' ? 'Buat Theme' : 'Simpan Perubahan'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

interface TokenColorFieldProps {
  id: string;
  label: string;
  value: string;
  fallback: string;
  error?: string;
  onTextChange: (value: string) => void;
  onColorChange: (value: string) => void;
}

function TokenColorField({
  id,
  label,
  value,
  fallback,
  error,
  onTextChange,
  onColorChange,
}: TokenColorFieldProps) {
  const colorValue = getColorPickerValue(value, fallback);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <span
          className="h-9 w-9 rounded-md border"
          style={{ backgroundColor: colorValue }}
          aria-hidden="true"
        />
        <Input
          id={id}
          value={value}
          onChange={(event) => onTextChange(event.target.value)}
          placeholder={fallback}
          className="font-mono"
        />
        <Input
          id={`${id}_picker`}
          type="color"
          value={colorValue}
          onChange={(event) => onColorChange(event.target.value)}
          className="h-9 w-12 cursor-pointer p-1"
          aria-label={`${label} color picker`}
        />
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
