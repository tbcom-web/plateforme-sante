import {
  assetsInfluents, motsClesDuSujet, SUJETS_VISUELS, titresAssets, titresBases, universDuParcours,
  resumeRenforts, clesRecentes, jourParis,
} from '@plateforme/core';
import { exigerAdmin } from '@/lib/admin';
import { getRecettesLecture, getRetoursMobile } from '@/lib/recettes';
import { getPoidsAtelier } from '@/lib/atelier';
import { getPhotosDesJeux, getSurchargesSujets } from '@/lib/assets-notes';
import { getNotesRetours } from '@/lib/notes-retours';
import { getChangementsClaude } from '@/lib/changements';
import { getJugeDesDernieres } from '@/lib/predictions';
import { getHashtagsAssets } from '@/lib/hashtags';
import { getInspirations } from '@/lib/inspirations';
import { getMotsClesEnBase, sourcesConfigurees } from '@/lib/photos-libres';
import { getRevuesIllustrations } from '@/lib/illustrations';
import { getMarquesImportees } from '@/lib/marques';
import { getModelesDisponibles } from '@/lib/modeles';
import { getCatalogue } from '@/lib/sites';
import { themesActives } from '@/lib/themes';
import { getUnivers } from '@/lib/univers';
import Retours from './Retours';
import { changementsDesPoids } from '@/lib/changements-generateur';
import { getEtatPolitique } from '@/lib/politique-evaluation';
import { getReevaluations } from '@/lib/tranches';

export const metadata = { title: 'Super admin · Donner mon avis' };

