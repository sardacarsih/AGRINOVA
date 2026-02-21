export enum PanenStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PKS_RECEIVED = 'PKS_RECEIVED',
  PKS_WEIGHED = 'PKS_WEIGHED',
}

export enum Ripeness {
  MENTAH = 'MENTAH',
  MATANG = 'MATANG',
  LEWAT_MATANG = 'LEWAT_MATANG',
}

export enum Quality {
  EXCELLENT = 'EXCELLENT',
  GOOD = 'GOOD',
  FAIR = 'FAIR',
  POOR = 'POOR',
  REJECT = 'REJECT',
}

export interface Estate {
  id: string
  name: string
  code: string
  location?: string
}

export interface Block {
  id: string
  name: string
  code: string
  estateId: string
  estate?: Estate
  area?: number
  plantingYear?: number
}

export interface Mandor {
  id: string
  name: string
  employeeNumber: string
  phone?: string
  email?: string
}

export interface PanenEmployee {
  id: string
  employeeId: string
  employee?: {
    id: string
    name: string
    employeeNumber: string
  }
  role?: string
  tbsCount: number
  weight: number
  brondolan: number
  workHours?: number
  overtimeHours?: number
  checkInTime?: string
  checkOutTime?: string
}

export interface TBSRecord {
  id: string
  tbsNumber?: string
  weight: number
  ripeness: Ripeness
  quality: Quality
  brondolan: number
  defects?: string
  latitude?: number
  longitude?: number
  palmTreeNumber?: string
  collectionTime: string
  transportTime?: string
  recordedBy?: {
    id: string
    name: string
  }
}

export interface HarvestEntry {
  id: string
  panenNumber: string
  blockId: string
  block?: Block
  harvestDate: string
  mandorId: string
  mandor?: Mandor
  approvedById?: string
  approvedBy?: {
    id: string
    name: string
  }
  status: PanenStatus
  approvalDate?: string
  rejectionReason?: string
  totalEmployees: number
  totalTBS: number
  totalWeight: number
  totalBrondolan: number
  averageRipeness?: Ripeness
  notes?: string
  pksWeight?: number
  bjr?: number
  oer?: number
  ker?: number
  employees?: PanenEmployee[]
  tbsRecords?: TBSRecord[]
  createdAt: string
  updatedAt: string
}

export interface DashboardMetrics {
  totalHarvestToday: {
    count: number
    weight: number
    percentage: number
  }
  totalHarvestWeek: {
    count: number
    weight: number
    percentage: number
  }
  totalHarvestMonth: {
    count: number
    weight: number
    percentage: number
  }
  pendingApprovals: {
    count: number
    percentage: number
  }
  activeMandor: {
    count: number
    total: number
  }
  tbsQuality: {
    excellent: number
    good: number
    fair: number
    poor: number
    reject: number
  }
}

export interface ChartData {
  name: string
  value: number
  label?: string
  color?: string
}

export interface TrendData {
  date: string
  harvest: number
  weight: number
  tbs: number
}

export interface EstatePerformance {
  estateId: string
  estateName: string
  totalWeight: number
  totalTBS: number
  averageQuality: number
  efficiency: number
  blocks: {
    blockId: string
    blockName: string
    weight: number
    tbs: number
  }[]
}

export interface DashboardFilters {
  dateRange: {
    start: string
    end: string
  }
  estates?: string[]
  blocks?: string[]
  mandors?: string[]
  status?: PanenStatus[]
}

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export interface HarvestListResponse {
  data: HarvestEntry[]
  meta: PaginationMeta
}

export interface DashboardState {
  metrics: DashboardMetrics
  harvestEntries: HarvestEntry[]
  trendData: TrendData[]
  estatePerformance: EstatePerformance[]
  isLoading: boolean
  error: string | null
  lastUpdated: string
}

export interface RealTimeUpdate {
  type: 'harvest' | 'approval' | 'gate_check'
  action: 'created' | 'updated' | 'deleted'
  data: any
  timestamp: string
  userId?: string
}