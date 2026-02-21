'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Scale,
  Truck,
  User,
  Save,
  Printer,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  Calculator
} from 'lucide-react';
import { useWeighingOperations, generateTicketNumber } from '@/hooks/use-weighing';
import { WeighingRecord, CreateWeighingRecordInput } from '@/hooks/use-weighing';
import { toast } from 'sonner';

interface WeighingData {
  ticketNumber: string;
  vehicleNumber: string;
  driverName: string;
  vendorName: string;
  cargoType: string;
  grossWeight: number;
  tareWeight: number;
  netWeight: number;
  weighingTime: Date;
  notes: string;
}

interface WeighingFormProps {
  currentWeighing: WeighingRecord | null;
  setCurrentWeighing: (data: WeighingRecord | null) => void;
}

export function WeighingForm({ currentWeighing, setCurrentWeighing }: WeighingFormProps) {
  const {
    createWeighingRecord,
    updateWeighingRecord,
    loading,
    errors,
    updatedRecord
  } = useWeighingOperations();

  // Real-time subscription for weighing updates
  useEffect(() => {
    if (updatedRecord) {
      toast.success(`Data timbangan ${updatedRecord.vehicleNumber} berhasil diperbarui!`);
    }
  }, [updatedRecord]);

  const [formData, setFormData] = useState<WeighingData>({
    ticketNumber: '',
    vehicleNumber: '',
    driverName: '',
    vendorName: '',
    cargoType: '',
    grossWeight: 0,
    tareWeight: 0,
    netWeight: 0,
    weighingTime: new Date(),
    notes: ''
  });

  const [weighingStep, setWeighingStep] = useState<'gross' | 'tare' | 'complete'>('gross');
  const [isReading, setIsReading] = useState(false);
  const [lastReading, setLastReading] = useState<number | null>(null);

  // Mock scale reading function
  const simulateScaleReading = () => {
    setIsReading(true);
    setTimeout(() => {
      const reading = Math.floor(Math.random() * 10000) + 5000;
      setLastReading(reading);

      if (weighingStep === 'gross') {
        setFormData(prev => ({ ...prev, grossWeight: reading }));
      } else if (weighingStep === 'tare') {
        setFormData(prev => ({ ...prev, tareWeight: reading }));
        // Calculate net weight when tare is measured
        setFormData(prev => ({
          ...prev,
          netWeight: prev.grossWeight - reading
        }));
      }

      setIsReading(false);
    }, 3000);
  };

  const handleInputChange = (field: keyof WeighingData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNextStep = () => {
    if (weighingStep === 'gross') {
      setWeighingStep('tare');
    } else if (weighingStep === 'tare') {
      setWeighingStep('complete');
    }
  };

  const handlePreviousStep = () => {
    if (weighingStep === 'tare') {
      setWeighingStep('gross');
    } else if (weighingStep === 'complete') {
      setWeighingStep('tare');
    }
  };

  const handleSave = async () => {
    try {
      // Validate required fields
      if (!formData.vehicleNumber.trim()) {
        toast.error('Nomor kendaraan harus diisi!');
        return;
      }

      if (formData.grossWeight <= 0) {
        toast.error('Berat bruto harus lebih dari 0!');
        return;
      }

      if (formData.tareWeight < 0) {
        toast.error('Berat tara tidak boleh negatif!');
        return;
      }

      if (formData.tareWeight > formData.grossWeight) {
        toast.error('Berat tara tidak boleh lebih besar dari berat bruto!');
        return;
      }

      const createInput: CreateWeighingRecordInput = {
        ticketNumber: formData.ticketNumber || generateTicketNumber(),
        vehicleNumber: formData.vehicleNumber,
        driverName: formData.driverName,
        vendorName: formData.vendorName,
        grossWeight: formData.grossWeight,
        tareWeight: formData.tareWeight,
        netWeight: formData.netWeight,
        weighingTime: formData.weighingTime.toISOString(),
        cargoType: formData.cargoType,
        companyID: 'company-id' // TODO: Get from context
      };

      const result = await createWeighingRecord(createInput);

      if (result) {
        toast.success(`Data timbangan kendaraan ${formData.vehicleNumber} berhasil disimpan!`);
        console.log('Created weighing record:', result);
        handleReset();
      }
    } catch (error: any) {
      console.error('Error saving weighing data:', error);

      // Handle different error types
      if (error.message?.includes('network')) {
        toast.error('Koneksi error. Silakan periksa koneksi internet Anda.');
      } else if (error.message?.includes('unauthorized')) {
        toast.error('Sesi Anda telah berakhir. Silakan login kembali.');
      } else if (error.message?.includes('validation')) {
        toast.error('Data tidak valid. Silakan periksa kembali input Anda.');
      } else {
        toast.error('Gagal menyimpan data timbangan. Silakan coba lagi.');
      }
    }
  };

  const handleReset = () => {
    setFormData({
      ticketNumber: '',
      vehicleNumber: '',
      driverName: '',
      vendorName: '',
      cargoType: '',
      grossWeight: 0,
      tareWeight: 0,
      netWeight: 0,
      weighingTime: new Date(),
      notes: ''
    });
    setWeighingStep('gross');
    setLastReading(null);
  };

  const handlePrintTicket = () => {
    // TODO: Print weighing ticket
    alert('Mencetak tiket timbangan...');
  };

  const getStepStatus = (step: 'gross' | 'tare' | 'complete') => {
    if (step === weighingStep) return 'current';
    if (step === 'gross' && formData.grossWeight > 0) return 'completed';
    if (step === 'tare' && formData.tareWeight > 0) return 'completed';
    if (step === 'complete' && formData.netWeight > 0) return 'completed';
    return 'pending';
  };

  return (
    <div className="space-y-6">
      {/* Step Indicator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Proses Timbangan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className={`flex items-center gap-3 p-3 rounded-lg border ${
              getStepStatus('gross') === 'current' ? 'border-blue-500 bg-blue-50' :
              getStepStatus('gross') === 'completed' ? 'border-green-500 bg-green-50' :
              'border-gray-200'
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                getStepStatus('gross') === 'current' ? 'bg-blue-500 text-white' :
                getStepStatus('gross') === 'completed' ? 'bg-green-500 text-white' :
                'bg-gray-200'
              }`}>
                {getStepStatus('gross') === 'completed' ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  '1'
                )}
              </div>
              <div>
                <p className="font-medium">Timbangan Bruto</p>
                <p className="text-sm text-muted-foreground">
                  {formData.grossWeight > 0 ? `${formData.grossWeight} kg` : 'Belum diukur'}
                </p>
              </div>
            </div>

            <div className={`flex items-center gap-3 p-3 rounded-lg border ${
              getStepStatus('tare') === 'current' ? 'border-blue-500 bg-blue-50' :
              getStepStatus('tare') === 'completed' ? 'border-green-500 bg-green-50' :
              'border-gray-200'
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                getStepStatus('tare') === 'current' ? 'bg-blue-500 text-white' :
                getStepStatus('tare') === 'completed' ? 'bg-green-500 text-white' :
                'bg-gray-200'
              }`}>
                {getStepStatus('tare') === 'completed' ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  '2'
                )}
              </div>
              <div>
                <p className="font-medium">Timbangan Tara</p>
                <p className="text-sm text-muted-foreground">
                  {formData.tareWeight > 0 ? `${formData.tareWeight} kg` : 'Belum diukur'}
                </p>
              </div>
            </div>

            <div className={`flex items-center gap-3 p-3 rounded-lg border ${
              getStepStatus('complete') === 'current' ? 'border-blue-500 bg-blue-50' :
              getStepStatus('complete') === 'completed' ? 'border-green-500 bg-green-50' :
              'border-gray-200'
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                getStepStatus('complete') === 'current' ? 'bg-blue-500 text-white' :
                getStepStatus('complete') === 'completed' ? 'bg-green-500 text-white' :
                'bg-gray-200'
              }`}>
                {getStepStatus('complete') === 'completed' ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  '3'
                )}
              </div>
              <div>
                <p className="font-medium">Selesai</p>
                <p className="text-sm text-muted-foreground">
                  {formData.netWeight > 0 ? `${formData.netWeight} kg` : 'Menunggu'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Vehicle Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Informasi Kendaraan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ticketNumber">No. Tiket</Label>
                <Input
                  id="ticketNumber"
                  value={formData.ticketNumber}
                  onChange={(e) => handleInputChange('ticketNumber', e.target.value)}
                  placeholder="Auto-generated"
                  disabled
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vehicleNumber">No. Kendaraan</Label>
                <Input
                  id="vehicleNumber"
                  value={formData.vehicleNumber}
                  onChange={(e) => handleInputChange('vehicleNumber', e.target.value)}
                  placeholder="BK 1234 CD"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="driverName">Nama Supir</Label>
                <Input
                  id="driverName"
                  value={formData.driverName}
                  onChange={(e) => handleInputChange('driverName', e.target.value)}
                  placeholder="Ahmad Yani"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vendorName">Vendor</Label>
                <Input
                  id="vendorName"
                  value={formData.vendorName}
                  onChange={(e) => handleInputChange('vendorName', e.target.value)}
                  placeholder="PT. Sawit Jaya"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cargoType">Jenis Muatan</Label>
              <Select value={formData.cargoType} onValueChange={(value) => handleInputChange('cargoType', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih jenis muatan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tbs">Tandan Buah Segar (TBS)</SelectItem>
                  <SelectItem value="cpo">Crude Palm Oil (CPO)</SelectItem>
                  <SelectItem value="palmKernel">Palm Kernel</SelectItem>
                  <SelectItem value="other">Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Catatan</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Catatan tambahan..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Scale Interface */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              Interface Timbangan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Scale Display */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-700 rounded-lg p-6 text-white">
              <div className="text-center space-y-2">
                <p className="text-sm text-slate-300">
                  {weighingStep === 'gross' ? 'Berat Bruto' :
                   weighingStep === 'tare' ? 'Berat Tara' : 'Berat Bersih'}
                </p>
                <div className="text-4xl font-bold font-mono">
                  {isReading ? (
                    <span className="animate-pulse">Membaca...</span>
                  ) : (
                    <span>
                      {weighingStep === 'gross' && formData.grossWeight}
                      {weighingStep === 'tare' && formData.tareWeight}
                      {weighingStep === 'complete' && formData.netWeight}
                      {weighingStep !== 'complete' && ' kg'}
                    </span>
                  )}
                </div>
                {lastReading && (
                  <p className="text-xs text-slate-400">
                    Pembacaan terakhir: {lastReading} kg
                  </p>
                )}
              </div>
            </div>

            {/* Scale Controls */}
            <div className="grid grid-cols-2 gap-4">
              <Button
                onClick={simulateScaleReading}
                disabled={isReading || weighingStep === 'complete'}
                className="w-full gap-2"
              >
                {isReading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Membaca...
                  </>
                ) : (
                  <>
                    <Scale className="h-4 w-4" />
                    Baca Timbangan
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setLastReading(null)}
                disabled={isReading}
                className="w-full gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handlePreviousStep}
                disabled={weighingStep === 'gross'}
                className="flex-1"
              >
                Kembali
              </Button>
              {weighingStep === 'complete' ? (
                <>
                  <Button
                    onClick={handlePrintTicket}
                    variant="outline"
                    className="flex-1 gap-2"
                  >
                    <Printer className="h-4 w-4" />
                    Print
                  </Button>
                  <Button
                    onClick={handleSave}
                    className="flex-1 gap-2"
                  >
                    <Save className="h-4 w-4" />
                    Simpan
                  </Button>
                </>
              ) : (
                <Button
                  onClick={handleNextStep}
                  disabled={
                    (weighingStep === 'gross' && formData.grossWeight === 0) ||
                    (weighingStep === 'tare' && formData.tareWeight === 0)
                  }
                  className="flex-1"
                >
                  Lanjut
                </Button>
              )}
            </div>

            {/* Quick Actions */}
            <div className="space-y-2">
              <Button
                variant="outline"
                onClick={handleReset}
                className="w-full gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Reset Semua
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {isReading && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Sedang membaca timbangan... Pastikan kendaraan dalam posisi yang tepat.
          </AlertDescription>
        </Alert>
      )}

      {weighingStep === 'complete' && (
        <Alert className="border-green-500 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <AlertDescription className="text-green-700">
            Proses timbangan selesai! Berat bersih: {formData.netWeight} kg
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}