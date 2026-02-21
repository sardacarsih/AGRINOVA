import { User, Company, Estate } from '@/types/auth';

/**
 * Hierarchical Validation Service
 * 
 * Validates Manager-to-Area Manager reporting relationships to ensure:
 * 1. Manager's assigned estates are within Area Manager's assigned companies
 * 2. Cross-company coordination is properly managed
 * 3. Reporting structure maintains data integrity
 */

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface AssignmentCompatibilityCheck {
  manager: Partial<User>;
  areaManager: User;
  estates: Estate[];
  companies: Company[];
}

export class HierarchicalValidationService {
  /**
   * Validates if a Manager can report to a specific Area Manager
   */
  static validateManagerToAreaManagerAssignment({
    manager,
    areaManager,
    estates,
    companies
  }: AssignmentCompatibilityCheck): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Basic role validation
    if (manager.role !== 'MANAGER') {
      result.errors.push('User harus memiliki role Manager untuk dapat memiliki atasan Area Manager');
      result.isValid = false;
    }

    if (areaManager.role !== 'AREA_MANAGER') {
      result.errors.push('User yang dipilih harus memiliki role Area Manager');
      result.isValid = false;
    }

    // Area Manager status validation
    if (areaManager.status !== 'active') {
      result.errors.push('Area Manager yang dipilih tidak aktif');
      result.isValid = false;
    }

    // Skip further validation if basic checks failed
    if (!result.isValid) {
      return result;
    }

    // Company compatibility validation
    const managerCompanyIds = this.getManagerCompanyIds(manager, estates);
    const areaManagerCompanyIds = areaManager.assignedCompanies || [areaManager.companyId!];

    const incompatibleCompanies = managerCompanyIds.filter(
      companyId => !areaManagerCompanyIds.includes(companyId)
    );

    if (incompatibleCompanies.length > 0) {
      const incompatibleCompanyNames = incompatibleCompanies.map(id => {
        const company = companies.find(c => c.id === id);
        return company ? company.name : id;
      });

      result.errors.push(
        `Manager memiliki assignment di perusahaan yang tidak dapat diakses oleh Area Manager: ${incompatibleCompanyNames.join(', ')}`
      );
      result.isValid = false;
    }

    // Cross-company reporting warnings
    if (managerCompanyIds.length > 1) {
      result.warnings.push(
        'Manager memiliki assignment di multiple perusahaan - pastikan Area Manager memiliki akses ke semua perusahaan tersebut'
      );
    }

    // Estate coverage validation
    if (manager.assignedEstates && manager.assignedEstates.length > 0) {
      const uncoveredEstates = this.getUncoveredEstates(manager.assignedEstates, areaManager, estates);
      
      if (uncoveredEstates.length > 0) {
        const uncoveredEstateNames = uncoveredEstates.map(estate => estate.name);
        result.warnings.push(
          `Beberapa estate Manager mungkin tidak tercakup dalam area supervisi Area Manager: ${uncoveredEstateNames.join(', ')}`
        );
      }
    }

    return result;
  }

  /**
   * Validates the overall hierarchical structure for consistency
   */
  static validateHierarchicalConsistency(users: User[]): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    const managers = users.filter(u => u.role === 'MANAGER');
    const areaManagers = users.filter(u => u.role === 'AREA_MANAGER');

    // Check for orphaned Managers (no Area Manager assignment)
    const orphanedManagers = managers.filter(m => !m.reportingToAreaManagerId);
    if (orphanedManagers.length > 0) {
      result.warnings.push(
        `${orphanedManagers.length} Manager(s) belum memiliki Area Manager: ${orphanedManagers.map(m => m.name).join(', ')}`
      );
    }

    // Check for invalid reporting relationships
    const invalidReports = managers.filter(m => 
      m.reportingToAreaManagerId && 
      !areaManagers.find(am => am.id === m.reportingToAreaManagerId)
    );

    if (invalidReports.length > 0) {
      result.errors.push(
        `Manager dengan reporting relationship tidak valid: ${invalidReports.map(m => m.name).join(', ')}`
      );
      result.isValid = false;
    }

    // Check for Area Managers without direct reports
    const areaManagersWithoutReports = areaManagers.filter(am =>
      !managers.some(m => m.reportingToAreaManagerId === am.id)
    );

    if (areaManagersWithoutReports.length > 0) {
      result.warnings.push(
        `Area Manager tanpa direct report: ${areaManagersWithoutReports.map(am => am.name).join(', ')}`
      );
    }

    return result;
  }

  /**
   * Gets company IDs that a Manager has access to based on assigned estates
   */
  private static getManagerCompanyIds(manager: Partial<User>, estates: Estate[]): string[] {
    const companyIds = new Set<string>();

    // Add manager's primary company
    if (manager.companyId) {
      companyIds.add(manager.companyId);
    }

    // Add companies from assigned estates
    if (manager.assignedEstates) {
      manager.assignedEstates.forEach(estateId => {
        const estate = estates.find(e => e.id === estateId);
        if (estate) {
          companyIds.add(estate.companyId);
        }
      });
    }

    return Array.from(companyIds);
  }

  /**
   * Gets estates that may not be covered by Area Manager's company access
   */
  private static getUncoveredEstates(
    managerEstateIds: string[], 
    areaManager: User, 
    estates: Estate[]
  ): Estate[] {
    const areaManagerCompanyIds = areaManager.assignedCompanies || [areaManager.companyId!];
    
    return estates.filter(estate =>
      managerEstateIds.includes(estate.id) &&
      !areaManagerCompanyIds.includes(estate.companyId)
    );
  }

  /**
   * Suggests compatible Area Managers for a given Manager
   */
  static suggestCompatibleAreaManagers(
    manager: Partial<User>,
    areaManagers: User[],
    estates: Estate[],
    companies: Company[]
  ): Array<{ areaManager: User; compatibility: ValidationResult }> {
    return areaManagers
      .map(areaManager => ({
        areaManager,
        compatibility: this.validateManagerToAreaManagerAssignment({
          manager,
          areaManager,
          estates,
          companies
        })
      }))
      .sort((a, b) => {
        // Sort by validity first, then by number of warnings
        if (a.compatibility.isValid && !b.compatibility.isValid) return -1;
        if (!a.compatibility.isValid && b.compatibility.isValid) return 1;
        return a.compatibility.warnings.length - b.compatibility.warnings.length;
      });
  }

  /**
   * Validates Area Manager can supervise a Manager across companies
   */
  static validateCrossCompanySupervision(
    areaManager: User,
    managerCompanyId: string,
    companies: Company[]
  ): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    const areaManagerCompanyIds = areaManager.assignedCompanies || [areaManager.companyId!];

    if (!areaManagerCompanyIds.includes(managerCompanyId)) {
      const managerCompany = companies.find(c => c.id === managerCompanyId);
      result.errors.push(
        `Area Manager tidak memiliki akses ke perusahaan: ${managerCompany?.name || managerCompanyId}`
      );
      result.isValid = false;
    }

    // Warning for cross-company supervision
    if (areaManager.companyId !== managerCompanyId) {
      result.warnings.push(
        'Manager berada di perusahaan berbeda dari Area Manager utama - ini adalah supervisi lintas perusahaan'
      );
    }

    return result;
  }
}