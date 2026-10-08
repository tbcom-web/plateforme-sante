import { redirect } from 'next/navigation';
import { getRole } from '@/lib/admin';
import { getEquipier } from '@/lib/chaine-modeles';

// Super admin : liste des sites ; équipe TBCOM (contributeur, migration 0050) : la chaîne des modèles ; praticien : son tableau de bord.
export default async function Accueil() {
  if ((await getRole()) === 'admin') redirect('/admin');
  redirect((await getEquipier().catch(() => null)) ? '/chaine' : '/tableau-de-bord');
}
