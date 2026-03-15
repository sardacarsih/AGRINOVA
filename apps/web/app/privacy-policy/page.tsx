import type { Metadata } from 'next';
import { PrivacyPolicyClientPage } from './privacy-policy-client-page';

export const metadata: Metadata = {
  title: 'Kebijakan Privasi - Agrinova',
  description:
    'Kebijakan Privasi Aplikasi Mobile Agrinova — PT. Kalimantan Sawit Kusuma. Perlindungan data dan privasi pengguna dalam sistem manajemen perkebunan kelapa sawit.',
  robots: {
    index: true,
    follow: true,
  },
};

export default function PrivacyPolicyPage() {
  return <PrivacyPolicyClientPage />;
}
