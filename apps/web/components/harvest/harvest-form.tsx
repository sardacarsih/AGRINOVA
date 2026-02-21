'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarDays,
  MapPin,
  Users,
  Leaf,
  Scale,
  Star,
  AlertTriangle,
  Save,
  Send,
  Plus,
  Minus,
  Calculator,
  Eye,
  EyeOff
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

import { WorkerManagement } from './worker-management';
import { SyncStatusIndicator } from './sync-status-indicator';
import { pksBJRService } from '@/lib/services/pks-bjr-data';
import { 
  HarvestFormData, 
  Block, 
  Employee, 
  HARVEST_VALIDATION,
  TBS_QUALITY_LABELS,
  QUALITY_LABELS
} from '@/types/harvest';

// Form validation schema
const employeeEntrySchema = z.object({
  employeeId: z.string().min(1, 'Karyawan harus dipilih'),
  jenisTbs: z.enum(['MENTAH', 'MATANG', 'LEWAT_MATANG', 'KOSONG']),
  jumlahTbs: z.number()
    .min(HARVEST_VALIDATION.MIN_TBS, `Minimal ${HARVEST_VALIDATION.MIN_TBS} TBS`)
    .max(HARVEST_VALIDATION.MAX_TBS_PER_EMPLOYEE, `Maksimal ${HARVEST_VALIDATION.MAX_TBS_PER_EMPLOYEE} TBS`),
  weight: z.number().optional(), // Auto-calculated, no validation needed
  brondolan: z.number()
    .min(0, 'Brondolan tidak boleh negatif')
    .max(HARVEST_VALIDATION.MAX_BRONDOLAN_PER_EMPLOYEE, `Maksimal ${HARVEST_VALIDATION.MAX_BRONDOLAN_PER_EMPLOYEE} kg`),
  quality: z.number()
    .min(HARVEST_VALIDATION.MIN_QUALITY, `Minimal ${HARVEST_VALIDATION.MIN_QUALITY}`)
    .max(HARVEST_VALIDATION.MAX_QUALITY, `Maksimal ${HARVEST_VALIDATION.MAX_QUALITY}`)
});

const harvestFormSchema = z.object({
  blockId: z.string().min(1, 'Blok harus dipilih'),
  harvestDate: z.date(),
  shift: z.enum(['PAGI', 'SIANG', 'MALAM']),
  notes: z.string().optional(),
  employees: z.array(employeeEntrySchema).min(1, 'Minimal 1 karyawan harus diisi')
});

type HarvestFormValues = z.infer<typeof harvestFormSchema>;

interface HarvestFormProps {
  blocks: Block[];
  employees: Employee[];
  onSubmit: (data: HarvestFormData, isDraft: boolean) => Promise<void>;
  onCancel?: () => void;
  initialData?: Partial<HarvestFormData>;
  isLoading?: boolean;
  className?: string;
}

