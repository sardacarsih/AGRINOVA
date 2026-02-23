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
  onSuccess: (payload: { user: any; expiresAt: Date }) => Promise<void> | void;
  onError: (error: string) => void;
}

type QRStatus = 'generating' | 'pending' | 'approved' | 'expired' | 'error';

const DEFAULT_QR_TTL_SECONDS = 120;

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
    } catch (error: any) {
      setStatus('error');
      onErrorRef.current(error?.message || 'Gagal menyelesaikan login QR.');
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
    switch (status) {
      case 'generating':
        return <Loader2 className="h-6 w-6 animate-spin text-blue-500" />;
      case 'pending':
        return <Clock className="h-6 w-6 text-yellow-500" />;
      case 'approved':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'expired':
      case 'error':
        return <XCircle className="h-6 w-6 text-red-500" />;
      default:
        return <QrCode className="h-6 w-6 text-gray-500" />;
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
    <Card className="w-full max-w-sm mx-auto">
      <CardContent className="p-6 space-y-4">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center space-x-2">
            {getStatusIcon()}
            <h3 className="text-lg font-semibold">QR Code Login</h3>
          </div>
          <p className="text-sm text-muted-foreground">{getStatusText()}</p>
        </div>

        <AnimatePresence mode="wait">
          {status === 'generating' && (
            <motion.div
              key="generating"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center h-64"
            >
              <div className="text-center space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto" />
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
              className="space-y-4"
            >
              <div className="flex justify-center p-4 bg-gray-50 rounded-lg">
                <QRCodeSVG
                  value={qrCodeData}
                  size={200}
                  level="M"
                  includeMargin
                  className="border border-gray-200 rounded"
                />
              </div>

              {status === 'pending' && (
                <div className="text-center space-y-2">
                  <div className="flex items-center justify-center space-x-2 text-sm">
                    <Clock className="h-4 w-4" />
                    <span>Berlaku selama: {formatTime(timeLeft)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-1000"
                      style={{ width: `${Math.max(0, (timeLeft / totalDurationSeconds) * 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {status === 'approved' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center p-3 bg-green-50 border border-green-200 rounded-lg"
                >
                  <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <p className="text-sm font-medium text-green-800">Login berhasil!</p>
                  <p className="text-xs text-green-600">Mengalihkan ke dashboard...</p>
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
              className="text-center space-y-4"
            >
              <div className="p-8 bg-gray-50 rounded-lg">
                <XCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
                <p className="text-sm text-gray-600">
                  {status === 'expired' ? 'QR Code telah kedaluwarsa' : 'Terjadi kesalahan'}
                </p>
              </div>

              <Button
                onClick={handleRefresh}
                variant="outline"
                className="w-full"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Buat QR Code Baru
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {status === 'pending' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">QR Code masih berlaku</span>
              <Button
                onClick={handleRefresh}
                variant="ghost"
                size="sm"
                className="h-8 px-2"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            </div>

            <div className="text-xs text-muted-foreground space-y-1 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-2">
                <Smartphone className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-blue-800">Cara menggunakan:</span>
              </div>
              <ul className="space-y-1 text-blue-700">
                <li>- Buka aplikasi Agrinova di mobile</li>
                <li>- Pilih menu scan login QR</li>
                <li>- Scan QR Code ini</li>
                <li>- Konfirmasi login di aplikasi mobile</li>
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
