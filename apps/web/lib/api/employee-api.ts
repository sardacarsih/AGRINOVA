import { apolloClient } from '@/lib/apollo/client';
import {
  GET_EMPLOYEES,
  GET_EMPLOYEES_PAGINATED,
  GET_EMPLOYEE,
  CREATE_EMPLOYEE,
  UPDATE_EMPLOYEE,
} from '@/lib/apollo/queries/employee';
import {
  EmployeeType,
} from '@/types/employee';
import type {
  Employee,
  CreateEmployeeRequest,
  UpdateEmployeeRequest,
  EmployeeFilters,
  EmployeesResponse,
  EmployeeStatistics,
  BulkUpdateRequest,
  BulkUpdateResponse,
} from '@/types/employee';

export class EmployeeAPI {
  private static readonly ROLE_META_SEPARATOR = '::';
  private static readonly KNOWN_EMPLOYEE_TYPES = new Set<string>([
    EmployeeType.BULANAN,
    EmployeeType.KHT,
    EmployeeType.BORONGAN,
    EmployeeType.KHL,
  ]);

  private static splitRoleMetadata(rawRole?: string): { type?: EmployeeType; position?: string } {
    const role = (rawRole || '').trim();
    if (!role) {
      return {};
    }

    const [rawType, ...rawPositionParts] = role.split(this.ROLE_META_SEPARATOR);
    const normalizedType = (rawType || '').trim().toUpperCase();
    if (!this.KNOWN_EMPLOYEE_TYPES.has(normalizedType)) {
      return {};
    }

    const joinedPosition = rawPositionParts.join(this.ROLE_META_SEPARATOR).trim();
    return {
      type: normalizedType as EmployeeType,
      position: joinedPosition || undefined,
    };
  }

  private static mapSortField(sortBy?: string): string {
    switch (sortBy) {
      case 'fullName':
      case 'name':
        return 'name';
      case 'employeeId':
      case 'nik':
        return 'nik';
      case 'position':
      case 'role':
        return 'role';
      case 'createdAt':
        return 'created_at';
      case 'updatedAt':
        return 'updated_at';
      default:
        return 'name';
    }
  }

  private static mapRoleToEmployeeType(role?: string): EmployeeType {
    const metadata = this.splitRoleMetadata(role);
    if (metadata.type) {
      return metadata.type;
    }

    const normalizedRole = (role || '').toUpperCase();

    if (normalizedRole.includes('KHL')) {
      return EmployeeType.KHL;
    }
    if (normalizedRole.includes('BORONG')) {
      return EmployeeType.BORONGAN;
    }
    if (normalizedRole.includes('KHT')) {
      return EmployeeType.KHT;
    }

    return EmployeeType.BULANAN;
  }

  private static extractPositionFromRole(role?: string): string | undefined {
    const normalizedRole = (role || '').trim();
    if (!normalizedRole) {
      return undefined;
    }

    const metadata = this.splitRoleMetadata(normalizedRole);
    if (metadata.type) {
      return metadata.position;
    }

    if (this.KNOWN_EMPLOYEE_TYPES.has(normalizedRole.toUpperCase())) {
      return undefined;
    }

    return normalizedRole;
  }

  private static buildRoleValue(employeeType?: EmployeeType, position?: string): string | undefined {
    const normalizedType = employeeType ? String(employeeType).trim().toUpperCase() : '';
    const normalizedPosition = position?.trim();

    if (normalizedType && this.KNOWN_EMPLOYEE_TYPES.has(normalizedType)) {
      if (normalizedPosition) {
        return `${normalizedType}${this.ROLE_META_SEPARATOR}${normalizedPosition}`;
      }
      return normalizedType;
    }

    if (normalizedPosition) {
      return normalizedPosition;
    }

    return undefined;
  }

  private static mapEmployeeToRole(data: CreateEmployeeRequest | UpdateEmployeeRequest): string | undefined {
    return this.buildRoleValue(data.employeeType, data.position);
  }

