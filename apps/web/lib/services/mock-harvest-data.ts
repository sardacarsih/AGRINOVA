// Mock data service for harvest-related data (blocks, employees, etc.)
import { Block, Employee } from '@/types/harvest';

class MockHarvestDataService {
  // Mock blocks data
  private blocks: Block[] = [
    {
      id: 'block-1',
      code: 'A-01',
      name: 'Blok Andalas 01',
      divisiId: 'div-1',
      divisiName: 'Divisi Andalas',
      estateId: 'estate-1',
      estateName: 'Estate Sawit Andalas',
      area: 25.5,
      plantingYear: 2015,
      palmCount: 850,
      varietyType: 'Tenera',
      isActive: true,
      location: {
        latitude: -2.5489,
        longitude: 118.0149,
        elevation: 125
      }
    },
    {
      id: 'block-2',
      code: 'A-02',
      name: 'Blok Andalas 02',
      divisiId: 'div-1',
      divisiName: 'Divisi Andalas',
      estateId: 'estate-1',
      estateName: 'Estate Sawit Andalas',
      area: 22.3,
      plantingYear: 2016,
      palmCount: 720,
      varietyType: 'Tenera',
      isActive: true,
      location: {
        latitude: -2.5492,
        longitude: 118.0152,
        elevation: 128
      }
    },
    {
      id: 'block-3',
      code: 'A-03',
      name: 'Blok Andalas 03',
      divisiId: 'div-1',
      divisiName: 'Divisi Andalas',
      estateId: 'estate-1',
      estateName: 'Estate Sawit Andalas',
      area: 28.7,
      plantingYear: 2014,
      palmCount: 950,
      varietyType: 'DxP',
      isActive: true
    },
    {
      id: 'block-4',
      code: 'B-01',
      name: 'Blok Berhala 01',
      divisiId: 'div-2',
      divisiName: 'Divisi Berhala',
      estateId: 'estate-1',
      estateName: 'Estate Sawit Andalas',
      area: 30.2,
      plantingYear: 2013,
      palmCount: 1020,
      varietyType: 'Tenera',
      isActive: true
    },
    {
      id: 'block-5',
      code: 'B-02',
      name: 'Blok Berhala 02',
      divisiId: 'div-2',
      divisiName: 'Divisi Berhala',
      estateId: 'estate-1',
      estateName: 'Estate Sawit Andalas',
      area: 26.8,
      plantingYear: 2015,
      palmCount: 880,
      varietyType: 'DxP',
      isActive: true
    },
    {
      id: 'block-6',
      code: 'C-01',
      name: 'Blok Cemara 01',
      divisiId: 'div-3',
      divisiName: 'Divisi Cemara',
      estateId: 'estate-1',
      estateName: 'Estate Sawit Andalas',
      area: 24.5,
      plantingYear: 2017,
      palmCount: 780,
      varietyType: 'Tenera',
      isActive: true
    }
  ];

