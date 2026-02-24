'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { motion, useReducedMotion } from 'framer-motion';
import { Sprout, Shield, Clock, Users, TrendingUp, LucideIcon, Download, ExternalLink, ChevronRight } from 'lucide-react';

import { LoginForm } from '@/components/auth/login-form';
import { useAuth } from '@/hooks/use-auth';
import type { AuthSession, LoginFormData, User } from '@/types/auth';
import { PermissionManager } from '@/lib/auth/permissions';
import cookieAuthService from '@/lib/auth/cookie-auth-service';

const SplashCursor = dynamic(() => import('@/components/animations/splash-cursor'), {
  ssr: false,
  loading: () => null,
});

// TypeScript interfaces for better type safety
interface FeatureItem {
  icon: LucideIcon;
  title: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

interface LoginErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface QRLoginData {
  user: User;
  expiresAt?: Date;
  token?: string;
}

// Simple error boundary component
class LoginErrorBoundary extends React.Component<
  React.PropsWithChildren<{}>,
  LoginErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): LoginErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Login page error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
          <div className="text-center p-8">
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-4">
              Oops! Something went wrong
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Please refresh the page or try again later.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function LoginPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { login, isAuthenticated, user } = useAuth();
  const [loading, setLoading] = React.useState(false);
  const [isRedirectingAfterAuth, setIsRedirectingAfterAuth] = React.useState(false);
  const hasRedirectedAfterAuthRef = React.useRef(false);
  const shouldReduceMotion = useReducedMotion();
  const [isMobileViewport, setIsMobileViewport] = React.useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.matchMedia('(max-width: 767px)').matches;
  });

  const redirectPath = searchParams?.get('redirect') || null;
  const usernameParam = searchParams?.get('username') || null;

  const resolveSafeRedirectPath = React.useCallback((targetUser: User | null) => {
    const roleBasedPath = PermissionManager.getRoleBasedRedirectPath(targetUser);
    const authRoutes = ['/login', '/forgot-password', '/reset-password', '/change-password', '/register'];

    const normalizePath = (value: string): string => {
      const [pathWithoutQuery] = value.split('?');
      const [pathWithoutHash] = pathWithoutQuery.split('#');
      return pathWithoutHash || '/';
    };

    const isSafeRedirectParam =
      typeof redirectPath === 'string' &&
      redirectPath.startsWith('/') &&
      !redirectPath.startsWith('//') &&
      !authRoutes.some((route) => normalizePath(redirectPath) === route || normalizePath(redirectPath).startsWith(`${route}/`));

    const targetPath = isSafeRedirectParam ? redirectPath : roleBasedPath || '/';
    const normalizedTargetPath = normalizePath(targetPath);
    const normalizedCurrentPath = normalizePath(pathname || '/');

    if (!normalizedTargetPath || normalizedTargetPath === normalizedCurrentPath) {
      return roleBasedPath || '/';
    }

    return normalizedTargetPath;
  }, [pathname, redirectPath]);

  // Redirect if already authenticated
  React.useEffect(() => {
    if (!isAuthenticated || !user) {
      hasRedirectedAfterAuthRef.current = false;
      setIsRedirectingAfterAuth(false);
      return;
    }

    if (hasRedirectedAfterAuthRef.current) {
      return;
    }

    const safePath = resolveSafeRedirectPath(user);
    hasRedirectedAfterAuthRef.current = true;
    setIsRedirectingAfterAuth(true);

    console.log('Authenticated user redirect:', {
      userRole: user.role,
      userEmail: user.email,
      redirectPath,
      safePath,
    });

    router.replace(safePath);
  }, [isAuthenticated, redirectPath, resolveSafeRedirectPath, router, user]);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const syncViewportMode = () => setIsMobileViewport(mediaQuery.matches);

    syncViewportMode();
    mediaQuery.addEventListener('change', syncViewportMode);

    return () => {
      mediaQuery.removeEventListener('change', syncViewportMode);
    };
  }, []);

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

  const handleLogin = async (data: LoginFormData) => {
    setLoading(true);
    let loginSucceeded = false;

    try {
      console.log('[Login] Using cookie-based authentication');

      const response = await cookieAuthService.login(data);

      console.log('[Login] Cookie login response:', response);
      console.log('[Login] User data:', response.data?.user);
      console.log('[Login] User name:', response.data?.user?.name);

      if (response.success && response.data) {
        // Enhanced debugging with cookie response validation
        console.log('[Login] Cookie API response details:', {
          hasResponse: !!response,
          hasData: !!response.data,
          hasUser: !!response.data?.user,
          userRole: response.data?.user?.role,
          success: response.success
        });

        setIsRedirectingAfterAuth(true);
        login(response.data);
        loginSucceeded = true;

        console.log('Login successful, waiting auth state to redirect...');
      } else {
        // Login failed - throw error so LoginForm can handle it properly
        const errorMessage = response.message || 'Login gagal. Periksa kredensial Anda.';

        // Don't set error state here to avoid duplicate error display
        // LoginForm will handle all error display including toast notifications

        // Throw error to let LoginForm handle error display
        throw new Error(errorMessage);
      }
    } catch (error: unknown) {
      setIsRedirectingAfterAuth(false);
      const normalizedError = error as {
        message?: string;
        details?: string;
        statusCode?: number;
      };
      const message =
        typeof normalizedError?.message === 'string' ? normalizedError.message : '';
      if (!isExpectedAuthFailure(message)) {
        console.error('Cookie Login error:', error);
      }

      if (message === 'Password change required' ||
        normalizedError.details === 'Password change required' ||
        (normalizedError.statusCode === 401 &&
          message.includes('Password change required'))) {
        toast.info('Password Anda perlu diubah sebelum melanjutkan.');
        router.push(`/change-password?username=${encodeURIComponent(data.email)}`);
        return;
      }

      // For login failures, don't set error state or show notifications here 
      // LoginForm will handle all error display including toast notifications

      // Re-throw error so LoginForm can handle it properly  
      throw error instanceof Error
        ? error
        : new Error(message || 'Login gagal. Silakan coba lagi.');
    } finally {
      if (!loginSucceeded) {
        setLoading(false);
      }
    }
  };

  const handleForgotPassword = () => {
    toast.success('Fitur lupa password akan segera tersedia.');
  };

  const handleQRLogin = async (data: QRLoginData) => {
    setLoading(true);
    let loginSucceeded = false;

    try {
      toast.success(`Selamat datang via QR, ${data.user.name}!`);

      const authSession: AuthSession = {
        user: data.user,
        accessToken: data.token || '',
        refreshToken: '',
        expiresAt: data.expiresAt ?? new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      setIsRedirectingAfterAuth(true);
      login(authSession);
      loginSucceeded = true;

      console.log('QR login successful, waiting auth state to redirect...');
    } catch (error) {
      setIsRedirectingAfterAuth(false);
      console.error('QR Login error:', error);
      toast.error('Terjadi kesalahan saat login dengan QR. Silakan coba lagi.');
    } finally {
      if (!loginSucceeded) {
        setLoading(false);
      }
    }
  };

  if (isRedirectingAfterAuth || (isAuthenticated && !!user)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Mengalihkan ke dashboard...</p>
        </div>
      </div>
    );
  }

  // Animation variants that respect reduced motion preference
  const containerVariants = {
    initial: { opacity: shouldReduceMotion ? 1 : 0 },
    animate: {
      opacity: 1,
      transition: {
        duration: shouldReduceMotion ? 0 : 0.6,
        staggerChildren: shouldReduceMotion ? 0 : 0.1
      }
    }
  };

  const itemVariants = {
    initial: {
      opacity: shouldReduceMotion ? 1 : 0,
      y: shouldReduceMotion ? 0 : 20
    },
    animate: {
      opacity: 1,
      y: 0,
      transition: { duration: shouldReduceMotion ? 0 : 0.5 }
    }
  };

  const features: FeatureItem[] = [
    {
      icon: TrendingUp,
      title: "Real-time Analytics",
      description: "Monitoring Produksi Panen dan Lalu lintas Kendaraan di kebun.",
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
      borderColor: "border-emerald-200 dark:border-emerald-800"
    },
    {
      icon: Shield,
      title: "Secure Operations",
      description: "Keamanan tingkat enterprise dengan enkripsi end-to-end",
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
      borderColor: "border-blue-200 dark:border-blue-800"
    },
    {
      icon: Clock,
      title: "Offline-First Mobile",
      description: "Tetap produktif meski tanpa koneksi internet untuk role Mandor dan Satpam",
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-50 dark:bg-purple-900/20",
      borderColor: "border-purple-200 dark:border-purple-800"
    },
    {
      icon: Users,
      title: "Multi-Role Access",
      description: "Semua peran kebun — Mandor, Satpam, Asisten, Manager hingga Grading — dalam satu sistem.",
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-50 dark:bg-orange-900/20",
      borderColor: "border-orange-200 dark:border-orange-800"
    }
  ];

  if (isMobileViewport) {
    return (
      <div
        data-page="login-mobile"
        className="min-h-[100dvh] bg-gradient-to-b from-slate-50 via-white to-emerald-50 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950"
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 z-50 bg-emerald-600 text-white px-4 py-2 rounded-lg font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
        >
          Skip to main content
        </a>

        <motion.main
          variants={containerVariants}
          initial="initial"
          animate="animate"
          id="main-content"
          className="relative z-10 min-h-[100dvh] px-4 py-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
          aria-label="Login page mobile"
        >
          <div className="mx-auto w-full max-w-md">
            <motion.header variants={itemVariants} className="text-center mb-4">
              <div className="inline-flex items-center justify-center gap-2 mb-3">
                <div
                  className="flex-shrink-0 p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg"
                  role="img"
                  aria-label="AgrInova logo"
                >
                  <Sprout className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                </div>
                <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                  Agr<span className="text-emerald-600 dark:text-emerald-400">I</span>nova
                </h1>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Digital Plantation Intelligence
              </p>
            </motion.header>

            <motion.section
              variants={itemVariants}
              role="form"
              aria-labelledby="login-heading-mobile"
              className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500 focus-within:ring-offset-2"
            >
              <header className="px-4 pt-5 pb-4 text-center border-b border-slate-200 dark:border-slate-700">
                <h2
                  id="login-heading-mobile"
                  className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-1"
                >
                  Masuk ke AgrInova
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Akses platform manajemen kebun sawit Anda
                </p>
              </header>

              <div className="p-4 pt-4">
                <LoginForm
                  onSubmit={handleLogin}
                  onQRLogin={handleQRLogin}
                  loading={loading}
                  onForgotPassword={handleForgotPassword}
                  defaultUsername={usernameParam || undefined}
                />
              </div>

              <footer className="px-4 pb-5 flex flex-col items-center gap-2">
                <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <Shield className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
                  <span className="text-center">Dilindungi dengan enkripsi end-to-end</span>
                </div>
                <div className="flex items-center gap-3">
                  <a
                    href="/privacy-policy"
                    className="text-xs text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                  >
                    Kebijakan Privasi
                  </a>
                  <span className="text-xs text-slate-300 dark:text-slate-600">|</span>
                  <a
                    href="/terms-of-service"
                    className="text-xs text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                  >
                    Syarat &amp; Ketentuan
                  </a>
                  <span className="text-xs text-slate-300 dark:text-slate-600">•</span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    v{process.env.NEXT_PUBLIC_APP_VERSION ?? '—'}
                  </span>
                </div>
              </footer>
            </motion.section>
          </div>
        </motion.main>
      </div>
    );
  }

  return (
    <div
      data-page="login"
      className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950"
    >
      {/* Skip to main content for screen readers */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 z-50 bg-emerald-600 text-white px-4 py-2 rounded-lg font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
      >
        Skip to main content
      </a>

      {/* Interactive Fluid Cursor Effect */}
      <SplashCursor
        SPLAT_RADIUS={0.15}
        SPLAT_FORCE={8000}
        DENSITY_DISSIPATION={4}
        VELOCITY_DISSIPATION={2.5}
        COLOR_UPDATE_SPEED={8}
        BACK_COLOR={{ r: 0.02, g: 0.05, b: 0.02 }}
        TRANSPARENT={true}
      />

      {/* Subtle Background Pattern */}
      <div
        className="login-bg-pattern absolute inset-0 opacity-[0.02] dark:opacity-[0.01]"
        style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, rgba(34, 197, 94, 0.1) 0%, transparent 50%), 
                            radial-gradient(circle at 75% 75%, rgba(59, 130, 246, 0.1) 0%, transparent 50%)`
        }}
        aria-hidden="true"
      />

      <motion.div
        variants={containerVariants}
        initial="initial"
        animate="animate"
        className="login-main relative z-10 min-h-screen flex items-center justify-center px-4 py-4 sm:py-6 lg:p-8"
        id="main-content"
        role="main"
        aria-label="Login page"
      >
        <div className="w-full max-w-7xl mx-auto">
          {/* Mobile-first responsive grid layout */}
          <div className="login-layout flex flex-col lg:grid lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8 lg:gap-16 items-stretch min-h-[calc(100vh-2rem)] sm:min-h-[calc(100vh-3rem)]">

            {/* Left Side - Brand & Value Proposition - Hidden on mobile, shown on tablet+ */}
            <motion.div
              variants={itemVariants}
              className="login-desktop-panel hidden md:block order-2 lg:order-1 space-y-6 sm:space-y-8 lg:space-y-12 flex flex-col justify-start items-start"
              role="region"
              aria-labelledby="brand-heading"
            >
              {/* Brand Header */}
              <header className="text-center lg:text-left mt-0">
                <div className="flex items-center justify-center lg:justify-start gap-4 mb-6">
                  <div
                    className="flex-shrink-0 p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl"
                    role="img"
                    aria-label="AgrInova logo - palm oil plantation management"
                  >
                    <Sprout className="h-10 w-10 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                  </div>
                  <div>
                    <h1
                      id="brand-heading"
                      className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black text-slate-800 dark:text-slate-100 tracking-tight"
                    >
                      Agr<span className="text-emerald-600 dark:text-emerald-400">I</span>nova
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="h-1 w-8 bg-emerald-500 rounded-full" aria-hidden="true"></div>
                      <p
                        className="text-lg font-medium text-slate-600 dark:text-slate-400"
                        id="brand-tagline"
                      >
                        Digital Plantation Intelligence
                      </p>
                    </div>
                  </div>
                </div>

                <motion.p
                  variants={itemVariants}
                  className="text-lg sm:text-xl lg:text-2xl text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl mx-auto lg:mx-0 px-4 sm:px-0"
                  aria-describedby="brand-tagline"
                >
                  Solusi inovatif untuk manajemen perkebunan kelapa sawit dengan keamanan enterprise.
                </motion.p>
              </header>

              {/* Key Features Grid */}
              <motion.div
                variants={itemVariants}
                className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6 px-4 sm:px-0"
                role="region"
                aria-labelledby="features-heading"
              >
                <h2 id="features-heading" className="sr-only">Key Features</h2>
                {features.map((feature, index) => {
                  const Icon = feature.icon;

                  const FeatureCard = (
                    <motion.article
                      variants={itemVariants}
                      whileHover={shouldReduceMotion ? {} : {
                        scale: 1.02,
                        transition: { duration: 0.2 }
                      }}
                      className={`w-full p-6 rounded-2xl border transition-all duration-300 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${index === 0 ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' :
                        index === 1 ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' :
                          index === 2 ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800' :
                            'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
                        }`}
                      tabIndex={0}
                      role="article"
                      aria-labelledby={`feature-${index}-title`}
                      aria-describedby={`feature-${index}-desc`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          // Optional: Add click action or focus next element
                        }
                      }}
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className="flex-shrink-0"
                          role="img"
                          aria-label={feature.title}
                        >
                          <Icon className={`h-6 w-6 ${index === 0 ? 'text-emerald-600 dark:text-emerald-400' :
                            index === 1 ? 'text-blue-600 dark:text-blue-400' :
                              index === 2 ? 'text-purple-600 dark:text-purple-400' :
                                'text-orange-600 dark:text-orange-400'
                            }`} aria-hidden="true" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3
                            id={`feature-${index}-title`}
                            className="font-semibold text-slate-800 dark:text-slate-200 mb-1"
                          >
                            {feature.title}
                          </h3>
                          <p
                            id={`feature-${index}-desc`}
                            className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed"
                          >
                            {feature.description}
                          </p>
                        </div>
                      </div>
                    </motion.article>
                  );

                  // Return the FeatureCard directly since SplashCursor is a global overlay
                  return <div key={index} className="flex">{FeatureCard}</div>;
                })}
              </motion.div>

              {/* Mobile App Download Card */}
              <motion.div variants={itemVariants}>
                <div className="bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20 backdrop-blur-sm rounded-2xl p-6 border border-emerald-200 dark:border-emerald-800">
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-4">
                    📱 Download Agrinova Mobile
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Android Download */}
                    <a
                      href="https://play.google.com/store/apps/details?id=com.agrinova.android"
                      className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-xl border border-green-200 dark:border-green-800 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all duration-200 group"
                      aria-label="Download di Google Play Store"
                    >
                      <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center group-hover:bg-green-200 dark:group-hover:bg-green-900/50 transition-colors">
                        <Download className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-green-700 dark:text-green-400">Android</div>
                        <div className="text-xs text-green-600 dark:text-green-500">Google Play Store</div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-green-500 group-hover:translate-x-1 transition-transform" />
                    </a>

                    {/* iOS App Store */}
                    <button
                      onClick={() => toast.info('🍎 iOS App Store - Coming Soon!', {
                        description: 'The iOS app will be available on the App Store soon.',
                        duration: 5000,
                      })}
                      className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-xl border border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200 group"
                      aria-label="iOS App Store coming soon"
                    >
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
                        <ExternalLink className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-blue-700 dark:text-blue-400">iOS App Store</div>
                        <div className="text-xs text-blue-600 dark:text-blue-500">Coming Soon</div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-blue-500 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>

            {/* Mobile Brand Header - Only shown on mobile */}
            <motion.div
              variants={itemVariants}
              className="login-mobile-brand md:hidden order-1 text-center mb-6 px-2"
            >
              <div className="flex items-center justify-center gap-2 mb-3">
                <div
                  className="flex-shrink-0 p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg"
                  role="img"
                  aria-label="AgrInova logo"
                >
                  <Sprout className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                  Agr<span className="text-emerald-600 dark:text-emerald-400">I</span>nova
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mb-1">
                Digital Plantation Intelligence
              </p>
              <div className="h-0.5 w-16 bg-emerald-500 rounded-full mx-auto" aria-hidden="true"></div>
            </motion.div>

            {/* Login Form Section - Mobile-first responsive with fixed height container */}
            <motion.section
              variants={itemVariants}
              className="login-form-section order-2 lg:order-2 flex flex-col items-center justify-start w-full h-full"
              role="form"
              aria-labelledby="login-heading"
            >
              <div className="login-form-wrapper w-full max-w-md mx-auto px-2 sm:px-0 mt-0 h-full flex flex-col">
                <motion.div
                  whileHover={shouldReduceMotion ? {} : {
                    y: -2,
                    transition: { duration: 0.3 }
                  }}
                  className="login-card bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-xl sm:rounded-2xl lg:rounded-3xl shadow-lg sm:shadow-xl lg:shadow-2xl border-2 border-amber-400 dark:border-amber-500 overflow-hidden focus-within:ring-2 focus-within:ring-amber-400 focus-within:ring-offset-2 w-full flex flex-col flex-1"
                  tabIndex={-1}
                >
                  {/* Login Header - Mobile optimized */}
                  <header className="p-4 sm:p-6 lg:p-8 pb-3 sm:pb-4 lg:pb-6 text-center border-b border-slate-200 dark:border-slate-700">
                    {/* Hide logo on mobile since we have it above */}
                    <motion.div
                      variants={itemVariants}
                      className="hidden md:flex justify-center mb-3 sm:mb-4"
                    >
                      <div
                        className="p-2 sm:p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl sm:rounded-2xl"
                        role="img"
                        aria-label="AgrInova login"
                      >
                        <Sprout className="h-6 w-6 sm:h-8 sm:w-8 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                      </div>
                    </motion.div>
                    <h2
                      id="login-heading"
                      className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-800 dark:text-slate-100 mb-1 sm:mb-2"
                    >
                      Masuk ke AgrInova
                    </h2>
                    <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
                      Akses platform manajemen kebun sawit Anda
                    </p>
                  </header>

                  {/* Login Form - Mobile responsive padding with stable container */}
                  <div className="p-4 sm:p-6 lg:p-8 pt-4 sm:pt-6 flex-1">
                    {/* Fixed height container to prevent layout shifts */}
                    <div className="login-form-shell flex flex-col">
                      <LoginForm
                        onSubmit={handleLogin}
                        onQRLogin={handleQRLogin}
                        loading={loading}
                        onForgotPassword={handleForgotPassword}
                        defaultUsername={usernameParam || undefined}
                      />
                    </div>
                  </div>

                  {/* Footer - Mobile responsive */}
                  <footer className="px-4 sm:px-6 lg:px-8 pb-4 sm:pb-6 lg:pb-8 flex flex-col items-center gap-2">
                    <div className="flex items-center justify-center gap-1.5 sm:gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <Shield className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
                      <span className="text-center">Dilindungi dengan enkripsi end-to-end</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <a
                        href="/privacy-policy"
                        className="text-xs text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                      >
                        Kebijakan Privasi
                      </a>
                      <span className="text-xs text-slate-300 dark:text-slate-600">|</span>
                      <a
                        href="/terms-of-service"
                        className="text-xs text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                      >
                        Syarat &amp; Ketentuan
                      </a>
                      <span className="text-xs text-slate-300 dark:text-slate-600">•</span>
                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        v{process.env.NEXT_PUBLIC_APP_VERSION ?? '—'}
                      </span>
                    </div>
                  </footer>
                </motion.div>

              </div>
            </motion.section>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <LoginErrorBoundary>
      <React.Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-600 dark:text-slate-400">Memuat AgrInova...</p>
            </div>
          </div>
        }
      >
        <LoginPageContent />
      </React.Suspense>
    </LoginErrorBoundary>
  );
}
