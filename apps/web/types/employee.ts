// Employee Types - Local definitions for frontend (no Prisma dependency)

export enum EmployeeType {
  BULANAN = 'BULANAN',    // Karyawan Bulanan (Monthly Employee)
  KHT = 'KHT',           // Karyawan Harian Tetap (Permanent Daily Employee)  
  BORONGAN = 'BORONGAN', // Karyawan Borongan (Piece Rate Employee)
  KHL = 'KHL'            // Karyawan Harian Lepas (Casual Daily Employee)
}

export interface Employee {
  id: string;
  companyId: string;
  divisionId?: string;
  employeeId: string;
  fullName: string;
  position?: string;
  department?: string;
  phone?: string;
  address?: string;
  birthDate?: string;
  hireDate?: string;
  isActive: boolean;
  employeeType: EmployeeType;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEmployeeRequest {
  companyId?: string;
  divisionId?: string;
  employeeId: string;
  fullName: string;
  position?: string;
  department?: string;
  phone?: string;
  address?: string;
  birthDate?: string;
  hireDate?: string;
  isActive?: boolean;
  employeeType?: EmployeeType;
}

export interface UpdateEmployeeRequest extends Partial<CreateEmployeeRequest> {}

export interface EmployeeFilters {
  companyId?: string;
  divisionId?: string;
  page?: number;
  limit?: number;
  search?: string;
  employeeType?: EmployeeType;
  department?: string;
  position?: string;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface EmployeesResponse {
  data: Employee[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface EmployeeStatistics {
  total: number;
  active: number;
  inactive: number;
  recentHires: number;
  byType: Record<string, number>;
  byDepartment: Record<string, number>;
}

export interface BulkUpdateRequest {
  ids: string[];
  updates: Partial<UpdateEmployeeRequest>;
}

export interface BulkUpdateResponse {
  updated: number;
}

export const EMPLOYEE_TYPE_LABELS: Record<EmployeeType, string> = {
  BULANAN: 'Karyawan Bulanan',
  KHT: 'Karyawan Harian Tetap',
  BORONGAN: 'Karyawan Borongan',
  KHL: 'Karyawan Harian Lepas',
};
