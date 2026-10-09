import { ordonnerBoiteEntree } from '@plateforme/core';
import { getEtatPolitique } from '@/lib/politique-evaluation';
import {
  cleCandidatePhoto, clePhoto, estSourcePhotoLibre, hashtagsDe, inventaireAssets, inventaireStudio, libelleProgression, libelleSujet, LIBELLES_NATURES, motsClesDuSujet,
  SUJETS_VISUELS, sujetsDuVisuel, universDuParcours, profilsDePratique,
} from '@plateforme/core';
import { lotDeCle, lotsArrivages, typeIngredient } from '@plateforme/core/arrivages';
import { professionDe, sujetDeLaProfession } from '@plateforme/core/professions';
import { exigerAdmin } from '@/lib/admin';
import { getArrivagesEnAttente } from '@/lib/arrivages';
import { getSurchargesSujets } from '@/lib/assets-notes';
import { getHashtagsAssets } from '@/lib/hashtags';
import { getMarquesImportees } from '@/lib/marques';
import { getModelesDisponibles } from '@/lib/modeles';
import { contenusEnAttente, getPacksRevue } from '@/lib/packs-contenus';
import { getMotsClesEnBase, sourcesConfigurees } from '@/lib/photos-libres';
import { getProfession } from '@/lib/profession';
import { getCatalogue } from '@/lib/sites';
import { themesActives } from '@/lib/themes';
import { getUnivers } from '@/lib/univers';
import { getRevuesClaude, getSeriesEnAttente } from '@/lib/sourcing-photos';
import Arrivages, { type ItemArrivage } from './Arrivages';
import { itemSerie, serieAffichee } from './series';
import { visuelDe } from './visuels';

export const metadata = { title: 'Super admin · Arrivages' };
// « Sourcer automatiquement » et l'import d'une série (actions de la page) : jusqu'à 5 minutes
export const maxDuration = 300;

// ARRIVAGES (décisions de Paul du 2026-10-08 et du 2026-10-09, docs/espaces-admin.md) : boîte d'entrée unique de tout ce qui est
// nouveau — nouveautés poussées par Claude (registre inventaire-connu.json : icônes, animations, mises en page, polices…), groupées
// par lot (« Tout accepter / Tout refuser »), photos gardées ou images générées « à valider », photos à découvrir (Pexels, Pixabay)
// et CONTENUS des packs de professions (pages, fiches, FAQ, mentions… : contenus-revue.ts). Accepter, À retravailler (contenus),
// Refuser. Ce qui n'est pas accepté n'est pas utilisable par le générateur (ContexteImages) ni publiable (packs).

/** Aperçus rendus avec la page ; les suivants sont chargés par paquets dans le navigateur (visuelsNouveautes) */
const APERCUS_INITIAUX = 12;

/** Cabinet d'exemple de l'aperçu des textes ({ville}, {cabinet}…) */
const CHAMPS: Record<string, string> = { ville: 'Lyon', cabinet: 'Cabinet Rousseau', praticien: 'Camille Rousseau' };

