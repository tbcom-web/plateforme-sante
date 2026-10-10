import Link from 'next/link';
import { actionChainePrioritaire } from '@/lib/chaine-guidage';

// Carte « Presque fini » (décision de Paul du 2026-10-10 : « on priorise un modèle quasi fini ») en tête de /admin et de « À valider » :
// l'action de la chaîne des modèles la plus proche de la publication qui attend Paul (publier, revalider, relire, lancer un test…).
// Rendue dans un Suspense par les pages : ne retarde jamais leur affichage. Rien de proche de la publication : rien d'affiché.
export default async function CartePresqueFini({ profession }: { profession: string }) {
  const a = await actionChainePrioritaire(profession);
  if (!a) return null;
  return (
    <Link href={a.href} className="flex min-h-12 flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border-2 border-teal-700 bg-teal-50/70 px-4 py-2 text-sm hover:bg-teal-100" data-presque-fini={a.modele}>
      <span className="text-xs font-semibold uppercase tracking-wide text-teal-900">Presque fini · étape {a.etape} / 6</span>
      <span className="min-w-0 flex-1 basis-56 [overflow-wrap:anywhere]"><strong className="font-semibold text-neutral-950">{a.nom}</strong> — {a.action}</span>
      <span className="font-semibold text-teal-900" aria-hidden="true">→</span>
    </Link>
  );
}
