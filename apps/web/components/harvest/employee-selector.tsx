'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Plus,
  Check,
  User,
  Users,
  Filter,
  X,
  Star,
  Award,
  TrendingUp
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Employee } from '@/types/harvest';

interface EmployeeSelectorProps {
  availableEmployees: Employee[];
  selectedEmployeeIds: string[];
  onSelectionChange: (employeeIds: string[]) => void;
  maxSelection?: number;
  disabled?: boolean;
  className?: string;
}

export function EmployeeSelector({
  availableEmployees,
  selectedEmployeeIds,
  onSelectionChange,
  maxSelection = 50,
  disabled = false,
  className
}: EmployeeSelectorProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'efficiency' | 'position'>('name');
  const [filterByDivision, setFilterByDivision] = useState<string>('all');
  
  // Get unique divisions for filtering
  const divisions = useMemo(() => {
    const uniqueDivisions = Array.from(new Set(availableEmployees.map(emp => emp.divisiName)));
    return uniqueDivisions.sort();
  }, [availableEmployees]);

  // Filter and sort employees
  const filteredEmployees = useMemo(() => {
    let filtered = availableEmployees.filter(emp => {
      const matchesSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           emp.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           emp.position.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesDivision = filterByDivision === 'all' || emp.divisiName === filterByDivision;
      
      return matchesSearch && matchesDivision && emp.isActive;
    });

    // Sort employees
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'efficiency':
          return (b.efficiency || 0) - (a.efficiency || 0);
        case 'position':
          return a.position.localeCompare(b.position);
        case 'name':
        default:
          return a.name.localeCompare(b.name);
      }
    });

    return filtered;
  }, [availableEmployees, searchQuery, sortBy, filterByDivision]);

  // Get selected employees
  const selectedEmployees = availableEmployees.filter(emp => 
    selectedEmployeeIds.includes(emp.id)
  );

  const toggleEmployeeSelection = (employeeId: string) => {
    if (selectedEmployeeIds.includes(employeeId)) {
      // Remove employee
      onSelectionChange(selectedEmployeeIds.filter(id => id !== employeeId));
    } else {
      // Add employee (check max selection)
      if (selectedEmployeeIds.length < maxSelection) {
        onSelectionChange([...selectedEmployeeIds, employeeId]);
      }
    }
  };

  const clearAllSelection = () => {
    onSelectionChange([]);
  };

  const selectAllFiltered = () => {
    const availableIds = filteredEmployees
      .filter(emp => !selectedEmployeeIds.includes(emp.id))
      .slice(0, maxSelection - selectedEmployeeIds.length)
      .map(emp => emp.id);
    
    onSelectionChange([...selectedEmployeeIds, ...availableIds]);
  };

  const getEfficiencyColor = (efficiency?: number) => {
    if (!efficiency) return 'text-gray-500';
    if (efficiency >= 90) return 'text-green-600';
    if (efficiency >= 80) return 'text-blue-600';
    if (efficiency >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getEfficiencyIcon = (efficiency?: number) => {
    if (!efficiency) return null;
    if (efficiency >= 90) return <Award className="h-4 w-4" />;
    if (efficiency >= 80) return <Star className="h-4 w-4" />;
    if (efficiency >= 70) return <TrendingUp className="h-4 w-4" />;
    return null;
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Selection Summary */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Karyawan Terpilih</span>
            </CardTitle>
            <Badge variant="outline" className="text-sm">
              {selectedEmployeeIds.length} / {maxSelection}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-3">
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogTrigger asChild>
                <Button disabled={disabled || selectedEmployeeIds.length >= maxSelection}>
                  <Plus className="h-4 w-4 mr-2" />
                  Pilih Karyawan
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                  <DialogTitle className="flex items-center space-x-2">
                    <Users className="h-5 w-5" />
                    <span>Pilih Karyawan Panen</span>
                  </DialogTitle>
                </DialogHeader>
                
                {/* Search and Filters */}
                <div className="space-y-3 border-b pb-4">
                  <div className="flex flex-col md:flex-row gap-3">
                    <div className="flex-1 relative">
                      <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <Input
                        placeholder="Cari nama, kode, atau posisi karyawan..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                      <SelectTrigger className="w-full md:w-48">
                        <SelectValue placeholder="Urutkan berdasarkan" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="name">Nama</SelectItem>
                        <SelectItem value="efficiency">Efisiensi</SelectItem>
                        <SelectItem value="position">Posisi</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={filterByDivision} onValueChange={setFilterByDivision}>
                      <SelectTrigger className="w-full md:w-48">
                        <SelectValue placeholder="Filter divisi" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Semua Divisi</SelectItem>
                        {divisions.map(division => (
                          <SelectItem key={division} value={division}>
                            {division}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>{filteredEmployees.length} karyawan ditemukan</span>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={selectAllFiltered}
                        disabled={filteredEmployees.filter(emp => !selectedEmployeeIds.includes(emp.id)).length === 0}
                      >
                        Pilih Semua Hasil
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={clearAllSelection}
                        disabled={selectedEmployeeIds.length === 0}
                      >
                        Hapus Semua
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Employee List */}
                <div className="flex-1 overflow-y-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-1">
                    <AnimatePresence>
                      {filteredEmployees.map((employee) => {
                        const isSelected = selectedEmployeeIds.includes(employee.id);
                        const isMaxReached = selectedEmployeeIds.length >= maxSelection && !isSelected;
                        
                        return (
                          <motion.div
                            key={employee.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className={cn(
                              "p-3 border rounded-lg cursor-pointer transition-all",
                              isSelected
                                ? "border-blue-500 bg-blue-50"
                                : isMaxReached
                                ? "border-gray-200 bg-gray-50 cursor-not-allowed opacity-50"
                                : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
                            )}
                            onClick={() => !isMaxReached && toggleEmployeeSelection(employee.id)}
                          >
                            <div className="flex items-center space-x-3">
                              <div className="relative">
                                <Avatar className="w-10 h-10">
                                  <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                                    {employee.name.charAt(0).toUpperCase()}
                                  </div>
                                </Avatar>
                                {isSelected && (
                                  <div className="absolute -top-1 -right-1 bg-blue-500 text-white rounded-full p-1">
                                    <Check className="h-3 w-3" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm text-gray-900 truncate">
                                  {employee.name}
                                </div>
                                <div className="flex items-center space-x-2 text-xs text-gray-500">
                                  <span>{employee.code}</span>
                                  <span>•</span>
                                  <span>{employee.position}</span>
                                </div>
                                <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                                  <span>{employee.divisiName}</span>
                                  {employee.efficiency && (
                                    <>
                                      <span>•</span>
                                      <div className={cn("flex items-center space-x-1", getEfficiencyColor(employee.efficiency))}>
                                        {getEfficiencyIcon(employee.efficiency)}
                                        <span>{employee.efficiency.toFixed(0)}%</span>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                  
                  {filteredEmployees.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <User className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>Tidak ada karyawan yang sesuai dengan pencarian</p>
                    </div>
                  )}
                </div>

                <div className="border-t pt-4 flex justify-end">
                  <Button onClick={() => setIsModalOpen(false)}>
                    Selesai ({selectedEmployeeIds.length} terpilih)
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            
            {selectedEmployeeIds.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllSelection}
                disabled={disabled}
              >
                <X className="h-4 w-4 mr-2" />
                Hapus Semua
              </Button>
            )}
          </div>

          {/* Selected Employees Display */}
          {selectedEmployeeIds.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Belum ada karyawan yang dipilih</p>
              <p className="text-xs">Klik "Pilih Karyawan" untuk memulai</p>
            </div>
          ) : (
            <div className="space-y-2">
              {selectedEmployees.map((employee) => (
                <div
                  key={employee.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                >
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-8 h-8">
                      <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs">
                        {employee.name.charAt(0).toUpperCase()}
                      </div>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="font-medium text-sm text-gray-900 truncate">
                        {employee.name}
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <span>{employee.code}</span>
                        <span>•</span>
                        <span>{employee.position}</span>
                        <span>•</span>
                        <span>{employee.divisiName}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {employee.efficiency && (
                      <div className={cn("flex items-center space-x-1 text-xs", getEfficiencyColor(employee.efficiency))}>
                        {getEfficiencyIcon(employee.efficiency)}
                        <span>{employee.efficiency.toFixed(0)}%</span>
                      </div>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleEmployeeSelection(employee.id)}
                      disabled={disabled}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}