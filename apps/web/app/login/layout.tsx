import type { Metadata } from 'next';
import type { CSSProperties } from 'react';
import './login.mobile.css';

const loginFontStyle: CSSProperties = {
  ['--font-playfair' as string]: '"Georgia", "Times New Roman", serif',
  ['--font-dm-sans' as string]: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
};

export const metadata: Metadata = {
  title: 'Login | Agrinova',
  description: 'Masuk ke sistem digital panen & gate check kebun sawit Agrinova',
  robots: {
    index: false,
    follow: false,
  },
};

interface LoginLayoutProps {
  children: React.ReactNode;
}

export default function LoginLayout({ children }: LoginLayoutProps) {
  return (
    <div className="min-h-screen" style={loginFontStyle}>
      {children}
    </div>
  );
}
