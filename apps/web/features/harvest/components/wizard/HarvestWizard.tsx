'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Calendar, 
  Users, 
  Package2, 
  CheckCircle2,
  Circle,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { HarvestWizardFormData, WizardStep, validateStep } from '../../types/wizard';
import { DateBlockSelectionStep } from './DateBlockSelectionStep';
import { WorkerSelectionStep } from './WorkerSelectionStep';
import { CategoryInputStep } from './CategoryInputStep';
import { SummaryConfirmationStep } from './SummaryConfirmationStep';

interface HarvestWizardProps {
  onComplete: () => void;
  onCancel: () => void;
}

const wizardSteps: WizardStep[] = [
  {
    id: 1,
    name: 'date-block',
    title: 'Tanggal & Blok',
    description: 'Pilih tanggal panen dan blok yang akan dipanen',
    isCompleted: false,
    isActive: true
  },
  {
    id: 2,
    name: 'worker-selection',
    title: 'Pilih Karyawan',
    description: 'Pilih karyawan yang akan melakukan panen',
    isCompleted: false,
    isActive: false
  },
  {
    id: 3,
    name: 'category-input',
    title: 'Input Kategori',
    description: 'Input hasil panen per karyawan dan kategori TBS',
    isCompleted: false,
    isActive: false
  },
  {
    id: 4,
    name: 'summary',
    title: 'Ringkasan & Konfirmasi',
    description: 'Review dan konfirmasi data panen',
    isCompleted: false,
    isActive: false
  }
];

const validateStepLocal = (step: number, formData: HarvestWizardFormData) => {
  const errors: string[] = [];
  
  switch (step) {
    case 1:
      if (!formData.harvestDate) errors.push('Tanggal panen harus dipilih');
      if (!formData.selectedBlock) errors.push('Blok harus dipilih');
      break;
      
    case 2:
      if (formData.selectedWorkers.length === 0) errors.push('Minimal satu karyawan harus dipilih');
      break;
      
    case 3:
      if (formData.workerInputs.length === 0) errors.push('Data input karyawan harus diisi');
      const hasAnyInput = formData.workerInputs.some(workerInput =>
        Object.values(workerInput.categories).some(cat => cat.quantity > 0)
      );
      if (!hasAnyInput) errors.push('Minimal harus ada input untuk satu kategori TBS');
      break;
      
    case 4:
      if (formData.totalEstimatedWeight <= 0) errors.push('Total estimasi berat harus lebih dari 0');
      if (!formData.isConfirmed) errors.push('Data harus dikonfirmasi sebelum disimpan');
      break;
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export function HarvestWizard({ onComplete, onCancel }: HarvestWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [steps, setSteps] = useState(wizardSteps);
  const [stepValidations, setStepValidations] = useState<Record<number, boolean>>({});
  
  // Initialize form data
  const [formData, setFormData] = useState<HarvestWizardFormData>({
    harvestDate: new Date().toISOString().split('T')[0],
    selectedBlock: null,
    selectedWorkers: [],
    workerInputs: [],
    notes: '',
    totalQuantity: {
      TANDAN_MENTAH: 0,
      TANDAN_MASAK: 0,
      TANDAN_LEWAT_MASAK: 0,
      TANDAN_BUSUK: 0,
      TANDAN_TANGKAI_PANJANG: 0,
      JANJANG_KOSONG: 0,
      BERONDOLAN: 0
    },
    totalEstimatedWeight: 0,
    isConfirmed: false
  });

  // Update form data
  const updateFormData = useCallback((newData: Partial<HarvestWizardFormData>) => {
    setFormData(prev => ({ ...prev, ...newData }));
  }, []);

  // Handle validation change for current step
  const handleValidationChange = useCallback((isValid: boolean) => {
    setStepValidations(prev => ({ ...prev, [currentStep]: isValid }));
  }, [currentStep]);

  // Move to next step
  const handleNext = useCallback(() => {
    const validation = validateStepLocal(currentStep, formData);
    if (validation.isValid && currentStep < 4) {
      // Mark current step as completed
      setSteps(prev => prev.map(step => 
        step.id === currentStep 
          ? { ...step, isCompleted: true, isActive: false }
          : step.id === currentStep + 1
          ? { ...step, isActive: true }
          : step
      ));
      
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep, formData]);

  // Move to previous step
  const handlePrevious = useCallback(() => {
    if (currentStep > 1) {
      // Mark current step as inactive and previous as active
      setSteps(prev => prev.map(step => 
        step.id === currentStep 
          ? { ...step, isActive: false }
          : step.id === currentStep - 1
          ? { ...step, isActive: true, isCompleted: false }
          : step
      ));
      
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  // Handle wizard completion
  const handleComplete = useCallback(() => {
    onComplete();
  }, [onComplete]);

  // Render step component
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <DateBlockSelectionStep
            formData={formData}
            onUpdateFormData={updateFormData}
            onNext={handleNext}
            onValidationChange={handleValidationChange}
          />
        );
      case 2:
        return (
          <WorkerSelectionStep
            formData={formData}
            onUpdateFormData={updateFormData}
            onNext={handleNext}
            onPrevious={handlePrevious}
            onValidationChange={handleValidationChange}
          />
        );
      case 3:
        return (
          <CategoryInputStep
            formData={formData}
            onUpdateFormData={updateFormData}
            onNext={handleNext}
            onPrevious={handlePrevious}
            onValidationChange={handleValidationChange}
          />
        );
      case 4:
        return (
          <SummaryConfirmationStep
            formData={formData}
            onUpdateFormData={updateFormData}
            onPrevious={handlePrevious}
            onValidationChange={handleValidationChange}
            onComplete={handleComplete}
          />
        );
      default:
        return null;
    }
  };

  const progress = (currentStep / 4) * 100;

  const stepIcons = {
    1: Calendar,
    2: Users,
    3: Package2,
    4: CheckCircle2
  };

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <Card>
        <CardHeader className="pb-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">Wizard Input Data Panen</CardTitle>
              <Badge variant="outline" className="text-sm">
                Langkah {currentStep} dari 4
              </Badge>
            </div>
            
            <div className="space-y-2">
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-muted-foreground">
                {Math.round(progress)}% selesai
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Step Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {steps.map((step) => {
              const Icon = stepIcons[step.id as keyof typeof stepIcons];
              const isCurrentStep = step.id === currentStep;
              const isPassed = step.id < currentStep;
              const isCompleted = step.isCompleted;
              
              return (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: step.id * 0.1 }}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border-2 transition-all",
                    isCurrentStep && "border-green-500 bg-green-50",
                    isCompleted && "border-green-500 bg-green-50",
                    !isCurrentStep && !isCompleted && "border-gray-200 bg-gray-50"
                  )}
                >
                  <div className={cn(
                    "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                    isCurrentStep && "bg-green-600 text-white",
                    isCompleted && "bg-green-600 text-white",
                    !isCurrentStep && !isCompleted && "bg-gray-300 text-gray-600"
                  )}>
                    {isCompleted ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : isCurrentStep ? (
                      <Clock className="h-4 w-4" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                  </div>
                  
                  <div className="min-w-0">
                    <h4 className={cn(
                      "font-medium text-sm",
                      isCurrentStep && "text-green-800",
                      isCompleted && "text-green-800",
                      !isCurrentStep && !isCompleted && "text-gray-600"
                    )}>
                      {step.title}
                    </h4>
                    <p className={cn(
                      "text-xs",
                      isCurrentStep && "text-green-700",
                      isCompleted && "text-green-700",
                      !isCurrentStep && !isCompleted && "text-gray-500"
                    )}>
                      {step.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {renderStepContent()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}