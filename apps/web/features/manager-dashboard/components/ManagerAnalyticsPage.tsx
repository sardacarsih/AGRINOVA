'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@apollo/client';
import { format } from 'date-fns';
import {
    Loader2,
    TrendingUp,
    TrendingDown,
    Minus,
    Award,
    LayoutGrid
} from 'lucide-react';
import {
    BarChart,
    ComposedChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Line,
    LabelList
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

// Layout import
import { ManagerDashboardLayout } from '@/components/layouts/role-layouts/ManagerDashboardLayout';
import {
    GET_BKM_POTONG_BUAH_ANALYTICS,
    GET_BKM_POTONG_BUAH_FLAT_SUMMARY,
    BkmPotongBuahAnalyticsData,
    BkmPotongBuahAnalyticsVars,
    BkmPotongBuahFlatSummaryData,
    BkmPotongBuahFlatVars
} from '@/lib/apollo/queries/bkm-report';
import { GET_MY_ASSIGNMENTS, GetMyAssignmentsResponse } from '@/lib/apollo/queries/harvest';
import {
    GET_MANAGER_DIVISION_PRODUCTION_BUDGETS,
    GetManagerDivisionProductionBudgetsResponse,
} from '@/lib/apollo/queries/manager-division-production-budget';
import { useAuth } from '@/hooks/use-auth';
import { ALL_COMPANIES_SCOPE, useCompanyScope } from '@/contexts/company-scope-context';

// Helper to format currency
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
};

// Helper to format number
const formatNumber = (num: number) => {
    return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(num);
};

const YYYY_MM_DD_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const YYYYMMDD_REGEX = /^\d{8}$/;
const YYYY_MM_DD_ANYWHERE_REGEX = /(\d{4})[-/](\d{2})[-/](\d{2})/;
const DD_MM_YYYY_ANYWHERE_REGEX = /(\d{2})[-/](\d{2})[-/](\d{4})/;

const toFiniteNumber = (value: unknown): number => {
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : 0;
    }

    if (typeof value === 'string') {
        const normalized = value.replace(/,/g, '').trim();
        if (!normalized) return 0;
        const parsed = Number(normalized);
        return Number.isFinite(parsed) ? parsed : 0;
    }

    return 0;
};

const formatTonLabel = (value: unknown) => formatNumber(toFiniteNumber(value));
const formatWorkersLabel = (value: unknown) => formatNumber(Math.round(toFiniteNumber(value)));
const formatIndexLabel = (value: unknown) => `${formatNumber(toFiniteNumber(value))}%`;

const OUTPUT_LABEL_STYLE = { fontSize: 10, fill: '#0f172a', fontWeight: 600 } as const;
const WORKERS_LABEL_STYLE = { fontSize: 10, fill: '#c2410c', fontWeight: 600 } as const;
const HORIZONTAL_BAR_LABEL_STYLE = { fontSize: 10, fill: '#334155', fontWeight: 600 } as const;
const OUTPUT_INDEX_LABEL_STYLE = { fontSize: 10, fill: '#0f172a', fontWeight: 600 } as const;
const WORKERS_INDEX_LABEL_STYLE = { fontSize: 10, fill: '#c2410c', fontWeight: 600 } as const;
const ACHIEVEMENT_LABEL_STYLE = { fontSize: 10, fill: '#0f172a', fontWeight: 700 } as const;
const DIVISION_CHART_ROW_HEIGHT = 34;
const DIVISION_CHART_BASE_HEIGHT = 96;
const DIVISION_CHART_MIN_HEIGHT = 300;
const DIVISION_CHART_MAX_HEIGHT = 900;
const ACTUAL_BAR_COLOR = '#2563eb';
const BUDGET_BAR_COLOR = '#cbd5e1';
const OVER_TARGET_BAR_COLOR = '#ef4444';

type InsideBarLabelProps = {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    value?: string | number;
};

const createInsideBarLabelRenderer = (fill: string, minWidth: number) => {
    const renderer = ({ x, y, width, height, value }: InsideBarLabelProps) => {
        const text = String(value ?? '').trim();
        if (!text) return null;
        if (x === undefined || y === undefined || width === undefined || height === undefined) return null;
        if (width < minWidth || height < 14) return null;

        return (
            <text
                x={x + (width / 2)}
                y={y + (height / 2)}
                fill={fill}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={10}
                fontWeight={700}
            >
                {text}
            </text>
        );
    };

    renderer.displayName = `InsideBarLabelRenderer(${fill},${minWidth})`;
    return renderer;
};

const renderInsideActualLabel = createInsideBarLabelRenderer('#ffffff', 54);
const renderInsideBudgetLabel = createInsideBarLabelRenderer('#0f172a', 54);
const renderInsideBudgetOnActualLabel = createInsideBarLabelRenderer('#dbeafe', 72);
const renderInsideOverLabel = createInsideBarLabelRenderer('#ffffff', 54);

const BudgetProgressBars = () => (
    <>
        <Bar dataKey="actualInBudgetTon" stackId="budgetProgress" name="Aktual dalam Budget (Ton)" fill={ACTUAL_BAR_COLOR}>
            <LabelList
                dataKey="actualTonLabelOnActualInBudget"
                position="insideLeft"
                content={renderInsideActualLabel}
            />
            <LabelList
                dataKey="budgetTonLabelOnActualInBudget"
                position="insideRight"
                content={renderInsideBudgetOnActualLabel}
            />
            <LabelList
                dataKey="achievementLabelOnActualInBudget"
                position="right"
                style={ACHIEVEMENT_LABEL_STYLE}
            />
        </Bar>
        <Bar dataKey="remainingBudgetTon" stackId="budgetProgress" name="Sisa Budget (Ton)" fill={BUDGET_BAR_COLOR} radius={[0, 4, 4, 0]}>
            <LabelList
                dataKey="budgetTonLabelOnRemaining"
                position="inside"
                content={renderInsideBudgetLabel}
            />
            <LabelList
                dataKey="achievementLabelOnRemaining"
                position="right"
                style={ACHIEVEMENT_LABEL_STYLE}
            />
        </Bar>
        <Bar dataKey="overTargetTon" stackId="budgetProgress" name="Over Target (Ton)" fill={OVER_TARGET_BAR_COLOR} radius={[0, 4, 4, 0]}>
            <LabelList
                dataKey="actualTonLabelOnOver"
                position="inside"
                content={renderInsideOverLabel}
            />
            <LabelList
                dataKey="achievementLabelOnOver"
                position="right"
                style={ACHIEVEMENT_LABEL_STYLE}
            />
        </Bar>
    </>
);

