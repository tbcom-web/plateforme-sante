import 'server-only';
// « Personnaliser mon site » (packages/core/src/personnalisations-site.ts) : données du serveur pour l'espace praticien et la vue
// admin / commercial — polices proposées (notées 4-5 ★ et compatibles avec la recette), images du kit du profil par emplacement,
// pages de contenus modifiables, journal des versions (migration 0047, facultatif).
import {
  compatibiliteFamille, estImageDemo, familleDominante, gabaritModele, lirePersonnalisations, modeleDuSite, modeleIntegre, notesPolices,
  paireDuModele, policePermise, policesProposees, soinsParDefaut, SUJET_DE_SPECIALITE, urlImagePermise, jeuVisuel, completerJeuVisuel, visuelSoinJeu, svgDessin,
  registreModele, themeParId, packVisuel, type ModeleManifeste, type NomDessin,
  type PersonnalisationsSite, type PoliceProposee, type ReglagesPerso, type SiteDraft,
} from '@plateforme/core';
import { createClient } from '@/lib/supabase/server';
import { getContexteImages } from '@/lib/kits-images';
import { getLignesAssetsApprentissage } from '@/lib/notation-recettes';
import type { SoinCatalogue } from '@/lib/sites';

/** Sujet n° 1 du site (kit d'images du profil) */
export const sujetDuSite = (d: SiteDraft) => d.priorites?.principaux?.[0] ?? SUJET_DE_SPECIALITE[d.theme.specialite] ?? 'general';

/** Polices proposées au praticien pour ce site : la paire de la recette, puis les paires 4-5 ★ compatibles (harmonie, gabarit) */
export async function policesDuSite(d: SiteDraft, modele: ModeleManifeste): Promise<PoliceProposee[]> {
  const m = modeleDuSite(modele, d.theme);
  const actuelle = d.theme.police ?? paireDuModele(m)?.id ?? null;
  const famille = familleDominante({
    structure: d.theme.univers ?? d.theme.modele, gamme: d.theme.gamme, couleur: d.theme.couleur, police: actuelle ?? '',
    visuels: { style: d.theme.styleIllustration ?? 'releve' }, sections: { variantes: (d.theme.variantes ?? {}) as Record<string, string> },
    effets: d.theme.effets ?? '', typo: d.theme.typo ?? null, details: d.theme.details ?? null, menu: d.theme.menu ?? null,
  })[0]?.id;
  const gabarit = gabaritModele(m);
  const notes = notesPolices(await getLignesAssetsApprentissage().catch(() => []));
  return policesProposees({ modele: actuelle, notes, compatible: (id) => policePermise(id, gabarit) && (!famille || compatibiliteFamille('police', id, famille) !== 'exclu') });
}

/** `dessin` : rendu RÉEL (SVG) de l'illustration du modèle à cet emplacement quand aucune image n'y est posée (vignette « Illustration du modèle ») */
export type EmplacementImage = { cle: string; libelle: string; actuelle: string | null; options: string[]; dessin?: string | null };

/**
 * Emplacements d'images du site et images validées du kit du profil proposées pour chacun (photos importées, notées 4-5 ★ ;
 * jamais une image « Démo », jamais une image exclue).
 */
export async function imagesDuSite(d: SiteDraft, catalogue: readonly SoinCatalogue[], modele?: ModeleManifeste): Promise<EmplacementImage[]> {
  const ctx = await getContexteImages(true);
  const sujet = sujetDuSite(d);
  const kit = ctx.kits[sujet] ?? {};
  const general = ctx.kits.general ?? {};
  const propres = (l: readonly (string | undefined | null)[]) => [...new Set(l.filter((u): u is string => Boolean(u) && urlImagePermise(u) && !estImageDemo(u) && !ctx.exclues.includes(u!)))];
  const banque = propres([kit.accueil, kit.panorama, ...(kit.galerie ?? []), ...Object.values(kit.soins ?? {}), ...(ctx.vivier[sujet] ?? []), ...(ctx.vivier.general ?? []), general.accueil, general.panorama, ...(general.galerie ?? [])]).slice(0, 24);
  const slugs = d.soins.length ? d.soins : soinsParDefaut({ ...d.theme, priorites: d.priorites }, catalogue.map((c) => c.slug));
  const titre = (slug: string) => catalogue.find((c) => c.slug === slug)?.titre_court ?? slug;
  const l: EmplacementImage[] = [
    { cle: 'accueil', libelle: 'Premier écran', actuelle: d.photos.accueil || kit.accueil || null, options: propres([kit.accueil, ...banque]) },
    { cle: 'panorama', libelle: 'Bandeau photo', actuelle: d.photos.panorama || kit.panorama || null, options: propres([kit.panorama, ...banque]) },
    ...(d.priorites?.principaux ?? []).map((s) => ({ cle: `sujet:${s}`, libelle: `Sujet : ${s}`, actuelle: ctx.kits[s]?.accueil ?? null, options: propres([ctx.kits[s]?.accueil, ctx.kits[s]?.panorama, ...(ctx.vivier[s] ?? []), ...banque]) })),
    ...slugs.slice(0, 12).map((s) => ({ cle: `soin:${s}`, libelle: `Soin : ${titre(s)}`, actuelle: kit.soins?.[s] ?? null, options: propres([kit.soins?.[s], ...banque]) })),
    ...[0, 1, 2].map((i) => ({ cle: `cabinet:${i}`, libelle: `Cabinet, photo ${i + 1}`, actuelle: d.photos.cabinet[i] || kit.galerie?.[i] || null, options: propres([...(kit.galerie ?? []), ...banque]) })),
    ...d.praticiens.slice(0, 6).map((p, i) => ({ cle: `portrait:${i}`, libelle: `Portrait : ${[p.prenom, p.nom].filter(Boolean).join(' ') || `praticien ${i + 1}`}`, actuelle: p.photo || null, options: [] })),
  ];
  // Illustration du modèle (jeu visuel de la spécialité, registre du modèle) là où aucune image n'est posée : la vignette montre le
  // vrai dessin (même source que l'aperçu : jeuVisuel, visuelSoinJeu), jamais une case grise
  const jeu = completerJeuVisuel(jeuVisuel(d.theme.specialite, d.theme.specialiteSecondaire || null));
  const registre = modele ? registreModele(modeleDuSite(modele, d.theme)) : 'releve';
  const dessinDe = (cle: string): NomDessin | null => {
    if (cle === 'accueil') return jeu.accueil.dessin;
    if (cle === 'panorama') return jeu.panorama.dessin;
    if (cle.startsWith('soin:')) return visuelSoinJeu(jeu, cle.slice(5)).dessin;
    if (cle.startsWith('sujet:')) { const t = themeParId(cle.slice(6)); return t ? packVisuel(t.specialite).dessins?.[0] ?? jeu.accueil.dessin : jeu.accueil.dessin; }
    if (cle.startsWith('cabinet:')) return jeu.accueil.dessin;
    return null;
  };
  return l.map((e) => {
    if (e.actuelle) return e;
    const n = dessinDe(e.cle);
    let dessin: string | null = null;
    try { dessin = n ? svgDessin(n, { registre, id: `vig-${e.cle.replace(/[^a-z0-9]/gi, '-')}` }) : null; } catch { dessin = null; }
    return { ...e, dessin };
  });
}

