"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@apollo/client/react";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Image as ImageIcon,
  RefreshCw,
  Search,
  ShieldCheck,
  ShieldX,
  TimerReset,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useGraphQLMutation } from "@/hooks/use-graphql-mutation";
import { useHarvestSubscriptions } from "@/hooks/use-graphql-subscriptions";
import { RoleDashboardProps } from "@/features/dashboard/types/dashboard";
import { AsistenDashboardLayout } from "@/components/layouts/role-layouts/AsistenDashboardLayout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { resolveMediaUrl } from "@/lib/utils/media-url";
import {
  GET_HARVEST_RECORDS_BY_STATUS,
  GET_MY_ASSIGNMENTS,
  APPROVE_HARVEST_RECORD,
  REJECT_HARVEST_RECORD,
  type ApproveHarvestInput,
  type RejectHarvestInput,
  type GetHarvestRecordsByStatusResponse,
  type GetMyAssignmentsResponse,
  type ApproveHarvestRecordResponse,
  type RejectHarvestRecordResponse,
} from "@/lib/apollo/queries/harvest";

type ApproveHarvestRecordVariables = { input: ApproveHarvestInput };
type RejectHarvestRecordVariables = { input: RejectHarvestInput };
type QueueFilter = "ALL" | "URGENT" | "NORMAL";
type RejectReasonKey =
  | "DATA_TIDAK_SESUAI"
  | "KUALITAS_TIDAK_VALID"
  | "LOKASI_TIDAK_VALID"
  | "FOTO_TIDAK_JELAS"
  | "PERLU_VERIFIKASI_ULANG";
type TrendEvent = {
  recordId: string;
  status: "APPROVED" | "REJECTED";
  decidedAt: string;
};

const URGENT_HOURS = 24;
const QUEUE_PAGE_SIZE = 8;
const REJECT_REASON_OPTIONS: Array<{
  key: RejectReasonKey;
  label: string;
  template: string;
}> = [
  {
    key: "DATA_TIDAK_SESUAI",
    label: "Data tidak sesuai",
    template: "Data panen tidak sesuai dengan catatan lapangan.",
  },
  {
    key: "KUALITAS_TIDAK_VALID",
    label: "Kualitas tidak valid",
    template: "Komposisi kualitas janjang belum valid.",
  },
  {
    key: "LOKASI_TIDAK_VALID",
    label: "Lokasi tidak valid",
    template: "Lokasi panen belum sesuai titik blok.",
  },
  {
    key: "FOTO_TIDAK_JELAS",
    label: "Foto tidak jelas",
    template: "Foto panen belum jelas atau belum tersedia.",
  },
  {
    key: "PERLU_VERIFIKASI_ULANG",
    label: "Verifikasi ulang",
    template: "Data perlu verifikasi ulang oleh mandor.",
  },
];
const DEFAULT_REJECT_REASON_KEY: RejectReasonKey = "DATA_TIDAK_SESUAI";

const getHoursSince = (dateString: string) =>
  Math.max(0, (Date.now() - new Date(dateString).getTime()) / 3600000);
const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const toDayKey = (value?: string) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return toDateKey(parsed);
};
const getHarvestPhotoUrl = (value?: string | null) =>
  value ? resolveMediaUrl(value) : "";
const getRejectReasonOption = (key?: RejectReasonKey) =>
  REJECT_REASON_OPTIONS.find((option) => option.key === key) ||
  REJECT_REASON_OPTIONS[0];
const buildRejectReasonText = (reasonKey?: RejectReasonKey, note?: string) => {
  const option = getRejectReasonOption(reasonKey);
  const cleanNote = (note || "").trim();
  if (!cleanNote) {
    return option.template;
  }
  return `${option.template} Catatan: ${cleanNote}`;
};
const normalizeRejectReasonLabel = (reason?: string | null) => {
  const value = (reason || "Tanpa alasan").trim();
  const matched = REJECT_REASON_OPTIONS.find((option) =>
    value.startsWith(option.template),
  );
  return matched?.label || value;
};

