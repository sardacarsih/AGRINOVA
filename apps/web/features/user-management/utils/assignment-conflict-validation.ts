'use client';

import { User, UserRole } from '@/gql/graphql';

export const normalizeAssignmentIds = (
  ids?: Array<string | null | undefined> | null
): string[] => {
  const cleaned = (ids || [])
    .filter((id): id is string => typeof id === 'string')
    .map((id) => id.trim())
    .filter((id) => id.length > 0);

  return Array.from(new Set(cleaned));
};

interface AssignmentConflictValidationInput {
  role?: UserRole | string | null;
  isActive?: boolean | null;
  companyIds?: Array<string | null | undefined> | null;
  estateIds?: Array<string | null | undefined> | null;
  existingUsers?: Array<User | null | undefined>;
  excludeUserId?: string | null;
}

function normalizeRole(role?: UserRole | string | null): UserRole | null {
  if (typeof role !== 'string') {
    return null;
  }

  const normalized = role.trim().toUpperCase();
  switch (normalized) {
    case UserRole.AreaManager:
      return UserRole.AreaManager;
    case UserRole.Manager:
      return UserRole.Manager;
    default:
      return null;
  }
}

function getUserCompanyIds(user: User): string[] {
  const companyIDsFromList = (user.companies || []).map((company) => company.id);
  return normalizeAssignmentIds([user.companyId, ...companyIDsFromList]);
}

function getUserEstateIds(user: User): string[] {
  const estateIDs = (user.estates || []).map((estate) => estate.id);
  return normalizeAssignmentIds(estateIDs);
}

function getUserDisplayName(user: User): string {
  const name = user.name?.trim();
  if (name) {
    return name;
  }
  const username = user.username?.trim();
  if (username) {
    return username;
  }
  return 'pengguna lain';
}

export function validateUniqueActiveAssignmentConflict({
  role,
  isActive,
  companyIds,
  estateIds,
  existingUsers = [],
  excludeUserId,
}: AssignmentConflictValidationInput): string | null {
  if (isActive === false) {
    return null;
  }

  const normalizedRole = normalizeRole(role);
  if (!normalizedRole) {
    return null;
  }

  const targetIDs =
    normalizedRole === UserRole.Manager
      ? normalizeAssignmentIds(estateIds)
      : normalizeAssignmentIds(companyIds);

  if (targetIDs.length === 0) {
    return null;
  }

  const targetIDSet = new Set(targetIDs);
  const excludedID = excludeUserId?.trim();

  for (const user of existingUsers) {
    if (!user || !user.isActive) {
      continue;
    }
    if (excludedID && user.id === excludedID) {
      continue;
    }
    if (normalizeRole(user.role) !== normalizedRole) {
      continue;
    }

    const scopedIDs =
      normalizedRole === UserRole.Manager
        ? getUserEstateIds(user)
        : getUserCompanyIds(user);

    for (const scopedID of scopedIDs) {
      if (!targetIDSet.has(scopedID)) {
        continue;
      }

      const displayName = getUserDisplayName(user);
      if (normalizedRole === UserRole.Manager) {
        return `Estate sudah memiliki MANAGER aktif (${displayName}). Pilih estate lain.`;
      }

      return `Company sudah memiliki AREA_MANAGER aktif (${displayName}). Pilih company lain.`;
    }
  }

  return null;
}
