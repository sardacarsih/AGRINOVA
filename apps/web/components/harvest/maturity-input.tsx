'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Leaf,
  Scale,
  AlertTriangle,
  CheckCircle,
  Info,
  TrendingUp,
  TrendingDown,
  Target
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { 
  HarvestEmployee, 
  TBS_CATEGORIES, 
  TBS_QUALITY_WEIGHTS,
  TBS_WEIGHT_RANGES,
  calculateMaturityRatio,
  calculateWeightedQuality,
  calculateAdjustedBJR,
  getQualityRecommendation
} from '@/types/harvest';

interface MaturityInputProps {
  employeeData: HarvestEmployee;
  onUpdate: (data: Partial<HarvestEmployee>) => void;
  disabled?: boolean;
  showAdvanced?: boolean;
}

export function MaturityInput({ 
  employeeData, 
  onUpdate, 
  disabled = false,
  showAdvanced = true 
}: MaturityInputProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [validation, setValidation] = useState<{
    warnings: string[];
    errors: string[];
    suggestions: string[];
  }>({ warnings: [], errors: [], suggestions: [] });

  // Calculate derived values
  const maturityRatio = calculateMaturityRatio(employeeData);
  const weightedQuality = calculateWeightedQuality(employeeData);
  const adjustedBJR = calculateAdjustedBJR(employeeData);
  const qualityRec = getQualityRecommendation(employeeData);

  const totalTbs = employeeData.tbsMatang + employeeData.tbsMentah + 
                  employeeData.tbsLewatMatang + employeeData.tbsKosong;
  const totalWeight = employeeData.beratMatang + employeeData.beratMentah + 
                     employeeData.beratLewatMatang + employeeData.beratKosong;

  // Validation effect
  useEffect(() => {
    const warnings: string[] = [];
    const errors: string[] = [];
    const suggestions: string[] = [];

    // Check maturity ratio
    if (maturityRatio < 40) {
      warnings.push('Rasio kematangan rendah (<40%)');
      suggestions.push('Tingkatkan seleksi TBS matang');
    }

    // Check weight consistency
    Object.entries({
      matang: { tbs: employeeData.tbsMatang, weight: employeeData.beratMatang },
      mentah: { tbs: employeeData.tbsMentah, weight: employeeData.beratMentah },
      lewat_matang: { tbs: employeeData.tbsLewatMatang, weight: employeeData.beratLewatMatang },
      kosong: { tbs: employeeData.tbsKosong, weight: employeeData.beratKosong }
    }).forEach(([category, data]) => {
      if (data.tbs > 0) {
        const avgWeight = data.weight / data.tbs;
        const range = TBS_WEIGHT_RANGES[category.toUpperCase() as keyof typeof TBS_WEIGHT_RANGES];
        
        if (avgWeight < range.min) {
          warnings.push(`Berat rata-rata TBS ${category} terlalu ringan (${avgWeight.toFixed(1)}kg)`);
        } else if (avgWeight > range.max) {
          warnings.push(`Berat rata-rata TBS ${category} terlalu berat (${avgWeight.toFixed(1)}kg)`);
        }
      }
    });

    // Check unripe percentage
    const unripePercentage = totalTbs > 0 ? (employeeData.tbsMentah / totalTbs) * 100 : 0;
    if (unripePercentage > 25) {
      errors.push('TBS mentah terlalu tinggi (>25%)');
      suggestions.push('Pelatihan identifikasi kematangan buah diperlukan');
    }

    setValidation({ warnings, errors, suggestions });
  }, [employeeData, maturityRatio, totalTbs]);

  const handleInputChange = (field: keyof HarvestEmployee, value: number) => {
    const updates = { [field]: Math.max(0, value) };
    
    // Auto-calculate totals
    if (field.includes('tbs') || field.includes('berat')) {
      const newData = { ...employeeData, ...updates };
      updates.totalTbs = newData.tbsMatang + newData.tbsMentah + newData.tbsLewatMatang + newData.tbsKosong;
      updates.totalWeight = newData.beratMatang + newData.beratMentah + newData.beratLewatMatang + newData.beratKosong;
      updates.maturityRatio = calculateMaturityRatio(newData as HarvestEmployee);
    }
    
    onUpdate(updates);
  };

  const getTbsCategoryBadge = (category: keyof typeof TBS_CATEGORIES, count: number) => {
    const colors = {
      MATANG: 'bg-green-100 text-green-800 border-green-200',
      MENTAH: 'bg-red-100 text-red-800 border-red-200', 
      LEWAT_MATANG: 'bg-orange-100 text-orange-800 border-orange-200',
      KOSONG: 'bg-gray-100 text-gray-800 border-gray-200'
    };

    const labels = {
      MATANG: 'Matang',
      MENTAH: 'Mentah', 
      LEWAT_MATANG: 'Lewat Matang',
      KOSONG: 'Kosong'
    };

    return (
      <Badge className={cn('text-xs border', colors[category])}>
        {labels[category]}: {count}
      </Badge>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center space-x-2">
            <Leaf className="h-5 w-5 text-green-600" />
            <span>Input TBS per Tingkat Kematangan</span>
          </CardTitle>
          <div className="flex space-x-2">
            {getTbsCategoryBadge('MATANG', employeeData.tbsMatang)}
            {showAdvanced && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
              >
                <Info className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Main Input Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* TBS Matang */}
          <div className="space-y-3 p-4 border border-green-200 rounded-lg bg-green-50/50">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <Label className="font-medium text-green-800">TBS Matang</Label>
            </div>
            <div className="space-y-2">
              <div>
                <Label className="text-xs text-gray-600">Jumlah Tandan</Label>
                <Input
                  type="number"
                  min="0"
                  value={employeeData.tbsMatang || ''}
                  onChange={(e) => handleInputChange('tbsMatang', parseInt(e.target.value) || 0)}
                  disabled={disabled}
                  className="text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-600">Berat (kg)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  value={employeeData.beratMatang || ''}
                  onChange={(e) => handleInputChange('beratMatang', parseFloat(e.target.value) || 0)}
                  disabled={disabled}
                  className="text-sm"
                />
              </div>
            </div>
            {employeeData.tbsMatang > 0 && (
              <div className="text-xs text-green-700">
                Rata-rata: {(employeeData.beratMatang / employeeData.tbsMatang).toFixed(1)} kg/tandan
              </div>
            )}
          </div>

          {/* TBS Mentah */}
          <div className="space-y-3 p-4 border border-red-200 rounded-lg bg-red-50/50">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <Label className="font-medium text-red-800">TBS Mentah</Label>
            </div>
            <div className="space-y-2">
              <div>
                <Label className="text-xs text-gray-600">Jumlah Tandan</Label>
                <Input
                  type="number"
                  min="0"
                  value={employeeData.tbsMentah || ''}
                  onChange={(e) => handleInputChange('tbsMentah', parseInt(e.target.value) || 0)}
                  disabled={disabled}
                  className="text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-600">Berat (kg)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  value={employeeData.beratMentah || ''}
                  onChange={(e) => handleInputChange('beratMentah', parseFloat(e.target.value) || 0)}
                  disabled={disabled}
                  className="text-sm"
                />
              </div>
            </div>
            {employeeData.tbsMentah > 0 && (
              <div className="text-xs text-red-700">
                Rata-rata: {(employeeData.beratMentah / employeeData.tbsMentah).toFixed(1)} kg/tandan
              </div>
            )}
          </div>

          {/* TBS Lewat Matang */}
          <div className="space-y-3 p-4 border border-orange-200 rounded-lg bg-orange-50/50">
            <div className="flex items-center space-x-2">
              <TrendingDown className="h-4 w-4 text-orange-600" />
              <Label className="font-medium text-orange-800">TBS Lewat Matang</Label>
            </div>
            <div className="space-y-2">
              <div>
                <Label className="text-xs text-gray-600">Jumlah Tandan</Label>
                <Input
                  type="number"
                  min="0"
                  value={employeeData.tbsLewatMatang || ''}
                  onChange={(e) => handleInputChange('tbsLewatMatang', parseInt(e.target.value) || 0)}
                  disabled={disabled}
                  className="text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-600">Berat (kg)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  value={employeeData.beratLewatMatang || ''}
                  onChange={(e) => handleInputChange('beratLewatMatang', parseFloat(e.target.value) || 0)}
                  disabled={disabled}
                  className="text-sm"
                />
              </div>
            </div>
            {employeeData.tbsLewatMatang > 0 && (
              <div className="text-xs text-orange-700">
                Rata-rata: {(employeeData.beratLewatMatang / employeeData.tbsLewatMatang).toFixed(1)} kg/tandan
              </div>
            )}
          </div>

          {/* TBS Kosong */}
          <div className="space-y-3 p-4 border border-gray-200 rounded-lg bg-gray-50/50">
            <div className="flex items-center space-x-2">
              <Target className="h-4 w-4 text-gray-600" />
              <Label className="font-medium text-gray-800">TBS Kosong</Label>
            </div>
            <div className="space-y-2">
              <div>
                <Label className="text-xs text-gray-600">Jumlah Tandan</Label>
                <Input
                  type="number"
                  min="0"
                  value={employeeData.tbsKosong || ''}
                  onChange={(e) => handleInputChange('tbsKosong', parseInt(e.target.value) || 0)}
                  disabled={disabled}
                  className="text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-600">Berat (kg)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  value={employeeData.beratKosong || ''}
                  onChange={(e) => handleInputChange('beratKosong', parseFloat(e.target.value) || 0)}
                  disabled={disabled}
                  className="text-sm"
                />
              </div>
            </div>
            {employeeData.tbsKosong > 0 && (
              <div className="text-xs text-gray-700">
                Rata-rata: {(employeeData.beratKosong / employeeData.tbsKosong).toFixed(1)} kg/tandan
              </div>
            )}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-900">{totalTbs}</div>
            <div className="text-xs text-blue-700">Total TBS</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-900">{totalWeight.toFixed(1)}</div>
            <div className="text-xs text-blue-700">Total Berat (kg)</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-900">{maturityRatio.toFixed(1)}%</div>
            <div className="text-xs text-blue-700">Rasio Matang</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-900">{adjustedBJR.toFixed(2)}</div>
            <div className="text-xs text-blue-700">BJR Adjusted</div>
          </div>
        </div>

        {/* Quality Indicator */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="font-medium">Kualitas Panen</Label>
            <Badge className={cn(
              'text-xs',
              qualityRec.level === 'excellent' ? 'bg-green-100 text-green-800' :
              qualityRec.level === 'good' ? 'bg-blue-100 text-blue-800' :
              qualityRec.level === 'fair' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            )}>
              {qualityRec.level === 'excellent' ? 'Sangat Baik' :
               qualityRec.level === 'good' ? 'Baik' :
               qualityRec.level === 'fair' ? 'Cukup' : 'Kurang'}
            </Badge>
          </div>
          
          <Progress 
            value={maturityRatio} 
            className="h-3"
            // @ts-ignore
            indicatorClassName={cn(
              qualityRec.level === 'excellent' ? 'bg-green-500' :
              qualityRec.level === 'good' ? 'bg-blue-500' :
              qualityRec.level === 'fair' ? 'bg-yellow-500' :
              'bg-red-500'
            )}
          />
          
          <p className="text-sm text-gray-600">{qualityRec.message}</p>
        </div>

        {/* Validation Messages */}
        {(validation.errors.length > 0 || validation.warnings.length > 0) && (
          <div className="space-y-2">
            {validation.errors.map((error, index) => (
              <div key={index} className="flex items-start space-x-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            ))}
            {validation.warnings.map((warning, index) => (
              <div key={index} className="flex items-start space-x-2 text-sm text-yellow-600 bg-yellow-50 p-2 rounded">
                <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{warning}</span>
              </div>
            ))}
          </div>
        )}

        {/* Advanced Details */}
        {showAdvanced && showDetails && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-4 border-t pt-4"
          >
            <h4 className="font-medium flex items-center space-x-2">
              <TrendingUp className="h-4 w-4" />
              <span>Analisis Detil</span>
            </h4>
            
            {/* Composition Breakdown */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Komposisi TBS</Label>
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Matang:</span>
                    <span className="font-medium text-green-600">
                      {totalTbs > 0 ? ((employeeData.tbsMatang / totalTbs) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Mentah:</span>
                    <span className="font-medium text-red-600">
                      {totalTbs > 0 ? ((employeeData.tbsMentah / totalTbs) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Lewat Matang:</span>
                    <span className="font-medium text-orange-600">
                      {totalTbs > 0 ? ((employeeData.tbsLewatMatang / totalTbs) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Rekomendasi Perbaikan</Label>
                <div className="mt-2">
                  {qualityRec.improvements ? (
                    <ul className="text-xs space-y-1 text-gray-600">
                      {qualityRec.improvements.map((improvement, index) => (
                        <li key={index} className="flex items-start space-x-1">
                          <span>•</span>
                          <span>{improvement}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-green-600">Tidak ada perbaikan yang diperlukan</p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Brondolan Input */}
        <div className="border-t pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="brondolan">Brondolan (kg)</Label>
              <Input
                id="brondolan"
                type="number"
                min="0"
                step="0.1"
                value={employeeData.brondolan || ''}
                onChange={(e) => handleInputChange('brondolan', parseFloat(e.target.value) || 0)}
                disabled={disabled}
                placeholder="0.0"
              />
            </div>
            <div>
              <Label htmlFor="quality">Kualitas Keseluruhan (1-5)</Label>
              <Input
                id="quality"
                type="number"
                min="1"
                max="5"
                value={employeeData.quality || ''}
                onChange={(e) => handleInputChange('quality', parseInt(e.target.value) || 1)}
                disabled={disabled}
                placeholder="5"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}