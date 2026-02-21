import { redirect } from 'next/navigation';

export default function TarifBlokPage() {
  redirect('/blocks?tab=tarif-blok');
}
