'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Building2,
  CheckSquare,
  Square,
  Edit3,
  Eye,
  AlertTriangle,
  Info,
  Plus,
  Minus,
  MoreHorizontal
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

import { User, Company, Estate } from '@/types/auth';
import { cn } from '@/lib/utils';

interface AssignmentMatrixProps {
  users: User[];
  companies: Company[];
  estates: Estate[];
  selectedUsers: string[];
  onSelectionChange: (userIds: string[]) => void;
  onAssignmentChange: (userId: string, assignmentType: 'companies' | 'estates', assignments: string[]) => void;
  onEditAssignment: (userId: string) => void;
}

interface MatrixCell {
  userId: string;
  companyId: string;
  isAssigned: boolean;
  assignedEstates: string[];
  canAssign: boolean;
  hasConflict: boolean;
  conflictReason?: string;
}

export function AssignmentMatrix({
  users,
  companies,
  estates,
  selectedUsers,
  onSelectionChange,
  onAssignmentChange,
  onEditAssignment
}: AssignmentMatrixProps) {
  const [showEstateDetails, setShowEstateDetails] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  // Filter users to show only Area Managers and Managers
  const relevantUsers = useMemo(() => 
    users.filter(user => ['AREA_MANAGER', 'MANAGER'].includes(user.role))
  , [users]);

  // Create matrix data
  const matrixData = useMemo(() => {
    const data: MatrixCell[] = [];
    
    relevantUsers.forEach(user => {
      companies.forEach(company => {
        const isAreaManager = user.role === 'AREA_MANAGER';
        const isManager = user.role === 'MANAGER';
        
        let isAssigned = false;
        let assignedEstates: string[] = [];
        let canAssign = true;
        let hasConflict = false;
        let conflictReason = '';

        if (isAreaManager) {
          isAssigned = user.assignedCompanies?.includes(company.id) || false;
          canAssign = true; // Area managers can be assigned to any company
        } else if (isManager) {
          // Manager assignment is indirect through estates
          const companyEstates = estates.filter(estate => estate.companyId === company.id);
          assignedEstates = user.assignedEstates?.filter(estateId => 
            companyEstates.some(estate => estate.id === estateId)
          ) || [];
          isAssigned = assignedEstates.length > 0;
          
          // Check if manager can be assigned (Area Manager must have access to company)
          const areaManager = relevantUsers.find(u => 
            u.role === 'AREA_MANAGER' && u.id === user.reportingToAreaManagerId
          );
          canAssign = areaManager?.assignedCompanies?.includes(company.id) || false;
          
          if (isAssigned && !canAssign) {
            hasConflict = true;
            conflictReason = 'Area Manager does not have access to this company';
          }
        }

        data.push({
          userId: user.id,
          companyId: company.id,
          isAssigned,
          assignedEstates,
          canAssign,
          hasConflict,
          conflictReason
        });
      });
    });

    return data;
  }, [relevantUsers, companies, estates]);

  const toggleUserSelection = (userId: string) => {
    if (selectedUsers.includes(userId)) {
      onSelectionChange(selectedUsers.filter(id => id !== userId));
    } else {
      onSelectionChange([...selectedUsers, userId]);
    }
  };

  const toggleAssignment = async (userId: string, companyId: string) => {
    const user = relevantUsers.find(u => u.id === userId);
    const cell = matrixData.find(c => c.userId === userId && c.companyId === companyId);
    
    if (!user || !cell || !cell.canAssign) return;

    if (user.role === 'AREA_MANAGER') {
      const currentAssignments = user.assignedCompanies || [];
      const newAssignments = cell.isAssigned
        ? currentAssignments.filter(id => id !== companyId)
        : [...currentAssignments, companyId];
      
      await onAssignmentChange(userId, 'companies', newAssignments);
    } else if (user.role === 'MANAGER') {
      // For managers, we need to handle estate assignments
      // This is a simplified toggle - in reality you'd want to show estate selection
      const companyEstates = estates.filter(estate => estate.companyId === companyId);
      const currentEstateAssignments = user.assignedEstates || [];
      
      if (cell.isAssigned) {
        // Remove all estates in this company
        const newAssignments = currentEstateAssignments.filter(estateId =>
          !companyEstates.some(estate => estate.id === estateId)
        );
        await onAssignmentChange(userId, 'estates', newAssignments);
      } else {
        // For simplicity, assign to all estates in the company
        const newAssignments = [...currentEstateAssignments, ...companyEstates.map(e => e.id)];
        await onAssignmentChange(userId, 'estates', newAssignments);
      }
    }
  };

  const toggleRowExpansion = (userId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedRows(newExpanded);
  };

  const getCellContent = (userId: string, companyId: string) => {
    const cell = matrixData.find(c => c.userId === userId && c.companyId === companyId);
    const user = relevantUsers.find(u => u.id === userId);
    
    if (!cell || !user) return null;

    const cellId = `${userId}-${companyId}`;
    const isHovered = hoveredCell === cellId;

    return (
      <TooltipProvider key={cellId}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                'relative flex items-center justify-center h-12 border border-gray-200 dark:border-gray-700 transition-all duration-200',
                'hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer',
                cell.isAssigned && 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
                cell.hasConflict && 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
                !cell.canAssign && 'bg-gray-50 dark:bg-gray-900 opacity-50 cursor-not-allowed',
                isHovered && 'ring-2 ring-blue-400 dark:ring-blue-600'
              )}
              onMouseEnter={() => setHoveredCell(cellId)}
              onMouseLeave={() => setHoveredCell(null)}
              onClick={() => cell.canAssign && toggleAssignment(userId, companyId)}
            >
              {cell.isAssigned ? (
                <div className="flex items-center gap-1">
                  <CheckSquare className={cn(
                    'h-4 w-4',
                    cell.hasConflict ? 'text-red-600' : 'text-blue-600'
                  )} />
                  {user.role === 'MANAGER' && cell.assignedEstates.length > 0 && (
                    <span className="text-xs font-medium">
                      {cell.assignedEstates.length}
                    </span>
                  )}
                </div>
              ) : (
                <Square className="h-4 w-4 text-gray-400" />
              )}
              
              {cell.hasConflict && (
                <AlertTriangle className="absolute -top-1 -right-1 h-3 w-3 text-red-500" />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="space-y-1">
              <p className="font-medium">
                {user.name} - {companies.find(c => c.id === companyId)?.name}
              </p>
              <p className="text-sm text-muted-foreground">
                Role: {user.role === 'AREA_MANAGER' ? 'Area Manager' : 'Manager'}
              </p>
              {cell.isAssigned && (
                <p className="text-sm text-blue-600">
                  ✓ Assigned
                  {user.role === 'MANAGER' && ` (${cell.assignedEstates.length} estates)`}
                </p>
              )}
              {cell.hasConflict && (
                <p className="text-sm text-red-600">
                  ⚠ Conflict: {cell.conflictReason}
                </p>
              )}
              {!cell.canAssign && !cell.hasConflict && (
                <p className="text-sm text-gray-500">
                  Cannot assign - Area Manager access required
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Assignment Matrix
            </CardTitle>
            <CardDescription>
              Visual overview of user assignments across companies and estates
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="estate-details"
                checked={showEstateDetails}
                onCheckedChange={setShowEstateDetails}
              />
              <Label htmlFor="estate-details" className="text-sm">
                Show Estate Details
              </Label>
            </div>
            
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Info className="h-4 w-4" />
              Click cells to toggle assignments
            </div>
          </div>
        </div>
        
        {/* Legend */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-50 border-blue-200 border rounded"></div>
            <span>Assigned</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-50 border-gray-200 border rounded"></div>
            <span>Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-50 border-red-200 border rounded relative">
              <AlertTriangle className="absolute -top-0.5 -right-0.5 h-2 w-2 text-red-500" />
            </div>
            <span>Conflict</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-100 border-gray-300 border rounded opacity-50"></div>
            <span>Unavailable</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <ScrollArea className="w-full">
          <div className="min-w-full">
            {/* Header Row */}
            <div className="grid gap-0" style={{
              gridTemplateColumns: `300px repeat(${companies.length}, 120px) 100px`
            }}>
              {/* User header */}
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 font-medium">
                <span>User</span>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">
                    {selectedUsers.length} selected
                  </span>
                </div>
              </div>
              
              {/* Company headers */}
              {companies.map(company => (
                <div
                  key={company.id}
                  className="p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-center"
                >
                  <div className="space-y-1">
                    <p className="font-medium text-sm leading-tight">
                      {company.code}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {company.name}
                    </p>
                    <div className="flex justify-center">
                      <Building2 className="h-3 w-3 text-gray-400" />
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Actions header */}
              <div className="p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-center font-medium">
                Actions
              </div>
            </div>

            {/* User rows */}
            {relevantUsers.map(user => {
              const isSelected = selectedUsers.includes(user.id);
              const isExpanded = expandedRows.has(user.id);
              const userAssignments = matrixData.filter(cell => cell.userId === user.id);
              const assignedCount = userAssignments.filter(cell => cell.isAssigned).length;
              const conflictCount = userAssignments.filter(cell => cell.hasConflict).length;

              return (
                <React.Fragment key={user.id}>
                  {/* Main user row */}
                  <div className="grid gap-0" style={{
                    gridTemplateColumns: `300px repeat(${companies.length}, 120px) 100px`
                  }}>
                    {/* User info */}
                    <div className={cn(
                      'flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700',
                      isSelected && 'bg-blue-50 dark:bg-blue-900/20'
                    )}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleUserSelection(user.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{user.name}</p>
                          <Badge variant={user.role === 'AREA_MANAGER' ? 'default' : 'secondary'} className="text-xs">
                            {user.role === 'AREA_MANAGER' ? 'AM' : 'MGR'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {user.email}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <span>{assignedCount} assignments</span>
                          {conflictCount > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {conflictCount} conflicts
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Assignment cells */}
                    {companies.map(company => (
                      <div key={company.id}>
                        {getCellContent(user.id, company.id)}
                      </div>
                    ))}
                    
                    {/* Actions */}
                    <div className="flex items-center justify-center p-2 border border-gray-200 dark:border-gray-700">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEditAssignment(user.id)}>
                            <Edit3 className="h-4 w-4 mr-2" />
                            Edit Assignments
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleRowExpansion(user.id)}>
                            <Eye className="h-4 w-4 mr-2" />
                            {isExpanded ? 'Hide' : 'Show'} Details
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => toggleUserSelection(user.id)}
                            className={isSelected ? 'text-red-600' : ''}
                          >
                            {isSelected ? <Minus className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                            {isSelected ? 'Deselect' : 'Select'} User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Expanded details */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="grid gap-0"
                        style={{
                          gridTemplateColumns: `300px repeat(${companies.length}, 120px) 100px`
                        }}
                      >
                        <div className="p-4 bg-gray-50 dark:bg-gray-900 border-l border-r border-b border-gray-200 dark:border-gray-700">
                          <div className="space-y-2 text-sm">
                            <p><strong>Employee ID:</strong> {user.employeeId}</p>
                            <p><strong>Position:</strong> {user.position}</p>
                            <p><strong>Phone:</strong> {user.phoneNumber}</p>
                            {user.role === 'MANAGER' && user.reportingToAreaManagerName && (
                              <p><strong>Reports to:</strong> {user.reportingToAreaManagerName}</p>
                            )}
                          </div>
                        </div>
                        
                        {companies.map(company => {
                          const cell = userAssignments.find(c => c.companyId === company.id);
                          const companyEstates = estates.filter(estate => estate.companyId === company.id);
                          
                          return (
                            <div key={company.id} className="p-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                              {cell?.isAssigned && user.role === 'MANAGER' && showEstateDetails && (
                                <div className="space-y-1">
                                  <p className="text-xs font-medium">Assigned Estates:</p>
                                  {companyEstates
                                    .filter(estate => cell.assignedEstates.includes(estate.id))
                                    .map(estate => (
                                      <div key={estate.id} className="text-xs text-muted-foreground">
                                        {estate.code}
                                      </div>
                                    ))}
                                </div>
                              )}
                              {cell?.hasConflict && (
                                <div className="text-xs text-red-600">
                                  ⚠ {cell.conflictReason}
                                </div>
                              )}
                            </div>
                          );
                        })}
                        
                        <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"></div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </React.Fragment>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}