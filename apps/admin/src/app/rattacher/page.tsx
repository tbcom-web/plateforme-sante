import { getUser } from '@/lib/supabase/server';
import { MARQUE } from '@/lib/marque';
import { CODE_VALIDE } from '@/lib/rattachement';
import Rattacher from './Rattacher';

export const metadata = { title: 'Rattacher votre site' };

// Lien transmis par l'admin après la création du site d'un client : /rattacher?code=…
// Page accessible sans connexion (le code est gardé pendant la connexion), vérifications faites en base.
export default async function PageRattacher({ searchParams }: PageProps<'/rattacher'>) {
  const { code } = await searchParams;
  const valide = typeof code === 'string' && CODE_VALIDE.test(code);
  const user = valide ? await getUser() : null;

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-black/5 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold tracking-wide text-teal-800">{MARQUE.nom}</p>
        <h1 className="mt-2 text-2xl font-bold">Rattacher votre site</h1>
        {valide ? (
          <Rattacher code={code} email={user?.email ?? null} />
        ) : (
          <p className="mt-4 text-sm text-red-700">Ce lien est incomplet. Copiez-le en entier depuis le message reçu, ou demandez-en un nouveau.</p>
        )}
      </div>
    </main>
  );
}
