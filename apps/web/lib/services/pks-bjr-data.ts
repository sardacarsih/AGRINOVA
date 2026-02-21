// PKS BJR Data Service - BJR values from Palm Kernel Shell processing data
import { Block } from '@/types/harvest';

export interface PKSBJRData {
  blockId: string;
  blockCode: string;
  date: string; // YYYY-MM-DD format
  bjrValue: number; // Bunch to Janjang Ratio (kg per tandan)
  sampleSize: number; // Sample size for this BJR calculation
  qualityGrade: 'A' | 'B' | 'C'; // Quality grade from PKS
  moistureContent: number; // Percentage
  dirtContent: number; // Percentage
  updatedAt: Date;
}

class PKSBJRDataService {
  // Mock PKS BJR data - in real implementation, this would come from PKS API/database
  private pksData: PKSBJRData[] = [
    // Current date data
    {
      blockId: 'block-1',
      blockCode: 'A-01',
      date: new Date().toISOString().split('T')[0],
      bjrValue: 12.5,
      sampleSize: 100,
      qualityGrade: 'A',
      moistureContent: 21.2,
      dirtContent: 1.8,
      updatedAt: new Date()
    },
    {
      blockId: 'block-2',
      blockCode: 'A-02',
      date: new Date().toISOString().split('T')[0],
      bjrValue: 13.2,
      sampleSize: 95,
      qualityGrade: 'A',
      moistureContent: 22.1,
      dirtContent: 2.1,
      updatedAt: new Date()
    },
    {
      blockId: 'block-3',
      blockCode: 'A-03',
      date: new Date().toISOString().split('T')[0],
      bjrValue: 11.8,
      sampleSize: 110,
      qualityGrade: 'B',
      moistureContent: 23.5,
      dirtContent: 2.8,
      updatedAt: new Date()
    },
    {
      blockId: 'block-4',
      blockCode: 'B-01',
      date: new Date().toISOString().split('T')[0],
      bjrValue: 14.1,
      sampleSize: 88,
      qualityGrade: 'A',
      moistureContent: 20.8,
      dirtContent: 1.5,
      updatedAt: new Date()
    },
    {
      blockId: 'block-5',
      blockCode: 'B-02',
      date: new Date().toISOString().split('T')[0],
      bjrValue: 13.7,
      sampleSize: 92,
      qualityGrade: 'A',
      moistureContent: 21.9,
      dirtContent: 2.0,
      updatedAt: new Date()
    },
    {
      blockId: 'block-6',
      blockCode: 'C-01',
      date: new Date().toISOString().split('T')[0],
      bjrValue: 12.9,
      sampleSize: 105,
      qualityGrade: 'B',
      moistureContent: 22.8,
      dirtContent: 2.4,
      updatedAt: new Date()
    }
  ];

  // Get BJR for specific block and date
  getBJR(blockId: string, date: string): number {
    const bjrData = this.pksData.find(data => 
      data.blockId === blockId && data.date === date
    );
    
    // If no specific date found, use latest BJR for the block
    if (!bjrData) {
      const blockBJRs = this.pksData
        .filter(data => data.blockId === blockId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      if (blockBJRs.length > 0) {
        return blockBJRs[0].bjrValue;
      }
      
      // Default BJR if no data available
      return 12.0; // Standard average BJR
    }
    
    return bjrData.bjrValue;
  }

  // Get full PKS data for block and date
  getPKSData(blockId: string, date: string): PKSBJRData | null {
    return this.pksData.find(data => 
      data.blockId === blockId && data.date === date
    ) || null;
  }

  // Calculate weight from TBS count using BJR
  calculateWeight(tbsCount: number, blockId: string, date: string): number {
    const bjr = this.getBJR(blockId, date);
    return Math.round((tbsCount * bjr) * 10) / 10; // Round to 1 decimal place
  }

  // Calculate total weight from multiple TBS types
  calculateTotalWeight(tbsData: {
    tbsMatang: number;
    tbsMentah: number; 
    tbsLewatMatang: number;
    tbsKosong: number;
  }, blockId: string, date: string): {
    beratMatang: number;
    beratMentah: number;
    beratLewatMatang: number;
    beratKosong: number;
    totalWeight: number;
  } {
    const bjr = this.getBJR(blockId, date);
    
    const beratMatang = Math.round((tbsData.tbsMatang * bjr) * 10) / 10;
    const beratMentah = Math.round((tbsData.tbsMentah * bjr) * 10) / 10;
    const beratLewatMatang = Math.round((tbsData.tbsLewatMatang * bjr) * 10) / 10;
    const beratKosong = Math.round((tbsData.tbsKosong * bjr) * 10) / 10;
    
    return {
      beratMatang,
      beratMentah,
      beratLewatMatang,
      beratKosong,
      totalWeight: beratMatang + beratMentah + beratLewatMatang + beratKosong
    };
  }

  // Get all available BJR data for a date (for reporting)
  getBJRDataByDate(date: string): PKSBJRData[] {
    return this.pksData.filter(data => data.date === date);
  }

  // Get BJR history for a block
  getBJRHistory(blockId: string, days: number = 7): PKSBJRData[] {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);
    
    return this.pksData
      .filter(data => {
        const dataDate = new Date(data.date);
        return data.blockId === blockId && 
               dataDate >= startDate && 
               dataDate <= endDate;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  // Add new PKS BJR data (for admin/PKS integration)
  addPKSData(data: Omit<PKSBJRData, 'updatedAt'>): PKSBJRData {
    const newData: PKSBJRData = {
      ...data,
      updatedAt: new Date()
    };
    
    // Remove existing data for same block/date
    this.pksData = this.pksData.filter(existing => 
      !(existing.blockId === data.blockId && existing.date === data.date)
    );
    
    this.pksData.push(newData);
    return newData;
  }

  // Get average BJR for blocks (for reporting)
  getAverageBJR(blockIds: string[], date: string): number {
    const bjrValues = blockIds
      .map(blockId => this.getBJR(blockId, date))
      .filter(bjr => bjr > 0);
    
    if (bjrValues.length === 0) return 12.0; // Default
    
    const average = bjrValues.reduce((sum, bjr) => sum + bjr, 0) / bjrValues.length;
    return Math.round(average * 10) / 10;
  }

  // Validate BJR data quality
  validateBJR(bjr: number): {
    isValid: boolean;
    warning?: string;
    level: 'good' | 'warning' | 'error';
  } {
    if (bjr < 8 || bjr > 20) {
      return {
        isValid: false,
        warning: 'BJR di luar rentang normal (8-20 kg/tandan)',
        level: 'error'
      };
    }
    
    if (bjr < 10 || bjr > 16) {
      return {
        isValid: true,
        warning: 'BJR perlu perhatian - periksa kualitas TBS',
        level: 'warning'
      };
    }
    
    return {
      isValid: true,
      level: 'good'
    };
  }
}

export const pksBJRService = new PKSBJRDataService();
export default pksBJRService;