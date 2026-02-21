'use client';

import React from 'react';
import { useAuth } from '@/hooks/use-auth';

export const ALL_COMPANIES_SCOPE = '__ALL__';
const AREA_MANAGER_SCOPE_STORAGE_KEY = 'agrinova_area_manager_company_scope_v1';

export type CompanyScopeOption = {
  id: string;
  name: string;
};

type UserCompanyLike = {
  id?: string;
  name?: string;
};

type UserScopeSource =
  | {
      role?: string;
      companyId?: string;
      company?: UserCompanyLike | string;
      companies?: Array<UserCompanyLike | string>;
      companyAdminFor?: string[];
      assignedCompanies?: string[];
      assignedCompanyNames?: string[];
    }
  | null
  | undefined;

type CompanyScopeContextValue = {
  isAreaManager: boolean;
  isLockedSingleCompanyRole: boolean;
  isMultiCompany: boolean;
  availableCompanies: CompanyScopeOption[];
  selectedCompanyId: string;
  selectedCompanyLabel: string;
  effectiveCompanyId?: string;
  setSelectedCompanyId: (companyId: string) => void;
};

const CompanyScopeContext = React.createContext<CompanyScopeContextValue | undefined>(undefined);

const normalizeText = (value?: string | null): string => String(value || '').trim();

const buildCompanyOptionsFromUser = (user: UserScopeSource): CompanyScopeOption[] => {
  const options = new Map<string, CompanyScopeOption>();

  const addOption = (idRaw?: string | null, nameRaw?: string | null) => {
    const id = normalizeText(idRaw);
    if (!id) return;

    const name = normalizeText(nameRaw) || id;
    if (!options.has(id)) {
      options.set(id, { id, name });
      return;
    }

    const existing = options.get(id)!;
    if ((!existing.name || existing.name === existing.id) && name !== id) {
      options.set(id, { id, name });
    }
  };

  const assignedIds = Array.isArray(user?.assignedCompanies) ? user.assignedCompanies : [];
  const assignedNames = Array.isArray(user?.assignedCompanyNames) ? user.assignedCompanyNames : [];
  assignedIds.forEach((id: string, index: number) => {
    addOption(id, assignedNames[index]);
  });

  addOption(user?.companyId, typeof user?.company === 'string' ? user.company : user?.company?.name);

  const companies = Array.isArray(user?.companies) ? user.companies : [];
  companies.forEach((company: UserCompanyLike | string) => {
    if (typeof company === 'string') {
      addOption(company, company);
      return;
    }
    addOption(company?.id, company?.name);
  });

  const companyAdminFor = Array.isArray(user?.companyAdminFor) ? user.companyAdminFor : [];
  companyAdminFor.forEach((companyId: string) => addOption(companyId, companyId));

  return Array.from(options.values()).sort((a, b) => a.name.localeCompare(b.name, 'id'));
};

const readStoredAreaManagerScope = (): string | null => {
  if (typeof window === 'undefined') return null;
  const value = window.localStorage.getItem(AREA_MANAGER_SCOPE_STORAGE_KEY);
  return normalizeText(value) || null;
};

const writeStoredAreaManagerScope = (value: string) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(AREA_MANAGER_SCOPE_STORAGE_KEY, value);
};

export function CompanyScopeProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();

  const normalizedRole = normalizeText(user?.role).toUpperCase();
  const isAreaManager = normalizedRole === 'AREA_MANAGER';
  const isLockedSingleCompanyRole = normalizedRole === 'MANAGER' || normalizedRole === 'COMPANY_ADMIN';

  const availableCompanies = React.useMemo(() => buildCompanyOptionsFromUser(user), [user]);
  const isMultiCompany = availableCompanies.length > 1;

  const [selectedCompanyId, setSelectedCompanyIdState] = React.useState<string>(ALL_COMPANIES_SCOPE);

  React.useEffect(() => {
    if (!isAuthenticated || !user) {
      setSelectedCompanyIdState(ALL_COMPANIES_SCOPE);
      return;
    }

    const isValidOption = (value: string) =>
      value === ALL_COMPANIES_SCOPE || availableCompanies.some((company) => company.id === value);

    let nextValue = ALL_COMPANIES_SCOPE;

    if (isAreaManager) {
      const storedValue = readStoredAreaManagerScope();
      if (storedValue && isValidOption(storedValue)) {
        nextValue = storedValue;
      } else if (availableCompanies.length === 1) {
        nextValue = availableCompanies[0].id;
      }
      writeStoredAreaManagerScope(nextValue);
    } else if (isLockedSingleCompanyRole && availableCompanies.length > 0) {
      nextValue = availableCompanies[0].id;
    } else if (availableCompanies.length === 1) {
      nextValue = availableCompanies[0].id;
    }

    setSelectedCompanyIdState((prev) => (prev === nextValue ? prev : nextValue));
  }, [isAuthenticated, user, isAreaManager, isLockedSingleCompanyRole, availableCompanies]);

  const setSelectedCompanyId = React.useCallback(
    (companyId: string) => {
      const requestedValue = normalizeText(companyId) || ALL_COMPANIES_SCOPE;
      const isValidOption =
        requestedValue === ALL_COMPANIES_SCOPE ||
        availableCompanies.some((company) => company.id === requestedValue);

      if (isLockedSingleCompanyRole) {
        const lockedCompanyId = availableCompanies[0]?.id || ALL_COMPANIES_SCOPE;
        setSelectedCompanyIdState(lockedCompanyId);
        return;
      }

      const nextValue = isValidOption
        ? requestedValue
        : availableCompanies.length === 1
          ? availableCompanies[0].id
          : ALL_COMPANIES_SCOPE;

      setSelectedCompanyIdState(nextValue);

      if (isAreaManager) {
        writeStoredAreaManagerScope(nextValue);
      }
    },
    [availableCompanies, isAreaManager, isLockedSingleCompanyRole]
  );

  const selectedCompanyLabel = React.useMemo(() => {
    if (selectedCompanyId === ALL_COMPANIES_SCOPE) return 'Semua Perusahaan';
    const company = availableCompanies.find((item) => item.id === selectedCompanyId);
    return company?.name || selectedCompanyId;
  }, [availableCompanies, selectedCompanyId]);

  const value = React.useMemo<CompanyScopeContextValue>(
    () => ({
      isAreaManager,
      isLockedSingleCompanyRole,
      isMultiCompany,
      availableCompanies,
      selectedCompanyId,
      selectedCompanyLabel,
      effectiveCompanyId: selectedCompanyId === ALL_COMPANIES_SCOPE ? undefined : selectedCompanyId,
      setSelectedCompanyId,
    }),
    [
      isAreaManager,
      isLockedSingleCompanyRole,
      isMultiCompany,
      availableCompanies,
      selectedCompanyId,
      selectedCompanyLabel,
      setSelectedCompanyId,
    ]
  );

  return <CompanyScopeContext.Provider value={value}>{children}</CompanyScopeContext.Provider>;
}

export const useCompanyScope = (): CompanyScopeContextValue => {
  const context = React.useContext(CompanyScopeContext);
  if (!context) {
    throw new Error('useCompanyScope must be used within CompanyScopeProvider');
  }
  return context;
};
