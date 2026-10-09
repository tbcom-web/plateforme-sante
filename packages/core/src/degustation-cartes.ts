// Construction d'une carte de la Dégustation (grille, duel de départage, note rapide), sortie de Degustation.tsx pour tourner
// HORS du fil principal (retour de Paul du 2026-10-09 : « la page Dégustation prend vraiment beaucoup de temps à charger » :
// une grille demande 0,2 à 2 s de tirages, et une carte sans grille possible fait essayer la suivante). Même calcul que la page,
// avec des données sérialisables (postMessage vers un Web Worker, préparation des cartes suivantes pendant que Paul joue) :
// pour la même carte, la même graine et la même famille, le même résultat (degustation-cartes.test.ts).
import { baseFavoris, grilleCompositions, grilleDirectionsDegustation, grilleIcones, grilleKit, type GrilleDegustation, type PropositionDegustation } from './degustation-grilles';
import { DIMENSIONS_FORMAT, pariGrille, type CarteSession } from './degustation';
import { famillesPreferees, type famillesDesDuels } from './degustation-directions';
import type { IdFamilleStyle } from './harmonie';
import { cleComposition, predireDuel } from './duels';
import { clePhoto } from './assets-poids';
import { classerPhotos } from './favoris';
import { ECHANTILLON_DIRECTIONS } from './pictos-directions';
import { contexteScenario } from './notation-recettes';
import { clesRecette, compositionPourCle, serialiserComposition, type PhotoBanque } from './recettes';
import type { PoidsAtelier } from './atelier-poids';
import type { ScenarioRecette } from './simulateur';
import { modeleIntegre, type ModeleManifeste } from './modeles';
import { contexteImages, definirContexteImages, type KitCompact } from './contexte-images';
import { animationsPretesDefinies, definirAnimationsPretes } from './heros-photo-variantes';

export type ProfilCarte = { id: string; nom: string; sujets: string[]; scenario: ScenarioRecette };
type Prediction = { cle: string; note: number; le: string };

/** Données de la page utiles aux cartes (sérialisables) */
export type DonneesCartes = {
  profils: readonly ProfilCarte[];
  photos: readonly PhotoBanque[];
  poids: PoidsAtelier | null;
  predictions: Readonly<Record<string, readonly Prediction[]>>;
  familles: ReturnType<typeof famillesDesDuels>;
  /** Fiches des modèles disponibles (id, fiche) */
  modeles: readonly { id: string; manifeste: ModeleManifeste }[];
  tranches: { refuses: readonly string[]; favoris: readonly string[] };
};

export type CarteConstruite<P extends ProfilCarte = ProfilCarte> =
  | { kind: 'grille'; carte: CarteSession; profil: P; grille: GrilleDegustation; pari: number | null }
  | { kind: 'duel'; carte: CarteSession; profil: P; grille: GrilleDegustation; pari: 'a' | 'b' | 'egalite' | null }
  | { kind: 'note'; carte: CarteSession; profil: P | null; cle: string; url: string | null; pari: number | null };

/** Outils dérivés des données (une fois par jeu de données) */
export function outilsCartes(d: DonneesCartes) {
  const notes = d.poids?.notesElements ?? {};
  const effets = d.poids?.assets?.effets ?? {};
  const moyenne = d.poids?.assets?.moyenne || 3;
  const tranches = { refuses: new Set(d.tranches.refuses), favoris: new Set(d.tranches.favoris) };
  const modele = (id: string) => d.modeles.find((m) => m.id === id)?.manifeste ?? modeleIntegre(id);
  // Note du juge pour un élément : prédiction la plus récente, sinon note estimée par l'apprentissage, sinon note de Paul
  const noteJuge = (k: string): number | null => {
    const l = d.predictions[k];
    if (l?.length) return [...l].sort((a, b) => (a.le < b.le ? 1 : -1))[0].note;
    if (effets[k] !== undefined) return moyenne + effets[k];
    return notes[k]?.m ?? null;
  };
  return { notes, tranches, modele, noteJuge };
}

/** Famille de base d'une grille « Détail » : choisie pour ce profil dans la session, sinon famille préférée apprise */
export const familleDeCarte = (d: Pick<DonneesCartes, 'familles'>, profil: Pick<ProfilCarte, 'sujets'>, familleSession: IdFamilleStyle | null | undefined): IdFamilleStyle | null =>
  familleSession ?? famillesPreferees(d.familles, profil.sujets[0] ?? 'cabinet')[0] ?? null;

/**
 * Carte construite (sans horodatage) ou null (rien de jouable : la page passe à la suivante). `familleSession` : famille choisie
 * pour le profil de la carte dans une grille « Directions » de la session (null : préférée apprise).
 */
