'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RoleData } from './RoleTable';
import { Loader2 } from 'lucide-react';

const roleSchema = z.object({
    name: z.string().min(2, 'Role name must be at least 2 characters').regex(/^[A-Z_]+$/, 'Role name must be uppercase with underscores (e.g., AREA_MANAGER)'),
    displayName: z.string().min(2, 'Display name must be at least 2 characters'),
    description: z.string().optional(),
    level: z.number().min(1, 'Level must be at least 1').max(100, 'Level cannot exceed 100'),
});

type RoleFormValues = {
    name: string;
    displayName: string;
    description?: string;
    level: number;
};

interface RoleFormModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    role?: RoleData | null;
    onSubmit: (values: RoleFormValues) => Promise<void>;
    isSubmitting?: boolean;
}

export function RoleFormModal({
    open,
    onOpenChange,
    role,
    onSubmit,
    isSubmitting = false,
}: RoleFormModalProps) {
    const isEditing = !!role;

    const form = useForm<RoleFormValues>({
        resolver: zodResolver(roleSchema),
        defaultValues: {
            name: '',
            displayName: '',
            description: '',
            level: 10,
        },
    });

    useEffect(() => {
        if (open) {
            if (role) {
                form.reset({
                    name: role.name,
                    displayName: role.displayName,
                    description: role.description,
                    level: (role as any).level || 10, // Default level if not present
                });
            } else {
                form.reset({
                    name: '',
                    displayName: '',
                    description: '',
                    level: 10,
                });
            }
        }
    }, [open, role, form]);

    const handleSubmit = async (values: RoleFormValues) => {
        await onSubmit(values);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'Edit Role' : 'Create New Role'}</DialogTitle>
                    <DialogDescription>
                        {isEditing
                            ? 'Update the details of the existing role.'
                            : 'Add a new role to the system. Role name should be unique.'}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Role Name (ID)</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="e.g. AREA_MANAGER"
                                            {...field}
                                            disabled={isEditing || isSubmitting}
                                            className="uppercase"
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Unique identifier for the role. Cannot be changed once created.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="displayName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Display Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g. Area Manager" {...field} disabled={isSubmitting} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="level"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Hierarchy Level</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            placeholder="e.g. 10"
                                            {...field}
                                            disabled={isEditing || isSubmitting} // Level usually shouldn't change easily as it affects hierarchy
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Lower numbers indicate higher authority (1 = Super Admin).
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Describe the role's responsibilities..."
                                            className="resize-none"
                                            {...field}
                                            disabled={isSubmitting}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                                Cancel
                            </Button>
                            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isEditing ? 'Save Changes' : 'Create Role'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
