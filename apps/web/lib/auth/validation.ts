import { z } from 'zod';

// Login form validation schema - no role selection
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Username atau email harus diisi')
    .max(255, 'Username atau email terlalu panjang')
    .refine((value) => {
      // Accept either email format or username format (alphanumeric + dots, underscores, hyphens)
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const usernameRegex = /^[a-zA-Z0-9._-]+$/;
      return emailRegex.test(value) || usernameRegex.test(value);
    }, 'Format username atau email tidak valid'),
  password: z
    .string()
    .min(1, 'Password harus diisi')
    .min(6, 'Password minimal 6 karakter')
    .max(100, 'Password terlalu panjang'),
  rememberMe: z.boolean(),
});

export type LoginFormData = z.infer<typeof loginSchema>;

// User profile validation
export const userProfileSchema = z.object({
  displayName: z.string().min(1, 'Nama tampilan harus diisi').max(100),
  phoneNumber: z.string().optional(),
  position: z.string().optional(),
  employeeId: z.string().optional(),
  department: z.string().optional(),
  supervisor: z.string().optional(),
});

// User preferences validation
export const userPreferencesSchema = z.object({
  language: z.enum(['id', 'en']).default('id'),
  theme: z.enum(['light', 'dark', 'auto']).default('light'),
  notifications: z.object({
    email: z.boolean().default(true),
    push: z.boolean().default(true),
    sms: z.boolean().default(false),
  }),
  dashboard: z.object({
    defaultView: z.string().default('overview'),
    autoRefresh: z.boolean().default(true),
    refreshInterval: z.number().min(5).max(300).default(30), // 5 seconds to 5 minutes
  }),
});

// Password reset validation
export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token tidak valid'),
  password: z
    .string()
    .min(8, 'Password minimal 8 karakter')
    .max(100, 'Password terlalu panjang')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password harus mengandung huruf besar, huruf kecil, dan angka'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Konfirmasi password tidak sesuai',
  path: ['confirmPassword'],
});

// Forgot password validation
export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email harus diisi')
    .email('Format email tidak valid'),
});

// Change password validation (for logged in users)
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Password saat ini harus diisi'),
  newPassword: z
    .string()
    .min(8, 'Password minimal 8 karakter')
    .max(100, 'Password terlalu panjang')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password harus mengandung huruf besar, huruf kecil, dan angka'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Konfirmasi password tidak sesuai',
  path: ['confirmPassword'],
});

// QR login validation
export const qrLoginSchema = z.object({
  sessionId: z.string().min(1, 'Session ID tidak valid'),
});

// Role-based access validation
export const accessControlSchema = z.object({
  userId: z.string(),
  resource: z.string(),
  action: z.string(),
  context: z.record(z.string(), z.any()).optional(),
});