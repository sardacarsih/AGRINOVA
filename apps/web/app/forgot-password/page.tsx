'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { ArrowLeft, Mail, Sprout, Loader2, CheckCircle } from 'lucide-react';

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
type ForgotPasswordStep = 'request' | 'sent';

function ForgotPasswordPageContent() {
  const router = useRouter();
  const [email, setEmail] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [step, setStep] = React.useState<ForgotPasswordStep>('request');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = email.trim();
    if (!trimmed) {
      toast.error('Masukkan username atau email Anda.');
      return;
    }

    setLoading(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || '/api';
      await fetch(`${apiBase}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      });
      setStep('sent');
    } catch {
      // Always show success to prevent email enumeration
      setStep('sent');
    } finally {
      setLoading(false);
    }
  };

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
              <Sprout className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <CardTitle className="text-xl font-bold text-slate-800 dark:text-slate-100">
              {step === 'request' ? 'Lupa Password' : 'Email Terkirim'}
            </CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-400">
              {step === 'request'
                ? 'Masukkan username atau email yang terdaftar untuk menerima instruksi reset password.'
                : 'Jika akun ditemukan, instruksi reset password telah dikirim ke email Anda.'}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {step === 'request' ? (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label
                    htmlFor="forgot-email"
                    className="text-sm font-medium text-slate-800 dark:text-slate-200"
                  >
                    Username atau Email
                  </Label>
                  <Input
                    id="forgot-email"
                    type="text"
                    placeholder="Masukkan username atau email"
                    autoComplete="username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 rounded-xl border-slate-300 bg-slate-50/50 dark:border-slate-600 dark:bg-slate-800/50"
                    disabled={loading}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Mengirim...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Kirim Instruksi Reset
                    </>
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
            ) : (
              <div className="text-center space-y-5">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-900/30">
                  <CheckCircle className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Periksa inbox email Anda dan ikuti instruksi untuk mengatur ulang password.
                  Jika tidak menemukan email, periksa folder spam.
                </p>
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={() => {
                      setStep('request');
                      setEmail('');
                    }}
                    variant="outline"
                    className="w-full h-11 rounded-xl"
                  >
                    Kirim Ulang
                  </Button>
                  <button
                    type="button"
                    onClick={() => router.push('/login')}
                    className="flex items-center justify-center gap-1.5 w-full text-sm text-slate-600 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 transition-colors py-2"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Kembali ke halaman login
                  </button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
          <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ForgotPasswordPageContent />
    </React.Suspense>
  );
}
