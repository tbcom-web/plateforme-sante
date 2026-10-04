import { redirect } from 'next/navigation';
import { getRole } from '@/lib/admin';

// Super admin : liste des sites ; praticien : son tableau de bord.
export default async function Accueil() {
  redirect((await getRole()) === 'admin' ? '/admin' : '/tableau-de-bord');
}
