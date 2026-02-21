'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Package2, 
  ArrowLeft,
  Calculator,
  Info,
  TrendingUp,
  CheckCircle2,
  CircleAlert,
  Scale
} from 'lucide-react';
import type { 
  WorkerHarvestInput, 
  HarvestWizardFormData, 
  BunchCategory, 
  BUNCH_CATEGORY_LABELS,
  BUNCH_CATEGORY_COLORS,
  calculateEstimatedWeight,
  calculateTotalWeight
} from '../../types/wizard';

interface CategoryInputStepProps {
  formData: HarvestWizardFormData;
  onUpdateFormData: (data: Partial<HarvestWizardFormData>) => void;
  onNext: () => void;
  onPrevious: () => void;
  onValidationChange: (isValid: boolean) => void;
}

const bunchCategoryLabels: Record<BunchCategory, string> = {
  TANDAN_MENTAH: 'Tandan Mentah',
  TANDAN_MASAK: 'Tandan Masak',
  TANDAN_LEWAT_MASAK: 'Tandan Lewat Masak',
  TANDAN_BUSUK: 'Tandan Busuk',
  TANDAN_TANGKAI_PANJANG: 'Tandan Tangkai Panjang',
  JANJANG_KOSONG: 'Janjang Kosong',
  BERONDOLAN: 'Berondolan (Karung)'
};

const bunchCategoryColors: Record<BunchCategory, string> = {
  TANDAN_MENTAH: 'text-red-700 bg-red-50 border-red-200',
  TANDAN_MASAK: 'text-green-700 bg-green-50 border-green-200',
  TANDAN_LEWAT_MASAK: 'text-orange-700 bg-orange-50 border-orange-200',
  TANDAN_BUSUK: 'text-gray-700 bg-gray-50 border-gray-200',
  TANDAN_TANGKAI_PANJANG: 'text-yellow-700 bg-yellow-50 border-yellow-200',
  JANJANG_KOSONG: 'text-blue-700 bg-blue-50 border-blue-200',
  BERONDOLAN: 'text-purple-700 bg-purple-50 border-purple-200'
};

const bunchWeightFactors: Record<BunchCategory, { avgWeight: number; usesBJR: boolean }> = {
  TANDAN_MENTAH: { avgWeight: 12, usesBJR: true },
  TANDAN_MASAK: { avgWeight: 15, usesBJR: true },
  TANDAN_LEWAT_MASAK: { avgWeight: 18, usesBJR: true },
  TANDAN_BUSUK: { avgWeight: 8, usesBJR: true },
  TANDAN_TANGKAI_PANJANG: { avgWeight: 10, usesBJR: true },
  JANJANG_KOSONG: { avgWeight: 3, usesBJR: true },
  BERONDOLAN: { avgWeight: 25, usesBJR: false }
};

const calculateEstimatedWeightLocal = (
  category: BunchCategory, 
  quantity: number, 
  bjrValue?: number
): number => {
  const factor = bunchWeightFactors[category];
  
  if (factor.usesBJR && bjrValue) {
    return quantity * factor.avgWeight * bjrValue;
  }
  
  return quantity * factor.avgWeight;
};

