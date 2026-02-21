'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Plus,
  Minus,
  Save,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Calculator,
  Eye,
  EyeOff,
  Copy,
  Trash2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { MaturityInput } from './maturity-input';
import { pksBJRService } from '@/lib/services/pks-bjr-data';
import { 
  Employee, 
  HarvestEmployee,
  TBS_CATEGORIES,
  calculateMaturityRatio,
  calculateWeightedQuality,
  calculateAdjustedBJR,
  getQualityRecommendation
} from '@/types/harvest';

interface EmployeeHarvestEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  entryNumber: number; // 1, 2, 3, etc. untuk multiple entries
  
  // TBS data by maturity
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

interface EmployeeHarvestInputProps {
  employee: Employee;
  entries: EmployeeHarvestEntry[];
  onUpdate: (entries: EmployeeHarvestEntry[]) => void;
  blockId: string;
  harvestDate: string; // YYYY-MM-DD format
  onRemove?: () => void;
  disabled?: boolean;
  showAdvanced?: boolean;
}

export function EmployeeHarvestInput({
  employee,
  entries,
  onUpdate,
  blockId,
  harvestDate,
  onRemove,
  disabled = false,
  showAdvanced = true
}: EmployeeHarvestInputProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showCalculations, setShowCalculations] = useState(false);

  // Calculate totals across all entries
  const totals = entries.reduce((acc, entry) => {
    return {
      tbsMatang: acc.tbsMatang + entry.tbsMatang,
      beratMatang: acc.beratMatang + entry.beratMatang,
      tbsMentah: acc.tbsMentah + entry.tbsMentah,
      beratMentah: acc.beratMentah + entry.beratMentah,
      tbsLewatMatang: acc.tbsLewatMatang + entry.tbsLewatMatang,
      beratLewatMatang: acc.beratLewatMatang + entry.beratLewatMatang,
      tbsKosong: acc.tbsKosong + entry.tbsKosong,
      beratKosong: acc.beratKosong + entry.beratKosong,
      brondolan: acc.brondolan + entry.brondolan,
      totalTbs: acc.totalTbs + (entry.tbsMatang + entry.tbsMentah + entry.tbsLewatMatang + entry.tbsKosong),
      totalWeight: acc.totalWeight + (entry.beratMatang + entry.beratMentah + entry.beratLewatMatang + entry.beratKosong)
    };
  }, {
    tbsMatang: 0, beratMatang: 0, tbsMentah: 0, beratMentah: 0,
    tbsLewatMatang: 0, beratLewatMatang: 0, tbsKosong: 0, beratKosong: 0,
    brondolan: 0, totalTbs: 0, totalWeight: 0
  });

  // Calculate summary metrics for employee
  const employeeSummary: HarvestEmployee = {
    id: employee.id,
    employeeId: employee.id,
    employeeName: employee.name,
    employeeCode: employee.code,
    tbsMatang: totals.tbsMatang,
    beratMatang: totals.beratMatang,
    tbsMentah: totals.tbsMentah,
    beratMentah: totals.beratMentah,
    tbsLewatMatang: totals.tbsLewatMatang,
    beratLewatMatang: totals.beratLewatMatang,
    tbsKosong: totals.tbsKosong,
    beratKosong: totals.beratKosong,
    brondolan: totals.brondolan,
    quality: entries.length > 0 ? entries.reduce((sum, e) => sum + e.quality, 0) / entries.length : 5,
    totalTbs: totals.totalTbs,
    totalWeight: totals.totalWeight,
    maturityRatio: calculateMaturityRatio({
      tbsMatang: totals.tbsMatang,
      tbsMentah: totals.tbsMentah,
      tbsLewatMatang: totals.tbsLewatMatang,
      tbsKosong: totals.tbsKosong
    } as HarvestEmployee)
  };

  const maturityRatio = calculateMaturityRatio(employeeSummary);
  const weightedQuality = calculateWeightedQuality(employeeSummary);
  const adjustedBJR = calculateAdjustedBJR(employeeSummary);
  const qualityRec = getQualityRecommendation(employeeSummary);

  const addNewEntry = () => {
    const newEntry: EmployeeHarvestEntry = {
      id: `${employee.id}-${Date.now()}`,
      employeeId: employee.id,
      employeeName: employee.name,
      employeeCode: employee.code,
      entryNumber: entries.length + 1,
      tbsMatang: 0,
      beratMatang: 0,
      tbsMentah: 0,
      beratMentah: 0,
      tbsLewatMatang: 0,
      beratLewatMatang: 0,
      tbsKosong: 0,
      beratKosong: 0,
      brondolan: 0,
      quality: 5,
      notes: ''
    };
    
    onUpdate([...entries, newEntry]);
  };

  const removeEntry = (entryId: string) => {
    if (entries.length <= 1) return; // Keep at least one entry
    
    const updatedEntries = entries
      .filter(e => e.id !== entryId)
      .map((entry, index) => ({ ...entry, entryNumber: index + 1 }));
    
    onUpdate(updatedEntries);
  };

  const duplicateEntry = (sourceEntry: EmployeeHarvestEntry) => {
    const newEntry: EmployeeHarvestEntry = {
      ...sourceEntry,
      id: `${employee.id}-${Date.now()}`,
      entryNumber: entries.length + 1,
      notes: `Copy of Entry ${sourceEntry.entryNumber}`
    };
    
    onUpdate([...entries, newEntry]);
  };

  const updateEntry = (entryId: string, updates: Partial<EmployeeHarvestEntry>) => {
    const updatedEntries = entries.map(entry => {
      if (entry.id === entryId) {
        const updatedEntry = { ...entry, ...updates };
        
        // Auto-calculate weights using BJR when TBS counts change
        if ('tbsMatang' in updates || 'tbsMentah' in updates || 
            'tbsLewatMatang' in updates || 'tbsKosong' in updates) {
          const weights = pksBJRService.calculateTotalWeight({
            tbsMatang: updatedEntry.tbsMatang,
            tbsMentah: updatedEntry.tbsMentah,
            tbsLewatMatang: updatedEntry.tbsLewatMatang,
            tbsKosong: updatedEntry.tbsKosong
          }, blockId, harvestDate);
          
          updatedEntry.beratMatang = weights.beratMatang;
          updatedEntry.beratMentah = weights.beratMentah;
          updatedEntry.beratLewatMatang = weights.beratLewatMatang;
          updatedEntry.beratKosong = weights.beratKosong;
        }
        
        return updatedEntry;
      }
      return entry;
    });
    onUpdate(updatedEntries);
  };

  const resetAllEntries = () => {
    const resetEntries = entries.map(entry => ({
      ...entry,
      tbsMatang: 0, beratMatang: 0,
      tbsMentah: 0, beratMentah: 0,
      tbsLewatMatang: 0, beratLewatMatang: 0,
      tbsKosong: 0, beratKosong: 0,
      brondolan: 0,
      quality: 5,
      notes: ''
    }));
    onUpdate(resetEntries);
  };

  // Initialize with one entry if none exist
  useEffect(() => {
    if (entries.length === 0) {
      addNewEntry();
    }
  }, [entries.length]);

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
                <Badge variant="outline" className="text-xs">
                  {entries.length} {entries.length === 1 ? 'Entry' : 'Entries'}
                </Badge>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCalculations(!showCalculations)}
              disabled={disabled}
            >
              <Calculator className="h-4 w-4" />
            </Button>
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
        {(showCalculations || !isExpanded) && totals.totalTbs > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-3 p-3 bg-gray-50 rounded-lg border">
            <div className="text-center">
              <div className="text-xl font-bold text-gray-900">{totals.totalTbs}</div>
              <div className="text-xs text-gray-600">Total TBS</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-gray-900">{totals.totalWeight.toFixed(1)}</div>
              <div className="text-xs text-gray-600">Total Berat (kg)</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-gray-900">{maturityRatio.toFixed(1)}%</div>
              <div className="text-xs text-gray-600">Rasio Matang</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-gray-900">{adjustedBJR.toFixed(2)}</div>
              <div className="text-xs text-gray-600">BJR Adjusted</div>
            </div>
          </div>
        )}

        {/* Quality Indicator */}
        {showCalculations && totals.totalTbs > 0 && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Kualitas Keseluruhan</span>
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
              {/* Action Buttons */}
              <div className="flex items-center justify-between">
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addNewEntry}
                    disabled={disabled || entries.length >= 10} // Max 10 entries
                    className="text-blue-600"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Tambah Entry
                  </Button>
                </div>
                
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetAllEntries}
                    disabled={disabled}
                    className="text-gray-600"
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Reset All
                  </Button>
                </div>
              </div>

              {/* Entries */}
              <div className="space-y-4">
                {entries.map((entry, index) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="border border-gray-200 rounded-lg"
                  >
                    <div className="p-4 border-b border-gray-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Badge variant="outline" className="text-xs">
                            Entry #{entry.entryNumber}
                          </Badge>
                          {entry.notes && (
                            <span className="text-xs text-gray-500 italic">
                              {entry.notes}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => duplicateEntry(entry)}
                            disabled={disabled || entries.length >= 10}
                            className="text-blue-600"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          {entries.length > 1 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeEntry(entry.id)}
                              disabled={disabled}
                              className="text-red-600"
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="p-4">
                      {/* BJR Information */}
                      <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-blue-800">BJR {pksBJRService.getBJR(blockId, harvestDate)} kg/tandan</span>
                          <span className="text-blue-600">Auto-calculated from PKS data</span>
                        </div>
                      </div>

                      {/* TBS Input Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                        {/* TBS Matang */}
                        <div className="space-y-2 p-3 border border-green-200 rounded bg-green-50/50">
                          <Label className="text-sm font-medium text-green-800 flex items-center">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            TBS Matang
                          </Label>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs text-gray-600">Tandan</Label>
                              <Input
                                type="number"
                                min="0"
                                value={entry.tbsMatang || ''}
                                onChange={(e) => updateEntry(entry.id, { tbsMatang: parseInt(e.target.value) || 0 })}
                                disabled={disabled}
                                className="text-sm h-8"
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-gray-600">Berat (kg)</Label>
                              <div className="text-sm h-8 flex items-center px-3 bg-gray-50 border rounded font-medium text-gray-700">
                                {entry.beratMatang.toFixed(1)}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* TBS Mentah */}
                        <div className="space-y-2 p-3 border border-red-200 rounded bg-red-50/50">
                          <Label className="text-sm font-medium text-red-800 flex items-center">
                            <AlertTriangle className="h-4 w-4 mr-1" />
                            TBS Mentah
                          </Label>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs text-gray-600">Tandan</Label>
                              <Input
                                type="number"
                                min="0"
                                value={entry.tbsMentah || ''}
                                onChange={(e) => updateEntry(entry.id, { tbsMentah: parseInt(e.target.value) || 0 })}
                                disabled={disabled}
                                className="text-sm h-8"
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-gray-600">Berat (kg)</Label>
                              <div className="text-sm h-8 flex items-center px-3 bg-gray-50 border rounded font-medium text-gray-700">
                                {entry.beratMentah.toFixed(1)}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* TBS Lewat Matang */}
                        <div className="space-y-2 p-3 border border-orange-200 rounded bg-orange-50/50">
                          <Label className="text-sm font-medium text-orange-800 flex items-center">
                            <TrendingUp className="h-4 w-4 mr-1" />
                            Lewat Matang
                          </Label>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs text-gray-600">Tandan</Label>
                              <Input
                                type="number"
                                min="0"
                                value={entry.tbsLewatMatang || ''}
                                onChange={(e) => updateEntry(entry.id, { tbsLewatMatang: parseInt(e.target.value) || 0 })}
                                disabled={disabled}
                                className="text-sm h-8"
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-gray-600">Berat (kg)</Label>
                              <div className="text-sm h-8 flex items-center px-3 bg-gray-50 border rounded font-medium text-gray-700">
                                {entry.beratLewatMatang.toFixed(1)}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* TBS Kosong */}
                        <div className="space-y-2 p-3 border border-gray-200 rounded bg-gray-50/50">
                          <Label className="text-sm font-medium text-gray-800 flex items-center">
                            <User className="h-4 w-4 mr-1" />
                            TBS Kosong
                          </Label>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs text-gray-600">Tandan</Label>
                              <Input
                                type="number"
                                min="0"
                                value={entry.tbsKosong || ''}
                                onChange={(e) => updateEntry(entry.id, { tbsKosong: parseInt(e.target.value) || 0 })}
                                disabled={disabled}
                                className="text-sm h-8"
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-gray-600">Berat (kg)</Label>
                              <div className="text-sm h-8 flex items-center px-3 bg-gray-50 border rounded font-medium text-gray-700">
                                {entry.beratKosong.toFixed(1)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Additional Fields */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                        <div>
                          <Label className="text-sm">Brondolan (kg)</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.1"
                            value={entry.brondolan || ''}
                            onChange={(e) => updateEntry(entry.id, { brondolan: parseFloat(e.target.value) || 0 })}
                            disabled={disabled}
                            className="text-sm"
                          />
                        </div>
                        
                        <div>
                          <Label className="text-sm">Kualitas (1-5)</Label>
                          <Input
                            type="number"
                            min="1"
                            max="5"
                            value={entry.quality || ''}
                            onChange={(e) => updateEntry(entry.id, { quality: parseInt(e.target.value) || 5 })}
                            disabled={disabled}
                            className="text-sm"
                          />
                        </div>

                        <div>
                          <Label className="text-sm">Catatan</Label>
                          <Input
                            type="text"
                            value={entry.notes || ''}
                            onChange={(e) => updateEntry(entry.id, { notes: e.target.value })}
                            disabled={disabled}
                            className="text-sm"
                            placeholder="Catatan entry ini..."
                          />
                        </div>
                      </div>

                      {/* Entry Summary */}
                      {(entry.tbsMatang + entry.tbsMentah + entry.tbsLewatMatang + entry.tbsKosong) > 0 && (
                        <div className="mt-3 p-2 bg-blue-50 rounded border border-blue-200">
                          <div className="grid grid-cols-4 gap-2 text-center text-xs">
                            <div>
                              <div className="font-semibold text-blue-900">
                                {entry.tbsMatang + entry.tbsMentah + entry.tbsLewatMatang + entry.tbsKosong}
                              </div>
                              <div className="text-blue-700">TBS</div>
                            </div>
                            <div>
                              <div className="font-semibold text-blue-900">
                                {(entry.beratMatang + entry.beratMentah + entry.beratLewatMatang + entry.beratKosong).toFixed(1)}
                              </div>
                              <div className="text-blue-700">Berat</div>
                            </div>
                            <div>
                              <div className="font-semibold text-blue-900">
                                {entry.tbsMatang + entry.tbsMentah + entry.tbsLewatMatang + entry.tbsKosong > 0 
                                  ? ((entry.tbsMatang / (entry.tbsMatang + entry.tbsMentah + entry.tbsLewatMatang + entry.tbsKosong)) * 100).toFixed(1)
                                  : 0}%
                              </div>
                              <div className="text-blue-700">Matang</div>
                            </div>
                            <div>
                              <div className="font-semibold text-blue-900">
                                {entry.tbsMatang + entry.tbsMentah + entry.tbsLewatMatang + entry.tbsKosong > 0 
                                  ? ((entry.beratMatang + entry.beratMentah + entry.beratLewatMatang + entry.beratKosong) / (entry.tbsMatang + entry.tbsMentah + entry.tbsLewatMatang + entry.tbsKosong)).toFixed(2)
                                  : 0}
                              </div>
                              <div className="text-blue-700">BJR</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>

              {entries.length >= 10 && (
                <div className="text-center p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-sm text-yellow-800">
                    Maksimal 10 entries per karyawan. Untuk input lebih banyak, gunakan karyawan terpisah.
                  </p>
                </div>
              )}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}