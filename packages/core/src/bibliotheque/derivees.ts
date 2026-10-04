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
 * bout est RECOUVERT par le repli latéral épaissi, peint après la lame (contour du repli continu). Lecture patient à 240 px (revue de
 * la session principale) : repli bombé de ≈ 22 % de la largeur de la lame, posé sur le bord de la lame qui plonge dessous, teinte
 * localisée un peu plus sombre que la peau.
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
  // 3. Repli latéral épaissi et enflammé, lisible à 240 px (lecture patient) : bord externe bombé de ≈ 22 % de la largeur de la lame sur
  //    la moitié distale, bord interne avancé SUR la lame (le bord latéral de la lame plonge visiblement sous le repli), teinte
  //    localisée un peu plus sombre que la peau (jeton « inflammation » : jamais un disque rouge vif ; accent léger en monochrome).
  const debut = c.indexOf('<g><path d="M269.8,128');
  const fin = c.indexOf('</g>', debut) + 4;
  if (debut < 0) throw new Error('bibliothèque : repli latéral introuvable (forme dérivée)');
  // Repli en lentille : il part du contour de l'hallux (y ≈ 128) et y revient (y ≈ 192) sans arête, bombe de ≈ 17 u (22 % de la lame)
  // vers l'extérieur et avance de ≈ 6 u sur le bord de la lame, qui plonge dessous
  const exterieur = 'M272,128 C290,133 303,149 300.5,166 C298.8,178 292,186 284.4,192';
  const interieur = 'C277,186 262.5,180 255.6,170 C250.6,162 251.6,147 258.6,138.4 C262.6,133.4 267.4,130 272,128';
  c = c.slice(0, debut) + `<g><path d="${exterieur} ${interieur} Z" style="fill:var(--ez-inflammation)"/><path d="${exterieur}" style="stroke:var(--ez-trait);stroke-width:var(--ez-ep-normal)"/><path d="M284.4,192 ${interieur}" style="stroke:var(--ez-trait);stroke-width:var(--ez-ep-fin);stroke-opacity:0.7"/></g>` + c.slice(fin);
  return { ...f, corps: c };
}

export const FORMES_DERIVEES: Record<string, FormeEcranZen> = {
  'hallux-dorsal-incarne-sites': halluxIncarneSites(),
};
