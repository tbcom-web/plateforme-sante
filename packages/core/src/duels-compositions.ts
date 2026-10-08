// Duels de compositions ciblés (MODES_DUEL de duels.ts : palettes, paires de polices, tailles et casse, police × palette) :
// variantes tirées par le moteur d'harmonie, apprentissage des combinaisons, nuanciers. Séparé de duels.ts (pur, sans
// dépendance vers recettes.ts) parce qu'il tire des compositions.
//
// Règle stricte : une variante n'introduit JAMAIS de nouvelle violation dure (harmonie.ts, violationsDures) ; sinon on retire
// (8 essais), et à défaut la variante est abandonnée (le duel passe à une autre dimension).
import { ajusterBT, APPRENTISSAGE_DUELS, poidsAppareilDuel, REFERENCE, type Duel, type MatchBT } from './duels';
import { cleCombinaisonPolicePalette, cleApriseDeNotable } from './combinaisons';
import { gamme as gammeParId } from './gammes';
import { violationsDures, type ApprisHarmonie, type ContexteHarmonie } from './harmonie';
import { tirerDimension, tirerHabillageRecette, type CompositionRecette, type ContexteRecette, type DimensionRecette } from './recettes';
import type { AxeTypo } from './typo';

const codes = (x: CompositionRecette, c: ContexteRecette) => new Set(violationsDures(x, c as unknown as ContexteHarmonie).map((v) => v.code));

/** Aucune violation dure de plus que la base */
export function sansNouvelleViolation(base: CompositionRecette, y: CompositionRecette, c: ContexteRecette): boolean {
  const avant = codes(base, c);
  return [...codes(y, c)].every((k) => avant.has(k));
}

/**
 * Variante d'une composition pour une dimension de duel : dimensions du studio (couleurs, polices…) par leur dé harmonieux,
 * `typo:<axe>` (un seul axe de typographie), `police-couleurs` (paire puis palette). Jamais de nouvelle violation dure : la base
 * est rendue (donc « pas de variante ») si aucun essai ne convient.
 */
export function varierDuel(x: CompositionRecette, dimension: string, c: ContexteRecette, graine: number): CompositionRecette {
  for (let essai = 0; essai < 8; essai++) {
    const g = (Math.imul(graine, 2654435761) + essai * 97) >>> 0;
    let y: CompositionRecette;
    if (dimension.startsWith('typo:')) y = tirerHabillageRecette(x, { groupe: 'typo', axe: dimension.slice(5) as AxeTypo }, c, g);
    else if (dimension === 'police-couleurs') y = tirerDimension(tirerDimension(x, 'polices', c, g), 'couleurs', c, (g + 1) >>> 0);
    else y = tirerDimension(x, dimension as DimensionRecette, c, g);
    if (sansNouvelleViolation(x, y, c)) return y;
  }
  return x;
}

/** Nuancier d'une palette (pastilles A / B du bandeau) : gamme, ou couleur libre */
export function nuancier(x: Pick<CompositionRecette, 'gamme' | 'couleur'>): { nom: string; hex: string }[] {
  const g = x.gamme ? gammeParId(x.gamme) : null;
  if (!g) return [{ nom: 'Couleur du cabinet', hex: x.couleur }];
  return [['Accent', g.accent], ['Foncé', g.accentFonce], ['Fond', g.fond], ['Doux', g.fondDoux], ['Plan', g.plan], ['Signal', g.signal]].map(([nom, hex]) => ({ nom, hex }));
}

/** Clé apprise de la combinaison d'un côté de duel (ingrédients atelier : police=…, gamme=…) ; gamme libre : aucune */
function combinaisonDuCote(atelier: readonly string[] | undefined): string | null {
  const p = atelier?.find((k) => k.startsWith('police='))?.slice(7);
  const g = atelier?.find((k) => k.startsWith('gamme='))?.slice(6);
  return p && g && g !== 'libre' && gammeParId(g) ? cleCombinaisonPolicePalette(p, g) : null;
}

/**
 * Combinaisons apprises des duels « Police × palette » : Bradley-Terry des clés `gamme:<g>&police:<p>` des deux côtés,
 * Δ = clamp(0,5 · θ, ±0,5 étoile) (mêmes règles que renfortsDuels ; « les deux sont mauvais » = défaite contre la référence).
 */
export function pairesDuels(duels: readonly Duel[]): Record<string, number> {
  const matchs: MatchBT[] = [];
  for (const d of duels) {
    if (d.dimension !== 'police-couleurs') continue;
    const a = combinaisonDuCote(d.aIngredients.atelier), b = combinaisonDuCote(d.bIngredients.atelier);
    const w = poidsAppareilDuel(d.appareil);
    if (d.resultat === 'mauvais') {
      for (const k of [a, b]) if (k) matchs.push({ a: k, b: REFERENCE, s: 0, w: w * APPRENTISSAGE_DUELS.penaliteMauvais });
      continue;
    }
    if (!a || !b || a === b) continue;
    matchs.push({ a, b, s: d.resultat === 'a' ? 1 : d.resultat === 'b' ? 0 : 0.5, w });
  }
  const r: Record<string, number> = {};
  const f = ajusterBT(matchs);
  for (const k of [...f.keys()].sort()) {
    const v = Math.round(Math.max(-APPRENTISSAGE_DUELS.plafond, Math.min(APPRENTISSAGE_DUELS.plafond, APPRENTISSAGE_DUELS.facteur * f.get(k)!.theta)) * 1000) / 1000;
    if (v) r[k] = v;
  }
  return r;
}

/** Notes de la tuile « Police × palette » (effets d'assets `typo:combinaison:…`) → paires apprises, moitié de l'effet, ±0,5 ★ */
export function pairesDesNotes(effets: Readonly<Record<string, number>>): Record<string, number> {
  const r: Record<string, number> = {};
  for (const [k, e] of Object.entries(effets)) {
    const p = cleApriseDeNotable(k);
    if (p) { const v = Math.round(Math.max(-0.5, Math.min(0.5, 0.5 * e)) * 1000) / 1000; if (v) r[p] = v; }
  }
  return r;
}

/** Ajoute des paires apprises (duels, tuile) aux paires globales d'harmonie, plafond des paires ±0,75 ★ (PLAFOND_HARMONIE) */
export function ajouterPairesApprises(h: ApprisHarmonie | null | undefined, ...sources: Readonly<Record<string, number>>[]): ApprisHarmonie | null {
  const ajout: Record<string, number> = {};
  for (const s of sources) for (const [k, v] of Object.entries(s)) ajout[k] = (ajout[k] ?? 0) + v;
  if (!Object.keys(ajout).length) return h ?? null;
  const base = h ?? { global: { familles: {}, ingredients: {} } };
  const paires: Record<string, number> = { ...(base.global.paires ?? {}) };
  for (const [k, v] of Object.entries(ajout)) {
    const t = Math.round(Math.max(-0.75, Math.min(0.75, (paires[k] ?? 0) + v)) * 1000) / 1000;
    if (t) paires[k] = t; else delete paires[k];
  }
  return { ...base, global: { ...base.global, paires } };
}
