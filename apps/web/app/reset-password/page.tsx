'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Eye, EyeOff, Loader2, Lock, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useResetPasswordMutation } from '@/gql/graphql';

function validatePassword(password: string): string | null {
  if (password.length < 8) return 'Password minimal 8 karakter.';
  if (!/[A-Z]/.test(password)) return 'Password harus mengandung huruf besar.';
  if (!/[a-z]/.test(password)) return 'Password harus mengandung huruf kecil.';
  if (!/\d/.test(password)) return 'Password harus mengandung angka.';
  return null;
}

function ResetPasswordPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = (searchParams?.get('token') || '').trim();

  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [failedMessage, setFailedMessage] = React.useState('');
  const [success, setSuccess] = React.useState(false);
  const [resetPassword, { loading }] = useResetPasswordMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFailedMessage('');

    if (!token) {
      setFailedMessage('Token tidak valid atau sudah kedaluwarsa.');
      return;
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      toast.error(passwordError);
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Konfirmasi password tidak cocok.');
      return;
    }

    try {
      const { data } = await resetPassword({
        variables: {
          token,
          newPassword,
        },
      });

      if (data?.resetPassword?.success) {
        setSuccess(true);
        toast.success('Password berhasil diubah.');
        window.setTimeout(() => router.push('/login'), 1200);
        return;
      }

      setFailedMessage(data?.resetPassword?.message || 'Token tidak valid atau sudah kedaluwarsa.');
    } catch {
      setFailedMessage('Token tidak valid atau sudah kedaluwarsa.');
    }
  };

  const isTokenMissing = !token;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-emerald-50 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950 px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <Card className="border-slate-200 dark:border-slate-700 shadow-xl">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-900/30">
              {success ? (
                <CheckCircle className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Lock className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              )}
            </div>
            <CardTitle className="text-xl font-bold text-slate-800 dark:text-slate-100">
              {success ? 'Password Berhasil Diubah' : 'Reset Password'}
            </CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-400">
              {success
                ? 'Anda akan diarahkan ke halaman login.'
                : 'Masukkan password baru untuk akun Anda.'}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {success ? (
              <Button
                onClick={() => router.push('/login')}
                className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                Ke Halaman Login
              </Button>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label
                    htmlFor="new-password"
                    className="text-sm font-medium text-slate-800 dark:text-slate-200"
                  >
                    Password Baru
                  </Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Masukkan password baru"
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="h-11 rounded-xl border-slate-300 bg-slate-50/50 pr-11 dark:border-slate-600 dark:bg-slate-800/50"
                      disabled={loading || isTokenMissing}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="confirm-password"
                    className="text-sm font-medium text-slate-800 dark:text-slate-200"
                  >
                    Konfirmasi Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Ulangi password baru"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="h-11 rounded-xl border-slate-300 bg-slate-50/50 pr-11 dark:border-slate-600 dark:bg-slate-800/50"
                      disabled={loading || isTokenMissing}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      aria-label={showConfirmPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {(isTokenMissing || failedMessage) && (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">
                    {failedMessage || 'Token tidak valid atau sudah kedaluwarsa.'}
                  </p>
                )}

                <Button
                  type="submit"
                  disabled={loading || isTokenMissing || !newPassword || !confirmPassword}
                  className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    'Ubah Password'
                  )}
                </Button>

                <button
                  type="button"
                  onClick={() => router.push('/login')}
                  className="flex items-center justify-center gap-1.5 w-full text-sm text-slate-600 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 transition-colors py-2"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Kembali ke halaman login
                </button>
              </form>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
          <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ResetPasswordPageContent />
    </React.Suspense>
  );
}
