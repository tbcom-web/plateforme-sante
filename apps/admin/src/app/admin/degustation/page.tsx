import Link from 'next/link';
import {
  choixDeLaProfession, classementsParContexte, defiDuJour, elementsInventaire, etatDegustation, inventaireAssets, inventaireStudio, parisDesChoix,
  scoreBatsClaude, sujetsDuVisuel, universDuParcours, type FormatGrille,
} from '@plateforme/core';
import { predictionsParCle } from '@plateforme/core/juge';
import { exigerAdmin } from '@/lib/admin';
import { getPhotosDesJeux, getSurchargesSujets } from '@/lib/assets-notes';
import { getPoidsAtelier } from '@/lib/atelier';
import { getChoixGrille, MIGRATION_DEGUSTATION, professionDegustation, profilsDegustation } from '@/lib/degustation';
import { getDuels } from '@/lib/duels';
import { getMarquesImportees } from '@/lib/marques';
import { getModelesDisponibles } from '@/lib/modeles';
import { getNotationsAdmin } from '@/lib/notation-recettes';
import { getPredictions } from '@/lib/predictions';
import { getPhotosBanque } from '@/lib/recettes';
import { getCatalogue } from '@/lib/sites';
import { themesActives } from '@/lib/themes';
import { getTranches, tranchesEnListes } from '@/lib/tranches';
import { getUnivers } from '@/lib/univers';
import Degustation from './Degustation';

export const metadata = { title: 'Super admin · Dégustation' };

// 🍽 DÉGUSTATION (décision de Paul du 2026-10-08) : donner du goût au générateur, vite et de façon ludique. Grille « Choisis tes
// 2 préférées parmi 6 » (format principal), session « Dégustation du jour » (~20 cartes, mélange piloté par ce qui apprend le plus),
// « Bats Claude » (pari caché du juge), missions par profil, XP et niveaux de palais, médailles, « Mon palais ». Tout est filtré par
// PROFESSION (registre professions.ts) ; le goût des ingrédients communs (palettes, polices, mises en page) est partagé.
// Moteur : packages/core/src/degustation.ts (+ degustation-grilles.ts), migration 0042 ; documentation : docs/degustation.md.
export default async function PageDegustation() {
  await exigerAdmin();
  const profession = await professionDegustation();
  const [profils, { choix, migrationManquante }, { duels }, modeles, catalogue, marquesImportees, { univers }, poids, photos, photosJeux, surcharges, predictions, tranches, { notations }] = await Promise.all([
    profilsDegustation(profession), getChoixGrille(), getDuels(), getModelesDisponibles(), getCatalogue(), getMarquesImportees(), getUnivers(), getPoidsAtelier(), getPhotosBanque(),
    getPhotosDesJeux(), getSurchargesSujets(), getPredictions(), getTranches(), getNotationsAdmin(),
  ]);
  const mesChoix = choixDeLaProfession(choix, profession.id, profession.parDefaut);
  const sujetsProfession = new Set(profils.flatMap((p) => p.sujets));
  // Duels de la profession : ceux dont le sujet n° 1 relève de ses profils (le journal des duels ne porte pas encore la profession)
  const mesDuels = duels.filter((d) => sujetsProfession.has(d.scenario.sujets[0] ?? ''));
  const elements = elementsInventaire([...inventaireAssets({ photosJeux }), ...inventaireStudio()].map((x) => ({ cle: x.cle, sujets: x.type === 'photo' ? sujetsDuVisuel(x, surcharges).sujets : [] })));
  const t = tranches.tranches;
  // Icônes à l'essai (pictos-directions.ts) : seulement s'il y a des pictos de la profession dans l'inventaire
  const formats: FormatGrille[] = ['compositions', 'palettes-polices', 'premiers-ecrans', 'pages', 'kits', ...(elements.some((e) => e.cle.includes('@direction-')) ? ['icones' as const] : [])];
  const etat = etatDegustation({
    profils, elements, notes: poids?.notesElements ?? {}, effets: poids?.assets?.effets ?? null, moyenne: poids?.assets?.moyenne || 3,
    faites: mesChoix.map((c) => ({ sujet: c.scenario.sujets[0] ?? 'cabinet', format: c.format, dimension: c.dimension })),
    classements: classementsParContexte(mesDuels).map((c) => ({ famille: c.famille, sujet: c.sujet, lignes: c.lignes.slice(0, 5) })),
    tranches: t, formats,
  });
  const jour = new Date().toISOString().slice(0, 10);
  const nomsProfils = profils.map((p) => ({ id: p.id, nom: p.nom, pret: etat.pret[p.id] ?? 0 }));
  // Missions : grilles et kits de la profession par profil ; recettes gardées dont le sujet n° 1 est celui du profil
  const faits = Object.fromEntries(profils.map((p) => {
    const s1 = p.sujets[0];
    const g = mesChoix.filter((c) => (c.profil ? c.profil === p.id : c.scenario.sujets[0] === s1));
    return [p.id, { grilles: g.filter((c) => c.format !== 'kits').length, kits: g.filter((c) => c.format === 'kits').length, recettesGardees: notations.filter((n) => n.garder && n.scenario.principaux[0] === s1).length }];
  }));
  // Récompense d'une mission : la publication reste celle de /admin/profils (agent Profils), la Dégustation n'y fait que mener
  const publier = '/admin/profils';
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <div>
        <h1 className="text-2xl font-bold">🍽 Dégustation{profession.libelle ? <span className="ml-2 align-middle text-base font-semibold text-neutral-600">· {profession.libelle}</span> : null}</h1>
        <p className="mt-1 hidden max-w-3xl text-sm text-neutral-600 md:block">
          Six propositions pour le même client, une seule chose change de l’une à l’autre : touchez vos deux préférées (et, si vous voulez, celle qui ne va pas).
          Chaque grille vaut neuf duels pour le générateur. Claude parie avant vous, en secret.
        </p>
      </div>
      {migrationManquante && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">{MIGRATION_DEGUSTATION}</p>
      )}
      {!profils.length ? (
        <p className="rounded-2xl border border-black/10 bg-white p-6 text-sm text-neutral-700">Aucun profil à déguster pour cette profession pour l’instant. <Link className="font-semibold text-teal-900 underline" href="/admin">Retour</Link></p>
      ) : (
        <Degustation
          profession={{ id: profession.id, parDefaut: profession.parDefaut, libelle: profession.libelle }}
          profils={profils}
          etat={etat}
          elements={elements}
          formats={formats}
          choix={mesChoix.map((c) => ({ ...c, propositions: c.propositions.map((p) => ({ cle: p.cle, ingredients: { element: p.ingredients.element ?? null, assets: p.ingredients.assets, atelier: p.ingredients.atelier } })) }))}
          parisSemaine={scoreBatsClaude(parisDesChoix(mesChoix.filter((c) => (c.le ?? '') >= new Date(Date.now() - 7 * 86400000).toISOString())), jour)}
          joursActifs={[...new Set([...mesChoix.map((c) => (c.le ?? '').slice(0, 10)), ...mesDuels.map((d) => (d.le ?? '').slice(0, 10))].filter(Boolean))]}
          defi={defiDuJour(jour, nomsProfils)}
          faits={faits}
          lienPublier={publier}
          migrationManquante={migrationManquante}
          tranches={tranchesEnListes(t)}
          predictions={predictionsParCle(predictions)}
          proposes={universDuParcours(univers)}
          modeles={modeles}
          catalogue={catalogue}
          marquesImportees={marquesImportees}
          themesActives={themesActives()}
          poids={poids}
          photos={photos}
        />
      )}
    </div>
  );
}
