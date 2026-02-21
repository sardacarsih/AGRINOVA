'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users,
  Search,
  CheckCircle2,
  User,
  Phone,
  TrendingUp,
  ArrowLeft,
  UserCheck,
  UserX,
  CircleAlert
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Worker, HarvestWizardFormData } from '../../types/wizard';
import { useQuery } from '@apollo/client/react';
import { GetWorkersDocument } from '@/gql/graphql';
import { GraphQLErrorWrapper } from '@/components/ui/graphql-error-handler';

interface WorkerSelectionStepProps {
  formData: HarvestWizardFormData;
  onUpdateFormData: (data: Partial<HarvestWizardFormData>) => void;
  onNext: () => void;
  onPrevious: () => void;
  onValidationChange: (isValid: boolean) => void;
}

export function WorkerSelectionStep({
  formData,
  onUpdateFormData,
  onNext,
  onPrevious,
  onValidationChange
}: WorkerSelectionStepProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch workers from GraphQL
  const { data, loading, error, refetch } = useQuery(GetWorkersDocument, {
    variables: {
      limit: 50,
      offset: 0,
      search: debouncedSearch
    },
    notifyOnNetworkStatusChange: true,
    fetchPolicy: 'cache-and-network'
  });

  // Validation effect
  useEffect(() => {
    const isValid = formData.selectedWorkers.length > 0;
    onValidationChange(isValid);
  }, [formData.selectedWorkers.length, onValidationChange]);

  // Map GraphQL users to Worker type
  const workers: Worker[] = React.useMemo(() => {
    if (!data?.users?.users) return [];

    return data.users.users.map(user => ({
      id: user.id,
      employeeId: user.username, // Using username as employee ID for now
      name: user.name,
      code: user.username, // Using username as code
      divisionId: 'div1', // Placeholder as division is not in User type yet
      isActive: true,
      efficiency: 85, // Placeholder
      phoneNumber: user.noTelpon || undefined,
    }));
  }, [data]);

  // Handle worker selection toggle
  const handleWorkerToggle = (worker: Worker, isSelected: boolean) => {
    const currentSelected = formData.selectedWorkers;

    if (isSelected) {
      // Add worker if not already selected
      if (!currentSelected.find(w => w.id === worker.id)) {
        onUpdateFormData({ selectedWorkers: [...currentSelected, worker] });
      }
    } else {
      // Remove worker
      onUpdateFormData({ selectedWorkers: currentSelected.filter(w => w.id !== worker.id) });
    }
  };

  // Handle select all filtered workers
  const handleSelectAllFiltered = () => {
    // Merge current selections with new ones to avoid duplicates
    const newSelections = [...formData.selectedWorkers];
    workers.forEach(worker => {
      if (!newSelections.find(w => w.id === worker.id)) {
        newSelections.push(worker);
      }
    });
    onUpdateFormData({ selectedWorkers: newSelections });
  };

  // Clear all selections
  const handleClearAll = () => {
    onUpdateFormData({ selectedWorkers: [] });
  };

  const selectedWorkerIds = new Set(formData.selectedWorkers.map(w => w.id));

  if (error) {
    return (
      <GraphQLErrorWrapper
        error={error}
        onRetry={() => refetch()}
        title="Gagal Memuat Data Karyawan"
        description="Terjadi kesalahan saat memuat data karyawan. Silakan coba lagi."
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-green-600" />
            Pilih Karyawan Panen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Selection Summary */}
          {formData.selectedWorkers.length > 0 && (
            <Alert>
              <UserCheck className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <span>{formData.selectedWorkers.length} karyawan dipilih</span>
                  <Button variant="outline" size="sm" onClick={handleClearAll}>
                    Hapus Semua
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Search */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Cari Karyawan
            </Label>
            <div className="relative">
              <Input
                placeholder="Nama atau kode karyawan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10"
              />
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                ) : (
                  <Search className="h-4 w-4 text-gray-400" />
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAllFiltered}
              className="text-green-700 hover:text-green-800"
              disabled={loading || workers.length === 0}
            >
              <UserCheck className="h-4 w-4 mr-2" />
              Pilih Semua
            </Button>
          </div>

          {/* Workers List */}
          <div className="space-y-3">
            {loading && workers.length === 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : workers.length === 0 ? (
              <Alert>
                <UserX className="h-4 w-4" />
                <AlertDescription>
                  {searchTerm
                    ? 'Tidak ada karyawan yang sesuai dengan pencarian.'
                    : 'Tidak ada data karyawan tersedia.'}
                </AlertDescription>
              </Alert>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <AnimatePresence>
                  {workers.map((worker) => {
                    const isSelected = selectedWorkerIds.has(worker.id);

                    return (
                      <motion.div
                        key={worker.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Card
                          className={cn(
                            "cursor-pointer border-2 transition-all duration-200",
                            isSelected
                              ? "border-green-500 bg-green-50"
                              : "border-gray-200 hover:border-green-300"
                          )}
                          onClick={() => handleWorkerToggle(worker, !isSelected)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3">
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => handleWorkerToggle(worker, !isSelected)}
                                  className="mt-1"
                                />
                                <div className="space-y-1">
                                  <div>
                                    <h4 className="font-semibold text-sm">{worker.name}</h4>
                                    <p className="text-xs text-muted-foreground">{worker.code}</p>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    {worker.efficiency && (
                                      <div className="flex items-center gap-1">
                                        <TrendingUp className="h-3 w-3 text-muted-foreground" />
                                        <span className="text-xs text-muted-foreground">
                                          {worker.efficiency}%
                                        </span>
                                      </div>
                                    )}
                                  </div>

                                  {worker.phoneNumber && (
                                    <div className="flex items-center gap-1">
                                      <Phone className="h-3 w-3 text-muted-foreground" />
                                      <span className="text-xs text-muted-foreground">
                                        {worker.phoneNumber}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {isSelected && (
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Selected Workers Summary */}
      {formData.selectedWorkers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700">
                <CheckCircle2 className="h-5 w-5" />
                Karyawan Terpilih ({formData.selectedWorkers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {formData.selectedWorkers.map((worker) => (
                  <Badge
                    key={worker.id}
                    variant="outline"
                    className="text-green-700 bg-green-50"
                  >
                    {worker.name} ({worker.code})
                  </Badge>
                ))}
              </div>

              <Alert className="mt-4">
                <User className="h-4 w-4" />
                <AlertDescription>
                  Karyawan yang dipilih akan diminta untuk mengisi data panen berdasarkan kategori TBS pada langkah selanjutnya.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={onPrevious}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </Button>

        <Button
          onClick={onNext}
          disabled={formData.selectedWorkers.length === 0}
          className="bg-green-600 hover:bg-green-700"
        >
          Lanjut ke Input Kategori
        </Button>
      </div>
    </motion.div>
  );
}