export function construireCarte<P extends ProfilCarte>(d: Omit<DonneesCartes, 'profils'> & { profils: readonly P[] }, c: CarteSession, graine: number, familleSession: IdFamilleStyle | null, outils = outilsCartes(d)): CarteConstruite<P> | null {
  const { notes, tranches, modele, noteJuge } = outils;
  const profilDe = (id: string | null): P | null => (d.profils as readonly P[]).find((p) => p.id === id) ?? null;
  if (c.kind === 'note') {
    const url = c.cle.startsWith('photo:') ? d.photos.find((p) => (p.cle ?? clePhoto(p.url)) === c.cle)?.url ?? null : null;
    if (c.cle.startsWith('photo:') && !url) return null;
    return { kind: 'note', carte: c, profil: profilDe(c.profil), cle: c.cle, url, pari: noteJuge(c.cle) === null ? null : Math.round(noteJuge(c.cle)!) };
  }
  const profil = profilDe(c.profil);
  if (!profil) return null;
  const ctx = contexteScenario(profil.scenario, { poids: d.poids, photos: d.photos as PhotoBanque[], modele, modeTirage: 'favoris' });
  if (c.kind === 'duel') {
    const base = baseFavoris(ctx, notes, graine);
    const a = compositionPourCle(base, c.a), b = compositionPourCle(base, c.b);
    const prop = (x: typeof base, k: string): PropositionDegustation => ({ cle: cleComposition(JSON.parse(serialiserComposition(x))), nouveau: k, x, ingredients: { ...clesRecette(x, ctx.sujets), element: k, juge: [k], composition: JSON.parse(serialiserComposition(x)) } });
    const pa = prop(a, c.a), pb = prop(b, c.b);
    if (pa.cle === pb.cle) return null;
    return { kind: 'duel', carte: c, profil, grille: { format: 'compositions', dimension: c.dimension, base, propositions: [pa, pb] }, pari: predireDuel([c.a], [c.b], d.predictions) };
  }
  const o = { contexte: ctx, notes, tranches, graine };
  // Entonnoir : famille choisie pour ce profil dans une grille « Directions » de la session, sinon famille préférée apprise
  const famille = familleDeCarte(d, profil, familleSession);
  let g: GrilleDegustation | null = null;
  if (c.format === 'directions') {
    g = grilleDirectionsDegustation({ ...o, priorite: famillesPreferees(d.familles, profil.sujets[0] ?? 'cabinet').slice(0, 2) });
  } else if (c.format === 'kits') {
    const cl = classerPhotos(d.photos as PhotoBanque[], ctx.sujets, d.poids?.assets ?? null, d.poids?.notesPhotos ?? null).filter((x) => x.sujetUn && x.cle);
    const urls = cl.map((x) => x.p.url);
    g = grilleKit(urls.slice(0, 4), urls.slice(1), { sujets: ctx.sujets, notes, tranches, graine });
  } else if (c.format === 'icones') {
    g = grilleIcones(ECHANTILLON_DIRECTIONS[graine % ECHANTILLON_DIRECTIONS.length], { tranches, graine });
  } else {
    const dims = [c.dimension, ...DIMENSIONS_FORMAT[c.format].filter((x) => x !== c.dimension)];
    for (const x of dims) { g = grilleCompositions(c.format, x, { ...o, famille }); if (g) break; }
  }
  if (!g) return null;
  // Directions : le juge parie sur la moyenne prédite des éléments de chaque site (la famille seule n'a pas de prédiction)
  const gr = g;
  const pari = pariGrille(gr.propositions.map((p) => (gr.format === 'directions' ? { cle: p.cle, juge: p.ingredients.assets ?? [] } : { cle: p.cle, nouveau: p.nouveau })), noteJuge);
  return { kind: 'grille', carte: c, profil, grille: gr, pari };
}

/** Registres du core lus par les tirages (contexte d'images, animations prêtes) : copiés de la page vers le worker */
export type RegistresTirage = { images: { exclues: string[]; kits: Record<string, KitCompact>; vivier: Record<string, readonly string[]> | null }; animationsPretes: string[] };
export function lireRegistresTirage(): RegistresTirage {
  const i = contexteImages();
  return { images: { exclues: [...i.exclues], kits: { ...i.kits }, vivier: i.vivier ? { ...i.vivier } : null }, animationsPretes: [...animationsPretesDefinies()] };
}
export function poserRegistresTirage(r: RegistresTirage) {
  definirContexteImages({ exclues: r.images.exclues, kits: r.images.kits, vivier: r.images.vivier });
  definirAnimationsPretes(r.animationsPretes);
}
