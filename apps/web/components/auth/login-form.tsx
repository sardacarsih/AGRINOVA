'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, CircleAlert, QrCode, WifiOff } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PasswordInput } from '@/components/ui/password-input';

import { loginSchema } from '@/lib/auth/validation';
import type { LoginFormData } from '@/lib/auth/validation';
import { QRLogin } from '@/components/auth/qr-login';
import type { User } from '@/types/auth';

type ApiHealthStatus = {
  endpoints?: {
    auth?: boolean;
  };
} | null;

interface QRLoginPayload {
  user: User;
  token?: string;
  expiresAt: Date;
}

interface LoginFormProps {
  onSubmit: (data: LoginFormData) => Promise<void>;
  onQRLogin: (user: QRLoginPayload) => Promise<void>;
  loading?: boolean;
  error?: string | null;
  onForgotPassword?: () => void;
  defaultUsername?: string;
}

export function LoginForm({
  onSubmit,
  onQRLogin,
  loading = false,
  error,
  onForgotPassword,
  defaultUsername,
}: LoginFormProps) {
  const [loginMode, setLoginMode] = React.useState<'form' | 'qr'>('form');
  const [isApiOnline] = React.useState(true); // Assume online by default
  const [apiHealthStatus] = React.useState<ApiHealthStatus>(null);
  const shouldReduceMotion = useReducedMotion();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: defaultUsername || '',
      password: '',
      rememberMe: false,
    },
  });

  const getErrorMessage = (err: unknown): string => {
    if (err instanceof Error) {
      return err.message;
    }
    if (typeof err === 'string') {
      return err;
    }
    return '';
  };

  const isExpectedAuthFailure = (message: string): boolean => {
    const normalized = message.toLowerCase();
    return (
      normalized.includes('invalid username or password') ||
      normalized.includes('invalid credentials') ||
      normalized.includes('username or password') ||
      normalized.includes('username dan password') ||
      normalized.includes('kredensial') ||
      normalized.includes('login gagal')
    );
  };

  const handleFormSubmit = async (data: LoginFormData) => {
    try {
      await onSubmit(data);
    } catch (error: unknown) {
      const message = getErrorMessage(error);

      if (!isExpectedAuthFailure(message)) {
        console.error('Login error:', error);
      }

      toast.error(message || 'Gagal masuk. Silakan coba lagi.');
    }
  };

  // Animation variants that respect reduced motion
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
      className="login-form-content w-full space-y-6"
    >
      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-start gap-3 p-4 text-sm bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl"
        >
          <CircleAlert className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
          <span className="text-red-800 dark:text-red-200">{error}</span>
        </motion.div>
      )}


      {/* Login Tabs - Mobile optimized */}
      <Tabs value={loginMode} onValueChange={(v) => setLoginMode(v as 'form' | 'qr')} className="w-full">
        <TabsList className="login-tab-list grid w-full grid-cols-2 p-1 rounded-xl h-11 sm:h-10">
          <TabsTrigger 
            value="form" 
            className="login-tab-trigger rounded-lg data-[state=active]:shadow-sm transition-all text-sm py-2.5 sm:py-1.5 touch-manipulation min-h-[44px] sm:min-h-[36px] flex items-center justify-center"
          >
            Form Login
          </TabsTrigger>
          <TabsTrigger 
            value="qr"
            className="login-tab-trigger rounded-lg data-[state=active]:shadow-sm transition-all text-sm py-2.5 sm:py-1.5 touch-manipulation min-h-[44px] sm:min-h-[36px] flex items-center justify-center"
          >
            <QrCode className="h-4 w-4 mr-1.5 sm:mr-2 flex-shrink-0" />
            <span className="hidden xs:inline">QR Code</span>
            <span className="xs:hidden">QR</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="form" className="space-y-4 mt-5 sm:mt-6">
          <motion.div
            key="form-tab"
            initial={shouldReduceMotion ? {} : { opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
          >
          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5 sm:space-y-5">
            {/* Email Field - Mobile optimized */}
            <div className="space-y-2.5 sm:space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-slate-800 dark:text-slate-200 block">
                Username atau Email
              </Label>
              <Input
                id="email"
                type="text"
                placeholder="Masukkan username atau email"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                inputMode="email"
                {...register('email')}
                className={`login-input-field w-full h-12 sm:h-11 px-4 rounded-xl transition-all text-base sm:text-sm touch-manipulation border-slate-300 bg-slate-50/50 dark:border-slate-600 dark:bg-slate-800/50 ${
                  errors.email ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'hover:border-slate-400 dark:hover:border-slate-500'
                }`}
              />
              {errors.email && (
                <p className="text-xs sm:text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                  <CircleAlert className="h-3 w-3 sm:h-4 sm:w-4" />
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password Field - Mobile optimized */}
            <div className="space-y-2.5 sm:space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-slate-800 dark:text-slate-200 block">
                Password
              </Label>
              <PasswordInput
                id="password"
                placeholder="Masukkan password"
                autoComplete="current-password"
                {...register('password')}
                className={`login-input-field w-full h-12 sm:h-11 px-4 rounded-xl transition-all text-base sm:text-sm touch-manipulation border-slate-300 bg-slate-50/50 dark:border-slate-600 dark:bg-slate-800/50 ${
                  errors.password ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'hover:border-slate-400 dark:hover:border-slate-500'
                }`}
              />
              {errors.password && (
                <p className="text-xs sm:text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                  <CircleAlert className="h-3 w-3 sm:h-4 sm:w-4" />
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Remember Me & Forgot Password - Mobile responsive */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-2 pt-1">
              <div className="flex items-center space-x-3 sm:space-x-2">
                <Checkbox
                  id="rememberMe"
                  {...register('rememberMe')}
                  className="rounded-md touch-manipulation w-4 h-4 sm:w-3.5 sm:h-3.5"
                />
                <Label
                  htmlFor="rememberMe"
                  className="text-sm text-slate-600 dark:text-slate-400 cursor-pointer touch-manipulation select-none"
                >
                  Ingat saya
                </Label>
              </div>
              {onForgotPassword && (
                <button
                  type="button"
                  onClick={onForgotPassword}
                  className="login-accent-text text-sm font-medium transition-colors touch-manipulation py-2 sm:py-1 underline-offset-4 hover:underline self-start sm:self-auto"
                >
                  Lupa password?
                </button>
              )}
            </div>

            {/* Enhanced Login Button - Mobile optimized */}
            <Button
              type="submit"
              disabled={loading || isSubmitting || !isApiOnline}
              className="login-submit-btn mt-6 h-12 w-full rounded-xl text-base font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-60 sm:mt-4 sm:h-11 sm:text-sm touch-manipulation"
            >
              {loading || isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                  <span className="hidden xs:inline">Masuk...</span>
                  <span className="xs:hidden">Memuat...</span>
                </>
              ) : !isApiOnline ? (
                <>
                  <WifiOff className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="hidden sm:inline">Server Tidak Tersedia</span>
                  <span className="sm:hidden">No Server</span>
                </>
              ) : apiHealthStatus && !apiHealthStatus.endpoints.auth ? (
                <>
                  <CircleAlert className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="hidden sm:inline">Login Mungkin Bermasalah</span>
                  <span className="sm:hidden">Login Issue</span>
                </>
              ) : (
                <>
                  <span className="hidden xs:inline">Masuk ke AgrInova</span>
                  <span className="xs:hidden">Masuk</span>
                </>
              )}
            </Button>
            
            {/* Service Status Warning */}
            {isApiOnline && apiHealthStatus && !apiHealthStatus.endpoints.auth && (
              <div className="flex items-start gap-2 p-3 text-xs bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <CircleAlert className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                <div className="text-yellow-800 dark:text-yellow-200">
                  <div className="font-medium">Peringatan Layanan Autentikasi</div>
                  <div className="mt-1">
                    Layanan autentikasi tidak tersedia. Login mungkin gagal atau lambat.
                  </div>
                </div>
              </div>
            )}
          </form>
          </motion.div>
        </TabsContent>

        <TabsContent value="qr" className="mt-5 space-y-3 sm:mt-5">
          <motion.div
            key="qr-tab"
            initial={shouldReduceMotion ? {} : { opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
          >
          <QRLogin
            onSuccess={async ({ user, expiresAt }) => {
              const loginData = {
                user: user as User,
                token: '',
                expiresAt,
              };

              await onQRLogin(loginData);
            }}
            onError={(message) => {
              toast.error(message);
            }}
          />
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* Role Information - Mobile optimized */}
      <div className="login-form-help px-2 text-center text-xs sm:text-sm text-slate-600 dark:text-slate-400">
        <p>Peran Anda akan ditentukan secara otomatis berdasarkan akun yang terdaftar.</p>
      </div>
    </motion.div>
  );
}
