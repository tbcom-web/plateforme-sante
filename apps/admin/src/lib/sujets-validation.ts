import 'server-only';
import { cache } from 'react';
import {
  clePhoto, cleCandidatePhoto, estSourcePhotoLibre, hashtagsDe, inventaireAssets, inventaireStudio, jourParis, kitDuProfil, profilsDePratique, sujetsDuVisuel, typeDeCle,
  type Asset, type FamilleKit,
} from '@plateforme/core';
import { typeIngredient, type TypeIngredient } from '@plateforme/core/arrivages';
import { carteAVoir, sujetDeCle, sujetsValidation, type SujetValidation } from '@plateforme/core/sujets-validation';
import type { Profession } from '@plateforme/core/professions';
import { getArrivagesEnAttente } from '@/lib/arrivages';
import { getSurchargesSujets } from '@/lib/assets-notes';
import { getHashtagsAssets } from '@/lib/hashtags';
import { getDonneesKits, getDonneesVisuels } from '@/lib/kits-images';
import { contenusEnAttente, getPacksRevue } from '@/lib/packs-contenus';
import { getPredictions } from '@/lib/predictions';
import { getSeriesEnAttente } from '@/lib/sourcing-photos';
import { getTranches, tranchesEnListes } from '@/lib/tranches';
import { getRole } from '@/lib/admin';
import { instantane, SOURCES_CONTEXTE_IMAGES } from '@/lib/apprentissage-instantane';
import { avecDelai, DELAIS } from '@/lib/delai';
import { createClient, getUser } from '@/lib/supabase/server';

// POINT D'ENTRÉE « À VALIDER » côté serveur (packages/core/src/sujets-validation.ts, docs/a-valider.md) : toutes les sources de
// nouveautés convergent ici, rangées par SUJET (profil de pratique, « commun », textes) :
// - nouveautés du code en attente, photos gardées ou générées « à valider », séries de l'agent, contenus des packs (lectures
//   des Arrivages, déjà partagées par les compteurs du menu : getArrivagesEnAttente, getSeriesEnAttente, getPacksRevue) ;
// - éléments du KIT de chaque profil (kitDuProfil : photos, illustrations, icônes, animations du vivier curé), gardés en base par
//   l'instantané « sujets-kits » (apprentissage-instantane.ts : recalculé seulement quand photos, notes, revues, sujets changent) ;
// - tranchés (1 ★ / 5 ★, instantané « tranches ») et prédictions du juge (pari « Claude pense que tu vas aimer »).
// Aucune table nouvelle : les décisions vont dans assets_notes (notes 4 / 5 / 2 / 1), illustrations_revues (accepte, à retravailler,
// retiré, validé sur geste explicite), photos_libres, photos_series (actions de app/admin/sujets/actions.ts).

export type FamilleCarte = TypeIngredient | 'contenu' | 'serie';

export type CarteSujet = {
  /** n:<clé> nouveauté · p:<id> photo en attente · s:<id> série · c:<clé> contenu · k:<clé> élément du kit */
  id: string;
  cle: string;
  kind: 'nouveaute' | 'photo' | 'serie' | 'contenu' | 'element';
  famille: FamilleCarte;
  titre: string;
  detail: string | null;
  /** Arrivage en attente (montré en premier) */
  nouveaute: boolean;
  /** Note moyenne (éléments du kit), null : jamais noté */
  note: number | null;
  tranche: boolean;
  /** Élément du kit pas encore « Validé » pour les sites (illustration, icône, animation) */
  aValider: boolean;
  /** Date d'arrivée (nouveautés) */
  date: string | null;
  /** Données propres à la décision */
  precedent?: string | null;
  empreinte?: string;
  photoId?: string;
  photosSerie?: { cle: string; apercu: string; auteur: string }[];
  url?: string | null;
  /** Note prédite par le juge (affichée APRÈS la décision seulement) */
  prediction: number | null;
};

export type ResumeSujetServeur = SujetValidation & {
  nouveautes: number; aVoir: number; ok: number; aValiderPourSites: number; total: number;
  /** Photos du sujet (kit et photos à valider) : sous SEUIL_PHOTOS_SUJET, raccourci « Sourcer des photos » */
  photos: number;
  /** Une série de l'agent attend déjà la décision de Paul dans ce sujet */
  serieEnAttente: boolean;
  /** Aperçu composite : quelques cartes (nouveautés d'abord) */
  apercu: string[];
};

type ElementKitCompact = { cle: string; famille: FamilleKit; note: number | null; aValider: boolean; url?: string };

/** Éléments des kits de chaque profil de la profession (instantané : calcul complet seulement quand les sources changent) */
async function kitsDesProfils(profession: Profession): Promise<Record<string, ElementKitCompact[]>> {
  const portee = (await getRole().catch(() => null)) === 'admin' ? 'admin' as const : null;
  return instantane({ cle: `sujets-kits|${profession.id}`, portee, tables: SOURCES_CONTEXTE_IMAGES, calculer: () => calculerKits(profession.id, true), repli: () => calculerKits(profession.id, false) });
}
/** Définition pour la route de recalcul (apprentissage-calculs.ts) */
export async function definitionSujetsKits(profession: string) {
  const portee = (await getRole().catch(() => null)) === 'admin' ? 'admin' as const : null;
  return { cle: `sujets-kits|${profession}`, portee, tables: SOURCES_CONTEXTE_IMAGES, calculer: () => calculerKits(profession, true) };
}

