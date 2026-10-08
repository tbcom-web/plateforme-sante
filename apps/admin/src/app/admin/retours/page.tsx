import {
  assetsInfluents, changementsGenerateur, markdownAnimationsEnAttente, inventaireAssets, markdownAssets, markdownAtelier, markdownSujets, motsClesDuSujet, sujetsSansVisuel, SUJETS_VISUELS, syntheseAssets, syntheseAtelier, titresAssets,
  markdownHashtags, titresBases, universDuParcours,
  resumeRenforts,
} from '@plateforme/core';
import { exigerAdmin } from '@/lib/admin';
import { getRecettesLecture, getRetoursMobile } from '@/lib/recettes';
import { getNotesAtelier, getPoidsAtelier } from '@/lib/atelier';
import { getNotesAssets, getPhotosDesJeux, getSurchargesSujets } from '@/lib/assets-notes';
import { getChangementsClaude } from '@/lib/changements';
import { getJuge } from '@/lib/predictions';
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
  const [assets, atelier, revues, photosJeux, poids, changementsClaude, catalogue, modeles, marquesImportees, { univers }, inspirations, motsCles, surchargesSujets, recettes] = await Promise.all([
    getNotesAssets(), getNotesAtelier(), getRevuesIllustrations(), getPhotosDesJeux(), getPoidsAtelier(), getChangementsClaude(),
    getCatalogue(), getModelesDisponibles(), getMarquesImportees(), getUnivers(), getInspirations(), getMotsClesEnBase(), getSurchargesSujets(),
    // Recettes du studio notées (0032) : « Recette X validée : renforce gamme Y, police Z, photo W »
    getRecettesLecture(1),
  ]);
  // Titres des illustrations de base (notées sous dessin:orthonyxie, heros:sport…) en plus de ceux de l'inventaire
  const titres = { ...titresBases(titresAssets()), ...titresAssets() };
  const hashtags = await lectureHashtags;
  const mobile = await lectureMobile;
  // Juge du goût de Paul : prédictions (retours/predictions.json) et justesse contre les notes en base
  const juge = await getJuge(assets.notes.map((n) => ({ cle: n.cle, note: n.note, empreinte: n.empreinte, le: n.le, etiquettes: n.etiquettes })), photosJeux);
  // Statut courant + dernier commentaire de revue (synthèse « à retravailler »)
  const statuts = revues.statuts.map((s) => {
    const r = revues.revues.find((x) => x.cle === s.cle && x.commentaire);
    return { cle: s.cle, statut: s.statut, commentaire: r?.commentaire ?? null, le: s.majLe };
  });
  const date = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' });
  const markdown = [
    markdownAssets(syntheseAssets(assets.notes, { statuts, titres }), { date, titre: '# Retours sur les assets' }),
    '',
    markdownAtelier(syntheseAtelier(atelier.notes), { date }),
    '',
    markdownSujets(surchargesSujets, { titres, sansVisuel: sujetsSansVisuel(inventaireAssets({ photosJeux }), surchargesSujets) }),
    '',
    markdownAnimationsEnAttente(Object.fromEntries(revues.statuts.map((s) => [s.cle, s.statut]))),
  ].join('\n');
  const dejaNotees: Record<string, number> = {};
  for (const x of atelier.notes) dejaNotees[x.cle] = (dejaNotees[x.cle] ?? 0) + 1;
  const type = typeof sp.type === 'string' ? sp.type : null;
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
      {(assets.migrationManquante || atelier.migrationManquante) && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">
          {assets.migrationManquante && <>Migration 0027 à exécuter (<code>supabase/migrations/0027_assets_notes.sql</code>) : les avis sur les éléments ne peuvent pas encore être enregistrés. </>}
          {atelier.migrationManquante && <>Migration 0026 à exécuter (<code>supabase/migrations/0026_atelier_notes.sql</code>) : les avis sur les thèmes complets ne peuvent pas encore être enregistrés.</>}
        </p>
      )}
      <Retours
        notesAssets={assets.notes.map((n) => ({ cle: n.cle, note: n.note, empreinte: n.empreinte, le: n.le }))}
        datesAtelier={atelier.notes.map((n) => n.le ?? '').filter(Boolean)}
        dejaNotees={dejaNotees}
        statuts={Object.fromEntries(revues.statuts.map((s) => [s.cle, s.statut]))}
        photosJeux={photosJeux}
        markdown={`${markdown}\n\n${markdownHashtags(hashtags.hashtags, { titres })}`}
        changements={changementsGenerateur(poids)}
        influents={assetsInfluents(poids, titres)}
        changementsClaude={changementsClaude}
        renfortsRecettes={resumeRenforts(recettes, 6)}
        migrationAssets={assets.migrationManquante}
        migrationAtelier={atelier.migrationManquante}
        poids={poids}
        proposes={universDuParcours(univers)}
        modeles={modeles}
        catalogue={catalogue}
        marquesImportees={marquesImportees}
        themesActives={themesActives()}
        typeInitial={type}
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
      />
    </div>
  );
}
