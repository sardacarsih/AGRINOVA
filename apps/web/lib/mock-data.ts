import { 
  HarvestEntry, 
  DashboardMetrics, 
  TrendData, 
  EstatePerformance, 
  PanenStatus, 
  Ripeness, 
  Quality 
} from '@/types/dashboard'

export const mockEstates = [
  { id: '1', name: 'Kebun Mekar Sari', code: 'KMS', location: 'Riau' },
  { id: '2', name: 'Kebun Indah Jaya', code: 'KIJ', location: 'Sumatera Utara' },
  { id: '3', name: 'Kebun Sejahtera Abadi', code: 'KSA', location: 'Kalimantan Tengah' },
]

export const mockBlocks = [
  { id: '1', name: 'Blok A1', code: 'A1', estateId: '1', area: 50, plantingYear: 2015 },
  { id: '2', name: 'Blok A2', code: 'A2', estateId: '1', area: 45, plantingYear: 2016 },
  { id: '3', name: 'Blok B1', code: 'B1', estateId: '2', area: 60, plantingYear: 2014 },
  { id: '4', name: 'Blok B2', code: 'B2', estateId: '2', area: 55, plantingYear: 2015 },
  { id: '5', name: 'Blok C1', code: 'C1', estateId: '3', area: 70, plantingYear: 2013 },
]

export const mockMandors = [
  { id: '1', name: 'Budi Santoso', employeeNumber: 'MND001', phone: '081234567890' },
  { id: '2', name: 'Agus Wijaya', employeeNumber: 'MND002', phone: '081234567891' },
  { id: '3', name: 'Sari Indah', employeeNumber: 'MND003', phone: '081234567892' },
  { id: '4', name: 'Joko Susilo', employeeNumber: 'MND004', phone: '081234567893' },
  { id: '5', name: 'Rina Sari', employeeNumber: 'MND005', phone: '081234567894' },
]

