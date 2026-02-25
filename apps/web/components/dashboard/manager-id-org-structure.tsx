'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import {
  AlertTriangle,
  Crown,
  RefreshCw,
  UserCheck,
  Users,
  ZoomIn,
  ZoomOut,
  MoveHorizontal,
  MoveVertical,
} from 'lucide-react';
import { GetUsersQuery, useGetUsersQuery } from '@/gql/graphql';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { CustomNodeElementProps, RawNodeDatum } from 'react-d3-tree';

type OrgRole = 'AREA_MANAGER' | 'MANAGER' | 'ASISTEN';

type QueryUser = NonNullable<NonNullable<GetUsersQuery['users']>['users']>[number];

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

const Tree = dynamic(() => import('react-d3-tree').then((module) => module.default), {
  ssr: false,
});

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

type ChartOrientation = 'vertical' | 'horizontal';

type ChartNode = RawNodeDatum & {
  attributes: {
    id: string;
    role: string;
    username: string;
    company: string;
    isCurrent: 'yes' | 'no';
    directReports: number;
  };
  children?: ChartNode[];
};

export function ManagerIdOrgStructure({ currentUserId, currentRole }: ManagerIdOrgStructureProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [orientation, setOrientation] = React.useState<ChartOrientation>('vertical');
  const [zoom, setZoom] = React.useState<number>(0.8);
  const [dimensions, setDimensions] = React.useState({ width: 980, height: 620 });

  const { data, loading, error, refetch } = useGetUsersQuery({
    variables: {
      isActive: true,
      limit: 1000,
      offset: 0,
    },
    fetchPolicy: 'cache-and-network',
    nextFetchPolicy: 'cache-first',
  });

  React.useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const syncSize = () => {
      const nextWidth = element.clientWidth || 980;
      const nextHeight = Math.max(element.clientHeight || 620, 560);
      setDimensions((prev) =>
        prev.width === nextWidth && prev.height === nextHeight
          ? prev
          : { width: nextWidth, height: nextHeight }
      );
    };

    syncSize();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', syncSize);
      return () => window.removeEventListener('resize', syncSize);
    }

    const observer = new ResizeObserver(syncSize);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

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

  const totalVisible = React.useMemo(() => {
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
  }, [treeData.roots]);

  const chartData = React.useMemo<ChartNode[]>(() => {
    const toChartNode = (node: OrgNode): ChartNode => {
      const companyName = node.user.company?.name || node.user.companies?.[0]?.name || '-';

      return {
        name: node.user.name,
        attributes: {
          id: node.user.id,
          role: String(node.user.role),
          username: node.user.username,
          company: companyName,
          isCurrent: node.user.id === currentUserId ? 'yes' : 'no',
          directReports: node.children.length,
        },
        children: node.children.map(toChartNode),
      };
    };

    return treeData.roots.map(toChartNode);
  }, [currentUserId, treeData.roots]);

  const translate = React.useMemo(() => {
    if (orientation === 'horizontal') {
      return {
        x: Math.max(240, dimensions.width * 0.18),
        y: dimensions.height / 2,
      };
    }

    return {
      x: dimensions.width / 2,
      y: 90,
    };
  }, [dimensions.height, dimensions.width, orientation]);

  const renderCustomNode = React.useCallback(
    ({ nodeDatum, toggleNode }: CustomNodeElementProps) => {
      const attributes = (nodeDatum.attributes || {}) as Record<string, unknown>;
      const rawRole = String(attributes.role || '');
      const normalizedRole = isOrgRole(rawRole) ? rawRole : null;
      const username = String(attributes.username || '-');
      const company = String(attributes.company || '-');
      const isCurrent = String(attributes.isCurrent || 'no') === 'yes';
      const directReports = Number(attributes.directReports || 0);
      const hasChildren = Array.isArray(nodeDatum.children) && nodeDatum.children.length > 0;

      return (
        <g>
          <circle
            r={14}
            fill={isCurrent ? '#2563eb' : '#94a3b8'}
            stroke="#ffffff"
            strokeWidth={2}
            onClick={toggleNode}
            style={{ cursor: hasChildren ? 'pointer' : 'default' }}
          />

          <foreignObject x={-130} y={20} width={260} height={126}>
            <div
              className={cn(
                'rounded-md border bg-background/95 p-3 shadow-sm',
                isCurrent && 'ring-1 ring-primary/50'
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-foreground">{nodeDatum.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">@{username}</p>
                </div>
                {isCurrent && <Badge variant="info">Anda</Badge>}
              </div>

              <div className="mt-2 flex items-center gap-2">
                {normalizedRole && getRoleIcon(normalizedRole)}
                <Badge
                  variant="outline"
                  className={cn(normalizedRole && getRoleBadgeClassName(normalizedRole))}
                >
                  {normalizedRole ? getRoleLabel(normalizedRole) : rawRole || '-'}
                </Badge>
              </div>

              <p className="mt-2 truncate text-[11px] text-muted-foreground">Perusahaan: {company}</p>

              <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Direct Reports: {directReports}</span>
                {hasChildren && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleNode();
                    }}
                    className="rounded border px-2 py-0.5 hover:bg-accent"
                  >
                    Expand/Collapse
                  </button>
                )}
              </div>
            </div>
          </foreignObject>
        </g>
      );
    },
    []
  );

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

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Struktur Organisasi Berdasarkan Manager ID
          </CardTitle>
          <CardDescription>
            Menampilkan relasi pelaporan untuk role Area Manager, Manager, dan Asisten menggunakan chart interaktif.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOrientation((prev) => (prev === 'vertical' ? 'horizontal' : 'vertical'))}
            >
              {orientation === 'vertical' ? (
                <>
                  <MoveHorizontal className="mr-2 h-4 w-4" />
                  Mode Horizontal
                </>
              ) : (
                <>
                  <MoveVertical className="mr-2 h-4 w-4" />
                  Mode Vertikal
                </>
              )}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setZoom((prev) => Math.max(0.3, prev - 0.1))}>
              <ZoomOut className="mr-2 h-4 w-4" />
              Zoom Out
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setZoom((prev) => Math.min(1.5, prev + 0.1))}>
              <ZoomIn className="mr-2 h-4 w-4" />
              Zoom In
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setZoom(0.8)}>
              Reset Zoom
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Total node terlihat: {totalVisible}</Badge>
            <Badge variant="outline">Role Anda: {getRoleLabel(currentRole)}</Badge>
            <Badge variant="outline">Zoom: {(zoom * 100).toFixed(0)}%</Badge>
            <Badge variant="outline">Drag untuk geser chart</Badge>
            <Badge variant="outline">Klik node untuk expand/collapse</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-3 sm:p-4">
          <div
            ref={containerRef}
            className="h-[72vh] min-h-[560px] w-full overflow-hidden rounded-lg border border-border/70 bg-muted/20"
          >
            {chartData.length > 0 && (
              <Tree
                data={chartData.length === 1 ? chartData[0] : chartData}
                translate={translate}
                orientation={orientation}
                zoom={zoom}
                zoomable
                collapsible
                draggable
                pathFunc="elbow"
                nodeSize={orientation === 'vertical' ? { x: 300, y: 180 } : { x: 340, y: 160 }}
                separation={{ siblings: 1.1, nonSiblings: 1.35 }}
                renderCustomNodeElement={renderCustomNode}
                shouldCollapseNeighborNodes={false}
                transitionDuration={280}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
