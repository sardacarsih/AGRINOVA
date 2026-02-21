'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Plus,
  X,
  Users,
  Star,
  Clock,
  TrendingUp,
  Filter,
  CheckCircle2,
  Circle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Employee } from '@/types/harvest';

interface WorkerManagementProps {
  employees: Employee[];
  selectedEmployees: string[];
  onEmployeeToggle: (employeeId: string) => void;
  onEmployeesChange?: (employees: string[]) => void;
  maxEmployees?: number;
  showStats?: boolean;
  className?: string;
}

export function WorkerManagement({
  employees,
  selectedEmployees,
  onEmployeeToggle,
  onEmployeesChange,
  maxEmployees = 50,
  showStats = true,
  className
}: WorkerManagementProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'top_performers' | 'recent'>('all');
  const [showQuickActions, setShowQuickActions] = useState(true);

  // Filter and search employees
  const filteredEmployees = useMemo(() => {
    let filtered = employees.filter(emp => emp.isActive);

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(emp => 
        emp.name.toLowerCase().includes(query) ||
        emp.code.toLowerCase().includes(query) ||
        emp.divisiName.toLowerCase().includes(query)
      );
    }

    // Apply type filter
    if (filterType === 'top_performers') {
      filtered = filtered.sort((a, b) => (b.efficiency || 0) - (a.efficiency || 0)).slice(0, 10);
    } else if (filterType === 'recent') {
      // Simulate recent workers - in real app this would come from recent activity
      filtered = filtered.sort(() => 0.5 - Math.random()).slice(0, 10);
    }

    return filtered;
  }, [employees, searchQuery, filterType]);

  // Calculate stats
  const stats = useMemo(() => {
    const selected = employees.filter(emp => selectedEmployees.includes(emp.id));
    const avgEfficiency = selected.length > 0 
      ? Math.round(selected.reduce((sum, emp) => sum + (emp.efficiency || 0), 0) / selected.length)
      : 0;
    const totalHarvest = selected.reduce((sum, emp) => sum + (emp.totalHarvest || 0), 0);

    return {
      count: selected.length,
      avgEfficiency,
      totalHarvest
    };
  }, [employees, selectedEmployees]);

  // Quick actions
  const handleSelectAll = () => {
    const allIds = filteredEmployees.map(emp => emp.id);
    const limitedIds = allIds.slice(0, maxEmployees);
    if (onEmployeesChange) {
      onEmployeesChange(limitedIds);
    } else {
      limitedIds.forEach(id => {
        if (!selectedEmployees.includes(id)) {
          onEmployeeToggle(id);
        }
      });
    }
  };

  const handleClearAll = () => {
    if (onEmployeesChange) {
      onEmployeesChange([]);
    } else {
      selectedEmployees.forEach(id => onEmployeeToggle(id));
    }
  };

  const handleSelectTopPerformers = () => {
    const topPerformers = employees
      .filter(emp => emp.isActive)
      .sort((a, b) => (b.efficiency || 0) - (a.efficiency || 0))
      .slice(0, Math.min(5, maxEmployees))
      .map(emp => emp.id);
    
    if (onEmployeesChange) {
      onEmployeesChange(topPerformers);
    } else {
      handleClearAll();
      topPerformers.forEach(id => onEmployeeToggle(id));
    }
  };

  const isEmployeeSelected = (employeeId: string) => selectedEmployees.includes(employeeId);
  const canSelectMore = selectedEmployees.length < maxEmployees;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header with stats */}
      {showStats && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Tim Panen</span>
              <Badge variant="secondary">
                {selectedEmployees.length} / {maxEmployees}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-foreground">{stats.count}</div>
                <div className="text-sm text-muted-foreground">Karyawan Dipilih</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-foreground">{stats.avgEfficiency}%</div>
                <div className="text-sm text-muted-foreground">Rata-rata Efisiensi</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-foreground">{stats.totalHarvest.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Total Pengalaman (TBS)</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari karyawan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant={filterType === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('all')}
              >
                Semua
              </Button>
              <Button
                variant={filterType === 'top_performers' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('top_performers')}
              >
                <Star className="h-4 w-4 mr-1" />
                Terbaik
              </Button>
              <Button
                variant={filterType === 'recent' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('recent')}
              >
                <Clock className="h-4 w-4 mr-1" />
                Terbaru
              </Button>
            </div>
          </div>

          {/* Quick actions */}
          {showQuickActions && (
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                disabled={!canSelectMore || filteredEmployees.length === 0}
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Pilih Semua
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAll}
                disabled={selectedEmployees.length === 0}
              >
                <Circle className="h-4 w-4 mr-1" />
                Hapus Pilihan
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectTopPerformers}
                disabled={!canSelectMore}
              >
                <Star className="h-4 w-4 mr-1" />
                Pilih Terbaik
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Employee list */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {filteredEmployees.map((employee, index) => {
            const isSelected = isEmployeeSelected(employee.id);
            const canSelect = canSelectMore || isSelected;

            return (
              <motion.div
                key={employee.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
              >
                <Card 
                  className={cn(
                    'transition-all duration-200 cursor-pointer hover:shadow-md',
                    isSelected ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50',
                    !canSelect && !isSelected && 'opacity-50 cursor-not-allowed'
                  )}
                  onClick={() => canSelect && onEmployeeToggle(employee.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <div className="relative">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-lg font-bold">
                          {employee.avatar || employee.name.charAt(0)}
                        </div>
                        <div className={cn(
                          'absolute -top-1 -right-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center',
                          isSelected ? 'bg-green-500' : 'bg-gray-300'
                        )}>
                          {isSelected ? (
                            <CheckCircle2 className="h-3 w-3 text-white" />
                          ) : (
                            <Circle className="h-3 w-3 text-white" />
                          )}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium text-foreground truncate">
                            {employee.name}
                          </h4>
                          {(employee.efficiency || 0) >= 90 && (
                            <Star className="h-4 w-4 text-yellow-500" />
                          )}
                        </div>
                        
                        <p className="text-sm text-muted-foreground">
                          {employee.code} • {employee.divisiName}
                        </p>

                        <div className="flex items-center space-x-3 mt-2">
                          <div className="flex items-center space-x-1">
                            <TrendingUp className="h-3 w-3 text-green-500" />
                            <span className="text-xs font-medium text-green-600">
                              {employee.efficiency || 0}%
                            </span>
                          </div>
                          
                          <div className="text-xs text-muted-foreground">
                            {(employee.totalHarvest || 0).toLocaleString()} TBS
                          </div>
                        </div>

                        <div className="mt-2">
                          <Badge 
                            variant="secondary" 
                            className="text-xs"
                          >
                            {employee.position}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* No results */}
      {filteredEmployees.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              Tidak ada karyawan ditemukan
            </h3>
            <p className="text-muted-foreground">
              Coba ubah kriteria pencarian atau filter yang dipilih
            </p>
          </CardContent>
        </Card>
      )}

      {/* Selection limit warning */}
      {selectedEmployees.length >= maxEmployees && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 text-orange-700">
                <Users className="h-5 w-5" />
                <span className="font-medium">
                  Batas maksimal {maxEmployees} karyawan telah tercapai
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}