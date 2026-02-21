'use client';

import React from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp } from 'lucide-react';

interface HarvestDataPoint {
    date: string;
    weight: number;
    originalDate: string;
}

interface HarvestTrendChartProps {
    data: HarvestDataPoint[];
    title?: string;
    description?: string;
    trend?: number;
}

interface HarvestTooltipProps {
    active?: boolean;
    payload?: Array<{ value?: number | string }>;
    label?: string;
}

function HarvestTooltip({ active, payload, label }: HarvestTooltipProps) {
    if (active && payload && payload.length > 0) {
        const rawValue = payload[0]?.value;
        const numericValue = typeof rawValue === 'number' ? rawValue : Number(rawValue || 0);

        return (
            <div className="rounded-lg border bg-background/95 p-3 shadow-lg backdrop-blur-sm ring-1 ring-black/5">
                <p className="mb-1 text-xs font-semibold text-muted-foreground">{label}</p>
                <p className="font-mono text-sm font-bold text-foreground">
                    {numericValue.toLocaleString('id-ID')} <span className="text-xs font-normal text-muted-foreground">kg</span>
                </p>
            </div>
        );
    }

    return null;
}

export function HarvestTrendChart({
    data,
    title = "Tren Panen",
    description = "Total berat TBS yang disetujui (7 hari terakhir)",
    trend
}: HarvestTrendChartProps) {
    return (
        <Card className="col-span-1 overflow-hidden lg:col-span-2 shadow-sm border-border/50 hover:shadow-md transition-shadow duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="space-y-1">
                    <CardTitle className="text-base font-semibold">{title}</CardTitle>
                    <CardDescription className="text-xs">{description}</CardDescription>
                </div>
                {trend !== undefined && (
                    <Badge
                        variant="outline"
                        className={`flex items-center gap-1 ${trend > 0 ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : 'text-rose-600 bg-rose-50 border-rose-200'}`}
                    >
                        <TrendingUp className={`h-3 w-3 ${trend < 0 ? 'rotate-180' : ''}`} />
                        {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
                    </Badge>
                )}
            </CardHeader>
            <CardContent className="h-[300px] w-full pt-4">
                {data.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                            <XAxis
                                dataKey="date"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 11, fill: '#64748B' }}
                                dy={10}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 11, fill: '#64748B' }}
                                tickFormatter={(value) => `${(value / 1000).toFixed(0)}t`}
                            />
                            <Tooltip cursor={{ stroke: '#f97316', strokeWidth: 1, strokeDasharray: '4 4' }} content={<HarvestTooltip />} />
                            <Area
                                type="monotone"
                                dataKey="weight"
                                stroke="#f97316"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorWeight)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                        Belum ada data panen yang cukup untuk ditampilkan
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