export default async function PageArrivages({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await exigerAdmin();
  const sp = await searchParams;
  const profession = await getProfession();
  const [attente, surcharges, hashtags, motsCles, packs, series, revues] = await Promise.all([getArrivagesEnAttente(profession), getSurchargesSujets(), getHashtagsAssets(), getMotsClesEnBase(), getPacksRevue(profession.id), getSeriesEnAttente(profession.id), getRevuesClaude()]);
  const parCle = new Map([...inventaireAssets(), ...inventaireStudio()].map((a) => [a.cle, a]));
  const sujetsProfession = SUJETS_VISUELS.filter((s) => sujetDeLaProfession(s, profession));

  // Séries de l'agent d'abord (une série = un lot, sourcing-photos.ts), plus récentes en tête, meilleure série d'un lancement d'abord
  const items: ItemArrivage[] = [...series.series].sort((a, b) => (a.groupe === b.groupe ? a.rang - b.rang : a.creeLe < b.creeLe ? 1 : -1)).map((s) => itemSerie(serieAffichee(s, revues[s.id])));
  // Politique d'évaluation unique : fort potentiel d'abord, jamais deux variantes d'un même visuel à la suite, écartés en dernier
  const politique = await getEtatPolitique();
  const fort = new Set(politique.fortPotentiel), ecartes = new Set(politique.ecartes);
  const nouveautes = ordonnerBoiteEntree(attente.nouveautes, { potentiel: (k) => (fort.has(k) ? 4.5 : null), regles: (k) => ({ effet: politique.penalites[k] ?? 0, ecarte: ecartes.has(k) }) });
  for (const [i, n] of nouveautes.entries()) {
    const a = parCle.get(n.cle);
    items.push({
      id: `n:${n.cle}`, source: 'nouveautes', type: typeIngredient(n.cle), titre: a?.titre ?? n.cle, detail: a?.detail ?? null, date: n.date, lot: lotDeCle(n.cle, n.date),
      arrivage: { kind: 'nouveaute', cle: n.cle, precedent: attente.statuts[n.cle] ?? null },
      visuel: i < APERCUS_INITIAUX || a?.rendu.kind === 'studio' ? await visuelDe(a) : { kind: 'differe', cle: n.cle },
      sujets: a && a.rendu.kind !== 'studio' ? sujetsDuVisuel(a, surcharges).sujets : [],
      hashtags: hashtagsDe(hashtags.hashtags, n.cle),
    });
  }
  for (const p of attente.photos) {
    const cle = (p.url && clePhoto(p.url)) || (estSourcePhotoLibre(p.source) ? cleCandidatePhoto(p.source, p.idSource) : '');
    const sujets = cle ? sujetsDuVisuel({ cle, type: 'photo', soins: [p.sujet] }, surcharges).sujets : [p.sujet];
    items.push({
      id: `p:${p.id}`, source: p.source === 'ia' ? 'images-generees' : 'photos-libres', type: 'photo',
      titre: p.source === 'ia' ? `Image générée${p.iaOutil ? ` (${p.iaOutil})` : ''} · ${libelleSujet(p.sujet)}` : `Photo ${p.source === 'pexels' ? 'Pexels' : 'Pixabay'} · ${libelleSujet(p.sujet)}`,
      detail: p.url ? 'Hébergée chez nous' : 'Gardée, pas encore importée : « Accepter » l’importe (WebP, sans métadonnées)',
      date: (p.importeLe ?? p.telechargeLe ?? '').slice(0, 10) || null,
      arrivage: { kind: 'photo', id: p.id },
      visuel: p.url || p.apercuUrl ? { kind: 'image', src: (p.url ?? p.apercuUrl)! } : { kind: 'aucun' },
      sujets, hashtags: cle ? hashtagsDe(hashtags.hashtags, cle) : [],
      credit: p.source === 'ia' ? null : `${p.auteur}`, pageUrl: p.pageUrl,
    });
  }
  // Contenus des packs de la profession : texte rendu, sources, avertissements du contrôle (controle:packs)
  for (const pk of packs) {
    const nom = professionDe(pk.profession).libelle;
    for (const c of contenusEnAttente(pk)) {
      items.push({
        id: `c:${c.cle}`, source: 'contenus', type: 'contenu', titre: c.titre.replace(/\{([a-z_]+)\}/g, (m, k: string) => CHAMPS[k] ?? m), detail: `${LIBELLES_NATURES[c.nature]} · pack ${nom}`, date: null,
        arrivage: { kind: 'contenu', cle: c.cle, empreinte: c.empreinte, precedent: c.precedent },
        visuel: { kind: 'contenu', contenu: { titre: c.titre, chapo: c.chapo ?? null, nature: c.nature, blocs: c.blocs, sources: c.sourcesDetail, erreurs: c.erreurs, avertissements: c.avertissements, modifie: Boolean(c.precedent && c.precedent !== 'a_revoir') } },
        sujets: [], hashtags: [],
      });
    }
  }
  const progressions = packs.map((pk) => ({ ...pk.progression, libelle: libelleProgression(professionDe(pk.profession).libelle, pk.progression), statutPack: pk.statutPack, erreursControle: pk.erreursControle }));
  const lots = lotsArrivages(attente.nouveautes).map((l) => ({ id: l.id, titre: l.titre, n: l.cles.length }));

  // Éléments du studio (polices, menus, mises en page, animations d'en-tête…) : aperçu de site de l'admin, données chargées à part
  const avecStudio = items.some((i) => i.visuel.kind === 'studio');
  const [modeles, catalogue, marquesImportees, univers] = avecStudio
    ? await Promise.all([getModelesDisponibles(), getCatalogue(), getMarquesImportees(), getUnivers()])
    : [[], [], [], { univers: [] }];

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <div>
        <h1 className="text-2xl font-bold">Arrivages</h1>
        <p className="mt-1 max-w-3xl text-sm text-neutral-600">
          Tout ce qui est nouveau, au même endroit. Accepter : l’élément entre au frigo et le générateur peut l’utiliser (un texte devient
          bon pour publication). Refuser : il n’est jamais utilisé. Touches A / R ou flèches → / ←, glisser au doigt ; Z annule la dernière décision.
        </p>
      </div>
      <Arrivages
        items={items}
        lots={lots}
        progressions={progressions}
        champs={{ ...CHAMPS, titre_praticien: `${profession.libelle.toLowerCase()} diplômé d’État` }}
        sujets={sujetsProfession.map((s) => ({ id: s.id, libelle: s.libelle }))}
        sourcesPhotos={sourcesConfigurees()}
        motsCles={Object.fromEntries(sujetsProfession.map((s) => [s.id, motsClesDuSujet(s.id, motsCles.motsCles)]))}
        frequencesHashtags={Object.fromEntries(Object.values(hashtags.hashtags).flat().reduce((m, h) => m.set(h, (m.get(h) ?? 0) + 1), new Map<string, number>()))}
        sourceInitiale={typeof sp.source === 'string' ? sp.source : null}
        typeInitial={typeof sp.type === 'string' ? sp.type : null}
        lotInitial={typeof sp.lot === 'string' ? sp.lot : null}
        profilsSourcing={profilsDePratique(profession.id).filter((x) => x.principal).map((x) => ({ id: x.id, court: x.court }))}
        migrationSeries={series.migrationManquante}
        politique={politique}
        studio={{ proposes: universDuParcours(univers.univers), modeles: modeles.map((m) => ({ id: m.id, manifeste: m.manifeste })), catalogue, marquesImportees, themesActives: themesActives() }}
      />
    </div>
  );
}