  // Mock employees data
  private employees: Employee[] = [
    {
      id: 'emp-1',
      code: 'EMP001',
      name: 'Ahmad Supriyanto',
      position: 'Pemanen',
      divisiId: 'div-1',
      divisiName: 'Divisi Andalas',
      isActive: true,
      phoneNumber: '081234567890',
      joinDate: new Date('2020-01-15'),
      efficiency: 95,
      totalHarvest: 2150,
      avatar: '👨‍🌾'
    },
    {
      id: 'emp-2',
      code: 'EMP002',
      name: 'Budi Santoso',
      position: 'Pemanen',
      divisiId: 'div-1',
      divisiName: 'Divisi Andalas',
      isActive: true,
      phoneNumber: '081234567891',
      joinDate: new Date('2019-03-22'),
      efficiency: 92,
      totalHarvest: 2320,
      avatar: '👨‍🔧'
    },
    {
      id: 'emp-3',
      code: 'EMP003',
      name: 'Candra Wijaya',
      position: 'Pemanen',
      divisiId: 'div-1',
      divisiName: 'Divisi Andalas',
      isActive: true,
      phoneNumber: '081234567892',
      joinDate: new Date('2021-06-10'),
      efficiency: 88,
      totalHarvest: 1890,
      avatar: '👨‍💼'
    },
    {
      id: 'emp-4',
      code: 'EMP004',
      name: 'Dewi Sartika',
      position: 'Pemanen',
      divisiId: 'div-1',
      divisiName: 'Divisi Andalas',
      isActive: true,
      phoneNumber: '081234567893',
      joinDate: new Date('2020-08-05'),
      efficiency: 90,
      totalHarvest: 2080,
      avatar: '👩‍🌾'
    },
    {
      id: 'emp-5',
      code: 'EMP005',
      name: 'Eko Prasetyo',
      position: 'Pemanen',
      divisiId: 'div-2',
      divisiName: 'Divisi Berhala',
      isActive: true,
      phoneNumber: '081234567894',
      joinDate: new Date('2018-11-12'),
      efficiency: 94,
      totalHarvest: 2580,
      avatar: '👨‍🎓'
    },
    {
      id: 'emp-6',
      code: 'EMP006',
      name: 'Fitri Handayani',
      position: 'Pemanen',
      divisiId: 'div-2',
      divisiName: 'Divisi Berhala',
      isActive: true,
      phoneNumber: '081234567895',
      joinDate: new Date('2020-02-18'),
      efficiency: 87,
      totalHarvest: 1950,
      avatar: '👩‍💼'
    },
    {
      id: 'emp-7',
      code: 'EMP007',
      name: 'Gunawan Setiawan',
      position: 'Pemanen',
      divisiId: 'div-2',
      divisiName: 'Divisi Berhala',
      isActive: true,
      phoneNumber: '081234567896',
      joinDate: new Date('2019-07-25'),
      efficiency: 89,
      totalHarvest: 2200,
      avatar: '👨‍🏭'
    },
    {
      id: 'emp-8',
      code: 'EMP008',
      name: 'Hendra Kusuma',
      position: 'Pemanen',
      divisiId: 'div-3',
      divisiName: 'Divisi Cemara',
      isActive: true,
      phoneNumber: '081234567897',
      joinDate: new Date('2021-01-30'),
      efficiency: 91,
      totalHarvest: 1820,
      avatar: '👨‍🌾'
    },
    {
      id: 'emp-9',
      code: 'EMP009',
      name: 'Indira Sari',
      position: 'Pemanen',
      divisiId: 'div-3',
      divisiName: 'Divisi Cemara',
      isActive: true,
      phoneNumber: '081234567898',
      joinDate: new Date('2020-04-14'),
      efficiency: 93,
      totalHarvest: 2120,
      avatar: '👩‍🌾'
    },
    {
      id: 'emp-10',
      code: 'EMP010',
      name: 'Joko Widodo',
      position: 'Pemanen',
      divisiId: 'div-3',
      divisiName: 'Divisi Cemara',
      isActive: true,
      phoneNumber: '081234567899',
      joinDate: new Date('2018-09-08'),
      efficiency: 96,
      totalHarvest: 2780,
      avatar: '👨‍💼'
    }
  ];

  // Get all blocks
  getBlocks(): Block[] {
    return this.blocks;
  }

  // Get blocks by divisi
  getBlocksByDivisi(divisiId: string): Block[] {
    return this.blocks.filter(block => block.divisiId === divisiId);
  }

  // Get block by ID
  getBlockById(id: string): Block | null {
    return this.blocks.find(block => block.id === id) || null;
  }

  // Get all employees
  getEmployees(): Employee[] {
    return this.employees;
  }

  // Get employees by divisi
  getEmployeesByDivisi(divisiId: string): Employee[] {
    return this.employees.filter(employee => employee.divisiId === divisiId);
  }

  // Get employee by ID
  getEmployeeById(id: string): Employee | null {
    return this.employees.find(employee => employee.id === id) || null;
  }

