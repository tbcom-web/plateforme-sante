import { redirect } from 'next/navigation';
import Shell from '@/components/Shell';
import { getUser } from '@/lib/supabase/server';
import FormulaireMotDePasse from './FormulaireMotDePasse';

export const metadata = { title: 'Mon compte' };

export default async function Compte() {
  const user = await getUser();
  if (!user) redirect('/connexion');

  return (
    <Shell email={user.email ?? ''}>
      <h1 className="text-2xl font-bold">Mon compte</h1>
      <p className="mt-1 text-sm text-neutral-600">{user.email}</p>
      <section className="mt-6 max-w-md rounded-2xl border border-black/5 bg-white p-6">
        <h2 className="font-semibold">Mot de passe</h2>
        <p className="mt-1 text-sm text-neutral-600">Définissez un mot de passe pour vous connecter sans attendre de lien par e-mail.</p>
        <FormulaireMotDePasse />
      </section>
    </Shell>
  );
}