export function CategoryInputStep({ 
  formData, 
  onUpdateFormData, 
  onNext, 
  onPrevious,
  onValidationChange 
}: CategoryInputStepProps) {
  const [workerInputs, setWorkerInputs] = useState<WorkerHarvestInput[]>([]);
  const [totalsByCategory, setTotalsByCategory] = useState<Record<BunchCategory, number>>({
    TANDAN_MENTAH: 0,
    TANDAN_MASAK: 0,
    TANDAN_LEWAT_MASAK: 0,
    TANDAN_BUSUK: 0,
    TANDAN_TANGKAI_PANJANG: 0,
    JANJANG_KOSONG: 0,
    BERONDOLAN: 0
  });
  const [totalEstimatedWeight, setTotalEstimatedWeight] = useState(0);

  const bjrValue = formData.selectedBlock?.bjrValue || 0.85;

  // Initialize worker inputs when workers change
  useEffect(() => {
    if (formData.selectedWorkers.length > 0) {
      const initialInputs: WorkerHarvestInput[] = formData.selectedWorkers.map(worker => ({
        workerId: worker.id,
        workerName: worker.name,
        categories: {
          TANDAN_MENTAH: { quantity: 0, estimatedWeight: 0 },
          TANDAN_MASAK: { quantity: 0, estimatedWeight: 0 },
          TANDAN_LEWAT_MASAK: { quantity: 0, estimatedWeight: 0 },
          TANDAN_BUSUK: { quantity: 0, estimatedWeight: 0 },
          TANDAN_TANGKAI_PANJANG: { quantity: 0, estimatedWeight: 0 },
          JANJANG_KOSONG: { quantity: 0, estimatedWeight: 0 },
          BERONDOLAN: { quantity: 0, estimatedWeight: 0 }
        },
        totalEstimatedWeight: 0
      }));
      
      setWorkerInputs(initialInputs);
    }
  }, [formData.selectedWorkers]);

  // Calculate totals when worker inputs change
  useEffect(() => {
    const newTotalsByCategory: Record<BunchCategory, number> = {
      TANDAN_MENTAH: 0,
      TANDAN_MASAK: 0,
      TANDAN_LEWAT_MASAK: 0,
      TANDAN_BUSUK: 0,
      TANDAN_TANGKAI_PANJANG: 0,
      JANJANG_KOSONG: 0,
      BERONDOLAN: 0
    };

    let newTotalWeight = 0;

    workerInputs.forEach(workerInput => {
      Object.entries(workerInput.categories).forEach(([category, data]) => {
        newTotalsByCategory[category as BunchCategory] += data.quantity;
        newTotalWeight += data.estimatedWeight || 0;
      });
    });

    setTotalsByCategory(newTotalsByCategory);
    setTotalEstimatedWeight(newTotalWeight);

    // Update form data
    onUpdateFormData({
      workerInputs,
      totalQuantity: newTotalsByCategory,
      totalEstimatedWeight: newTotalWeight
    });
  }, [workerInputs, onUpdateFormData]);

  // Validation effect
  useEffect(() => {
    const hasAnyInput = workerInputs.some(workerInput =>
      Object.values(workerInput.categories).some(cat => cat.quantity > 0)
    );
    onValidationChange(hasAnyInput);
  }, [workerInputs, onValidationChange]);

  // Handle quantity change for a worker and category
  const handleQuantityChange = (workerIndex: number, category: BunchCategory, quantity: number) => {
    const updatedInputs = [...workerInputs];
    const estimatedWeight = calculateEstimatedWeightLocal(category, quantity, bjrValue);
    
    updatedInputs[workerIndex].categories[category] = {
      quantity,
      estimatedWeight
    };

    // Recalculate total for this worker
    updatedInputs[workerIndex].totalEstimatedWeight = Object.values(updatedInputs[workerIndex].categories)
      .reduce((total, cat) => total + (cat.estimatedWeight || 0), 0);

    setWorkerInputs(updatedInputs);
  };

  const categories: BunchCategory[] = [
    'TANDAN_MENTAH',
    'TANDAN_MASAK', 
    'TANDAN_LEWAT_MASAK',
    'TANDAN_BUSUK',
    'TANDAN_TANGKAI_PANJANG',
    'JANJANG_KOSONG',
    'BERONDOLAN'
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package2 className="h-5 w-5 text-green-600" />
            Input Kategori TBS per Karyawan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <p className="font-medium">Blok: {formData.selectedBlock?.blockCode} | BJR: {bjrValue.toFixed(3)}</p>
                <p className="text-sm">Estimasi berat akan dihitung otomatis untuk semua kategori TBS (kecuali Berondolan) menggunakan nilai BJR.</p>
              </div>
            </AlertDescription>
          </Alert>

          {/* Quick Input Table */}
          <div className="space-y-4">
            <h4 className="font-semibold flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Quick Input Table
            </h4>
            
            <div className="overflow-x-auto">
              <table className="w-full border border-gray-200 rounded-lg">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left p-3 border-r border-gray-200 min-w-[120px]">Karyawan</th>
                    {categories.map((category) => (
                      <th key={category} className="text-center p-2 border-r border-gray-200 min-w-[80px]">
                        <div className="space-y-1">
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${bunchCategoryColors[category]}`}
                          >
                            {bunchCategoryLabels[category]}
                          </Badge>
                        </div>
                      </th>
                    ))}
                    <th className="text-center p-3 min-w-[100px]">
                      <div className="flex items-center justify-center gap-1">
                        <Scale className="h-3 w-3" />
                        <span className="text-xs">Est. Berat</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {workerInputs.map((workerInput, workerIndex) => (
                    <tr key={workerInput.workerId} className="border-t border-gray-200">
                      <td className="p-3 border-r border-gray-200 font-medium">
                        <div>
                          <p className="text-sm">{workerInput.workerName}</p>
                          <p className="text-xs text-muted-foreground">
                            {formData.selectedWorkers.find(w => w.id === workerInput.workerId)?.code}
                          </p>
                        </div>
                      </td>
                      {categories.map((category) => (
                        <td key={category} className="p-2 border-r border-gray-200">
                          <Input
                            type="number"
                            min="0"
                            max="999"
                            value={workerInput.categories[category].quantity || ''}
                            onChange={(e) => handleQuantityChange(
                              workerIndex, 
                              category, 
                              parseInt(e.target.value) || 0
                            )}
                            className="w-full text-center text-sm"
                            placeholder="0"
                          />
                          {(workerInput.categories[category]?.estimatedWeight ?? 0) > 0 && (
                            <p className="text-xs text-muted-foreground text-center mt-1">
                              {workerInput.categories[category]?.estimatedWeight?.toFixed(1)} kg
                            </p>
                          )}
                        </td>
                      ))}
                      <td className="p-3 text-center">
                        <div className="space-y-1">
                          <Badge variant="outline" className="text-green-700 bg-green-50">
                            {workerInput.totalEstimatedWeight.toFixed(1)} kg
                          </Badge>
                          {workerInput.totalEstimatedWeight > 0 && (
                            <div className="flex items-center justify-center gap-1">
                              <TrendingUp className="h-3 w-3 text-green-600" />
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <Separator />

          {/* Summary Section */}
          <div className="space-y-4">
            <h4 className="font-semibold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Ringkasan per Kategori
            </h4>
            
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {categories.map((category) => (
                <Card key={category} className="p-3">
                  <div className="space-y-2 text-center">
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${bunchCategoryColors[category]}`}
                    >
                      {bunchCategoryLabels[category]}
                    </Badge>
                    <div>
                      <p className="font-semibold text-lg">{totalsByCategory[category]}</p>
                      <p className="text-xs text-muted-foreground">
                        {category === 'BERONDOLAN' ? 'Karung' : 'Janjang'}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Total Weight Summary */}
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Scale className="h-5 w-5 text-green-700" />
                  <span className="font-semibold text-green-700">Total Estimasi Berat</span>
                </div>
                <Badge className="bg-green-700 text-white text-lg px-3 py-1">
                  {totalEstimatedWeight.toFixed(1)} kg
                </Badge>
              </div>
              
              {totalEstimatedWeight > 0 && (
                <div className="mt-3 text-sm text-green-700">
                  <p>Estimasi berdasarkan:</p>
                  <ul className="text-xs mt-1 space-y-1">
                    <li>• Semua kategori TBS: menggunakan BJR {bjrValue.toFixed(3)}</li>
                    <li>• Berondolan: menggunakan rata-rata berat standar per karung/sak</li>
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Validation Messages */}
          {workerInputs.length > 0 && totalEstimatedWeight === 0 && (
            <Alert variant="destructive">
              <CircleAlert className="h-4 w-4" />
              <AlertDescription>
                Minimal harus ada input untuk satu kategori TBS. Silakan isi jumlah TBS yang dipanen.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={onPrevious}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </Button>
        
        <Button 
          onClick={onNext}
          disabled={totalEstimatedWeight === 0}
          className="bg-green-600 hover:bg-green-700"
        >
          Lanjut ke Ringkasan
        </Button>
      </div>
    </motion.div>
  );
}