/** Modèle de présentation du site (importé par l'admin ou intégré) */
export const modeleDeBase = (modeles: readonly { id: string; manifeste: ModeleManifeste }[], id: string) => modeles.find((m) => m.id === id)?.manifeste ?? modeleIntegre(id);

export type VersionJournal = { revision: number; action: string; par: string; le: string; note: string | null; reglages: ReglagesPerso; casseCharte: boolean };

/** Journal des versions (migration 0047) ; vide si la table n'existe pas encore */
export async function journalPersonnalisations(siteId: string, limite = 50): Promise<VersionJournal[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from('personnalisations_versions').select('revision, action, par, note, reglages, casse_charte, created_at').eq('site_id', siteId).order('created_at', { ascending: false }).limit(limite);
    if (error || !Array.isArray(data)) return [];
    return data.map((l) => ({ revision: l.revision, action: l.action, par: l.par, le: l.created_at, note: l.note ?? null, reglages: (l.reglages ?? {}) as ReglagesPerso, casseCharte: Boolean(l.casse_charte) }));
  } catch {
    return [];
  }
}

/** Ajoute une version au journal (sans effet si la migration 0047 n'est pas exécutée) */
export async function journaliser(siteId: string, p: PersonnalisationsSite, action: 'enregistrement' | 'publication' | 'restauration' | 'annulation', casseCharte: boolean, note?: string) {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('personnalisations_versions').insert({ site_id: siteId, revision: Math.max(1, p.revision), reglages: p.reglages, par: p.par ?? 'praticien', action, casse_charte: casseCharte, ...(note ? { note: note.slice(0, 200) } : {}) });
    if (error && !/personnalisations_versions|PGRST205|42P01/.test(`${error.code} ${error.message}`)) console.error('personnalisations_versions', error.message);
  } catch {
    /* journal facultatif */
  }
}

/** Sites qui ont des personnalisations (vue admin / commercial ; RLS : admin seulement pour les sites des autres) */
export type EtatPublicationPerso = { etat: 'publie' | 'non-publie' | 'jamais'; revisionEnLigne: number | null };

/**
 * État de publication des personnalisations : comparaison de la version figée en ligne (sites.config_publiee, 0017) et du brouillon
 * (sites.config). Mêmes réglages en ligne : « publié » ; sinon « modifications non publiées » ; aucune version figée : « jamais ».
 */
export function etatPublicationPerso(config: unknown, configPubliee: unknown): EtatPublicationPerso {
  if (!configPubliee) return { etat: 'jamais', revisionEnLigne: null };
  const brouillon = lirePersonnalisations(config), enLigne = lirePersonnalisations(configPubliee);
  return { etat: JSON.stringify(brouillon.reglages) === JSON.stringify(enLigne.reglages) ? 'publie' : 'non-publie', revisionEnLigne: enLigne.revision || null };
}

export async function sitesPersonnalises(): Promise<{ id: string; nom: string; config: unknown; perso: PersonnalisationsSite; updatedAt: string; publication: EtatPublicationPerso }[]> {
  const supabase = await createClient();
  const lire = (colonnes: string) => supabase.from('sites').select(colonnes).order('updated_at', { ascending: false }).limit(500) as unknown as Promise<{ data: Record<string, unknown>[] | null; error: unknown }>;
  let { data, error } = await lire('id, config, config_publiee, updated_at');
  if (error) ({ data } = await lire('id, config, updated_at'));
  return (data ?? [])
    .map((l) => ({ id: l.id as string, config: l.config, perso: lirePersonnalisations(l.config), updatedAt: l.updated_at as string, nom: nomDuSite(l.config), publication: etatPublicationPerso(l.config, l.config_publiee ?? null) }))
    .filter((s) => s.perso.revision > 0);
}
const nomDuSite = (c: unknown) => {
  const x = (c ?? {}) as { cabinet?: { nom?: string }; praticiens?: { prenom?: string; nom?: string }[] };
  return x.cabinet?.nom || [x.praticiens?.[0]?.prenom, x.praticiens?.[0]?.nom].filter(Boolean).join(' ') || 'Site sans nom';
};
