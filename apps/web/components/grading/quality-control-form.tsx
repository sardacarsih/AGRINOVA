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
  Star,
  CheckCircle2,
  AlertTriangle,
  Save,
  Calculator,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Target
} from 'lucide-react';
import { useGradingOperations } from '@/hooks/use-grading';
import { CreateGradingRecordInput, calculateQualityCategory, calculateOverallGrade, validateGradingData } from '@/hooks/use-grading';
import { toast } from 'sonner';

interface QualityControlData {
  harvestRecordId: string;
  blockName: string;
  qualityScore: number;
  maturityLevel: string;
  brondolanPercentage: number;
  looseFruitPercentage: number;
  dirtPercentage: number;
  gradingNotes: string;
  gradingDate: Date;
}

interface QualityControlFormProps {
  currentGrading: QualityControlData | null;
  setCurrentGrading: (data: QualityControlData | null) => void;
}

export function QualityControlForm({ currentGrading, setCurrentGrading }: QualityControlFormProps) {
  const {
    createGradingRecord,
    updateGradingRecord,
    loading,
    errors,
    updatedRecord,
    approvedRecord,
    rejectedRecord
  } = useGradingOperations();

  // Real-time subscriptions for grading updates
  useEffect(() => {
    if (updatedRecord) {
      toast.success(`Data grading untuk panen ${updatedRecord.harvestRecordId} telah diperbarui!`);
    }
    if (approvedRecord) {
      toast.success(`Grading untuk panen ${approvedRecord.harvestRecordId} telah disetujui!`);
    }
    if (rejectedRecord) {
      toast.error(`Grading untuk panen ${rejectedRecord.harvestRecordId} telah ditolak!`);
    }
  }, [updatedRecord, approvedRecord, rejectedRecord]);

  const [formData, setFormData] = useState<QualityControlData>({
    harvestRecordId: '',
    blockName: '',
    qualityScore: 0,
    maturityLevel: '',
    brondolanPercentage: 0,
    looseFruitPercentage: 0,
    dirtPercentage: 0,
    gradingNotes: '',
    gradingDate: new Date()
  });

  const [calculatedGrades, setCalculatedGrades] = useState({
    qualityCategory: 'FAIR',
    overallGrade: 'C'
  });

  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Calculate quality category and overall grade
  useEffect(() => {
    const qualityCategory = calculateQualityCategory(formData.qualityScore);
    const overallGrade = calculateOverallGrade(
      formData.qualityScore,
      formData.brondolanPercentage,
      formData.looseFruitPercentage
    );

    setCalculatedGrades({
      qualityCategory,
      overallGrade
    });
  }, [formData]);

  const handleInputChange = (field: keyof QualityControlData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setValidationErrors([]);
  };

  const handleReset = () => {
    setFormData({
      harvestRecordId: '',
      blockName: '',
      qualityScore: 0,
      maturityLevel: '',
      brondolanPercentage: 0,
      looseFruitPercentage: 0,
      dirtPercentage: 0,
      gradingNotes: '',
      gradingDate: new Date()
    });
    setValidationErrors([]);
    setCurrentGrading(null);
  };

  const handleSave = async () => {
    // Validate required fields first
    if (!formData.harvestRecordId.trim()) {
      toast.error('ID panen harus diisi!');
      return;
    }

    if (!formData.maturityLevel) {
      toast.error('Tingkat kematangan harus dipilih!');
      return;
    }

    const validationErrors = validateGradingData({
      harvestRecordId: formData.harvestRecordId,
      qualityScore: formData.qualityScore,
      maturityLevel: formData.maturityLevel,
      brondolanPercentage: formData.brondolanPercentage,
      looseFruitPercentage: formData.looseFruitPercentage,
      dirtPercentage: formData.dirtPercentage,
      gradingNotes: formData.gradingNotes,
      gradingDate: formData.gradingDate.toISOString()
    });

    if (validationErrors.length > 0) {
      setValidationErrors(validationErrors);
      toast.error('Validasi gagal. Silakan periksa kembali input Anda.');
      return;
    }

    try {
      const createInput: CreateGradingRecordInput = {
        harvestRecordId: formData.harvestRecordId,
        qualityScore: formData.qualityScore,
        maturityLevel: formData.maturityLevel,
        brondolanPercentage: formData.brondolanPercentage,
        looseFruitPercentage: formData.looseFruitPercentage,
        dirtPercentage: formData.dirtPercentage,
        gradingNotes: formData.gradingNotes,
        gradingDate: formData.gradingDate.toISOString()
      };

      const result = await createGradingRecord(createInput);

      if (result) {
        toast.success(`Data grading berhasil disimpan! Kategori: ${calculatedGrades.qualityCategory}, Grade: ${calculatedGrades.overallGrade}`);
        console.log('Created grading record:', result);
        handleReset();
      }
    } catch (error: any) {
      console.error('Error saving grading data:', error);

      // Handle different error types
      if (error.message?.includes('network')) {
        toast.error('Koneksi error. Silakan periksa koneksi internet Anda.');
      } else if (error.message?.includes('unauthorized')) {
        toast.error('Sesi Anda telah berakhir. Silakan login kembali.');
      } else if (error.message?.includes('validation')) {
        toast.error('Data tidak valid. Silakan periksa kembali input Anda.');
      } else if (error.message?.includes('duplicate')) {
        toast.error('Data grading untuk panen ini sudah ada.');
      } else {
        toast.error('Gagal menyimpan data grading. Silakan coba lagi.');
      }
    }
  };

  const handleQuickScore = (preset: number) => {
    setFormData(prev => ({ ...prev, qualityScore: preset }));
  };

  const getQualityScoreBadge = (score: number) => {
    if (score >= 90) return <Badge className="bg-green-500">Excellent</Badge>;
    if (score >= 80) return <Badge className="bg-blue-500">Good</Badge>;
    if (score >= 70) return <Badge className="bg-yellow-500">Fair</Badge>;
    if (score >= 60) return <Badge className="bg-orange-500">Poor</Badge>;
    return <Badge variant="destructive">Very Poor</Badge>;
  };

  const getGradeBadge = (grade: string) => {
    const colors = {
      'A': 'bg-green-500',
      'B': 'bg-blue-500',
      'C': 'bg-yellow-500',
      'D': 'bg-orange-500',
      'E': 'bg-red-500'
    };
    return <Badge className={colors[grade as keyof typeof colors] || 'bg-gray-500'}>Grade {grade}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Form Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Form Quality Control TBS
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="harvestRecordId">ID Panen</Label>
              <Input
                id="harvestRecordId"
                value={formData.harvestRecordId}
                onChange={(e) => handleInputChange('harvestRecordId', e.target.value)}
                placeholder="HRV-2024-001"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="blockName">Nama Blok</Label>
              <Input
                id="blockName"
                value={formData.blockName}
                onChange={(e) => handleInputChange('blockName', e.target.value)}
                placeholder="A-12"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quality Assessment */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Asesmen Kualitas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Quality Score */}
            <div className="space-y-2">
              <Label htmlFor="qualityScore">Skor Kualitas (0-100)</Label>
              <Input
                id="qualityScore"
                type="number"
                min="0"
                max="100"
                value={formData.qualityScore}
                onChange={(e) => handleInputChange('qualityScore', parseInt(e.target.value) || 0)}
                placeholder="85"
              />
              <div className="flex gap-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickScore(95)}
                >
                  Excellent (95)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickScore(85)}
                >
                  Good (85)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickScore(75)}
                >
                  Fair (75)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickScore(65)}
                >
                  Poor (65)
                </Button>
              </div>
              {formData.qualityScore > 0 && (
                <div className="mt-2">
                  {getQualityScoreBadge(formData.qualityScore)}
                  <p className="text-sm text-muted-foreground mt-1">
                    Kategori: {calculatedGrades.qualityCategory}
                  </p>
                </div>
              )}
            </div>

            {/* Maturity Level */}
            <div className="space-y-2">
              <Label htmlFor="maturityLevel">Tingkat Kematangan</Label>
              <Select value={formData.maturityLevel} onValueChange={(value) => handleInputChange('maturityLevel', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih tingkat kematangan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MENTAH">Mentah</SelectItem>
                  <SelectItem value="MASAK">Masak</SelectItem>
                  <SelectItem value="TERLALU_MASAK">Terlalu Masak</SelectItem>
                  <SelectItem value="BUSUK">Busuk</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Quick Analysis */}
            {formData.qualityScore > 0 && (
              <div className="space-y-3 pt-4 border-t">
                <h4 className="font-medium flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  Analisis Otomatis
                </h4>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <span className="text-sm">Kategori Kualitas</span>
                    {getQualityScoreBadge(formData.qualityScore)}
                  </div>

                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <span className="text-sm">Grade Keseluruhan</span>
                    {getGradeBadge(calculatedGrades.overallGrade)}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Penalti Kotoran</span>
                    <span className="text-sm font-medium">-{(formData.dirtPercentage * 0.5).toFixed(1)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Penalti Brondolan</span>
                    <span className="text-sm font-medium">-{(formData.looseFruitPercentage * 0.3).toFixed(1)}</span>
                  </div>
                  <div className="flex items-center justify-between font-medium">
                    <span>Skor Akhir</span>
                    <span>{Math.max(0, formData.qualityScore - (formData.dirtPercentage * 0.5) - (formData.looseFruitPercentage * 0.3)).toFixed(1)}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Defect Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Analisis Defect
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Brondolan Percentage */}
            <div className="space-y-2">
              <Label htmlFor="brondolanPercentage">% Brondolan</Label>
              <Input
                id="brondolanPercentage"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formData.brondolanPercentage}
                onChange={(e) => handleInputChange('brondolanPercentage', parseFloat(e.target.value) || 0)}
                placeholder="5.0"
              />
            </div>

            {/* Loose Fruit Percentage */}
            <div className="space-y-2">
              <Label htmlFor="looseFruitPercentage">% Buah Lepas</Label>
              <Input
                id="looseFruitPercentage"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formData.looseFruitPercentage}
                onChange={(e) => handleInputChange('looseFruitPercentage', parseFloat(e.target.value) || 0)}
                placeholder="3.0"
              />
            </div>

            {/* Dirt Percentage */}
            <div className="space-y-2">
              <Label htmlFor="dirtPercentage">% Kotoran</Label>
              <Input
                id="dirtPercentage"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formData.dirtPercentage}
                onChange={(e) => handleInputChange('dirtPercentage', parseFloat(e.target.value) || 0)}
                placeholder="1.5"
              />
            </div>

            {/* Total Summary */}
            <div className="space-y-2 pt-4 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total Persentase</span>
                <span className={`text-sm font-bold ${
                  (formData.brondolanPercentage + formData.looseFruitPercentage + formData.dirtPercentage) > 100
                    ? 'text-red-600'
                    : 'text-green-600'
                }`}>
                  {(formData.brondolanPercentage + formData.looseFruitPercentage + formData.dirtPercentage).toFixed(1)}%
                </span>
              </div>
              {(formData.brondolanPercentage + formData.looseFruitPercentage + formData.dirtPercentage) > 100 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Total persentase melebihi 100%. Mohon periksa kembali input Anda.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Grading Notes */}
            <div className="space-y-2 pt-4 border-t">
              <Label htmlFor="gradingNotes">Catatan Grading</Label>
              <Textarea
                id="gradingNotes"
                value={formData.gradingNotes}
                onChange={(e) => handleInputChange('gradingNotes', e.target.value)}
                placeholder="Catatan tambahan tentang kualitas TBS..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1">
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Success Alert */}
      {formData.qualityScore > 0 && validationErrors.length === 0 && (
        <Alert className="border-green-500 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <AlertDescription className="text-green-700">
            Form grading lengkap! Kategori: {calculatedGrades.qualityCategory}, Grade: {calculatedGrades.overallGrade}
          </AlertDescription>
        </Alert>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={loading} className="gap-2">
          {loading ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
              Menyimpan...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Simpan Grading
            </>
          )}
        </Button>
        <Button variant="outline" className="gap-2">
          <BarChart3 className="h-4 w-4" />
          Lihat Analytics
        </Button>
      </div>
    </div>
  );
}