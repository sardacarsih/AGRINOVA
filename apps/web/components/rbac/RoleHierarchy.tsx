'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, ChevronRight, ChevronDown, Users, Lock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface RoleNode {
    id: string;
    name: string;
    displayName: string;
    level: number;
    description: string;
    userCount: number;
    children?: RoleNode[];
}

interface RoleHierarchyProps {
    roles: RoleNode[];
    onRoleSelect?: (roleId: string) => void;
    selectedRoleId?: string;
}

const RoleTreeNode = ({
    node,
    level = 0,
    onSelect,
    isSelected
}: {
    node: RoleNode;
    level?: number;
    onSelect?: (id: string) => void;
    isSelected?: boolean;
}) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const hasChildren = node.children && node.children.length > 0;

    return (
        <div className="relative">
            <div
                className={cn(
                    "flex items-center p-3 rounded-lg cursor-pointer transition-all duration-200 border border-transparent",
                    isSelected ? "bg-emerald-50 border-emerald-200 shadow-sm" : "hover:bg-gray-50",
                    level > 0 && "ml-6"
                )}
                onClick={() => onSelect?.(node.id)}
            >
                {/* Connector lines for tree structure */}
                {level > 0 && (
                    <div className="absolute left-0 top-1/2 w-6 h-px bg-gray-200 -ml-6" />
                )}

                <div className="flex items-center flex-1 gap-3">
                    <div className="flex items-center justify-center w-6 h-6">
                        {hasChildren ? (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsExpanded(!isExpanded);
                                }}
                                className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                            >
                                {isExpanded ? (
                                    <ChevronDown className="w-4 h-4 text-gray-500" />
                                ) : (
                                    <ChevronRight className="w-4 h-4 text-gray-500" />
                                )}
                            </button>
                        ) : (
                            <div className="w-4" />
                        )}
                    </div>

                    <div className={cn(
                        "p-2 rounded-lg",
                        isSelected ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"
                    )}>
                        <Shield className="w-4 h-4" />
                    </div>

                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <span className={cn(
                                "font-medium text-sm",
                                isSelected ? "text-emerald-900" : "text-gray-900"
                            )}>
                                {node.displayName}
                            </span>
                            <Badge variant="outline" className="text-[10px] px-1.5 h-5 font-normal text-gray-500">
                                L{node.level}
                            </Badge>
                        </div>
                        <p className="text-xs text-gray-500 truncate max-w-[200px]">
                            {node.description}
                        </p>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-gray-500">
                        <div className="flex items-center gap-1" title="Assigned Users">
                            <Users className="w-3 h-3" />
                            <span>{node.userCount}</span>
                        </div>
                        {level === 0 && (
                            <div className="flex items-center gap-1 text-amber-600" title="Root Role">
                                <Lock className="w-3 h-3" />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Children */}
            {hasChildren && isExpanded && (
                <div className="relative">
                    {/* Vertical connector line */}
                    <div className="absolute left-3 top-0 bottom-0 w-px bg-gray-200" />
                    <div className="pt-1">
                        {node.children!.map((child) => (
                            <RoleTreeNode
                                key={child.id}
                                node={child}
                                level={level + 1}
                                onSelect={onSelect}
                                isSelected={isSelected} // Propagate selection logic if needed, or check child.id === selectedRoleId
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export function RoleHierarchy({ roles, onRoleSelect, selectedRoleId }: RoleHierarchyProps) {
    return (
        <Card className="h-full border-gray-200 shadow-sm">
            <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">Role Hierarchy</h3>
                    <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100">
                        Active
                    </Badge>
                </div>

                <div className="space-y-1">
                    {roles.map((role) => (
                        <RoleTreeNode
                            key={role.id}
                            node={role}
                            onSelect={onRoleSelect}
                            isSelected={selectedRoleId === role.id}
                        />
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
