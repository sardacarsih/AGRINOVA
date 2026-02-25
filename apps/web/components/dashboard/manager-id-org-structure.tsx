'use client';

import * as React from 'react';
import { AlertTriangle, Crown, RefreshCw, UserCheck, Users } from 'lucide-react';
import { GetUsersQuery, useGetUsersQuery } from '@/gql/graphql';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type OrgRole = 'AREA_MANAGER' | 'MANAGER' | 'ASISTEN';

type QueryUser = NonNullable<
  NonNullable<GetUsersQuery['users']>
>['users'][number];

interface OrgNode {
  user: QueryUser;
  children: OrgNode[];
}

interface ManagerIdOrgStructureProps {
  currentUserId: string;
  currentRole: OrgRole;
}

const ALLOWED_ROLE_SET = new Set<OrgRole>(['AREA_MANAGER', 'MANAGER', 'ASISTEN']);
const ROLE_ORDER: Record<OrgRole, number> = {
  AREA_MANAGER: 0,
  MANAGER: 1,
  ASISTEN: 2,
};

const isOrgRole = (role: string): role is OrgRole => ALLOWED_ROLE_SET.has(role as OrgRole);

const getRoleLabel = (role: OrgRole): string => {
  switch (role) {
    case 'AREA_MANAGER':
      return 'Area Manager';
    case 'MANAGER':
      return 'Manager';
    case 'ASISTEN':
      return 'Asisten';
  }
};

const getRoleBadgeClassName = (role: OrgRole): string => {
  switch (role) {
    case 'AREA_MANAGER':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'MANAGER':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'ASISTEN':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  }
};

const getRoleIcon = (role: OrgRole) => {
  switch (role) {
    case 'AREA_MANAGER':
      return <Crown className="h-4 w-4 text-amber-600" />;
    case 'MANAGER':
      return <Users className="h-4 w-4 text-blue-600" />;
    case 'ASISTEN':
      return <UserCheck className="h-4 w-4 text-emerald-600" />;
  }
};

