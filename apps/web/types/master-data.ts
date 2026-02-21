// Master Data Types

export interface Company {
    id: string;
    name: string;
    code: string;
    alamat?: string;
    telepon?: string;
    email?: string;
    deskripsi?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface Estate {
    id: string;
    name: string;
    code: string;
    companyId: string;
    location?: string;
    luasHa?: number;
    plantingYear?: number;
    jumlahPohon?: number;
    deskripsi?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    company?: Company;
}

export interface Division {
    id: string;
    name: string;
    code: string;
    estateId: string;
    companyId: string;
    managerId?: string;
    luasHa?: number;
    deskripsi?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    estate?: Estate;
    company?: Company;
}

export interface Block {
    id: string;
    blockCode: string;
    name: string;
    divisionId: string;
    estateId: string;
    companyId: string;
    luasHa: number;
    jumlahPohon?: number;
    plantingYear?: number;
    cropType?: string;
    targetPanen?: number;
    deskripsi?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    division?: Division;
    estate?: Estate;
    company?: Company;
}

// Filters
export interface BlockFilters {
    search?: string;
    companyId?: string;
    estateId?: string;
    divisionId?: string;
    isActive?: boolean;
    plantingYearMin?: number;
    plantingYearMax?: number;
    luasMin?: number;
    luasMax?: number;
}

export interface MasterFilters {
    search?: string;
    companyId?: string;
    isActive?: boolean;
}

// Input Types
export interface CreateBlockInput {
    blockCode: string;
    name: string;
    divisionId: string;
    estateId: string;
    companyId: string;
    luasHa: number;
    jumlahPohon?: number;
    plantingYear?: number;
    cropType?: string;
    targetPanen?: number;
    deskripsi?: string;
}

export interface UpdateBlockInput {
    id: string;
    name?: string;
    blockCode?: string;
    luasHa?: number;
    jumlahPohon?: number;
    plantingYear?: number;
    cropType?: string;
    targetPanen?: number;
    deskripsi?: string;
    isActive?: boolean;
}

export interface CreateDivisionInput {
    name: string;
    code: string;
    estateId: string;
    companyId: string;
    managerId?: string;
    luasHa?: number;
    deskripsi?: string;
}

export interface UpdateDivisionInput {
    id: string;
    name?: string;
    code?: string;
    managerId?: string;
    luasHa?: number;
    deskripsi?: string;
    isActive?: boolean;
}

export interface CreateEstateInput {
    name: string;
    code: string;
    companyId: string;
    location?: string;
    luasHa?: number;
    plantingYear?: number;
    jumlahPohon?: number;
    deskripsi?: string;
}

export interface UpdateEstateInput {
    id: string;
    name?: string;
    code?: string;
    location?: string;
    luasHa?: number;
    plantingYear?: number;
    jumlahPohon?: number;
    deskripsi?: string;
    isActive?: boolean;
}
