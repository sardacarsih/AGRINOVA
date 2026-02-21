'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QrCode, RefreshCw, Check, X, Clock, Smartphone, Wifi, Shield, Zap } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface QRCodeDisplayProps {
  qrData: string;
  sessionId: string;
  status: 'pending' | 'confirmed' | 'expired';
  expiresAt: Date;
  onRefresh: () => void;
  onConfirmed?: () => void;
}

export function QRCodeDisplay({
  qrData,
  sessionId,
  status,
  expiresAt,
  onRefresh,
  onConfirmed
}: QRCodeDisplayProps) {
  const t = useTranslations('forms');
  const [timeLeft, setTimeLeft] = React.useState<number>(0);
  const [pulseKey, setPulseKey] = React.useState(0);

  // Update countdown timer
  React.useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime();
      const expiry = expiresAt.getTime();
      const remaining = Math.max(0, expiry - now);
      setTimeLeft(remaining);
      
      // Trigger pulse animation every 5 seconds
      if (remaining > 0 && Math.floor(remaining / 1000) % 5 === 0) {
        setPulseKey(prev => prev + 1);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  // Call onConfirmed when status changes to confirmed
  React.useEffect(() => {
    if (status === 'confirmed' && onConfirmed) {
      onConfirmed();
    }
  }, [status, onConfirmed]);

  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getTimeProgress = () => {
    const totalTime = 5 * 60 * 1000; // 5 minutes
    return Math.max(0, Math.min(100, (timeLeft / totalTime) * 100));
  };

  const getTimeColor = () => {
    const progress = getTimeProgress();
    if (progress > 60) return 'bg-green-500';
    if (progress > 30) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const generateEnhancedQRPattern = (data: string) => {
    const size = 31; // Larger for better detail
    const pattern = [];
    
    // Create more realistic QR pattern
    for (let i = 0; i < size; i++) {
      pattern[i] = [];
      for (let j = 0; j < size; j++) {
        const hash = data.split('').reduce((a, b) => {
          a = ((a << 5) - a) + b.charCodeAt(0);
          return a & a;
        }, 0);
        
        // Add finder patterns (corners)
        if ((i < 7 && j < 7) || (i < 7 && j >= size - 7) || (i >= size - 7 && j < 7)) {
          const inFinder = (i >= 1 && i <= 5 && j >= 1 && j <= 5) ||
                          (i >= 1 && i <= 5 && j >= size - 6 && j <= size - 2) ||
                          (i >= size - 6 && i <= size - 2 && j >= 1 && j <= 5);
          pattern[i][j] = !inFinder || (i === 3 && j === 3) || (i === 3 && j === size - 4) || (i === size - 4 && j === 3);
        } else {
          // Data pattern
          const shouldFill = (hash + i * j + i + j + i * 7 + j * 11) % 3 === 0;
          pattern[i][j] = shouldFill;
        }
      }
    }
    
    return pattern;
  };

  const qrPattern = generateEnhancedQRPattern(sessionId);

  const renderQRCode = () => (
    <motion.div
      key={pulseKey}
      initial={{ scale: 1 }}
      animate={{ scale: [1, 1.02, 1] }}
      transition={{ duration: 2, ease: "easeInOut" }}
      className="relative"
    >
      {/* QR Code Container with enhanced styling */}
      <div className="relative inline-block">
        {/* Outer glow effect */}
        <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/20 via-green-500/20 to-blue-500/20 rounded-2xl blur-lg" />
        
        {/* QR Code */}
        <div className="relative bg-white p-6 rounded-2xl shadow-2xl border-2 border-gray-100">
          {/* Corner indicators */}
          <div className="absolute -top-2 -left-2 w-6 h-6 border-l-4 border-t-4 border-primary rounded-tl-lg" />
          <div className="absolute -top-2 -right-2 w-6 h-6 border-r-4 border-t-4 border-primary rounded-tr-lg" />
          <div className="absolute -bottom-2 -left-2 w-6 h-6 border-l-4 border-b-4 border-primary rounded-bl-lg" />
          <div className="absolute -bottom-2 -right-2 w-6 h-6 border-r-4 border-b-4 border-primary rounded-br-lg" />
          
          {/* QR Pattern */}
          <div 
            className="grid gap-px"
            style={{ gridTemplateColumns: 'repeat(31, 1fr)', width: '248px', height: '248px' }}
          >
            {qrPattern.map((row, i) =>
              row.map((filled, j) => (
                <motion.div
                  key={`${i}-${j}`}
                  className={`${filled ? 'bg-gray-900' : 'bg-white'} transition-colors duration-200`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: (i + j) * 0.001, duration: 0.1 }}
                />
              ))
            )}
          </div>
          
          {/* Center logo overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-white p-3 rounded-xl shadow-lg border-2 border-primary">
              <QrCode className="h-8 w-8 text-primary" />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );

  if (status === 'confirmed') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-6"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="relative"
        >
          <div className="absolute -inset-8 bg-gradient-to-r from-green-500/30 via-emerald-500/30 to-green-500/30 rounded-full blur-2xl" />
          <div className="relative bg-green-50 dark:bg-green-900/20 p-12 rounded-full border-4 border-green-200 dark:border-green-800">
            <Check className="h-24 w-24 text-green-600 mx-auto" />
          </div>
        </motion.div>
        
        <div className="space-y-2">
          <h3 className="text-2xl font-bold text-green-700 dark:text-green-400">{t('qr.loginSuccess')}</h3>
          <p className="text-green-600 dark:text-green-500">{t('qr.willRedirect')}</p>
        </div>
        
        <motion.div
          className="flex justify-center"
          animate={{ opacity: [1, 0.5, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="flex space-x-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 bg-green-500 rounded-full"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ delay: i * 0.2, duration: 1, repeat: Infinity }}
              />
            ))}
          </div>
        </motion.div>
      </motion.div>
    );
  }

  if (status === 'expired') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-6"
      >
        <div className="relative">
          <div className="absolute -inset-8 bg-gradient-to-r from-red-500/30 via-orange-500/30 to-red-500/30 rounded-full blur-2xl" />
          <div className="relative bg-red-50 dark:bg-red-900/20 p-12 rounded-full border-4 border-red-200 dark:border-red-800">
            <X className="h-24 w-24 text-red-600 mx-auto" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h3 className="text-2xl font-bold text-red-700 dark:text-red-400">{t('qr.expired')}</h3>
          <p className="text-red-600 dark:text-red-500">{t('qr.expiredMessage')}</p>
        </div>
        
        <Button onClick={onRefresh} size="lg" className="px-8">
          <RefreshCw className="h-5 w-5 mr-2" />
          {t('qr.generateNew')}
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      {/* Header */}
      <div className="text-center space-y-3">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1 }}
          className="inline-flex items-center gap-3 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-full border border-blue-200 dark:border-blue-800"
        >
          <Smartphone className="h-5 w-5 text-blue-600" />
          <span className="text-sm font-medium text-blue-700 dark:text-blue-400">{t('qr.loginWithMobile')}</span>
        </motion.div>
        
        <h2 className="text-2xl font-bold text-foreground">{t('qr.scanToLogin')}</h2>
        <p className="text-muted-foreground">{t('qr.useAppDescription')}</p>
      </div>

      {/* QR Code Display */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex justify-center"
      >
        {renderQRCode()}
      </motion.div>

      {/* Timer and Progress */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="space-y-4"
      >
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-secondary/50 rounded-full">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">
              {t('qr.validFor')} {formatTime(timeLeft)}
            </span>
          </div>
        </div>
        
        {/* Enhanced Progress Bar */}
        <div className="relative">
          <div className="w-full bg-secondary/30 rounded-full h-3 overflow-hidden">
            <motion.div
              className={`h-full rounded-full transition-all duration-1000 ${getTimeColor()}`}
              initial={{ width: '100%' }}
              animate={{ width: `${getTimeProgress()}%` }}
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
        </div>
      </motion.div>

      {/* Status Indicators */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="flex justify-center gap-6"
      >
        <div className="flex items-center gap-2 text-green-600">
          <div className="relative">
            <Shield className="h-5 w-5" />
            <motion.div
              className="absolute -inset-1 bg-green-500/30 rounded-full"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
          <span className="text-sm font-medium">{t('qr.features.secure')}</span>
        </div>
        
        <div className="flex items-center gap-2 text-blue-600">
          <div className="relative">
            <Zap className="h-5 w-5" />
            <motion.div
              className="absolute -inset-1 bg-blue-500/30 rounded-full"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
            />
          </div>
          <span className="text-sm font-medium">{t('qr.features.fast')}</span>
        </div>
        
        <div className="flex items-center gap-2 text-purple-600">
          <div className="relative">
            <Wifi className="h-5 w-5" />
            <motion.div
              className="absolute -inset-1 bg-purple-500/30 rounded-full"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity, delay: 1 }}
            />
          </div>
          <span className="text-sm font-medium">{t('qr.features.realtime')}</span>
        </div>
      </motion.div>

      {/* Smart Instructions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <Card className="bg-gradient-to-br from-card/50 to-card border-border/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Smartphone className="h-5 w-5 text-primary" />
                </div>
                <h4 className="font-semibold text-foreground">{t('qr.steps.title')}</h4>
              </div>
              
              <div className="grid gap-3">
                {[
                  { step: 1, text: t('qr.steps.step1'), icon: "📱" },
                  { step: 2, text: t('qr.steps.step2'), icon: "👆" },
                  { step: 3, text: t('qr.steps.step3'), icon: "📸" },
                  { step: 4, text: t('qr.steps.step4'), icon: "✅" }
                ].map((item, index) => (
                  <motion.div
                    key={item.step}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.9 + index * 0.1 }}
                    className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                      {item.step}
                    </div>
                    <div className="flex-shrink-0 text-xl">{item.icon}</div>
                    <span className="text-sm text-foreground">{item.text}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="flex gap-3"
      >
        <Button
          onClick={onRefresh}
          variant="outline"
          size="lg"
          className="flex-1"
          disabled={status === 'pending' && timeLeft > 30000}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          {t('qr.regenerate')}
        </Button>

        {/* Demo button for development */}
        {process.env.NODE_ENV === 'development' && (
          <Button
            onClick={() => {
              if (window.confirm(t('qr.demo.confirm'))) {
                const { qrLoginManager } = require('@/lib/auth/qr-login');
                qrLoginManager.mockConfirmLogin(sessionId, 'mandor@agrinova.com');
              }
            }}
            variant="secondary"
            size="lg"
            className="px-6"
          >
            {t('qr.demoButton')} ✨
          </Button>
        )}
      </motion.div>

      {/* Development Info */}
      <AnimatePresence>
        {process.env.NODE_ENV === 'development' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ delay: 1.2 }}
          >
            <Card className="bg-amber-50/50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="text-amber-500 text-xl">🧪</div>
                  <div>
                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-400 mb-1">{t('qr.devMode.title')}</p>
                    <p className="text-xs text-amber-700 dark:text-amber-500">
                      {t('qr.devMode.description')}
                      {t('qr.devMode.productionNote')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}