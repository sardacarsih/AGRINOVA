import { EmployeeAPI, EmployeeType } from '@/lib/api/employee-api';
import { Employee as APIEmployee } from '@/lib/api/employee-api';
import { Employee as HarvestEmployee } from '@/types/harvest';

/**
 * Service to bridge Employee API with Harvest/Panen system
 * Converts Employee data format from API to Harvest-compatible format
 */
class EmployeePanenService {
  
  /**
   * Convert API Employee to Harvest Employee format
   */
  private convertToHarvestEmployee(apiEmployee: APIEmployee): HarvestEmployee {
    return {
      id: apiEmployee.id,
      code: apiEmployee.employeeId,
      name: apiEmployee.fullName,
      position: apiEmployee.position || 'Pemanen',
      divisiId: apiEmployee.department || 'default-divisi',
      divisiName: apiEmployee.department || 'Divisi Default',
      isActive: apiEmployee.isActive,
      phoneNumber: apiEmployee.phone,
      joinDate: apiEmployee.hireDate ? new Date(apiEmployee.hireDate) : new Date(),
      efficiency: this.calculateDefaultEfficiency(apiEmployee),
      totalHarvest: 0, // Will be calculated from historical data
      avatar: this.generateAvatar(apiEmployee.fullName),
    };
  }

  /**
   * Calculate default efficiency based on employee type and status
   */
  private calculateDefaultEfficiency(employee: APIEmployee): number {
    if (!employee.isActive) return 0;
    
    // Base efficiency by employee type
    const baseEfficiency = {
      'PERMANENT': 85,
      'CONTRACT': 80,
      'DAILY': 75,
      'SEASONAL': 70,
    };

    const base = baseEfficiency[employee.employeeType] || 75;
    
    // Add random variation (70-95% range)
    const variation = Math.random() * 25 + 70;
    return Math.min(95, Math.max(70, Math.round((base + variation) / 2)));
  }

  /**
   * Generate avatar emoji based on name
   */
  private generateAvatar(name: string): string {
    const avatars = ['👨‍🌾', '👩‍🌾', '👨‍🔧', '👩‍🔧', '👨‍💼', '👩‍💼', '👨‍🏭', '👩‍🏭'];
    const index = name.charCodeAt(0) % avatars.length;
    return avatars[index];
  }

  /**
   * Get all active employees for harvest operations
   */
  async getHarvestEmployees(): Promise<HarvestEmployee[]> {
    try {
      const response = await EmployeeAPI.getEmployees({ 
        isActive: true,
        limit: 100 // Get all active employees
      });
      
      return response.data.map(employee => this.convertToHarvestEmployee(employee));
    } catch (error) {
      console.error('Failed to fetch harvest employees:', error);
      throw new Error('Gagal memuat data karyawan untuk input panen');
    }
  }

  /**
   * Get employees by department/division
   */
  async getEmployeesByDepartment(department: string): Promise<HarvestEmployee[]> {
    try {
      const response = await EmployeeAPI.getEmployees({ 
        department,
        isActive: true,
        limit: 100
      });
      
      return response.data.map(employee => this.convertToHarvestEmployee(employee));
    } catch (error) {
      console.error('Failed to fetch employees by department:', error);
      return [];
    }
  }

  /**
   * Search employees for harvest operations
   */
  async searchHarvestEmployees(query: string): Promise<HarvestEmployee[]> {
    try {
      const response = await EmployeeAPI.getEmployees({ 
        search: query,
        isActive: true,
        limit: 50
      });
      
      return response.data.map(employee => this.convertToHarvestEmployee(employee));
    } catch (error) {
      console.error('Failed to search harvest employees:', error);
      return [];
    }
  }

  /**
   * Get employee by employee ID (for harvest operations)
   */
  async getHarvestEmployeeById(employeeId: string): Promise<HarvestEmployee | null> {
    try {
      const employee = await EmployeeAPI.getEmployeeByEmployeeId(employeeId);
      return this.convertToHarvestEmployee(employee);
    } catch (error) {
      console.error('Failed to get harvest employee:', error);
      return null;
    }
  }

  /**
   * Get employees with harvest performance data
   */
  async getEmployeesWithPerformance(): Promise<HarvestEmployee[]> {
    try {
      const employees = await this.getHarvestEmployees();
      
      // TODO: In real implementation, fetch historical harvest data
      // and calculate actual efficiency and total harvest
      return employees.map(employee => ({
        ...employee,
        efficiency: this.calculateDefaultEfficiency({
          id: employee.id,
          employeeId: employee.code,
          fullName: employee.name,
          position: employee.position,
          department: employee.divisiName,
          isActive: employee.isActive,
          employeeType: EmployeeType.BULANAN,
          companyId: '',
          createdAt: '',
          updatedAt: ''
        }),
        totalHarvest: Math.floor(Math.random() * 3000) + 1000 // Mock data for now
      }));
    } catch (error) {
      console.error('Failed to get employees with performance:', error);
      return [];
    }
  }

  /**
   * Get unique departments/divisions from employees
   */
  async getDepartments(): Promise<string[]> {
    try {
      const employees = await this.getHarvestEmployees();
      const departments = Array.from(new Set(
        employees
          .map(emp => emp.divisiName)
          .filter(dept => dept && dept !== 'Divisi Default')
      ));
      return departments.sort();
    } catch (error) {
      console.error('Failed to get departments:', error);
      return [];
    }
  }

  /**
   * Get employee statistics for harvest dashboard
   */
  async getHarvestEmployeeStats(): Promise<{
    total: number;
    active: number;
    avgEfficiency: number;
    totalHarvest: number;
  }> {
    try {
      const employees = await this.getEmployeesWithPerformance();
      const active = employees.filter(emp => emp.isActive);
      
      const avgEfficiency = active.length > 0 
        ? Math.round(active.reduce((sum, emp) => sum + (emp.efficiency || 0), 0) / active.length)
        : 0;
        
      const totalHarvest = active.reduce((sum, emp) => sum + (emp.totalHarvest || 0), 0);

      return {
        total: employees.length,
        active: active.length,
        avgEfficiency,
        totalHarvest
      };
    } catch (error) {
      console.error('Failed to get harvest employee stats:', error);
      return {
        total: 0,
        active: 0,
        avgEfficiency: 0,
        totalHarvest: 0
      };
    }
  }
}

export const employeePanenService = new EmployeePanenService();