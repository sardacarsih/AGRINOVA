'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Building2,
  MapPin,
  Users,
  Crown,
  Shield,
  Edit3,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  UserCheck,
  UserX,
  ChevronRight,
  ChevronDown
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger, 
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';

import { User, Company, Estate } from '@/types/auth';
import { cn } from '@/lib/utils';

interface AssignmentCardsProps {
  users: User[];
  companies: Company[];
  estates: Estate[];
  onAssignmentChange: (userId: string, assignmentType: 'companies' | 'estates', assignments: string[]) => void;
  onEditAssignment: (userId: string) => void;
}

interface CompanyAssignmentCard {
  company: Company;
  areaManagers: User[];
  managers: User[];
  estates: Estate[];
  totalUsers: number;
  hasConflicts: boolean;
  coveragePercentage: number;
}

export function AssignmentCards({
  users,
  companies,
  estates,
  onAssignmentChange,
  onEditAssignment
}: AssignmentCardsProps) {
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  // Organize data by company
  const companyCards = useMemo(() => {
    return companies.map(company => {
      // Get Area Managers assigned to this company
      const assignedAreaManagers = users.filter(user => 
        user.role === 'AREA_MANAGER' && 
        user.status === 'active' &&
        (user.assignedCompanies?.includes(company.id) || user.companyId === company.id)
      );

      // Get company estates
      const companyEstates = estates.filter(estate => estate.companyId === company.id);

      // Get Managers assigned to any estate in this company
      const assignedManagers = users.filter(user => 
        user.role === 'MANAGER' && 
        user.status === 'active' &&
        user.assignedEstates?.some(estateId => 
          companyEstates.some(estate => estate.id === estateId)
        )
      );

      // Check for conflicts (managers without proper Area Manager oversight)
      const hasConflicts = assignedManagers.some(manager => {
        const areaManagerId = manager.reportingToAreaManagerId;
        const areaManager = assignedAreaManagers.find(am => am.id === areaManagerId);
        return !areaManager;
      });

      // Calculate coverage
      const assignedEstateCount = companyEstates.filter(estate =>
        assignedManagers.some(manager => manager.assignedEstates?.includes(estate.id))
      ).length;
      const coveragePercentage = companyEstates.length > 0 
        ? Math.round((assignedEstateCount / companyEstates.length) * 100) 
        : 0;

      return {
        company,
        areaManagers: assignedAreaManagers,
        managers: assignedManagers,
        estates: companyEstates,
        totalUsers: assignedAreaManagers.length + assignedManagers.length,
        hasConflicts,
        coveragePercentage
      };
    });
  }, [users, companies, estates]);

  const toggleCardExpansion = (companyId: string) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(companyId)) {
      newExpanded.delete(companyId);
    } else {
      newExpanded.add(companyId);
    }
    setExpandedCards(newExpanded);
  };

  const removeUserAssignment = async (userId: string, companyId: string, role: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    if (role === 'AREA_MANAGER') {
      const newAssignments = user.assignedCompanies?.filter(id => id !== companyId) || [];
      await onAssignmentChange(userId, 'companies', newAssignments);
    } else if (role === 'MANAGER') {
      const companyEstates = estates.filter(estate => estate.companyId === companyId);
      const currentEstateAssignments = user.assignedEstates || [];
      const newAssignments = currentEstateAssignments.filter(estateId =>
        !companyEstates.some(estate => estate.id === estateId)
      );
      await onAssignmentChange(userId, 'estates', newAssignments);
    }
  };

  const getUserInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'AREA_MANAGER':
        return <Crown className="h-4 w-4" />;
      case 'MANAGER':
        return <Shield className="h-4 w-4" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'AREA_MANAGER':
        return 'default' as const;
      case 'MANAGER':
        return 'secondary' as const;
      default:
        return 'outline' as const;
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{companies.length}</p>
                <p className="text-sm text-muted-foreground">Total Companies</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">
                  {companyCards.reduce((sum, card) => sum + card.totalUsers, 0)}
                </p>
                <p className="text-sm text-muted-foreground">Assigned Users</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">
                  {Math.round(
                    companyCards.reduce((sum, card) => sum + card.coveragePercentage, 0) / 
                    (companyCards.length || 1)
                  )}%
                </p>
                <p className="text-sm text-muted-foreground">Avg Coverage</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-2xl font-bold">
                  {companyCards.filter(card => card.hasConflicts).length}
                </p>
                <p className="text-sm text-muted-foreground">Companies w/ Conflicts</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Company Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {companyCards.map((cardData, index) => {
          const isExpanded = expandedCards.has(cardData.company.id);

          return (
            <motion.div
              key={cardData.company.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <Card className={cn(
                'overflow-hidden transition-all duration-200',
                cardData.hasConflicts && 'border-red-200 dark:border-red-800',
                cardData.totalUsers === 0 && 'border-orange-200 dark:border-orange-800'
              )}>
                <CardHeader className={cn(
                  'pb-3',
                  cardData.hasConflicts && 'bg-red-50 dark:bg-red-900/10',
                  cardData.totalUsers === 0 && 'bg-orange-50 dark:bg-orange-900/10'
                )}>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        {cardData.company.code}
                        {cardData.hasConflicts && (
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        )}
                      </CardTitle>
                      <CardDescription className="line-clamp-2">
                        {cardData.company.name}
                      </CardDescription>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={
                          cardData.coveragePercentage >= 80 ? 'default' :
                          cardData.coveragePercentage >= 50 ? 'secondary' : 'destructive'
                        }
                      >
                        {cardData.coveragePercentage}% Coverage
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{cardData.estates.length} estates</span>
                    <span>{cardData.totalUsers} assigned users</span>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Area Managers Section */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium flex items-center gap-2">
                        <Crown className="h-4 w-4 text-blue-600" />
                        Area Managers ({cardData.areaManagers.length})
                      </h4>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {/* TODO: Add Area Manager assignment */}}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {cardData.areaManagers.length > 0 ? (
                      <div className="space-y-2">
                        {cardData.areaManagers.map(areaManager => (
                          <div key={areaManager.id} className="flex items-center justify-between p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-blue-600 text-white text-xs">
                                  {getUserInitials(areaManager.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-sm">{areaManager.name}</p>
                                <p className="text-xs text-muted-foreground">{areaManager.email}</p>
                                <div className="flex items-center gap-1 mt-1">
                                  <Badge variant="outline" className="text-xs">
                                    {areaManager.assignedCompanies?.length || 0} companies
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Edit3 className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => onEditAssignment(areaManager.id)}>
                                  <Edit3 className="h-4 w-4 mr-2" />
                                  Edit Assignments
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => removeUserAssignment(areaManager.id, cardData.company.id, 'AREA_MANAGER')}
                                  className="text-red-600"
                                >
                                  <UserX className="h-4 w-4 mr-2" />
                                  Remove from Company
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-muted-foreground bg-gray-50 dark:bg-gray-900 rounded-lg">
                        <Crown className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No Area Managers assigned</p>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Managers Section */}
                  <Collapsible>
                    <CollapsibleTrigger asChild>
                      <Button 
                        variant="ghost" 
                        className="w-full justify-between p-0 h-auto"
                        onClick={() => toggleCardExpansion(cardData.company.id)}
                      >
                        <h4 className="font-medium flex items-center gap-2">
                          <Shield className="h-4 w-4 text-green-600" />
                          Managers ({cardData.managers.length})
                        </h4>
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent className="space-y-2 mt-2">
                      {cardData.managers.length > 0 ? (
                        <ScrollArea className="max-h-64">
                          <div className="space-y-2">
                            {cardData.managers.map(manager => {
                              const assignedCompanyEstates = cardData.estates.filter(estate =>
                                manager.assignedEstates?.includes(estate.id)
                              );
                              const hasReportingConflict = !cardData.areaManagers.some(am => 
                                am.id === manager.reportingToAreaManagerId
                              );

                              return (
                                <div key={manager.id} className={cn(
                                  'flex items-center justify-between p-2 rounded-lg',
                                  hasReportingConflict 
                                    ? 'bg-red-50 dark:bg-red-900/20' 
                                    : 'bg-green-50 dark:bg-green-900/20'
                                )}>
                                  <div className="flex items-center gap-3">
                                    <Avatar className="h-8 w-8">
                                      <AvatarFallback className={cn(
                                        'text-white text-xs',
                                        hasReportingConflict ? 'bg-red-600' : 'bg-green-600'
                                      )}>
                                        {getUserInitials(manager.name)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <p className="font-medium text-sm">{manager.name}</p>
                                      <p className="text-xs text-muted-foreground">{manager.email}</p>
                                      <div className="flex items-center gap-2 mt-1">
                                        <Badge variant="outline" className="text-xs">
                                          {assignedCompanyEstates.length} estates
                                        </Badge>
                                        {hasReportingConflict && (
                                          <Badge variant="destructive" className="text-xs">
                                            No AM oversight
                                          </Badge>
                                        )}
                                      </div>
                                      {manager.reportingToAreaManagerName && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                          Reports to: {manager.reportingToAreaManagerName}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm">
                                        <Edit3 className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => onEditAssignment(manager.id)}>
                                        <Edit3 className="h-4 w-4 mr-2" />
                                        Edit Assignments
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem 
                                        onClick={() => removeUserAssignment(manager.id, cardData.company.id, 'MANAGER')}
                                        className="text-red-600"
                                      >
                                        <UserX className="h-4 w-4 mr-2" />
                                        Remove from Company
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              );
                            })}
                          </div>
                        </ScrollArea>
                      ) : (
                        <div className="text-center py-4 text-muted-foreground bg-gray-50 dark:bg-gray-900 rounded-lg">
                          <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No Managers assigned</p>
                        </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Estates Overview */}
                  {isExpanded && cardData.estates.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="font-medium flex items-center gap-2 mb-2">
                          <MapPin className="h-4 w-4 text-purple-600" />
                          Estates ({cardData.estates.length})
                        </h4>
                        <div className="grid grid-cols-1 gap-2">
                          {cardData.estates.map(estate => {
                            const assignedManagers = cardData.managers.filter(manager =>
                              manager.assignedEstates?.includes(estate.id)
                            );
                            const hasAssignment = assignedManagers.length > 0;

                            return (
                              <div key={estate.id} className={cn(
                                'p-2 rounded border text-sm',
                                hasAssignment 
                                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                                  : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700'
                              )}>
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-medium">{estate.code} - {estate.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {estate.area} ha • {estate.location}
                                    </p>
                                  </div>
                                  {hasAssignment ? (
                                    <Badge variant="default" className="text-xs">
                                      <UserCheck className="h-3 w-3 mr-1" />
                                      {assignedManagers.length} manager{assignedManagers.length !== 1 ? 's' : ''}
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-xs">
                                      <UserX className="h-3 w-3 mr-1" />
                                      Unassigned
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}