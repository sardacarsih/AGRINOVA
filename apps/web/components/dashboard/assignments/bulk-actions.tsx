'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Building2,
  MapPin,
  Plus,
  Minus,
  Trash2,
  Copy,
  Move,
  Check,
  X,
  AlertTriangle,
  Info,
  ChevronDown,
  UserCheck,
  UserX
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';

import { User, Company, Estate } from '@/types/auth';
import { cn } from '@/lib/utils';

interface BulkActionsProps {
  selectedUsers: string[];
  onClear: () => void;
  onBulkAssign: (assignments: string[]) => void;
  companies: Company[];
  estates: Estate[];
}

interface BulkOperation {
  type: 'assign' | 'unassign' | 'replace' | 'copy';
  target: 'companies' | 'estates';
  items: string[];
}

export function BulkActions({
  selectedUsers,
  onClear,
  onBulkAssign,
  companies,
  estates
}: BulkActionsProps) {
  const [operation, setOperation] = useState<BulkOperation>({
    type: 'assign',
    target: 'companies',
    items: []
  });
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  // Group selected users by role
  const selectedUsersByRole = useMemo(() => {
    const areaManagers = selectedUsers.filter(userId => {
      // In a real implementation, you'd get the user data here
      return true; // Simplified for now
    });
    
    const managers = selectedUsers.filter(userId => {
      // In a real implementation, you'd get the user data here
      return true; // Simplified for now
    });

    return { areaManagers, managers };
  }, [selectedUsers]);

  const toggleCompanySelection = (companyId: string) => {
    setOperation(prev => {
      const isSelected = prev.items.includes(companyId);
      const newItems = isSelected
        ? prev.items.filter(id => id !== companyId)
        : [...prev.items, companyId];
      
      return { ...prev, items: newItems };
    });
  };

  const toggleEstateSelection = (estateId: string) => {
    setOperation(prev => {
      const isSelected = prev.items.includes(estateId);
      const newItems = isSelected
        ? prev.items.filter(id => id !== estateId)
        : [...prev.items, estateId];
      
      return { ...prev, items: newItems };
    });
  };

  const selectAllCompanies = () => {
    setOperation(prev => ({ ...prev, items: companies.map(c => c.id) }));
  };

  const clearAllSelections = () => {
    setOperation(prev => ({ ...prev, items: [] }));
  };

  const executeOperation = () => {
    if (operation.items.length === 0) return;
    
    onBulkAssign(operation.items);
    setOperation(prev => ({ ...prev, items: [] }));
    setConfirmationOpen(false);
  };

  const getOperationDescription = () => {
    const itemType = operation.target === 'companies' ? 'company' : 'estate';
    const itemCount = operation.items.length;
    const userCount = selectedUsers.length;
    
    switch (operation.type) {
      case 'assign':
        return `Add ${itemCount} ${itemType}${itemCount !== 1 ? 'ies' : 'y'} to ${userCount} selected user${userCount !== 1 ? 's' : ''}`;
      case 'unassign':
        return `Remove ${itemCount} ${itemType}${itemCount !== 1 ? 'ies' : 'y'} from ${userCount} selected user${userCount !== 1 ? 's' : ''}`;
      case 'replace':
        return `Replace all ${itemType} assignments with ${itemCount} selected ${itemType}${itemCount !== 1 ? 'ies' : 'y'} for ${userCount} user${userCount !== 1 ? 's' : ''}`;
      case 'copy':
        return `Copy ${itemCount} ${itemType}${itemCount !== 1 ? 'ies' : 'y'} from first selected user to ${userCount - 1} other user${userCount - 1 !== 1 ? 's' : ''}`;
      default:
        return '';
    }
  };

  const getOperationIcon = () => {
    switch (operation.type) {
      case 'assign':
        return <Plus className="h-4 w-4 text-green-600" />;
      case 'unassign':
        return <Minus className="h-4 w-4 text-red-600" />;
      case 'replace':
        return <Move className="h-4 w-4 text-blue-600" />;
      case 'copy':
        return <Copy className="h-4 w-4 text-purple-600" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  const getOperationVariant = () => {
    switch (operation.type) {
      case 'assign':
        return 'default' as const;
      case 'unassign':
        return 'destructive' as const;
      case 'replace':
        return 'secondary' as const;
      case 'copy':
        return 'outline' as const;
      default:
        return 'outline' as const;
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
      >
        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  Bulk Actions
                  <Badge variant="secondary">{selectedUsers.length} users selected</Badge>
                </CardTitle>
                <CardDescription>
                  Perform bulk assignment operations on selected users
                </CardDescription>
              </div>
              
              <Button variant="outline" size="sm" onClick={onClear}>
                <X className="h-4 w-4 mr-2" />
                Clear Selection
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Operation Type Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Operation Type</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Button
                  variant={operation.type === 'assign' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setOperation(prev => ({ ...prev, type: 'assign' }))}
                  className="justify-start gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Assign
                </Button>
                <Button
                  variant={operation.type === 'unassign' ? 'destructive' : 'outline'}
                  size="sm"
                  onClick={() => setOperation(prev => ({ ...prev, type: 'unassign' }))}
                  className="justify-start gap-2"
                >
                  <Minus className="h-4 w-4" />
                  Unassign
                </Button>
                <Button
                  variant={operation.type === 'replace' ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => setOperation(prev => ({ ...prev, type: 'replace' }))}
                  className="justify-start gap-2"
                >
                  <Move className="h-4 w-4" />
                  Replace
                </Button>
                <Button
                  variant={operation.type === 'copy' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setOperation(prev => ({ ...prev, type: 'copy' }))}
                  className="justify-start gap-2"
                  disabled={selectedUsers.length < 2}
                >
                  <Copy className="h-4 w-4" />
                  Copy
                </Button>
              </div>
            </div>

            <Separator />

            {/* Target Selection */}
            <Tabs 
              value={operation.target} 
              onValueChange={(value) => setOperation(prev => ({ 
                ...prev, 
                target: value as 'companies' | 'estates',
                items: [] // Clear selections when switching target
              }))}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="companies" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Companies
                  <Badge variant="secondary" className="ml-1">
                    {operation.target === 'companies' ? operation.items.length : 0}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="estates" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Estates
                  <Badge variant="secondary" className="ml-1">
                    {operation.target === 'estates' ? operation.items.length : 0}
                  </Badge>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="companies" className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Select Companies</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={selectAllCompanies}
                      disabled={operation.items.length === companies.length}
                    >
                      Select All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearAllSelections}
                      disabled={operation.items.length === 0}
                    >
                      Clear
                    </Button>
                  </div>
                </div>

                <ScrollArea className="h-48 border rounded-lg p-2">
                  <div className="space-y-2">
                    {companies.map(company => {
                      const isSelected = operation.items.includes(company.id);
                      
                      return (
                        <div
                          key={company.id}
                          className={cn(
                            'flex items-center justify-between p-2 rounded border transition-all cursor-pointer',
                            isSelected && 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                          )}
                          onClick={() => toggleCompanySelection(company.id)}
                        >
                          <div className="flex items-center gap-3">
                            <Checkbox checked={isSelected} disabled />
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium text-sm">{company.code}</p>
                              <p className="text-xs text-muted-foreground">{company.name}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="estates" className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Select Estates</Label>
                  <Select defaultValue="all">
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by company" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Companies</SelectItem>
                      {companies.map(company => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <ScrollArea className="h-48 border rounded-lg p-2">
                  <div className="space-y-2">
                    {estates.map(estate => {
                      const isSelected = operation.items.includes(estate.id);
                      const company = companies.find(c => c.id === estate.companyId);
                      
                      return (
                        <div
                          key={estate.id}
                          className={cn(
                            'flex items-center justify-between p-2 rounded border transition-all cursor-pointer',
                            isSelected && 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                          )}
                          onClick={() => toggleEstateSelection(estate.id)}
                        >
                          <div className="flex items-center gap-3">
                            <Checkbox checked={isSelected} disabled />
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-sm">{estate.code}</p>
                                {company && (
                                  <Badge variant="outline" className="text-xs">
                                    {company.code}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">{estate.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {estate.area} ha • {estate.location}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>

            {/* Operation Preview */}
            {operation.items.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Switch
                    id="preview-mode"
                    checked={previewMode}
                    onCheckedChange={setPreviewMode}
                  />
                  <Label htmlFor="preview-mode" className="text-sm">
                    Show operation preview
                  </Label>
                </div>

                {previewMode && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-2">
                        <p className="font-medium">Operation Preview:</p>
                        <p className="text-sm">{getOperationDescription()}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant={getOperationVariant()} className="text-xs">
                            {getOperationIcon()}
                            {operation.type.toUpperCase()}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {operation.target.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2">
              <div className="text-sm text-muted-foreground">
                {operation.items.length > 0 
                  ? `${operation.items.length} ${operation.target === 'companies' ? 'companies' : 'estates'} selected`
                  : `No ${operation.target === 'companies' ? 'companies' : 'estates'} selected`
                }
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmationOpen(true)}
                  disabled={operation.items.length === 0}
                  className="gap-2"
                >
                  {getOperationIcon()}
                  Preview Operation
                </Button>
                
                <Button
                  variant={getOperationVariant()}
                  size="sm"
                  onClick={executeOperation}
                  disabled={operation.items.length === 0}
                  className="gap-2"
                >
                  <Check className="h-4 w-4" />
                  Execute {operation.type === 'assign' ? 'Assignment' : 
                            operation.type === 'unassign' ? 'Removal' :
                            operation.type === 'replace' ? 'Replacement' : 'Copy'}
                </Button>
              </div>
            </div>

            {/* Warning for destructive operations */}
            {(operation.type === 'unassign' || operation.type === 'replace') && operation.items.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-medium">Warning: Destructive Operation</p>
                  <p className="text-sm">
                    This operation will {operation.type === 'unassign' ? 'remove assignments from' : 'replace all assignments for'} {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''}. 
                    This action cannot be undone easily.
                  </p>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}