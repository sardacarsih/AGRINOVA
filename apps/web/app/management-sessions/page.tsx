'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Shield, RefreshCw, LogOut, Users } from 'lucide-react';
import { toast } from 'sonner';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { SuperAdminDashboardLayout } from '@/components/layouts/role-layouts/SuperAdminDashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { FORCE_LOGOUT_ALL_SESSIONS_MUTATION, FORCE_LOGOUT_SESSION_MUTATION, USER_SESSIONS_QUERY } from '@/lib/graphql/sessions';

interface SessionItem {
  id: string;
  user: {
    id: string;
    username: string;
    email?: string;
    role: string;
  };
  sessionId: string;
  platform: string;
  ipAddress?: string;
  userAgent?: string;
  loginTime: string;
  lastActivity: string;
  expiresAt: string;
  revoked: boolean;
}

function formatDate(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleString('id-ID');
}

function isFutureDate(value?: string) {
  if (!value) return false;
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return false;
  return timestamp > Date.now();
}

export default function ManagementSessionsPage() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data, loading, error, refetch } = useQuery(USER_SESSIONS_QUERY, {
    variables: {
      filter: {
        activeOnly: false,
      },
    },
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all',
  });

  const {
    data: activeData,
    loading: loadingActiveSessions,
    error: activeSessionsError,
    refetch: refetchActiveSessions,
  } = useQuery(USER_SESSIONS_QUERY, {
    variables: {
      filter: {
        activeOnly: true,
      },
    },
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all',
  });

  const [forceLogoutSession, { loading: revokingSession }] = useMutation(FORCE_LOGOUT_SESSION_MUTATION, {
    onCompleted: (res) => {
      const result = res?.forceLogoutSession;
      if (result?.success) {
        toast.success(result.message || 'Session berhasil direvoke');
        Promise.all([refetch(), refetchActiveSessions()]);
      } else {
        toast.error(result?.message || 'Gagal revoke session');
      }
    },
    onError: (err) => {
      toast.error(err.message || 'Gagal revoke session');
    },
  });

  const [forceLogoutAllSessions, { loading: revokingAll }] = useMutation(FORCE_LOGOUT_ALL_SESSIONS_MUTATION, {
    onCompleted: (res) => {
      const result = res?.forceLogoutAllSessions;
      if (result?.success) {
        toast.success(result.message || 'Semua session user berhasil direvoke');
        Promise.all([refetch(), refetchActiveSessions()]);
      } else {
        toast.error(result?.message || 'Gagal revoke semua session user');
      }
    },
    onError: (err) => {
      toast.error(err.message || 'Gagal revoke semua session user');
    },
  });

  const sessions: SessionItem[] = data?.userSessions || [];
  const activeSessions: SessionItem[] = activeData?.userSessions || [];
  const activeSessionIds = useMemo(() => new Set(activeSessions.map((s) => s.id)), [activeSessions]);
  const activeCount = activeSessions.length;
  const revokedCount = useMemo(() => sessions.filter((s) => s.revoked).length, [sessions]);
  const inactiveCount = Math.max(sessions.length - activeCount - revokedCount, 0);

  const getSessionStatus = (session: SessionItem): 'active' | 'revoked' | 'inactive' => {
    if (session.revoked) {
      return 'revoked';
    }

    if (activeSessionsError) {
      return isFutureDate(session.expiresAt) ? 'active' : 'inactive';
    }

    if (activeSessionIds.has(session.id)) {
      return 'active';
    }

    return 'inactive';
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refetch(), refetchActiveSessions()]);
    setIsRefreshing(false);
  };

  const handleRevokeSession = async (session: SessionItem) => {
    await forceLogoutSession({
      variables: {
        sessionId: session.id,
        reason: 'Revoke dari Management Sessions',
      },
    });
  };

  const handleRevokeAllUserSessions = async (session: SessionItem) => {
    await forceLogoutAllSessions({
      variables: {
        userId: session.user.id,
        reason: `Revoke semua session untuk user ${session.user.username}`,
      },
    });
  };

  return (
    <ProtectedRoute allowedRoles={['SUPER_ADMIN']} fallbackPath="/dashboard">
      <SuperAdminDashboardLayout
        title="Management Sessions"
        description="Monitoring dan revokasi sesi dari tabel user_sessions"
        breadcrumbItems={[
          { label: 'Administrasi & Keamanan', href: '/rbac-management' },
          { label: 'Management Sessions', href: '/management-sessions' },
        ]}
      >
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Session Security Overview
              </CardTitle>
              <CardDescription>
                Sumber data: <code>user_sessions</code>
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-3">
              <Badge variant="outline">Total: {sessions.length}</Badge>
              <Badge className="bg-green-100 text-green-800 border-green-200">Aktif: {activeCount}</Badge>
              <Badge className="bg-gray-100 text-gray-800 border-gray-200">Inactive: {inactiveCount}</Badge>
              <Badge className="bg-red-100 text-red-800 border-red-200">Revoked: {revokedCount}</Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing || loading || loadingActiveSessions}
                className="ml-auto"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${(isRefreshing || loading || loadingActiveSessions) ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              {error && (
                <div className="text-sm text-red-600 mb-4">
                  Gagal memuat data sesi: {error.message}
                </div>
              )}
              {activeSessionsError && (
                <div className="text-sm text-amber-600 mb-4">
                  Gagal memuat status sesi aktif: {activeSessionsError.message}
                </div>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>Last Activity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((session) => {
                    const status = getSessionStatus(session);
                    return (
                      <TableRow key={session.id}>
                        <TableCell>
                          <div className="font-medium">{session.user.username}</div>
                          <div className="text-xs text-muted-foreground">{session.user.role}</div>
                        </TableCell>
                        <TableCell>{session.platform}</TableCell>
                        <TableCell>{session.ipAddress || '-'}</TableCell>
                        <TableCell>{formatDate(session.lastActivity)}</TableCell>
                        <TableCell>
                          {status === 'revoked' && (
                            <Badge className="bg-red-100 text-red-800 border-red-200">Revoked</Badge>
                          )}
                          {status === 'active' && (
                            <Badge className="bg-green-100 text-green-800 border-green-200">Active</Badge>
                          )}
                          {status === 'inactive' && (
                            <Badge className="bg-gray-100 text-gray-800 border-gray-200">Inactive</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={status !== 'active' || revokingSession}
                            onClick={() => handleRevokeSession(session)}
                          >
                            <LogOut className="h-4 w-4 mr-1" />
                            Revoke
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={revokingAll}
                            onClick={() => handleRevokeAllUserSessions(session)}
                          >
                            <Users className="h-4 w-4 mr-1" />
                            Revoke User
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {!loading && sessions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        Tidak ada data sesi.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </SuperAdminDashboardLayout>
    </ProtectedRoute>
  );
}
