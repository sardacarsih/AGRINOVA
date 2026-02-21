'use client';

import React from 'react';
import { useRoleStatistics } from '../hooks/useRoleStatistics';
import { Card, CardContent } from '@/components/ui/card';
import { UserRole } from '@/gql/graphql';
import {
    Users,
    Crown,
    Building2,
    Globe,
    MapPin,
    UserCheck,
    Shield,
    Scale,
    ClipboardCheck,
} from 'lucide-react';

interface RoleStatisticsCardsProps {
    companyId?: string;
    roles?: UserRole[];
}

const roleConfig: Record<
    UserRole,
    { label: string; icon: React.ComponentType<{ className?: string }>; iconColor: string; iconBg: string }
> = {
    [UserRole.SuperAdmin]: {
        label: 'Super Admin',
        icon: Crown,
        iconColor: 'text-violet-700 dark:text-violet-300',
        iconBg: 'bg-violet-100 dark:bg-violet-950/50',
    },
    [UserRole.CompanyAdmin]: {
        label: 'Admin Perusahaan',
        icon: Building2,
        iconColor: 'text-blue-700 dark:text-blue-300',
        iconBg: 'bg-blue-100 dark:bg-blue-950/50',
    },
    [UserRole.AreaManager]: {
        label: 'Area Manager',
        icon: Globe,
        iconColor: 'text-indigo-700 dark:text-indigo-300',
        iconBg: 'bg-indigo-100 dark:bg-indigo-950/50',
    },
    [UserRole.Manager]: {
        label: 'Manager',
        icon: MapPin,
        iconColor: 'text-emerald-700 dark:text-emerald-300',
        iconBg: 'bg-emerald-100 dark:bg-emerald-950/50',
    },
    [UserRole.Asisten]: {
        label: 'Asisten',
        icon: UserCheck,
        iconColor: 'text-amber-700 dark:text-amber-300',
        iconBg: 'bg-amber-100 dark:bg-amber-950/50',
    },
    [UserRole.Mandor]: {
        label: 'Mandor',
        icon: Users,
        iconColor: 'text-orange-700 dark:text-orange-300',
        iconBg: 'bg-orange-100 dark:bg-orange-950/50',
    },
    [UserRole.Satpam]: {
        label: 'Satpam',
        icon: Shield,
        iconColor: 'text-rose-700 dark:text-rose-300',
        iconBg: 'bg-rose-100 dark:bg-rose-950/50',
    },
    [UserRole.Timbangan]: {
        label: 'Timbangan',
        icon: Scale,
        iconColor: 'text-pink-700 dark:text-pink-300',
        iconBg: 'bg-pink-100 dark:bg-pink-950/50',
    },
    [UserRole.Grading]: {
        label: 'Grading',
        icon: ClipboardCheck,
        iconColor: 'text-yellow-700 dark:text-yellow-300',
        iconBg: 'bg-yellow-100 dark:bg-yellow-950/50',
    },
};

export function RoleStatisticsCards({ companyId, roles }: RoleStatisticsCardsProps) {
    const { statistics, isLoading } = useRoleStatistics({ companyId, roles });
    const placeholderCount = roles?.length ?? 7;

    if (isLoading) {
        return (
            <Card className="animate-pulse rounded-2xl border border-border bg-card shadow-sm">
                <CardContent className="p-6 md:p-8">
                    <div className="mb-8 space-y-3">
                        <div className="h-8 w-52 rounded bg-muted" />
                        <div className="h-5 w-80 rounded bg-muted/70" />
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-4 xl:grid-cols-7">
                        {Array.from({ length: placeholderCount }).map((_, i) => (
                            <div key={i} className="flex flex-col items-center gap-3">
                                <div className="h-16 w-16 rounded-full bg-muted/70" />
                                <div className="h-9 w-8 rounded bg-muted" />
                                <div className="h-5 w-24 rounded bg-muted/70" />
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="rounded-2xl border border-border bg-card shadow-sm">
            <CardContent className="p-6 md:p-8">
                <div className="mb-8">
                    <div className="flex items-center gap-3">
                        <Users className="h-7 w-7 text-foreground" />
                        <h2 className="text-3xl font-semibold text-foreground">Distribusi Peran</h2>
                    </div>
                    <p className="mt-3 text-base text-muted-foreground md:text-[1.05rem]">
                        Distribusi pengguna berdasarkan peran dalam sistem
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-4 xl:grid-cols-7">
                    {statistics.map((stat) => {
                        const config = roleConfig[stat.role as UserRole] || {
                            label: stat.role,
                            icon: Users,
                            iconColor: 'text-foreground',
                            iconBg: 'bg-muted',
                        };
                        const Icon = config.icon;

                        return (
                            <div key={stat.role} className="flex flex-col items-center text-center">
                                <div className={`mb-4 flex h-16 w-16 items-center justify-center rounded-full ${config.iconBg}`}>
                                    <Icon className={`h-8 w-8 ${config.iconColor}`} />
                                </div>
                                <div className="text-[2.4rem] font-bold leading-none text-foreground">{stat.count}</div>
                                <p className="mt-3 text-[1.05rem] text-muted-foreground">{config.label}</p>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
