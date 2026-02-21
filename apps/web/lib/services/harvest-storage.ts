// Offline-first storage service for harvest data
import { HarvestData, HarvestFormData, CreateHarvestRequest, SyncStatus } from '@/types/harvest';

class HarvestStorageService {
  private readonly STORAGE_KEYS = {
    HARVESTS: 'agrinova_harvests',
    SYNC_STATUS: 'agrinova_sync_status',
    PENDING_SYNC: 'agrinova_pending_sync'
  };

  // Get all harvest data from localStorage
  getHarvests(): HarvestData[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEYS.HARVESTS);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading harvest data:', error);
      return [];
    }
  }

  // Get harvest by ID
  getHarvestById(id: string): HarvestData | null {
    const harvests = this.getHarvests();
    return harvests.find(h => h.id === id) || null;
  }

  // Get harvests by mandor
  getHarvestsByMandor(mandorId: string): HarvestData[] {
    const harvests = this.getHarvests();
    return harvests.filter(h => h.mandorId === mandorId);
  }

  // Save harvest data
  saveHarvest(harvest: HarvestData): void {
    try {
      const harvests = this.getHarvests();
      const existingIndex = harvests.findIndex(h => h.id === harvest.id);
      
      if (existingIndex >= 0) {
        harvests[existingIndex] = harvest;
      } else {
        harvests.push(harvest);
      }
      
      localStorage.setItem(this.STORAGE_KEYS.HARVESTS, JSON.stringify(harvests));
      this.updateSyncStatus();
    } catch (error) {
      console.error('Error saving harvest data:', error);
      throw new Error('Gagal menyimpan data panen');
    }
  }

  // Create new harvest
  createHarvest(formData: HarvestFormData, mandorId: string): HarvestData {
    const id = this.generateId();
    const now = new Date();
    
    // Calculate totals
    const totalTBS = formData.employees.reduce((sum, emp) => sum + (emp.tbsMatang + emp.tbsMentah + emp.tbsLewatMatang + emp.tbsKosong), 0);
    const totalWeight = formData.employees.reduce((sum, emp) => sum + (emp.beratMatang + emp.beratMentah + emp.beratLewatMatang + emp.beratKosong), 0);
    const totalBrondolan = formData.employees.reduce((sum, emp) => sum + emp.brondolan, 0);
    const avgQuality = formData.employees.reduce((sum, emp) => sum + emp.quality, 0) / formData.employees.length || 0;
    const bjrRatio = totalTBS > 0 ? totalWeight / totalTBS : 0;
    const estimatedLoad = totalWeight * 1.1; // Add 10% for transport container weight

    const harvest: HarvestData = {
      id,
      blockId: formData.blockId,
      blockCode: '', // Will be populated from block data
      blockName: '',
      harvestDate: formData.harvestDate,
      mandorId,
      mandorName: '', // Will be populated from user data
      shift: formData.shift,
      status: 'DRAFT',
      totalEmployees: formData.employees.length,
      totalTBS,
      totalWeight,
      totalBrondolan,
      avgQuality: Math.round(avgQuality * 10) / 10, // Round to 1 decimal
      bjrRatio: Math.round(bjrRatio * 1000) / 1000, // Round to 3 decimals
      estimatedLoad: Math.round(estimatedLoad * 100) / 100, // Round to 2 decimals
      notes: formData.notes,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'LOCAL',
      employees: formData.employees.map((emp, index) => ({
        id: this.generateId(),
        employeeId: emp.employeeId,
        employeeName: '', // Will be populated from employee data
        employeeCode: '',
        tbsMatang: emp.tbsMatang,
        beratMatang: emp.beratMatang,
        tbsMentah: emp.tbsMentah,
        beratMentah: emp.beratMentah,
        tbsLewatMatang: emp.tbsLewatMatang,
        beratLewatMatang: emp.beratLewatMatang,
        tbsKosong: emp.tbsKosong,
        beratKosong: emp.beratKosong,
        brondolan: emp.brondolan,
        quality: emp.quality
      }))
    };

    this.saveHarvest(harvest);
    return harvest;
  }

  // Update harvest
  updateHarvest(id: string, updates: Partial<HarvestData>): HarvestData | null {
    const harvest = this.getHarvestById(id);
    if (!harvest) return null;

    const updatedHarvest = {
      ...harvest,
      ...updates,
      updatedAt: new Date(),
      syncStatus: 'LOCAL' as const
    };

    this.saveHarvest(updatedHarvest);
    return updatedHarvest;
  }

  // Delete harvest
  deleteHarvest(id: string): boolean {
    try {
      const harvests = this.getHarvests();
      const filtered = harvests.filter(h => h.id !== id);
      
      if (filtered.length < harvests.length) {
        localStorage.setItem(this.STORAGE_KEYS.HARVESTS, JSON.stringify(filtered));
        this.updateSyncStatus();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error deleting harvest:', error);
      return false;
    }
  }

  // Submit harvest for approval (change status from DRAFT to PENDING)
  submitHarvestForApproval(id: string): HarvestData | null {
    const harvest = this.getHarvestById(id);
    if (!harvest || harvest.status !== 'DRAFT') return null;

    return this.updateHarvest(id, {
      status: 'PENDING',
      syncStatus: 'LOCAL'
    });
  }

  // Get sync status
  getSyncStatus(): SyncStatus {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEYS.SYNC_STATUS);
      const defaultStatus: SyncStatus = {
        isConnected: navigator.onLine,
        isSyncing: false,
        pendingSync: 0,
        lastSyncAt: null,
        syncError: null
      };

      if (!stored) return defaultStatus;

      const parsed = JSON.parse(stored);
      return {
        ...defaultStatus,
        ...parsed,
        lastSyncAt: parsed.lastSyncAt ? new Date(parsed.lastSyncAt) : null,
        isConnected: navigator.onLine // Always check real network status
      };
    } catch (error) {
      console.error('Error loading sync status:', error);
      return {
        isConnected: navigator.onLine,
        isSyncing: false,
        pendingSync: 0,
        lastSyncAt: null,
        syncError: 'Error loading sync status'
      };
    }
  }

  // Update sync status
  private updateSyncStatus(): void {
    const harvests = this.getHarvests();
    const pendingSync = harvests.filter(h => h.syncStatus === 'LOCAL' || h.syncStatus === 'ERROR').length;
    
    const currentStatus = this.getSyncStatus();
    const newStatus: SyncStatus = {
      ...currentStatus,
      pendingSync,
      isConnected: navigator.onLine
    };

    localStorage.setItem(this.STORAGE_KEYS.SYNC_STATUS, JSON.stringify(newStatus));
  }

  // Simulate sync to server
  async syncToServer(): Promise<{ success: boolean; message: string }> {
    const status = this.getSyncStatus();
    if (status.isSyncing) {
      return { success: false, message: 'Sync already in progress' };
    }

    if (!status.isConnected) {
      return { success: false, message: 'No internet connection' };
    }

    try {
      // Update sync status to syncing
      const newStatus = { ...status, isSyncing: true, syncError: null };
      localStorage.setItem(this.STORAGE_KEYS.SYNC_STATUS, JSON.stringify(newStatus));

      // Get harvests that need sync
      const harvests = this.getHarvests();
      const toSync = harvests.filter(h => h.syncStatus === 'LOCAL' || h.syncStatus === 'ERROR');

      if (toSync.length === 0) {
        const finalStatus = { ...newStatus, isSyncing: false, lastSyncAt: new Date() };
        localStorage.setItem(this.STORAGE_KEYS.SYNC_STATUS, JSON.stringify(finalStatus));
        return { success: true, message: 'No data to sync' };
      }

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 1000));

      // Simulate random sync failures (10% chance)
      const shouldFail = Math.random() < 0.1;
      
      if (shouldFail) {
        // Mark as error
        toSync.forEach(harvest => {
          harvest.syncStatus = 'ERROR';
          harvest.syncError = 'Network timeout - will retry automatically';
        });

        const finalStatus = {
          ...newStatus,
          isSyncing: false,
          syncError: `Failed to sync ${toSync.length} items`
        };
        
        localStorage.setItem(this.STORAGE_KEYS.HARVESTS, JSON.stringify(harvests));
        localStorage.setItem(this.STORAGE_KEYS.SYNC_STATUS, JSON.stringify(finalStatus));
        
        return { success: false, message: `Sync failed for ${toSync.length} items` };
      }

      // Mark as synced
      toSync.forEach(harvest => {
        harvest.syncStatus = 'SYNCED';
        harvest.lastSyncAt = new Date();
        harvest.syncError = undefined;
        
        // If pending, generate a panen number
        if (harvest.status === 'PENDING') {
          harvest.panenNumber = this.generatePanenNumber();
        }
      });

      const finalStatus = {
        ...newStatus,
        isSyncing: false,
        pendingSync: 0,
        lastSyncAt: new Date(),
        syncError: null
      };

      localStorage.setItem(this.STORAGE_KEYS.HARVESTS, JSON.stringify(harvests));
      localStorage.setItem(this.STORAGE_KEYS.SYNC_STATUS, JSON.stringify(finalStatus));

      return { success: true, message: `Successfully synced ${toSync.length} items` };

    } catch (error) {
      console.error('Sync error:', error);
      
      const errorStatus = {
        ...status,
        isSyncing: false,
        syncError: 'Sync failed - will retry automatically'
      };
      
      localStorage.setItem(this.STORAGE_KEYS.SYNC_STATUS, JSON.stringify(errorStatus));
      
      return { success: false, message: 'Sync failed due to network error' };
    }
  }

  // Generate unique ID
  private generateId(): string {
    return 'harvest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Generate panen number
  private generatePanenNumber(): string {
    const now = new Date();
    const year = now.getFullYear().toString().substr(2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `PN${year}${month}${day}${random}`;
  }

  // Get harvest statistics
  getHarvestStats(mandorId: string): any {
    const harvests = this.getHarvestsByMandor(mandorId);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(today.getDate() - today.getDay());
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Today's harvests
    const todayHarvests = harvests.filter(h => {
      const harvestDate = new Date(h.harvestDate);
      return harvestDate >= today && harvestDate < new Date(today.getTime() + 24 * 60 * 60 * 1000);
    });

    // This week's harvests
    const thisWeekHarvests = harvests.filter(h => {
      const harvestDate = new Date(h.harvestDate);
      return harvestDate >= thisWeekStart;
    });

    // This month's harvests
    const thisMonthHarvests = harvests.filter(h => {
      const harvestDate = new Date(h.harvestDate);
      return harvestDate >= thisMonthStart;
    });

    return {
      today: {
        totalHarvest: todayHarvests.reduce((sum, h) => sum + h.totalTBS, 0),
        totalWeight: todayHarvests.reduce((sum, h) => sum + h.totalWeight, 0),
        totalWorkers: todayHarvests.reduce((sum, h) => sum + h.totalEmployees, 0),
        pendingApproval: todayHarvests.filter(h => h.status === 'PENDING').length,
        completedBlocks: new Set(todayHarvests.map(h => h.blockId)).size,
        targetAchievement: Math.min(100, Math.round(todayHarvests.length * 20)), // Simulate target
        avgQuality: todayHarvests.length > 0 
          ? Math.round((todayHarvests.reduce((sum, h) => sum + h.avgQuality, 0) / todayHarvests.length) * 10) / 10
          : 0
      },
      thisWeek: {
        totalHarvest: thisWeekHarvests.reduce((sum, h) => sum + h.totalTBS, 0),
        totalWeight: thisWeekHarvests.reduce((sum, h) => sum + h.totalWeight, 0),
        avgQuality: thisWeekHarvests.length > 0 
          ? Math.round((thisWeekHarvests.reduce((sum, h) => sum + h.avgQuality, 0) / thisWeekHarvests.length) * 10) / 10
          : 0,
        efficiency: Math.round(Math.random() * 20 + 80) // Simulate efficiency
      },
      thisMonth: {
        totalHarvest: thisMonthHarvests.reduce((sum, h) => sum + h.totalTBS, 0),
        totalWeight: thisMonthHarvests.reduce((sum, h) => sum + h.totalWeight, 0),
        avgQuality: thisMonthHarvests.length > 0 
          ? Math.round((thisMonthHarvests.reduce((sum, h) => sum + h.avgQuality, 0) / thisMonthHarvests.length) * 10) / 10
          : 0,
        efficiency: Math.round(Math.random() * 20 + 80) // Simulate efficiency
      }
    };
  }

  // Clear all data (for testing)
  clearAllData(): void {
    localStorage.removeItem(this.STORAGE_KEYS.HARVESTS);
    localStorage.removeItem(this.STORAGE_KEYS.SYNC_STATUS);
    localStorage.removeItem(this.STORAGE_KEYS.PENDING_SYNC);
  }

  // Export data for backup
  exportData(): string {
    const harvests = this.getHarvests();
    return JSON.stringify(harvests, null, 2);
  }

  // Import data from backup
  importData(jsonData: string): boolean {
    try {
      const harvests = JSON.parse(jsonData);
      if (Array.isArray(harvests)) {
        localStorage.setItem(this.STORAGE_KEYS.HARVESTS, jsonData);
        this.updateSyncStatus();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error importing data:', error);
      return false;
    }
  }
}

export const harvestStorage = new HarvestStorageService();