'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Building, 
  MapPin, 
  Grid3x3, 
  Square, 
  Users,
  ChevronRight,
  ChevronDown,
  Search,
  Filter,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  UserCheck,
  Crown,
  Globe,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  MoreHorizontal
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Company, Estate, Divisi, Block, UserRole, USER_ROLE_LABELS } from '@/types/auth';

interface HierarchyNode {
  id: string;
  type: 'company' | 'estate' | 'divisi' | 'block';
  name: string;
  code: string;
  status: 'active' | 'inactive';
  children: HierarchyNode[];
  users: User[];
  metadata: {
    area?: number;
    location?: string;
    description?: string;
    palmCount?: number;
    plantingYear?: number;
  };
  // Multi-assignment tracking
  multiAssignmentUsers: User[];
  orphanedUsers: User[];
  reportingRelationships: {
    areaManagerId?: string;
    managerId?: string;
  };
}

interface OrganizationalHierarchyProps {
  companies: Company[];
  estates: Estate[];
  divisions: Divisi[];
  blocks: Block[];
  users: User[];
  onNodeSelect?: (node: HierarchyNode) => void;
  onUserSelect?: (user: User, node: HierarchyNode) => void;
  className?: string;
}

export function OrganizationalHierarchy({
  companies,
  estates,
  divisions,
  blocks,
  users,
  onNodeSelect,
  onUserSelect,
  className = ""
}: OrganizationalHierarchyProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['root']));
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    showInactive: true,
    showUsers: true,
    showMultiAssignments: true,
    showOrphanedUsers: true,
    roleFilter: 'all' as UserRole | 'all'
  });
  
  // Build hierarchical structure
  const hierarchyData = useMemo(() => {
    const buildHierarchy = (): HierarchyNode[] => {
      return companies.map(company => {
        const companyEstates = estates.filter(e => e.companyId === company.id);
        
        const companyNode: HierarchyNode = {
          id: company.id,
          type: 'company',
          name: company.name,
          code: company.code,
          status: company.isActive ? 'active' : 'inactive',
          children: [],
          users: [],
          metadata: {
            description: company.description
          },
          multiAssignmentUsers: [],
          orphanedUsers: [],
          reportingRelationships: {}
        };
        
        // Add estates
        companyNode.children = companyEstates.map(estate => {
          const estateDivisions = divisions.filter(d => d.estateId === estate.id);
          
          const estateNode: HierarchyNode = {
            id: estate.id,
            type: 'estate',
            name: estate.name,
            code: estate.code,
            status: estate.isActive ? 'active' : 'inactive',
            children: [],
            users: [],
            metadata: {
              area: estate.area,
              location: estate.location,
              description: estate.description
            },
            multiAssignmentUsers: [],
            orphanedUsers: [],
            reportingRelationships: {}
          };
          
          // Add divisions
          estateNode.children = estateDivisions.map(divisi => {
            const divisiBlocks = blocks.filter(b => b.divisiId === divisi.id);
            
            const divisiNode: HierarchyNode = {
              id: divisi.id,
              type: 'divisi',
              name: divisi.name,
              code: divisi.code,
              status: divisi.isActive ? 'active' : 'inactive',
              children: [],
              users: [],
              metadata: {
                area: divisi.area,
                description: divisi.description
              },
              multiAssignmentUsers: [],
              orphanedUsers: [],
              reportingRelationships: {}
            };
            
            // Add blocks
            divisiNode.children = divisiBlocks.map(block => ({
              id: block.id,
              type: 'block' as const,
              name: block.name,
              code: block.code,
              status: block.isActive ? 'active' : 'inactive',
              children: [],
              users: [],
              metadata: {
                area: block.area,
                palmCount: block.palmCount,
                plantingYear: block.plantingYear,
                description: block.description
              },
              multiAssignmentUsers: [],
              orphanedUsers: [],
              reportingRelationships: {}
            }));
            
            // Add users to division
            const divisiUsers = users.filter(u =>
              u.role === 'ASISTEN' && (
                u.divisi === divisi.name ||
                u.assignedDivisions?.includes(divisi.id)
              )
            );
            divisiNode.users = divisiUsers.filter(u => !u.assignedDivisions || u.assignedDivisions.length <= 1);
            divisiNode.multiAssignmentUsers = divisiUsers.filter(u => u.assignedDivisions && u.assignedDivisions.length > 1);

            // Add mandors to blocks
            divisiNode.children.forEach(blockNode => {
              const blockUsers = users.filter(u =>
                u.role === 'MANDOR' && u.divisi === divisi.name
              );
              blockNode.users = blockUsers;
            });

            return divisiNode;
          });

          // Add users to estate
          const estateUsers = users.filter(u =>
            u.role === 'MANAGER' && (
              u.estate === estate.name ||
              u.assignedEstates?.includes(estate.id)
            )
          );
          estateNode.users = estateUsers.filter(u => !u.assignedEstates || u.assignedEstates.length <= 1);
          estateNode.multiAssignmentUsers = estateUsers.filter(u => u.assignedEstates && u.assignedEstates.length > 1);
          
          return estateNode;
        });
        
        // Add company-level users
        const companyUsers = users.filter(u => 
          u.companyId === company.id && 
          ['COMPANY_ADMIN', 'AREA_MANAGER'].includes(u.role)
        );
        
        companyNode.users = companyUsers.filter(u => u.role === 'COMPANY_ADMIN');
        
        // Area managers with multi-company assignments
        const areaManagers = companyUsers.filter(u => u.role === 'AREA_MANAGER');
        companyNode.multiAssignmentUsers = areaManagers.filter(u => 
          u.assignedCompanies && u.assignedCompanies.length > 1
        );
        
        // Single company area managers
        companyNode.users.push(...areaManagers.filter(u => 
          !u.assignedCompanies || u.assignedCompanies.length <= 1
        ));
        
        return companyNode;
      });
    };
    
    return buildHierarchy();
  }, [companies, estates, divisions, blocks, users]);
  
  // Filter and search functionality
  const filteredHierarchy = useMemo(() => {
    const filterNode = (node: HierarchyNode): HierarchyNode | null => {
      const query = searchQuery.toLowerCase();
      
      // Check if node matches search
      const nodeMatches = !query || 
        node.name.toLowerCase().includes(query) ||
        node.code.toLowerCase().includes(query);
      
      // Filter users
      const filteredUsers = node.users.filter(user => {
        const userMatches = !query || 
          user.name.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query) ||
          user.employeeId?.toLowerCase().includes(query);
        
        const roleMatches = filters.roleFilter === 'all' || user.role === filters.roleFilter;
        const statusMatches = filters.showInactive || user.status !== 'inactive';
        
        return userMatches && roleMatches && statusMatches;
      });
      
      // Filter multi-assignment users
      const filteredMultiUsers = filters.showMultiAssignments ? 
        node.multiAssignmentUsers.filter(user => {
          const userMatches = !query || 
            user.name.toLowerCase().includes(query) ||
            user.email.toLowerCase().includes(query) ||
            user.employeeId?.toLowerCase().includes(query);
          
          const roleMatches = filters.roleFilter === 'all' || user.role === filters.roleFilter;
          
          return userMatches && roleMatches;
        }) : [];
      
      // Recursively filter children
      const filteredChildren = node.children
        .map(child => filterNode(child))
        .filter(Boolean) as HierarchyNode[];
      
      // Include node if it matches or has matching children/users
      const hasContent = nodeMatches || 
        filteredUsers.length > 0 || 
        filteredMultiUsers.length > 0 ||
        filteredChildren.length > 0;
      
      if (!hasContent) return null;
      
      // Check status filter
      if (!filters.showInactive && node.status === 'inactive') {
        // Still include if it has active children
        if (filteredChildren.length === 0) return null;
      }
      
      return {
        ...node,
        users: filters.showUsers ? filteredUsers : [],
        multiAssignmentUsers: filteredMultiUsers,
        children: filteredChildren
      };
    };
    
    return hierarchyData
      .map(node => filterNode(node))
      .filter(Boolean) as HierarchyNode[];
  }, [hierarchyData, searchQuery, filters]);
  
  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };
  
  const expandAll = () => {
    const allNodeIds = new Set<string>();
    
    const collectIds = (nodes: HierarchyNode[]) => {
      nodes.forEach(node => {
        allNodeIds.add(node.id);
        collectIds(node.children);
      });
    };
    
    collectIds(hierarchyData);
    setExpandedNodes(allNodeIds);
  };
  
  const collapseAll = () => {
    setExpandedNodes(new Set());
  };
  
  const getNodeIcon = (type: HierarchyNode['type']) => {
    switch (type) {
      case 'company': return Building;
      case 'estate': return MapPin;
      case 'divisi': return Grid3x3;
      case 'block': return Square;
    }
  };
  
  const getNodeColor = (type: HierarchyNode['type'], status: string) => {
    const baseColors = {
      company: status === 'active' ? 'text-blue-600 bg-blue-100 border-blue-200' : 'text-gray-400 bg-gray-100 border-gray-200',
      estate: status === 'active' ? 'text-green-600 bg-green-100 border-green-200' : 'text-gray-400 bg-gray-100 border-gray-200',
      divisi: status === 'active' ? 'text-purple-600 bg-purple-100 border-purple-200' : 'text-gray-400 bg-gray-100 border-gray-200',
      block: status === 'active' ? 'text-orange-600 bg-orange-100 border-orange-200' : 'text-gray-400 bg-gray-100 border-gray-200'
    };
    
    return baseColors[type];
  };
  
  const getUserRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'SUPER_ADMIN': return Crown;
      case 'COMPANY_ADMIN': return Building;
      case 'AREA_MANAGER': return Globe;
      case 'MANAGER': return MapPin;
      case 'ASISTEN': return UserCheck;
      case 'MANDOR': return Users;
      case 'SATPAM': return Shield;
      case 'TIMBANGAN': return Users;
      case 'GRADING': return Users;
    }
  };

  const getUserRoleColor = (role: UserRole) => {
    switch (role) {
      case 'SUPER_ADMIN': return 'text-purple-600 bg-purple-100';
      case 'COMPANY_ADMIN': return 'text-blue-600 bg-blue-100';
      case 'AREA_MANAGER': return 'text-indigo-600 bg-indigo-100';
      case 'MANAGER': return 'text-green-600 bg-green-100';
      case 'ASISTEN': return 'text-yellow-600 bg-yellow-100';
      case 'MANDOR': return 'text-orange-600 bg-orange-100';
      case 'SATPAM': return 'text-red-600 bg-red-100';
      case 'TIMBANGAN': return 'text-cyan-600 bg-cyan-100';
      case 'GRADING': return 'text-pink-600 bg-pink-100';
    }
  };
  
  const getUserStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return CheckCircle;
      case 'inactive': return XCircle;
      case 'suspended': return AlertTriangle;
      default: return Users;
    }
  };

  const renderNode = (node: HierarchyNode, depth: number = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children.length > 0;
    const NodeIcon = getNodeIcon(node.type);
    const isSelected = selectedNode === node.id;
    
    return (
      <motion.div
        key={node.id}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className={`ml-${depth * 4}`}
      >
        {/* Node Header */}
        <div
          className={`flex items-center space-x-2 p-2 rounded-lg cursor-pointer transition-colors hover:bg-gray-50 ${
            isSelected ? 'bg-blue-50 border border-blue-200' : ''
          }`}
          onClick={() => {
            setSelectedNode(node.id);
            onNodeSelect?.(node);
          }}
        >
          {/* Expand/Collapse Button */}
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleNode(node.id);
              }}
              className="w-4 h-4 flex items-center justify-center hover:bg-gray-200 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </button>
          )}
          
          {/* Node Icon */}
          <div className={`w-6 h-6 rounded flex items-center justify-center ${getNodeColor(node.type, node.status)}`}>
            <NodeIcon className="h-4 w-4" />
          </div>
          
          {/* Node Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <span className="font-medium text-sm truncate">{node.name}</span>
              <Badge variant="outline" className="text-xs">
                {node.code}
              </Badge>
              {node.status === 'inactive' && (
                <Badge variant="destructive" className="text-xs">
                  Inactive
                </Badge>
              )}
            </div>
            
            {/* Node Metadata */}
            {(node.metadata.area || node.metadata.location) && (
              <div className="text-xs text-gray-500 truncate">
                {node.metadata.area && `${node.metadata.area} ha`}
                {node.metadata.area && node.metadata.location && ' • '}
                {node.metadata.location}
              </div>
            )}
          </div>
          
          {/* Node Stats */}
          <div className="flex items-center space-x-1 text-xs text-gray-500">
            {hasChildren && (
              <span>{node.children.length} {node.type === 'company' ? 'estates' : 
                node.type === 'estate' ? 'divisions' : 
                node.type === 'divisi' ? 'blocks' : 'items'}</span>
            )}
            
            {(node.users.length > 0 || node.multiAssignmentUsers.length > 0) && (
              <span className="ml-2">
                {node.users.length + node.multiAssignmentUsers.length} users
              </span>
            )}
          </div>
        </div>
        
        {/* Users */}
        {filters.showUsers && isExpanded && (node.users.length > 0 || node.multiAssignmentUsers.length > 0) && (
          <div className={`ml-${(depth + 1) * 4} space-y-1 mt-2`}>
            {/* Regular Users */}
            {node.users.map(user => {
              const RoleIcon = getUserRoleIcon(user.role);
              const StatusIcon = getUserStatusIcon(user.status || 'active');
              
              return (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center space-x-2 p-2 bg-white border border-gray-100 rounded cursor-pointer hover:bg-gray-50"
                  onClick={() => onUserSelect?.(user, node)}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${getUserRoleColor(user.role)}`}>
                    <RoleIcon className="h-3 w-3" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-sm truncate">{user.name}</span>
                      <StatusIcon className={`h-3 w-3 ${
                        user.status === 'active' ? 'text-green-600' :
                        user.status === 'inactive' ? 'text-gray-400' : 'text-red-600'
                      }`} />
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {user.employeeId} • {USER_ROLE_LABELS[user.role]}
                    </div>
                  </div>
                  
                  <Badge variant="secondary" className="text-xs">
                    {USER_ROLE_LABELS[user.role]}
                  </Badge>
                </motion.div>
              );
            })}
            
            {/* Multi-Assignment Users */}
            {node.multiAssignmentUsers.map(user => {
              const RoleIcon = getUserRoleIcon(user.role);
              const StatusIcon = getUserStatusIcon(user.status || 'active');
              
              return (
                <motion.div
                  key={`multi-${user.id}`}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center space-x-2 p-2 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded cursor-pointer hover:from-blue-100 hover:to-purple-100"
                  onClick={() => onUserSelect?.(user, node)}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${getUserRoleColor(user.role)} ring-2 ring-blue-300`}>
                    <RoleIcon className="h-3 w-3" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-sm truncate">{user.name}</span>
                      <StatusIcon className={`h-3 w-3 ${
                        user.status === 'active' ? 'text-green-600' :
                        user.status === 'inactive' ? 'text-gray-400' : 'text-red-600'
                      }`} />
                      <Badge className="bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 text-xs">
                        Multi-Assigned
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {user.employeeId} • {USER_ROLE_LABELS[user.role]}
                    </div>
                    
                    {/* Multi-assignment details */}
                    {user.assignedCompanies && (
                      <div className="text-xs text-blue-600 truncate">
                        {user.assignedCompanies.length} companies assigned
                      </div>
                    )}
                    {user.assignedEstates && (
                      <div className="text-xs text-blue-600 truncate">
                        {user.assignedEstates.length} estates assigned
                      </div>
                    )}
                    {user.assignedDivisions && (
                      <div className="text-xs text-blue-600 truncate">
                        {user.assignedDivisions.length} divisions assigned
                      </div>
                    )}
                  </div>
                  
                  <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs">
                    {USER_ROLE_LABELS[user.role]}
                  </Badge>
                </motion.div>
              );
            })}
          </div>
        )}
        
        {/* Children */}
        <AnimatePresence>
          {isExpanded && hasChildren && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              {node.children.map(child => renderNode(child, depth + 1))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search organizations, users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-1" />
            Filters
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={expandAll}
          >
            <Maximize2 className="h-4 w-4 mr-1" />
            Expand All
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={collapseAll}
          >
            <Minimize2 className="h-4 w-4 mr-1" />
            Collapse All
          </Button>
        </div>
      </div>
      
      {/* Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border border-gray-200 rounded-lg p-4 bg-gray-50"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filters.showInactive}
                  onChange={(e) => setFilters(prev => ({ ...prev, showInactive: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <span className="text-sm">Show Inactive</span>
              </label>
              
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filters.showUsers}
                  onChange={(e) => setFilters(prev => ({ ...prev, showUsers: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <span className="text-sm">Show Users</span>
              </label>
              
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filters.showMultiAssignments}
                  onChange={(e) => setFilters(prev => ({ ...prev, showMultiAssignments: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <span className="text-sm">Show Multi-Assignments</span>
              </label>
              
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filters.showOrphanedUsers}
                  onChange={(e) => setFilters(prev => ({ ...prev, showOrphanedUsers: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <span className="text-sm">Show Orphaned Users</span>
              </label>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Hierarchy Tree */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Building className="h-5 w-5" />
            <span>Organizational Hierarchy</span>
          </CardTitle>
          <CardDescription>
            Complete organizational structure with user assignments and multi-role relationships
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1 max-h-[600px] overflow-y-auto">
            {filteredHierarchy.length > 0 ? (
              filteredHierarchy.map(node => renderNode(node))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Building className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p>No organizations match your search criteria</p>
                <p className="text-sm">Try adjusting your filters or search query</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}