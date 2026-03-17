'use client';

import { ThemeAppUiSlot, ThemeAppUiSlots } from '@/features/theme-campaigns/types/theme-campaign';
import { cn } from '@/lib/utils';

interface MobileAppUiRuntimePreviewProps {
  slots?: ThemeAppUiSlots;
  className?: string;
  compact?: boolean;
}

const hasValue = (value?: string): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const withFallback = (value: string | undefined, fallback: string): string =>
  hasValue(value) ? value.trim() : fallback;

const normalizeSlot = (slot?: ThemeAppUiSlot) => ({
  backgroundColor: withFallback(slot?.backgroundColor, '#0F172A'),
  foregroundColor: withFallback(slot?.foregroundColor, '#F8FAFC'),
  textColor: withFallback(slot?.textColor, '#E2E8F0'),
  borderColor: withFallback(slot?.borderColor, '#1E293B'),
  accentColor: withFallback(slot?.accentColor, '#38BDF8'),
  iconColor: withFallback(slot?.iconColor, '#CBD5E1'),
  asset: withFallback(slot?.asset, ''),
});

export function MobileAppUiRuntimePreview({
  slots,
  className,
  compact = false,
}: MobileAppUiRuntimePreviewProps) {
  const navbar = normalizeSlot(slots?.navbar);
  const sidebar = normalizeSlot(slots?.sidebar);
  const footer = normalizeSlot(slots?.footer);
  const dashboard = normalizeSlot(slots?.dashboard);
  const notificationBanner = normalizeSlot(slots?.notification_banner);
  const emptyState = normalizeSlot(slots?.empty_state_illustration);
  const modalAccent = normalizeSlot(slots?.modal_accent);

  const sectionPaddingClass = compact ? 'p-2' : 'p-3';
  const textSizeClass = compact ? 'text-[10px]' : 'text-xs';

  return (
    <div
      className={cn('relative overflow-hidden rounded-2xl border shadow-sm', className)}
      style={{
        backgroundColor: dashboard.backgroundColor,
        color: dashboard.textColor,
        borderColor: dashboard.borderColor,
      }}
    >
      <div
        className="flex items-center justify-between border-b px-3 py-2"
        style={{
          backgroundColor: navbar.backgroundColor,
          color: navbar.textColor,
          borderColor: navbar.borderColor,
        }}
      >
        <div className={cn('font-medium', textSizeClass)}>Navbar</div>
        <div className="flex items-center gap-1">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: navbar.iconColor }}
            aria-hidden
          />
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: navbar.accentColor }}
            aria-hidden
          />
        </div>
      </div>

      <div className={cn('space-y-2', sectionPaddingClass)}>
        <div
          className="rounded-md border px-2 py-1"
          style={{
            backgroundColor: notificationBanner.backgroundColor,
            color: notificationBanner.textColor,
            borderColor: notificationBanner.borderColor,
          }}
        >
          <p className={cn('font-medium', textSizeClass)}>Notification banner</p>
        </div>

        <div
          className="rounded-md border p-2"
          style={{
            backgroundColor: dashboard.foregroundColor,
            color: dashboard.textColor,
            borderColor: dashboard.borderColor,
          }}
        >
          <p className={cn('font-medium', textSizeClass)}>Dashboard card</p>
          <div
            className="mt-2 h-1 rounded-full"
            style={{ backgroundColor: dashboard.accentColor }}
            aria-hidden
          />
        </div>

        <div
          className="rounded-md border border-dashed p-2"
          style={{
            backgroundColor: emptyState.backgroundColor,
            color: emptyState.textColor,
            borderColor: emptyState.borderColor,
          }}
        >
          <p className={cn('font-medium', textSizeClass)}>Empty state</p>
          {hasValue(emptyState.asset) ? (
            <p className={cn('mt-1 truncate text-[10px]', compact ? '' : 'max-w-[210px]')}>
              {emptyState.asset}
            </p>
          ) : (
            <p className="mt-1 text-[10px] opacity-80">asset belum diisi</p>
          )}
        </div>

        <div
          className="rounded-md border p-2"
          style={{
            backgroundColor: modalAccent.backgroundColor,
            color: modalAccent.textColor,
            borderColor: modalAccent.borderColor,
          }}
        >
          <p className={cn('font-medium', textSizeClass)}>Modal accent</p>
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              className="rounded px-2 py-1 text-[10px] font-semibold"
              style={{
                backgroundColor: modalAccent.accentColor,
                color: modalAccent.foregroundColor,
              }}
            >
              Action
            </button>
          </div>
        </div>
      </div>

      <div
        className="relative flex items-center justify-around border-t px-2 py-2"
        style={{
          backgroundColor: footer.backgroundColor,
          color: footer.textColor,
          borderColor: footer.borderColor,
        }}
      >
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: footer.iconColor }} aria-hidden />
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: footer.accentColor }} aria-hidden />
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: footer.iconColor }} aria-hidden />
      </div>

      <div
        className="pointer-events-none absolute right-2 top-12 w-24 rounded-md border p-2 text-[10px]"
        style={{
          backgroundColor: sidebar.backgroundColor,
          color: sidebar.textColor,
          borderColor: sidebar.borderColor,
        }}
      >
        <p className="font-medium">Sidebar</p>
        <div className="mt-1 h-1 rounded-full" style={{ backgroundColor: sidebar.accentColor }} />
      </div>
    </div>
  );
}
