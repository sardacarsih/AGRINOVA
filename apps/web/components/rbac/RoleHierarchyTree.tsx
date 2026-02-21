'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight,
  ChevronDown,
  Users,
  Crown,
  Shield,
  Key,
  Edit,
  Trash2,
  Copy,
  Plus,
  MoreHorizontal,
  CircleAlert,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  RoleHierarchyTreeProps,
  TreeNodeState,
  Role,
  RoleHierarchyNode,
} from '@/types/rbac';

// Animation variants
const treeVariants = {
  hidden: { opacity: 0, height: 0 },
  visible: { opacity: 1, height: 'auto' },
  exit: { opacity: 0, height: 0 },
};

const nodeVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

// Role level colors and icons
const getRoleLevelConfig = (level: number) => {
  const configs = {
    1: { color: 'bg-purple-100 text-purple-800 border-purple-200', icon: Crown, label: 'Super Admin' },
    2: { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Shield, label: 'Area Manager' },
    3: { color: 'bg-green-100 text-green-800 border-green-200', icon: Users, label: 'Company Admin' },
    4: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Key, label: 'Manager' },
    5: { color: 'bg-gray-100 text-gray-800 border-gray-200', icon: Users, label: 'Operational' },
  };
  return configs[level as keyof typeof configs] || configs[5];
};

// Tree Node Component
interface TreeNodeProps {
  node: RoleHierarchyNode;
  level: number;
  isExpanded: boolean;
  isSelected: boolean;
  selectedRoleId?: string;
  onToggle: () => void;
  onSelect: () => void;
  onEdit: (roleId: string) => void;
  onDelete: (roleId: string) => void;
  onDuplicate: (roleId: string) => void;
  onAddChild: (parentId: string) => void;
  canManage: boolean;
}

