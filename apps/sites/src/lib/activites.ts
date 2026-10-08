// Activités mises en avant par le praticien (profils.ts : basket, tennis…) : visuels de l'activité sur la page du thème qui s'y prête,
// au PREMIER ÉCRAN (lib/vitrine.ts : illustration ou photo selon le style ; une animation garde celle du thème) et sur les FICHES des
// soins mis en avant pour l'activité (pages/soins/[slug].astro). Seulement des visuels VALIDÉS (retenus à la construction :
// site.activites, lib/supabase.ts) ; sinon null et chaque page garde le visuel du thème (repli). Aucun texte ajouté. Scènes du kit
// Sports (sports.ts) : ligne:sport-<x> (trait continu), dessin:sport-<x>:pedagogique.
import { activitePratique, estSport, pratiqueDe, svgSport } from '@plateforme/core';
import { site } from './site';

/** Activité n° 1 du site avec des visuels VALIDÉS propres (hors repli), si elle se prête au thème (null : tout thème) */
function activiteValidee(themeId: string | null) {
  const a = site.activites;
  if (!a || a.repli || !a.ids.length) return null;
  const act = activitePratique(pratiqueDe(null), a.ids[0]);
  if (!act || (themeId !== null && !act.themes.includes(themeId))) return null;
  return { a, act };
}

/** SVG de l'illustration validée de l'activité n° 1 (classe CSS au choix), sinon null */
function svgActivite(themeId: string | null, classe: string): string | null {
  const v = activiteValidee(themeId);
  if (!v?.a.illustration) return null;
  const ligne = /^ligne:sport-([a-z]+)$/.exec(v.a.illustration);
  const dessin = /^dessin:sport-([a-z]+):pedagogique$/.exec(v.a.illustration);
  const scene = ligne?.[1] ?? dessin?.[1];
  if (!scene || !estSport(scene)) return null;
  return svgSport(scene, ligne ? 'ligne' : 'pedagogique', { classe });
}

/** SVG de l'illustration validée de l'activité n° 1 pour ce thème, sinon null (repli sur le visuel du thème) */
export const illustrationActivite = (themeId: string): string | null => svgActivite(themeId, 'vt vt--activite');

/** Photo validée propre à l'activité n° 1 pour ce thème (style « photos »), sinon null */
export function photoActivite(themeId: string | null): string | null {
  const v = activiteValidee(themeId);
  return v?.a.photos?.[0] ?? null;
}

/**
 * Visuels de l'activité pour la FICHE d'un soin mis en avant pour elle (un des soins de l'activité n° 1, parmi les 3 premiers soins
 * du site, ordonnés par soinsEnAvantActivites) ; null sinon (visuel du soin, inchangé).
 */
export function visuelActiviteSoin(slug: string): { svg: string | null; photo: string | null } | null {
  const v = activiteValidee(null);
  if (!v || !v.act.soins.includes(slug) || !site.soins.slice(0, 3).some((s) => s.slug === slug)) return null;
  const r = { svg: svgActivite(null, 'dessin dessin--activite'), photo: v.a.photos?.[0] ?? null };
  return r.svg || r.photo ? r : null;
}
