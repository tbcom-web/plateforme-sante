// Formes DÉRIVÉES côté sites, à partir des formes ÉcranZen (formes.ts, généré, intouché). Le studio ÉcranZen et ses atomes ne sont pas
// modifiés : chaque dérivée est une retouche documentée, validée par Paul, déclarée au catalogue comme déclinaison propre aux sites.
import { FORMES, type FormeEcranZen } from './formes';

/** Remplace un fragment exact du corps (erreur si le fragment a changé dans formes.ts : la retouche est à revoir) */
function remplacer(corps: string, avant: string, apres: string): string {
  if (!corps.includes(avant)) throw new Error(`bibliothèque : fragment introuvable pour une forme dérivée (${avant.slice(0, 40)}…)`);
  return corps.replace(avant, apres);
}

/**
 * `hallux-dorsal-incarne-sites` : dérivé de POD-AT-0009 (état incarné), retouche du spicule validée par Paul le 2026-10-05 (contre-revue
 * de l'illustrateur médical, N8). Le spicule n'est plus un triangle pointu détaché de la lame par un cran et peint par-dessus le repli
 * (lu « écharde ») : il PROLONGE l'arc latéral de la lame (même tracé, même trait, un seul contour avec la lame), bout arrondi, et son
 * bout est RECOUVERT par le repli latéral épaissi, peint après la lame (contour du repli continu). Le repli bombe un peu plus
 * (≈ 10 % de la largeur de la lame) sur le tiers distal.
 */
function halluxIncarneSites(): FormeEcranZen {
  const f = FORMES['hallux-dorsal-incarne'];
  let c = f.corps;
  // 1. Lame + spicule d'un seul contour : le bord latéral (coin coupé à cran) devient un arc continu qui prolonge la courbure de la lame,
  //    s'avance sous le repli (bout arrondi en x ≈ 265, sous le repli) puis revient au bord de la lame
  const avant = 'C244,122.7 248.7,130.7 246,146 L249,156 L256,162 L256,193';
  const apres = 'C244,122.7 250,127 254,134 C257.5,140 262,145.5 264.6,150 C266.2,153.6 262.4,160 258.6,165.6 C256.8,168.4 256,171.4 256,175 L256,193';
  if (!c.includes(avant)) throw new Error('bibliothèque : bord latéral de la lame introuvable (forme dérivée)');
  c = c.split(avant).join(apres);
  // 2. Ancien spicule (triangle peint au-dessus du repli) supprimé
  c = remplacer(c, '<g><path d="M249,156 C249,156 250.5,149.4 253,147 C255.5,144.6 268,138 268,138 C268,138 261.5,147.7 260,151 C258.5,154.3 256.5,163 256.5,163 L249,156 Z" style="fill:var(--ez-ongle);stroke:var(--ez-trait);stroke-width:var(--ez-ep-fin)"/></g>', '');
  // 3. Repli latéral épaissi : bombé renforcé côté externe (x > 272), bord interne inchangé ; il recouvre le bout du spicule
  const debut = c.indexOf('<g><path d="M269.8,128');
  const fin = c.indexOf('</g>', debut);
  const bosse = (y: number) => (y <= 128 || y >= 186 ? 0 : 3.6 * Math.sin((Math.PI * (y - 128)) / 58) ** 1.4);
  const groupe = c.slice(debut, fin).replace(/(\d+(?:\.\d+)?),(\d+(?:\.\d+)?)/g, (m, x, y) => (+x > 272 ? `${Math.round((+x + bosse(+y)) * 10) / 10},${y}` : m));
  c = c.slice(0, debut) + groupe + c.slice(fin);
  return { ...f, corps: c };
}

export const FORMES_DERIVEES: Record<string, FormeEcranZen> = {
  'hallux-dorsal-incarne-sites': halluxIncarneSites(),
};
