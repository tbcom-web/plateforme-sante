import { EnteteEssai, PiedEssai } from './Cadre';
import { DOCUMENTS, lireDocument, rendreMarkdown } from '@/lib/juridique';
import { MARQUE } from '@/lib/marque';

/** Page d'un texte juridique de l'essai (statique : lu au build depuis docs/juridique). */
export default async function DocumentJuridique({ id }: { id: keyof typeof DOCUMENTS }) {
  const md = await lireDocument(id);
  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <EnteteEssai />
      <main className="mx-auto grid w-full max-w-3xl flex-1 gap-4 px-4 py-10 text-base leading-relaxed text-neutral-800">
        {md ? rendreMarkdown(md) : (
          <>
            <h1 className="text-2xl font-bold">{DOCUMENTS[id].titre}</h1>
            <p>Ce document est en cours de rédaction. Pour toute question, écrivez à <a className="underline" href={`mailto:${MARQUE.contact}`}>{MARQUE.contact}</a>.</p>
          </>
        )}
      </main>
      <PiedEssai />
    </div>
  );
}
