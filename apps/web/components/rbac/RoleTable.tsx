'use client';

import React from 'react';
import {
    MoreHorizontal,
    Shield,
    Users,
    Database,
    Building,
    MapPin,
    Grid3x3,
    Edit,
    Trash2,
    Copy,
    Settings
} from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface RoleData {
    id: string;
    name: string;
    displayName: string;
    description: string;
    scope: 'COMPANY' | 'ESTATE' | 'DIVISION' | 'GLOBAL';
    usersCount: number;
    featuresCount: number;
    isSystem?: boolean;
}

interface RoleTableProps {
    roles: RoleData[];
    onEdit: (role: RoleData) => void;
    onDelete: (role: RoleData) => void;
    onManagePermissions: (role: RoleData) => void;
    onViewUsers: (role: RoleData) => void;
    onDuplicate: (role: RoleData) => void;
}

const ScopeBadge = ({ scope }: { scope: string }) => {
    const styles = {
        GLOBAL: "bg-purple-100 text-purple-700 border-purple-200",
        COMPANY: "bg-blue-100 text-blue-700 border-blue-200",
        ESTATE: "bg-emerald-100 text-emerald-700 border-emerald-200",
        DIVISION: "bg-orange-100 text-orange-700 border-orange-200",
    };

    const icons = {
        GLOBAL: Shield,
        COMPANY: Building,
        ESTATE: MapPin,
        DIVISION: Grid3x3,
    };

    const Icon = icons[scope as keyof typeof icons] || Shield;

    return (
        <Badge variant="outline" className={cn("gap-1.5 pl-1.5 pr-2.5 py-0.5", styles[scope as keyof typeof styles] || styles.GLOBAL)}>
            <Icon className="w-3 h-3" />
            <span className="text-[10px] font-semibold tracking-wide">{scope}</span>
        </Badge>
    );
};

export function RoleTable({
    roles,
    onEdit,
    onDelete,
    onManagePermissions,
    onViewUsers,
    onDuplicate
}: RoleTableProps) {
    return (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <Table>
                <TableHeader className="bg-gray-50/50">
                    <TableRow className="hover:bg-transparent">
                        <TableHead className="w-[250px]">Role Name</TableHead>
                        <TableHead className="w-[300px]">Description</TableHead>
                        <TableHead>Scope</TableHead>
                        <TableHead>Access</TableHead>
                        <TableHead>Users</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {roles.map((role) => (
                        <TableRow key={role.id} className="group hover:bg-gray-50/50 transition-colors">
                            <TableCell className="font-medium">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "p-2 rounded-lg transition-colors",
                                        role.isSystem ? "bg-purple-50 text-purple-600" : "bg-gray-100 text-gray-600 group-hover:bg-white group-hover:shadow-sm"
                                    )}>
                                        <Shield className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <div className="font-semibold text-gray-900">{role.displayName}</div>
                                        <div className="text-xs text-gray-500 font-mono mt-0.5">{role.name}</div>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell className="text-gray-600 text-sm max-w-[300px] truncate">
                                {role.description}
                            </TableCell>
                            <TableCell>
                                <ScopeBadge scope={role.scope} />
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-200">
                                        {role.featuresCount} Features
                                    </Badge>
                                    {role.scope !== 'GLOBAL' && (
                                        <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium px-2 py-0.5 bg-emerald-50 rounded-full border border-emerald-100">
                                            <Database className="w-3 h-3" />
                                            RLS
                                        </div>
                                    )}
                                </div>
                            </TableCell>
                            <TableCell>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                                    onClick={() => onViewUsers(role)}
                                >
                                    <Users className="w-4 h-4 mr-1.5" />
                                    {role.usersCount}
                                </Button>
                            </TableCell>
                            <TableCell className="text-right">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-900">
                                            <MoreHorizontal className="w-4 h-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48">
                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                        <DropdownMenuItem onClick={() => onEdit(role)}>
                                            <Edit className="w-4 h-4 mr-2" />
                                            Edit Role
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => onManagePermissions(role)}>
                                            <Settings className="w-4 h-4 mr-2" />
                                            Manage Permissions
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => onDuplicate(role)}>
                                            <Copy className="w-4 h-4 mr-2" />
                                            Duplicate
                                        </DropdownMenuItem>
                                        {!role.isSystem && (
                                            <>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                                    onClick={() => onDelete(role)}
                                                >
                                                    <Trash2 className="w-4 h-4 mr-2" />
                                                    Delete Role
                                                </DropdownMenuItem>
                                            </>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
