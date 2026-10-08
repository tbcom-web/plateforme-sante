import { LIBELLES_ROLES } from '@plateforme/core';
import { exigerValidateur, getEquipe } from '@/lib/chaine-modeles';
import { createClient } from '@/lib/supabase/server';
import Roles from './Roles';

export const metadata = { title: 'Chaîne · Équipe' };

// Rôles de la chaîne (validateur seulement) : Paul crée lui-même les comptes (aucun compte n'est créé ici) ; on cherche un compte
// EXISTANT par son e-mail et on lui attribue « contributeur » (ou « validateur »), ou on retire le rôle.
export default async function PageEquipe({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const moi = await exigerValidateur();
  const sp = await searchParams;
  const q = String((Array.isArray(sp.q) ? sp.q[0] : sp.q) ?? '').trim().toLowerCase().slice(0, 120);
  const equipe = await getEquipe();
  let trouves: { id: string; email: string; role_equipe: string | null }[] = [];
  if (q.length >= 3) {
    const supabase = await createClient();
    const { data } = await supabase.from('profiles').select('id, email, role_equipe').ilike('email', `%${q.replace(/[%_]/g, '')}%`).limit(20);
    trouves = (data ?? []) as typeof trouves;
  }
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
      <div>
        <h1 className="text-2xl font-bold">Équipe de la chaîne</h1>
        <p className="mt-1 max-w-3xl text-sm text-neutral-600">{LIBELLES_ROLES.contributeur} : présélection, tournoi, avis, commentaires ; jamais valider ni publier. {LIBELLES_ROLES.validateur} : validation finale et publication. Créez d’abord le compte vous-même, puis attribuez le rôle ici.</p>
      </div>
      <Roles moi={moi.id} equipe={equipe} trouves={trouves} q={q} />
    </div>
  );
}