function formatTimeAgo(dateString: string): string {
  const diffMinutes = Math.floor(
    (Date.now() - new Date(dateString).getTime()) / 60000,
  );
  if (diffMinutes < 60) return `${Math.max(1, diffMinutes)} menit lalu`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} jam lalu`;
  return `${Math.floor(diffHours / 24)} hari lalu`;
}

function metricTone(value: number, warn: number, danger: number) {
  if (value >= danger)
    return "border-rose-200 bg-rose-50/70 dark:border-rose-900 dark:bg-rose-950/30";
  if (value >= warn)
    return "border-amber-200 bg-amber-50/70 dark:border-amber-900 dark:bg-amber-950/30";
  return "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900";
}

function AsistenDashboard({ role }: RoleDashboardProps) {
  const { user } = useAuth();

  const [processingId, setProcessingId] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [queueFilter, setQueueFilter] = useState<QueueFilter>("ALL");
  const [queueSearch, setQueueSearch] = useState("");
  const [queuePage, setQueuePage] = useState(1);
  const [rejectOpenFor, setRejectOpenFor] = useState<string | null>(null);
  const [rejectReasonKeyById, setRejectReasonKeyById] = useState<
    Record<string, RejectReasonKey>
  >({});
  const [rejectNoteById, setRejectNoteById] = useState<Record<string, string>>(
    {},
  );
  const [localTrendEvents, setLocalTrendEvents] = useState<TrendEvent[]>([]);
  const [photoPreview, setPhotoPreview] = useState<{
    url: string;
    title: string;
  } | null>(null);

  const {
    data: pendingData,
    loading: pendingLoading,
    refetch: refetchPending,
    error: pendingError,
  } = useQuery<GetHarvestRecordsByStatusResponse>(
    GET_HARVEST_RECORDS_BY_STATUS,
    {
      variables: { status: "PENDING" },
      pollInterval: 30000,
      errorPolicy: "all",
      fetchPolicy: "cache-and-network",
      notifyOnNetworkStatusChange: true,
    },
  );

  const {
    data: approvedData,
    loading: approvedLoading,
    refetch: refetchApproved,
  } = useQuery<GetHarvestRecordsByStatusResponse>(
    GET_HARVEST_RECORDS_BY_STATUS,
    {
      variables: { status: "APPROVED" },
      pollInterval: 60000,
      errorPolicy: "all",
      fetchPolicy: "cache-and-network",
      notifyOnNetworkStatusChange: true,
    },
  );

  const {
    data: rejectedData,
    loading: rejectedLoading,
    refetch: refetchRejected,
  } = useQuery<GetHarvestRecordsByStatusResponse>(
    GET_HARVEST_RECORDS_BY_STATUS,
    {
      variables: { status: "REJECTED" },
      pollInterval: 60000,
      errorPolicy: "all",
      fetchPolicy: "cache-and-network",
      notifyOnNetworkStatusChange: true,
    },
  );

  const {
    data: assignmentsData,
    loading: assignmentsLoading,
    refetch: refetchAssignments,
  } = useQuery<GetMyAssignmentsResponse>(GET_MY_ASSIGNMENTS, {
    errorPolicy: "all",
    fetchPolicy: "cache-and-network",
    notifyOnNetworkStatusChange: true,
  });

  const refreshAllData = useCallback(async () => {
    await Promise.all([
      refetchPending(),
      refetchApproved(),
      refetchRejected(),
      refetchAssignments(),
    ]);
    setLastUpdated(new Date());
  }, [refetchPending, refetchApproved, refetchRejected, refetchAssignments]);

  const { mutate: approveRecord, state: approveState } = useGraphQLMutation<
    ApproveHarvestRecordResponse,
    ApproveHarvestRecordVariables
  >(APPROVE_HARVEST_RECORD, {
    errorContext: "approving harvest record",
    onError: (error) => {
      toast.error(`Gagal approve data: ${error}`);
      setProcessingId(null);
    },
  });

  const { mutate: rejectRecord, state: rejectState } = useGraphQLMutation<
    RejectHarvestRecordResponse,
    RejectHarvestRecordVariables
  >(REJECT_HARVEST_RECORD, {
    errorContext: "rejecting harvest record",
    onError: (error) => {
      toast.error(`Gagal reject data: ${error}`);
      setProcessingId(null);
    },
  });

  const handleRefresh = useCallback(async () => {
    try {
      await refreshAllData();
      toast.success("Data monitoring diperbarui.");
    } catch {
      toast.error("Gagal memperbarui data monitoring.");
    }
  }, [refreshAllData]);

  const handleApprove = useCallback(
    async (recordId: string) => {
      if (!user?.id) {
        toast.error("User tidak valid. Silakan login ulang.");
        return;
      }
      setProcessingId(recordId);
      const result = await approveRecord({
        input: { id: recordId, approvedBy: user.id },
      });

      if (!result?.approveHarvestRecord) {
        setProcessingId(null);
        return;
      }

      const approvedRecord = result.approveHarvestRecord;
      setLocalTrendEvents((prev) => [
        {
          recordId: approvedRecord.id,
          status: "APPROVED",
          decidedAt:
            approvedRecord.approvedAt ||
            approvedRecord.updatedAt ||
            new Date().toISOString(),
        },
        ...prev.filter((event) => event.recordId !== approvedRecord.id),
      ]);

      await refreshAllData();
      setProcessingId(null);
      toast.success("Data panen berhasil disetujui.");
    },
    [approveRecord, refreshAllData, user?.id],
  );

  const handleReject = useCallback(
    async (recordId: string, reasonKey?: RejectReasonKey, note?: string) => {
      setProcessingId(recordId);
      const result = await rejectRecord({
        input: {
          id: recordId,
          rejectedReason: buildRejectReasonText(reasonKey, note),
        },
      });

      if (!result?.rejectHarvestRecord) {
        setProcessingId(null);
        return;
      }

      const rejectedRecord = result.rejectHarvestRecord;
      setLocalTrendEvents((prev) => [
        {
          recordId: rejectedRecord.id,
          status: "REJECTED",
          decidedAt: rejectedRecord.updatedAt || new Date().toISOString(),
        },
        ...prev.filter((event) => event.recordId !== rejectedRecord.id),
      ]);

      await refreshAllData();
      setProcessingId(null);
      toast.success("Data panen berhasil ditolak.");
    },
    [refreshAllData, rejectRecord],
  );

  useHarvestSubscriptions({
    onCreated: () => {
      void refetchPending();
      setLastUpdated(new Date());
    },
    onApproved: (record) => {
      setLocalTrendEvents((prev) => [
        {
          recordId: record.id,
          status: "APPROVED",
          decidedAt:
            record.approvedAt || record.updatedAt || new Date().toISOString(),
        },
        ...prev.filter((event) => event.recordId !== record.id),
      ]);
      void Promise.all([refetchPending(), refetchApproved()]);
      setLastUpdated(new Date());
    },
    onRejected: (record) => {
      setLocalTrendEvents((prev) => [
        {
          recordId: record.id,
          status: "REJECTED",
          decidedAt: record.updatedAt || new Date().toISOString(),
        },
        ...prev.filter((event) => event.recordId !== record.id),
      ]);
      void Promise.all([refetchPending(), refetchRejected()]);
      setLastUpdated(new Date());
    },
  });

  const pendingRecords = useMemo(
    () =>
      [...(pendingData?.harvestRecordsByStatus || [])].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      ),
    [pendingData?.harvestRecordsByStatus],
  );
  const approvedRecords = useMemo(
    () => approvedData?.harvestRecordsByStatus || [],
    [approvedData?.harvestRecordsByStatus],
  );
  const rejectedRecords = useMemo(
    () => rejectedData?.harvestRecordsByStatus || [],
    [rejectedData?.harvestRecordsByStatus],
  );
  const assignments = assignmentsData?.myAssignments;

  useEffect(() => {
    if (localTrendEvents.length === 0) return;

    const approvedIds = new Set(approvedRecords.map((record) => record.id));
    const rejectedIds = new Set(rejectedRecords.map((record) => record.id));

    setLocalTrendEvents((prev) =>
      prev.filter((event) => {
        if (event.status === "APPROVED") {
          return !approvedIds.has(event.recordId);
        }
        return !rejectedIds.has(event.recordId);
      }),
    );
  }, [approvedRecords, rejectedRecords, localTrendEvents.length]);

  const todayKey = toDateKey(new Date());
  const todayApprovedFromServer = approvedRecords.filter(
    (r) => toDayKey(r.approvedAt || r.updatedAt) === todayKey,
  ).length;
  const todayRejectedFromServer = rejectedRecords.filter(
    (r) => toDayKey(r.updatedAt || r.createdAt) === todayKey,
  ).length;
  const todayApprovedFromLocal = localTrendEvents.filter(
    (event) =>
      event.status === "APPROVED" && toDayKey(event.decidedAt) === todayKey,
  ).length;
  const todayRejectedFromLocal = localTrendEvents.filter(
    (event) =>
      event.status === "REJECTED" && toDayKey(event.decidedAt) === todayKey,
  ).length;
  const todayApproved = todayApprovedFromServer + todayApprovedFromLocal;
  const todayRejected = todayRejectedFromServer + todayRejectedFromLocal;
  const urgentPending = pendingRecords.filter(
    (r) => getHoursSince(r.createdAt) >= URGENT_HOURS,
  );

  const localApprovedEvents = localTrendEvents.filter(
    (event) => event.status === "APPROVED",
  ).length;
  const localRejectedEvents = localTrendEvents.filter(
    (event) => event.status === "REJECTED",
  ).length;
  const totalReviewed =
    approvedRecords.length +
    rejectedRecords.length +
    localApprovedEvents +
    localRejectedEvents;
  const approvalRate =
    totalReviewed > 0
      ? Math.round(
          ((approvedRecords.length + localApprovedEvents) / totalReviewed) *
            100,
        )
      : 0;

  const queueRecords = useMemo(() => {
    const keyword = queueSearch.trim().toLowerCase();
    return pendingRecords.filter((record) => {
      const isUrgent = getHoursSince(record.createdAt) >= URGENT_HOURS;
      if (queueFilter === "URGENT" && !isUrgent) return false;
      if (queueFilter === "NORMAL" && isUrgent) return false;
      if (!keyword) return true;
      const searchable = [
        record.mandor?.name,
        record.mandor?.username,
        record.block?.name,
        record.block?.blockCode,
        record.block?.division?.name,
      ]
        .join(" ")
        .toLowerCase();
      return searchable.includes(keyword);
    });
  }, [pendingRecords, queueFilter, queueSearch]);
  const totalQueuePages = useMemo(
    () => Math.max(1, Math.ceil(queueRecords.length / QUEUE_PAGE_SIZE)),
    [queueRecords.length],
  );
  const visibleQueueRecords = useMemo(
    () => {
      const normalizedPage = Math.min(queuePage, totalQueuePages);
      const start = (normalizedPage - 1) * QUEUE_PAGE_SIZE;
      return queueRecords.slice(start, start + QUEUE_PAGE_SIZE);
    },
    [queuePage, queueRecords, totalQueuePages],
  );

  useEffect(() => {
    setQueuePage(1);
  }, [queueFilter, queueSearch]);

  useEffect(() => {
    if (queuePage > totalQueuePages) {
      setQueuePage(totalQueuePages);
    }
  }, [queuePage, totalQueuePages]);

  const rejectionReasons = useMemo(() => {
    const map = new Map<string, number>();
    rejectedRecords.forEach((record) => {
      const reason = normalizeRejectReasonLabel(record.rejectedReason);
      map.set(reason, (map.get(reason) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [rejectedRecords]);

  const trendData = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, index) => {
      const day = new Date();
      day.setHours(0, 0, 0, 0);
      day.setDate(day.getDate() - (6 - index));
      return {
        key: toDateKey(day),
        label: day.toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "short",
        }),
        approved: 0,
        rejected: 0,
      };
    });
    const map = new Map(days.map((d) => [d.key, d]));
    approvedRecords.forEach((record) => {
      const key = toDayKey(record.approvedAt || record.updatedAt);
      const hit = key ? map.get(key) : undefined;
      if (hit) hit.approved += 1;
    });
    rejectedRecords.forEach((record) => {
      const key = toDayKey(record.updatedAt || record.createdAt);
      const hit = key ? map.get(key) : undefined;
      if (hit) hit.rejected += 1;
    });

    localTrendEvents.forEach((event) => {
      const key = toDayKey(event.decidedAt);
      const hit = key ? map.get(key) : undefined;
      if (!hit) return;
      if (event.status === "APPROVED") {
        hit.approved += 1;
      } else {
        hit.rejected += 1;
      }
    });

    return days;
  }, [approvedRecords, rejectedRecords, localTrendEvents]);

  const trendMax = Math.max(
    1,
    ...trendData.map((d) => Math.max(d.approved, d.rejected)),
  );
  const isLoading =
    pendingLoading || approvedLoading || rejectedLoading || assignmentsLoading;
  const isProcessing = approveState.loading || rejectState.loading;

  return (
    <AsistenDashboardLayout>
      <div className="space-y-6">
        {(pendingError || approveState.error || rejectState.error) && (
          <Alert className="border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span>
                {pendingError ? "Gagal memuat data pending. " : ""}
                {approveState.error
                  ? `Error approve: ${approveState.error}. `
                  : ""}
                {rejectState.error ? `Error reject: ${rejectState.error}.` : ""}
              </span>
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                Coba refresh
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-emerald-50 via-white to-slate-100 p-6 text-slate-900 dark:border-slate-700 dark:from-slate-900 dark:via-slate-800 dark:to-emerald-900 dark:text-white">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-emerald-400/20 blur-3xl dark:bg-emerald-300/15" />
          <div className="pointer-events-none absolute -left-20 bottom-0 h-40 w-40 rounded-full bg-cyan-300/20 blur-2xl dark:bg-cyan-300/10" />
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <Badge className="mb-2 bg-slate-900/10 text-slate-700 hover:bg-slate-900/20 dark:bg-white/15 dark:text-white dark:hover:bg-white/20">
                {role} Monitoring
              </Badge>
              <h1 className="text-2xl font-semibold md:text-3xl">
                Dashboard
              </h1>
              <p className="text-sm text-slate-700 dark:text-slate-200">
                Prioritas untuk memonitor antrean approval, kualitas reject, dan
                kecepatan keputusan.
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">
                Last update: {lastUpdated.toLocaleDateString("id-ID")}{" "}
                {lastUpdated.toLocaleTimeString("id-ID")}
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              {isLoading ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Refresh
            </Button>
          </div>
        </section>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, idx) => (
              <Skeleton key={idx} className="h-24 rounded-xl" />
            ))
          ) : (
            <>
              <Card
                className={cn(
                  "shadow-sm",
                  metricTone(pendingRecords.length, 6, 10),
                )}
              >
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Pending</p>
                  <p className="mt-2 text-2xl font-semibold">
                    {pendingRecords.length}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Menunggu review
                  </p>
                </CardContent>
              </Card>
              <Card
                className={cn(
                  "shadow-sm",
                  metricTone(urgentPending.length, 1, 4),
                )}
              >
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Urgent</p>
                  <p className="mt-2 text-2xl font-semibold">
                    {urgentPending.length}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Lebih dari {URGENT_HOURS} jam
                  </p>
                </CardContent>
              </Card>
              <Card className="border-emerald-200 bg-emerald-50/70 shadow-sm dark:border-emerald-900 dark:bg-emerald-950/30">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">
                    Approved Hari Ini
                  </p>
                  <p className="mt-2 text-2xl font-semibold">{todayApproved}</p>
                  <p className="text-xs text-muted-foreground">
                    Output review harian
                  </p>
                </CardContent>
              </Card>
              <Card
                className={cn(
                  "shadow-sm",
                  todayRejected > 0
                    ? "border-rose-200 bg-rose-50/70 dark:border-rose-900 dark:bg-rose-950/30"
                    : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900",
                )}
              >
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">
                    Rejected Hari Ini
                  </p>
                  <p className="mt-2 text-2xl font-semibold">{todayRejected}</p>
                  <p className="text-xs text-muted-foreground">
                    Perlu tindak lanjut
                  </p>
                </CardContent>
              </Card>
              <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Approval Rate</p>
                  <p className="mt-2 text-2xl font-semibold">{approvalRate}%</p>
                  <p className="text-xs text-muted-foreground">
                    Kualitas keputusan
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.8fr_1fr]">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle>Approval Queue</CardTitle>
                  <CardDescription>
                    Antrian kerja utama untuk approval/reject dengan navigasi
                    halaman kiri/kanan
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={queueFilter === "ALL" ? "default" : "outline"}
                    onClick={() => setQueueFilter("ALL")}
                  >
                    Semua ({pendingRecords.length})
                  </Button>
                  <Button
                    size="sm"
                    variant={queueFilter === "URGENT" ? "default" : "outline"}
                    onClick={() => setQueueFilter("URGENT")}
                  >
                    Urgent ({urgentPending.length})
                  </Button>
                  <Button
                    size="sm"
                    variant={queueFilter === "NORMAL" ? "default" : "outline"}
                    onClick={() => setQueueFilter("NORMAL")}
                  >
                    Normal (
                    {Math.max(0, pendingRecords.length - urgentPending.length)})
                  </Button>
                </div>
              </div>
              <div className="relative mt-2">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Cari mandor/blok/divisi"
                  value={queueSearch}
                  onChange={(e) => setQueueSearch(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingLoading ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <Skeleton key={idx} className="h-24 rounded-xl" />
                ))
              ) : queueRecords.length === 0 ? (
                <div className="rounded-xl border border-dashed p-8 text-center">
                  <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-600" />
                  <p className="font-medium">Tidak ada data sesuai filter</p>
                  <p className="text-sm text-muted-foreground">
                    Coba ubah filter atau kata kunci.
                  </p>
                </div>
              ) : (
                visibleQueueRecords.map((record) => {
                  const isUrgent =
                    getHoursSince(record.createdAt) >= URGENT_HOURS;
                  const isProcessingRow = processingId === record.id;
                  const photoUrl = getHarvestPhotoUrl(record.photoUrl);
                  const blockLabel =
                    record.block?.name || record.block?.blockCode || "-";
                  const fruitQuality = [
                    `Matang ${record.jjgMatang ?? 0}`,
                    `Mentah ${record.jjgMentah ?? 0}`,
                    `Lewat ${record.jjgLewatMatang ?? 0}`,
                    `Busuk ${record.jjgBusukAbnormal ?? 0}`,
                    `Tangkai ${record.jjgTangkaiPanjang ?? 0}`,
                    `Brondolan ${Number(record.totalBrondolan ?? 0).toFixed(1)}`,
                  ].join(" | ");
                  return (
                    <div
                      key={record.id}
                      className={cn(
                        "rounded-xl border p-4",
                        isUrgent
                          ? "border-rose-200 bg-rose-50/60 dark:border-rose-900 dark:bg-rose-950/30"
                          : "border-slate-200 dark:border-slate-700",
                      )}
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="flex gap-3">
                          <div className="mt-0.5">
                            {photoUrl ? (
                              <button
                                type="button"
                                className="h-12 w-12 overflow-hidden rounded-md border bg-muted/20"
                                onClick={() =>
                                  setPhotoPreview({
                                    url: photoUrl,
                                    title: `Foto panen ${
                                      blockLabel || record.id
                                    }`,
                                  })
                                }
                                title="Lihat foto panen"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={photoUrl}
                                  alt={`Foto panen ${record.id}`}
                                  className="h-full w-full object-cover"
                                  loading="lazy"
                                  onError={(event) => {
                                    event.currentTarget.onerror = null;
                                    event.currentTarget.src =
                                      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='3' width='18' height='18' rx='2' ry='2'%3E%3C/rect%3E%3Ccircle cx='8.5' cy='8.5' r='1.5'%3E%3C/circle%3E%3Cpolyline points='21 15 16 10 5 21'%3E%3C/polyline%3E%3C/svg%3E";
                                  }}
                                />
                              </button>
                            ) : (
                              <div className="flex h-12 w-12 items-center justify-center rounded-md border bg-slate-50 text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-500">
                                <ImageIcon className="h-4 w-4" />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold">
                                {record.mandor?.name ||
                                  record.mandor?.username ||
                                  "Mandor"}
                              </p>
                              <Badge
                                variant={isUrgent ? "destructive" : "secondary"}
                              >
                                {isUrgent ? "URGENT" : "NORMAL"}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Divisi {record.block?.division?.name || "-"} -
                              Blok {blockLabel} -{" "}
                              {record.beratTbs} kg - {record.karyawan} pekerja
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Kualitas buah: {fruitQuality}
                            </p>
                            <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                              <TimerReset className="h-3.5 w-3.5" />
                              {formatTimeAgo(record.createdAt)}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
                            onClick={() => handleApprove(record.id)}
                            disabled={isProcessingRow}
                          >
                            {isProcessingRow ? (
                              <RefreshCw className="mr-1 h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                            )}
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/40"
                            onClick={() =>
                              setRejectOpenFor((prev) =>
                                prev === record.id ? null : record.id,
                              )
                            }
                            disabled={isProcessingRow}
                          >
                            <ShieldX className="mr-1 h-3.5 w-3.5" />
                            Reject
                          </Button>
                        </div>
                      </div>
                      {rejectOpenFor === record.id && (
                        <div className="mt-3 flex flex-col gap-2 rounded-lg border border-rose-200 bg-rose-50/50 p-3 md:flex-row dark:border-rose-900 dark:bg-rose-950/30">
                          <div className="w-full space-y-2">
                            <div className="grid gap-2 sm:grid-cols-2">
                              {REJECT_REASON_OPTIONS.map((option) => {
                                const selectedReason =
                                  rejectReasonKeyById[record.id] ||
                                  DEFAULT_REJECT_REASON_KEY;
                                const isSelected =
                                  selectedReason === option.key;
                                return (
                                  <Button
                                    key={option.key}
                                    type="button"
                                    size="sm"
                                    variant={
                                      isSelected ? "destructive" : "outline"
                                    }
                                    className="justify-start"
                                    onClick={() =>
                                      setRejectReasonKeyById((prev) => ({
                                        ...prev,
                                        [record.id]: option.key,
                                      }))
                                    }
                                  >
                                    {option.label}
                                  </Button>
                                );
                              })}
                            </div>
                            <Input
                              placeholder="Catatan tambahan (opsional)"
                              value={rejectNoteById[record.id] || ""}
                              onChange={(e) =>
                                setRejectNoteById((prev) => ({
                                  ...prev,
                                  [record.id]: e.target.value,
                                }))
                              }
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={async () => {
                                const selectedReason =
                                  rejectReasonKeyById[record.id] ||
                                  DEFAULT_REJECT_REASON_KEY;
                                await handleReject(
                                  record.id,
                                  selectedReason,
                                  rejectNoteById[record.id],
                                );
                                setRejectOpenFor(null);
                              }}
                              disabled={isProcessingRow}
                            >
                              {isProcessingRow ? (
                                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                "Kirim"
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setRejectOpenFor(null)}
                              disabled={isProcessingRow}
                            >
                              Batal
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              {!pendingLoading && queueRecords.length > 0 && (
                <div className="flex items-center justify-between border-t pt-2">
                  <p className="text-xs text-muted-foreground">
                    Halaman {Math.min(queuePage, totalQueuePages)} dari{" "}
                    {totalQueuePages} (maks {QUEUE_PAGE_SIZE} data per halaman)
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setQueuePage((prev) => Math.max(1, prev - 1))
                      }
                      disabled={queuePage <= 1}
                    >
                      <ChevronLeft className="mr-1 h-4 w-4" />
                      Kiri
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setQueuePage((prev) =>
                          Math.min(totalQueuePages, prev + 1),
                        )
                      }
                      disabled={queuePage >= totalQueuePages}
                    >
                      Kanan
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Rejected Insights</CardTitle>
                <CardDescription>
                  Alasan reject yang paling sering muncul
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {rejectionReasons.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Belum ada data reject.
                  </p>
                ) : (
                  rejectionReasons.map((item) => (
                    <div
                      key={item.reason}
                      className="flex items-center justify-between rounded-lg border border-rose-100 bg-rose-50/60 px-3 py-2 dark:border-rose-900 dark:bg-rose-950/30"
                    >
                      <span className="line-clamp-1 text-sm">
                        {item.reason}
                      </span>
                      <Badge
                        variant="outline"
                        className="border-rose-300 bg-white text-rose-700 dark:border-rose-800 dark:bg-slate-900 dark:text-rose-300"
                      >
                        {item.count}
                      </Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Snapshot</CardTitle>
                <CardDescription>Cakupan area pengawasan</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-lg border bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
                  <p className="text-xs text-muted-foreground">
                    Divisi dipantau
                  </p>
                  <p className="text-xl font-semibold">
                    {assignments?.divisions?.length || 0}
                  </p>
                </div>
                <div className="rounded-lg border bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
                  <p className="text-xs text-muted-foreground">
                    Estate dipantau
                  </p>
                  <p className="text-xl font-semibold">
                    {assignments?.estates?.length || 0}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Tren 7 Hari</CardTitle>
            <CardDescription>Perbandingan Approved vs Rejected</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {trendData.map((item) => (
              <div
                key={item.key}
                className="grid grid-cols-[64px_1fr] items-center gap-3"
              >
                <span className="text-xs text-muted-foreground">
                  {item.label}
                </span>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-16 text-[11px] font-medium text-emerald-700">
                      Approved
                    </span>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-emerald-100 dark:bg-emerald-950/50">
                      <div
                        className="h-full rounded-full bg-emerald-500 dark:bg-emerald-400"
                        style={{
                          width:
                            item.approved === 0
                              ? "0%"
                              : `${Math.max(8, (item.approved / trendMax) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="w-8 text-right text-xs font-medium text-emerald-700 dark:text-emerald-300">
                      {item.approved}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-16 text-[11px] font-medium text-red-700 dark:text-red-300">
                      Rejected
                    </span>
                    <div className="h-2 w-full overflow-hidden rounded-full border border-red-200 bg-red-100 dark:border-red-900 dark:bg-red-950/50">
                      <div
                        className="h-full rounded-full bg-red-600 dark:bg-red-400"
                        style={{
                          width:
                            item.rejected === 0
                              ? "0%"
                              : `${Math.max(8, (item.rejected / trendMax) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="w-8 text-right text-xs font-medium text-red-700 dark:text-red-300">
                      {item.rejected}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex items-center justify-center text-xs text-muted-foreground">
          <div className="flex items-center gap-2 rounded-full border bg-white px-3 py-1.5 dark:border-slate-700 dark:bg-slate-900">
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                isProcessing ? "animate-pulse bg-amber-500" : "bg-emerald-500",
              )}
            />
            <span>
              Realtime aktif -{" "}
              {isProcessing ? "memproses approval/reject" : "sistem standby"}
            </span>
          </div>
        </div>
      </div>

      <Dialog
        open={Boolean(photoPreview)}
        onOpenChange={(open) => {
          if (!open) {
            setPhotoPreview(null);
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{photoPreview?.title || "Foto panen"}</DialogTitle>
          </DialogHeader>
          <div className="overflow-hidden rounded-lg border bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
            {photoPreview?.url ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoPreview.url}
                  alt={photoPreview.title || "Foto panen"}
                  className="max-h-[75vh] w-full object-contain"
                />
              </>
            ) : (
              <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                Foto tidak tersedia.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AsistenDashboardLayout>
  );
}

export default AsistenDashboard;