  private static mapGraphQLEmployee(employee: any): Employee {
    const rawRole = employee.role;
    return {
      id: employee.id,
      companyId: employee.companyId,
      divisionId: employee.divisionId || undefined,
      employeeId: employee.nik,
      fullName: employee.name,
      position: this.extractPositionFromRole(rawRole),
      department: undefined,
      phone: undefined,
      address: undefined,
      birthDate: undefined,
      hireDate: undefined,
      isActive: employee.isActive,
      employeeType: this.mapRoleToEmployeeType(rawRole),
      createdAt: employee.createdAt,
      updatedAt: employee.updatedAt,
    };
  }

  private static filterEmployees(employees: Employee[], filters?: EmployeeFilters): Employee[] {
    let filtered = [...employees];

    if (filters?.companyId) {
      filtered = filtered.filter((employee) => employee.companyId === filters.companyId);
    }

    if (filters?.divisionId) {
      filtered = filtered.filter((employee) => employee.divisionId === filters.divisionId);
    }

    if (filters?.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter((employee) =>
        employee.fullName.toLowerCase().includes(search) ||
        employee.employeeId.toLowerCase().includes(search) ||
        (employee.position || '').toLowerCase().includes(search) ||
        (employee.department || '').toLowerCase().includes(search)
      );
    }

    if (filters?.employeeType) {
      filtered = filtered.filter((employee) => employee.employeeType === filters.employeeType);
    }

    if (filters?.department) {
      filtered = filtered.filter((employee) => employee.department === filters.department);
    }

    if (filters?.position) {
      filtered = filtered.filter((employee) => employee.position === filters.position);
    }

    if (filters?.isActive !== undefined) {
      filtered = filtered.filter((employee) => employee.isActive === filters.isActive);
    }

    const sortBy = filters?.sortBy || 'fullName';
    const sortOrder = filters?.sortOrder || 'asc';

    filtered.sort((a: Employee, b: Employee) => {
      const aValue = String((a as any)[sortBy] || '').toLowerCase();
      const bValue = String((b as any)[sortBy] || '').toLowerCase();
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }

  static async getEmployees(filters?: EmployeeFilters): Promise<EmployeesResponse> {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;

    try {
      const { data } = await apolloClient.query({
        query: GET_EMPLOYEES_PAGINATED,
        variables: {
          companyId: filters?.companyId,
          search: filters?.search || undefined,
          employeeType: filters?.employeeType || undefined,
          isActive: filters?.isActive,
          divisionId: filters?.divisionId || undefined,
          sortBy: this.mapSortField(filters?.sortBy),
          sortOrder: filters?.sortOrder || 'asc',
          page,
          limit,
        },
        fetchPolicy: 'network-only',
      });

      const pagedEmployees: Employee[] = (data?.employeesPaginated?.data || []).map((employee: any) =>
        this.mapGraphQLEmployee(employee)
      );

      const pagination = data?.employeesPaginated?.pagination;
      const total = Number(pagination?.total || 0);
      const totalPages = Number(pagination?.pages || Math.max(1, Math.ceil(total / limit)));

      return {
        data: pagedEmployees,
        pagination: {
          page: Number(pagination?.page || page),
          limit: Number(pagination?.limit || limit),
          total,
          totalPages,
        },
      };
    } catch {
      const { data } = await apolloClient.query({
        query: GET_EMPLOYEES,
        fetchPolicy: 'network-only',
      });

      const mappedEmployees: Employee[] = (data?.employees || []).map((employee: any) =>
        this.mapGraphQLEmployee(employee)
      );
      const filtered = this.filterEmployees(mappedEmployees, filters);
      const start = (page - 1) * limit;
      const pagedData = filtered.slice(start, start + limit);

      return {
        data: pagedData,
        pagination: {
          page,
          limit,
          total: filtered.length,
          totalPages: Math.max(1, Math.ceil(filtered.length / limit)),
        },
      };
    }
  }

  static async getEmployeeById(id: string): Promise<Employee> {
    const { data } = await apolloClient.query({
      query: GET_EMPLOYEE,
      variables: { id },
      fetchPolicy: 'network-only',
    });

    if (!data?.employee) {
      throw new Error('Employee not found');
    }

    return this.mapGraphQLEmployee(data.employee);
  }

  static async getEmployeeByEmployeeId(employeeId: string): Promise<Employee> {
    const employeesResponse = await this.getEmployees({ search: employeeId, limit: 200 });
    const employee = employeesResponse.data.find(
      (item) => item.employeeId.toLowerCase() === employeeId.toLowerCase()
    );

    if (!employee) {
      throw new Error('Employee not found');
    }

    return employee;
  }

  static async createEmployee(data: CreateEmployeeRequest): Promise<Employee> {
    const companyId = data.companyId;
    if (!companyId) {
      throw new Error('companyId is required to create employee');
    }

    const input = {
      nik: data.employeeId,
      name: data.fullName,
      role: this.mapEmployeeToRole(data),
      companyId,
      divisionId: data.divisionId || null,
      photoUrl: null,
    };

    const result = await apolloClient.mutate({
      mutation: CREATE_EMPLOYEE,
      variables: { input },
    });

    if (!result.data?.createEmployee) {
      throw new Error('Failed to create employee');
    }

    return this.mapGraphQLEmployee(result.data.createEmployee);
  }

  static async updateEmployee(id: string, data: UpdateEmployeeRequest): Promise<Employee> {
    const input: Record<string, any> = { id };

    if (data.fullName !== undefined) {
      input.name = data.fullName;
    }
    if (data.position !== undefined || data.employeeType !== undefined) {
      input.role = this.mapEmployeeToRole(data);
    }
    if (data.companyId !== undefined) {
      input.companyId = data.companyId;
    }
    if (data.divisionId !== undefined) {
      input.divisionId = data.divisionId || null;
    }
    if (data.isActive !== undefined) {
      input.isActive = data.isActive;
    }

    const result = await apolloClient.mutate({
      mutation: UPDATE_EMPLOYEE,
      variables: { input },
    });

    if (!result.data?.updateEmployee) {
      throw new Error('Failed to update employee');
    }

    return this.mapGraphQLEmployee(result.data.updateEmployee);
  }

  static async deleteEmployee(id: string): Promise<void> {
    // Backend currently does not expose hard-delete mutation.
    // We implement delete as soft-delete (set inactive).
    await this.updateEmployee(id, { isActive: false });
  }

  static async getEmployeeStatistics(): Promise<EmployeeStatistics> {
    const { data } = await apolloClient.query({
      query: GET_EMPLOYEES,
      fetchPolicy: 'network-only',
    });

    const employees: Employee[] = (data?.employees || []).map((employee: any) =>
      this.mapGraphQLEmployee(employee)
    );

    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const active = employees.filter((employee) => employee.isActive);
    const inactive = employees.filter((employee) => !employee.isActive);

    const recentHires = employees.filter((employee) => {
      const dateString = employee.hireDate || employee.createdAt;
      const date = new Date(dateString);
      return !Number.isNaN(date.getTime()) && date >= thirtyDaysAgo;
    });

    const byType: Record<string, number> = {};
    const byDepartment: Record<string, number> = {};

    for (const employee of employees) {
      byType[employee.employeeType] = (byType[employee.employeeType] || 0) + 1;

      const departmentKey = employee.department || 'Unknown';
      byDepartment[departmentKey] = (byDepartment[departmentKey] || 0) + 1;
    }

    return {
      total: employees.length,
      active: active.length,
      inactive: inactive.length,
      recentHires: recentHires.length,
      byType,
      byDepartment,
    };
  }

  static async bulkUpdateEmployees(data: BulkUpdateRequest): Promise<BulkUpdateResponse> {
    await Promise.all(
      data.ids.map((id) => this.updateEmployee(id, data.updates))
    );

    return { updated: data.ids.length };
  }
}

// Re-export types and constants from the types module
export type {
  Employee,
  CreateEmployeeRequest,
  UpdateEmployeeRequest,
  EmployeeFilters,
  EmployeesResponse,
  EmployeeStatistics,
  BulkUpdateRequest,
  BulkUpdateResponse,
} from '@/types/employee';

export { EmployeeType, EMPLOYEE_TYPE_LABELS } from '@/types/employee';
