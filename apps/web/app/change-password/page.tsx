'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Check, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import cookieApiClient from '@/lib/api/cookie-client';

interface PasswordStrength {
  score: number;
  feedback: string[];
  hasLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
}

function ChangePasswordPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const username = searchParams?.get('username') || '';
  
  const [formData, setFormData] = React.useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = React.useState(false);
  const [showPasswords, setShowPasswords] = React.useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [passwordStrength, setPasswordStrength] = React.useState<PasswordStrength>({
    score: 0,
    feedback: [],
    hasLength: false,
    hasUpper: false,
    hasLower: false,
    hasNumber: false,
    hasSpecial: false,
  });

  // Calculate password strength
  const calculatePasswordStrength = React.useCallback((password: string): PasswordStrength => {
    const hasLength = password.length >= 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    const validations = [hasLength, hasUpper, hasLower, hasNumber, hasSpecial];
    const score = validations.filter(Boolean).length;

    const feedback: string[] = [];
    if (!hasLength) feedback.push('Minimal 8 karakter');
    if (!hasUpper) feedback.push('Minimal 1 huruf besar');
    if (!hasLower) feedback.push('Minimal 1 huruf kecil');
    if (!hasNumber) feedback.push('Minimal 1 angka');
    if (!hasSpecial) feedback.push('Minimal 1 karakter khusus');

    return {
      score: (score / validations.length) * 100,
      feedback,
      hasLength,
      hasUpper,
      hasLower,
      hasNumber,
      hasSpecial,
    };
  }, []);

  // Update password strength when new password changes
  React.useEffect(() => {
    if (formData.newPassword) {
      setPasswordStrength(calculatePasswordStrength(formData.newPassword));
    } else {
      setPasswordStrength({
        score: 0,
        feedback: [],
        hasLength: false,
        hasUpper: false,
        hasLower: false,
        hasNumber: false,
        hasSpecial: false,
      });
    }
  }, [formData.newPassword, calculatePasswordStrength]);

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const togglePasswordVisibility = (field: keyof typeof showPasswords) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      toast.error('Semua field harus diisi');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('Konfirmasi password tidak cocok');
      return;
    }

    if (passwordStrength.score < 100) {
      toast.error('Password baru tidak memenuhi syarat keamanan');
      return;
    }

    if (formData.currentPassword === formData.newPassword) {
      toast.error('Password baru harus berbeda dengan password lama');
      return;
    }

    setLoading(true);

    try {
      const response = await cookieApiClient.post('/auth/force-change-password', {
        username: username,
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });

      if (response.success) {
        toast.success('Password berhasil diubah. Silakan login dengan password baru.');
        
        // Redirect to login with username pre-filled
        if (username) {
          router.push(`/login?username=${encodeURIComponent(username)}`);
        } else {
          router.push('/login');
        }
      } else {
        toast.error(response.message || 'Gagal mengubah password');
      }
    } catch (error: any) {
      console.error('Change password error:', error);
      toast.error(error.message || 'Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const getStrengthColor = (score: number) => {
    if (score < 40) return 'bg-red-500';
    if (score < 70) return 'bg-yellow-500';
    if (score < 100) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getStrengthText = (score: number) => {
    if (score < 40) return 'Lemah';
    if (score < 70) return 'Sedang';
    if (score < 100) return 'Kuat';
    return 'Sangat Kuat';
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.1 }}
          transition={{ duration: 2 }}
          className="absolute -top-40 -right-40 w-80 h-80 bg-green-400 rounded-full blur-3xl"
        />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.1 }}
          transition={{ duration: 2, delay: 0.5 }}
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-emerald-400 rounded-full blur-3xl"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative"
      >
        <Card className="shadow-xl border-0 bg-card/95 backdrop-blur-sm">
          <CardHeader className="text-center space-y-2">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-full">
                <svg
                  className="h-8 w-8 text-yellow-600 dark:text-yellow-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Ubah Password</CardTitle>
            <CardDescription>
              Password Anda perlu diubah untuk melanjutkan. Silakan masukkan password lama dan buat password baru yang aman.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {username && (
                <Alert>
                  <AlertDescription>
                    Mengubah password untuk: <strong>{username}</strong>
                  </AlertDescription>
                </Alert>
              )}

              {/* Current Password */}
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Password Lama</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showPasswords.current ? 'text' : 'password'}
                    value={formData.currentPassword}
                    onChange={(e) => handleInputChange('currentPassword', e.target.value)}
                    placeholder="Masukkan password lama"
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('current')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPasswords.current ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-2">
                <Label htmlFor="newPassword">Password Baru</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPasswords.new ? 'text' : 'password'}
                    value={formData.newPassword}
                    onChange={(e) => handleInputChange('newPassword', e.target.value)}
                    placeholder="Masukkan password baru"
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('new')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPasswords.new ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {/* Password Strength */}
                {formData.newPassword && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Kekuatan Password:</span>
                      <span className={`font-medium ${
                        passwordStrength.score === 100 ? 'text-green-600' : 'text-muted-foreground'
                      }`}>
                        {getStrengthText(passwordStrength.score)}
                      </span>
                    </div>
                    <Progress
                      value={passwordStrength.score}
                      className="h-2"
                    />
                    
                    {/* Requirements Checklist */}
                    <div className="grid grid-cols-1 gap-1 text-xs">
                      {[
                        { met: passwordStrength.hasLength, text: 'Minimal 8 karakter' },
                        { met: passwordStrength.hasUpper, text: 'Huruf besar (A-Z)' },
                        { met: passwordStrength.hasLower, text: 'Huruf kecil (a-z)' },
                        { met: passwordStrength.hasNumber, text: 'Angka (0-9)' },
                        { met: passwordStrength.hasSpecial, text: 'Karakter khusus (!@#$%^&*)' },
                      ].map((req, index) => (
                        <div key={index} className={`flex items-center gap-2 ${
                          req.met ? 'text-green-600' : 'text-muted-foreground'
                        }`}>
                          {req.met ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            <X className="h-3 w-3" />
                          )}
                          <span>{req.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Konfirmasi Password Baru</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showPasswords.confirm ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    placeholder="Konfirmasi password baru"
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('confirm')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPasswords.confirm ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {/* Password Match Indicator */}
                {formData.confirmPassword && (
                  <div className={`flex items-center gap-2 text-xs ${
                    formData.newPassword === formData.confirmPassword
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}>
                    {formData.newPassword === formData.confirmPassword ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <X className="h-3 w-3" />
                    )}
                    <span>
                      {formData.newPassword === formData.confirmPassword
                        ? 'Password cocok'
                        : 'Password tidak cocok'
                      }
                    </span>
                  </div>
                )}
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-4">
              <Button
                type="submit"
                className="w-full"
                disabled={loading || passwordStrength.score < 100 || formData.newPassword !== formData.confirmPassword}
              >
                {loading ? 'Mengubah Password...' : 'Ubah Password'}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => router.push('/login')}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Kembali ke halaman login
                </button>
              </div>
            </CardFooter>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}

export default function ChangePasswordPage() {
  return (
    <React.Suspense fallback={<div>Loading...</div>}>
      <ChangePasswordPageContent />
    </React.Suspense>
  );
}