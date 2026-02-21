// Integration scope definitions for API key creation
export const INTEGRATION_SCOPES = {
    HRIS: {
        name: 'HRIS Integration',
        description: 'Untuk sinkronisasi data karyawan dari sistem HRIS',
        requiredScopes: [
            { value: 'employees:read', label: 'Read Employees', description: 'Membaca data karyawan' },
            { value: 'employees:create', label: 'Create Employees', description: 'Membuat karyawan baru' },
            { value: 'employees:update', label: 'Update Employees', description: 'Update data karyawan' },
            { value: 'employees:sync', label: 'Sync Employees', description: 'Trigger sinkronisasi penuh' },
        ],
        optionalScopes: [
            { value: 'sync:status', label: 'Check Sync Status', description: 'Cek status sinkronisasi' },
            { value: 'sync:logs', label: 'Access Sync Logs', description: 'Akses log sinkronisasi' },
            { value: 'sync:retry', label: 'Retry Failed Sync', description: 'Retry operasi yang gagal' },
        ],
        recommendedExpiry: 365,
    },
    FINANCE: {
        name: 'Finance Integration',
        description: 'Untuk sinkronisasi data transaksi dan jurnal dari sistem Finance',
        requiredScopes: [
            { value: 'finance:read', label: 'Read Finance Data', description: 'Membaca data transaksi keuangan' },
            { value: 'finance:create', label: 'Create Finance Records', description: 'Membuat record transaksi baru' },
            { value: 'finance:update', label: 'Update Finance Data', description: 'Memperbarui data transaksi keuangan' },
            { value: 'finance:sync', label: 'Sync Finance Data', description: 'Trigger sinkronisasi data finance' },
        ],
        optionalScopes: [
            { value: 'sync:status', label: 'Check Sync Status', description: 'Cek status sinkronisasi' },
            { value: 'sync:logs', label: 'Access Sync Logs', description: 'Akses log sinkronisasi' },
            { value: 'sync:retry', label: 'Retry Failed Sync', description: 'Retry operasi yang gagal' },
        ],
        recommendedExpiry: 365,
    },
    SMART_MILL_SCALE: {
        name: 'Smart Mill Scale',
        description: 'Untuk sinkronisasi data timbangan dari PKS (Pabrik Kelapa Sawit)',
        requiredScopes: [
            { value: 'weighing:read', label: 'Read Weighing Data', description: 'Membaca data timbangan' },
            { value: 'weighing:create', label: 'Create Weighing Records', description: 'Membuat record timbangan' },
            { value: 'weighing:update', label: 'Update Weighing Data', description: 'Update data timbangan' },
            { value: 'weighing:sync', label: 'Sync Weighing Data', description: 'Trigger sinkronisasi' },
        ],
        optionalScopes: [
            { value: 'sync:status', label: 'Check Sync Status', description: 'Cek status sinkronisasi' },
            { value: 'sync:logs', label: 'Access Sync Logs', description: 'Akses log sinkronisasi' },
            { value: 'sync:retry', label: 'Retry Failed Sync', description: 'Retry operasi yang gagal' },
        ],
        recommendedExpiry: 730, // 2 years for weighing systems
    },
} as const;

export type IntegrationType = keyof typeof INTEGRATION_SCOPES;

export function getScopeDescription(scope: string): string {
    for (const integration of Object.values(INTEGRATION_SCOPES)) {
        const allScopes = [...integration.requiredScopes, ...integration.optionalScopes];
        const scopeInfo = allScopes.find(s => s.value === scope);
        if (scopeInfo) {
            return scopeInfo.description;
        }
    }
    return scope;
}
