// Harvest/Panen types for Web Dashboard
export interface HarvestData {
  id: string;
  panenNumber?: string;
  blockId: string;
  blockCode: string;
  blockName: string;
  harvestDate: Date;
  mandorId: string;
  mandorName: string;
  shift: 'PAGI' | 'SIANG' | 'MALAM';
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';
  totalEmployees: number;
  totalTBS: number;
  totalWeight: number;
  totalBrondolan: number;
  avgQuality: number;
  bjrRatio: number;
  estimatedLoad: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  syncStatus: 'LOCAL' | 'SYNCING' | 'SYNCED' | 'ERROR';
  syncError?: string;
  lastSyncAt?: Date;
  employees: HarvestEmployee[];
}

export interface HarvestEmployee {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  
  // TBS Matang (Ripe)
  tbsMatang: number; // jumlah TBS matang
  beratMatang: number; // berat TBS matang (kg)
  
  // TBS Mentah (Unripe)
  tbsMentah: number; // jumlah TBS mentah
  beratMentah: number; // berat TBS mentah (kg)
  
  // TBS Lewat Matang (Overripe)
  tbsLewatMatang: number; // jumlah TBS lewat matang
  beratLewatMatang: number; // berat TBS lewat matang (kg)
  
  // TBS Kosong (Empty bunches)
  tbsKosong: number; // jumlah TBS kosong
  beratKosong: number; // berat TBS kosong (kg)
  
  brondolan: number; // loose fruits in kg
  quality: number; // 1-5 scale (overall quality assessment)
  efficiency?: number; // calculated based on historical data
  
  // Calculated fields
  totalTbs?: number; // total all TBS types
  totalWeight?: number; // total weight all types
  maturityRatio?: number; // percentage of mature fruits
}

export interface CreateHarvestRequest {
  blockId: string;
  harvestDate: string;
  shift?: 'PAGI' | 'SIANG' | 'MALAM';
  notes?: string;
  employees: CreateHarvestEmployeeRequest[];
}

// TBS Categories and Quality Standards
export const TBS_CATEGORIES = {
  MATANG: 'MATANG', // Ripe - optimal for processing
  MENTAH: 'MENTAH', // Unripe - lower oil content
  LEWAT_MATANG: 'LEWAT_MATANG', // Overripe - potential quality issues
  KOSONG: 'KOSONG' // Empty bunches - minimal value
} as const;

export type TbsCategory = keyof typeof TBS_CATEGORIES;

// Quality scoring for different TBS categories
export const TBS_QUALITY_WEIGHTS = {
  MATANG: 1.0, // Full value
  MENTAH: 0.7, // Reduced value due to lower oil content
  LEWAT_MATANG: 0.8, // Slightly reduced due to potential fermentation
  KOSONG: 0.1 // Minimal value
};

// Expected weight ranges per TBS (in kg)
export const TBS_WEIGHT_RANGES = {
  MATANG: { min: 8, max: 25, optimal: 15 },
  MENTAH: { min: 6, max: 20, optimal: 12 },
  LEWAT_MATANG: { min: 8, max: 28, optimal: 18 },
  KOSONG: { min: 1, max: 8, optimal: 3 }
};

export interface CreateHarvestEmployeeRequest {
  employeeId: string;
  employeeName: string;
  
  // TBS by maturity category
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
}

export interface Block {
  id: string;
  code: string;
  name: string;
  divisiId: string;
  divisiName: string;
  estateId: string;
  estateName: string;
  area: number;
  plantingYear: number;
  palmCount: number;
  varietyType: string;
  isActive: boolean;
  location?: {
    latitude: number;
    longitude: number;
    elevation?: number;
  };
}

export interface Employee {
  id: string;
  code: string;
  name: string;
  position: string;
  divisiId: string;
  divisiName: string;
  isActive: boolean;
  phoneNumber?: string;
  joinDate: Date;
  efficiency?: number;
  totalHarvest?: number;
  avatar?: string;
}

export interface HarvestFormData {
  blockId: string;
  harvestDate: Date;
  shift: 'PAGI' | 'SIANG' | 'MALAM';
  notes: string;
  employees: {
    employeeId: string;
    
    // TBS by maturity category
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
  }[];
}

export interface SyncStatus {
  isConnected: boolean;
  isSyncing: boolean;
  pendingSync: number;
  lastSyncAt: Date | null;
  syncError: string | null;
}

export interface HarvestStats {
  today: {
    totalHarvest: number;
    totalWeight: number;
    totalWorkers: number;
    pendingApproval: number;
    completedBlocks: number;
    targetAchievement: number;
    avgQuality: number;
  };
  thisWeek: {
    totalHarvest: number;
    totalWeight: number;
    avgQuality: number;
    efficiency: number;
  };
  thisMonth: {
    totalHarvest: number;
    totalWeight: number;
    avgQuality: number;
    efficiency: number;
  };
}

// Quality scale mapping
export const QUALITY_LABELS: Record<number, string> = {
  1: 'Sangat Buruk',
  2: 'Buruk', 
  3: 'Cukup',
  4: 'Baik',
  5: 'Sangat Baik'
};

// TBS quality mapping
export const TBS_QUALITY_LABELS: Record<string, string> = {
  'MENTAH': 'Mentah',
  'MATANG': 'Matang',
  'LEWAT_MATANG': 'Lewat Matang',
  'KOSONG': 'Kosong'
};

