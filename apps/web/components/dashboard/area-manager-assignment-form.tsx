'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Building,
  Plus,
  Trash2,
  Search,
  Eye,
  Users,
  Terminal,
  Download,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { User, Company, AreaManagerCompanyAssignment } from '@/types/auth';
import { HierarchicalRoleManager } from '@/lib/auth/hierarchical-roles';
import { mockCompanyDataService } from '@/lib/data/mock-company-data';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';

interface AreaManagerAssignmentFormProps {
  currentUser: User;
  areaManagerUser: User;
  onSubmit: (assignments: AreaManagerCompanyAssignment[]) => Promise<void>;
  onCancel: () => void;
}

interface CompanyAssignmentState {
  companyId: string;
  companyName: string;
  isAssigned: boolean;
  canViewReports: boolean;
  canManageUsers: boolean;
  canAccessSystemLogs: boolean;
  canExportData: boolean;
}

export function AreaManagerAssignmentForm({
  currentUser,
  areaManagerUser,
  onSubmit,
  onCancel
}: AreaManagerAssignmentFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [assignments, setAssignments] = useState<CompanyAssignmentState[]>([]);
  const [existingAssignments, setExistingAssignments] = useState<AreaManagerCompanyAssignment[]>([]);

  useEffect(() => {
    loadData();
  }, [currentUser, areaManagerUser]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load all companies
      const allCompanies = await HierarchicalRoleManager.getAvailableCompaniesForAreaManager(currentUser);
      setCompanies(allCompanies);

      // Load existing assignments
      const existingAssignments: AreaManagerCompanyAssignment[] = [];
      setExistingAssignments(existingAssignments);

      // Initialize assignment state
      const assignmentStates: CompanyAssignmentState[] = allCompanies.map(company => {
        const existingAssignment = existingAssignments.find(a => a.companyId === company.id);
        
        return {
          companyId: company.id,
          companyName: company.name,
          isAssigned: !!existingAssignment,
          canViewReports: existingAssignment?.canViewReports ?? true,
          canManageUsers: existingAssignment?.canManageUsers ?? true,
          canAccessSystemLogs: existingAssignment?.canAccessSystemLogs ?? false,
          canExportData: existingAssignment?.canExportData ?? true,
        };
      });

      setAssignments(assignmentStates);
    } catch (error) {
      console.error('Failed to load assignment data:', error);
      toast({
        title: 'Error',
        description: 'Gagal memuat data assignment',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAssignmentToggle = (companyId: string, isAssigned: boolean) => {
    setAssignments(prev => prev.map(assignment => 
      assignment.companyId === companyId 
        ? { ...assignment, isAssigned }
        : assignment
    ));
  };

  const handlePermissionChange = (
    companyId: string, 
    permissionType: keyof Omit<CompanyAssignmentState, 'companyId' | 'companyName' | 'isAssigned'>,
    value: boolean
  ) => {
    setAssignments(prev => prev.map(assignment => 
      assignment.companyId === companyId 
        ? { ...assignment, [permissionType]: value }
        : assignment
    ));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      // Validate at least one assignment
      const assignedCompanies = assignments.filter(a => a.isAssigned);
      if (assignedCompanies.length === 0) {
        toast({
          title: 'Validation Error',
          description: 'Area Manager harus di-assign ke minimal satu perusahaan',
          variant: 'destructive',
        });
        return;
      }

      // Convert to AreaManagerCompanyAssignment format
      const assignmentData: AreaManagerCompanyAssignment[] = assignedCompanies.map(assignment => ({
        id: `temp-${assignment.companyId}`, // Temporary ID for new assignments
        userId: areaManagerUser.id,
        companyId: assignment.companyId,
        canViewReports: assignment.canViewReports,
        canManageUsers: assignment.canManageUsers,
        canAccessSystemLogs: assignment.canAccessSystemLogs,
        canExportData: assignment.canExportData,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: currentUser.id,
        updatedBy: currentUser.id,
        user: areaManagerUser,
        company: companies.find(c => c.id === assignment.companyId)
      }));

      await onSubmit(assignmentData);

      toast({
        title: 'Berhasil',
        description: `Area Manager berhasil di-assign ke ${assignedCompanies.length} perusahaan`,
      });

    } catch (error) {
      console.error('Failed to save assignments:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Gagal menyimpan assignment',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredAssignments = assignments.filter(assignment =>
    assignment.companyName.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const assignedCount = assignments.filter(a => a.isAssigned).length;
  const totalCompanies = companies.length;

  if (loading && assignments.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3">Loading assignment data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Assignment Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Building className="h-5 w-5" />
            <span>Assignment Summary</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{assignedCount}</div>
              <div className="text-sm text-blue-800">Companies Assigned</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-600">{totalCompanies}</div>
              <div className="text-sm text-gray-800">Total Companies</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {totalCompanies > 0 ? Math.round((assignedCount / totalCompanies) * 100) : 0}%
              </div>
              <div className="text-sm text-green-800">Coverage</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Company Search */}
      <Card>
        <CardHeader>
          <CardTitle>Company Assignment</CardTitle>
          <CardDescription>
            Pilih perusahaan dan atur permission untuk Area Manager {areaManagerUser.name}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Filter */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari perusahaan..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Company List */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredAssignments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Building className="h-8 w-8 mx-auto mb-4 text-gray-400" />
                <p>No companies found matching your search</p>
              </div>
            ) : (
              filteredAssignments.map((assignment, index) => (
                <motion.div
                  key={assignment.companyId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className={`border rounded-lg p-4 transition-colors ${
                    assignment.isAssigned 
                      ? 'border-blue-200 bg-blue-50' 
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    {/* Company Info */}
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        checked={assignment.isAssigned}
                        onCheckedChange={(checked) => 
                          handleAssignmentToggle(assignment.companyId, checked as boolean)
                        }
                      />
                      <div>
                        <div className="flex items-center space-x-2">
                          <Building className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">{assignment.companyName}</span>
                          {assignment.isAssigned && (
                            <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                              Assigned
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          Company ID: {assignment.companyId}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Permissions (only show if assigned) */}
                  {assignment.isAssigned && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <Label className="text-sm font-medium mb-3 block">Permissions</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Eye className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">View Reports</span>
                          </div>
                          <Switch
                            checked={assignment.canViewReports}
                            onCheckedChange={(checked) => 
                              handlePermissionChange(assignment.companyId, 'canViewReports', checked)
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Users className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">Manage Users</span>
                          </div>
                          <Switch
                            checked={assignment.canManageUsers}
                            onCheckedChange={(checked) => 
                              handlePermissionChange(assignment.companyId, 'canManageUsers', checked)
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Terminal className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">Access System Logs</span>
                          </div>
                          <Switch
                            checked={assignment.canAccessSystemLogs}
                            onCheckedChange={(checked) => 
                              handlePermissionChange(assignment.companyId, 'canAccessSystemLogs', checked)
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Download className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">Export Data</span>
                          </div>
                          <Switch
                            checked={assignment.canExportData}
                            onCheckedChange={(checked) => 
                              handlePermissionChange(assignment.companyId, 'canExportData', checked)
                            }
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Validation Messages */}
      {assignedCount === 0 && (
        <div className="flex items-center space-x-2 text-amber-600 bg-amber-50 p-4 rounded-lg">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm">
            Area Manager harus di-assign ke minimal satu perusahaan
          </span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 pt-6 border-t">
        <Button variant="outline" onClick={onCancel} disabled={loading}>
          Batal
        </Button>
        <Button 
          onClick={handleSubmit} 
          disabled={loading || assignedCount === 0}
          className="min-w-24"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Simpan Assignment
            </>
          )}
        </Button>
      </div>
    </div>
  );
}