'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Shield, RefreshCw, Ban } from 'lucide-react';
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
import { JWT_TOKENS_QUERY, REVOKE_JWT_TOKEN_MUTATION } from '@/lib/graphql/jwt-tokens';

interface TokenItem {
  id: string;
  user: {
    id: string;
    username: string;
    email?: string;
    role: string;
  };
  deviceId: string;
  tokenType: string;
  expiresAt?: string;
  refreshExpiresAt?: string;
  offlineExpiresAt?: string;
  isRevoked: boolean;
  revokedAt?: string;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
}

function formatDate(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleString('id-ID');
}

function getLatestExpiryMs(token: TokenItem): number | null {
  const candidateValues = [token.expiresAt, token.refreshExpiresAt, token.offlineExpiresAt]
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
    .map((value) => Date.parse(value))
    .filter((value) => Number.isFinite(value));

  if (candidateValues.length === 0) {
    return null;
  }

  return Math.max(...candidateValues);
}

function resolveExpiry(token: TokenItem) {
  const latestExpiry = getLatestExpiryMs(token);
  if (latestExpiry === null) return '';
  return new Date(latestExpiry).toISOString();
}

function isTokenExpired(token: TokenItem) {
  const latestExpiry = getLatestExpiryMs(token);
  if (latestExpiry === null) return true;
  return latestExpiry <= Date.now();
}

function isTokenActive(token: TokenItem) {
  return !token.isRevoked && !isTokenExpired(token);
}

export default function ManagementTokenPage() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data, loading, error, refetch } = useQuery(JWT_TOKENS_QUERY, {
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all',
  });

  const [revokeToken, { loading: revokingToken }] = useMutation(REVOKE_JWT_TOKEN_MUTATION, {
    onCompleted: (res) => {
      const result = res?.revokeJWTToken;
      if (result?.success) {
        toast.success(result.message || 'Token berhasil direvoke');
        refetch();
      } else {
        toast.error(result?.message || 'Gagal revoke token');
      }
    },
    onError: (err) => {
      toast.error(err.message || 'Gagal revoke token');
    },
  });

  const tokens: TokenItem[] = data?.jwtTokens || [];
  const activeCount = useMemo(() => tokens.filter((token) => isTokenActive(token)).length, [tokens]);
  const revokedCount = useMemo(() => tokens.filter((token) => token.isRevoked).length, [tokens]);
  const expiredCount = useMemo(
    () => tokens.filter((token) => !token.isRevoked && isTokenExpired(token)).length,
    [tokens]
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  const handleRevokeToken = async (token: TokenItem) => {
    await revokeToken({
      variables: {
        tokenId: token.id,
      },
    });
  };

  return (
    <ProtectedRoute allowedRoles={['SUPER_ADMIN']} fallbackPath="/dashboard">
      <SuperAdminDashboardLayout
        title="Management Token"
        description="Monitoring dan revokasi token dari tabel jwt_tokens"
        breadcrumbItems={[
          { label: 'Administrasi & Keamanan', href: '/rbac-management' },
          { label: 'Management Token', href: '/management-token' },
        ]}
      >
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Token Security Overview
              </CardTitle>
              <CardDescription>
                Sumber data: <code>jwt_tokens</code>
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-3">
              <Badge variant="outline">Total: {tokens.length}</Badge>
              <Badge className="bg-green-100 text-green-800 border-green-200">Aktif: {activeCount}</Badge>
              <Badge className="bg-amber-100 text-amber-800 border-amber-200">Expired: {expiredCount}</Badge>
              <Badge className="bg-red-100 text-red-800 border-red-200">Revoked: {revokedCount}</Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing || loading}
                className="ml-auto"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${(isRefreshing || loading) ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              {error && (
                <div className="text-sm text-red-600 mb-4">
                  Gagal memuat data token: {error.message}
                </div>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Device</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tokens.map((token) => (
                    <TableRow key={token.id}>
                      <TableCell>
                        <div className="font-medium">{token.user.username}</div>
                        <div className="text-xs text-muted-foreground">{token.user.role}</div>
                      </TableCell>
                      <TableCell>{token.deviceId || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{token.tokenType}</Badge>
                      </TableCell>
                      <TableCell>{formatDate(resolveExpiry(token))}</TableCell>
                      <TableCell>
                        {token.isRevoked ? (
                          <Badge className="bg-red-100 text-red-800 border-red-200">Revoked</Badge>
                        ) : isTokenExpired(token) ? (
                          <Badge className="bg-amber-100 text-amber-800 border-amber-200">Expired</Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-800 border-green-200">Active</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={token.isRevoked || revokingToken}
                          onClick={() => handleRevokeToken(token)}
                        >
                          <Ban className="h-4 w-4 mr-1" />
                          Revoke
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!loading && tokens.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        Tidak ada data token.
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
