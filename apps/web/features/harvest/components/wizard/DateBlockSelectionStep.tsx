'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Calendar,
  MapPin,
  Leaf,
  TrendingUp,
  Info,
  CheckCircle2,
  CircleAlert
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { GraphQLErrorWrapper } from '@/components/ui/graphql-error-handler';
import type { BlockWithBJR, HarvestWizardFormData } from '../../types/wizard';
import {
  getHarvestContextFromCache,
  saveHarvestContextToCache,
  type CachedHarvestContext
} from '@/lib/utils/block-cache-fallback';
import {} from '@/gql/graphql';

interface DateBlockSelectionStepProps {
  formData: HarvestWizardFormData;
  onUpdateFormData: (data: Partial<HarvestWizardFormData>) => void;
  onNext: () => void;
  onValidationChange: (isValid: boolean) => void;
}

export function DateBlockSelectionStep({
  formData,
  onUpdateFormData,
  onNext,
  onValidationChange
}: DateBlockSelectionStepProps) {
  const { user } = useAuth();
  const [selectedBlockId, setSelectedBlockId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedDivisionId, setSelectedDivisionId] = useState<string>('');
  const [usingCachedData, setUsingCachedData] = useState<boolean>(false);

  // Phase 1: Load harvest context for smart defaults
  // const {
  //   data: harvestContextData,
  //   loading: contextLoading,
  //   error: contextError,
  //   refetch: refetchContext
  // } = useQuery(GetHarvestContextDocument, {
  //   errorPolicy: 'all',
  //   notifyOnNetworkStatusChange: true,
  //   skip: !user,
  //   fetchPolicy: 'cache-and-network',
  // });
  const harvestContextData: any = null;
  const contextLoading = false;
  const contextError = null;
  const refetchContext = (..._args: unknown[]) => undefined;

  useEffect(() => {
    if (harvestContextData) {
      console.log('✅ Harvest context loaded:', harvestContextData);
      setUsingCachedData(false);
      // Save to cache for offline fallback
      if (harvestContextData.harvestContext) {
        // Adapt to CachedHarvestContext if needed
      }
    }
  }, [harvestContextData]);

  useEffect(() => {
    if (contextError) {
      console.error('❌ Harvest context error:', contextError);
      // Try to load from cache as fallback
      const cachedContext = getHarvestContextFromCache();
      if (cachedContext) {
        console.log('🔄 Using cached harvest context as fallback');
        setUsingCachedData(true);
      }
    }
  }, [contextError]);

  // Phase 2: Load blocks by division (paginated)
  // const {
  //   data: divisionBlocksData,
  //   loading: blocksLoading,
  //   error: blocksError,
  //   refetch: refetchBlocks,
  //   fetchMore
  // } = useQuery(GetBlocksByDivisionDocument, {
  //   errorPolicy: 'all',
  //   notifyOnNetworkStatusChange: true,
  //   skip: !selectedDivisionId,
  //   variables: {
  //     divisionId: selectedDivisionId,
  //   },
  //   fetchPolicy: 'cache-and-network',
  // });
  const divisionBlocksData: any = null;
  const blocksLoading = false;
  const blocksError = null;
  const refetchBlocks = (..._args: unknown[]) => undefined;
  const fetchMore = (..._args: unknown[]) => undefined;

  useEffect(() => {
    if (divisionBlocksData) {
      console.log('✅ Blocks loaded for division:', selectedDivisionId, divisionBlocksData);
    }
  }, [divisionBlocksData, selectedDivisionId]);

  useEffect(() => {
    if (blocksError) {
      console.error('❌ Blocks loading error:', blocksError);
    }
  }, [blocksError]);

  // Combine loading states
  const isLoading = contextLoading || (selectedDivisionId && blocksLoading);

  // Check if the error is authentication-related
  const isAuthenticationError = React.useMemo(() => {
    const error = contextError || blocksError;
    if (!error) return false;
    const graphQLErrors = (error as any).graphQLErrors || [];
    const networkErrors = (error as any).networkError;

    return graphQLErrors.some((err: any) =>
      err.message?.includes('authentication required') ||
      err.message?.includes('unauthorized') ||
      err.message?.includes('not authenticated') ||
      err.extensions?.code === 'UNAUTHENTICATED' ||
      err.extensions?.code === 'FORBIDDEN'
    ) || networkErrors?.message?.includes('401');
  }, [contextError, blocksError]);

  // Combine all available blocks from context and paginated results
  const availableBlocks: BlockWithBJR[] = React.useMemo(() => {
    const blocks: BlockWithBJR[] = [];

    // Add recent blocks from context (with usage stats)
    if (harvestContextData?.harvestContext?.recentBlocks) {
      harvestContextData.harvestContext.recentBlocks.forEach(block => {
        blocks.push({
          id: block.id,
          blockCode: block.blockCode,
          name: block.name,
          bjrValue: 0.85, // Default BJR value as it's not in recentBlocks query yet? Added to query? No, not in recentBlocks.
          division: {
            id: block.division.id,
            name: block.division.name,
            estate: {
              id: block.division.estateId,
              name: `Estate ${block.division.estateId}` // Will be updated if estate data available
            }
          },
          lastHarvestDate: block.lastHarvestDate ? String(block.lastHarvestDate) : undefined,
          harvestCount: block.harvestCount
        });
      });
    }

    // Add default division blocks (for Mandor with single assignment)
    if (harvestContextData?.harvestContext?.defaultDivisionBlocks) {
      harvestContextData.harvestContext.defaultDivisionBlocks.forEach(block => {
        // Avoid duplicates
        if (!blocks.find(b => b.id === block.id)) {
          blocks.push({
            id: block.id,
            blockCode: block.blockCode,
            name: block.name,
            luasHa: block.luasHa || 0,
            cropType: block.cropType || '',
            plantingYear: block.plantingYear || 0,
            bjrValue: block.bjrValue || 0,
            division: {
              id: block.divisionId,
              name: block.division?.name || 'Unknown Division',
              estate: {
                id: block.division?.estateId,
                name: block.division?.estate?.name || 'Unknown Estate'
              }
            }
          });
        }
      });
    }

    // Add paginated blocks from division selection
    if (divisionBlocksData?.blocksByDivision?.blocks) {
      divisionBlocksData.blocksByDivision.blocks.forEach(fragmentBlock => {
        // Cast to access underlying data (fragment masking hides direct properties)
        const block = fragmentBlock as any;
        // Avoid duplicates
        if (!blocks.find(b => b.id === block.id)) {
          blocks.push({
            id: block.id,
            blockCode: block.blockCode,
            name: block.name,
            luasHa: block.luasHa || 0,
            cropType: block.cropType || '',
            plantingYear: block.plantingYear || 0,
            bjrValue: block.bjrValue || 0,
            division: {
              id: block.divisionId,
              name: block.division?.name || 'Unknown Division',
              estate: {
                id: block.division?.estate?.id || '',
                name: block.division?.estate?.name || 'Unknown Estate'
              }
            }
          });
        }
      });
    }

    return blocks;
  }, [harvestContextData, divisionBlocksData]);

  // Load more blocks for infinite scroll
  const loadMoreBlocks = React.useCallback(() => {
    if (divisionBlocksData?.blocksByDivision?.hasMore && fetchMore) {
      fetchMore({
        variables: {
          offset: divisionBlocksData.blocksByDivision.blocks.length
        },
        updateQuery: (prev, { fetchMoreResult }) => {
          if (!fetchMoreResult) return prev;
          return {
            blocksByDivision: {
              ...fetchMoreResult.blocksByDivision,
              blocks: [
                ...prev.blocksByDivision.blocks,
                ...fetchMoreResult.blocksByDivision.blocks
              ]
            }
          };
        }
      });
    }
  }, [divisionBlocksData, fetchMore]);

  // Search with debouncing - refetch blocks when division changes
  // Note: search filtering is done client-side since the query doesn't support search parameter
  const debouncedSearch = React.useMemo(() => {
    const timer = setTimeout(() => {
      if (selectedDivisionId) {
        refetchBlocks({
          divisionId: selectedDivisionId
        });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [selectedDivisionId, refetchBlocks]);

  // Clean up debounce timer
  React.useEffect(() => {
    return debouncedSearch;
  }, [debouncedSearch]);

  // Validation effect
  useEffect(() => {
    const isValid = !!(formData.harvestDate && formData.selectedBlock);
    onValidationChange(isValid);
  }, [formData.harvestDate, formData.selectedBlock, onValidationChange]);

  // Handle date change
  const handleDateChange = (date: string) => {
    onUpdateFormData({ harvestDate: date });
  };

  // Handle block selection
  const handleBlockSelection = (blockId: string) => {
    const block = availableBlocks.find(b => b.id === blockId);
    setSelectedBlockId(blockId);
    onUpdateFormData({
      selectedBlock: block || null
    });
  };

  // Handle next step
  const handleNext = () => {
    if (formData.harvestDate && formData.selectedBlock) {
      onNext();
    }
  };

  // Check authentication and show appropriate state
  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-red-600" />
            Authentication Required
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <CircleAlert className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">Please login to access harvest data</p>
                <p className="text-sm">
                  You need to be authenticated to view and manage harvest assignments.
                </p>
                <Button
                  onClick={() => window.location.href = '/login'}
                  className="mt-2"
                  variant="outline"
                >
                  Go to Login
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Handle case where query is skipped or user exists but no data is available yet
  if (!contextLoading && !harvestContextData && !contextError && !blocksError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            Pilih Tanggal & Blok Panen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-3">
                <p className="font-medium">Initializing harvest data access...</p>
                <p className="text-sm">
                  Please wait while we verify your access permissions.
                </p>
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-sm">Checking permissions...</span>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Show loading state with progressive loading indication
  if (isLoading && user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-green-600" />
            Pilih Tanggal & Blok Panen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <AlertDescription>
                {contextLoading ? 'Memuat konteks panen...' : 'Memuat data blok...'}
              </AlertDescription>
            </div>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label>Tanggal Panen</Label>
              <Input
                type="date"
                value={formData.harvestDate}
                onChange={(e) => handleDateChange(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Blok Panen</Label>
              <Skeleton className="h-20 w-full mt-1" />
            </div>
          </div>

          {/* Show progressive loading stages */}
          {harvestContextData && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="text-green-800 font-medium">
                  Konteks panen dimuat ({harvestContextData.harvestContext.assignmentSummary.totalBlocks} blok tersedia)
                </span>
              </div>

              {harvestContextData.harvestContext.recentBlocks.length > 0 && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-700">
                    {harvestContextData.harvestContext.recentBlocks.length} blok terkini dimuat
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Handle authentication errors specifically
  if (isAuthenticationError) {
    console.log('🔐 Authentication required for assignments access');
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-orange-600" />
            Authentication Required
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <CircleAlert className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-3">
                <p className="font-medium">Login Required for Harvest Data Access</p>
                <p className="text-sm">
                  You need to be logged in to access harvest assignments and block data.
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    onClick={() => window.location.href = '/login'}
                    className="flex items-center gap-2"
                  >
                    Login to Continue
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => window.location.reload()}
                  >
                    Refresh Page
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>

          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-sm font-medium text-yellow-800">Debug Information:</p>
            <ul className="text-sm text-yellow-700 mt-1 space-y-1">
              <li>• User Status: {user ? `Logged in as ${user.username}` : 'Not authenticated'}</li>
              <li>• Error: Authentication required for myAssignments query</li>
              <li>• Solution: Please login with valid credentials</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Handle other GraphQL errors with cache fallback
  if ((contextError || blocksError) && !isAuthenticationError) {
    const error = contextError || blocksError;
    console.error('Block loading error:', error);

    // Try cache fallback for context error
    if (contextError && !harvestContextData) {
      const cachedContext = getHarvestContextFromCache();
      if (cachedContext) {
        console.log('🔄 Using cached harvest context fallback');
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-orange-600" />
                Data dari Cache (Offline)
                <Badge variant="outline" className="bg-orange-100 text-orange-700">
                  Cached
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Terjadi kesalahan memuat data dari server. Menampilkan data dari cache yang tersimpan.
                </AlertDescription>
              </Alert>

              {/* Render cached blocks */}
              <div className="space-y-4 mt-4">
                <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <Info className="h-5 w-5 text-blue-600" />
                  <span className="text-blue-800 font-medium">
                    {cachedContext.assignmentSummary.totalBlocks} blok tersedia dari cache
                  </span>
                </div>

                {/* Render cached blocks similar to normal flow */}
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {cachedContext.defaultDivisionBlocks.map((block) => (
                    <motion.div
                      key={block.id}
                      whileHover={{ scale: 1.02, y: -1 }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                    >
                      <Card
                        className={`cursor-pointer border transition-all duration-200 relative ${selectedBlockId === block.id
                          ? 'border-blue-500 bg-blue-50 shadow-md'
                          : 'border-gray-200 hover:border-blue-300 hover:shadow-sm'
                          }`}
                        onClick={() => handleBlockSelection(block.id)}
                      >
                        {selectedBlockId === block.id && (
                          <div className="absolute top-1 right-1">
                            <CheckCircle2 className="h-4 w-4 text-blue-600" />
                          </div>
                        )}

                        <CardContent className="p-3">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-sm text-gray-900">{block.blockCode}</h4>
                                <Badge variant="outline" className="bg-orange-100 text-orange-700 text-xs">
                                  Cached
                                </Badge>
                              </div>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 truncate">
                                {block.division.estate?.name} • {block.division.name}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>

                <Button onClick={() => window.location.reload()} className="w-full">
                  Coba Lagi
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      }
    }

    return (
      <GraphQLErrorWrapper
        error={error}
        onRetry={() => {
          if (contextError) refetchContext();
          if (blocksError && selectedDivisionId) refetchBlocks();
        }}
        title="Gagal Memuat Data Blok"
        description="Tidak dapat memuat data blok yang dapat Anda akses. Silakan periksa koneksi internet Anda dan coba lagi."
      />
    );
  }

  // Check if no blocks are available
  if (!isLoading && availableBlocks.length === 0 && harvestContextData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-green-600" />
            Pilih Tanggal & Blok Panen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <CircleAlert className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">Tidak ada blok yang dapat diakses</p>
                <p className="text-sm">
                  {harvestContextData.harvestContext.assignmentSummary.totalBlocks === 0
                    ? 'Anda tidak memiliki assignment ke divisi atau blok manapun. Hubungi supervisor untuk mendapatkan akses ke blok panen.'
                    : 'Tidak ada blok aktif yang tersedia untuk divisi Anda saat ini.'}
                </p>
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-sm font-medium text-yellow-800">Informasi Assignment:</p>
                  <ul className="text-sm text-yellow-700 mt-1 space-y-1">
                    <li>• Username: {user?.username}</li>
                    <li>• Role: {user?.role}</li>
                    <li>• Total Estates: {harvestContextData.harvestContext.assignmentSummary.totalEstates}</li>
                    <li>• Total Divisions: {harvestContextData.harvestContext.assignmentSummary.totalDivisions}</li>
                    <li>• Total Blocks: {harvestContextData.harvestContext.assignmentSummary.totalBlocks}</li>
                  </ul>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-green-600" />
            Pilih Tanggal & Blok Panen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Date Selection */}
          <div>
            <Label htmlFor="harvest-date">Tanggal Panen</Label>
            <Input
              id="harvest-date"
              type="date"
              value={formData.harvestDate}
              onChange={(e) => handleDateChange(e.target.value)}
              max={new Date().toISOString().split('T')[0]} // Can't select future dates
              className="mt-1"
            />
            <p className="text-sm text-gray-600 mt-1">
              Pilih tanggal panen (tidak boleh lebih dari hari ini)
            </p>
          </div>

          {/* Block Selection */}
          {formData.harvestDate && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4"
            >
              <div>
                <Label className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-blue-600" />
                  Pilih Blok Panen
                  <Badge className="bg-blue-600 text-white">Step 2</Badge>
                </Label>
                <p className="text-sm text-blue-700 mt-2">
                  Pilih blok yang akan dipanen pada tanggal {formData.harvestDate}.
                </p>
              </div>

              {/* Search Input */}
              <div className="relative">
                <Input
                  placeholder="Cari blok berdasarkan kode atau name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  {blocksLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  ) : (
                    <Info className="h-4 w-4 text-gray-400" />
                  )}
                </div>
                {searchTerm && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <Badge variant="outline" className="text-xs">
                      Searching...
                    </Badge>
                  </div>
                )}
              </div>

              {availableBlocks.length === 0 ? (
                <Alert variant="destructive">
                  <CircleAlert className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-medium">
                        {searchTerm ? 'Tidak ada blok yang cocok dengan pencarian' : 'Tidak ada blok yang tersedia'}
                      </p>
                      <p className="text-sm">
                        {searchTerm ? 'Coba kata kunci pencarian yang berbeda.' : 'Hubungi supervisor untuk mendapatkan akses ke blok panen.'}
                      </p>
                    </div>
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <Info className="h-5 w-5 text-blue-600" />
                    <span className="text-blue-800 font-medium">
                      {availableBlocks.length} blok tersedia
                    </span>
                    <Badge variant="outline" className="bg-blue-100 text-blue-700">
                      Semua Aktif
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {availableBlocks.map((block) => (
                      <motion.div
                        key={block.id}
                        whileHover={{ scale: 1.02, y: -1 }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ duration: 0.15 }}
                      >
                        <Card
                          className={`cursor-pointer border transition-all duration-200 relative ${selectedBlockId === block.id
                            ? 'border-blue-500 bg-blue-50 shadow-md'
                            : 'border-gray-200 hover:border-blue-300 hover:shadow-sm'
                            }`}
                          onClick={() => handleBlockSelection(block.id)}
                        >
                          {selectedBlockId === block.id && (
                            <div className="absolute top-1 right-1">
                              <CheckCircle2 className="h-4 w-4 text-blue-600" />
                            </div>
                          )}

                          <CardContent className="p-3">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-semibold text-sm text-gray-900">{block.blockCode}</h4>
                                  <span className="text-xs text-gray-500">({block.plantingYear || 'N/A'})</span>
                                </div>
                                <Badge
                                  variant="outline"
                                  className={`text-xs px-1 py-0 ${selectedBlockId === block.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-green-100 text-green-700'}`}
                                >
                                  Aktif
                                </Badge>
                              </div>

                              <div>
                                <p className="text-xs text-gray-500 truncate">
                                  Estate {block.division.estate?.name || 'Unknown'} • {block.division.name}
                                </p>
                              </div>

                              <div className="flex items-center justify-between text-xs text-gray-600">
                                <div className="flex items-center gap-1">
                                  <Leaf className="h-3 w-3" />
                                  <span>{block.luasHa || 0} ha</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <TrendingUp className="h-3 w-3" />
                                  <span>BJR: {block.bjrValue || 0.85}</span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </CardContent>
      </Card>
      {/* Summary */}
      {formData.selectedBlock && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-4">
              <h3 className="font-semibold text-green-800 mb-3">Ringkasan Seleksi</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Tanggal Panen</p>
                  <Badge variant="outline" className="text-green-700 bg-green-50">
                    {new Date(formData.harvestDate).toLocaleDateString('id-ID')}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Blok</p>
                  <Badge variant="outline" className="text-green-700 bg-green-50">
                    {formData.selectedBlock.blockCode} - {formData.selectedBlock.name}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Estate</p>
                  <p className="font-semibold">{formData.selectedBlock.division.estate?.name || 'Unknown Estate'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">BJR</p>
                  <p className="font-semibold">{formData.selectedBlock.bjrValue || 0.85}</p>
                </div>
              </div>

              <div className="mt-4 p-3 bg-green-100 border border-green-200 rounded text-sm">
                <div className="space-y-1 text-green-700">
                  <p>BJR (Bunch Yield Ratio) akan digunakan untuk menghitung estimasi berat TBS matang dan lewat matang secara otomatis.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Next Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleNext}
          disabled={!formData.harvestDate || !formData.selectedBlock}
          className="bg-green-600 hover:bg-green-700"
        >
          Lanjut ke Pilih Karyawan
        </Button>
      </div>
    </div>
  );
}
