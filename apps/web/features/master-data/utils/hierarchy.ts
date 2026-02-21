import type { Company, Estate, Division, Block } from '@/types/master-data';

/**
 * Build full hierarchy path string
 */
export function buildHierarchyPath(entities: {
    company?: Company;
    estate?: Estate;
    division?: Division;
    block?: Block;
}): string {
    const parts: string[] = [];

    if (entities.company) parts.push(entities.company.name);
    if (entities.estate) parts.push(entities.estate.name);
    if (entities.division) parts.push(entities.division.name);
    if (entities.block) parts.push(entities.block.name);

    return parts.join(' → ');
}

/**
 * Build hierarchy breadcrumb items
 */
export function buildBreadcrumbs(entities: {
    company?: Company;
    estate?: Estate;
    division?: Division;
    block?: Block;
}) {
    const breadcrumbs: Array<{ label: string; href: string }> = [];

    if (entities.company) {
        breadcrumbs.push({
            label: entities.company.name,
            href: `/companies/${entities.company.id}`,
        });
    }

    if (entities.estate) {
        breadcrumbs.push({
            label: entities.estate.name,
            href: `/estates/${entities.estate.id}`,
        });
    }

    if (entities.division) {
        breadcrumbs.push({
            label: entities.division.name,
            href: `/divisions/${entities.division.id}`,
        });
    }

    if (entities.block) {
        breadcrumbs.push({
            label: entities.block.name,
            href: `/blocks/${entities.block.id}`,
        });
    }

    return breadcrumbs;
}

/**
 * Validate hierarchy consistency
 */
export function validateHierarchy(selection: {
    companyId?: string;
    estateId?: string;
    divisionId?: string;
    blockId?: string;
}): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Estate requires company
    if (selection.estateId && !selection.companyId) {
        errors.push('Estate memerlukan Company');
    }

    // Division requires estate (and company)
    if (selection.divisionId && !selection.estateId) {
        errors.push('Division memerlukan Estate');
    }
    if (selection.divisionId && !selection.companyId) {
        errors.push('Division memerlukan Company');
    }

    // Block requires division (estate, and company)
    if (selection.blockId && !selection.divisionId) {
        errors.push('Block memerlukan Division');
    }
    if (selection.blockId && !selection.estateId) {
        errors.push('Block memerlukan Estate');
    }
    if (selection.blockId && !selection.companyId) {
        errors.push('Block memerlukan Company');
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}

/**
 * Get hierarchy level from entity
 */
export function getHierarchyLevel(entity: Company | Estate | Division | Block): number {
    if ('blockCode' in entity) return 4; // Block
    if ('code' in entity) return 3; // Division
    if ('code' in entity) return 2; // Estate
    return 1; // Company
}

/**
 * Sort entities by hierarchy
 */
export function sortByHierarchy<T extends { companyId?: string; estateId?: string; divisionId?: string }>(
    entities: T[]
): T[] {
    return [...entities].sort((a, b) => {
        // Sort by company -> estate -> division
        if (a.companyId !== b.companyId) {
            return (a.companyId || '').localeCompare(b.companyId || '');
        }
        if (a.estateId !== b.estateId) {
            return (a.estateId || '').localeCompare(b.estateId || '');
        }
        if (a.divisionId !== b.divisionId) {
            return (a.divisionId || '').localeCompare(b.divisionId || '');
        }
        return 0;
    });
}

/**
 * Group entities by parent
 */
export function groupByParent<T extends { companyId?: string; estateId?: string; divisionId?: string }>(
    entities: T[],
    level: 'company' | 'estate' | 'division'
): Map<string, T[]> {
    const groups = new Map<string, T[]>();

    entities.forEach((entity) => {
        const key = level === 'company'
            ? entity.companyId || 'unknown'
            : level === 'estate'
                ? entity.estateId || 'unknown'
                : entity.divisionId || 'unknown';

        if (!groups.has(key)) {
            groups.set(key, []);
        }
        groups.get(key)!.push(entity);
    });

    return groups;
}