const normalizeTanggalText = (tanggal?: string | null): string => {
    if (!tanggal) return 'Unknown';

    const raw = tanggal.trim();
    if (!raw) return 'Unknown';

    // Keep DB text date as-is when it is already YYYY-MM-DD.
    if (YYYY_MM_DD_REGEX.test(raw)) {
        return raw;
    }

    // Handle ISO-like payloads: 2025-09-01T00:00:00Z -> 2025-09-01.
    const firstTen = raw.slice(0, 10);
    if (YYYY_MM_DD_REGEX.test(firstTen)) {
        return firstTen;
    }

    // Handle compact date: 20250901 -> 2025-09-01.
    if (YYYYMMDD_REGEX.test(raw)) {
        return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
    }

    // Extract YYYY-MM-DD or YYYY/MM/DD from any timestamp-like string.
    const yyyyMatch = raw.match(YYYY_MM_DD_ANYWHERE_REGEX);
    if (yyyyMatch) {
        return `${yyyyMatch[1]}-${yyyyMatch[2]}-${yyyyMatch[3]}`;
    }

    // Extract DD-MM-YYYY or DD/MM/YYYY and normalize.
    const ddmmMatch = raw.match(DD_MM_YYYY_ANYWHERE_REGEX);
    if (ddmmMatch) {
        return `${ddmmMatch[3]}-${ddmmMatch[2]}-${ddmmMatch[1]}`;
    }

    // Last fallback: parse and normalize to date text (UTC-safe output).
    const parsed = new Date(raw);
    if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().slice(0, 10);
    }

    return raw;
};

const ALL_SCOPE = ALL_COMPANIES_SCOPE;

const toScopeKey = (value?: string | null): string => {
    return String(value || '').trim().replace(/\s+/g, ' ').toUpperCase();
};

const addToNumberMap = (map: Map<string, number>, key: string, value: number) => {
    if (!key) return;
    map.set(key, (map.get(key) || 0) + value);
};

const buildBudgetProgressSegments = (actualTon: number, budgetTon: number) => {
    const safeActualTon = Math.max(0, toFiniteNumber(actualTon));
    const safeBudgetTon = Math.max(0, toFiniteNumber(budgetTon));
    const actualInBudgetTon = Math.min(safeActualTon, safeBudgetTon);
    const remainingBudgetTon = Math.max(safeBudgetTon - safeActualTon, 0);
    const overTargetTon = Math.max(safeActualTon - safeBudgetTon, 0);
    const achievementPct = safeBudgetTon > 0 ? (safeActualTon / safeBudgetTon) * 100 : null;
    const achievementLabel = formatAchievementLabel(achievementPct);
    const actualTonLabel = formatInsideTonLabel('A', safeActualTon);
    const budgetTonLabel = formatInsideTonLabel('B', safeBudgetTon);

    return {
        actualTon: safeActualTon,
        budgetTon: safeBudgetTon,
        actualInBudgetTon,
        remainingBudgetTon,
        overTargetTon,
        actualTonLabelOnActualInBudget: overTargetTon > 0 ? '' : actualTonLabel,
        actualTonLabelOnOver: overTargetTon > 0 ? actualTonLabel : '',
        budgetTonLabelOnActualInBudget: remainingBudgetTon === 0 ? budgetTonLabel : '',
        budgetTonLabelOnRemaining: remainingBudgetTon > 0 ? budgetTonLabel : '',
        achievementPct,
        achievementLabelOnActualInBudget: overTargetTon === 0 && remainingBudgetTon === 0 ? achievementLabel : '',
        achievementLabelOnRemaining: overTargetTon === 0 && remainingBudgetTon > 0 ? achievementLabel : '',
        achievementLabelOnOver: overTargetTon > 0 ? achievementLabel : '',
    };
};

const formatAchievementLabel = (value: unknown) => {
    if (value === null || value === undefined) return '';
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return '';
    return `${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(numericValue)}%`;
};

const formatTrendPercentLabel = (value: number) => {
    const truncated = Math.trunc(value * 100) / 100;
    return `${new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(truncated)}%`;
};

type TrendDirection = 'up' | 'down' | 'stable';

type MonthlyTrend = {
    direction: TrendDirection;
    text: string;
};

const buildMonthlyTrend = (currentValue: number, previousValue: number): MonthlyTrend => {
    const stableLabel = formatTrendPercentLabel(0);
    if (previousValue <= 0 || currentValue < 0) {
        return {
            direction: 'stable',
            text: `Tren stabil ${stableLabel} bulan ini`,
        };
    }

    const trendPct = ((currentValue - previousValue) / previousValue) * 100;
    if (Math.abs(trendPct) < 0.05) {
        return {
            direction: 'stable',
            text: `Tren stabil ${stableLabel} bulan ini`,
        };
    }

    const trendDirection: TrendDirection = trendPct > 0 ? 'up' : 'down';
    const trendLabel = formatTrendPercentLabel(Math.abs(trendPct));
    return {
        direction: trendDirection,
        text: `Tren ${trendDirection === 'up' ? 'naik' : 'turun'} ${trendLabel} bulan ini`,
    };
};

const formatInsideTonLabel = (prefix: 'A' | 'B', value: number) => {
    if (!(value > 0)) return '';
    return `${prefix}: ${formatNumber(value)}t`;
};

type CompanyScopeOption = {
    id: string;
    name: string;
};

type EstateScopeOption = {
    id: string;
    name: string;
    code: string;
    companyId: string;
};

type DailyChartMode = 'absolute' | 'normalized';

