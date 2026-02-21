export declare enum JenisTbs {
    MENTAH = "MENTAH",
    MATANG = "MATANG",
    LEWAT_MATANG = "LEWAT_MATANG"
}
export declare enum Shift {
    PAGI = "PAGI",
    SIANG = "SIANG",
    MALAM = "MALAM"
}
export declare class PanenDetailDto {
    employeeId: string;
    employeeName: string;
    jenisTbs: JenisTbs;
    jumlahTbs: number;
    weight: number;
    brondolan?: number;
}
export declare class CreatePanenDto {
    blockId: string;
    harvestDate: string;
    shift?: Shift;
    notes?: string;
    employees: PanenDetailDto[];
}
export declare class PanenUploadDto {
    panenId: string;
    blockId: string;
    harvestDate: string;
    mandorId: string;
    shift?: Shift;
    notes?: string;
    employees: PanenDetailDto[];
    clientTimestamp?: string;
    deviceId?: string;
}
export declare class PanenResponseDto {
    id: string;
    panenNumber: string;
    blockId: string;
    harvestDate: string;
    mandorId: string;
    status: string;
    totalEmployees: number;
    totalTBS: number;
    totalWeight: number;
    totalBrondolan: number;
    createdAt: string;
    updatedAt: string;
    syncStatus: string;
}