const MAX_KIT = 40;
async function calculerKits(profession: string, lancer: boolean): Promise<Record<string, ElementKitCompact[]>> {
  try {
    const [photos, visuels] = await Promise.all([getDonneesKits(), getDonneesVisuels()]);
    const r: Record<string, ElementKitCompact[]> = {};
    for (const p of profilsDePratique(profession).filter((x) => x.principal)) {
      const kit = kitDuProfil(p, { photos, visuels });
      const vus = new Set<string>();
      const l: ElementKitCompact[] = [];
      const familles = p.activites.length ? kit.activites.map((a) => a.familles) : [kit.generique];
      for (const f of familles) for (const e of Object.values(f).flat()) {
        if (vus.has(e.cle) || l.length >= MAX_KIT) continue;
        vus.add(e.cle);
        l.push({ cle: e.cle, famille: e.famille, note: e.note, aValider: e.aValider, ...(e.url ? { url: e.url } : {}) });
      }
      r[p.id] = l;
    }
    return r;
  } catch (e) {
    if (lancer) throw e;
    return {};
  }
}

let parCle: Map<string, Asset> | null = null;
export const assetDeCle = (cle: string) => (parCle ??= new Map([...inventaireAssets(), ...inventaireStudio()].map((a) => [a.cle, a]))).get(cle);

const familleDuKit = (f: FamilleKit): FamilleCarte => (f === 'icone' ? 'icone' : f);

