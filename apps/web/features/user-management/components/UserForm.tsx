'use client';

import { useEffect, useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import {
    CircleAlert,
    UserCog,
    UserCheck,
    Save,
    Shield,
    Building2,
    KeyRound,
    Loader2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { MultiSelect } from '@/components/ui/multi-select';
import { Badge } from '@/components/ui/badge';
import { GetUsersDocument, User, UserRole } from '@/gql/graphql';
import { LOGIN_PASSWORD_MIN_LENGTH } from '@/lib/auth/validation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useEstates } from '@/features/master-data/hooks/useEstates';
import { useDivisions } from '@/features/master-data/hooks/useDivisions';
import { useAuth } from '@/hooks/use-auth';

const ROLE_REQUIRES_COMPANY = new Set<UserRole>([
    UserRole.CompanyAdmin,
    UserRole.AreaManager,
    UserRole.Manager,
    UserRole.Asisten,
    UserRole.Mandor,
    UserRole.Satpam,
    UserRole.Grading,
    UserRole.Timbangan,
]);

const ROLE_REQUIRES_ESTATE = new Set<UserRole>([
    UserRole.Manager,
    UserRole.Asisten,
    UserRole.Mandor,
]);

const ROLE_REQUIRES_DIVISION = new Set<UserRole>([
    UserRole.Asisten,
    UserRole.Mandor,
]);

const ROLE_ALLOWED_MANAGER_ROLES: Record<UserRole, UserRole[]> = {
    [UserRole.SuperAdmin]: [],
    [UserRole.CompanyAdmin]: [UserRole.SuperAdmin],
    [UserRole.AreaManager]: [UserRole.CompanyAdmin],
    [UserRole.Manager]: [UserRole.AreaManager],
    [UserRole.Asisten]: [UserRole.Manager],
    [UserRole.Mandor]: [UserRole.Asisten],
    [UserRole.Satpam]: [UserRole.Manager],
    [UserRole.Timbangan]: [UserRole.Manager],
    [UserRole.Grading]: [UserRole.Manager],
};

const ROLE_ALLOW_EMPTY_MANAGER = new Set<UserRole>([
    UserRole.AreaManager,
]);

const normalizeIds = (ids?: Array<string | null | undefined> | null): string[] => {
    const cleaned = (ids || [])
        .filter((id): id is string => typeof id === 'string')
        .map((id) => id.trim())
        .filter((id) => id.length > 0);

    return Array.from(new Set(cleaned));
};

const areSameIds = (a: string[], b: string[]): boolean =>
    a.length === b.length && a.every((value, index) => value === b[index]);

// Schema Validation
const userFormSchema = z.object({
    name: z.string().min(2, 'Nama harus diisi'),
    username: z.string().min(3, 'Username minimal 3 karakter'),
    email: z.string().email('Format email tidak valid').optional().or(z.literal('')),
    phoneNumber: z.string().optional(),
    password: z
        .string()
        .optional()
        .refine(
            (value) => !value || value.trim().length >= LOGIN_PASSWORD_MIN_LENGTH,
            `Password minimal ${LOGIN_PASSWORD_MIN_LENGTH} karakter`
        ),
    role: z.nativeEnum(UserRole),
    managerId: z.string().optional().nullable(),
    companyIds: z.array(z.string()).optional(),
    estateIds: z.array(z.string()).optional(),
    divisionIds: z.array(z.string()).optional(),
    isActive: z.boolean(),
}).superRefine((values, ctx) => {
    const companyIds = normalizeIds(values.companyIds);
    const estateIds = normalizeIds(values.estateIds);
    const divisionIds = normalizeIds(values.divisionIds);

    if (ROLE_REQUIRES_COMPANY.has(values.role) && companyIds.length === 0) {
        const message =
            values.role === UserRole.AreaManager
                ? 'Role AREA_MANAGER wajib minimal 1 company'
                : `Role ${values.role} wajib ada company`;
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message,
            path: ['companyIds'],
        });
    }

    if (values.role === UserRole.Manager && companyIds.length !== 1) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Role MANAGER wajib tepat 1 company',
            path: ['companyIds'],
        });
    }

    if (ROLE_REQUIRES_ESTATE.has(values.role) && estateIds.length === 0) {
        const message =
            values.role === UserRole.Manager
                ? 'Role MANAGER wajib minimal 1 estate'
                : `Role ${values.role} wajib ada estate`;
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message,
            path: ['estateIds'],
        });
    }

    if (ROLE_REQUIRES_DIVISION.has(values.role) && divisionIds.length === 0) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Role ${values.role} wajib ada divisi`,
            path: ['divisionIds'],
        });
    }

    if (!ROLE_ALLOW_EMPTY_MANAGER.has(values.role) && !values.managerId) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Atasan langsung wajib diisi untuk role ${values.role}`,
            path: ['managerId'],
        });
    }
});

