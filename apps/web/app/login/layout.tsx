import type { Metadata } from 'next';
import { Playfair_Display, DM_Sans } from 'next/font/google';
import './login.mobile.css';

// Serif display font for brand/headings
const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  style: ['normal', 'italic'],
  variable: '--font-playfair',
  display: 'swap',
});

// Sans-serif body font
const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-dm-sans',
  display: 'swap',
});

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
    <div className={`min-h-screen ${playfair.variable} ${dmSans.variable}`}>
      {children}
    </div>
  );
}
