import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { User, ResetPasswordInput } from '@/gql/graphql';

const resetSchema = z.object({
    newPassword: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(6, 'Password must be at least 6 characters'),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

type ResetFormValues = z.infer<typeof resetSchema>;

interface ResetPasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (input: ResetPasswordInput) => Promise<boolean>;
    user: User | null;
    isProcessing: boolean;
}

export function ResetPasswordModal({
    isOpen,
    onClose,
    onSubmit,
    user,
    isProcessing,
}: ResetPasswordModalProps) {
    const form = useForm<ResetFormValues>({
        resolver: zodResolver(resetSchema),
        defaultValues: {
            newPassword: '',
            confirmPassword: '',
        },
    });

    const handleSubmit = async (values: ResetFormValues) => {
        if (!user) return;
        const success = await onSubmit({
            userId: user.id,
            newPassword: values.newPassword,
        });
        if (success) {
            onClose();
            form.reset();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                    <DialogTitle>Reset Password for {user?.name}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-2">
                        <FormField
                            control={form.control}
                            name="newPassword"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>New Password</FormLabel>
                                    <FormControl>
                                        <Input type="password" placeholder="••••••••" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="confirmPassword"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Confirm Password</FormLabel>
                                    <FormControl>
                                        <Input type="password" placeholder="••••••••" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isProcessing}>
                                {isProcessing ? 'Resetting...' : 'Reset Password'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