// TBS quality colors
export const TBS_QUALITY_COLORS: Record<string, string> = {
  'MENTAH': 'text-red-600 bg-red-50 border-red-200',
  'MATANG': 'text-green-600 bg-green-50 border-green-200',
  'LEWAT_MATANG': 'text-orange-600 bg-orange-50 border-orange-200',
  'KOSONG': 'text-gray-600 bg-gray-50 border-gray-200'
};

// Utility functions for harvest calculations
export const calculateMaturityRatio = (employee: HarvestEmployee): number => {
  const totalTbs = employee.tbsMatang + employee.tbsMentah + employee.tbsLewatMatang + employee.tbsKosong;
  if (totalTbs === 0) return 0;
  return (employee.tbsMatang / totalTbs) * 100;
};

export const calculateWeightedQuality = (employee: HarvestEmployee): number => {
  const totalWeight = employee.beratMatang + employee.beratMentah + employee.beratLewatMatang + employee.beratKosong;
  if (totalWeight === 0) return 0;
  
  const weightedScore = 
    (employee.beratMatang * TBS_QUALITY_WEIGHTS.MATANG) +
    (employee.beratMentah * TBS_QUALITY_WEIGHTS.MENTAH) +
    (employee.beratLewatMatang * TBS_QUALITY_WEIGHTS.LEWAT_MATANG) +
    (employee.beratKosong * TBS_QUALITY_WEIGHTS.KOSONG);
    
  return (weightedScore / totalWeight) * 5; // Scale to 1-5
};

export const calculateAdjustedBJR = (employee: HarvestEmployee): number => {
  const totalWeight = employee.beratMatang + employee.beratMentah + employee.beratLewatMatang + employee.beratKosong;
  const totalTbs = employee.tbsMatang + employee.tbsMentah + employee.tbsLewatMatang + employee.tbsKosong;
  
  if (totalTbs === 0) return 0;
  
  // Adjust BJR based on maturity composition
  const maturityRatio = calculateMaturityRatio(employee);
  const baseBJR = totalWeight / totalTbs;
  
  // Penalty for high unripe percentage
  const unripeRatio = (employee.tbsMentah / totalTbs) * 100;
  const overripeRatio = (employee.tbsLewatMatang / totalTbs) * 100;
  
  let adjustedBJR = baseBJR;
  if (unripeRatio > 20) adjustedBJR *= 0.9; // 10% penalty
  if (overripeRatio > 15) adjustedBJR *= 0.95; // 5% penalty
  
  return adjustedBJR;
};

export const getQualityRecommendation = (employee: HarvestEmployee): {
  level: 'excellent' | 'good' | 'fair' | 'poor';
  message: string;
  improvements?: string[];
} => {
  const maturityRatio = calculateMaturityRatio(employee);
  const unripeRatio = (employee.tbsMentah / (employee.tbsMatang + employee.tbsMentah + employee.tbsLewatMatang + employee.tbsKosong)) * 100;
  
  if (maturityRatio >= 80) {
    return {
      level: 'excellent',
      message: 'Kualitas panen sangat baik! Mayoritas TBS matang optimal.'
    };
  } else if (maturityRatio >= 60) {
    return {
      level: 'good',
      message: 'Kualitas panen baik, masih dalam standar yang diterima.'
    };
  } else if (maturityRatio >= 40) {
    return {
      level: 'fair',
      message: 'Kualitas panen cukup, perlu peningkatan seleksi TBS.',
      improvements: [
        'Tingkatkan seleksi TBS matang',
        'Pelatihan identifikasi kematangan buah',
        'Panen lebih sering untuk mengurangi TBS lewat matang'
      ]
    };
  } else {
    return {
      level: 'poor',
      message: 'Kualitas panen perlu perhatian serius!',
      improvements: [
        'Pelatihan ulang cara identifikasi TBS matang',
        'Supervisi lebih ketat dari Asisten',
        'Evaluasi jadwal rotasi panen',
        'Penalty untuk kualitas rendah berulang'
      ]
    };
  }
};

// Status colors
export const STATUS_COLORS: Record<string, string> = {
  'DRAFT': 'text-gray-600 bg-gray-50 border-gray-200',
  'PENDING': 'text-yellow-600 bg-yellow-50 border-yellow-200',
  'APPROVED': 'text-green-600 bg-green-50 border-green-200',
  'REJECTED': 'text-red-600 bg-red-50 border-red-200'
};

// Sync status colors
export const SYNC_STATUS_COLORS: Record<string, string> = {
  'LOCAL': 'text-blue-600 bg-blue-50 border-blue-200',
  'SYNCING': 'text-yellow-600 bg-yellow-50 border-yellow-200',
  'SYNCED': 'text-green-600 bg-green-50 border-green-200',
  'ERROR': 'text-red-600 bg-red-50 border-red-200'
};

// Validation constants
export const HARVEST_VALIDATION = {
  MAX_TBS_PER_EMPLOYEE: 999,
  MAX_WEIGHT_PER_EMPLOYEE: 99,
  MAX_BRONDOLAN_PER_EMPLOYEE: 10,
  MIN_QUALITY: 1,
  MAX_QUALITY: 5,
  MIN_TBS: 1,
  MIN_WEIGHT: 0.1,
  MAX_BJR_RATIO: 0.5, // Normal BJR should be less than 0.5
  MAX_EMPLOYEES_PER_HARVEST: 50
};