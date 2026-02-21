'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts'
import { TrendData, DashboardMetrics, EstatePerformance } from '@/types/dashboard'
import { formatWeight, formatNumber } from '@/lib/utils'

interface ChartsProps {
  trendData: TrendData[]
  metrics: DashboardMetrics
  estatePerformance: EstatePerformance[]
  isLoading?: boolean
}

export function Charts({ trendData, metrics, estatePerformance, isLoading = false }: ChartsProps) {
  // Prepare quality distribution data
  const qualityData = [
    { name: 'Excellent', value: metrics.tbsQuality.excellent, color: '#059669' },
    { name: 'Good', value: metrics.tbsQuality.good, color: '#0891b2' },
    { name: 'Fair', value: metrics.tbsQuality.fair, color: '#d97706' },
    { name: 'Poor', value: metrics.tbsQuality.poor, color: '#dc2626' },
    { name: 'Reject', value: metrics.tbsQuality.reject, color: '#991b1b' },
  ]

  // Prepare estate performance data for bar chart
  const estateChartData = estatePerformance.map(estate => ({
    name: estate.estateName.replace('Kebun ', ''),
    weight: Math.round(estate.totalWeight),
    tbs: estate.totalTBS,
    efficiency: estate.efficiency,
  }))

  // Custom tooltip for trend chart
  const TrendTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const date = new Date(label)
      return (
        <div className="bg-white p-4 border rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">
            {date.toLocaleDateString('id-ID', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
          <div className="mt-2 space-y-1">
            <p className="text-sm">
              <span className="text-green-600">● Panen:</span> {formatNumber(payload[0].value)} entri
            </p>
            <p className="text-sm">
              <span className="text-blue-600">● Berat:</span> {formatWeight(payload[1].value)}
            </p>
            <p className="text-sm">
              <span className="text-purple-600">● TBS:</span> {formatNumber(payload[2].value)} buah
            </p>
          </div>
        </div>
      )
    }
    return null
  }

  // Custom tooltip for quality pie chart
  const QualityTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{payload[0].name}</p>
          <p className="text-sm text-gray-600">{payload[0].value}%</p>
        </div>
      )
    }
    return null
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6 mb-8">
      {/* Trend Chart - Full Width */}
      <Card>
        <CardHeader>
          <CardTitle>Tren Panen Harian (30 Hari Terakhir)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => {
                    const date = new Date(value)
                    return date.getDate().toString()
                  }}
                />
                <YAxis yAxisId="harvest" orientation="left" />
                <YAxis yAxisId="weight" orientation="right" />
                <Tooltip content={<TrendTooltip />} />
                <Legend />
                <Line
                  yAxisId="harvest"
                  type="monotone"
                  dataKey="harvest"
                  stroke="#059669"
                  strokeWidth={2}
                  name="Jumlah Panen"
                  dot={{ fill: '#059669', strokeWidth: 2, r: 4 }}
                />
                <Line
                  yAxisId="weight"
                  type="monotone"
                  dataKey="weight"
                  stroke="#0891b2"
                  strokeWidth={2}
                  name="Berat (kg)"
                  dot={{ fill: '#0891b2', strokeWidth: 2, r: 4 }}
                />
                <Line
                  yAxisId="harvest"
                  type="monotone"
                  dataKey="tbs"
                  stroke="#7c3aed"
                  strokeWidth={2}
                  name="Total TBS"
                  dot={{ fill: '#7c3aed', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Quality Distribution and Estate Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Distribusi Kualitas TBS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={qualityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {qualityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<QualityTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {qualityData.map((item) => (
                <div key={item.name} className="flex items-center space-x-2 text-sm">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  ></div>
                  <span className="text-gray-600">{item.name}:</span>
                  <span className="font-medium">{item.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performa Estate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={estateChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis yAxisId="weight" orientation="left" />
                  <YAxis yAxisId="efficiency" orientation="right" />
                  <Tooltip 
                    formatter={(value, name) => {
                      if (name === 'Berat (kg)') return [formatWeight(value as number), name]
                      if (name === 'Total TBS') return [formatNumber(value as number), name]
                      if (name === 'Efisiensi (%)') return [`${value}%`, name]
                      return [value, name]
                    }}
                  />
                  <Legend />
                  <Bar 
                    yAxisId="weight"
                    dataKey="weight" 
                    fill="#059669" 
                    name="Berat (kg)"
                    radius={[2, 2, 0, 0]}
                  />
                  <Bar 
                    yAxisId="efficiency"
                    dataKey="efficiency" 
                    fill="#0891b2" 
                    name="Efisiensi (%)"
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Estate Detail Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Detail Performa per Estate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {estatePerformance.map((estate) => (
              <div key={estate.estateId} className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-lg text-gray-900 mb-3">
                  {estate.estateName}
                </h4>
                
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Berat:</span>
                    <span className="font-medium">{formatWeight(estate.totalWeight)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total TBS:</span>
                    <span className="font-medium">{formatNumber(estate.totalTBS)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Kualitas Rata-rata:</span>
                    <span className="font-medium">{estate.averageQuality}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Efisiensi:</span>
                    <span className="font-medium text-green-600">{estate.efficiency}%</span>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <h5 className="text-sm font-medium text-gray-700">Per Blok:</h5>
                  {estate.blocks.slice(0, 3).map((block) => (
                    <div key={block.blockId} className="flex justify-between items-center text-xs">
                      <span className="text-gray-600">{block.blockName}:</span>
                      <span className="text-gray-900">{formatWeight(block.weight)}</span>
                    </div>
                  ))}
                  {estate.blocks.length > 3 && (
                    <div className="text-xs text-gray-500 text-center pt-1">
                      +{estate.blocks.length - 3} blok lainnya
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}