export default function ManagerAnalyticsPage() {
    const { user } = useAuth();
    const {
        isAreaManager: isAreaManagerScope,
        availableCompanies: globalCompanyOptions,
        selectedCompanyId: globalSelectedCompanyId,
        setSelectedCompanyId: setGlobalSelectedCompanyId,
    } = useCompanyScope();
    const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'MM'));
    const [selectedYear, setSelectedYear] = useState<string>(format(new Date(), 'yyyy'));
    const [localSelectedCompanyId, setLocalSelectedCompanyId] = useState<string>(ALL_SCOPE);
    const [selectedEstateId, setSelectedEstateId] = useState<string>(ALL_SCOPE);
    const [dailyChartMode, setDailyChartMode] = useState<DailyChartMode>('normalized');
    const periode = `${selectedYear}${selectedMonth}`;
    const budgetPeriod = `${selectedYear}-${selectedMonth}`;
    const previousPeriode = useMemo(() => {
        const yearNumber = Number(selectedYear);
        const monthNumber = Number(selectedMonth);
        if (!Number.isFinite(yearNumber) || !Number.isFinite(monthNumber) || monthNumber < 1 || monthNumber > 12) {
            return '';
        }

        const cursor = new Date(yearNumber, monthNumber - 1, 1);
        cursor.setMonth(cursor.getMonth() - 1);
        const prevYear = cursor.getFullYear();
        const prevMonth = String(cursor.getMonth() + 1).padStart(2, '0');
        return `${prevYear}${prevMonth}`;
    }, [selectedYear, selectedMonth]);
    const currentYear = new Date().getFullYear();
    const yearOptions = Array.from({ length: 10 }, (_, idx) => String(currentYear - 5 + idx));
    const monthOptions = [
        { value: '01', label: 'Januari' },
        { value: '02', label: 'Februari' },
        { value: '03', label: 'Maret' },
        { value: '04', label: 'April' },
        { value: '05', label: 'Mei' },
        { value: '06', label: 'Juni' },
        { value: '07', label: 'Juli' },
        { value: '08', label: 'Agustus' },
        { value: '09', label: 'September' },
        { value: '10', label: 'Oktober' },
        { value: '11', label: 'November' },
        { value: '12', label: 'Desember' },
    ];

    const { data: assignmentsData } = useQuery<GetMyAssignmentsResponse>(GET_MY_ASSIGNMENTS, {
        fetchPolicy: 'cache-first',
        nextFetchPolicy: 'cache-first',
    });

    const isAreaManager = isAreaManagerScope || user?.role === 'AREA_MANAGER';
    const selectedCompanyId = isAreaManager ? globalSelectedCompanyId : localSelectedCompanyId;
    const setSelectedCompanyId = React.useCallback(
        (value: string) => {
            if (isAreaManager) {
                setGlobalSelectedCompanyId(value);
                return;
            }
            setLocalSelectedCompanyId(value);
        },
        [isAreaManager, setGlobalSelectedCompanyId]
    );

    const handleDailyChartModeChange = React.useCallback((value: string) => {
        if (value === 'absolute' || value === 'normalized') {
            setDailyChartMode(value);
        }
    }, []);

    const assignmentCompanyOptions = useMemo<CompanyScopeOption[]>(() => {
        const assignmentCompanies = assignmentsData?.myAssignments?.companies || [];
        if (assignmentCompanies.length > 0) {
            return assignmentCompanies.map((company) => ({
                id: String(company.id),
                name: company.name || String(company.id),
            }));
        }

        const fallbackIds = Array.isArray(user?.assignedCompanies) ? user.assignedCompanies : [];
        const fallbackNames = Array.isArray(user?.assignedCompanyNames) ? user.assignedCompanyNames : [];
        return fallbackIds
            .filter(Boolean)
            .map((id, index) => ({
                id,
                name: fallbackNames[index] || id,
            }));
    }, [assignmentsData?.myAssignments?.companies, user?.assignedCompanies, user?.assignedCompanyNames]);

    const companyOptions = useMemo<CompanyScopeOption[]>(() => {
        if (isAreaManager && globalCompanyOptions.length > 0) {
            return globalCompanyOptions;
        }
        return assignmentCompanyOptions;
    }, [assignmentCompanyOptions, globalCompanyOptions, isAreaManager]);

    const estateOptions = useMemo<EstateScopeOption[]>(() => {
        const estates = assignmentsData?.myAssignments?.estates || [];
        const dedup = new Map<string, EstateScopeOption>();

        estates.forEach((estate) => {
            const estateId = String(estate?.id || '').trim();
            if (!estateId || !estate?.code) return;
            const code = String(estate.code).trim();
            if (!code) return;

            dedup.set(estateId, {
                id: estateId,
                name: estate.name || code,
                code,
                companyId: String(estate.companyId || ''),
            });
        });

        return Array.from(dedup.values()).sort((a, b) => a.name.localeCompare(b.name, 'id'));
    }, [assignmentsData?.myAssignments?.estates]);

    const companyNameById = useMemo(() => {
        const map = new Map<string, string>();
        companyOptions.forEach((company) => {
            const id = company.id.trim();
            if (!id) return;
            map.set(id, company.name || id);
        });
        return map;
    }, [companyOptions]);

    const estateCompanyIdByScopeKey = useMemo(() => {
        const map = new Map<string, string>();

        estateOptions.forEach((estate) => {
            const companyId = estate.companyId.trim();
            if (!companyId) return;

            [estate.code, estate.name].forEach((value) => {
                const key = toScopeKey(value);
                if (key) {
                    map.set(key, companyId);
                }
            });
        });

        return map;
    }, [estateOptions]);

    const estateCompanyIdByEstateId = useMemo(() => {
        const map = new Map<string, string>();

        estateOptions.forEach((estate) => {
            const estateId = estate.id.trim();
            const companyId = estate.companyId.trim();
            if (!estateId || !companyId) return;
            map.set(estateId, companyId);
        });

        return map;
    }, [estateOptions]);

    const estateOptionById = useMemo(() => {
        const map = new Map<string, EstateScopeOption>();

        estateOptions.forEach((estate) => {
            const estateId = estate.id.trim();
            if (!estateId) return;
            map.set(estateId, estate);
        });

        return map;
    }, [estateOptions]);

    const estateOptionByScopeKey = useMemo(() => {
        const map = new Map<string, EstateScopeOption>();

        estateOptions.forEach((estate) => {
            [estate.code, estate.name].forEach((value) => {
                const key = toScopeKey(value);
                if (!key || map.has(key)) return;
                map.set(key, estate);
            });
        });

        return map;
    }, [estateOptions]);

    const filteredEstateOptions = useMemo(() => {
        if (selectedCompanyId === ALL_SCOPE) return estateOptions;
        return estateOptions.filter((estate) => estate.companyId === selectedCompanyId);
    }, [estateOptions, selectedCompanyId]);

    useEffect(() => {
        if (selectedEstateId === ALL_SCOPE) return;
        const exists = filteredEstateOptions.some((estate) => estate.id === selectedEstateId);
        if (!exists) {
            setSelectedEstateId(ALL_SCOPE);
        }
    }, [filteredEstateOptions, selectedEstateId]);

    const reportFilter = useMemo<BkmPotongBuahFlatVars['filter']>(() => {
        const filter: BkmPotongBuahFlatVars['filter'] = {
            periode: parseInt(periode, 10) || 0,
        };

        if (selectedCompanyId !== ALL_SCOPE) {
            filter.companyId = selectedCompanyId;
        }

        if (selectedEstateId !== ALL_SCOPE) {
            const selectedEstate = estateOptions.find((estate) => estate.id === selectedEstateId);
            if (selectedEstate?.code) {
                filter.estate = selectedEstate.code;
            }
        }

        return filter;
    }, [periode, selectedCompanyId, selectedEstateId, estateOptions]);

    const previousReportFilter = useMemo<BkmPotongBuahFlatVars['filter']>(() => {
        return {
            ...reportFilter,
            periode: parseInt(previousPeriode, 10) || 0,
        };
    }, [reportFilter, previousPeriode]);

    const { data: analyticsResponse, loading, error } = useQuery<BkmPotongBuahAnalyticsData, BkmPotongBuahAnalyticsVars>(
        GET_BKM_POTONG_BUAH_ANALYTICS,
        {
            variables: {
                filter: reportFilter,
                topN: 10,
            },
            fetchPolicy: 'cache-and-network',
            nextFetchPolicy: 'cache-first',
        }
    );

    const { data: previousData } = useQuery<BkmPotongBuahFlatSummaryData, BkmPotongBuahFlatVars>(
        GET_BKM_POTONG_BUAH_FLAT_SUMMARY,
        {
            variables: {
                filter: previousReportFilter,
                page: 1,
                // Summary-only mode: backend skips paginated row fetch when limit <= 0.
                limit: 0
            },
            fetchPolicy: 'cache-and-network',
            nextFetchPolicy: 'cache-first',
            skip: !previousPeriode,
        }
    );

    const { data: budgetData } = useQuery<GetManagerDivisionProductionBudgetsResponse>(
        GET_MANAGER_DIVISION_PRODUCTION_BUDGETS,
        {
            variables: { period: budgetPeriod },
            fetchPolicy: 'cache-and-network',
        }
    );

    const analyticsPayload = analyticsResponse?.bkmPotongBuahAnalytics;

    const scopedSummary = useMemo(() => {
        return {
            totalQty: toFiniteNumber(analyticsPayload?.summary?.totalQty),
            totalJumlah: toFiniteNumber(analyticsPayload?.summary?.totalJumlah),
            totalRecords: toFiniteNumber(analyticsPayload?.totalRecords),
        };
    }, [
        analyticsPayload?.summary?.totalQty,
        analyticsPayload?.summary?.totalJumlah,
        analyticsPayload?.totalRecords,
    ]);

    const scopedPreviousSummary = useMemo(() => {
        return {
            totalQty: toFiniteNumber(previousData?.bkmPotongBuahFlat?.summary?.totalQty),
            totalJumlah: toFiniteNumber(previousData?.bkmPotongBuahFlat?.summary?.totalJumlah),
            totalRecords: toFiniteNumber(previousData?.bkmPotongBuahFlat?.total),
        };
    }, [
        previousData?.bkmPotongBuahFlat?.summary?.totalQty,
        previousData?.bkmPotongBuahFlat?.summary?.totalJumlah,
        previousData?.bkmPotongBuahFlat?.total,
    ]);

    const selectedEstateOption = useMemo(() => {
        if (selectedEstateId === ALL_SCOPE) return null;
        return estateOptions.find((estate) => estate.id === selectedEstateId) || null;
    }, [estateOptions, selectedEstateId]);

    const scopedBudgets = useMemo(() => {
        const budgets = budgetData?.managerDivisionProductionBudgets || [];
        if (!budgets.length) return [];

        return budgets.filter((item) => {
            const estateId = String(item.estateId || '').trim();
            const estateName = String(item.estateName || '').trim();
            const estateScopeKey = toScopeKey(estateName);
            const companyId = estateCompanyIdByEstateId.get(estateId) || estateCompanyIdByScopeKey.get(estateScopeKey) || '';

            if (selectedCompanyId !== ALL_SCOPE && companyId !== selectedCompanyId) {
                return false;
            }

            if (!selectedEstateOption) {
                return true;
            }

            const selectedEstateScopeCode = toScopeKey(selectedEstateOption.code);
            const selectedEstateScopeName = toScopeKey(selectedEstateOption.name);
            const sameEstateId = estateId && estateId === selectedEstateOption.id;
            const sameEstateScope = estateScopeKey && (estateScopeKey === selectedEstateScopeCode || estateScopeKey === selectedEstateScopeName);

            return sameEstateId || sameEstateScope;
        });
    }, [
        budgetData?.managerDivisionProductionBudgets,
        estateCompanyIdByEstateId,
        estateCompanyIdByScopeKey,
        selectedCompanyId,
        selectedEstateOption,
    ]);

    const budgetLookups = useMemo(() => {
        const companyBudgetTonMap = new Map<string, number>();
        const estateBudgetTonMap = new Map<string, number>();
        const divisionBudgetTonMap = new Map<string, number>();

        scopedBudgets.forEach((budget) => {
            const targetTon = toFiniteNumber(budget.targetTon);
            if (!Number.isFinite(targetTon) || targetTon <= 0) return;

            const estateId = String(budget.estateId || '').trim();
            const estateNameRaw = String(budget.estateName || '').trim();
            const divisionNameRaw = String(budget.divisionName || '').trim();
            const estateOption = estateOptionById.get(estateId) || estateOptionByScopeKey.get(toScopeKey(estateNameRaw));
            const estateName = estateOption?.name || estateNameRaw || 'Unknown';
            const estateCode = estateOption?.code || '';
            const divisionName = divisionNameRaw || 'Unknown';

            const companyId =
                estateOption?.companyId?.trim() ||
                estateCompanyIdByEstateId.get(estateId) ||
                estateCompanyIdByScopeKey.get(toScopeKey(estateName)) ||
                '';
            const companyName = companyNameById.get(companyId) || companyId;
            if (companyName) {
                addToNumberMap(companyBudgetTonMap, toScopeKey(companyName), targetTon);
            }

            const estateNameKey = toScopeKey(estateName);
            if (estateNameKey) {
                addToNumberMap(estateBudgetTonMap, estateNameKey, targetTon);
                addToNumberMap(divisionBudgetTonMap, toScopeKey(`${estateName} - ${divisionName}`), targetTon);
            }

            const estateCodeKey = toScopeKey(estateCode);
            if (estateCodeKey) {
                addToNumberMap(estateBudgetTonMap, estateCodeKey, targetTon);
            }
        });

        return {
            companyBudgetTonMap,
            estateBudgetTonMap,
            divisionBudgetTonMap,
        };
    }, [
        scopedBudgets,
        estateOptionById,
        estateOptionByScopeKey,
        estateCompanyIdByEstateId,
        estateCompanyIdByScopeKey,
        companyNameById,
    ]);

    // Aggregations
    const analyticsData = useMemo(() => {
        const toProgressDatum = (name: string, actualTon: number, budgetTon: number) => {
            const segments = buildBudgetProgressSegments(actualTon, budgetTon);
            return {
                name,
                outputTon: segments.actualTon,
                budgetTon: segments.budgetTon,
                actualInBudgetTon: segments.actualInBudgetTon,
                remainingBudgetTon: segments.remainingBudgetTon,
                overTargetTon: segments.overTargetTon,
                actualTonLabelOnActualInBudget: segments.actualTonLabelOnActualInBudget,
                actualTonLabelOnOver: segments.actualTonLabelOnOver,
                budgetTonLabelOnActualInBudget: segments.budgetTonLabelOnActualInBudget,
                budgetTonLabelOnRemaining: segments.budgetTonLabelOnRemaining,
                achievementPct: segments.achievementPct,
                achievementLabelOnActualInBudget: segments.achievementLabelOnActualInBudget,
                achievementLabelOnRemaining: segments.achievementLabelOnRemaining,
                achievementLabelOnOver: segments.achievementLabelOnOver,
            };
        };

        const dailyDataBase = (analyticsPayload?.daily || [])
            .map((d) => {
                const output = toFiniteNumber(d.outputQty);
                const cost = toFiniteNumber(d.totalJumlah);
                const workers = Math.max(0, Math.round(toFiniteNumber(d.workerCount)));

                return {
                    date: normalizeTanggalText(d.date),
                    output,
                    cost,
                    count: 0,
                    outputTon: output / 1000,
                    costPerKg: output > 0 ? cost / output : 0,
                    workers,
                };
            })
            .filter(d => Number.isFinite(d.outputTon) && Number.isFinite(d.costPerKg) && Number.isFinite(d.workers))
            .sort((a, b) => a.date.localeCompare(b.date));

        const maxOutputTon = dailyDataBase.reduce((max, day) => Math.max(max, day.outputTon), 0);
        const maxWorkers = dailyDataBase.reduce((max, day) => Math.max(max, day.workers), 0);

        const dailyData = dailyDataBase.map((day) => ({
            ...day,
            outputIndex: maxOutputTon > 0 ? (day.outputTon / maxOutputTon) * 100 : 0,
            workersIndex: maxWorkers > 0 ? (day.workers / maxWorkers) * 100 : 0,
        }));

        // Company Performance
        let companyData = (analyticsPayload?.companies || []).map((c) =>
            toProgressDatum(c.name || 'Unknown', toFiniteNumber(c.outputQty) / 1000, budgetLookups.companyBudgetTonMap.get(toScopeKey(c.name)) || 0)
        );

        if (isAreaManager) {
            const scopedCompanies = selectedCompanyId === ALL_SCOPE
                ? companyOptions
                : companyOptions.filter((company) => company.id === selectedCompanyId);
            const existingCompanyKeys = new Set(companyData.map((item) => toScopeKey(item.name)));

            scopedCompanies.forEach((company) => {
                const companyName = company.name || company.id;
                const companyKey = toScopeKey(companyName);
                if (!companyKey || existingCompanyKeys.has(companyKey)) return;
                existingCompanyKeys.add(companyKey);

                companyData.push(
                    toProgressDatum(
                        companyName,
                        0,
                        budgetLookups.companyBudgetTonMap.get(companyKey) || 0
                    )
                );
            });
        }

        companyData = companyData.sort((a, b) => b.outputTon - a.outputTon);

        // Estate Performance
        const existingEstateKeys = new Set<string>();
        let estateData = (analyticsPayload?.estates || []).map((e) => {
            const rawEstateName = String(e.name || '').trim();
            const resolvedEstate = estateOptionByScopeKey.get(toScopeKey(rawEstateName));
            const estateDisplayName = resolvedEstate?.name || rawEstateName || 'Unknown';
            const estateDedupeKey = resolvedEstate?.id?.trim() || toScopeKey(estateDisplayName);
            if (estateDedupeKey) {
                existingEstateKeys.add(estateDedupeKey);
            }

            const budgetTon =
                budgetLookups.estateBudgetTonMap.get(toScopeKey(rawEstateName)) ||
                budgetLookups.estateBudgetTonMap.get(toScopeKey(estateDisplayName)) ||
                budgetLookups.estateBudgetTonMap.get(toScopeKey(resolvedEstate?.code)) ||
                0;

            return toProgressDatum(estateDisplayName, toFiniteNumber(e.outputQty) / 1000, budgetTon);
        });

        if (isAreaManager) {
            const scopedEstates = selectedEstateOption ? [selectedEstateOption] : filteredEstateOptions;

            scopedEstates.forEach((estate) => {
                const estateName = estate.name || estate.code;
                const estateDedupeKey = estate.id.trim() || toScopeKey(estateName);
                if (!estateDedupeKey || existingEstateKeys.has(estateDedupeKey)) return;
                existingEstateKeys.add(estateDedupeKey);

                const budgetTon =
                    budgetLookups.estateBudgetTonMap.get(toScopeKey(estate.name)) ||
                    budgetLookups.estateBudgetTonMap.get(toScopeKey(estate.code)) ||
                    0;

                estateData.push(toProgressDatum(estateName, 0, budgetTon));
            });
        }

        estateData = estateData.sort((a, b) => b.outputTon - a.outputTon);

        // Division Performance
        const divisionData = (analyticsPayload?.divisions || [])
            .map(d => {
                const segments = buildBudgetProgressSegments(
                    toFiniteNumber(d.outputQty) / 1000,
                    budgetLookups.divisionBudgetTonMap.get(toScopeKey(d.name)) || 0
                );

                return {
                    name: d.name || 'Unknown',
                    outputTon: segments.actualTon,
                    budgetTon: segments.budgetTon,
                    actualInBudgetTon: segments.actualInBudgetTon,
                    remainingBudgetTon: segments.remainingBudgetTon,
                    overTargetTon: segments.overTargetTon,
                    actualTonLabelOnActualInBudget: segments.actualTonLabelOnActualInBudget,
                    actualTonLabelOnOver: segments.actualTonLabelOnOver,
                    budgetTonLabelOnActualInBudget: segments.budgetTonLabelOnActualInBudget,
                    budgetTonLabelOnRemaining: segments.budgetTonLabelOnRemaining,
                    achievementPct: segments.achievementPct,
                    achievementLabelOnActualInBudget: segments.achievementLabelOnActualInBudget,
                    achievementLabelOnRemaining: segments.achievementLabelOnRemaining,
                    achievementLabelOnOver: segments.achievementLabelOnOver,
                };
            })
            .sort((a, b) => b.outputTon - a.outputTon);

        // Block Performance
        const blockData = (analyticsPayload?.blocks || [])
            .map(b => ({
                name: b.name || 'Unknown',
                outputTon: toFiniteNumber(b.outputQty) / 1000
            }))
            .sort((a, b) => b.outputTon - a.outputTon);

        // Top 10 Blocks
        const topBlocks = blockData.slice(0, 10);

        // Top 10 Harvesters
        const topHarvesters = (analyticsPayload?.harvesters || [])
            .map(h => ({
                nik: h.nik || 'Unknown',
                name: h.name || 'Unknown',
                outputTon: toFiniteNumber(h.outputQty) / 1000
            }))
            .sort((a, b) => b.outputTon - a.outputTon)
            .slice(0, 10);

        return { dailyData, companyData, estateData, divisionData, blockData, topBlocks, topHarvesters };
    }, [
        analyticsPayload,
        budgetLookups,
        isAreaManager,
        companyOptions,
        selectedCompanyId,
        selectedEstateOption,
        filteredEstateOptions,
        estateOptionByScopeKey,
    ]);

    const divisionChartHeight = useMemo(() => {
        const divisionCount = analyticsData?.divisionData?.length || 0;
        if (divisionCount <= 0) {
            return DIVISION_CHART_MIN_HEIGHT;
        }

        const calculatedHeight = (divisionCount * DIVISION_CHART_ROW_HEIGHT) + DIVISION_CHART_BASE_HEIGHT;
        return Math.min(DIVISION_CHART_MAX_HEIGHT, Math.max(DIVISION_CHART_MIN_HEIGHT, calculatedHeight));
    }, [analyticsData?.divisionData]);

    const outputTrend = useMemo(() => {
        const currentMonthTon = toFiniteNumber(scopedSummary.totalQty) / 1000;
        const previousMonthTon = toFiniteNumber(scopedPreviousSummary.totalQty) / 1000;
        return buildMonthlyTrend(currentMonthTon, previousMonthTon);
    }, [scopedSummary.totalQty, scopedPreviousSummary.totalQty]);

    const costTrend = useMemo(() => {
        const currentMonthCost = toFiniteNumber(scopedSummary.totalJumlah);
        const previousMonthCost = toFiniteNumber(scopedPreviousSummary.totalJumlah);
        return buildMonthlyTrend(currentMonthCost, previousMonthCost);
    }, [scopedSummary.totalJumlah, scopedPreviousSummary.totalJumlah]);

    const companyOutputTrend = outputTrend;

    const canRenderScopedChartsWithoutActual = isAreaManager && (companyOptions.length > 0 || filteredEstateOptions.length > 0);
    const shouldShowEmptyState = !analyticsPayload || (scopedSummary.totalRecords === 0 && !canRenderScopedChartsWithoutActual);

    return (
        <ManagerDashboardLayout
            contentMaxWidthClass="max-w-[1800px]"
            contentPaddingClass="p-3 sm:p-4 lg:p-5"
        >
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
                    <p className="text-muted-foreground">
                        Analisis performa panen (Potong Buah) periode {periode}
                    </p>
                </div>

                {/* Filters */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base font-medium">Filter Data</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Bulan</label>
                                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pilih bulan" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {monthOptions.map((month) => (
                                            <SelectItem key={month.value} value={month.value}>
                                                {month.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2 md:max-w-[180px]">
                                <label className="text-sm font-medium">Tahun</label>
                                <Select value={selectedYear} onValueChange={setSelectedYear}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pilih tahun" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {yearOptions.map((year) => (
                                            <SelectItem key={year} value={year}>
                                                {year}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            {isAreaManager && (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Perusahaan</label>
                                    <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Semua perusahaan" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value={ALL_SCOPE}>Semua perusahaan</SelectItem>
                                            {companyOptions.map((company) => (
                                                <SelectItem key={company.id} value={company.id}>
                                                    {company.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                            {filteredEstateOptions.length > 0 && (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Estate</label>
                                    <Select value={selectedEstateId} onValueChange={setSelectedEstateId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Semua estate" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value={ALL_SCOPE}>Semua estate</SelectItem>
                                            {filteredEstateOptions.map((estate) => (
                                                <SelectItem key={estate.id} value={estate.id}>
                                                    {estate.name} ({estate.code})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {error && (
                    <div className="bg-destructive/15 text-destructive p-4 rounded-md">
                        Error loading analytics: {error.message}
                    </div>
                )}

                {loading ? (
                    <div className="flex h-64 items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : shouldShowEmptyState ? (
                    <div className="p-8 text-center text-muted-foreground">
                        Tidak ada data untuk ditampilkan.
                    </div>
                ) : (
                    <>
                        {/* KPI Cards */}
                        <div className="grid gap-4 md:grid-cols-4">
                            <Card>
                                <CardHeader className="pb-2 space-y-0">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Output</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{formatNumber(scopedSummary.totalQty / 1000)} Ton</div>
                                    <p
                                        className={
                                            outputTrend.direction === 'up'
                                                ? 'text-xs font-medium text-green-600 flex items-center mt-1'
                                                : outputTrend.direction === 'down'
                                                    ? 'text-xs font-medium text-red-600 flex items-center mt-1'
                                                    : 'text-xs font-medium text-amber-600 flex items-center mt-1'
                                        }
                                    >
                                        {outputTrend.direction === 'up' ? (
                                            <TrendingUp className="h-3 w-3 mr-1" />
                                        ) : outputTrend.direction === 'down' ? (
                                            <TrendingDown className="h-3 w-3 mr-1" />
                                        ) : (
                                            <Minus className="h-3 w-3 mr-1" />
                                        )}
                                        {outputTrend.text}
                                    </p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2 space-y-0">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Biaya</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{formatCurrency(scopedSummary.totalJumlah)}</div>
                                    <p
                                        className={
                                            costTrend.direction === 'up'
                                                ? 'text-xs font-medium text-green-600 flex items-center mt-1'
                                                : costTrend.direction === 'down'
                                                    ? 'text-xs font-medium text-red-600 flex items-center mt-1'
                                                    : 'text-xs font-medium text-amber-600 flex items-center mt-1'
                                        }
                                    >
                                        {costTrend.direction === 'up' ? (
                                            <TrendingUp className="h-3 w-3 mr-1" />
                                        ) : costTrend.direction === 'down' ? (
                                            <TrendingDown className="h-3 w-3 mr-1" />
                                        ) : (
                                            <Minus className="h-3 w-3 mr-1" />
                                        )}
                                        {costTrend.text}
                                    </p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2 space-y-0">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">Avg Cost / Kg</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">
                                        {scopedSummary.totalQty > 0
                                            ? formatCurrency(scopedSummary.totalJumlah / scopedSummary.totalQty).replace('Rp', '')
                                            : 0}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">Based on QtyP2</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2 space-y-0">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">Records</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{scopedSummary.totalRecords}</div>
                                    <p className="text-xs text-muted-foreground mt-1">Total Transaksi</p>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Charts Section */}
                        <div className="space-y-6">
                            {/* Daily Output Chart */}
                            <Card>
                                <CardHeader>
                                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                        <div>
                                            <CardTitle>Daily Output vs Pekerja Panen</CardTitle>
                                            <CardDescription>
                                                {dailyChartMode === 'normalized'
                                                    ? 'Mode Normalized: tonase dan pekerja diskalakan ke indeks 0-100 agar tren lebih mudah dibandingkan'
                                                    : 'Mode Actual: bar tonase harian, garis jumlah pekerja panen (NIK unik)'}
                                                {analyticsData?.dailyData ? ` (${analyticsData.dailyData.length} hari)` : ''}
                                            </CardDescription>
                                        </div>
                                        <div className="w-full md:w-[220px]">
                                            <Select value={dailyChartMode} onValueChange={handleDailyChartModeChange}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Mode Perbandingan" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="normalized">Normalized (0-100)</SelectItem>
                                                    <SelectItem value="absolute">Actual (Dual Axis)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="h-[350px]">
                                    {(analyticsData?.dailyData?.length || 0) > 0 ? (
                                        <div className="h-full w-full overflow-x-auto">
                                            <ComposedChart
                                                width={Math.max(900, (analyticsData?.dailyData?.length || 0) * 44)}
                                                height={320}
                                                data={analyticsData?.dailyData}
                                                margin={{ top: 24, right: dailyChartMode === 'normalized' ? 16 : 56, left: 12, bottom: 8 }}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                <XAxis
                                                    dataKey="date"
                                                    tickFormatter={(val) => String(val ?? '').slice(5)}
                                                    fontSize={12}
                                                    interval={0}
                                                />
                                                {dailyChartMode === 'normalized' ? (
                                                    <>
                                                        <YAxis
                                                            yAxisId="normalized"
                                                            domain={[0, 100]}
                                                            fontSize={12}
                                                            tickFormatter={(value) => `${Math.round(toFiniteNumber(value))}%`}
                                                        />
                                                        <Tooltip
                                                            formatter={(value, name) => {
                                                                if (name === 'Pekerja (Indeks)') {
                                                                    return [formatIndexLabel(value), 'Pekerja (Indeks)'];
                                                                }
                                                                return [formatIndexLabel(value), 'Output (Indeks)'];
                                                            }}
                                                            labelFormatter={(label) => `Tanggal: ${String(label ?? '')}`}
                                                        />
                                                    </>
                                                ) : (
                                                    <>
                                                        <YAxis yAxisId="output" fontSize={12} />
                                                        <YAxis yAxisId="workers" orientation="right" fontSize={12} allowDecimals={false} />
                                                        <Tooltip
                                                            formatter={(value, name) => {
                                                                if (name === 'Pekerja Panen') {
                                                                    return [formatNumber(toFiniteNumber(value)), 'Pekerja Panen'];
                                                                }
                                                                return [`${formatNumber(toFiniteNumber(value))} Ton`, 'Output (Ton)'];
                                                            }}
                                                            labelFormatter={(label) => `Tanggal: ${String(label ?? '')}`}
                                                        />
                                                    </>
                                                )}
                                                <Legend />
                                                {dailyChartMode === 'normalized' ? (
                                                    <>
                                                        <Bar yAxisId="normalized" dataKey="outputIndex" name="Output (Indeks)" fill="#0ea5e9" radius={[4, 4, 0, 0]} minPointSize={2}>
                                                            <LabelList dataKey="outputIndex" position="top" formatter={formatIndexLabel} style={OUTPUT_INDEX_LABEL_STYLE} />
                                                        </Bar>
                                                        <Line
                                                            yAxisId="normalized"
                                                            type="monotone"
                                                            dataKey="workersIndex"
                                                            name="Pekerja (Indeks)"
                                                            stroke="#f97316"
                                                            strokeWidth={2}
                                                            dot={{ r: 3 }}
                                                            activeDot={{ r: 5 }}
                                                        >
                                                            <LabelList dataKey="workersIndex" position="top" formatter={formatIndexLabel} style={WORKERS_INDEX_LABEL_STYLE} />
                                                        </Line>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Bar yAxisId="output" dataKey="outputTon" name="Output (Ton)" fill="#0ea5e9" radius={[4, 4, 0, 0]} minPointSize={2}>
                                                            <LabelList dataKey="outputTon" position="top" formatter={formatTonLabel} style={OUTPUT_LABEL_STYLE} />
                                                        </Bar>
                                                        <Line
                                                            yAxisId="workers"
                                                            type="monotone"
                                                            dataKey="workers"
                                                            name="Pekerja Panen"
                                                            stroke="#f97316"
                                                            strokeWidth={2}
                                                            dot={{ r: 3 }}
                                                            activeDot={{ r: 5 }}
                                                        >
                                                            <LabelList dataKey="workers" position="top" formatter={formatWorkersLabel} style={WORKERS_LABEL_STYLE} />
                                                        </Line>
                                                    </>
                                                )}
                                            </ComposedChart>
                                        </div>
                                    ) : (
                                        <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                                            Data harian tidak tersedia untuk periode ini.
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {isAreaManager ? (
                                <div className="space-y-6">
                                    <div className="grid gap-6 md:grid-cols-2">
                                        <Card>
                                            <CardHeader>
                                                <CardTitle>Output by Company</CardTitle>
                                                <CardDescription>
                                                    Stacked: aktual dalam budget + sisa budget + over target antar Perusahaan, budget periode {budgetPeriod}
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent className="space-y-3">
                                                <div style={{ height: 260 }}>
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <BarChart layout="vertical" data={analyticsData?.companyData} margin={{ left: 16, right: 56 }}>
                                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                                            <XAxis type="number" fontSize={12} />
                                                            <YAxis dataKey="name" type="category" width={100} fontSize={11} />
                                                            <Tooltip formatter={(value, name) => [`${formatNumber(toFiniteNumber(value))} Ton`, String(name)]} />
                                                            <BudgetProgressBars />
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                </div>
                                                <div className="flex items-center justify-center gap-2">
                                                    {companyOutputTrend.direction === 'up' ? (
                                                        <TrendingUp className="h-4 w-4 text-green-600" />
                                                    ) : companyOutputTrend.direction === 'down' ? (
                                                        <TrendingDown className="h-4 w-4 text-red-600" />
                                                    ) : (
                                                        <Minus className="h-4 w-4 text-amber-600" />
                                                    )}
                                                    <p
                                                        className={
                                                            companyOutputTrend.direction === 'up'
                                                                ? 'text-sm font-semibold text-green-600'
                                                                : companyOutputTrend.direction === 'down'
                                                                    ? 'text-sm font-semibold text-red-600'
                                                                    : 'text-sm font-semibold text-amber-600'
                                                        }
                                                    >
                                                        {companyOutputTrend.text}
                                                    </p>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <Card>
                                            <CardHeader>
                                                <CardTitle>Output by Estate</CardTitle>
                                                <CardDescription>Stacked: aktual dalam budget + sisa budget + over target antar Estate, budget periode {budgetPeriod}</CardDescription>
                                            </CardHeader>
                                            <CardContent className="h-[300px]">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart layout="vertical" data={analyticsData?.estateData} margin={{ left: 20, right: 56 }}>
                                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                                        <XAxis type="number" fontSize={12} />
                                                        <YAxis dataKey="name" type="category" width={90} fontSize={11} />
                                                        <Tooltip formatter={(value, name) => [`${formatNumber(toFiniteNumber(value))} Ton`, String(name)]} />
                                                        <BudgetProgressBars />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </CardContent>
                                        </Card>
                                    </div>

                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Output by Division</CardTitle>
                                            <CardDescription>Stacked: aktual dalam budget + sisa budget + over target antar Divisi, budget periode {budgetPeriod}</CardDescription>
                                        </CardHeader>
                                        <CardContent style={{ height: `${divisionChartHeight}px` }}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart layout="vertical" data={analyticsData?.divisionData} margin={{ left: 40, right: 56 }}>
                                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                                    <XAxis type="number" fontSize={12} />
                                                    <YAxis dataKey="name" type="category" width={100} fontSize={11} />
                                                    <Tooltip formatter={(value, name) => [`${formatNumber(toFiniteNumber(value))} Ton`, String(name)]} />
                                                    <BudgetProgressBars />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </CardContent>
                                    </Card>
                                </div>
                            ) : (
                                <div className="grid gap-6 md:grid-cols-2">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Output by Division</CardTitle>
                                            <CardDescription>Stacked: aktual dalam budget + sisa budget + over target antar Divisi, budget periode {budgetPeriod}</CardDescription>
                                        </CardHeader>
                                        <CardContent style={{ height: `${divisionChartHeight}px` }}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart layout="vertical" data={analyticsData?.divisionData} margin={{ left: 40, right: 56 }}>
                                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                                    <XAxis type="number" fontSize={12} />
                                                    <YAxis dataKey="name" type="category" width={110} fontSize={11} />
                                                    <Tooltip formatter={(value, name) => [`${formatNumber(toFiniteNumber(value))} Ton`, String(name)]} />
                                                    <BudgetProgressBars />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Output by Blok</CardTitle>
                                            <CardDescription>Perbandingan output antar Blok (Top 10)</CardDescription>
                                        </CardHeader>
                                        <CardContent className="h-[300px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart layout="vertical" data={analyticsData?.blockData?.slice(0, 10)} margin={{ left: 30, right: 56 }}>
                                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                                    <XAxis type="number" fontSize={12} />
                                                    <YAxis dataKey="name" type="category" width={120} fontSize={11} />
                                                    <Tooltip formatter={(value: number) => [`${formatNumber(value)} Ton`, 'Output']} />
                                                    <Bar dataKey="outputTon" name="Output (Ton)" fill="#6366f1" radius={[0, 4, 4, 0]}>
                                                        <LabelList dataKey="outputTon" position="right" formatter={formatTonLabel} style={HORIZONTAL_BAR_LABEL_STYLE} />
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </CardContent>
                                    </Card>
                                </div>
                            )}
                        </div>

                        {/* Top 10 Lists */}
                        <div className="grid gap-6 md:grid-cols-2">
                            {/* Top 10 Blocks */}
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center gap-2">
                                        <LayoutGrid className="h-5 w-5 text-indigo-500" />
                                        <CardTitle>Top 10 Blok Highest Output</CardTitle>
                                    </div>
                                    <CardDescription>Blok dengan produksi tertinggi periode ini</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Blok</TableHead>
                                                <TableHead className="text-right">Output (Ton)</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {analyticsData?.topBlocks.map((block, idx) => (
                                                <TableRow key={idx}>
                                                    <TableCell className="font-medium">
                                                        {idx + 1}. {block.name}
                                                    </TableCell>
                                                    <TableCell className="text-right font-bold">
                                                        {formatNumber(block.outputTon)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>

                            {/* Top 10 Harvesters */}
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center gap-2">
                                        <Award className="h-5 w-5 text-amber-500" />
                                        <CardTitle>Top 10 Harvester</CardTitle>
                                    </div>
                                    <CardDescription>Karyawan dengan output tertinggi periode ini</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Nama (NIK)</TableHead>
                                                <TableHead className="text-right">Output (Ton)</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {analyticsData?.topHarvesters.map((h, idx) => (
                                                <TableRow key={idx}>
                                                    <TableCell className="font-medium">
                                                        {idx + 1}. {h.name} ({h.nik})
                                                    </TableCell>
                                                    <TableCell className="text-right font-bold text-amber-600">
                                                        {formatNumber(h.outputTon)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </div>
                    </>
                )}
            </div>
        </ManagerDashboardLayout>
    );
}
