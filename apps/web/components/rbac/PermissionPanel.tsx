'use client';

import React, { useState, useEffect } from 'react';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    SheetFooter,
    SheetClose
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
    Search,
    Save,
    RotateCcw,
    CheckCircle2,
    AlertTriangle
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { RoleData } from './RoleTable';

import { useQuery } from '@apollo/client/react/hooks';
import { GET_PERMISSIONS, GET_ROLE_PERMISSIONS } from '@/lib/apollo/queries/rbac';

interface Permission {
    id: string;
    name: string;
    description: string;
    category: string;
    isEnabled: boolean;
}

interface PermissionPanelProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    role: RoleData | null;
    onSave: (roleId: string, permissions: string[]) => Promise<void>;
}

export function PermissionPanel({
    open,
    onOpenChange,
    role,
    onSave
}: PermissionPanelProps) {
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    // Fetch all available permissions
    const { data: allPermissionsData, loading: loadingAll } = useQuery(GET_PERMISSIONS);

    // Fetch permissions for the selected role
    const { data: rolePermissionsData, loading: loadingRole } = useQuery(GET_ROLE_PERMISSIONS, {
        variables: { roleName: role?.name },
        skip: !role
    });

    // Initialize permissions state when data is loaded
    useEffect(() => {
        if (open && role && allPermissionsData?.permissions && rolePermissionsData) {
            const rolePerms = new Set(rolePermissionsData.rolePermissions || []);

            const mappedPermissions = allPermissionsData.permissions.map((p: any) => ({
                id: p.id,
                name: p.name,
                description: p.description,
                category: p.resource, // Using resource as category
                isEnabled: rolePerms.has(p.id)
            }));

            setPermissions(mappedPermissions);
            setHasChanges(false);
        }
    }, [open, role, allPermissionsData, rolePermissionsData]);

    const handleToggle = (id: string) => {
        setPermissions(prev => prev.map(p =>
            p.id === id ? { ...p, isEnabled: !p.isEnabled } : p
        ));
        setHasChanges(true);
    };

    const handleSave = async () => {
        if (!role) return;
        setIsSaving(true);
        try {
            const enabledIds = permissions.filter(p => p.isEnabled).map(p => p.id);
            await onSave(role.id, enabledIds);
            setHasChanges(false);
            onOpenChange(false);
        } catch (error) {
            console.error('Failed to save permissions', error);
        } finally {
            setIsSaving(false);
        }
    };

    const filteredPermissions = permissions.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const groupedPermissions = filteredPermissions.reduce((acc, curr) => {
        if (!acc[curr.category]) acc[curr.category] = [];
        acc[curr.category].push(curr);
        return acc;
    }, {} as Record<string, Permission[]>);

    if (!role) return null;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-[400px] sm:w-[540px] flex flex-col h-full p-0">
                <SheetHeader className="p-6 border-b border-gray-100 bg-gray-50/50">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-emerald-100 rounded-lg">
                            <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                        </div>
                        <div>
                            <SheetTitle>Manage Permissions</SheetTitle>
                            <SheetDescription>
                                Configure access for <span className="font-semibold text-gray-900">{role.displayName}</span>
                            </SheetDescription>
                        </div>
                    </div>

                    <div className="relative mt-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            placeholder="Search permissions..."
                            className="pl-9 bg-white"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </SheetHeader>

                <ScrollArea className="flex-1 p-6">
                    {loadingAll || loadingRole ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {Object.entries(groupedPermissions).map(([category, perms]) => (
                                <div key={category} className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                                            {category}
                                        </h4>
                                        <Badge variant="secondary" className="text-xs">
                                            {perms.filter(p => p.isEnabled).length}/{perms.length} Active
                                        </Badge>
                                    </div>
                                    <div className="grid gap-4">
                                        {perms.map((permission) => (
                                            <div
                                                key={permission.id}
                                                className="flex items-start justify-between p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-colors"
                                            >
                                                <div className="space-y-1">
                                                    <div className="font-medium text-sm text-gray-900">
                                                        {permission.name}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {permission.description}
                                                    </div>
                                                    <div className="text-[10px] text-gray-400 font-mono">
                                                        {permission.id}
                                                    </div>
                                                </div>
                                                <Switch
                                                    checked={permission.isEnabled}
                                                    onCheckedChange={() => handleToggle(permission.id)}
                                                    disabled={role.isSystem}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                    <Separator />
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>

                <SheetFooter className="p-6 border-t border-gray-100 bg-gray-50/50 gap-2">
                    {role.isSystem && (
                        <div className="flex items-center gap-2 text-amber-600 text-xs mr-auto">
                            <AlertTriangle className="w-4 h-4" />
                            System roles cannot be modified
                        </div>
                    )}
                    <SheetClose asChild>
                        <Button variant="outline">Cancel</Button>
                    </SheetClose>
                    <Button
                        onClick={handleSave}
                        disabled={!hasChanges || isSaving || role.isSystem}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