  // Get employees by multiple divisi IDs (for multi-assignment)
  getEmployeesByDivisions(divisiIds: string[]): Employee[] {
    return this.employees.filter(employee => divisiIds.includes(employee.divisiId));
  }

  // Get blocks by multiple divisi IDs (for multi-assignment)  
  getBlocksByDivisions(divisiIds: string[]): Block[] {
    return this.blocks.filter(block => divisiIds.includes(block.divisiId));
  }

  // Search employees by name
  searchEmployees(query: string): Employee[] {
    const lowercaseQuery = query.toLowerCase();
    return this.employees.filter(employee => 
      employee.name.toLowerCase().includes(lowercaseQuery) ||
      employee.code.toLowerCase().includes(lowercaseQuery)
    );
  }

  // Search blocks by name or code
  searchBlocks(query: string): Block[] {
    const lowercaseQuery = query.toLowerCase();
    return this.blocks.filter(block => 
      block.name.toLowerCase().includes(lowercaseQuery) ||
      block.code.toLowerCase().includes(lowercaseQuery)
    );
  }

  // Get active employees only
  getActiveEmployees(): Employee[] {
    return this.employees.filter(employee => employee.isActive);
  }

  // Get active blocks only
  getActiveBlocks(): Block[] {
    return this.blocks.filter(block => block.isActive);
  }

  // Get top performers (for quick selection)
  getTopPerformers(limit: number = 5): Employee[] {
    return this.employees
      .filter(employee => employee.isActive)
      .sort((a, b) => (b.efficiency || 0) - (a.efficiency || 0))
      .slice(0, limit);
  }

  // Get recent workers (simulate recent activity)
  getRecentWorkers(limit: number = 5): Employee[] {
    // Simulate by returning random employees
    const shuffled = [...this.employees].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, limit);
  }

  // Update employee data (for simulation)
  updateEmployee(id: string, updates: Partial<Employee>): Employee | null {
    const index = this.employees.findIndex(emp => emp.id === id);
    if (index >= 0) {
      this.employees[index] = { ...this.employees[index], ...updates };
      return this.employees[index];
    }
    return null;
  }

  // Add new employee (for simulation)
  addEmployee(employee: Omit<Employee, 'id'>): Employee {
    const newEmployee: Employee = {
      ...employee,
      id: 'emp-' + Date.now()
    };
    this.employees.push(newEmployee);
    return newEmployee;
  }

  // Remove employee (for simulation)
  removeEmployee(id: string): boolean {
    const index = this.employees.findIndex(emp => emp.id === id);
    if (index >= 0) {
      this.employees.splice(index, 1);
      return true;
    }
    return false;
  }

  // Get employee statistics
  getEmployeeStats(): {
    total: number;
    active: number;
    avgEfficiency: number;
    totalHarvest: number;
  } {
    const active = this.employees.filter(emp => emp.isActive);
    const avgEfficiency = active.length > 0 
      ? Math.round(active.reduce((sum, emp) => sum + (emp.efficiency || 0), 0) / active.length)
      : 0;
    const totalHarvest = active.reduce((sum, emp) => sum + (emp.totalHarvest || 0), 0);

    return {
      total: this.employees.length,
      active: active.length,
      avgEfficiency,
      totalHarvest
    };
  }

  // Get block statistics
  getBlockStats(): {
    total: number;
    active: number;
    totalArea: number;
    totalPalms: number;
  } {
    const active = this.blocks.filter(block => block.isActive);
    const totalArea = active.reduce((sum, block) => sum + (block.area || 0), 0);
    const totalPalms = active.reduce((sum, block) => sum + (block.palmCount || 0), 0);

    return {
      total: this.blocks.length,
      active: active.length,
      totalArea: Math.round(totalArea * 10) / 10,
      totalPalms
    };
  }
}

export const mockHarvestData = new MockHarvestDataService();
export const mockHarvestDataService = mockHarvestData;