// Espace « Donner mon avis » : une carte à la fois (élément tiré au hasard, jamais notés d'abord), « ce qui va bien » /
// « ce qui ne va pas », 1 à 5 étoiles. Assets (migration 0027) et thèmes complets (atelier, 0026) ; même apprentissage,
// même export quotidien vers le dossier retours/ du dépôt (docs/retours.md).
export default async function PageRetours({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await exigerAdmin();
  const sp = await searchParams;
  // Hashtags des visuels (0029) : lus en parallèle du reste
  const lectureHashtags = getHashtagsAssets();
  // Retours « Rendu mobile » (0034) : liste « Rendu mobile à revoir » et état mobile des cartes
  const lectureMobile = getRetoursMobile();
  // Réévaluations et politique d'évaluation lues en même temps que le reste (attendues seulement au rendu, 2026-10-10)
  const lectureReevaluations = getReevaluations();
  const lecturePolitique = getEtatPolitique();
  // Notes : résumé, notes comparables au juge et compteurs (lib/notes-retours.ts : gardés sur l'instance tant que rien n'a changé)
  const lecturePhotosJeux = getPhotosDesJeux();
  const lectureNotes = getNotesRetours(lectureReevaluations, lecturePhotosJeux);
  const [notes, revues, photosJeux, poids, changementsClaude, catalogue, modeles, marquesImportees, { univers }, inspirations, motsCles, surchargesSujets, recettes] = await Promise.all([
    lectureNotes, getRevuesIllustrations(), lecturePhotosJeux, getPoidsAtelier(), getChangementsClaude(),
    getCatalogue(), getModelesDisponibles(), getMarquesImportees(), getUnivers(), getInspirations(), getMotsClesEnBase(), getSurchargesSujets(),
    // Recettes du studio notées (0032) : « Recette X validée : renforce gamme Y, police Z, photo W »
    getRecettesLecture(1),
  ]);
  // Titres des illustrations de base (notées sous dessin:orthonyxie, heros:sport…) en plus de ceux de l'inventaire
  const titres = { ...titresBases(titresAssets()), ...titresAssets() };
  const hashtags = await lectureHashtags;
  const mobile = await lectureMobile;
  // Juge du goût de Paul : prédictions (retours/predictions.json) et justesse contre les notes en base
  const juge = await getJugeDesDernieres(notes.dernieresJuge);
  // Synthèse Markdown « Copier mes retours » : préparée à la demande (actions-synthese.ts, perf vague 2, 2026-10-10).
  // Notes envoyées au navigateur sous forme de RÉSUMÉ par clé (retours-resume.ts : mêmes états, compteurs et série qu'avec la
  // liste complète ; ≈ 2 Mo de notes envoyés à chaque ouverture avant, au volume ×10)
  const reevaluations = (await lectureReevaluations).reevaluations;
  const joursAvis = { ...notes.resume.jours };
  for (const [j, n] of Object.entries(notes.atelier.jours)) joursAvis[j] = (joursAvis[j] ?? 0) + n;
  const type = typeof sp.type === 'string' ? sp.type : null;
  // Photos à découvrir ouvert depuis un kit (« Trouver des photos », suggestions-kits.ts) : sujet, emplacement, retour au kit
  const cibleDecouverte = type === 'decouvrir' && typeof sp.sujet === 'string' && typeof sp.emplacement === 'string'
    ? { sujet: sp.sujet, emplacement: sp.emplacement, retour: sp.retour === 'kits' ? `/admin/retours/kits?sujet=${encodeURIComponent(sp.sujet)}` : null }
    : null;
  const cle = typeof sp.cle === 'string' ? sp.cle : null;
  const ingredients = typeof sp.ingredients === 'string' ? sp.ingredients : null;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <div>
        <h1 className="text-2xl font-bold">Donner mon avis</h1>
        <p className="mt-1 max-w-3xl text-sm text-neutral-600">
          Un élément à la fois, tiré au hasard (ceux modifiés depuis votre note d’abord, avec l’avant / après, puis les jamais notés) :
          ce qui va bien, ce qui ne va pas, une note.
          Chaque avis réordonne les propositions du générateur et part chaque nuit à Claude, qui corrige d’après vos retours.
        </p>
      </div>
      {(notes.migrationAssets || notes.migrationAtelier) && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">
          {notes.migrationAssets && <>Migration 0027 à exécuter (<code>supabase/migrations/0027_assets_notes.sql</code>) : les avis sur les éléments ne peuvent pas encore être enregistrés. </>}
          {notes.migrationAtelier && <>Migration 0026 à exécuter (<code>supabase/migrations/0026_atelier_notes.sql</code>) : les avis sur les thèmes complets ne peuvent pas encore être enregistrés.</>}
        </p>
      )}
      <Retours
        reevaluations={reevaluations}
        resumeNotes={{ ...notes.resume, jours: joursAvis }}
        nombreAvisAtelier={notes.atelier.n}
        dejaNotees={notes.atelier.dejaNotees}
        statuts={Object.fromEntries(revues.statuts.map((s) => [s.cle, s.statut]))}
        photosJeux={photosJeux}
        // Calcul lourd (~0,5 s) fait sujet par sujet après l'envoi de la page : la section suit dans le flux (perf, 2026-10-08)
        changements={changementsDesPoids(poids)}
        influents={assetsInfluents(poids, titres)}
        changementsClaude={changementsClaude}
        renfortsRecettes={resumeRenforts(recettes, 6)}
        migrationAssets={notes.migrationAssets}
        migrationAtelier={notes.migrationAtelier}
        poids={poids}
        proposes={universDuParcours(univers)}
        modeles={modeles}
        catalogue={catalogue}
        marquesImportees={marquesImportees}
        themesActives={themesActives()}
        typeInitial={type}
        cibleDecouverte={cibleDecouverte}
        cleInitiale={cle}
        ingredientsDe={ingredients}
        inspirations={inspirations.inspirations}
        migrationInspirations={inspirations.migrationManquante}
        sourcesPhotos={sourcesConfigurees()}
        motsClesPhotos={Object.fromEntries(SUJETS_VISUELS.map((s) => [s.id, motsClesDuSujet(s.id, motsCles.motsCles)]))}
        migrationPhotos={motsCles.migrationManquante}
        surchargesSujets={surchargesSujets}
        hashtagsAssets={hashtags.hashtags}
        migrationHashtags={hashtags.migrationManquante}
        predictions={juge.predictions}
        ligneJuge={juge.ligne}
        retoursMobile={mobile.retours}
        migrationMobile={mobile.migrationManquante}
        // Nouveautés à noter (nouveautes.ts) : ingrédients apparus depuis moins de 30 jours ; ?nouveautes=<lot> ouvre la file du lot
        nouveautesRecentes={clesRecentes(jourParis(new Date()))}
        nouveautesInitiales={typeof sp.nouveautes === 'string' ? sp.nouveautes : null}
        // Politique d'évaluation unique (politique-evaluation.ts) : mémoire commune, implicites, règles apprises, fort potentiel
        politique={await lecturePolitique}
      />
    </div>
  );
}
