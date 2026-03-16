'use client';

import * as React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  QrCode,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Smartphone,
  Loader2
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import cookieApiClient from '@/lib/api/cookie-client';

interface QRLoginProps {
  onSuccess: (payload: { user: unknown; expiresAt: Date }) => Promise<void> | void;
  onError: (error: string) => void;
}

type QRStatus = 'generating' | 'pending' | 'approved' | 'expired' | 'error';

const DEFAULT_QR_TTL_SECONDS = 120;
const QR_CODE_SIZE = 164;

const getStatusToneClass = (status: QRStatus): string => {
  if (status === 'generating') return 'login-qr-status-icon login-qr-status-generating';
  if (status === 'pending') return 'login-qr-status-icon login-qr-status-pending';
  if (status === 'approved') return 'login-qr-status-icon login-qr-status-approved';
  if (status === 'expired' || status === 'error') return 'login-qr-status-icon login-qr-status-error';
  return 'login-qr-status-icon';
};

export function QRLogin({ onSuccess, onError }: QRLoginProps) {
  const [status, setStatus] = React.useState<QRStatus>('generating');
  const [qrCodeData, setQrCodeData] = React.useState('');
  const [timeLeft, setTimeLeft] = React.useState(DEFAULT_QR_TTL_SECONDS);
  const [totalDurationSeconds, setTotalDurationSeconds] = React.useState(DEFAULT_QR_TTL_SECONDS);

  const pollingIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const onSuccessRef = React.useRef(onSuccess);
  const onErrorRef = React.useRef(onError);
  const isConsumingRef = React.useRef(false);

  React.useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  React.useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const clearTimers = React.useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  const consumeApprovedSession = React.useCallback(async (sid: string, sessionChallenge: string) => {
    if (isConsumingRef.current) {
      return;
    }
    isConsumingRef.current = true;
    try {
      const consumeResponse = await cookieApiClient.consumeWebQRLogin({
        sessionId: sid,
        challenge: sessionChallenge,
      });

      if (!consumeResponse.success || !consumeResponse.data?.user) {
        setStatus('error');
        onErrorRef.current(consumeResponse.message || 'Gagal menyelesaikan login QR.');
        return;
      }

      const authenticated = await cookieApiClient.checkAuth();
      if (!authenticated) {
        setStatus('error');
        onErrorRef.current('QR login berhasil, tetapi sesi belum aktif. Silakan coba lagi.');
        return;
      }

      setStatus('approved');
      clearTimers();

      await onSuccessRef.current({
        user: consumeResponse.data.user,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });
    } catch (error: unknown) {
      setStatus('error');
      onErrorRef.current(error instanceof Error ? error.message : 'Gagal menyelesaikan login QR.');
    } finally {
      isConsumingRef.current = false;
    }
  }, [clearTimers]);

  const startPolling = React.useCallback((sid: string, sessionChallenge: string) => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    pollingIntervalRef.current = setInterval(async () => {
      try {
        if (isConsumingRef.current) {
          return;
        }

        const response = await cookieApiClient.getWebQRLoginStatus(sid, sessionChallenge);
        const statusValue = response.data?.status;

        if (!response.success && statusValue !== 'PENDING') {
          setStatus('error');
          clearTimers();
          onErrorRef.current(response.message || 'Status QR login tidak valid.');
          return;
        }

        if (statusValue === 'APPROVED') {
          clearTimers();
          await consumeApprovedSession(sid, sessionChallenge);
          return;
        }

        if (statusValue === 'EXPIRED' || statusValue === 'CONSUMED') {
          setStatus('expired');
          clearTimers();
        }
      } catch (error) {
        console.error('QR status polling error:', error);
      }
    }, 3000);
  }, [clearTimers, consumeApprovedSession]);

  const startCountdown = React.useCallback((expiryMs: number) => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    countdownIntervalRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((expiryMs - Date.now()) / 1000));
      setTimeLeft(remaining);

      if (remaining <= 0) {
        setStatus('expired');
        clearTimers();
      }
    }, 1000);
  }, [clearTimers]);

  const generateQRCode = React.useCallback(async () => {
    try {
      clearTimers();
      setStatus('generating');

      const response = await cookieApiClient.createWebQRLoginSession();
      if (!response.success || !response.data?.sessionId || !response.data.challenge || !response.data.qrData) {
        setStatus('error');
        onErrorRef.current(response.message || 'Gagal membuat QR Code. Silakan coba lagi.');
        return;
      }

      const expiryMs = response.data.expiresAt ? new Date(response.data.expiresAt).getTime() : Date.now() + DEFAULT_QR_TTL_SECONDS * 1000;
      const remainingSeconds = Math.max(0, Math.ceil((expiryMs - Date.now()) / 1000));

      setQrCodeData(response.data.qrData);
      setTimeLeft(remainingSeconds);
      setTotalDurationSeconds(Math.max(1, remainingSeconds));
      setStatus('pending');

      startPolling(response.data.sessionId, response.data.challenge);
      startCountdown(expiryMs);
    } catch (error) {
      console.error('QR generation error:', error);
      setStatus('error');
      onErrorRef.current('Terjadi kesalahan saat membuat QR Code.');
    }
  }, [clearTimers, startCountdown, startPolling]);

  React.useEffect(() => {
    generateQRCode();
    return () => clearTimers();
  }, [clearTimers, generateQRCode]);

  const handleRefresh = React.useCallback(() => {
    setQrCodeData('');
    setTimeLeft(DEFAULT_QR_TTL_SECONDS);
    setTotalDurationSeconds(DEFAULT_QR_TTL_SECONDS);
    generateQRCode();
  }, [generateQRCode]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusIcon = () => {
    const statusClassName = getStatusToneClass(status);
    switch (status) {
      case 'generating':
        return <Loader2 className={`h-5 w-5 animate-spin sm:h-6 sm:w-6 ${statusClassName}`} />;
      case 'pending':
        return <Clock className={`h-5 w-5 sm:h-6 sm:w-6 ${statusClassName}`} />;
      case 'approved':
        return <CheckCircle className={`h-5 w-5 sm:h-6 sm:w-6 ${statusClassName}`} />;
      case 'expired':
      case 'error':
        return <XCircle className={`h-5 w-5 sm:h-6 sm:w-6 ${statusClassName}`} />;
      default:
        return <QrCode className={`h-5 w-5 sm:h-6 sm:w-6 ${statusClassName}`} />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'generating':
        return 'Membuat QR Code...';
      case 'pending':
        return 'Menunggu konfirmasi dari aplikasi mobile';
      case 'approved':
        return 'QR Code berhasil dikonfirmasi. Mengalihkan...';
      case 'expired':
        return 'QR Code kedaluwarsa';
      case 'error':
        return 'Terjadi kesalahan';
      default:
        return 'QR Code Login';
    }
  };

  return (
    <Card className="login-qr-card w-full max-w-none mx-auto">
      <CardContent className="login-qr-card-content space-y-3 p-3 sm:p-4">
        <div className="text-center space-y-1">
          <div className="flex items-center justify-center space-x-2">
            {getStatusIcon()}
            <h3 className="text-base font-semibold">QR Code Login</h3>
          </div>
          <p className="text-[11px] text-muted-foreground sm:text-xs" aria-live="polite">{getStatusText()}</p>
        </div>

        <AnimatePresence mode="wait">
          {status === 'generating' && (
            <motion.div
              key="generating"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex h-44 items-center justify-center"
            >
              <div className="space-y-3 text-center">
                <Loader2 className="mx-auto h-10 w-10 animate-spin text-blue-500" />
                <p className="text-sm text-muted-foreground">Sedang membuat QR Code...</p>
              </div>
            </motion.div>
          )}

          {(status === 'pending' || status === 'approved') && qrCodeData && (
            <motion.div
              key="qr-code"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="space-y-3"
            >
              <div className="login-qr-frame flex justify-center rounded-lg p-2.5">
                <QRCodeSVG
                  value={qrCodeData}
                  size={QR_CODE_SIZE}
                  level="M"
                  includeMargin={false}
                  className="border border-gray-200 rounded"
                />
              </div>

              {status === 'approved' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="login-qr-approved rounded-lg border p-2.5 text-center"
                >
                  <CheckCircle className="mx-auto mb-1.5 h-6 w-6 login-qr-status-approved" />
                  <p className="text-sm font-medium">Login berhasil!</p>
                  <p className="text-xs opacity-90">Mengalihkan ke dashboard...</p>
                </motion.div>
              )}
            </motion.div>
          )}

          {(status === 'expired' || status === 'error') && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3 text-center"
            >
              <div className="login-qr-error rounded-lg p-4">
                <XCircle className="mx-auto mb-2 h-10 w-10 login-qr-status-error" />
                <p className="text-sm">
                  {status === 'expired' ? 'QR Code telah kedaluwarsa' : 'Terjadi kesalahan'}
                </p>
              </div>

              <Button
                onClick={handleRefresh}
                variant="outline"
                className="login-qr-refresh-btn w-full"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Buat QR Code Baru
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {status === 'pending' && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between rounded-md">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                Berlaku: <span className="login-qr-timer">{formatTime(timeLeft)}</span>
              </span>
              <Button
                onClick={handleRefresh}
                variant="ghost"
                size="sm"
                className="login-qr-refresh-btn h-8 px-2.5 text-xs"
                aria-label="Refresh QR code"
              >
                <RefreshCw className="mr-1 h-3 w-3" />
                Refresh
              </Button>
            </div>

            <div className="login-qr-progress-track h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="login-qr-progress-bar h-full rounded-full transition-all duration-1000"
                style={{ width: `${Math.max(0, (timeLeft / totalDurationSeconds) * 100)}%` }}
              />
            </div>

            <div className="login-qr-instructions space-y-1.5 rounded-lg p-2.5 text-xs text-muted-foreground">
              <div className="flex items-center space-x-1.5">
                <Smartphone className="h-4 w-4" />
                <span className="font-medium">Gunakan aplikasi Agrinova:</span>
              </div>
              <ol className="grid grid-cols-3 gap-2 text-[11px] leading-tight">
                <li className="login-qr-step rounded px-2 py-1">1. Buka app</li>
                <li className="login-qr-step rounded px-2 py-1">2. Scan QR</li>
                <li className="login-qr-step rounded px-2 py-1">3. Konfirmasi</li>
              </ol>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