/** Toutes les cartes de la profession, rangées par sujet, et le résumé de chaque sujet */
export const getDonneesSujets = cache(async (profession: Profession) => {
  const D = DELAIS.compteurs * 3;
  const [attente, series, packs, surcharges, hashtags, kits, tranches, predictions] = await Promise.all([
    avecDelai(getArrivagesEnAttente(profession), D, { nouveautes: [], photos: [], statuts: {}, migrationPhotos: false }),
    avecDelai(getSeriesEnAttente(profession.id), D, { series: [], migrationManquante: false }),
    avecDelai(getPacksRevue(profession.id), D, []),
    avecDelai(getSurchargesSujets(), D, {}),
    avecDelai(getHashtagsAssets(), D, { hashtags: {} } as Awaited<ReturnType<typeof getHashtagsAssets>>),
    avecDelai(kitsDesProfils(profession), D * 2, {} as Record<string, ElementKitCompact[]>),
    avecDelai(getTranches(), D, null),
    avecDelai(getPredictions(), D, []),
  ]);
  const sujets = sujetsValidation(profession.id);
  const ids = new Set(sujets.map((s) => s.id));
  const cartes = new Map<string, CarteSujet[]>(sujets.map((s) => [s.id, []]));
  const ajouter = (sujet: string, c: CarteSujet) => (cartes.get(ids.has(sujet) ? sujet : 'commun') ?? cartes.get('commun')!).push(c);
  const tranche = new Set(tranches ? [...tranchesEnListes(tranches.tranches).refuses, ...tranchesEnListes(tranches.tranches).favoris] : []);
  // Dernière prédiction du juge par clé
  const pred = new Map<string, { note: number; le: string }>();
  for (const p of predictions) { const d = pred.get(p.cle); if (!d || p.le >= d.le) pred.set(p.cle, { note: p.note, le: p.le }); }
  const predite = (cle: string) => pred.get(cle)?.note ?? null;
  const tags = (cle: string) => hashtagsDe(hashtags.hashtags, cle).map((t) => t.replace(/^#/, ''));

  // 1. Nouveautés du code en attente
  for (const n of attente.nouveautes) {
    const a = assetDeCle(n.cle);
    const themes = a && a.rendu.kind !== 'studio' ? sujetsDuVisuel(a, surcharges).sujets : [];
    ajouter(sujetDeCle(n.cle, { profession: profession.id, tags: tags(n.cle), themes }), {
      id: `n:${n.cle}`, cle: n.cle, kind: 'nouveaute', famille: typeIngredient(n.cle), titre: a?.titre ?? n.cle, detail: a?.detail ?? null, nouveaute: true,
      note: null, tranche: false, aValider: false, date: n.date, precedent: attente.statuts[n.cle] ?? null, prediction: predite(n.cle),
    });
  }
  // 2. Photos gardées ou images générées à valider
  for (const p of attente.photos) {
    const cle = (p.url && clePhoto(p.url)) || (estSourcePhotoLibre(p.source) ? cleCandidatePhoto(p.source, p.idSource) : `photo:attente:${p.id}`);
    ajouter(sujetDeCle(cle, { profession: profession.id, tags: tags(cle), url: p.url ?? p.apercuUrl, requete: p.requete, themes: [p.sujet] }), {
      id: `p:${p.id}`, cle, kind: 'photo', famille: 'photo', titre: p.source === 'ia' ? 'Image générée' : `Photo ${p.source === 'pexels' ? 'Pexels' : 'Pixabay'}`,
      detail: p.source === 'ia' ? null : `© ${p.auteur}`, nouveaute: true, note: null, tranche: false, aValider: false, date: (p.importeLe ?? p.telechargeLe ?? '').slice(0, 10) || null,
      photoId: p.id, url: p.url ?? p.apercuUrl, prediction: predite(cle),
    });
  }
  // 3. Séries de l'agent (une carte = une série)
  for (const s of series.series) {
    const cible = s.cibleDetails;
    const sujet = cible?.profil && ids.has(cible.profil) ? cible.profil : sujetDeCle(`serie:${cible?.sujet ?? ''}`, { profession: profession.id, themes: cible?.sujet ? [cible.sujet] : [] });
    const photos = s.photos.slice(0, 12).map((x) => ({ cle: x.cle, apercu: x.apercu, auteur: x.auteur }));
    ajouter(sujet, {
      id: `s:${s.id}`, cle: `serie:${s.id}`, kind: 'serie', famille: 'serie', titre: s.titre, detail: `${s.photos.length} photos choisies par l’agent · cohérence ${s.coherence}/100`,
      nouveaute: true, note: null, tranche: false, aValider: false, date: s.creeLe.slice(0, 10) || null, photosSerie: photos, prediction: null,
    });
  }
  // 4. Contenus des packs (textes)
  for (const pk of packs) {
    for (const c of contenusEnAttente(pk)) {
      ajouter('textes', {
        id: `c:${c.cle}`, cle: c.cle, kind: 'contenu', famille: 'contenu', titre: c.titre.replace(/\{[a-z_]+\}/g, '…'), detail: null, nouveaute: true, note: null, tranche: false,
        aValider: false, date: null, empreinte: c.empreinte, precedent: c.precedent, prediction: null,
      });
    }
  }
  // 5. Éléments du kit de chaque profil
  for (const s of sujets) {
    if (!s.profil) continue;
    const l = cartes.get(s.id)!;
    const deja = new Set(l.map((c) => c.cle));
    for (const e of kits[s.profil] ?? []) {
      if (deja.has(e.cle)) continue;
      deja.add(e.cle);
      const a = e.famille === 'photo' ? null : assetDeCle(e.cle);
      l.push({
        id: `k:${e.cle}`, cle: e.cle, kind: 'element', famille: familleDuKit(e.famille), titre: a?.titre ?? (e.famille === 'photo' ? 'Photo du kit' : e.cle), detail: a?.detail ?? null,
        nouveaute: false, note: e.note, tranche: tranche.has(e.cle), aValider: e.aValider && e.famille !== 'photo', date: null, url: e.url ?? null, prediction: predite(e.cle),
      });
    }
  }

  const resumes: ResumeSujetServeur[] = sujets.map((s) => {
    const l = cartes.get(s.id)!;
    const ok = l.filter((c) => !c.nouveaute && (c.note ?? 0) >= 4);
    return {
      ...s, total: l.length, nouveautes: l.filter((c) => c.nouveaute).length, aVoir: l.filter(carteAVoir).length, ok: ok.length,
      aValiderPourSites: ok.filter((c) => c.aValider).length,
      photos: l.filter((c) => c.famille === 'photo').length, serieEnAttente: l.some((c) => c.kind === 'serie'),
      apercu: [...l.filter((c) => c.nouveaute && c.kind !== 'contenu'), ...l.filter((c) => !c.nouveaute)].slice(0, 4).map((c) => c.id),
    };
  });
  return { sujets: resumes, cartes, migrationSeries: series.migrationManquante };
});

/** Décisions par jour (notes de Paul, 40 derniers jours) : objectif quotidien et série ; {} si la lecture échoue ou traîne */
export const getDecisionsParJour = cache(async (): Promise<{ jours: Record<string, number>; aujourdhui: string }> => {
  const aujourdhui = jourParis(new Date());
  const lire = async () => {
    const user = await getUser();
    if (!user) return {};
    const supabase = await createClient();
    const debut = new Date(Date.now() - 40 * 86400000).toISOString();
    const { data, error } = await supabase.from('assets_notes').select('created_at').eq('auteur', user.id).gte('created_at', debut).order('created_at', { ascending: false }).limit(5000);
    if (error || !Array.isArray(data)) return {};
    const jours: Record<string, number> = {};
    for (const l of data as { created_at: string }[]) { const j = jourParis(l.created_at); jours[j] = (jours[j] ?? 0) + 1; }
    return jours;
  };
  return { jours: await avecDelai(lire(), DELAIS.compteurs, {}), aujourdhui };
});

/** Famille d'étiquettes rapides d'une carte (types de l'inventaire) */
export const typeEtiquettes = (cle: string) => typeDeCle(cle);
