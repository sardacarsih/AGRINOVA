'use client';

import React, { useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { RoleDashboardProps } from '@/features/dashboard/types/dashboard';
import { ManagerDashboardLayout } from '@/components/layouts/role-layouts/ManagerDashboardLayout';
import { ManagerHarvestTable } from './ManagerHarvestTable';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Building,
  Users,
  Activity,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Target,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  Loader2,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Leaf,
  Eye,
  Bell,
  Zap,
  Award,
  ChevronRight,
} from 'lucide-react';
import {
  GET_MANAGER_DASHBOARD,
  type GetManagerDashboardResponse,
  type ManagerDashboardStats,
  type ManagerActionItem,
  type TeamMemberPerformance,
  type ManagerTodayHighlights,
  type ManagerEvent,
  type ActionPriority,
  type EventSeverity,
} from '@/lib/apollo/queries/manager-dashboard';



// ============================================================================
// UTILITY HELPERS
// ============================================================================

function formatTons(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toFixed(1);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('id-ID').format(value);
}

function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

function formatRelativeTime(isoString: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Baru saja';
  if (diffMin < 60) return `${diffMin} menit lalu`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} jam lalu`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} hari lalu`;
}

function getPriorityConfig(priority: ActionPriority) {
  switch (priority) {
    case 'URGENT': return { color: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30', label: 'Urgent', dot: 'bg-red-500' };
    case 'HIGH': return { color: 'bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30', label: 'Tinggi', dot: 'bg-orange-500' };
    case 'MEDIUM': return { color: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30', label: 'Sedang', dot: 'bg-amber-500' };
    case 'LOW': return { color: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30', label: 'Rendah', dot: 'bg-emerald-500' };
    default: return { color: 'bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-500/30', label: priority, dot: 'bg-slate-500' };
  }
}

function getSeverityConfig(severity: EventSeverity) {
  switch (severity) {
    case 'CRITICAL': return { color: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/10', icon: AlertTriangle };
    case 'ERROR': return { color: 'text-red-500 dark:text-red-400', bg: 'bg-red-500/10', icon: XCircle };
    case 'WARNING': return { color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10', icon: AlertTriangle };
    case 'INFO': return { color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10', icon: Bell };
    default: return { color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-500/10', icon: Bell };
  }
}

function getTrendIcon(value: number) {
  if (value > 0) return { Icon: TrendingUp, color: 'text-emerald-600 dark:text-emerald-400', arrow: ArrowUpRight };
  if (value < 0) return { Icon: TrendingDown, color: 'text-red-500 dark:text-red-400', arrow: ArrowDownRight };
  return { Icon: Minus, color: 'text-slate-500 dark:text-slate-400', arrow: Minus };
}

function getGraphQLErrorMessage(error: unknown): string {
  if (!error) return 'Terjadi kesalahan';
  if (typeof error === 'string') return error;
  const e = error as { message?: string; graphQLErrors?: Array<{ message: string }> };
  if (e.graphQLErrors?.length) return e.graphQLErrors[0].message;
  return e.message || 'Terjadi kesalahan saat memuat data';
}

// ============================================================================
// SKELETON LOADER
// ============================================================================

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>

      {/* Stats Grid Skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-8 rounded-lg" />
                </div>
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-3 w-32" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Body Skeleton */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <Skeleton className="h-6 w-36 mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-6 w-28 mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============================================================================
// ERROR STATE
// ============================================================================

function DashboardErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Card className="w-full max-w-lg border-destructive/30">
        <CardContent className="p-8 text-center space-y-4">
          <div className="mx-auto w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-7 w-7 text-destructive" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Gagal Memuat Dashboard</h3>
            <p className="text-sm text-muted-foreground mt-1">{message}</p>
          </div>
          <Button onClick={onRetry} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Coba Lagi
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// KPI STAT CARD
// ============================================================================

interface StatCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  trend?: { value: number; label: string } | null;
  accentGradient: string;
}

function StatCard({ title, value, subtitle, icon: Icon, iconBg, iconColor, trend, accentGradient }: StatCardProps) {
  const trendInfo = trend ? getTrendIcon(trend.value) : null;

  return (
    <Card className="group relative overflow-hidden border-border/50 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/5 hover:border-emerald-500/20">
      {/* Top accent gradient bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${accentGradient}`} />
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <p className="text-[13px] font-medium text-muted-foreground tracking-wide">{title}</p>
          <div className={`p-2 rounded-xl ${iconBg} transition-transform duration-300 group-hover:scale-110`}>
            <Icon className={`h-4.5 w-4.5 ${iconColor}`} />
          </div>
        </div>
        <div className="space-y-1.5">
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          <div className="flex items-center gap-2">
            {trendInfo && trend && (
              <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${trendInfo.color}`}>
                <trendInfo.arrow className="h-3.5 w-3.5" />
                {formatPercent(trend.value)}
              </span>
            )}
            <span className="text-xs text-muted-foreground">{subtitle}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// TODAY HIGHLIGHTS SECTION
// ============================================================================

function TodayHighlightsSection({ highlights }: { highlights: ManagerTodayHighlights }) {
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10">
            <Zap className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <CardTitle className="text-base">Ringkasan Hari Ini</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-xl bg-blue-500/5 border border-blue-500/10 p-3 text-center">
            <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{highlights.totalHarvestsToday}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Total Panen</p>
          </div>
          <div className="rounded-xl bg-amber-500/5 border border-amber-500/10 p-3 text-center">
            <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{highlights.pendingApprovals}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Menunggu</p>
          </div>
          <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/10 p-3 text-center">
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{highlights.approvedToday}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Disetujui</p>
          </div>
          <div className="rounded-xl bg-red-500/5 border border-red-500/10 p-3 text-center">
            <p className="text-xl font-bold text-red-600 dark:text-red-400">{highlights.rejectedToday}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Ditolak</p>
          </div>
        </div>

        {/* Production vs Yesterday */}
        {highlights.productionVsYesterday !== undefined && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2">
            {(() => {
              const t = getTrendIcon(highlights.productionVsYesterday);
              return (
                <>
                  <t.Icon className={`h-4 w-4 ${t.color}`} />
                  <span className={`text-sm font-medium ${t.color}`}>
                    {formatPercent(highlights.productionVsYesterday)}
                  </span>
                  <span className="text-xs text-muted-foreground">produksi vs kemarin</span>
                </>
              );
            })()}
          </div>
        )}

        {/* Recent Events */}
        {highlights.events.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Aktivitas Terbaru</p>
            {highlights.events.slice(0, 4).map((event: ManagerEvent) => {
              const sev = getSeverityConfig(event.severity);
              const SevIcon = sev.icon;
              return (
                <div key={event.id} className={`flex items-start gap-2.5 rounded-lg ${sev.bg} px-3 py-2`}>
                  <SevIcon className={`h-4 w-4 mt-0.5 shrink-0 ${sev.color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-snug">{event.message}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {formatRelativeTime(event.occurredAt)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// ACTION ITEMS SECTION
// ============================================================================

function ActionItemsSection({ items }: { items: ManagerActionItem[] }) {
  if (items.length === 0) {
    return (
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10">
              <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <CardTitle className="text-base">Action Items</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle className="h-10 w-10 text-emerald-500/40 mb-2" />
            <p className="text-sm text-muted-foreground">Tidak ada action item saat ini</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-orange-500/10">
              <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </div>
            <CardTitle className="text-base">Action Items</CardTitle>
          </div>
          <Badge variant="secondary" className="text-[11px]">{items.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        {items.slice(0, 5).map((item) => {
          const p = getPriorityConfig(item.priority);
          return (
            <div key={item.id} className="group flex items-start gap-3 rounded-lg border border-border/40 p-3 transition-colors hover:bg-muted/30">
              <div className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${p.dot}`} />
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium leading-snug truncate">{item.title}</p>
                  <Badge variant="outline" className={`text-[10px] shrink-0 ${p.color}`}>{p.label}</Badge>
                </div>
                {item.description && (
                  <p className="text-xs text-muted-foreground line-clamp-1">{item.description}</p>
                )}
                {item.dueAt && (
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{formatRelativeTime(item.dueAt)}</span>
                  </div>
                )}
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/50 mt-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// TEAM SUMMARY SECTION
// ============================================================================

function TeamSummarySection({ summary }: { summary: { totalMandors: number; activeMandorsToday: number; totalAsistens: number; topPerformers: TeamMemberPerformance[]; needsAttention: TeamMemberPerformance[] } }) {
  const mandorPercent = summary.totalMandors > 0 ? (summary.activeMandorsToday / summary.totalMandors) * 100 : 0;

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-500/10">
            <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle className="text-base">Ringkasan Tim</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {/* Team Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <p className="text-lg font-bold">{summary.totalMandors}</p>
            <p className="text-[11px] text-muted-foreground">Mandor</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{summary.activeMandorsToday}</p>
            <p className="text-[11px] text-muted-foreground">Aktif Hari Ini</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold">{summary.totalAsistens}</p>
            <p className="text-[11px] text-muted-foreground">Asisten</p>
          </div>
        </div>

        {/* Mandor Activity Progress */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Kehadiran Mandor</span>
            <span className="font-medium">{mandorPercent.toFixed(0)}%</span>
          </div>
          <Progress value={mandorPercent} className="h-2" />
        </div>

        {/* Top Performers */}
        {summary.topPerformers.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Award className="h-3.5 w-3.5 text-amber-500" />
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Top Performer</p>
            </div>
            {summary.topPerformers.slice(0, 3).map((member, idx) => {
              const trend = getTrendIcon(member.weeklyTrend);
              return (
                <div key={member.userId} className="flex items-center gap-3 rounded-lg bg-muted/20 px-3 py-2">
                  <span className="text-xs font-bold text-muted-foreground w-5">#{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{member.name}</p>
                    <p className="text-[11px] text-muted-foreground">{member.assignment}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold">{member.recordsToday}</p>
                    <span className={`text-[10px] ${trend.color}`}>{formatPercent(member.weeklyTrend)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Needs Attention */}
        {summary.needsAttention.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Perlu Perhatian</p>
            </div>
            {summary.needsAttention.slice(0, 3).map((member) => (
              <div key={member.userId} className="flex items-center gap-3 rounded-lg bg-red-500/5 border border-red-500/10 px-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{member.name}</p>
                  <p className="text-[11px] text-muted-foreground">{member.assignment}</p>
                </div>
                <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20">
                  Score: {member.performanceScore.toFixed(0)}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// TARGET ACHIEVEMENT RING
// ============================================================================

function TargetAchievementWidget({ stats }: { stats: ManagerDashboardStats }) {
  const percent = Math.min(stats.targetAchievement, 150);
  const clampedPercent = Math.min(percent, 100);
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (clampedPercent / 100) * circumference;
  const ringColor = percent >= 100 ? 'text-emerald-500' : percent >= 75 ? 'text-amber-500' : 'text-red-500';

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-violet-500/10">
            <Target className="h-4 w-4 text-violet-600 dark:text-violet-400" />
          </div>
          <CardTitle className="text-base">Target Bulanan</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-0 flex flex-col items-center">
        {/* Circular Progress */}
        <div className="relative w-28 h-28 mb-3">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="8"
              className="text-muted/20" />
            <circle cx="50" cy="50" r="40" fill="none" strokeWidth="8" strokeLinecap="round"
              className={`${ringColor} transition-all duration-1000 ease-out`}
              style={{ strokeDasharray: circumference, strokeDashoffset }}
              stroke="currentColor" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-bold">{stats.targetAchievement.toFixed(1)}%</span>
          </div>
        </div>

        {/* Production Details */}
        <div className="w-full space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Realisasi</span>
            <span className="font-semibold">{formatTons(stats.monthlyProduction)} ton</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Target</span>
            <span className="font-semibold">{formatTons(stats.monthlyTarget)} ton</span>
          </div>
          <div className="flex items-center justify-between text-sm border-t pt-2">
            <span className="text-muted-foreground">Minggu ini</span>
            <span className="font-semibold">{formatTons(stats.weeklyProduction)} ton</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// ESTATE OVERVIEW SECTION
// ============================================================================

function EstateOverviewWidget({ stats }: { stats: ManagerDashboardStats }) {
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-teal-500/10">
            <Building className="h-4 w-4 text-teal-600 dark:text-teal-400" />
          </div>
          <CardTitle className="text-base">Struktur Estate</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-gradient-to-br from-teal-500/5 to-emerald-500/5 border border-teal-500/10 p-3 text-center">
            <p className="text-xl font-bold">{stats.totalEstates}</p>
            <p className="text-[11px] text-muted-foreground">Estates</p>
          </div>
          <div className="rounded-xl bg-gradient-to-br from-blue-500/5 to-cyan-500/5 border border-blue-500/10 p-3 text-center">
            <p className="text-xl font-bold">{stats.totalDivisions}</p>
            <p className="text-[11px] text-muted-foreground">Divisi</p>
          </div>
          <div className="rounded-xl bg-gradient-to-br from-violet-500/5 to-purple-500/5 border border-violet-500/10 p-3 text-center">
            <p className="text-xl font-bold">{formatNumber(stats.totalBlocks)}</p>
            <p className="text-[11px] text-muted-foreground">Blok</p>
          </div>
          <div className="rounded-xl bg-gradient-to-br from-amber-500/5 to-orange-500/5 border border-amber-500/10 p-3 text-center">
            <p className="text-xl font-bold">{formatNumber(stats.totalEmployees)}</p>
            <p className="text-[11px] text-muted-foreground">Karyawan</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN DASHBOARD COMPONENT
// ============================================================================

function ManagerDashboard({ role: _role }: RoleDashboardProps) {
  const { data, loading, error, refetch } = useQuery<GetManagerDashboardResponse>(GET_MANAGER_DASHBOARD, {
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all',
  });

  const dashboard = data?.managerDashboard;
  const stats = dashboard?.stats;
  const userName = dashboard?.user?.name || dashboard?.user?.username || 'Manager';

  // Determine greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Selamat Pagi';
    if (hour < 15) return 'Selamat Siang';
    if (hour < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  }, []);

  if (loading && !data) {
    return (
      <ManagerDashboardLayout>
        <DashboardSkeleton />
      </ManagerDashboardLayout>
    );
  }

  if (error && !data) {
    return (
      <ManagerDashboardLayout>
        <DashboardErrorState
          message={getGraphQLErrorMessage(error)}
          onRetry={() => refetch()}
        />
      </ManagerDashboardLayout>
    );
  }

  if (!dashboard || !stats) {
    return (
      <ManagerDashboardLayout>
        <DashboardErrorState
          message="Data dashboard tidak tersedia"
          onRetry={() => refetch()}
        />
      </ManagerDashboardLayout>
    );
  }

  return (
    <ManagerDashboardLayout>
      <div className="space-y-6 animate-in fade-in duration-500">
        {/* ===== HEADER ===== */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {greeting}, {userName}! 👋
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {dashboard.estates.length > 0
                ? `Mengelola ${stats.totalEstates} estate · ${stats.totalDivisions} divisi · ${formatNumber(stats.totalEmployees)} karyawan`
                : 'Estate Management Dashboard'}
            </p>
          </div>
          <Button
            onClick={() => refetch()}
            variant="outline"
            size="sm"
            className="gap-2 self-start"
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
        </div>

        {/* Show partial error as banner */}
        {error && data && (
          <Alert variant="warning" className="bg-amber-500/5 border-amber-500/20">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Beberapa data mungkin tidak terbaru. <button className="underline font-medium" onClick={() => refetch()}>Coba refresh</button>
            </AlertDescription>
          </Alert>
        )}

        {/* ===== KPI STATS GRID ===== */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Produksi Hari Ini"
            value={`${formatTons(stats.todayProduction)} ton`}
            subtitle="produksi harian"
            icon={Leaf}
            iconBg="bg-emerald-500/10"
            iconColor="text-emerald-600 dark:text-emerald-400"
            accentGradient="bg-gradient-to-r from-emerald-500 to-teal-500"
          />
          <StatCard
            title="Target Achievement"
            value={`${stats.targetAchievement.toFixed(1)}%`}
            subtitle={`${formatTons(stats.monthlyProduction)}/${formatTons(stats.monthlyTarget)} ton`}
            icon={Target}
            iconBg="bg-violet-500/10"
            iconColor="text-violet-600 dark:text-violet-400"
            accentGradient="bg-gradient-to-r from-violet-500 to-purple-500"
          />
          <StatCard
            title="Panen Aktif"
            value={formatNumber(stats.activeHarvests)}
            subtitle="kegiatan panen"
            icon={Activity}
            iconBg="bg-blue-500/10"
            iconColor="text-blue-600 dark:text-blue-400"
            accentGradient="bg-gradient-to-r from-blue-500 to-cyan-500"
          />
          <StatCard
            title="Pending Approvals"
            value={formatNumber(stats.pendingApprovals)}
            subtitle="menunggu review"
            icon={Clock}
            iconBg="bg-orange-500/10"
            iconColor="text-orange-600 dark:text-orange-400"
            accentGradient="bg-gradient-to-r from-orange-500 to-amber-500"
          />
        </div>

        {/* ===== HIGHLIGHTS + TARGET + ESTATE OVERVIEW ===== */}
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <TodayHighlightsSection highlights={dashboard.todayHighlights} />
          </div>
          <div className="space-y-4">
            <TargetAchievementWidget stats={stats} />
          </div>
        </div>

        {/* ===== TEAM SUMMARY + ACTION ITEMS ===== */}
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ActionItemsSection items={dashboard.actionItems} />
          </div>
          <div>
            <TeamSummarySection summary={dashboard.teamSummary} />
          </div>
        </div>

        {/* ===== ESTATE STRUCTURE ===== */}
        <EstateOverviewWidget stats={stats} />

        {/* ===== HARVEST DATA TABLE ===== */}
        <ManagerHarvestTable pageSize={10} />

        {/* ===== QUICK LINKS ===== */}
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          {[
            { label: 'Approval Panen', href: '/approvals', icon: CheckCircle, color: 'text-emerald-600 dark:text-emerald-400' },
            { label: 'Analytics', href: '/analytics', icon: BarChart3, color: 'text-blue-600 dark:text-blue-400' },
            { label: 'Budget Divisi', href: '/budget-divisi', icon: FileText, color: 'text-violet-600 dark:text-violet-400' },
            { label: 'Laporan', href: '/reports', icon: Eye, color: 'text-amber-600 dark:text-amber-400' },
          ].map((link) => (
            <a key={link.href} href={link.href}>
              <Card className="group cursor-pointer border-border/40 transition-all duration-200 hover:shadow-md hover:border-emerald-500/20">
                <CardContent className="p-4 flex items-center gap-3">
                  <link.icon className={`h-5 w-5 ${link.color}`} />
                  <span className="text-sm font-medium">{link.label}</span>
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/50 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </CardContent>
              </Card>
            </a>
          ))}
        </div>
      </div>
    </ManagerDashboardLayout>
  );
}

export default ManagerDashboard;