const TreeNode: React.FC<TreeNodeProps> = ({
  node,
  level,
  isExpanded,
  isSelected,
  selectedRoleId,
  onToggle,
  onSelect,
  onEdit,
  onDelete,
  onDuplicate,
  onAddChild,
  canManage,
}) => {
  const hasChildren = node.children.length > 0;
  const levelConfig = getRoleLevelConfig(node.level);
  const LevelIcon = levelConfig.icon;

  return (
    <div className="select-none">
      <motion.div
        variants={nodeVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        transition={{ duration: 0.2, delay: level * 0.05 }}
        className={cn(
          'group flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all duration-200 hover:shadow-md',
          isSelected
            ? 'border-blue-500 bg-blue-50 shadow-sm'
            : 'border-gray-200 hover:border-gray-300 bg-white',
          !node.role.isActive && 'opacity-60'
        )}
      >
        {/* Expand/Collapse Button */}
        <Button
          variant="ghost"
          size="sm"
          className="w-6 h-6 p-0"
          onClick={onToggle}
          disabled={!hasChildren}
        >
          {hasChildren && (
            <motion.div
              animate={{ rotate: isExpanded ? 90 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronRight className="w-4 h-4" />
            </motion.div>
          )}
        </Button>

        {/* Role Avatar */}
        <Avatar className="w-8 h-8">
          <AvatarImage src={`/avatars/role-${node.role.name.toLowerCase()}.png`} />
          <AvatarFallback className={cn('text-xs font-semibold', levelConfig.color)}>
            {node.role.displayName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        {/* Role Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <LevelIcon className="w-4 h-4 text-gray-500" />
            <span className="font-semibold text-gray-900 truncate">
              {node.role.displayName}
            </span>
            <Badge variant="secondary" className="text-xs">
              Level {node.level}
            </Badge>
            {!node.role.isActive && (
              <Badge variant="destructive" className="text-xs">
                Inactive
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-4 mt-1">
            <span className="text-xs text-gray-500">({node.role.name})</span>
            <span className="text-xs text-gray-500">
              {node.permissions?.length || 0} permissions
            </span>
            {hasChildren && (
              <span className="text-xs text-gray-500">
                {node.children.length} children
              </span>
            )}
          </div>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-1">
          {node.role.isActive ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Active Role</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <XCircle className="w-4 h-4 text-red-500" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Inactive Role</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* Actions */}
        {canManage && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => onSelect()}>
                  <Users className="w-4 h-4 mr-2" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit(node.role.id)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Role
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDuplicate(node.role.id)}>
                  <Copy className="w-4 h-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onAddChild(node.role.id)}
                  disabled={node.level >= 5}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Child Role
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDelete(node.role.id)}
                  className="text-red-600 focus:text-red-600"
                  disabled={node.children.length > 0}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Role
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </motion.div>

      {/* Children */}
      <AnimatePresence>
        {isExpanded && hasChildren && (
          <motion.div
            variants={treeVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="ml-6 mt-1 space-y-1 border-l-2 border-gray-200 pl-4"
          >
            {node.children.map((child, index) => (
              <TreeNode
                key={child.role.id}
                node={child}
                level={level + 1}
                isExpanded={false} // TODO: Use expanded state
                isSelected={selectedRoleId === child.role.id}
                selectedRoleId={selectedRoleId}
                onToggle={() => {}} // TODO: Implement toggle
                onSelect={() => onSelect()}
                onEdit={onEdit}
                onDelete={onDelete}
                onDuplicate={onDuplicate}
                onAddChild={onAddChild}
                canManage={canManage}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Main RoleHierarchyTree Component
const RoleHierarchyTree: React.FC<RoleHierarchyTreeProps> = ({
  roles,
  hierarchy,
  selectedRoleId,
  expandedNodes,
  onNodeSelect,
  onNodeToggle,
  onRoleEdit,
  onRoleDelete,
  canManage,
  className,
}) => {
  const [localExpandedNodes, setLocalExpandedNodes] = useState<Set<string>>(expandedNodes);

  // Memoize role lookup
  const roleMap = useMemo(() => {
    const map = new Map<string, Role>();
    roles.forEach(role => map.set(role.id, role));
    return map;
  }, [roles]);

  // Toggle node expansion
  const handleToggle = useCallback((nodeId: string) => {
    setLocalExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
    onNodeToggle(nodeId);
  }, [onNodeToggle]);

  // Handle node selection
  const handleSelect = useCallback((nodeId: string) => {
    onNodeSelect(nodeId);
  }, [onNodeSelect]);

  // Handle role editing
  const handleEdit = useCallback((roleId: string) => {
    onRoleEdit(roleId);
  }, [onRoleEdit]);

  // Handle role deletion
  const handleDelete = useCallback((roleId: string) => {
    const role = roleMap.get(roleId);
    if (role && confirm(`Are you sure you want to delete the "${role.displayName}" role?`)) {
      onRoleDelete(roleId);
    }
  }, [roleMap, onRoleDelete]);

  // Handle role duplication
  const handleDuplicate = useCallback((roleId: string) => {
    const role = roleMap.get(roleId);
    if (role) {
      const newName = prompt(`Enter a name for the duplicated role:`, `${role.name}_copy`);
      if (newName) {
        // TODO: Implement role duplication
        console.log('Duplicating role:', roleId, 'as:', newName);
      }
    }
  }, [roleMap]);

  // Handle adding child role
  const handleAddChild = useCallback((parentId: string) => {
    const parentRole = roleMap.get(parentId);
    if (parentRole) {
      const childName = prompt(`Enter a name for the child role:`, `child_of_${parentRole.name}`);
      if (childName) {
        // TODO: Implement child role creation
        console.log('Adding child role to:', parentId, 'as:', childName);
      }
    }
  }, [roleMap]);

  // Expand/Collapse all
  const expandAll = useCallback(() => {
    const allNodeIds = roles.map(role => role.id);
    setLocalExpandedNodes(new Set(allNodeIds));
  }, [roles]);

  const collapseAll = useCallback(() => {
    setLocalExpandedNodes(new Set());
  }, []);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Role Hierarchy</h3>
          <p className="text-sm text-gray-600">
            {roles.length} roles • {hierarchy.length} root levels
          </p>
        </div>
        {canManage && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={expandAll}>
              Expand All
            </Button>
            <Button variant="outline" size="sm" onClick={collapseAll}>
              Collapse All
            </Button>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Role
            </Button>
          </div>
        )}
      </div>

      {/* Tree Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {hierarchy.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <CircleAlert className="w-12 h-12 mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Roles Found</h3>
            <p className="text-center text-gray-600 mb-4">
              Get started by creating your first role in the hierarchy.
            </p>
            {canManage && (
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Create First Role
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {hierarchy.map((node, index) => (
              <TreeNode
                key={node.role.id}
                node={node}
                level={1}
                isExpanded={localExpandedNodes.has(node.role.id)}
                isSelected={selectedRoleId === node.role.id}
                selectedRoleId={selectedRoleId}
                onToggle={() => handleToggle(node.role.id)}
                onSelect={() => handleSelect(node.role.id)}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onDuplicate={handleDuplicate}
                onAddChild={handleAddChild}
                canManage={canManage}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <div className="font-semibold text-gray-900">
              {roles.filter(r => r.isActive).length}
            </div>
            <div className="text-gray-600">Active</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-gray-900">
              {roles.filter(r => !r.isActive).length}
            </div>
            <div className="text-gray-600">Inactive</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-gray-900">
              {Math.max(...roles.map(r => r.level))}
            </div>
            <div className="text-gray-600">Max Level</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoleHierarchyTree;