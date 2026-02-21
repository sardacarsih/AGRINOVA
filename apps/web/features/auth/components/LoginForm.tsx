'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, CircleAlert, CheckCircle, ChevronDown, ChevronUp, Zap, Shield, Users, Briefcase, HardHat, UserCheck } from 'lucide-react';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { PasswordInput } from '@/components/ui/password-input';

import { loginSchema } from '@/lib/auth/validation';
import type { LoginFormData } from '@/lib/auth/validation';
import { useAuth } from '@/features/auth/hooks/useAuth';

interface LoginFormProps {
    defaultUsername?: string;
    onForgotPassword?: () => void;
}

interface DemoAccount {
    label: string;
    username: string;
    password: string;
    role: string;
    icon: React.ComponentType<{ className?: string }>;
    colorClass: string;
    bgClass: string;
}

const demoAccounts: DemoAccount[] = [
    {
        label: 'Super Admin',
        username: 'superadmin',
        password: 'demo123',
        role: 'All Companies',
        icon: Shield,
        colorClass: 'text-red-600 dark:text-red-400',
        bgClass: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30'
    },
    {
        label: 'Company Admin',
        username: 'companyadmin',
        password: 'demo123',
        role: 'PT Agrinova',
        icon: Briefcase,
        colorClass: 'text-orange-600 dark:text-orange-400',
        bgClass: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 hover:bg-orange-100 dark:hover:bg-orange-900/30'
    },
    {
        label: 'Manager',
        username: 'manager',
        password: 'demo123',
        role: 'Estate Manager',
        icon: Users,
        colorClass: 'text-blue-600 dark:text-blue-400',
        bgClass: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30'
    },
    {
        label: 'Asisten',
        username: 'asisten',
        password: 'demo123',
        role: 'Field Assistant',
        icon: UserCheck,
        colorClass: 'text-purple-600 dark:text-purple-400',
        bgClass: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/30'
    },
    {
        label: 'Mandor',
        username: 'mandor',
        password: 'demo123',
        role: 'Field Supervisor',
        icon: HardHat,
        colorClass: 'text-emerald-600 dark:text-emerald-400',
        bgClass: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/30'
    },
    {
        label: 'Satpam',
        username: 'satpam',
        password: 'demo123',
        role: 'Security Guard',
        icon: Shield,
        colorClass: 'text-slate-600 dark:text-slate-400',
        bgClass: 'bg-slate-50 dark:bg-slate-900/20 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900/30'
    },
    {
        label: 'Timbangan',
        username: 'TIMBANGAN',
        password: 'demo123',
        role: 'Weighing Officer',
        icon: Users,
        colorClass: 'text-teal-600 dark:text-teal-400',
        bgClass: 'bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800 hover:bg-teal-100 dark:hover:bg-teal-900/30'
    },
    {
        label: 'Grading',
        username: 'GRADING',
        password: 'demo123',
        role: 'Quality Inspector',
        icon: UserCheck,
        colorClass: 'text-indigo-600 dark:text-indigo-400',
        bgClass: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/30'
    }
];

export function LoginForm({
    defaultUsername,
    onForgotPassword,
}: LoginFormProps) {
    const { login, isLoading } = useAuth();
    const shouldReduceMotion = useReducedMotion();
    const [showQuickAccess, setShowQuickAccess] = React.useState(false);

    // Translation hooks
    const t = useTranslations('login');
    const tCommon = useTranslations('common');
    const tAuth = useTranslations('auth');

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting, isValid },
        watch,
        setValue,
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: defaultUsername || '',
            password: '',
            rememberMe: false,
        },
        mode: 'onChange',
    });

    const watchedFields = watch();

    const handleFormSubmit = async (data: LoginFormData) => {
        try {
            await login({
                identifier: data.email,
                password: data.password,
            });
        } catch (error: any) {
            // Error is handled in AuthProvider and displayed via toast
            console.error('Login submission error:', error);
        }
    };

    const handleQuickLogin = (username: string, password: string, role: string) => {
        setValue('email', username, { shouldValidate: true });
        setValue('password', password, { shouldValidate: true });
        toast.success(t('demoCredentialsLoaded', { role }), {
            description: t('clickToLogin'),
            duration: 2000,
        });
    };

    const formVariants = {
        initial: { opacity: shouldReduceMotion ? 1 : 0, y: shouldReduceMotion ? 0 : 10 },
        animate: {
            opacity: 1,
            y: 0,
            transition: { duration: shouldReduceMotion ? 0 : 0.3 }
        }
    };

    return (
        <motion.div
            variants={formVariants}
            initial="initial"
            animate="animate"
            className="w-full space-y-6 h-full flex flex-col"
        >
            <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5 sm:space-y-5">
                <div className="space-y-2.5 sm:space-y-2">
                    <Label htmlFor="email">{t('identifier')}</Label>
                    <div className="relative">
                        <Input
                            id="email"
                            type="text"
                            placeholder={t('identifierPlaceholder')}
                            autoComplete="username"
                            {...register('email')}
                            className={errors.email ? 'border-red-500 focus:ring-red-500' : ''}
                        />
                        {watchedFields.email && !errors.email && (
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                <CheckCircle className="h-5 w-5 text-emerald-500" />
                            </div>
                        )}
                    </div>
                    {errors.email && (
                        <p className="text-sm text-red-600 flex items-center gap-1">
                            <CircleAlert className="h-4 w-4" />
                            {errors.email.message}
                        </p>
                    )}
                </div>

                <div className="space-y-2.5 sm:space-y-2">
                    <Label htmlFor="password">{t('password')}</Label>
                    <PasswordInput
                        id="password"
                        placeholder={t('passwordPlaceholder')}
                        autoComplete="current-password"
                        {...register('password')}
                        className={errors.password ? 'border-red-500 focus:ring-red-500' : ''}
                    />
                    {errors.password && (
                        <p className="text-sm text-red-600 flex items-center gap-1">
                            <CircleAlert className="h-4 w-4" />
                            {errors.password.message}
                        </p>
                    )}
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <Checkbox id="rememberMe" {...register('rememberMe')} />
                        <Label htmlFor="rememberMe">{t('rememberMe')}</Label>
                    </div>
                    {onForgotPassword && (
                        <button
                            type="button"
                            onClick={onForgotPassword}
                            className="text-sm font-medium text-emerald-600 hover:underline"
                        >
                            {t('forgotPassword')}
                        </button>
                    )}
                </div>

                <Button
                    type="submit"
                    disabled={isLoading || isSubmitting || !isValid}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                    {isLoading || isSubmitting ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {t('loggingIn')}
                        </>
                    ) : (
                        t('loginButton')
                    )}
                </Button>
            </form>

            {/* Quick Demo Access Section */}
            <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                <button
                    type="button"
                    onClick={() => setShowQuickAccess(!showQuickAccess)}
                    className="w-full flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20 border border-emerald-200 dark:border-emerald-800 hover:from-emerald-100 hover:to-blue-100 dark:hover:from-emerald-900/30 dark:hover:to-blue-900/30 transition-all duration-200"
                >
                    <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                            {t('quickDemoAccess')}
                        </span>
                    </div>
                    {showQuickAccess ? (
                        <ChevronUp className="h-4 w-4 text-slate-500" />
                    ) : (
                        <ChevronDown className="h-4 w-4 text-slate-500" />
                    )}
                </button>

                <AnimatePresence>
                    {showQuickAccess && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: shouldReduceMotion ? 0 : 0.3 }}
                            className="overflow-hidden"
                        >
                            <div className="mt-4 space-y-4">
                                {/* Demo Accounts Grid */}
                                <div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 text-center">
                                        {t('clickToAutofill')}
                                    </p>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-2">
                                        {demoAccounts.map((account) => {
                                            const Icon = account.icon;
                                            return (
                                                <button
                                                    key={account.username}
                                                    type="button"
                                                    onClick={() => handleQuickLogin(account.username, account.password, account.label)}
                                                    className={`p-3 rounded-lg border transition-all duration-200 text-left ${account.bgClass}`}
                                                >
                                                    <div className="flex items-start gap-2">
                                                        <Icon className={`h-4 w-4 flex-shrink-0 mt-0.5 ${account.colorClass}`} />
                                                        <div className="flex-1 min-w-0">
                                                            <div className={`text-xs font-semibold ${account.colorClass} truncate`}>
                                                                {account.label}
                                                            </div>
                                                            <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                                                {account.role}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Info Note */}
                                <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                                    <p className="text-[10px] text-amber-700 dark:text-amber-400 text-center">
                                        ⚠️ Demo accounts only • Password: demo123
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}
