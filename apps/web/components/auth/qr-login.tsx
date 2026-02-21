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
import { mockAuthService } from '@/lib/auth/mock-auth';

interface QRLoginProps {
  onSuccess: (user: any, accessToken: string) => void;
  onError: (error: string) => void;
}

type QRStatus = 'generating' | 'pending' | 'approved' | 'expired' | 'error';

export function QRLogin({ onSuccess, onError }: QRLoginProps) {
  const [status, setStatus] = React.useState<QRStatus>('generating');
  const [qrCodeData, setQrCodeData] = React.useState<string>('');
  const [sessionId, setSessionId] = React.useState<string>('');
  const [timeLeft, setTimeLeft] = React.useState<number>(300); // 5 minutes
  const [checkInterval, setCheckInterval] = React.useState<NodeJS.Timeout | null>(null);
  const [countdownInterval, setCountdownInterval] = React.useState<NodeJS.Timeout | null>(null);

  const generateQRCode = async () => {
    try {
      setStatus('generating');
      
      const response = await mockAuthService.generateQRCode();
      
      if (response.success && response.sessionId) {
        const qrData = JSON.stringify({
          type: 'agrinova_login',
          sessionId: response.sessionId,
          expiresAt: response.expiresAt?.getTime(),
          domain: window.location.origin,
        });
        
        setQrCodeData(qrData);
        setSessionId(response.sessionId);
        setStatus('pending');
        setTimeLeft(300); // Reset to 5 minutes
        
        startPolling(response.sessionId);
        startCountdown();
      } else {
        setStatus('error');
        onError('Gagal membuat QR Code. Silakan coba lagi.');
      }
    } catch (error) {
      console.error('QR generation error:', error);
      setStatus('error');
      onError('Terjadi kesalahan saat membuat QR Code.');
    }
  };

  const startPolling = (sessionId: string) => {
    // Clear existing interval
    if (checkInterval) clearInterval(checkInterval);
    
    const interval = setInterval(async () => {
      try {
        const response = await mockAuthService.checkQRLogin(sessionId);
        
        if (response.status === 'approved' && response.user && response.accessToken) {
          setStatus('approved');
          clearInterval(interval);
          if (countdownInterval) clearInterval(countdownInterval);
          onSuccess(response.user, response.accessToken);
        } else if (response.status === 'expired') {
          setStatus('expired');
          clearInterval(interval);
          if (countdownInterval) clearInterval(countdownInterval);
        }
      } catch (error) {
        console.error('QR check error:', error);
      }
    }, 3000); // Check every 3 seconds
    
    setCheckInterval(interval);
  };

  const startCountdown = () => {
    // Clear existing countdown
    if (countdownInterval) clearInterval(countdownInterval);
    
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setStatus('expired');
          if (checkInterval) clearInterval(checkInterval);
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    setCountdownInterval(interval);
  };

  const handleRefresh = () => {
    if (checkInterval) clearInterval(checkInterval);
    if (countdownInterval) clearInterval(countdownInterval);
    generateQRCode();
  };

  React.useEffect(() => {
    generateQRCode();
    
    return () => {
      if (checkInterval) clearInterval(checkInterval);
      if (countdownInterval) clearInterval(countdownInterval);
    };
  }, []);

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
        return <XCircle className="h-6 w-6 text-red-500" />;
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
        return 'Menunggu scan dari aplikasi mobile';
      case 'approved':
        return 'QR Code berhasil di-scan! Mengalihkan...';
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
          <p className="text-sm text-muted-foreground">
            {getStatusText()}
          </p>
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
                <p className="text-sm text-muted-foreground">
                  Sedang membuat QR Code...
                </p>
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
                      style={{ width: `${(timeLeft / 300) * 100}%` }}
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
                  <p className="text-sm font-medium text-green-800">
                    Login berhasil!
                  </p>
                  <p className="text-xs text-green-600">
                    Mengalihkan ke dashboard...
                  </p>
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
                  {status === 'expired' 
                    ? 'QR Code telah kedaluwarsa'
                    : 'Terjadi kesalahan'
                  }
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
              <span className="text-sm text-muted-foreground">
                QR Code masih berlaku
              </span>
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
                <li>• Buka aplikasi Agrinova di mobile</li>
                <li>• Pilih "Login dengan QR Code"</li>
                <li>• Arahkan kamera ke QR Code ini</li>
                <li>• Konfirmasi login di aplikasi mobile</li>
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}