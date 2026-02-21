/**
 * Format number with Indonesian locale
 */
export function formatNumber(value: number | undefined, decimals: number = 0): string {
    if (value === undefined || value === null) return '-';
    return new Intl.NumberFormat('id-ID', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(value);
}

/**
 * Format number as currency (IDR)
 */
export function formatCurrency(value: number | undefined): string {
    if (value === undefined || value === null) return '-';
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
}

/**
 * Format area in hectares
 */
export function formatArea(hectares: number | undefined): string {
    if (hectares === undefined || hectares === null) return '-';
    return `${formatNumber(hectares, 2)} Ha`;
}

/**
 * Format weight in kilograms
 */
export function formatWeight(kg: number | undefined): string {
    if (kg === undefined || kg === null) return '-';

    if (kg >= 1000) {
        return `${formatNumber(kg / 1000, 2)} ton`;
    }
    return `${formatNumber(kg, 2)} kg`;
}

/**
 * Format date to Indonesian locale
 */
export function formatDate(date: string | Date | undefined, includeTime: boolean = false): string {
    if (!date) return '-';

    const dateObj = typeof date === 'string' ? new Date(date) : date;

    if (includeTime) {
        return new Intl.DateTimeFormat('id-ID', {
            dateStyle: 'medium',
            timeStyle: 'short',
        }).format(dateObj);
    }

    return new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'medium',
    }).format(dateObj);
}

/**
 * Format date to short format (DD/MM/YYYY)
 */
export function formatDateShort(date: string | Date | undefined): string {
    if (!date) return '-';

    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();

    return `${day}/${month}/${year}`;
}

/**
 * Format relative time (e.g., "2 days ago")
 */
export function formatRelativeTime(date: string | Date | undefined): string {
    if (!date) return '-';

    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - dateObj.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return 'baru saja';
    if (diffMin < 60) return `${diffMin} menit yang lalu`;
    if (diffHour < 24) return `${diffHour} jam yang lalu`;
    if (diffDay < 7) return `${diffDay} hari yang lalu`;
    if (diffDay < 30) return `${Math.floor(diffDay / 7)} minggu yang lalu`;
    if (diffDay < 365) return `${Math.floor(diffDay / 30)} bulan yang lalu`;
    return `${Math.floor(diffDay / 365)} tahun yang lalu`;
}

/**
 * Format percentage
 */
export function formatPercentage(value: number | undefined, decimals: number = 1): string {
    if (value === undefined || value === null) return '-';
    return `${formatNumber(value, decimals)}%`;
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string | undefined, maxLength: number = 50): string {
    if (!text) return '-';
    if (text.length <= maxLength) return text;
    return `${text.substring(0, maxLength)}...`;
}
