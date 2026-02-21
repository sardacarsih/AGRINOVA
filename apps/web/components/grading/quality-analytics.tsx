'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Star,
  Target,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Filter,
  Download
} from 'lucide-react';

interface QualityAnalytics {
  period: string;
  block: string;
  averageQualityScore: number;
  totalGrading: number;
  gradeDistribution: {
    A: number;
    B: number;
    C: number;
    D: number;
    E: number;
  };
  maturityDistribution: {
    MENTAH: number;
    MASAK: number;
    TERLALU_MASAK: number;
    BUSUK: number;
  };
  averageDefects: {
    brondolan: number;
    looseFruit: number;
    dirt: number;
  };
  trends: {
    qualityScore: number;
    approvalRate: number;
    rejectionRate: number;
  };
}

export function QualityAnalytics() {
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [selectedBlock, setSelectedBlock] = useState('all');

  // Mock analytics data
  const [analytics] = useState<QualityAnalytics>({
    period: 'week',
    block: 'all',
    averageQualityScore: 82.5,
    totalGrading: 156,
    gradeDistribution: {
      A: 28,
      B: 62,
      C: 45,
      D: 18,
      E: 3
    },
    maturityDistribution: {
      MENTAH: 12,
      MASAK: 98,
      TERLALU_MASAK: 38,
      BUSUK: 8
    },
    averageDefects: {
      brondolan: 4.8,
      looseFruit: 3.2,
      dirt: 1.5
    },
    trends: {
      qualityScore: 5.2,
      approvalRate: 8.7,
      rejectionRate: -2.3
    }
  });

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <div className="h-4 w-4 bg-gray-300 rounded-full"></div>;
  };

  const getTrendColor = (trend: number) => {
    if (trend > 0) return 'text-green-600';
    if (trend < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const totalGrading = Object.values(analytics.gradeDistribution).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Filter Analytics</span>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              Export Report
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Periode</label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih periode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Hari Ini</SelectItem>
                  <SelectItem value="week">Minggu Ini</SelectItem>
                  <SelectItem value="month">Bulan Ini</SelectItem>
                  <SelectItem value="quarter">Kuartal Ini</SelectItem>
                  <SelectItem value="year">Tahun Ini</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Blok</label>
              <Select value={selectedBlock} onValueChange={setSelectedBlock}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih blok" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Blok</SelectItem>
                  <SelectItem value="A">Blok A</SelectItem>
                  <SelectItem value="B">Blok B</SelectItem>
                  <SelectItem value="C">Blok C</SelectItem>
                  <SelectItem value="D">Blok D</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Grader</label>
              <Select defaultValue="all">
                <SelectTrigger>
                  <SelectValue placeholder="Pilih grader" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Grader</SelectItem>
                  <SelectItem value="grader-a">Grader A</SelectItem>
                  <SelectItem value="grader-b">Grader B</SelectItem>
                  <SelectItem value="grader-c">Grader C</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Rata-rata Kualitas</p>
                <p className="text-2xl font-bold">{analytics.averageQualityScore.toFixed(1)}</p>
                <div className="flex items-center gap-1 text-sm">
                  {getTrendIcon(analytics.trends.qualityScore)}
                  <span className={getTrendColor(analytics.trends.qualityScore)}>
                    {analytics.trends.qualityScore > 0 ? '+' : ''}{analytics.trends.qualityScore}%
                  </span>
                </div>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Grading</p>
                <p className="text-2xl font-bold">{analytics.totalGrading}</p>
                <div className="flex items-center gap-1 text-sm">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  <span className="text-green-600">{Math.round((totalGrading / analytics.totalGrading) * 100)}% selesai</span>
                </div>
              </div>
              <Target className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tingkat Approval</p>
                <p className="text-2xl font-bold">{analytics.trends.approvalRate.toFixed(1)}%</p>
                <div className="flex items-center gap-1 text-sm">
                  {getTrendIcon(analytics.trends.approvalRate)}
                  <span className={getTrendColor(analytics.trends.approvalRate)}>
                    {analytics.trends.approvalRate > 0 ? '+' : ''}{analytics.trends.approvalRate}%
                  </span>
                </div>
              </div>
              <CheckCircle className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tingkat Rejection</p>
                <p className="text-2xl font-bold">{Math.abs(analytics.trends.rejectionRate).toFixed(1)}%</p>
                <div className="flex items-center gap-1 text-sm">
                  {getTrendIcon(analytics.trends.rejectionRate)}
                  <span className={getTrendColor(analytics.trends.rejectionRate)}>
                    {analytics.trends.rejectionRate > 0 ? '+' : ''}{analytics.trends.rejectionRate}%
                  </span>
                </div>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Grade Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Distribusi Grade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(analytics.gradeDistribution).map(([grade, count]) => {
                const percentage = (count / totalGrading) * 100;
                const gradeColors = {
                  'A': 'bg-green-500',
                  'B': 'bg-blue-500',
                  'C': 'bg-yellow-500',
                  'D': 'bg-orange-500',
                  'E': 'bg-red-500'
                };

                return (
                  <div key={grade} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className={gradeColors[grade as keyof typeof gradeColors]}>
                          Grade {grade}
                        </Badge>
                        <span className="text-sm text-muted-foreground">{count} grading</span>
                      </div>
                      <span className="text-sm font-medium">{percentage.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${gradeColors[grade as keyof typeof gradeColors]}`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Maturity Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Distribusi Kematangan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(analytics.maturityDistribution).map(([maturity, count]) => {
                const totalMaturity = Object.values(analytics.maturityDistribution).reduce((a, b) => a + b, 0);
                const percentage = (count / totalMaturity) * 100;

                const maturityLabels = {
                  'MENTAH': 'Mentah',
                  'MASAK': 'Masak',
                  'TERLALU_MASAK': 'Terlalu Masak',
                  'BUSUK': 'Busuk'
                };

                const maturityColors = {
                  'MENTAH': 'bg-red-500',
                  'MASAK': 'bg-green-500',
                  'TERLALU_MASAK': 'bg-yellow-500',
                  'BUSUK': 'bg-gray-500'
                };

                return (
                  <div key={maturity} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className={maturityColors[maturity as keyof typeof maturityColors]}>
                          {maturityLabels[maturity as keyof typeof maturityLabels]}
                        </Badge>
                        <span className="text-sm text-muted-foreground">{count} grading</span>
                      </div>
                      <span className="text-sm font-medium">{percentage.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${maturityColors[maturity as keyof typeof maturityColors]}`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Average Defects */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Rata-rata Defect
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">% Brondolan</span>
                <Badge variant="outline">{analytics.averageDefects.brondolan}%</Badge>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="h-3 bg-orange-500 rounded-full"
                  style={{ width: `${analytics.averageDefects.brondolan * 10}%` }}
                ></div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Brondolan terlalu tinggi dapat mengurangi grade
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">% Buah Lepas</span>
                <Badge variant="outline">{analytics.averageDefects.looseFruit}%</Badge>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="h-3 bg-yellow-500 rounded-full"
                  style={{ width: `${analytics.averageDefects.looseFruit * 10}%` }}
                ></div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Banyaknya buah lepas menunjukkan panen kurang optimal
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">% Kotoran</span>
                <Badge variant="outline">{analytics.averageDefects.dirt}%</Badge>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="h-3 bg-red-500 rounded-full"
                  style={{ width: `${analytics.averageDefects.dirt * 10}%` }}
                ></div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Kotoran tinggi mempengaruhi kualitas CPO
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}