'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle2,
  ArrowLeft,
  Save,
  FileText,
  Calendar,
  MapPin,
  Users,
  Scale,
  TrendingUp,
  CircleAlert,
  Info,
  Package2
} from 'lucide-react';
import { useMutation } from '@apollo/client/react';
import { CreateHarvestRecordDocument } from '@/gql/graphql';
import { useAuth } from '@/hooks/use-auth';
import type {
  HarvestWizardFormData,
  BunchCategory
} from '../../types/wizard';

interface SummaryConfirmationStepProps {
  formData: HarvestWizardFormData;
  onUpdateFormData: (data: Partial<HarvestWizardFormData>) => void;
  onPrevious: () => void;
  onValidationChange: (isValid: boolean) => void;
  onComplete: () => void;
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

export function SummaryConfirmationStep({
  formData,
  onUpdateFormData,
  onPrevious,
  onValidationChange,
  onComplete
}: SummaryConfirmationStepProps) {
  const { user } = useAuth();
  const [notes, setNotes] = useState(formData.notes || '');
  const [isConfirmed, setIsConfirmed] = useState(formData.isConfirmed || false);

  // Create harvest record mutation
  const [createHarvestRecord, { loading: isLoading, error: createError }] = useMutation(CreateHarvestRecordDocument, {
    onCompleted: () => {
      onComplete();
    },
    onError: (error) => {
      console.error('❌ [SummaryConfirmationStep] Error creating harvest record:', error);
    }
  });

  // Validation effect
  useEffect(() => {
    onValidationChange(isConfirmed);
  }, [isConfirmed, onValidationChange]);

  // Update form data when notes or confirmation change
  useEffect(() => {
    onUpdateFormData({ notes, isConfirmed });
  }, [notes, isConfirmed, onUpdateFormData]);

  // Handle notes change
  const handleNotesChange = (value: string) => {
    setNotes(value);
  };

  // Handle confirmation toggle
  const handleConfirmationToggle = (checked: boolean) => {
    setIsConfirmed(checked);
  };

  // Handle form submission
  const handleSubmit = async () => {
    console.log('🚀 [SummaryConfirmationStep] Starting form submission...', {
      hasUser: !!user,
      userId: user?.id,
      userRole: user?.role,
      hasSelectedBlock: !!formData.selectedBlock,
      blockId: formData.selectedBlock?.id,
      isConfirmed,
      totalWeight: formData.totalEstimatedWeight,
      selectedWorkersCount: formData.selectedWorkers.length
    });

    if (!user?.id) {
      console.error('❌ [SummaryConfirmationStep] No user ID available:', user);
      return;
    }

    if (!formData.selectedBlock) {
      console.error('❌ [SummaryConfirmationStep] No selected block:', formData.selectedBlock);
      return;
    }

    if (!isConfirmed) {
      console.error('❌ [SummaryConfirmationStep] Not confirmed:', isConfirmed);
      return;
    }

    const workerIdentifiers = formData.selectedWorkers
      .map(w => (w.employeeId || w.code || w.name).trim())
      .filter(Boolean)
      .join(', ');
    const totalWeight = formData.totalEstimatedWeight;
    const totalBunches = Object.values(formData.totalQuantity).reduce((sum, qty) => sum + qty, 0);

    const input = {
      tanggal: new Date(formData.harvestDate), // Pass Date object as expected by GraphQL
      mandorId: user.id,
      blockId: formData.selectedBlock.id,
      karyawan: workerIdentifiers,
      beratTbs: totalWeight,
      jumlahJanjang: totalBunches,
    };

    console.log('📤 [SummaryConfirmationStep] Submitting harvest record:', input);

    try {
      await createHarvestRecord({ variables: { input } });
      console.log('✅ [SummaryConfirmationStep] Harvest record created successfully');
    } catch (error) {
      // Error is handled in onError callback
    }
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
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Ringkasan & Konfirmasi Data Panen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Information Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-sm">Tanggal Panen</span>
              </div>
              <p className="font-semibold">
                {new Date(formData.harvestDate).toLocaleDateString('id-ID', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="h-4 w-4 text-green-600" />
                <span className="font-medium text-sm">Blok</span>
              </div>
              <p className="font-semibold">{formData.selectedBlock?.blockCode}</p>
              <p className="text-sm text-muted-foreground">{formData.selectedBlock?.name}</p>
              <p className="text-xs text-muted-foreground">
                BJR: {(formData.selectedBlock?.bjrValue || 0.85).toFixed(3)}
              </p>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-purple-600" />
                <span className="font-medium text-sm">Karyawan</span>
              </div>
              <p className="font-semibold">{formData.selectedWorkers.length} orang</p>
              <p className="text-sm text-muted-foreground">
                {formData.selectedWorkers.slice(0, 2).map(w => w.name).join(', ')}
                {formData.selectedWorkers.length > 2 && ` +${formData.selectedWorkers.length - 2} lainnya`}
              </p>
            </Card>
          </div>

          <Separator />

          {/* Category Summary */}
          <div className="space-y-4">
            <h4 className="font-semibold flex items-center gap-2">
              <Package2 className="h-4 w-4 text-green-600" />
              Ringkasan per Kategori TBS
            </h4>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {categories.map((category) => (
                <Card key={category} className="p-3 text-center">
                  <Badge
                    variant="outline"
                    className={`text-xs mb-2 ${bunchCategoryColors[category]}`}
                  >
                    {bunchCategoryLabels[category]}
                  </Badge>
                  <p className="font-semibold text-lg">{formData.totalQuantity[category]}</p>
                  <p className="text-xs text-muted-foreground">
                    {category === 'BERONDOLAN' ? 'Karung' : 'Janjang'}
                  </p>
                </Card>
              ))}
            </div>
          </div>

          <Separator />

          {/* Worker Details */}
          <div className="space-y-4">
            <h4 className="font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              Detail per Karyawan
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {formData.workerInputs.map((workerInput) => (
                <Card key={workerInput.workerId} className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h5 className="font-medium">{workerInput.workerName}</h5>
                      <Badge variant="outline" className="text-green-700 bg-green-50">
                        {workerInput.totalEstimatedWeight.toFixed(1)} kg
                      </Badge>
                    </div>

                    <div className="text-sm space-y-1">
                      {categories.map((category) => {
                        const qty = workerInput.categories[category].quantity;
                        if (qty === 0) return null;

                        return (
                          <div key={category} className="flex justify-between">
                            <span className="text-muted-foreground">
                              {bunchCategoryLabels[category]}:
                            </span>
                            <span>{qty} {category === 'BERONDOLAN' ? 'karung' : 'janjang'}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <Separator />

          {/* Total Summary */}
          <Card className="bg-green-50 border-green-200 p-6">
            <div className="text-center space-y-4">
              <h4 className="font-semibold text-green-800 text-lg">Total Hasil Panen</h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Scale className="h-5 w-5 text-green-700" />
                    <span className="font-medium">Total Berat</span>
                  </div>
                  <p className="text-2xl font-bold text-green-800">
                    {formData.totalEstimatedWeight.toFixed(1)} kg
                  </p>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Package2 className="h-5 w-5 text-green-700" />
                    <span className="font-medium">Total Janjang</span>
                  </div>
                  <p className="text-2xl font-bold text-green-800">
                    {Object.values(formData.totalQuantity).reduce((sum, qty) => sum + qty, 0)}
                  </p>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <TrendingUp className="h-5 w-5 text-green-700" />
                    <span className="font-medium">Efisiensi</span>
                  </div>
                  <p className="text-2xl font-bold text-green-800">
                    {(formData.totalEstimatedWeight / formData.selectedWorkers.length).toFixed(1)} kg/orang
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Notes Section */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Catatan Tambahan (Opsional)
            </Label>
            <Textarea
              id="notes"
              placeholder="Tambahkan catatan khusus mengenai panen ini (kondisi cuaca, kualitas buah, kendala, dll.)..."
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              rows={3}
            />
          </div>

          {/* Important Information */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">Informasi Penting:</p>
                <ul className="text-sm space-y-1">
                  <li>• Data akan disimpan dengan status PENDING dan menunggu approval dari Asisten</li>
                  <li>• Estimasi berat menggunakan BJR {(formData.selectedBlock?.bjrValue || 0.85).toFixed(3)} untuk kategori TBS utama</li>
                  <li>• Anda akan menerima notifikasi ketika data disetujui atau ditolak</li>
                  <li>• Data yang sudah disimpan masih dapat diedit selama masih berstatus PENDING</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>

          {/* Confirmation Checkbox */}
          <div className="flex items-start space-x-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <Checkbox
              id="confirmation"
              checked={isConfirmed}
              onCheckedChange={handleConfirmationToggle}
              className="mt-1"
            />
            <div>
              <Label
                htmlFor="confirmation"
                className="text-sm font-medium leading-5 cursor-pointer"
              >
                Konfirmasi Data Panen
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Saya konfirmasi bahwa semua data yang dimasukkan sudah benar dan sesuai dengan hasil panen aktual.
                Data ini akan dikirim untuk persetujuan Asisten.
              </p>
            </div>
          </div>

          {/* Error Display */}
          {createError && (
            <Alert variant="destructive">
              <CircleAlert className="h-4 w-4" />
              <AlertDescription>{createError.message}</AlertDescription>
            </Alert>
          )}

          {!isConfirmed && (
            <Alert variant="destructive">
              <CircleAlert className="h-4 w-4" />
              <AlertDescription>
                Anda harus mengkonfirmasi kebenaran data sebelum menyimpan.
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
          disabled={isLoading}
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </Button>

        <Button
          onClick={handleSubmit}
          disabled={!isConfirmed || isLoading}
          className="bg-green-600 hover:bg-green-700 flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              Menyimpan...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Simpan Data Panen
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}