export function HarvestForm({
  blocks,
  employees,
  onSubmit,
  onCancel,
  initialData,
  isLoading = false,
  className
}: HarvestFormProps) {
  const { toast } = useToast();
  
  // Form state
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [showWorkerManagement, setShowWorkerManagement] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCalculations, setShowCalculations] = useState(true);

  // Form setup
  const form = useForm<HarvestFormValues>({
    resolver: zodResolver(harvestFormSchema),
    defaultValues: {
      blockId: initialData?.blockId || '',
      harvestDate: initialData?.harvestDate || new Date(),
      shift: initialData?.shift || 'PAGI',
      notes: initialData?.notes || '',
      employees: initialData?.employees || []
    }
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: 'employees'
  });

  // Watch form values for calculations
  const watchedEmployees = form.watch('employees');
  const selectedBlockId = form.watch('blockId');
  const harvestDate = form.watch('harvestDate');

  // Get selected block info
  const selectedBlock = useMemo(() => {
    return blocks.find(block => block.id === selectedBlockId);
  }, [blocks, selectedBlockId]);

  // Calculate totals and statistics
  const calculations = useMemo(() => {
    if (!watchedEmployees || watchedEmployees.length === 0 || !selectedBlockId || !harvestDate) {
      return {
        totalTBS: 0,
        totalWeight: 0,
        totalBrondolan: 0,
        avgQuality: 0,
        bjrRatio: 0,
        estimatedLoad: 0,
        qualityDistribution: {},
        tbsTypeDistribution: {}
      };
    }

    // Get BJR for the selected block and date
    const dateString = harvestDate instanceof Date ? harvestDate.toISOString().split('T')[0] : harvestDate;
    const bjrValue = pksBJRService.getBJR(selectedBlockId, dateString);

    const totalTBS = watchedEmployees.reduce((sum, emp) => sum + (emp.jumlahTbs || 0), 0);
    // Auto-calculate total weight using BJR instead of manual input
    const totalWeight = totalTBS * bjrValue;
    const totalBrondolan = watchedEmployees.reduce((sum, emp) => sum + (emp.brondolan || 0), 0);
    const avgQuality = totalTBS > 0 
      ? watchedEmployees.reduce((sum, emp) => sum + ((emp.quality || 0) * (emp.jumlahTbs || 0)), 0) / totalTBS
      : 0;
    const bjrRatio = bjrValue; // Use actual BJR from PKS data
    const estimatedLoad = totalWeight * 1.1; // Add container weight

    // Quality distribution
    const qualityDistribution: Record<number, number> = {};
    watchedEmployees.forEach(emp => {
      const quality = emp.quality || 0;
      const tbs = emp.jumlahTbs || 0;
      qualityDistribution[quality] = (qualityDistribution[quality] || 0) + tbs;
    });

    // TBS type distribution
    const tbsTypeDistribution: Record<string, number> = {};
    watchedEmployees.forEach(emp => {
      const type = emp.jenisTbs || 'MATANG';
      const tbs = emp.jumlahTbs || 0;
      tbsTypeDistribution[type] = (tbsTypeDistribution[type] || 0) + tbs;
    });

    return {
      totalTBS: Math.round(totalTBS),
      totalWeight: Math.round(totalWeight * 100) / 100,
      totalBrondolan: Math.round(totalBrondolan * 100) / 100,
      avgQuality: Math.round(avgQuality * 10) / 10,
      bjrRatio: Math.round(bjrRatio * 1000) / 1000,
      estimatedLoad: Math.round(estimatedLoad * 100) / 100,
      qualityDistribution,
      tbsTypeDistribution
    };
  }, [watchedEmployees, selectedBlockId, harvestDate]);

  // Auto-update individual employee weights when TBS count changes
  useEffect(() => {
    if (selectedBlockId && harvestDate && watchedEmployees) {
      const dateString = harvestDate instanceof Date ? harvestDate.toISOString().split('T')[0] : harvestDate;
      const bjrValue = pksBJRService.getBJR(selectedBlockId, dateString);
      
      watchedEmployees.forEach((employee, index) => {
        if (employee.jumlahTbs && employee.jumlahTbs > 0) {
          const calculatedWeight = pksBJRService.calculateWeight(employee.jumlahTbs, selectedBlockId, dateString);
          
          // Update weight if it's different from calculated value
          if (Math.abs((employee.weight || 0) - calculatedWeight) > 0.1) {
            form.setValue(`employees.${index}.weight`, calculatedWeight);
          }
        }
      });
    }
  }, [selectedBlockId, harvestDate, watchedEmployees, form]);

  // Update employee entries when workers are selected/deselected
  const handleEmployeeToggle = (employeeId: string) => {
    const isSelected = selectedEmployees.includes(employeeId);
    
    if (isSelected) {
      // Remove employee
      setSelectedEmployees(prev => prev.filter(id => id !== employeeId));
      const fieldIndex = fields.findIndex(field => field.employeeId === employeeId);
      if (fieldIndex >= 0) {
        remove(fieldIndex);
      }
    } else {
      // Add employee
      setSelectedEmployees(prev => [...prev, employeeId]);
      append({
        employeeId,
        jenisTbs: 'MATANG',
        jumlahTbs: 0,
        weight: 0,
        brondolan: 0,
        quality: 4
      });
    }
  };

  // Handle form submission
  const handleSubmit = async (values: HarvestFormValues, isDraft: boolean = false) => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);

      // Validate business rules
      if (!isDraft) {
        if (calculations.totalTBS === 0) {
          toast({
            title: 'Validasi Error',
            description: 'Total TBS tidak boleh 0',
            variant: 'destructive'
          });
          return;
        }

        if (calculations.bjrRatio > HARVEST_VALIDATION.MAX_BJR_RATIO) {
          toast({
            title: 'Peringatan BJR',
            description: `BJR (${calculations.bjrRatio.toFixed(3)}) terlalu tinggi. Periksa kembali data.`,
            variant: 'destructive'
          });
          return;
        }
      }

      const formData: HarvestFormData = {
        ...values,
        notes: values.notes || '',
        employees: values.employees.map(emp => ({
          employeeId: emp.employeeId,
          tbsMatang: emp.jenisTbs === 'MATANG' ? emp.jumlahTbs : 0,
          beratMatang: emp.jenisTbs === 'MATANG' ? (emp.weight || 0) : 0,
          tbsMentah: emp.jenisTbs === 'MENTAH' ? emp.jumlahTbs : 0,
          beratMentah: emp.jenisTbs === 'MENTAH' ? (emp.weight || 0) : 0,
          tbsLewatMatang: emp.jenisTbs === 'LEWAT_MATANG' ? emp.jumlahTbs : 0,
          beratLewatMatang: emp.jenisTbs === 'LEWAT_MATANG' ? (emp.weight || 0) : 0,
          tbsKosong: emp.jenisTbs === 'KOSONG' ? emp.jumlahTbs : 0,
          beratKosong: emp.jenisTbs === 'KOSONG' ? (emp.weight || 0) : 0,
          brondolan: emp.brondolan,
          quality: emp.quality
        }))
      };

      await onSubmit(formData, isDraft);

      if (!isDraft) {
        toast({
          title: 'Sukses',
          description: 'Data panen berhasil disimpan',
        });
      } else {
        toast({
          title: 'Draft Disimpan',
          description: 'Data panen disimpan sebagai draft',
        });
      }

    } catch (error) {
      console.error('Form submission error:', error);
      toast({
        title: 'Error',
        description: 'Gagal menyimpan data panen',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get employee by ID
  const getEmployeeById = (id: string) => {
    return employees.find(emp => emp.id === id);
  };

  return (
    <div className={cn('space-y-6', className)}>
      <form onSubmit={form.handleSubmit((data) => handleSubmit(data, false))}>
        {/* Header info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Leaf className="h-5 w-5 text-green-600" />
              <span>Input Data Panen</span>
              {selectedBlock && (
                <Badge variant="outline" className="ml-2">
                  {selectedBlock.code}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Date and Block */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="harvestDate">Tanggal Panen</Label>
                <div className="relative">
                  <CalendarDays className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="harvestDate"
                    type="date"
                    {...form.register('harvestDate', {
                      valueAsDate: true
                    })}
                    className="pl-10"
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>
                {form.formState.errors.harvestDate && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.harvestDate.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="blockId">Blok</Label>
                <Select value={form.watch('blockId')} onValueChange={(value) => form.setValue('blockId', value)}>
                  <SelectTrigger>
                    <MapPin className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Pilih blok" />
                  </SelectTrigger>
                  <SelectContent>
                    {blocks.map((block) => (
                      <SelectItem key={block.id} value={block.id}>
                        <div>
                          <div className="font-medium">{block.code} - {block.name}</div>
                          <div className="text-sm text-muted-foreground">{block.divisiName}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.blockId && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.blockId.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="shift">Shift</Label>
                <Select value={form.watch('shift')} onValueChange={(value: 'PAGI' | 'SIANG' | 'MALAM') => form.setValue('shift', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PAGI">Pagi (06:00-14:00)</SelectItem>
                    <SelectItem value="SIANG">Siang (14:00-22:00)</SelectItem>
                    <SelectItem value="MALAM">Malam (22:00-06:00)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Block info */}
            {selectedBlock && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-muted/50 rounded-lg"
              >
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Area:</span>
                    <span className="ml-2 font-medium">{selectedBlock.area} ha</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Pohon:</span>
                    <span className="ml-2 font-medium">{selectedBlock.palmCount?.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tahun Tanam:</span>
                    <span className="ml-2 font-medium">{selectedBlock.plantingYear}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Varietas:</span>
                    <span className="ml-2 font-medium">{selectedBlock.varietyType}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">BJR PKS:</span>
                    <span className="ml-2 font-medium text-blue-600">
                      {harvestDate ? pksBJRService.getBJR(selectedBlock.id, 
                        harvestDate instanceof Date ? harvestDate.toISOString().split('T')[0] : harvestDate
                      ) : 12.0} kg/tandan
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>

        {/* Worker Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-blue-600" />
                <span>Pilih Karyawan</span>
                <Badge variant="secondary">
                  {selectedEmployees.length} dipilih
                </Badge>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowWorkerManagement(!showWorkerManagement)}
              >
                {showWorkerManagement ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                {showWorkerManagement ? 'Sembunyikan' : 'Tampilkan'} Pilihan
              </Button>
            </CardTitle>
          </CardHeader>
          {showWorkerManagement && (
            <CardContent>
              <WorkerManagement
                employees={employees}
                selectedEmployees={selectedEmployees}
                onEmployeeToggle={handleEmployeeToggle}
                maxEmployees={HARVEST_VALIDATION.MAX_EMPLOYEES_PER_HARVEST}
                showStats={false}
              />
            </CardContent>
          )}
        </Card>

        {/* Employee Entries */}
        {fields.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Scale className="h-5 w-5 text-green-600" />
                  <span>Data Panen per Karyawan</span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCalculations(!showCalculations)}
                >
                  <Calculator className="h-4 w-4 mr-2" />
                  {showCalculations ? 'Sembunyikan' : 'Tampilkan'} Perhitungan
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {fields.map((field, index) => {
                const employee = getEmployeeById(field.employeeId);
                if (!employee) return null;

                return (
                  <motion.div
                    key={field.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="p-4 border border-border rounded-lg space-y-4"
                  >
                    {/* Employee info */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                          {employee.avatar || employee.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-medium">{employee.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {employee.code} • Efisiensi: {employee.efficiency || 0}%
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleEmployeeToggle(employee.id)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Input fields */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div className="space-y-2">
                        <Label>Jenis TBS</Label>
                        <Select 
                          value={field.jenisTbs} 
                          onValueChange={(value: 'MENTAH' | 'MATANG' | 'LEWAT_MATANG' | 'KOSONG') => 
                            update(index, { ...field, jenisTbs: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(TBS_QUALITY_LABELS).map(([key, label]) => (
                              <SelectItem key={key} value={key}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Jumlah TBS</Label>
                        <Input
                          type="number"
                          min="0"
                          max={HARVEST_VALIDATION.MAX_TBS_PER_EMPLOYEE}
                          {...form.register(`employees.${index}.jumlahTbs`, { valueAsNumber: true })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Berat (kg)</Label>
                        <div className="h-10 flex items-center px-3 bg-gray-50 border rounded font-medium text-gray-700">
                          {field.weight ? field.weight.toFixed(1) : '0.0'}
                        </div>
                        <p className="text-xs text-gray-500">
                          Auto-calculated (BJR: {selectedBlockId && harvestDate ? 
                            pksBJRService.getBJR(selectedBlockId, harvestDate instanceof Date ? harvestDate.toISOString().split('T')[0] : harvestDate) : 
                            12.0} kg/tandan)
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label>Brondolan (kg)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          max={HARVEST_VALIDATION.MAX_BRONDOLAN_PER_EMPLOYEE}
                          {...form.register(`employees.${index}.brondolan`, { valueAsNumber: true })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Kualitas</Label>
                        <Select 
                          value={field.quality?.toString()} 
                          onValueChange={(value) => 
                            update(index, { ...field, quality: parseInt(value) })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(QUALITY_LABELS).map(([key, label]) => (
                              <SelectItem key={key} value={key}>
                                <div className="flex items-center space-x-2">
                                  <div className="flex">
                                    {Array.from({ length: parseInt(key) }, (_, i) => (
                                      <Star key={i} className="h-3 w-3 fill-current text-yellow-400" />
                                    ))}
                                  </div>
                                  <span>{label}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Validation errors */}
                    {form.formState.errors.employees?.[index] && (
                      <div className="text-sm text-red-600 space-y-1">
                        {Object.entries(form.formState.errors.employees[index] || {}).map(([key, error]) => (
                          <p key={key}>{typeof error === 'object' && error && 'message' in error ? error.message : String(error)}</p>
                        ))}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Calculations */}
        {showCalculations && watchedEmployees.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className={calculations.bjrRatio > HARVEST_VALIDATION.MAX_BJR_RATIO ? 'border-orange-200 bg-orange-50' : ''}>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calculator className="h-5 w-5 text-blue-600" />
                  <span>Perhitungan & Statistik</span>
                  {calculations.bjrRatio > HARVEST_VALIDATION.MAX_BJR_RATIO && (
                    <Badge variant="destructive">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      BJR Tinggi
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="text-center p-4 bg-background rounded-lg border">
                    <div className="text-2xl font-bold text-foreground">{calculations.totalTBS}</div>
                    <div className="text-sm text-muted-foreground">Total TBS</div>
                  </div>
                  
                  <div className="text-center p-4 bg-background rounded-lg border">
                    <div className="text-2xl font-bold text-foreground">{calculations.totalWeight} kg</div>
                    <div className="text-sm text-muted-foreground">Total Berat</div>
                  </div>

                  <div className="text-center p-4 bg-background rounded-lg border">
                    <div className={cn(
                      "text-2xl font-bold",
                      calculations.bjrRatio > HARVEST_VALIDATION.MAX_BJR_RATIO ? 'text-red-600' : 'text-foreground'
                    )}>
                      {calculations.bjrRatio.toFixed(3)}
                    </div>
                    <div className="text-sm text-muted-foreground">BJR Ratio</div>
                  </div>

                  <div className="text-center p-4 bg-background rounded-lg border">
                    <div className="flex items-center justify-center">
                      <div className="text-2xl font-bold text-foreground mr-2">{calculations.avgQuality.toFixed(1)}</div>
                      <div className="flex">
                        {Array.from({ length: Math.floor(calculations.avgQuality) }, (_, i) => (
                          <Star key={i} className="h-4 w-4 fill-current text-yellow-400" />
                        ))}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">Kualitas Rata-rata</div>
                  </div>
                </div>

                {calculations.bjrRatio > HARVEST_VALIDATION.MAX_BJR_RATIO && (
                  <div className="mt-4 p-4 bg-orange-100 border border-orange-200 rounded-lg">
                    <div className="flex items-center space-x-2 text-orange-700">
                      <AlertTriangle className="h-5 w-5" />
                      <span className="font-medium">
                        Peringatan: BJR terlalu tinggi ({calculations.bjrRatio.toFixed(3)}). 
                        BJR normal biasanya di bawah {HARVEST_VALIDATION.MAX_BJR_RATIO}. 
                        Periksa kembali data TBS dan berat.
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Catatan Tambahan</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Kondisi cuaca, kualitas buah, kendala, dll..."
              {...form.register('notes')}
              rows={3}
            />
          </CardContent>
        </Card>

        {/* Submit buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            type="submit"
            disabled={isSubmitting || isLoading}
            className="flex-1"
          >
            <Send className="h-4 w-4 mr-2" />
            {isSubmitting ? 'Menyimpan...' : 'Kirim untuk Persetujuan'}
          </Button>
          
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting || isLoading}
            onClick={() => handleSubmit(form.getValues(), true)}
          >
            <Save className="h-4 w-4 mr-2" />
            Simpan Draft
          </Button>

          {onCancel && (
            <Button
              type="button"
              variant="ghost"
              disabled={isSubmitting || isLoading}
              onClick={onCancel}
            >
              Batal
            </Button>
          )}
        </div>
      </form>

      {/* Sync Status */}
      <SyncStatusIndicator />
    </div>
  );
}