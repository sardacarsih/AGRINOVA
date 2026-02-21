'use client';

import React, { useState, useEffect, useMemo, Fragment } from 'react';
import { useQuery, useMutation } from '@apollo/client/react/hooks';
import { GET_ROLE_PERMISSION_MATRIX, GET_ROLE_PERMISSIONS, ASSIGN_ROLE_PERMISSIONS } from '@/lib/apollo/queries/rbac';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { Loader2, Save, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface Role {
    id: string;
    name: string;
    displayName: string;
    level: number;
}

interface Permission {
    id: string;
    name: string;
    resource: string;
    description: string;
}

export function PermissionMatrix() {
    const { data: matrixData, loading: matrixLoading } = useQuery(
        GET_ROLE_PERMISSION_MATRIX,
        {
            variables: {
                activeOnly: true
            }
        }
    );

    // Matrix state: roleId -> Set of permissionIds
    const [matrix, setMatrix] = useState<Record<string, Set<string>>>({});
    const [changedRoles, setChangedRoles] = useState<Set<string>>(new Set());

    // Search & Filter state
    const [searchQuery, setSearchQuery] = useState('');
    const [resourceFilter, setResourceFilter] = useState<string[]>([]);
    const [showInheritedOnly, setShowInheritedOnly] = useState(false);

    const [assignRolePermissions] = useMutation(ASSIGN_ROLE_PERMISSIONS);

    const roles: Role[] = matrixData?.roles || [];
    const permissions: Permission[] = matrixData?.permissions || [];

    // Group permissions by resource
    const groupedPermissions = permissions.reduce((acc, curr) => {
        if (!acc[curr.resource]) acc[curr.resource] = [];
        acc[curr.resource].push(curr);
        return acc;
    }, {} as Record<string, Permission[]>);

    // Get unique resources for filter
    const uniqueResources = Object.keys(groupedPermissions);

    // Filter permissions based on search and resource filter
    const filteredPermissions = useMemo(() => {
        return Object.entries(groupedPermissions).reduce((acc, [resource, perms]) => {
            // Resource filter
            if (resourceFilter.length > 0 && !resourceFilter.includes(resource)) {
                return acc;
            }

            // Search filter
            const filtered = perms.filter(p => {
                if (!searchQuery) return true;
                const query = searchQuery.toLowerCase();
                return (
                    p.name.toLowerCase().includes(query) ||
                    p.resource.toLowerCase().includes(query) ||
                    p.description?.toLowerCase().includes(query)
                );
            });

            if (filtered.length > 0) {
                acc[resource] = filtered;
            }

            return acc;
        }, {} as Record<string, Permission[]>);
    }, [groupedPermissions, searchQuery, resourceFilter]);

    // Initialize empty matrix - permissions will be loaded when toggled
    useEffect(() => {
        // Initialize empty matrix for all roles
        const newMatrix: Record<string, Set<string>> = {};
        roles.forEach(role => {
            newMatrix[role.id] = new Set();
        });
        setMatrix(newMatrix);
    }, [roles]);

    const handleToggle = (roleId: string, permissionId: string) => {
        setMatrix(prev => {
            const rolePerms = new Set(prev[roleId]);
            if (rolePerms.has(permissionId)) {
                rolePerms.delete(permissionId);
            } else {
                rolePerms.add(permissionId);
            }
            return { ...prev, [roleId]: rolePerms };
        });
        setChangedRoles(prev => new Set(prev).add(roleId));
    };

    const handleSave = async () => {
        try {
            await Promise.all(Array.from(changedRoles).map(async (roleId) => {
                const perms = Array.from(matrix[roleId] || []);
                await assignRolePermissions({
                    variables: {
                        input: {
                            roleId,
                            permissions: perms
                        }
                    }
                });
            }));
            toast.success("Permissions updated successfully");
            setChangedRoles(new Set());
        } catch (error: any) {
            toast.error(`Failed to save changes: ${error.message}`);
        }
    };

    if (matrixLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200">
                <div>
                    <h3 className="font-medium text-gray-900">Permission Matrix</h3>
                    <p className="text-sm text-gray-500">Manage permissions across all roles</p>
                </div>
                <Button
                    onClick={handleSave}
                    disabled={changedRoles.size === 0}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                </Button>
            </div>

            {/* Search & Filter UI */}
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        placeholder="Cari permissions..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>

                <div className="flex items-center gap-2">
                    {uniqueResources.map(resource => (
                        <Badge
                            key={resource}
                            variant={resourceFilter.includes(resource) ? "default" : "outline"}
                            className="cursor-pointer"
                            onClick={() => {
                                setResourceFilter(prev =>
                                    prev.includes(resource)
                                        ? prev.filter(r => r !== resource)
                                        : [...prev, resource]
                                );
                            }}
                        >
                            {resource}
                        </Badge>
                    ))}
                    {resourceFilter.length > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setResourceFilter([])}
                            className="text-xs"
                        >
                            Clear Filters
                        </Button>
                    )}
                </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 text-xs text-gray-600 bg-white p-3 rounded-lg border border-gray-200">
                <span className="font-medium">Legend:</span>
                <div className="flex items-center gap-2">
                    <Checkbox checked disabled className="data-[state=checked]:bg-emerald-600" />
                    <span>Permission Granted</span>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <ScrollArea className="h-[600px]">
                    <Table>
                        <TableHeader className="bg-gray-50 sticky top-0 z-10">
                            <TableRow>
                                <TableHead className="w-[300px] bg-gray-50">Permission / Resource</TableHead>
                                {roles.map(role => (
                                    <TableHead key={role.id} className="text-center min-w-[100px] bg-gray-50">
                                        <div className="flex flex-col items-center">
                                            <span className="font-medium text-gray-900">{role.displayName}</span>
                                            <Badge variant="outline" className="mt-1 text-[10px] font-normal">
                                                Lvl {role.level}
                                            </Badge>
                                        </div>
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {Object.entries(filteredPermissions).map(([resource, perms]) => (
                                <Fragment key={resource}>
                                    <TableRow className="bg-gray-50/50">
                                        <TableCell colSpan={roles.length + 1} className="font-semibold text-gray-900 py-2">
                                            {resource}
                                        </TableCell>
                                    </TableRow>
                                    {perms.map(permission => (
                                        <TableRow key={permission.id} className="hover:bg-gray-50">
                                            <TableCell className="font-medium text-sm text-gray-700">
                                                <div className="flex flex-col">
                                                    <span>{permission.name}</span>
                                                    <span className="text-xs text-gray-400 font-normal">{permission.description}</span>
                                                </div>
                                            </TableCell>
                                            {roles.map(role => {
                                                const cellKey = `${role.id}-${permission.id}`;
                                                const hasPermission = matrix[role.id]?.has(permission.id) ?? false;
                                                const isDirect = true; // Simplified - all permissions are direct now

                                                return (
                                                    <TableCell key={cellKey} className="text-center">
                                                        <TooltipProvider>
                                                            <div className="relative flex items-center justify-center">
                                                                <Checkbox
                                                                    checked={hasPermission}
                                                                    onCheckedChange={() => handleToggle(role.id, permission.id)}
                                                                    disabled={!isDirect || role.level <= 1}
                                                                    className={cn(
                                                                        "data-[state=checked]:border-emerald-600",
                                                                        isDirect
                                                                            ? "data-[state=checked]:bg-emerald-600"
                                                                            : "data-[state=checked]:bg-emerald-300 opacity-60"
                                                                    )}
                                                                />

                                                            </div>
                                                        </TooltipProvider>
                                                    </TableCell>
                                                );
                                            })}
                                        </TableRow>
                                    ))}
                                </Fragment>
                            ))}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </div>
        </div>
    );
}
