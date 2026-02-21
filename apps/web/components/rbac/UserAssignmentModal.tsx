import React, { useState, useEffect, useMemo } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Search,
    Mail,
    Phone,
    Loader2,
    UserPlus,
    ArrowLeft,
    Check,
    Users,
    Building,
    MapPin,
    Grid3x3,
    Filter,
    Download,
    Upload,
    CircleAlert,
    CheckCircle,
    XCircle,
    Clock,
    Calendar
} from 'lucide-react';
import { RoleData } from './RoleTable';
import { useQuery, useMutation, useLazyQuery } from '@apollo/client/react/hooks';
import {
    GET_USERS,
    UPDATE_USER,
    GET_ACCESSIBLE_COMPANIES,
    GET_COMPANY_ESTATES,
    GET_ESTATE_DIVISIONS
} from '@/lib/apollo/queries/users';
import { GET_RBAC_STATS, GET_USER_PERMISSION_OVERRIDES } from '@/lib/apollo/queries/rbac';
import { toast } from 'sonner';

interface User {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    department?: string;
    role?: string;
    username?: string;
    position?: string;
    companyId?: string;
    company?: {
        id: string;
        name: string;
        status: string;
    };
    assignedEstates?: string[];
    assignedEstateNames?: string[];
    assignedDivisions?: string[];
    assignedDivisionNames?: string[];
    assignedCompanies?: string[];
    assignedCompanyNames?: string[];
    isActive: boolean;
    lastLogin?: string;
    createdAt: string;
}

interface AssignmentScope {
    type: 'company' | 'estate' | 'division' | 'block';
    id: string;
    name: string;
}

interface BulkAssignmentProgress {
    total: number;
    completed: number;
    failed: number;
    current: string;
}

interface UserAssignmentModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    role: RoleData | null;
}

export function UserAssignmentModal({
    open,
    onOpenChange,
    role
}: UserAssignmentModalProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [searchDebounce, setSearchDebounce] = useState('');

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setSearchDebounce(searchQuery);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Query for users currently in the role
    const { data: currentUsersData, loading: currentLoading, refetch: refetchCurrent } = useQuery(GET_USERS, {
        variables: {
            role: role?.name,
            search: !isAdding ? searchDebounce : undefined
        },
        skip: !role || isAdding
    });

    // Query for searching potential users to add
    const { data: searchUsersData, loading: searchLoading } = useQuery(GET_USERS, {
        variables: {
            search: searchDebounce,
            limit: 10
        },
        skip: !role || !isAdding || !searchDebounce
    });

    const [updateUser, { loading: updateLoading }] = useMutation(UPDATE_USER);

    const handleAssignUser = async (userId: string, currentRole: string) => {
        if (!role) return;

        if (currentRole === role.name) {
            toast.info("User is already assigned to this role");
            return;
        }

        try {
            await updateUser({
                variables: {
                    input: {
                        id: userId,
                        role: role.name
                    }
                }
            });
            toast.success("User assigned successfully");
            refetchCurrent();
            setIsAdding(false);
            setSearchQuery('');
        } catch (error: any) {
            toast.error(`Failed to assign user: ${error.message}`);
        }
    };

    if (!role) return null;

    const users = isAdding
        ? (searchUsersData?.users?.users || [])
        : (currentUsersData?.users?.users || []);

    const loading = isAdding ? searchLoading : currentLoading;

    const handleClose = () => {
        setIsAdding(false);
        setSearchQuery('');
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <DialogTitle>{isAdding ? 'Assign User' : 'Assigned Users'}</DialogTitle>
                        {!isAdding && (
                            <Button size="sm" onClick={() => setIsAdding(true)} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                                <UserPlus className="w-4 h-4" />
                                Add User
                            </Button>
                        )}
                        {isAdding && (
                            <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)} className="gap-2">
                                <ArrowLeft className="w-4 h-4" />
                                Back to List
                            </Button>
                        )}
                    </div>
                    <DialogDescription>
                        {isAdding
                            ? `Search for users to assign to the ${role.displayName} role.`
                            : `Users currently assigned to the ${role.displayName} role.`
                        }
                    </DialogDescription>
                </DialogHeader>

                <div className="relative my-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        placeholder={isAdding ? "Search by name or email..." : "Filter users..."}
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <ScrollArea className="h-[300px] pr-4">
                    <div className="space-y-4">
                        {loading ? (
                            <div className="flex items-center justify-center h-32">
                                <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                            </div>
                        ) : users.length > 0 ? (
                            users.map((user: any) => (
                                <div key={user.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                                    <div className="flex items-center gap-3">
                                        <Avatar>
                                            <AvatarImage src={user.avatar} />
                                            <AvatarFallback className="bg-emerald-100 text-emerald-700">
                                                {user.name?.charAt(0) || user.username?.charAt(0)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <div className="font-medium text-sm text-gray-900">{user.name || user.username}</div>
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <Mail className="w-3 h-3" />
                                                {user.email || 'No email'}
                                            </div>
                                        </div>
                                    </div>

                                    {isAdding ? (
                                        <Button
                                            size="sm"
                                            variant={user.role === role.name ? "secondary" : "default"}
                                            className={user.role === role.name ? "bg-gray-100 text-gray-500" : "bg-emerald-600 hover:bg-emerald-700"}
                                            disabled={user.role === role.name || updateLoading}
                                            onClick={() => handleAssignUser(user.id, user.role)}
                                        >
                                            {user.role === role.name ? (
                                                <span className="flex items-center gap-1">
                                                    <Check className="w-3 h-3" /> Assigned
                                                </span>
                                            ) : (
                                                "Assign"
                                            )}
                                        </Button>
                                    ) : (
                                        <Badge variant="outline" className="text-xs">
                                            {user.position || 'General'}
                                        </Badge>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-gray-500 text-sm">
                                {isAdding && !searchDebounce
                                    ? "Type to search for users..."
                                    : "No users found matching your search."}
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
