import { z } from 'zod';

// Company validation schema
export const companySchema = z.object({
    name: z.string().min(2, 'Nama minimal 2 karakter').max(100, 'Nama maksimal 100 karakter'),
    code: z.string().min(2, 'Kode minimal 2 karakter').max(20, 'Kode maksimal 20 karakter'),
    alamat: z.string().max(500).optional(),
    telepon: z.string().max(20).optional(),
    email: z.string().email('Format email tidak valid').optional().or(z.literal('')),
    deskripsi: z.string().max(500).optional(),
});

// Estate validation schema
export const estateSchema = z.object({
    name: z.string().min(2, 'Nama minimal 2 karakter').max(100, 'Nama maksimal 100 karakter'),
    code: z.string().min(2, 'Kode estate minimal 2 karakter').max(20, 'Kode estate maksimal 20 karakter'),
    companyId: z.string().min(1, 'Company wajib dipilih'),
    lokasi: z.string().max(200).optional(),
    luasHa: z.number().positive('Luas harus lebih dari 0').optional(),
    plantingYear: z.number().int().min(1900).max(new Date().getFullYear()).optional(),
    jumlahPohon: z.number().int().nonnegative('Jumlah pohon tidak boleh negatif').optional(),
    deskripsi: z.string().max(500).optional(),
});

// Division validation schema
export const divisionSchema = z.object({
    name: z.string().min(2, 'Nama minimal 2 karakter').max(100, 'Nama maksimal 100 karakter'),
    code: z.string().min(2, 'Kode divisi minimal 2 karakter').max(20, 'Kode divisi maksimal 20 karakter'),
    companyId: z.string().min(1, 'Company wajib dipilih'),
    estateId: z.string().min(1, 'Estate wajib dipilih'),
    managerId: z.string().optional(),
    luasHa: z.number().positive('Luas harus lebih dari 0').optional(),
    deskripsi: z.string().max(500).optional(),
});

// Block validation schema
export const blockSchema = z.object({
    blockCode: z.string().min(2, 'Kode blok minimal 2 karakter').max(20, 'Kode blok maksimal 20 karakter'),
    name: z.string().min(2, 'Nama minimal 2 karakter').max(100, 'Nama maksimal 100 karakter'),
    companyId: z.string().min(1, 'Company wajib dipilih'),
    estateId: z.string().min(1, 'Estate wajib dipilih'),
    divisionId: z.string().min(1, 'Division wajib dipilih'),
    luasHa: z.number().positive('Luas harus lebih dari 0'),
    jumlahPohon: z.number().int().nonnegative('Jumlah pohon tidak boleh negatif').optional(),
    plantingYear: z.number().int().min(1900).max(new Date().getFullYear()).optional(),
    cropType: z.string().max(50).optional(),
    targetPanen: z.number().nonnegative('Target panen tidak boleh negatif').optional(),
    deskripsi: z.string().max(500).optional(),
});

// Assignment validation schema
export const assignmentSchema = z.object({
    userId: z.string().min(1, 'User wajib dipilih'),
    entityId: z.string().min(1, 'Entity wajib dipilih'),
    role: z.union([
        z.literal('MANDOR'),
        z.literal('ASISTEN'),
        z.literal('MANAGER'),
        z.literal('AREA_MANAGER'),
        z.literal('COMPANY_ADMIN')
    ]),
});

// Export types from schemas
export type CompanyFormData = z.infer<typeof companySchema>;
export type EstateFormData = z.infer<typeof estateSchema>;
export type DivisionFormData = z.infer<typeof divisionSchema>;
export type BlockFormData = z.infer<typeof blockSchema>;
export type AssignmentFormData = z.infer<typeof assignmentSchema>;