function renderOrgNode(node: OrgNode, currentUserId: string, depth = 0): React.ReactNode {
  const role = node.user.role as string;
  const normalizedRole = isOrgRole(role) ? role : null;
  const isCurrentUser = node.user.id === currentUserId;
  const companyName =
    node.user.company?.name ||
    node.user.companies?.[0]?.name ||
    '-';

  return (
    <div key={node.user.id} className={cn(depth > 0 && 'ml-6 border-l border-border/60 pl-4')}>
      <Card className={cn('border-border/70', isCurrentUser && 'ring-1 ring-primary/40')}>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {normalizedRole && getRoleIcon(normalizedRole)}
                <p className="text-sm font-semibold text-foreground">{node.user.name}</p>
                {isCurrentUser && <Badge variant="info">Anda</Badge>}
              </div>
              <p className="text-xs text-muted-foreground">
                Username: {node.user.username}
              </p>
              <p className="text-xs text-muted-foreground">
                Perusahaan: {companyName}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {normalizedRole ? (
                <Badge variant="outline" className={getRoleBadgeClassName(normalizedRole)}>
                  {getRoleLabel(normalizedRole)}
                </Badge>
              ) : (
                <Badge variant="outline">{role}</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {node.children.length > 0 && (
        <div className="mt-3 space-y-3">
          {node.children.map((childNode) => renderOrgNode(childNode, currentUserId, depth + 1))}
        </div>
      )}
    </div>
  );
}

export function ManagerIdOrgStructure({ currentUserId, currentRole }: ManagerIdOrgStructureProps) {
  const { data, loading, error, refetch } = useGetUsersQuery({
    variables: {
      isActive: true,
      limit: 1000,
      offset: 0,
    },
    fetchPolicy: 'cache-and-network',
    nextFetchPolicy: 'cache-first',
  });

  const users = React.useMemo(() => {
    const rawUsers = data?.users?.users ?? [];
    return rawUsers.filter((user): user is QueryUser => isOrgRole(user.role as string));
  }, [data?.users?.users]);

  const userById = React.useMemo(() => {
    return new Map(users.map((user) => [user.id, user]));
  }, [users]);

  const childrenByManagerId = React.useMemo(() => {
    const map = new Map<string, QueryUser[]>();

    users.forEach((user) => {
      if (!user.managerId) return;

      const parent = userById.get(user.managerId);
      if (!parent) return;

      const parentRole = parent.role as string;
      const childRole = user.role as string;
      if (!isOrgRole(parentRole) || !isOrgRole(childRole)) return;
      if (ROLE_ORDER[childRole] <= ROLE_ORDER[parentRole]) return;

      const currentChildren = map.get(user.managerId) ?? [];
      currentChildren.push(user);
      map.set(user.managerId, currentChildren);
    });

    map.forEach((children, managerId) => {
      const sortedChildren = [...children].sort((a, b) => {
        const roleA = a.role as OrgRole;
        const roleB = b.role as OrgRole;
        const byRole = ROLE_ORDER[roleA] - ROLE_ORDER[roleB];
        if (byRole !== 0) return byRole;
        return a.name.localeCompare(b.name, 'id-ID');
      });
      map.set(managerId, sortedChildren);
    });

    return map;
  }, [userById, users]);

  const treeData = React.useMemo(() => {
    const current = userById.get(currentUserId);
    if (!current) {
      return {
        roots: [] as OrgNode[],
        current: null as QueryUser | null,
      };
    }

    const visibleIds = new Set<string>([current.id]);

    // Collect ancestors from manager_id chain.
    const walkedAncestors = new Set<string>([current.id]);
    let cursor: QueryUser | undefined = current;
    const ancestorIds: string[] = [];
    while (cursor?.managerId) {
      const parent = userById.get(cursor.managerId);
      if (!parent || walkedAncestors.has(parent.id)) break;

      walkedAncestors.add(parent.id);
      ancestorIds.push(parent.id);
      visibleIds.add(parent.id);
      cursor = parent;
    }

    // For AREA_MANAGER and MANAGER, include descendants.
    if (currentRole === 'AREA_MANAGER' || currentRole === 'MANAGER') {
      const queue: string[] = [current.id];
      const walkedDescendants = new Set<string>([current.id]);

      while (queue.length > 0) {
        const nodeId = queue.shift();
        if (!nodeId) continue;

        const children = childrenByManagerId.get(nodeId) ?? [];
        children.forEach((child) => {
          if (walkedDescendants.has(child.id)) return;
          walkedDescendants.add(child.id);
          visibleIds.add(child.id);
          queue.push(child.id);
        });
      }
    }

    const topAncestorId = ancestorIds.length > 0 ? ancestorIds[ancestorIds.length - 1] : current.id;
    const rootIds = currentRole === 'AREA_MANAGER' ? [current.id] : [topAncestorId];

    const buildNode = (userId: string, path = new Set<string>()): OrgNode | null => {
      const user = userById.get(userId);
      if (!user || !visibleIds.has(userId)) return null;
      if (path.has(userId)) return { user, children: [] };

      const nextPath = new Set(path);
      nextPath.add(userId);

      const children = (childrenByManagerId.get(userId) ?? [])
        .filter((child) => visibleIds.has(child.id))
        .map((child) => buildNode(child.id, nextPath))
        .filter((node): node is OrgNode => node !== null);

      return { user, children };
    };

    const roots = rootIds
      .map((rootId) => buildNode(rootId))
      .filter((node): node is OrgNode => node !== null);

    return { roots, current };
  }, [childrenByManagerId, currentRole, currentUserId, userById]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Struktur Organisasi</CardTitle>
          <CardDescription>Memuat data relasi manager...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-20 animate-pulse rounded-md bg-muted/60" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Gagal Memuat Struktur Organisasi
          </CardTitle>
          <CardDescription>
            Data organisasi tidak bisa dimuat. Coba muat ulang.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Muat Ulang
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!treeData.current || treeData.roots.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Struktur Organisasi</CardTitle>
          <CardDescription>
            Data struktur belum tersedia untuk akun ini.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const totalVisible = (() => {
    const visited = new Set<string>();
    const walk = (nodes: OrgNode[]) => {
      nodes.forEach((node) => {
        if (visited.has(node.user.id)) return;
        visited.add(node.user.id);
        walk(node.children);
      });
    };
    walk(treeData.roots);
    return visited.size;
  })();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Struktur Organisasi Berdasarkan Manager ID
          </CardTitle>
          <CardDescription>
            Menampilkan relasi pelaporan untuk role Area Manager, Manager, dan Asisten.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">Total node terlihat: {totalVisible}</Badge>
          <Badge variant="outline">Role Anda: {getRoleLabel(currentRole)}</Badge>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {treeData.roots.map((rootNode) => renderOrgNode(rootNode, currentUserId))}
      </div>
    </div>
  );
}
