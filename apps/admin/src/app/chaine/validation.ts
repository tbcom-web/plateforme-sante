import 'server-only';
import {
  avisFaits, modeleIntegre, verrouTesteur, normaliserComposition, qualiteComposition, verifierPublicationRecette, verrousValidation, type CompositionRecette, type FicheModele, type VerrouValidation,
} from '@plateforme/core';
import { getPoidsAtelier } from '@/lib/atelier';
import { getContexteVerification } from '@/lib/profils';
import type { Chaine } from '@/lib/chaine-modeles';

/** Composition normalisée d'une version (garde-fous du scénario de la fiche) */
export function compositionDe(f: Pick<FicheModele, 'scenario'>, brut: Record<string, unknown>): CompositionRecette | null {
  const sujets = [...f.scenario.principaux, ...f.scenario.secondaires];
  return normaliserComposition(brut, { sujets, principaux: f.scenario.principaux.length, couleursPreferees: f.scenario.couleurs, modele: modeleIntegre });
}

/** Verrous automatiques de la validation finale, recalculés côté serveur (page de la fiche ET juste avant de publier) */
export async function verrousDeLaFiche(f: FicheModele, chaine: Pick<Chaine, 'versions' | 'tickets' | 'revues'>): Promise<{ verrous: VerrouValidation[]; jauge: ReturnType<typeof qualiteComposition> | null; bloquants: string[] }> {
  const version = chaine.versions.find((v) => v.modele === f.id && v.version === f.versionCourante) ?? null;
  const x = version ? compositionDe(f, version.composition) : null;
  const sujets = [...f.scenario.principaux, ...f.scenario.secondaires];
  const [poids, ctx] = await Promise.all([getPoidsAtelier().catch(() => null), getContexteVerification().catch(() => ({}))]);
  const jauge = x ? qualiteComposition(x, sujets, poids?.notesElements ?? null) : null;
  const verif = x ? verifierPublicationRecette({ composition: x, sujets }, ctx) : null;
  const verrous = verrousValidation({
    fiche: f, version, tickets: chaine.tickets.filter((t) => t.modele === f.id), jauge: jauge ? { part: jauge.part, total: jauge.total } : null,
    elements: verif ? { ok: verif.ok, bloquants: verif.bloquants.length } : null,
    // Testeur : règle du testeur de modèles (vert ; orange avec la justification écrite de Paul POUR CETTE VERSION ; rouge refusé)
    testeur: verrouTesteur({ versionCourante: f.versionCourante, test: version?.test ?? null, justification: f.justificationVersion === f.versionCourante ? f.justificationTest : null }),
    // Avis et revalidation : recalculés depuis modeles_revues et les tickets (jamais depuis le statut de la fiche)
    avis: avisFaits(f.versionCourante, chaine.versions.filter((v) => v.modele === f.id), chaine.revues.filter((r) => r.modele === f.id), chaine.tickets.filter((t) => t.modele === f.id)),
  });
  return { verrous, jauge, bloquants: verif?.bloquants.map((b) => `${b.cle} : ${b.texte}`) ?? [] };
}