// Generate realistic harvest entries
const generateHarvestEntries = (): HarvestEntry[] => {
  const entries: HarvestEntry[] = []
  const today = new Date()
  
  for (let i = 0; i < 50; i++) {
    const harvestDate = new Date(today)
    harvestDate.setDate(harvestDate.getDate() - Math.floor(Math.random() * 30))
    
    const estate = mockEstates[Math.floor(Math.random() * mockEstates.length)]
    const block = mockBlocks.filter(b => b.estateId === estate.id)[
      Math.floor(Math.random() * mockBlocks.filter(b => b.estateId === estate.id).length)
    ]
    const mandor = mockMandors[Math.floor(Math.random() * mockMandors.length)]
    
    const totalEmployees = Math.floor(Math.random() * 8) + 3 // 3-10 employees
    const totalTBS = Math.floor(Math.random() * 800) + 200 // 200-1000 TBS
    const totalWeight = totalTBS * (18 + Math.random() * 12) // 18-30kg per TBS
    const totalBrondolan = totalWeight * (0.02 + Math.random() * 0.08) // 2-10% brondolan
    
    const statuses = [PanenStatus.PENDING, PanenStatus.APPROVED, PanenStatus.REJECTED, PanenStatus.PKS_RECEIVED]
    const statusWeights = [0.2, 0.6, 0.1, 0.1] // Most entries are approved
    const status = statuses[weightedRandom(statusWeights)]
    
    const entry: HarvestEntry = {
      id: `harvest-${i + 1}`,
      panenNumber: `PN/${harvestDate.getFullYear()}/${String(harvestDate.getMonth() + 1).padStart(2, '0')}/${String(i + 1).padStart(4, '0')}`,
      blockId: block?.id || '1',
      block: {
        ...block!,
        estate: estate
      },
      harvestDate: harvestDate.toISOString(),
      mandorId: mandor.id,
      mandor: mandor,
      status: status,
      approvalDate: status === PanenStatus.APPROVED ? new Date(harvestDate.getTime() + Math.random() * 86400000).toISOString() : undefined,
      approvedById: status === PanenStatus.APPROVED ? 'asisten-' + Math.floor(Math.random() * 3 + 1) : undefined,
      approvedBy: status === PanenStatus.APPROVED ? {
        id: 'asisten-' + Math.floor(Math.random() * 3 + 1),
        name: ['Dedi Kurniawan', 'Siti Nurhaliza', 'Ahmad Fauzi'][Math.floor(Math.random() * 3)]
      } : undefined,
      rejectionReason: status === PanenStatus.REJECTED ? 'Kualitas TBS tidak memenuhi standar' : undefined,
      totalEmployees: totalEmployees,
      totalTBS: totalTBS,
      totalWeight: Math.round(totalWeight * 100) / 100,
      totalBrondolan: Math.round(totalBrondolan * 100) / 100,
      averageRipeness: [Ripeness.MENTAH, Ripeness.MATANG, Ripeness.LEWAT_MATANG][Math.floor(Math.random() * 3)],
      notes: Math.random() > 0.7 ? 'Kondisi cuaca baik, hasil panen optimal' : undefined,
      pksWeight: status === PanenStatus.PKS_RECEIVED ? Math.round(totalWeight * (0.95 + Math.random() * 0.1) * 100) / 100 : undefined,
      bjr: status === PanenStatus.PKS_RECEIVED ? Math.round((15 + Math.random() * 10) * 100) / 100 : undefined,
      oer: status === PanenStatus.PKS_RECEIVED ? Math.round((20 + Math.random() * 5) * 100) / 100 : undefined,
      ker: status === PanenStatus.PKS_RECEIVED ? Math.round((8 + Math.random() * 4) * 100) / 100 : undefined,
      createdAt: harvestDate.toISOString(),
      updatedAt: new Date().toISOString(),
    }
    
    entries.push(entry)
  }
  
  return entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

// Utility function for weighted random selection
function weightedRandom(weights: number[]): number {
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
  let random = Math.random() * totalWeight
  
  for (let i = 0; i < weights.length; i++) {
    if (random < weights[i]) {
      return i
    }
    random -= weights[i]
  }
  
  return weights.length - 1
}

export const mockHarvestEntries = generateHarvestEntries()

// Calculate dashboard metrics from mock data
export const mockDashboardMetrics: DashboardMetrics = {
  totalHarvestToday: {
    count: mockHarvestEntries.filter(entry => {
      const today = new Date()
      const entryDate = new Date(entry.harvestDate)
      return entryDate.toDateString() === today.toDateString()
    }).length,
    weight: mockHarvestEntries
      .filter(entry => {
        const today = new Date()
        const entryDate = new Date(entry.harvestDate)
        return entryDate.toDateString() === today.toDateString()
      })
      .reduce((sum, entry) => sum + entry.totalWeight, 0),
    percentage: 12.5 // Mock percentage change
  },
  totalHarvestWeek: {
    count: mockHarvestEntries.filter(entry => {
      const today = new Date()
      const entryDate = new Date(entry.harvestDate)
      const daysDiff = Math.floor((today.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24))
      return daysDiff <= 7
    }).length,
    weight: mockHarvestEntries
      .filter(entry => {
        const today = new Date()
        const entryDate = new Date(entry.harvestDate)
        const daysDiff = Math.floor((today.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24))
        return daysDiff <= 7
      })
      .reduce((sum, entry) => sum + entry.totalWeight, 0),
    percentage: 8.3 // Mock percentage change
  },
  totalHarvestMonth: {
    count: mockHarvestEntries.filter(entry => {
      const today = new Date()
      const entryDate = new Date(entry.harvestDate)
      const daysDiff = Math.floor((today.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24))
      return daysDiff <= 30
    }).length,
    weight: mockHarvestEntries
      .filter(entry => {
        const today = new Date()
        const entryDate = new Date(entry.harvestDate)
        const daysDiff = Math.floor((today.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24))
        return daysDiff <= 30
      })
      .reduce((sum, entry) => sum + entry.totalWeight, 0),
    percentage: 15.7 // Mock percentage change
  },
  pendingApprovals: {
    count: mockHarvestEntries.filter(entry => entry.status === PanenStatus.PENDING).length,
    percentage: -5.2 // Mock percentage change (negative is good for pending)
  },
  activeMandor: {
    count: new Set(mockHarvestEntries
      .filter(entry => {
        const today = new Date()
        const entryDate = new Date(entry.harvestDate)
        const daysDiff = Math.floor((today.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24))
        return daysDiff <= 7
      })
      .map(entry => entry.mandorId)
    ).size,
    total: mockMandors.length
  },
  tbsQuality: {
    excellent: 35,
    good: 40,
    fair: 20,
    poor: 4,
    reject: 1
  }
}

// Generate trend data for the last 30 days
export const mockTrendData: TrendData[] = Array.from({ length: 30 }, (_, i) => {
  const date = new Date()
  date.setDate(date.getDate() - (29 - i))
  
  const dayEntries = mockHarvestEntries.filter(entry => {
    const entryDate = new Date(entry.harvestDate)
    return entryDate.toDateString() === date.toDateString()
  })
  
  return {
    date: date.toISOString().split('T')[0],
    harvest: dayEntries.length,
    weight: Math.round(dayEntries.reduce((sum, entry) => sum + entry.totalWeight, 0) * 100) / 100,
    tbs: dayEntries.reduce((sum, entry) => sum + entry.totalTBS, 0)
  }
})

// Generate estate performance data
export const mockEstatePerformance: EstatePerformance[] = mockEstates.map(estate => {
  const estateEntries = mockHarvestEntries.filter(entry => entry.block?.estateId === estate.id)
  const estateBlocks = mockBlocks.filter(block => block.estateId === estate.id)
  
  return {
    estateId: estate.id,
    estateName: estate.name,
    totalWeight: Math.round(estateEntries.reduce((sum, entry) => sum + entry.totalWeight, 0) * 100) / 100,
    totalTBS: estateEntries.reduce((sum, entry) => sum + entry.totalTBS, 0),
    averageQuality: Math.round((70 + Math.random() * 25) * 100) / 100,
    efficiency: Math.round((85 + Math.random() * 10) * 100) / 100,
    blocks: estateBlocks.map(block => {
      const blockEntries = estateEntries.filter(entry => entry.blockId === block.id)
      return {
        blockId: block.id,
        blockName: block.name,
        weight: Math.round(blockEntries.reduce((sum, entry) => sum + entry.totalWeight, 0) * 100) / 100,
        tbs: blockEntries.reduce((sum, entry) => sum + entry.totalTBS, 0)
      }
    })
  }
})