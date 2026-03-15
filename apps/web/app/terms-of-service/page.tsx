import type { Metadata } from 'next';
import { TermsConditionsClientPage } from './terms-conditions-client-page';

export const metadata: Metadata = {
  title: 'Syarat & Ketentuan - Agrinova',
  description:
    'Syarat dan Ketentuan penggunaan aplikasi Agrinova untuk operasional manajemen perkebunan kelapa sawit.',
};

export default function TermsOfServicePage() {
  return <TermsConditionsClientPage />;
}
