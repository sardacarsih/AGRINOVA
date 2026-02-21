'use client';

// Harvest wizard types for the new detailed workflow
export interface Worker {
  id: string;
  employeeId: string;
  name: string;
  code: string;
  divisionId: string;
  isActive: boolean;
  efficiency?: number;
  phoneNumber?: string;
  avatar?: string;
}


export interface BlockWithBJR {
  id: string;
  blockCode: string;
  name: string;
  luasHa?: number;
  cropType?: string;
  plantingYear?: number;
  bjrValue?: number; // BJR value from master data
  division: {
    id: string;
    name: string;
    estate: {
      id: string;
      name: string;
    };
  };
  lastHarvestDate?: string;
  harvestCount?: number;
}

// Palm oil bunch categories as specified in requirements
export type BunchCategory =
  | 'TANDAN_MENTAH'      // Raw Bunches
  | 'TANDAN_MASAK'       // Ripe Bunches
  | 'TANDAN_LEWAT_MASAK' // Overripe Bunches
  | 'TANDAN_BUSUK'       // Rotten Bunches
  | 'TANDAN_TANGKAI_PANJANG' // Long Stem Bunches
  | 'JANJANG_KOSONG'     // Empty Bunches
  | 'BERONDOLAN';        // Loose Fruits (in sacks/karung)

export const BUNCH_CATEGORY_LABELS: Record<BunchCategory, string> = {
  TANDAN_MENTAH: 'Tandan Mentah',
  TANDAN_MASAK: 'Tandan Masak',
  TANDAN_LEWAT_MASAK: 'Tandan Lewat Masak',
  TANDAN_BUSUK: 'Tandan Busuk',
  TANDAN_TANGKAI_PANJANG: 'Tandan Tangkai Panjang',
  JANJANG_KOSONG: 'Janjang Kosong',
  BERONDOLAN: 'Berondolan (Karung)'
};

export const BUNCH_CATEGORY_COLORS: Record<BunchCategory, string> = {
  TANDAN_MENTAH: 'text-red-700 bg-red-50 border-red-200',
  TANDAN_MASAK: 'text-green-700 bg-green-50 border-green-200',
  TANDAN_LEWAT_MASAK: 'text-orange-700 bg-orange-50 border-orange-200',
  TANDAN_BUSUK: 'text-gray-700 bg-gray-50 border-gray-200',
  TANDAN_TANGKAI_PANJANG: 'text-yellow-700 bg-yellow-50 border-yellow-200',
  JANJANG_KOSONG: 'text-blue-700 bg-blue-50 border-blue-200',
  BERONDOLAN: 'text-purple-700 bg-purple-50 border-purple-200'
};

// Worker harvest input for each category
export interface WorkerHarvestInput {
  workerId: string;
  workerName: string;
  categories: Record<BunchCategory, {
    quantity: number; // Number of bunches or sacks
    estimatedWeight?: number; // Auto-calculated for relevant categories
  }>;
  totalEstimatedWeight: number; // Sum of all estimated weights
}

// Wizard step data structure
export interface WizardStep {
  id: number;
  name: string;
  title: string;
  description: string;
  isCompleted: boolean;
  isActive: boolean;
  validation?: () => boolean;
}

// Complete harvest wizard form data
export interface HarvestWizardFormData {
  // Step 1: Date & Block Selection
  harvestDate: string;
  selectedBlock: BlockWithBJR | null;

  // Step 2: Worker Selection  
  selectedWorkers: Worker[];

  // Step 3: Category Input per Worker
  workerInputs: WorkerHarvestInput[];

  // Step 4: Summary & Confirmation
  notes?: string;
  totalQuantity: Record<BunchCategory, number>;
  totalEstimatedWeight: number;
  isConfirmed: boolean;
}

// Weight estimation factors for auto-calculation
export const BUNCH_WEIGHT_FACTORS: Record<BunchCategory, {
  avgWeight: number; // Average weight per bunch/unit in kg
  usesBJR: boolean;   // Whether this category uses BJR for calculation
}> = {
  TANDAN_MENTAH: { avgWeight: 12, usesBJR: true },
  TANDAN_MASAK: { avgWeight: 15, usesBJR: true },
  TANDAN_LEWAT_MASAK: { avgWeight: 18, usesBJR: true },
  TANDAN_BUSUK: { avgWeight: 8, usesBJR: true },
  TANDAN_TANGKAI_PANJANG: { avgWeight: 10, usesBJR: true },
  JANJANG_KOSONG: { avgWeight: 3, usesBJR: true },
  BERONDOLAN: { avgWeight: 25, usesBJR: false } // Per sack/karung
};

// Wizard step constants
export const WIZARD_STEPS: WizardStep[] = [
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

// Form validation schemas for each step
export interface StepValidation {
  isValid: boolean;
  errors: string[];
}

// Utility functions for wizard
export const calculateEstimatedWeight = (
  category: BunchCategory,
  quantity: number,
  bjrValue?: number
): number => {
  const factor = BUNCH_WEIGHT_FACTORS[category];

  if (factor.usesBJR && bjrValue) {
    // Use BJR for ripe and overripe bunches
    return quantity * factor.avgWeight * bjrValue;
  }

  return quantity * factor.avgWeight;
};

export const calculateTotalWeight = (workerInput: WorkerHarvestInput): number => {
  return Object.values(workerInput.categories).reduce(
    (total, category) => total + (category.estimatedWeight || 0),
    0
  );
};

export const validateStep = (step: number, formData: HarvestWizardFormData): StepValidation => {
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
      formData.workerInputs.forEach((workerInput, index) => {
        const hasAnyInput = Object.values(workerInput.categories).some(cat => cat.quantity > 0);
        if (!hasAnyInput) {
          errors.push(`Karyawan ${workerInput.workerName} harus memiliki minimal satu kategori dengan nilai > 0`);
        }
      });
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

