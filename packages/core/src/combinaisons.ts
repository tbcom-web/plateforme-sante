// Combinaisons police × palette (demande de Paul du 2026-10-08 : « pouvoir noter / A-B tester des palettes de couleurs, des
// combinaisons de polices et de tailles »). Module PUR, sans dépendance vers recettes.ts.
//
// Deux clés pour la même combinaison :
//  - clé APPRISE (harmonie) : `gamme:<gamme>&police:<paire>` = clePaireHarmonie('gamme', g, 'police', p) de harmonie.ts, dans l'ordre
//    de PAIRES_HARMONIE (['gamme', 'police']) : c'est la clé des paires apprises par la tuile « Recettes complètes »
//    (notation-recettes.ts, ApprisHarmonie.global.paires), lue par les tirages harmonieux (effetPairesHarmonie). Les duels
//    « Police × palette » et la tuile « Police × palette » y ajoutent leur effet (lib/atelier.ts, plafond des paires ±0,75 ★).
//  - clé NOTABLE (assets_notes, type `typo` : aucune migration) : `typo:combinaison:<paire>.<gamme>` (tuile « Police × palette »).
import { GAMMES, gamme as gammeParId } from './gammes';
import { PAIRES_POLICES, pairePolices } from './modeles';

/** Clé apprise d'une combinaison (= clePaireHarmonie('gamme', gamme, 'police', police)) */
export const cleCombinaisonPolicePalette = (police: string, gamme: string) => `gamme:${gamme}&police:${police}`;

/** Clé notable de la tuile « Police × palette » */
export const cleAssetCombinaison = (police: string, gamme: string) => `typo:combinaison:${police}.${gamme}`;

/** Lecture d'une clé notable ; null si ce n'en est pas une (paire ou gamme inconnue) */
export function lireCleCombinaison(cle: unknown): { police: string; gamme: string } | null {
  if (typeof cle !== 'string' || !cle.startsWith('typo:combinaison:')) return null;
  const [police, gamme, ...reste] = cle.slice('typo:combinaison:'.length).split('.');
  if (reste.length || !pairePolices(police) || !gammeParId(gamme)) return null;
  return { police, gamme };
}
export const estCleCombinaison = (cle: unknown): cle is string => lireCleCombinaison(cle) !== null;

/** Libellé lisible : « Revue à empattements × Cobalt » */
export function libellePolicePalette(police: string, gamme: string): string {
  return `${pairePolices(police)?.nom ?? police} × ${gammeParId(gamme)?.nom ?? gamme}`;
}

/** Toutes les combinaisons notables (paires de polices × gammes), dans un ordre stable */
export function toutesCombinaisons(): { cle: string; police: string; gamme: string; titre: string }[] {
  return GAMMES.flatMap((g) => PAIRES_POLICES.map((p) => ({ cle: cleAssetCombinaison(p.id, g.id), police: p.id, gamme: g.id, titre: libellePolicePalette(p.id, g.id) })));
}

/** Clé notable → clé apprise (effets des notes de la tuile reportés sur les paires d'harmonie) */
export function cleApriseDeNotable(cle: string): string | null {
  const c = lireCleCombinaison(cle);
  return c ? cleCombinaisonPolicePalette(c.police, c.gamme) : null;
}
