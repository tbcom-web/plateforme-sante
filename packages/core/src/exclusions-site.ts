// EXCLUSIONS À LA CONSTRUCTION DES SITES PUBLIÉS (demande de Paul du 2026-10-09) : la construction Astro applique les mêmes
// exclusions que l'admin (docs/espaces-admin.md, « Ce qui n'est pas accepté n'est pas utilisable ») :
// - éléments notés ≤ 2 ★ (moyenne ou dernière note), retirés ou « à retravailler » (contexte-images.ts, clesImagesExclues) ;
// - nouveautés du registre (inventaire-connu.json, < 30 jours) pas encore ACCEPTÉES ou refusées dans les Arrivages
//   (arrivages.ts, clesExcluesArrivages : statuts accepte / retire, une note vaut acceptation sauf 1 ★) ;
// - photos « à valider » (photos_libres hors « validee » : images générées ou gardées pas encore importées).
// Un élément exclu présent dans la configuration du site est REMPLACÉ PAR SON REPLI (valeur par défaut du modèle, de la typographie,
// des détails, du menu ; photo retirée → la suivante non exclue ou l'illustration), jamais posé. Module pur.

import { clesExcluesArrivages } from './arrivages';
import { clesImagesExclues, imageExclue } from './contexte-images';
import { clesRecentes } from './nouveautes';
import { clesUnitairesInventaire } from './assets';
import { clesDetails, DETAILS_PAR_DEFAUT } from './details';
import { clesMenu, MENU_PAR_DEFAUT } from './menus';
import { cleTraitementPhotos } from './traitements-photos';
import { TYPO_PAR_DEFAUT } from './typo';
import type { SiteDraft } from './draft';

/** Ligne d'apprentissage des assets (assets_notes_apprentissage : notes, PLUS RÉCENTES D'ABORD, puis statuts courants) */
export type LigneExclusion = { cle: string; note?: number | null; statut?: string | null };

/**
 * Clés exclues d'un site publié : mêmes règles que l'admin (ContexteImages : clesImagesExclues + getExclusionsArrivages).
 * `jour` : AAAA-MM-JJ (Paris) de la construction ; `urlsAValider` : photos pas encore validées (exclues par leur URL).
 */
export function clesExcluesSite(o: { lignes: readonly LigneExclusion[]; jour: string; urlsAValider?: readonly string[]; connues?: ReadonlySet<string> }): Set<string> {
  const r = clesImagesExclues(o.lignes);
  const dernieresNotes: Record<string, number> = {};
  const statuts: Record<string, string> = {};
  for (const l of o.lignes) {
    if (!l?.cle) continue;
    if (typeof l.note === 'number') { if (!(l.cle in dernieresNotes)) dernieresNotes[l.cle] = l.note; } else if (l.statut) statuts[l.cle] = l.statut;
  }
  const connues = o.connues ?? new Set(clesUnitairesInventaire());
  const recentes = clesRecentes(o.jour).filter((x) => connues.has(x.cle));
  for (const k of clesExcluesArrivages(recentes, { statuts, dernieresNotes })) r.add(k);
  for (const u of o.urlsAValider ?? []) if (u) r.add(u);
  return r;
}

/**
 * Brouillon du site sans éléments exclus : chaque élément exclu de la configuration est remplacé par son repli. `retires` : clés
 * retirées (journal de construction). Aucune exclusion : brouillon inchangé (même objet).
 */
export function appliquerExclusionsSite(d: SiteDraft, exclues: ReadonlySet<string>): { draft: SiteDraft; retires: string[] } {
  if (!exclues.size) return { draft: d, retires: [] };
  const retires: string[] = [];
  const ex = (k: string) => { const oui = exclues.has(k); if (oui) retires.push(k); return oui; };
  const t = { ...d.theme };
  if (t.gamme && ex(`gamme:${t.gamme}`)) t.gamme = '';
  if (t.police && ex(`typo:police:${t.police}`)) delete t.police;
  if (t.typo) {
    const typo = { ...t.typo } as Record<string, string>;
    for (const [axe, v] of Object.entries(typo)) if (ex(`typo:${axe}:${v}`)) typo[axe] = (TYPO_PAR_DEFAUT as Record<string, string>)[axe];
    t.typo = typo as typeof t.typo;
  }
  if (t.details) {
    const det = { ...t.details } as Record<string, string>;
    for (const k of clesDetails(t.details)) if (ex(k)) { const el = k.split(':')[1]; det[el] = (DETAILS_PAR_DEFAUT as Record<string, string>)[el]; }
    t.details = det as typeof t.details;
  }
  if (t.menu) {
    const mn = { ...t.menu } as Record<string, string>;
    for (const k of clesMenu(t.menu)) if (ex(k)) { const axe = k.split(':')[1]; mn[axe] = (MENU_PAR_DEFAUT as Record<string, string>)[axe]; }
    t.menu = mn as typeof t.menu;
  }
  if (t.effets && ex(`effets:${t.effets}`)) delete t.effets;
  if (t.traitementPhotos && ex(cleTraitementPhotos(t.traitementPhotos as Parameters<typeof cleTraitementPhotos>[0]))) delete t.traitementPhotos;
  if (t.animationAccueil && ex(`animation:${t.animationAccueil}`)) delete t.animationAccueil;
  if (t.variantes) {
    const v = { ...t.variantes } as Record<string, string | undefined>;
    for (const [s, x] of Object.entries(v)) if (x && ex(`composant:${s}:${x}`)) delete v[s];
    t.variantes = v as typeof t.variantes;
  }
  const garder = (u: string | undefined | null) => { if (!u) return true; if (imageExclue(u, exclues)) { retires.push(u); return false; } return true; };
  if (t.photosRecette) t.photosRecette = t.photosRecette.filter(garder);
  const photos = { ...d.photos, accueil: garder(d.photos.accueil) ? d.photos.accueil : '', panorama: garder(d.photos.panorama) ? d.photos.panorama : '', cabinet: d.photos.cabinet.filter(garder) };
  if (!retires.length) return { draft: d, retires };
  return { draft: { ...d, theme: t, photos }, retires: [...new Set(retires)] };
}
