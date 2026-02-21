'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Building2,
  MapPin,
  Users,
  Crown,
  Shield,
  Check,
  X,
  AlertTriangle,
  Info,
  Search,
  Filter,
  ChevronDown,
  Save,
  RotateCcw
} from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { User, Company, Estate, Divisi } from '@/types/auth';
import { cn } from '@/lib/utils';

interface AssignmentModalProps {
  open: boolean;
  mode: 'create' | 'edit' | 'bulk';
  userId: string | null;
  users: User[];
  companies: Company[];
  estates: Estate[];
  divisions: Divisi[];
  onClose: () => void;
  onSave: (userId: string, assignmentType: 'companies' | 'estates', assignments: string[]) => Promise<void>;
}

interface AssignmentState {
  companyAssignments: string[];
  estateAssignments: string[];
  originalCompanyAssignments: string[];
  originalEstateAssignments: string[];
}

export function AssignmentModal({
  open,
  mode,
  userId,
  users,
  companies,
  estates,
  divisions,
  onClose,
  onSave
}: AssignmentModalProps) {
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCompany, setFilterCompany] = useState<string>('all');
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(false);
  const [activeTab, setActiveTab] = useState('companies');
  
  const [assignmentState, setAssignmentState] = useState<AssignmentState>({
    companyAssignments: [],
    estateAssignments: [],
    originalCompanyAssignments: [],
    originalEstateAssignments: []
  });

  const currentUser = useMemo(() => 
    users.find(user => user.id === userId), [users, userId]
  );

  useEffect(() => {
    if (open && currentUser) {
      // Initialize assignment state with current assignments
      const companyAssignments = currentUser.assignedCompanies || [];
      const estateAssignments = currentUser.assignedEstates || [];
      
      setAssignmentState({
        companyAssignments,
        estateAssignments,
        originalCompanyAssignments: [...companyAssignments],
        originalEstateAssignments: [...estateAssignments]
      });
      
      // Set default tab based on user role
      if (currentUser.role === 'AREA_MANAGER') {
        setActiveTab('companies');
      } else if (currentUser.role === 'MANAGER') {
        setActiveTab('estates');
      }
    }
  }, [open, currentUser]);

  useEffect(() => {
    if (!open) {
      // Reset state when modal closes
      setSearchTerm('');
      setFilterCompany('all');
      setShowOnlyAvailable(false);
      setAssignmentState({
        companyAssignments: [],
        estateAssignments: [],
        originalCompanyAssignments: [],
        originalEstateAssignments: []
      });
    }
  }, [open]);

  // Filtered companies for display
  const filteredCompanies = useMemo(() => {
    return companies.filter(company => {
      const matchesSearch = company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           company.code.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (!matchesSearch) return false;
      
      if (showOnlyAvailable && currentUser?.role === 'MANAGER') {
        // For managers, only show companies where their Area Manager has access
        const areaManager = users.find(u => u.id === currentUser.reportingToAreaManagerId);
        return areaManager?.assignedCompanies?.includes(company.id) || false;
      }
      
      return true;
    });
  }, [companies, searchTerm, showOnlyAvailable, currentUser, users]);

  // Filtered estates for display
  const filteredEstates = useMemo(() => {
    return estates.filter(estate => {
      const matchesSearch = estate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           estate.code.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (!matchesSearch) return false;
      
      if (filterCompany !== 'all' && estate.companyId !== filterCompany) {
        return false;
      }
      
      if (showOnlyAvailable && currentUser?.role === 'MANAGER') {
        // Only show estates in companies where their Area Manager has access
        const areaManager = users.find(u => u.id === currentUser.reportingToAreaManagerId);
        return areaManager?.assignedCompanies?.includes(estate.companyId) || false;
      }
      
      return true;
    });
  }, [estates, searchTerm, filterCompany, showOnlyAvailable, currentUser, users]);

  const toggleCompanyAssignment = (companyId: string) => {
    setAssignmentState(prev => {
      const isCurrentlyAssigned = prev.companyAssignments.includes(companyId);
      const newAssignments = isCurrentlyAssigned
        ? prev.companyAssignments.filter(id => id !== companyId)
        : [...prev.companyAssignments, companyId];
      
      return {
        ...prev,
        companyAssignments: newAssignments
      };
    });
  };

  const toggleEstateAssignment = (estateId: string) => {
    setAssignmentState(prev => {
      const isCurrentlyAssigned = prev.estateAssignments.includes(estateId);
      const newAssignments = isCurrentlyAssigned
        ? prev.estateAssignments.filter(id => id !== estateId)
        : [...prev.estateAssignments, estateId];
      
      return {
        ...prev,
        estateAssignments: newAssignments
      };
    });
  };

  const resetToOriginal = () => {
    setAssignmentState(prev => ({
      ...prev,
      companyAssignments: [...prev.originalCompanyAssignments],
      estateAssignments: [...prev.originalEstateAssignments]
    }));
  };

  const hasChanges = () => {
    const companyChanges = JSON.stringify(assignmentState.companyAssignments.sort()) !==
                          JSON.stringify(assignmentState.originalCompanyAssignments.sort());
    const estateChanges = JSON.stringify(assignmentState.estateAssignments.sort()) !==
                         JSON.stringify(assignmentState.originalEstateAssignments.sort());
    return companyChanges || estateChanges;
  };

  const handleSave = async () => {
    if (!currentUser || !hasChanges()) return;
    
    try {
      setLoading(true);
      
      // Save company assignments if changed for area managers
      if (currentUser.role === 'AREA_MANAGER') {
        const companyChanges = JSON.stringify(assignmentState.companyAssignments.sort()) !==
                              JSON.stringify(assignmentState.originalCompanyAssignments.sort());
        if (companyChanges) {
          await onSave(currentUser.id, 'companies', assignmentState.companyAssignments);
        }
      }
      
      // Save estate assignments if changed for managers
      if (currentUser.role === 'MANAGER') {
        const estateChanges = JSON.stringify(assignmentState.estateAssignments.sort()) !==
                             JSON.stringify(assignmentState.originalEstateAssignments.sort());
        if (estateChanges) {
          await onSave(currentUser.id, 'estates', assignmentState.estateAssignments);
        }
      }
      
      onClose();
    } catch (error) {
      console.error('Error saving assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAssignmentConflicts = () => {
    const conflicts: string[] = [];
    
    if (currentUser?.role === 'MANAGER') {
      // Check if manager has estates assigned in companies their Area Manager doesn't oversee
      const areaManager = users.find(u => u.id === currentUser.reportingToAreaManagerId);
      const areaManagerCompanies = areaManager?.assignedCompanies || [];
      
      assignmentState.estateAssignments.forEach(estateId => {
        const estate = estates.find(e => e.id === estateId);
        if (estate && !areaManagerCompanies.includes(estate.companyId)) {
          const company = companies.find(c => c.id === estate.companyId);
          conflicts.push(`Estate ${estate.code} in ${company?.code} - Area Manager has no access to this company`);
        }
      });
    }
    
    return conflicts;
  };

  if (!open || !currentUser) return null;

  const conflicts = getAssignmentConflicts();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {currentUser.role === 'AREA_MANAGER' ? (
              <Crown className="h-5 w-5 text-blue-600" />
            ) : (
              <Shield className="h-5 w-5 text-green-600" />
            )}
            {mode === 'edit' ? 'Edit' : 'Create'} Assignments - {currentUser.name}
          </DialogTitle>
          <DialogDescription>
            {currentUser.role === 'AREA_MANAGER' 
              ? 'Manage company assignments for this Area Manager'
              : 'Manage estate assignments for this Manager'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* User Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">User Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <Label className="text-xs text-muted-foreground">Role</Label>
                  <p className="font-medium capitalize">
                    {currentUser.role.replace('-', ' ')}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Employee ID</Label>
                  <p className="font-medium">{currentUser.employeeId}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <p className="font-medium">{currentUser.email}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <Badge variant={currentUser.status === 'active' ? 'default' : 'destructive'}>
                    {currentUser.status}
                  </Badge>
                </div>
                {currentUser.role === 'MANAGER' && currentUser.reportingToAreaManagerName && (
                  <div className="col-span-2">
                    <Label className="text-xs text-muted-foreground">Reports To</Label>
                    <p className="font-medium">{currentUser.reportingToAreaManagerName}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Conflicts Alert */}
          {conflicts.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-medium">Assignment Conflicts Detected:</p>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {conflicts.map((conflict, index) => (
                      <li key={index}>{conflict}</li>
                    ))}
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search companies or estates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {activeTab === 'estates' && (
              <Select value={filterCompany} onValueChange={setFilterCompany}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by company" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Companies</SelectItem>
                  {companies.map(company => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.code} - {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            <div className="flex items-center gap-2">
              <Switch
                id="show-available"
                checked={showOnlyAvailable}
                onCheckedChange={setShowOnlyAvailable}
              />
              <Label htmlFor="show-available" className="text-sm">
                Available only
              </Label>
            </div>
          </div>

          {/* Assignment Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger 
                value="companies" 
                disabled={currentUser.role !== 'AREA_MANAGER'}
                className="flex items-center gap-2"
              >
                <Building2 className="h-4 w-4" />
                Companies
                <Badge variant="secondary" className="ml-1">
                  {assignmentState.companyAssignments.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger 
                value="estates" 
                disabled={currentUser.role !== 'MANAGER'}
                className="flex items-center gap-2"
              >
                <MapPin className="h-4 w-4" />
                Estates
                <Badge variant="secondary" className="ml-1">
                  {assignmentState.estateAssignments.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="companies" className="space-y-2">
              <ScrollArea className="h-96">
                <div className="space-y-2">
                  {filteredCompanies.map(company => {
                    const isAssigned = assignmentState.companyAssignments.includes(company.id);
                    const wasOriginallyAssigned = assignmentState.originalCompanyAssignments.includes(company.id);
                    const hasChanged = isAssigned !== wasOriginallyAssigned;
                    
                    return (
                      <motion.div
                        key={company.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={cn(
                          'flex items-center justify-between p-3 border rounded-lg transition-all',
                          isAssigned && 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
                          hasChanged && 'ring-2 ring-blue-400 dark:ring-blue-600'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={isAssigned}
                            onCheckedChange={() => toggleCompanyAssignment(company.id)}
                          />
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{company.code} - {company.name}</p>
                            <p className="text-sm text-muted-foreground">{company.description}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {hasChanged && (
                            <Badge variant={isAssigned ? 'default' : 'destructive'} className="text-xs">
                              {isAssigned ? 'Added' : 'Removed'}
                            </Badge>
                          )}
                          {isAssigned && !hasChanged && (
                            <Badge variant="secondary" className="text-xs">
                              Current
                            </Badge>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                  
                  {filteredCompanies.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Building2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No companies found</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="estates" className="space-y-2">
              <ScrollArea className="h-96">
                <div className="space-y-2">
                  {filteredEstates.map(estate => {
                    const isAssigned = assignmentState.estateAssignments.includes(estate.id);
                    const wasOriginallyAssigned = assignmentState.originalEstateAssignments.includes(estate.id);
                    const hasChanged = isAssigned !== wasOriginallyAssigned;
                    const company = companies.find(c => c.id === estate.companyId);
                    
                    // Check availability for managers
                    const isAvailable = currentUser.role !== 'MANAGER' || (() => {
                      const areaManager = users.find(u => u.id === currentUser.reportingToAreaManagerId);
                      return areaManager?.assignedCompanies?.includes(estate.companyId) || false;
                    })();
                    
                    return (
                      <motion.div
                        key={estate.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={cn(
                          'flex items-center justify-between p-3 border rounded-lg transition-all',
                          isAssigned && 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
                          hasChanged && 'ring-2 ring-green-400 dark:ring-green-600',
                          !isAvailable && 'opacity-50 bg-gray-50 dark:bg-gray-900'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={isAssigned}
                            onCheckedChange={() => toggleEstateAssignment(estate.id)}
                            disabled={!isAvailable}
                          />
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{estate.code} - {estate.name}</p>
                              {company && (
                                <Badge variant="outline" className="text-xs">
                                  {company.code}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {estate.location} • {estate.area} ha
                            </p>
                            {!isAvailable && (
                              <p className="text-xs text-red-600">
                                Area Manager has no access to this company
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {hasChanged && (
                            <Badge variant={isAssigned ? 'default' : 'destructive'} className="text-xs">
                              {isAssigned ? 'Added' : 'Removed'}
                            </Badge>
                          )}
                          {isAssigned && !hasChanged && (
                            <Badge variant="secondary" className="text-xs">
                              Current
                            </Badge>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                  
                  {filteredEstates.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No estates found</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Info className="h-4 w-4" />
              {hasChanges() ? 'Changes pending' : 'No changes'}
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={resetToOriginal} disabled={!hasChanges()}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={!hasChanges() || loading}
                className="min-w-[80px]"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </div>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}