type CompanyOption = {
    id: string;
    name: string;
    code?: string | null;
};

type RoleOption = {
    role: UserRole;
    name: string;
    description?: string | null;
    level?: number | null;
};

interface UserFormProps {
    initialData?: User | null;
    companies: CompanyOption[];
    roles: RoleOption[];
    users: User[];
    companySelectionReadOnly?: boolean;
    isProcessing: boolean;
    onSubmit: (values: any) => Promise<boolean> | boolean;
    onCancel: () => void;
    title?: string;
    description?: string;
}

const extractEntityIds = (items?: Array<{ id?: string | null }> | null): string[] => {
    return (items || [])
        .map((item) => item?.id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
        .map((id) => id.trim())
        .filter((id) => id.length > 0);
};

export function UserForm({
    initialData,
    companies,
    roles,
    users,
    companySelectionReadOnly = false,
    isProcessing,
    onSubmit,
    onCancel,
    title,
    description,
}: UserFormProps) {
    const { user: currentUser } = useAuth();
    const isEditing = Boolean(initialData?.id);
    const companyIdsInputKey = JSON.stringify((initialData as any)?.companyIds || []);
    const companiesEntityKey = JSON.stringify(
        ((initialData as any)?.companies || []).map((company: any) => company?.id || '')
    );
    const estateIdsInputKey = JSON.stringify((initialData as any)?.estateIds || []);
    const estatesEntityKey = JSON.stringify(
        ((initialData as any)?.estates || []).map((estate: any) => estate?.id || '')
    );
    const divisionIdsInputKey = JSON.stringify((initialData as any)?.divisionIds || []);
    const divisionsEntityKey = JSON.stringify(
        ((initialData as any)?.divisions || []).map((division: any) => division?.id || '')
    );

    const {
        initialCompanyIds,
        initialEstateIds,
        initialDivisionIds,
    } = useMemo(() => {
        const initialCompanyIdsFromInput = normalizeIds((initialData as any)?.companyIds);
        const initialCompanyIdsFromEntity = extractEntityIds((initialData as any)?.companies);
        const initialEstateIdsFromInput = normalizeIds((initialData as any)?.estateIds);
        const initialEstateIdsFromEntity = extractEntityIds((initialData as any)?.estates);
        const initialDivisionIdsFromInput = normalizeIds((initialData as any)?.divisionIds);
        const initialDivisionIdsFromEntity = extractEntityIds((initialData as any)?.divisions);

        return {
            initialCompanyIds:
                initialCompanyIdsFromInput.length > 0
                    ? initialCompanyIdsFromInput
                    : initialCompanyIdsFromEntity.length > 0
                        ? initialCompanyIdsFromEntity
                        : initialData?.companyId
                            ? [initialData.companyId]
                            : [],
            initialEstateIds:
                initialEstateIdsFromInput.length > 0
                    ? initialEstateIdsFromInput
                    : initialEstateIdsFromEntity,
            initialDivisionIds:
                initialDivisionIdsFromInput.length > 0
                    ? initialDivisionIdsFromInput
                    : initialDivisionIdsFromEntity,
        };
    }, [
        initialData?.companyId,
        companyIdsInputKey,
        companiesEntityKey,
        estateIdsInputKey,
        estatesEntityKey,
        divisionIdsInputKey,
        divisionsEntityKey,
    ]);

    const initialValues = useMemo<z.infer<typeof userFormSchema>>(() => ({
        name: initialData?.name || '',
        username: initialData?.username || '',
        email: initialData?.email || '',
        phoneNumber: initialData?.phoneNumber || '',
        password: '',
        role: (initialData?.role as UserRole) || UserRole.Mandor,
        managerId:
            initialData?.managerId ||
            (initialData as any)?.manager_id ||
            (initialData as any)?.manager?.id ||
            null,
        companyIds: initialCompanyIds,
        estateIds: initialEstateIds,
        divisionIds: initialDivisionIds,
        isActive: initialData?.isActive ?? true,
    }), [
        initialData?.name,
        initialData?.username,
        initialData?.email,
        initialData?.phoneNumber,
        initialData?.role,
        initialData?.managerId,
        (initialData as any)?.manager_id,
        (initialData as any)?.manager?.id,
        initialData?.isActive,
        initialCompanyIds,
        initialEstateIds,
        initialDivisionIds,
    ]);

    const form = useForm<z.infer<typeof userFormSchema>>({
        resolver: zodResolver(userFormSchema),
        defaultValues: initialValues,
    });

    useEffect(() => {
        form.reset(initialValues);
    }, [form, initialValues]);

    const selectedRole = form.watch('role');
    const selectedManagerId = form.watch('managerId');
    const selectedCompanyIds = form.watch('companyIds') || [];
    const selectedEstateIds = form.watch('estateIds') || [];
    const selectedDivisionIds = form.watch('divisionIds') || [];

    const isCompanyAdminContext =
        companySelectionReadOnly || currentUser?.role === UserRole.CompanyAdmin;

    const managerRolesForSelectedRole = useMemo(
        () => ROLE_ALLOWED_MANAGER_ROLES[selectedRole] || [],
        [selectedRole]
    );
    const isManagerRequired = selectedRole !== UserRole.AreaManager;
    const managerRoleFilter =
        managerRolesForSelectedRole.length === 1 ? managerRolesForSelectedRole[0] : undefined;
    const shouldSkipRoleFilterForManagerQuery =
        isCompanyAdminContext &&
        selectedRole === UserRole.Manager &&
        managerRoleFilter === UserRole.AreaManager;

    const { data: managerUsersData } = useQuery(GetUsersDocument, {
        variables: {
            role: shouldSkipRoleFilterForManagerQuery ? undefined : managerRoleFilter,
            isActive: true,
            limit: 1000,
            companyId: selectedCompanyIds.length === 1 ? selectedCompanyIds[0] : undefined,
        },
        skip: managerRolesForSelectedRole.length === 0,
        // Refresh from network first to avoid stale candidate options after role/company changes.
        fetchPolicy: 'network-only',
        nextFetchPolicy: 'cache-first',
    });

    const managerSourceUsers = useMemo(() => {
        const queriedUsers = managerUsersData?.users?.users || [];
        return queriedUsers.length > 0 ? queriedUsers : users;
    }, [managerUsersData?.users?.users, users]);

    const managerCandidates = useMemo(
        () =>
            managerSourceUsers.filter((u) => {
                if (u.id === initialData?.id) return false;
                if (!managerRolesForSelectedRole.includes(u.role)) return false;
                if (u.isActive === false) return false;
                return true;
            }),
        [managerSourceUsers, initialData?.id, managerRolesForSelectedRole]
    );

    useEffect(() => {
        if (!selectedManagerId) return;
        if (managerRolesForSelectedRole.length === 0) return;

        const managerStillValid = managerCandidates.some((u) => u.id === selectedManagerId);
        if (!managerStillValid) {
            form.setValue('managerId', null, { shouldValidate: true });
        }
    }, [form, selectedManagerId, managerCandidates, managerRolesForSelectedRole.length]);

    const selectedManager = useMemo(
        () => managerCandidates.find((candidate) => candidate.id === selectedManagerId) || null,
        [managerCandidates, selectedManagerId]
    );

    const managerEstateScopeIds = useMemo(
        () => normalizeIds((selectedManager?.estates || []).map((estate: any) => estate?.id)),
        [selectedManager?.estates]
    );

    const managerDivisionScopeIds = useMemo(
        () => normalizeIds((selectedManager?.divisions || []).map((division: any) => division?.id)),
        [selectedManager?.divisions]
    );

    const selectedRoleData = roles.find((r) => r.role === selectedRole);
    const selectedRoleName = selectedRoleData?.name || selectedRole;
    const selectedRoleDescription = selectedRoleData?.description || 'Akses pengguna standar';
    const managerRoleHint =
        managerRolesForSelectedRole.length > 0
            ? `Atasan untuk role ${selectedRole} hanya: ${managerRolesForSelectedRole.join(', ')}. ${isManagerRequired ? 'Wajib dipilih.' : 'Opsional.'}`
            : `Role ${selectedRole} tidak memerlukan atasan langsung.`;

    const selectedCompanyCount = selectedCompanyIds.length;
    const selectedEstateCount = selectedEstateIds.length;
    const selectedDivisionCount = selectedDivisionIds.length;
    const isCompanySelectionLocked = companySelectionReadOnly;
    const isManagerSelectDisabled = managerRolesForSelectedRole.length === 0 || managerCandidates.length === 0;

    // Convert companies to options
    const companyOptions = useMemo(() => {
        return companies.map((c) => ({
            value: c.id,
            label: c.name,
            description: c.code || undefined,
        }));
    }, [companies]);

    const handleSubmit = async (values: z.infer<typeof userFormSchema>) => {
        // Validation logic for password on create
        if (!isEditing && !values.password?.trim()) {
            form.setError('password', { message: 'Password wajib diisi untuk user baru' });
            return;
        }

        if (isManagerRequired && !values.managerId) {
            form.setError('managerId', {
                message: `Atasan langsung wajib diisi untuk role ${values.role}`,
            });
            return;
        }

        const normalizedValues = {
            ...values,
            companyIds: normalizeIds(values.companyIds),
            estateIds: normalizeIds(values.estateIds),
            divisionIds: normalizeIds(values.divisionIds),
        };

        if (!ROLE_REQUIRES_COMPANY.has(values.role)) {
            normalizedValues.companyIds = [];
        }
        if (!ROLE_REQUIRES_ESTATE.has(values.role)) {
            normalizedValues.estateIds = [];
        }
        if (!ROLE_REQUIRES_DIVISION.has(values.role)) {
            normalizedValues.divisionIds = [];
        }

        await onSubmit(normalizedValues);
    };

    return (
        <div className="relative">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
                    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
                        <div className="space-y-6">
                            {/* Account Info Section */}
                            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-xl ring-1 ring-slate-900/5 overflow-hidden">
                                <div className="h-1 bg-gradient-to-r from-emerald-500 to-teal-400" />
                                <CardHeader className="pb-4">
                                    <div className="flex items-center gap-3 mb-1">
                                        <div className="p-2 bg-emerald-50 rounded-lg">
                                            <UserCog className="h-5 w-5 text-emerald-600" />
                                        </div>
                                        <CardTitle className="text-xl text-slate-800">Informasi Akun</CardTitle>
                                    </div>
                                    <CardDescription>
                                        Detail identitas dasar untuk autentikasi dan profil.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="grid gap-6 md:grid-cols-2">
                                    <FormField
                                        control={form.control}
                                        name="username"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-slate-700 font-medium">Username</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="johndoe" {...field} disabled={isEditing} className="bg-slate-50 border-slate-200 focus:bg-white transition-colors" />
                                                </FormControl>
                                                <FormDescription>ID unik untuk login aplikasi.</FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="email"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-slate-700 font-medium">Alamat Email</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="john@example.com" {...field} className="bg-slate-50 border-slate-200 focus:bg-white transition-colors" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-slate-700 font-medium">Nama Lengkap</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="John Doe" {...field} className="bg-slate-50 border-slate-200 focus:bg-white transition-colors" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="phoneNumber"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-slate-700 font-medium">Nomor Telepon</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="+62..." {...field} className="bg-slate-50 border-slate-200 focus:bg-white transition-colors" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </CardContent>
                            </Card>

                            {/* Security Section (Only for New Users) */}
                            {!isEditing && (
                                <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-xl ring-1 ring-slate-900/5 overflow-hidden">
                                    <div className="h-1 bg-gradient-to-r from-sky-500 to-blue-400" />
                                    <CardHeader className="pb-4">
                                        <div className="flex items-center gap-3 mb-1">
                                            <div className="p-2 bg-sky-50 rounded-lg">
                                                <KeyRound className="h-5 w-5 text-sky-600" />
                                            </div>
                                            <CardTitle className="text-xl text-slate-800">Keamanan</CardTitle>
                                        </div>
                                        <CardDescription>
                                            Atur kata sandi awal untuk pengguna ini.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <FormField
                                            control={form.control}
                                            name="password"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-slate-700 font-medium">Kata Sandi</FormLabel>
                                                    <FormControl>
                                                        <Input type="password" placeholder="••••••••" {...field} className="bg-slate-50 border-slate-200 focus:bg-white transition-colors" />
                                                    </FormControl>
                                                    <FormDescription>Minimal {LOGIN_PASSWORD_MIN_LENGTH} karakter.</FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </CardContent>
                                </Card>
                            )}

                            {/* Role & Access Section */}
                            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-xl ring-1 ring-slate-900/5 overflow-hidden">
                                <div className="h-1 bg-gradient-to-r from-amber-500 to-orange-400" />
                                <CardHeader className="pb-4">
                                    <div className="flex items-center gap-3 mb-1">
                                        <div className="p-2 bg-amber-50 rounded-lg">
                                            <Shield className="h-5 w-5 text-amber-600" />
                                        </div>
                                        <CardTitle className="text-xl text-slate-800">Peran & Akses</CardTitle>
                                    </div>
                                    <CardDescription>
                                        Tentukan apa yang dapat dilihat dan dilakukan pengguna ini dalam organisasi.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="grid gap-6 md:grid-cols-2">
                                        <FormField
                                            control={form.control}
                                            name="role"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-slate-700 font-medium">Peran Pengguna (Role)</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger className="bg-slate-50 border-slate-200">
                                                                <SelectValue placeholder="Pilih peran" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {roles.map((r) => (
                                                                <SelectItem key={r.role} value={r.role}>
                                                                    {r.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormDescription>{selectedRoleDescription}</FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="managerId"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-slate-700 font-medium">
                                                        Atasan Langsung (Manager){isManagerRequired ? ' *' : ''}
                                                    </FormLabel>
                                                    <Select
                                                        onValueChange={(val) => field.onChange(!isManagerRequired && val === '__none__' ? null : val)}
                                                        value={field.value || (isManagerRequired ? '' : '__none__')}
                                                        disabled={isManagerSelectDisabled}
                                                    >
                                                        <FormControl>
                                                            <SelectTrigger className="bg-slate-50 border-slate-200 disabled:bg-slate-100 disabled:opacity-70">
                                                                <SelectValue placeholder={isManagerRequired ? 'Pilih manager' : 'Pilih manager (opsional)'} />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {!isManagerRequired && (
                                                                <SelectItem value="__none__">Tanpa Manager / Mandiri</SelectItem>
                                                            )}
                                                            {managerCandidates.map((u: any) => (
                                                                <SelectItem key={u.id} value={u.id}>
                                                                    {u.name} ({u.role})
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormDescription>{managerRoleHint}</FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    {selectedRole !== UserRole.SuperAdmin && (
                                        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-5 space-y-5">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Building2 className="h-4 w-4 text-emerald-600" />
                                                <h4 className="font-semibold text-slate-800 text-sm uppercase tracking-wide">Lingkup Operasional</h4>
                                            </div>

                                            <FormField
                                                control={form.control}
                                                name="companyIds"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-slate-700 font-medium">Perusahaan (PT)</FormLabel>
                                                        <FormControl>
                                                            <MultiSelect
                                                                options={companyOptions}
                                                                selected={field.value || []}
                                                                onSelectionChange={field.onChange}
                                                                placeholder="Pilih perusahaan..."
                                                                emptyMessage="Tidak ada perusahaan ditemukan"
                                                                disabled={isCompanySelectionLocked}
                                                                className="bg-white"
                                                            />
                                                        </FormControl>
                                                        <FormDescription>
                                                            {selectedRole === UserRole.Manager
                                                                ? 'Untuk role MANAGER wajib tepat 1 company.'
                                                                : selectedRole === UserRole.AreaManager
                                                                    ? 'Untuk role AREA_MANAGER wajib minimal 1 company dan boleh lebih dari 1.'
                                                                : 'Wajib diisi untuk role selain SUPER_ADMIN.'}
                                                        </FormDescription>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            {['MANAGER', 'ASISTEN', 'MANDOR'].includes(selectedRole) && (
                                                <EstateSelection
                                                    form={form}
                                                    companyIds={form.watch('companyIds') || []}
                                                    isSingle={['ASISTEN', 'MANDOR'].includes(selectedRole)}
                                                    managerEstateScopeIds={selectedManagerId ? managerEstateScopeIds : []}
                                                />
                                            )}

                                            {['ASISTEN', 'MANDOR'].includes(selectedRole) && (
                                                <DivisionSelection
                                                    form={form}
                                                    estateIds={form.watch('estateIds') || []}
                                                    managerDivisionScopeIds={selectedManagerId ? managerDivisionScopeIds : []}
                                                />
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Sidebar: Role Preview */}
                        <div className="space-y-6">
                            <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-xl ring-1 ring-emerald-900/5 sticky top-6">
                                <CardHeader className="pb-3 border-b border-slate-100">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 bg-emerald-100 rounded text-emerald-700">
                                            <UserCheck className="h-4 w-4" />
                                        </div>
                                        <CardTitle className="text-base text-slate-800">Pratinjau Peran</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-4 space-y-4">
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">PERAN DIPILIH</p>
                                        <div className="flex items-center justify-between">
                                            <span className="font-semibold text-slate-800 text-lg">{selectedRoleName}</span>
                                            <Badge variant={selectedRole === UserRole.SuperAdmin ? 'destructive' : 'default'} className="bg-emerald-600">
                                                {selectedRole}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                            {selectedRoleDescription}
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-50">
                                        <div className="text-center p-2 rounded bg-slate-50">
                                            <div className="text-xl font-bold text-emerald-600">{selectedCompanyCount}</div>
                                            <div className="text-[10px] uppercase font-bold text-slate-400">Comp</div>
                                        </div>
                                        <div className="text-center p-2 rounded bg-slate-50">
                                            <div className="text-xl font-bold text-emerald-600">{selectedEstateCount}</div>
                                            <div className="text-[10px] uppercase font-bold text-slate-400">Est</div>
                                        </div>
                                        <div className="text-center p-2 rounded bg-slate-50">
                                            <div className="text-xl font-bold text-emerald-600">{selectedDivisionCount}</div>
                                            <div className="text-[10px] uppercase font-bold text-slate-400">Div</div>
                                        </div>
                                    </div>

                                    <div className="pt-2">
                                        <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-200 transition-all hover:shadow-lg" disabled={isProcessing}>
                                            {isProcessing ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Menyimpan...
                                                </>
                                            ) : (
                                                <>
                                                    <Save className="mr-2 h-4 w-4" />
                                                    {isEditing ? 'Perbarui User' : 'Buat User Baru'}
                                                </>
                                            )}
                                        </Button>
                                        <Button type="button" variant="ghost" className="w-full mt-2 text-slate-500 hover:text-slate-800" onClick={onCancel} disabled={isProcessing}>
                                            Batal
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </form>
            </Form>
        </div>
    );
}

function EstateSelection({
    form,
    companyIds,
    isSingle,
    managerEstateScopeIds,
}: {
    form: any;
    companyIds: string[];
    isSingle: boolean;
    managerEstateScopeIds: string[];
}) {
    const companyId = companyIds.length === 1 ? companyIds[0] : undefined;

    const { estates, isLoading } = useEstates({ companyId });

    const scopedEstates = useMemo(() => {
        if (!managerEstateScopeIds.length) return estates || [];
        const scopedSet = new Set(managerEstateScopeIds);
        return (estates || []).filter((estate: any) => scopedSet.has(estate.id));
    }, [estates, managerEstateScopeIds]);

    const selectedEstateIds = form.watch('estateIds') || [];

    useEffect(() => {
        if (isLoading) return;

        const selectedIds = normalizeIds(selectedEstateIds);
        const validIdsSet = new Set(scopedEstates.map((estate: any) => estate.id));
        const validSelected = selectedIds.filter((id) => validIdsSet.has(id));

        let nextValue = validSelected;
        if (isSingle && nextValue.length > 1) {
            nextValue = [nextValue[0]];
        }
        if (scopedEstates.length === 1) {
            nextValue = [scopedEstates[0].id];
        }

        if (!areSameIds(selectedIds, nextValue)) {
            form.setValue('estateIds', nextValue, { shouldValidate: true, shouldDirty: true });
        }
    }, [form, isLoading, isSingle, scopedEstates, selectedEstateIds]);

    const estateOptions = useMemo(() => {
        return (scopedEstates || []).map((e: any) => ({
            value: e.id,
            label: e.name || e.nama,
            description: e.code || undefined,
        }));
    }, [scopedEstates]);

    return (
        <FormField
            control={form.control}
            name="estateIds"
            render={({ field }) => (
                <FormItem>
                    <FormLabel className="text-slate-700 font-medium">Kebun (Estate) {isSingle ? '(Satu)' : '(Banyak)'} *</FormLabel>
                    <FormControl>
                        {isSingle ? (
                            <Select
                                onValueChange={(val) => field.onChange([val])}
                                value={field.value?.[0] || ''}
                                disabled={isLoading}
                            >
                                <SelectTrigger className="bg-white">
                                    <SelectValue placeholder={isLoading ? 'Memuat estate...' : 'Pilih estate'} />
                                </SelectTrigger>
                                <SelectContent>
                                    {scopedEstates.map((e: any) => (
                                        <SelectItem key={e.id} value={e.id}>
                                            {e.name || e.nama}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <MultiSelect
                                options={estateOptions}
                                selected={field.value || []}
                                onSelectionChange={field.onChange}
                                placeholder={isLoading ? 'Memuat estate...' : 'Pilih estate...'}
                                emptyMessage="Tidak ada estate ditemukan"
                                loading={isLoading}
                                className="bg-white"
                            />
                        )}
                    </FormControl>
                    {managerEstateScopeIds.length > 0 && (
                        <FormDescription>Daftar estate mengikuti penugasan Atasan Langsung.</FormDescription>
                    )}
                    <FormMessage />
                </FormItem>
            )}
        />
    );
}

function DivisionSelection({
    form,
    estateIds,
    managerDivisionScopeIds,
}: {
    form: any;
    estateIds: string[];
    managerDivisionScopeIds: string[];
}) {
    const estateId = estateIds?.length === 1 ? estateIds[0] : undefined;
    const { divisions, isLoading } = useDivisions({ estateId });

    const scopedDivisions = useMemo(() => {
        if (!estateId) return [];
        if (!managerDivisionScopeIds.length) return divisions || [];
        const scopedSet = new Set(managerDivisionScopeIds);
        return (divisions || []).filter((division: any) => scopedSet.has(division.id));
    }, [divisions, estateId, managerDivisionScopeIds]);

    const selectedDivisionIds = form.watch('divisionIds') || [];

    useEffect(() => {
        if (isLoading) return;

        if (!estateId) {
            if (normalizeIds(selectedDivisionIds).length > 0) {
                form.setValue('divisionIds', [], { shouldValidate: true, shouldDirty: true });
            }
            return;
        }

        const selectedIds = normalizeIds(selectedDivisionIds);
        const validIdsSet = new Set(scopedDivisions.map((division: any) => division.id));
        const validSelected = selectedIds.filter((id) => validIdsSet.has(id));

        let nextValue = validSelected;
        if (scopedDivisions.length === 1) {
            nextValue = [scopedDivisions[0].id];
        }

        if (!areSameIds(selectedIds, nextValue)) {
            form.setValue('divisionIds', nextValue, { shouldValidate: true, shouldDirty: true });
        }
    }, [estateId, form, isLoading, scopedDivisions, selectedDivisionIds]);

    const divisionOptions = useMemo(() => {
        if (!estateId) return [];
        return (scopedDivisions || []).map((d: any) => ({
            value: d.id,
            label: d.name || d.nama,
            description: d.code || undefined,
        }));
    }, [scopedDivisions, estateId]);

    if (!estateId) {
        return (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 flex items-center gap-2">
                <span className="text-lg">!</span>
                Pilih satu estate terlebih dahulu untuk memilih divisi.
            </div>
        );
    }

    return (
        <FormField
            control={form.control}
            name="divisionIds"
            render={({ field }) => (
                <FormItem>
                    <FormLabel className="text-slate-700 font-medium">Divisi (Afdeling) *</FormLabel>
                    <FormControl>
                        <MultiSelect
                            options={divisionOptions}
                            selected={field.value || []}
                            onSelectionChange={field.onChange}
                            placeholder={isLoading ? 'Memuat divisi...' : 'Pilih divisi...'}
                            emptyMessage="Tidak ada divisi ditemukan"
                            loading={isLoading}
                            className="bg-white"
                        />
                    </FormControl>
                    {managerDivisionScopeIds.length > 0 && (
                        <FormDescription>Daftar divisi mengikuti penugasan Atasan Langsung.</FormDescription>
                    )}
                    <FormMessage />
                </FormItem>
            )}
        />
    );
}
