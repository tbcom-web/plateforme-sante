// Activités mises en avant par le praticien (profils.ts : basket, tennis…) : visuel de l'activité sur la page du thème qui s'y prête.
// Seulement un visuel VALIDÉ (retenu à la construction : site.activites, lib/supabase.ts) ; sinon null et la page garde le visuel du
// thème (repli). Scènes du kit Sports (sports.ts) : ligne:sport-<x> (trait continu), dessin:sport-<x>:pedagogique.
import { activitePratique, estSport, pratiqueDe, svgSport } from '@plateforme/core';
import { site } from './site';

/** SVG de l'illustration validée de l'activité n° 1 pour ce thème, sinon null (repli sur le visuel du thème) */
export function illustrationActivite(themeId: string): string | null {
  const a = site.activites;
  if (!a || a.repli || !a.illustration) return null;
  const act = activitePratique(pratiqueDe(null), a.ids[0]);
  if (!act?.themes.includes(themeId)) return null;
  const ligne = /^ligne:sport-([a-z]+)$/.exec(a.illustration);
  const dessin = /^dessin:sport-([a-z]+):pedagogique$/.exec(a.illustration);
  const scene = ligne?.[1] ?? dessin?.[1];
  if (!scene || !estSport(scene)) return null;
  return svgSport(scene, ligne ? 'ligne' : 'pedagogique', { classe: 'vt vt--activite' });
}
