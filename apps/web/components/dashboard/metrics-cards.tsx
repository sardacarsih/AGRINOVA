'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DashboardMetrics } from '@/types/dashboard'
import { formatWeight, formatNumber } from '@/lib/utils'
import { TrendingUp, TrendingDown, Scale, Users, Clock, Target } from 'lucide-react'

interface MetricsCardsProps {
  metrics: DashboardMetrics
  isLoading?: boolean
}

export function MetricsCards({ metrics, isLoading = false }: MetricsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-6 bg-muted rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const cards = [
    {
      title: 'Panen Hari Ini',
      icon: Target,
      value: formatNumber(metrics.totalHarvestToday.count),
      subtitle: formatWeight(metrics.totalHarvestToday.weight),
      change: metrics.totalHarvestToday.percentage,
      color: 'text-status-success',
      bgColor: 'bg-status-success-background dark:bg-status-success/10',
    },
    {
      title: 'Panen Minggu Ini',
      icon: Scale,
      value: formatNumber(metrics.totalHarvestWeek.count),
      subtitle: formatWeight(metrics.totalHarvestWeek.weight),
      change: metrics.totalHarvestWeek.percentage,
      color: 'text-status-info',
      bgColor: 'bg-status-info-background dark:bg-status-info/10',
    },
    {
      title: 'Panen Bulan Ini',
      icon: Scale,
      value: formatNumber(metrics.totalHarvestMonth.count),
      subtitle: formatWeight(metrics.totalHarvestMonth.weight),
      change: metrics.totalHarvestMonth.percentage,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Menunggu Approval',
      icon: Clock,
      value: formatNumber(metrics.pendingApprovals.count),
      subtitle: 'entri pending',
      change: metrics.pendingApprovals.percentage,
      color: 'text-status-warning',
      bgColor: 'bg-status-warning-background dark:bg-status-warning/10',
    },
    {
      title: 'Mandor Aktif',
      icon: Users,
      value: `${metrics.activeMandor.count}/${metrics.activeMandor.total}`,
      subtitle: 'mandor bertugas',
      change: null,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Kualitas TBS',
      icon: Target,
      value: `${metrics.tbsQuality.excellent + metrics.tbsQuality.good}%`,
      subtitle: 'excellent & good',
      change: null,
      color: 'text-status-success',
      bgColor: 'bg-status-success-background dark:bg-status-success/10',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
      {cards.map((card, index) => {
        const Icon = card.icon
        
        return (
          <Card key={index} className="relative overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <div className="absolute top-4 right-4 p-2 rounded-lg bg-primary/10">
                <Icon className="w-4 h-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="text-2xl font-bold text-foreground">
                  {card.value}
                </div>
                <p className="text-xs text-muted-foreground">
                  {card.subtitle}
                </p>
                {card.change !== null && (
                  <div className="flex items-center space-x-1">
                    {card.change > 0 ? (
                      <TrendingUp className="w-3 h-3 text-status-success" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-status-error" />
                    )}
                    <span className={`text-xs font-medium ${
                      card.change > 0 ? 'text-status-success' : 'text-status-error'
                    }`}>
                      {Math.abs(card.change)}%
                    </span>
                    <span className="text-xs text-muted-foreground">
                      vs periode sebelumnya
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}