'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Save,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Calculator,
  Eye,
  EyeOff,
  Trash2,
  Info
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { pksBJRService } from '@/lib/services/pks-bjr-data';
import { 
  Employee, 
  HarvestEmployee,
  calculateMaturityRatio,
  calculateWeightedQuality,
  calculateAdjustedBJR,
  getQualityRecommendation
} from '@/types/harvest';

export interface SingleEmployeeHarvestData {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  
  // TBS data by maturity - single comprehensive entry
  tbsMatang: number;
  beratMatang: number;
  tbsMentah: number;
  beratMentah: number;
  tbsLewatMatang: number;
  beratLewatMatang: number;
  tbsKosong: number;
  beratKosong: number;
  
  brondolan: number;
  quality: number;
  notes?: string;
}

interface SingleEmployeeHarvestInputProps {
  employee: Employee;
  data: SingleEmployeeHarvestData;
  onUpdate: (data: SingleEmployeeHarvestData) => void;
  blockId: string;
  harvestDate: string; // YYYY-MM-DD format
  onRemove?: () => void;
  disabled?: boolean;
  showAdvanced?: boolean;
  autoExpanded?: boolean;
}

export function SingleEmployeeHarvestInput({
  employee,
  data,
  onUpdate,
  blockId,
  harvestDate,
  onRemove,
  disabled = false,
  showAdvanced = true,
  autoExpanded = false
}: SingleEmployeeHarvestInputProps) {
  const [isExpanded, setIsExpanded] = useState(autoExpanded);
  const [showCalculations, setShowCalculations] = useState(false);

  // Calculate totals and metrics
  const totalTbs = data.tbsMatang + data.tbsMentah + data.tbsLewatMatang + data.tbsKosong;
  const totalWeight = data.beratMatang + data.beratMentah + data.beratLewatMatang + data.beratKosong;

  // Create HarvestEmployee object for calculations
  const harvestEmployee: HarvestEmployee = {
    id: data.id,
    employeeId: data.employeeId,
    employeeName: data.employeeName,
    employeeCode: data.employeeCode,
    tbsMatang: data.tbsMatang,
    beratMatang: data.beratMatang,
    tbsMentah: data.tbsMentah,
    beratMentah: data.beratMentah,
    tbsLewatMatang: data.tbsLewatMatang,
    beratLewatMatang: data.beratLewatMatang,
    tbsKosong: data.tbsKosong,
    beratKosong: data.beratKosong,
    brondolan: data.brondolan,
    quality: data.quality,
    totalTbs: totalTbs,
    totalWeight: totalWeight
  };

  const maturityRatio = calculateMaturityRatio(harvestEmployee);
  const weightedQuality = calculateWeightedQuality(harvestEmployee);
  const adjustedBJR = calculateAdjustedBJR(harvestEmployee);
  const qualityRec = getQualityRecommendation(harvestEmployee);

  const updateField = (field: keyof SingleEmployeeHarvestData, value: any) => {
    const updatedData = { ...data, [field]: value };
    
    // Auto-calculate weights using BJR when TBS counts change
    if (['tbsMatang', 'tbsMentah', 'tbsLewatMatang', 'tbsKosong'].includes(field)) {
      const weights = pksBJRService.calculateTotalWeight({
        tbsMatang: field === 'tbsMatang' ? value : data.tbsMatang,
        tbsMentah: field === 'tbsMentah' ? value : data.tbsMentah,
        tbsLewatMatang: field === 'tbsLewatMatang' ? value : data.tbsLewatMatang,
        tbsKosong: field === 'tbsKosong' ? value : data.tbsKosong
      }, blockId, harvestDate);
      
      updatedData.beratMatang = weights.beratMatang;
      updatedData.beratMentah = weights.beratMentah;
      updatedData.beratLewatMatang = weights.beratLewatMatang;
      updatedData.beratKosong = weights.beratKosong;
    }
    
    onUpdate(updatedData);
  };

  const resetData = () => {
    const resetData: SingleEmployeeHarvestData = {
      ...data,
      tbsMatang: 0, beratMatang: 0,
      tbsMentah: 0, beratMentah: 0,
      tbsLewatMatang: 0, beratLewatMatang: 0,
      tbsKosong: 0, beratKosong: 0,
      brondolan: 0,
      quality: 5,
      notes: ''
    };
    onUpdate(resetData);
  };

  const currentBJR = pksBJRService.getBJR(blockId, harvestDate);
  const hasData = totalTbs > 0;

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="w-10 h-10">
              <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                {employee.name.charAt(0).toUpperCase()}
              </div>
            </Avatar>
            <div>
              <CardTitle className="text-lg">{employee.name}</CardTitle>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <span>ID: {employee.code}</span>
                <span>•</span>
                <span>{employee.position}</span>
                <Badge variant="outline" className="text-xs ml-2">
                  {employee.divisiName}
                </Badge>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {showAdvanced && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCalculations(!showCalculations)}
                disabled={disabled}
                className={cn(showCalculations && "bg-blue-50 text-blue-600")}
              >
                <Calculator className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost" 
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            {onRemove && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRemove}
                className="text-red-600 hover:text-red-700"
                disabled={disabled}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Summary Stats */}
        {(showCalculations || !isExpanded) && hasData && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-3 p-3 bg-gray-50 rounded-lg border">
            <div className="text-center">
              <div className="text-xl font-bold text-gray-900">{totalTbs}</div>
              <div className="text-xs text-gray-600">Total TBS</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-gray-900">{totalWeight.toFixed(1)}</div>
              <div className="text-xs text-gray-600">Total Berat (kg)</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-gray-900">{maturityRatio.toFixed(1)}%</div>
              <div className="text-xs text-gray-600">Rasio Matang</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-gray-900">
                {totalTbs > 0 ? (totalWeight / totalTbs).toFixed(2) : '0.00'}
              </div>
              <div className="text-xs text-gray-600">BJR Aktual</div>
            </div>
          </div>
        )}

        {/* Quality Indicator */}
        {showCalculations && hasData && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Kualitas Panen</span>
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
            <p className="text-sm text-gray-600">{qualityRec.message}</p>
            {qualityRec.improvements && (
              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                <p className="font-medium text-yellow-800 mb-1">Rekomendasi:</p>
                <ul className="list-disc list-inside text-yellow-700 space-y-0.5">
                  {qualityRec.improvements.map((improvement, index) => (
                    <li key={index}>{improvement}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardHeader>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <CardContent className="space-y-4">
              {/* BJR Information */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <Info className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-blue-800">
                      BJR Reference: {currentBJR} kg/tandan
                    </span>
                  </div>
                  <span className="text-blue-600">Auto-calculated weights</span>
                </div>
              </div>

              {/* TBS Input Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* TBS Matang */}
                <div className="space-y-2 p-4 border border-green-200 rounded-lg bg-green-50/50">
                  <Label className="text-sm font-medium text-green-800 flex items-center">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    TBS Matang
                  </Label>
                  <div className="space-y-2">
                    <div>
                      <Label className="text-xs text-gray-600">Jumlah Tandan</Label>
                      <Input
                        type="number"
                        min="0"
                        value={data.tbsMatang || ''}
                        onChange={(e) => updateField('tbsMatang', parseInt(e.target.value) || 0)}
                        disabled={disabled}
                        className="text-sm h-9"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Berat (kg)</Label>
                      <div className="text-sm h-9 flex items-center px-3 bg-gray-50 border rounded font-medium text-gray-700">
                        {data.beratMatang.toFixed(1)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* TBS Mentah */}
                <div className="space-y-2 p-4 border border-red-200 rounded-lg bg-red-50/50">
                  <Label className="text-sm font-medium text-red-800 flex items-center">
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    TBS Mentah
                  </Label>
                  <div className="space-y-2">
                    <div>
                      <Label className="text-xs text-gray-600">Jumlah Tandan</Label>
                      <Input
                        type="number"
                        min="0"
                        value={data.tbsMentah || ''}
                        onChange={(e) => updateField('tbsMentah', parseInt(e.target.value) || 0)}
                        disabled={disabled}
                        className="text-sm h-9"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Berat (kg)</Label>
                      <div className="text-sm h-9 flex items-center px-3 bg-gray-50 border rounded font-medium text-gray-700">
                        {data.beratMentah.toFixed(1)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* TBS Lewat Matang */}
                <div className="space-y-2 p-4 border border-orange-200 rounded-lg bg-orange-50/50">
                  <Label className="text-sm font-medium text-orange-800 flex items-center">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    Lewat Matang
                  </Label>
                  <div className="space-y-2">
                    <div>
                      <Label className="text-xs text-gray-600">Jumlah Tandan</Label>
                      <Input
                        type="number"
                        min="0"
                        value={data.tbsLewatMatang || ''}
                        onChange={(e) => updateField('tbsLewatMatang', parseInt(e.target.value) || 0)}
                        disabled={disabled}
                        className="text-sm h-9"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Berat (kg)</Label>
                      <div className="text-sm h-9 flex items-center px-3 bg-gray-50 border rounded font-medium text-gray-700">
                        {data.beratLewatMatang.toFixed(1)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* TBS Kosong */}
                <div className="space-y-2 p-4 border border-gray-200 rounded-lg bg-gray-50/50">
                  <Label className="text-sm font-medium text-gray-800 flex items-center">
                    <User className="h-4 w-4 mr-1" />
                    TBS Kosong
                  </Label>
                  <div className="space-y-2">
                    <div>
                      <Label className="text-xs text-gray-600">Jumlah Tandan</Label>
                      <Input
                        type="number"
                        min="0"
                        value={data.tbsKosong || ''}
                        onChange={(e) => updateField('tbsKosong', parseInt(e.target.value) || 0)}
                        disabled={disabled}
                        className="text-sm h-9"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Berat (kg)</Label>
                      <div className="text-sm h-9 flex items-center px-3 bg-gray-50 border rounded font-medium text-gray-700">
                        {data.beratKosong.toFixed(1)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Fields */}
              <Separator />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium">Brondolan (kg)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    value={data.brondolan || ''}
                    onChange={(e) => updateField('brondolan', parseFloat(e.target.value) || 0)}
                    disabled={disabled}
                    className="text-sm mt-1"
                    placeholder="0.0"
                  />
                  <p className="text-xs text-gray-500 mt-1">Buah berondolan lepas</p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Kualitas (1-5)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="5"
                    value={data.quality || ''}
                    onChange={(e) => updateField('quality', parseInt(e.target.value) || 5)}
                    disabled={disabled}
                    className="text-sm mt-1"
                    placeholder="5"
                  />
                  <p className="text-xs text-gray-500 mt-1">1=Sangat Buruk, 5=Sangat Baik</p>
                </div>

                <div>
                  <Label className="text-sm font-medium">Catatan</Label>
                  <Input
                    type="text"
                    value={data.notes || ''}
                    onChange={(e) => updateField('notes', e.target.value)}
                    disabled={disabled}
                    className="text-sm mt-1"
                    placeholder="Catatan tambahan..."
                  />
                  <p className="text-xs text-gray-500 mt-1">Info tambahan tentang panen</p>
                </div>
              </div>

              {/* Summary for this employee */}
              {hasData && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center text-sm">
                    <div>
                      <div className="font-bold text-blue-900">{totalTbs}</div>
                      <div className="text-blue-700 text-xs">Total TBS</div>
                    </div>
                    <div>
                      <div className="font-bold text-blue-900">{totalWeight.toFixed(1)} kg</div>
                      <div className="text-blue-700 text-xs">Total Berat</div>
                    </div>
                    <div>
                      <div className="font-bold text-blue-900">{maturityRatio.toFixed(1)}%</div>
                      <div className="text-blue-700 text-xs">Rasio Matang</div>
                    </div>
                    <div>
                      <div className="font-bold text-blue-900">
                        {totalTbs > 0 ? (totalWeight / totalTbs).toFixed(2) : '0.00'}
                      </div>
                      <div className="text-blue-700 text-xs">BJR Aktual</div>
                    </div>
                    <div>
                      <div className="font-bold text-blue-900">{data.brondolan.toFixed(1)} kg</div>
                      <div className="text-blue-700 text-xs">Brondolan</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-between pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetData}
                  disabled={disabled || !hasData}
                  className="text-gray-600"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset Data
                </Button>
              </div>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}