import type { User } from './user';

// Company model for multi-tenant system
export interface Company {
    id: string;
    code: string;
    name: string;
    description?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    createdBy?: string;
    updatedBy?: string;
}

// Company Admin assignment
export interface CompanyAdmin {
    id: string;
    userId: string;
    companyId: string;
    canManageEstate: boolean;
    canManageDivisi: boolean;
    canManageBlocks: boolean;
    canManageUsers: boolean;
    canManageEmployees: boolean;
    createdAt: Date;
    updatedAt: Date;
    createdBy?: string;
    updatedBy?: string;
    user?: User;
    company?: Company;
}

// Area Manager Company Assignment (for multi-company access)
export interface AreaManagerCompanyAssignment {
    id: string;
    userId: string;
    companyId: string;
    canViewReports: boolean;
    canManageUsers: boolean;
    canAccessSystemLogs: boolean;
    canExportData: boolean;
    createdAt: Date;
    updatedAt: Date;
    createdBy?: string;
    updatedBy?: string;
    user?: User;
    company?: Company;
    createdByUser?: User;
    updatedByUser?: User;
}

// Estate model for company structure
export interface Estate {
    id: string;
    companyId: string;
    code: string;
    name: string;
    description?: string;
    location?: string;
    area?: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    company?: Company;
}

// Divisi model for estate structure
export interface Divisi {
    id: string;
    estateId: string;
    code: string;
    name: string;
    description?: string;
    area?: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    estate?: Estate;
}

// Block model for divisi structure
export interface Block {
    id: string;
    divisiId: string;
    code: string;
    name: string;
    description?: string;
    area?: number;
    plantingYear?: number;
    palmCount?: number;
    varietyType?: string;
    isActive: boolean;
    latitude?: number;
    longitude?: number;
    elevation?: number;
    createdAt: Date;
    updatedAt: Date;
    divisi?: Divisi;
}
