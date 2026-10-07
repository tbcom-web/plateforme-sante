// Formes des cartes de soins et de sujets (demande de Paul du 2026-10-07 : « changer aussi les formes des bulles de soins : gros
// carrés, mosaïque, bulles… »). Dimension INDÉPENDANTE de la disposition (variantes soins / sujets) : seule la forme change —
// rayon, découpe, aplat — jamais le contenu. CSS seul (border-radius, grid, aplats de la gamme), aucune image ni script ; une
// feuille par forme, partagée par les gabarits Astro (<html data-forme>, layouts/Gabarit.astro) et l'aperçu de l'admin.
// Lisibilité : texte des tuiles pleine couleur = paire vif / vif-texte (≥ 4,5:1, gabarits.ts) ; cibles tactiles inchangées
// (cartes ≥ 44 px) ; titres insécables (lib/typo.mjs) ; la mosaïque ne s'applique qu'à partir de 760 px. Visuels carrés ou ronds :
// min-height 0 et hauteur auto (WebKit ignore aspect-ratio d'un élément étiré par une rangée de grille définie).
// Module pur.

export const FORMES_CARTES = [
  { id: 'gabarit', nom: 'Celle du modèle' },
  { id: 'bulles', nom: 'Bulles rondes' },
  { id: 'carres', nom: 'Gros carrés' },
  { id: 'arrondies', nom: 'Cartes arrondies' },
  { id: 'mosaique', nom: 'Mosaïque (une grande, des petites)' },
  { id: 'pilules', nom: 'Pastilles' },
  { id: 'organiques', nom: 'Formes organiques' },
  { id: 'tuiles', nom: 'Tuiles pleine couleur' },
  { id: 'sans-cadre', nom: 'Sans cadre' },
] as const;
export type IdFormeCartes = (typeof FORMES_CARTES)[number]['id'];
export const formeCartes = (id: unknown) => FORMES_CARTES.find((f) => f.id === id);

// Cibles (site : Soins.astro, SujetsAccueil.astro ; aperçu : classes forme-*) — jamais le premier écran
const CARTE = ':is(.soin,.sujet__lien,.forme-carte)';
const VISUEL = ':is(.soin__visuel,.sujet__visuel,.forme-visuel)';
const GRILLE = ':is(.ed__soins,.sujets__blocs,.forme-grille)';
const TEXTES = ':is(.soin__titre,.soin__resume,.soin__suite,.sujet__titre,.sujet__ligne,.forme-texte)';

/**
 * Feuille CSS d'une forme (racine `[data-forme="…"]` : <html> du site, conteneur de l'aperçu) ; vide pour « gabarit » ou
 * inconnue. Déclarations en !important : la forme prime sur la présentation propre au gabarit (styles de composants du site,
 * styles en ligne de l'aperçu), sans augmenter la spécificité au cas par cas.
 */
export function cssFormes(id: unknown): string {
  const f = formeCartes(id);
  if (!f || f.id === 'gabarit') return '';
  const css = feuille(f.id);
  return css.replace(/\{([^{}]*)\}/g, (_, d: string) => `{${d.split(';').filter(Boolean).map((x) => `${x}!important`).join(';')}}`);
}

function feuille(id: Exclude<IdFormeCartes, 'gabarit'>): string {
  const r = `[data-forme=${id}]`;
  const c = `${r} ${CARTE}`, v = `${r} ${VISUEL}`;
  switch (id) {
    case 'bulles':
      return `${c}{border-radius:28px;overflow:hidden}${v}{aspect-ratio:1/1;width:min(100%,220px);min-height:0;height:auto;align-self:start;justify-self:center;margin:14px auto 0;border-radius:50%;overflow:hidden}`;
    case 'carres':
      return `${c}{border-radius:0;overflow:hidden}${v}{aspect-ratio:1/1;min-height:0;height:auto;align-self:start;border-radius:0}`;
    case 'arrondies':
      return `${c}{border-radius:28px;overflow:hidden}${v}{border-radius:22px}`;
    case 'mosaique':
      return `@media (min-width:760px){${r} ${GRILLE}{grid-template-columns:repeat(3,minmax(0,1fr));grid-auto-flow:dense}${r} ${GRILLE}>:first-child{grid-column:span 2;grid-row:span 2}${r} ${GRILLE}>:first-child ${VISUEL}{aspect-ratio:4/3}}${c}{border-radius:18px;overflow:hidden;height:100%}`;
    case 'pilules':
      return `${c}{border-radius:999px;overflow:hidden;grid-template-columns:72px minmax(0,1fr);grid-template-rows:none;align-items:center;min-height:72px;padding:6px 22px 6px 6px}${v}{aspect-ratio:1/1;border-radius:50%;min-height:0}${r} :is(.soin__resume,.sujet__ligne){display:none}`;
    case 'organiques':
      return `${c}{border-radius:32px;overflow:hidden}${v}{border-radius:42% 58% 63% 37%/45% 39% 61% 55%;overflow:hidden}${r} ${GRILLE}>:nth-child(2n) ${VISUEL}{border-radius:58% 42% 37% 63%/55% 61% 39% 45%}`;
    case 'tuiles':
      return `${c}{border-radius:14px;overflow:hidden;background:var(--g-vif,var(--accent));box-shadow:none}${r} ${CARTE} ${TEXTES}{color:var(--g-vif-texte,#fff)}${v}{background:var(--g-carte,#fff)}`;
    case 'sans-cadre':
      return `${c}{background:none;box-shadow:none;border-radius:0}${v}{background:none;border-radius:0}`;
  }
}
