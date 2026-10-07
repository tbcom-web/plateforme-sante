// Formes DÉRIVÉES côté sites, à partir des formes ÉcranZen (formes.ts, généré, intouché). Le studio ÉcranZen et ses atomes ne sont pas
// modifiés : chaque dérivée est une retouche documentée, validée par Paul, déclarée au catalogue comme déclinaison propre aux sites.
import { FORMES, type FormeEcranZen } from './formes';
import { FORMES_HALLUX_GROS_PLAN } from './hallux-gros-plan';
import { FORMES_SOINS_ONGLES } from './soins-ongles';

/** Remplace un fragment exact du corps (erreur si le fragment a changé dans formes.ts : la retouche est à revoir) */
function remplacer(corps: string, avant: string, apres: string): string {
  if (!corps.includes(avant)) throw new Error(`bibliothèque : fragment introuvable pour une forme dérivée (${avant.slice(0, 40)}…)`);
  return corps.replace(avant, apres);
}

/**
 * Étapes communes aux dérivées de l'hallux incarné : la lame et son coin d'un seul contour (arc continu qui plonge sous le repli, sans
 * cran) et l'ancien spicule triangulaire supprimé (lu « ongle cassé » par Paul le 2026-10-07).
 */
function lameSansCran(corps: string): string {
  let c = corps;
  // 1. Lame + spicule d'un seul contour : le bord latéral (coin coupé à cran) devient un arc continu qui prolonge la courbure de la lame,
  //    s'avance sous le repli (bout arrondi en x ≈ 265, sous le repli) puis revient au bord de la lame
  const avant = 'C244,122.7 248.7,130.7 246,146 L249,156 L256,162 L256,193';
  const apres = 'C244,122.7 250,127 254,134 C257.5,140 262,145.5 264.6,150 C266.2,153.6 262.4,160 258.6,165.6 C256.8,168.4 256,171.4 256,175 L256,193';
  if (!c.includes(avant)) throw new Error('bibliothèque : bord latéral de la lame introuvable (forme dérivée)');
  c = c.split(avant).join(apres);
  // 2. Ancien spicule (triangle peint au-dessus du repli) supprimé
  c = remplacer(c, '<g><path d="M249,156 C249,156 250.5,149.4 253,147 C255.5,144.6 268,138 268,138 C268,138 261.5,147.7 260,151 C258.5,154.3 256.5,163 256.5,163 L249,156 Z" style="fill:var(--ez-ongle);stroke:var(--ez-trait);stroke-width:var(--ez-ep-fin)"/></g>', '');
  return c;
}

/**
 * `hallux-dorsal-incarne-sites` : dérivé de POD-AT-0009 (état incarné), retouche du spicule validée par Paul le 2026-10-05 (contre-revue
 * de l'illustrateur médical, N8). Le spicule n'est plus un triangle pointu détaché de la lame par un cran et peint par-dessus le repli
 * (lu « écharde ») : il PROLONGE l'arc latéral de la lame (même tracé, même trait, un seul contour avec la lame), bout arrondi, et son
 * bout est RECOUVERT par le repli latéral épaissi, peint après la lame (contour du repli continu). Lecture patient à 240 px (revue de
 * la session principale) : repli ALLONGÉ (boudin) le long du bord latéral, du coin distal à la mi-longueur de la lame, posé sur le
 * bord de la lame qui plonge dessous, teinte localisée un peu plus sombre que la peau ; jamais une forme ronde (« bouton »).
 */
function halluxIncarneSites(): FormeEcranZen {
  const f = FORMES['hallux-dorsal-incarne'];
  let c = lameSansCran(f.corps);
  // 3. Repli latéral épaissi et enflammé, lisible à 240 px (lecture patient) : bord externe bombé de ≈ 22 % de la largeur de la lame sur
  //    la moitié distale, bord interne avancé SUR la lame (le bord latéral de la lame plonge visiblement sous le repli), teinte
  //    localisée un peu plus sombre que la peau (jeton « inflammation » : jamais un disque rouge vif ; accent léger en monochrome).
  const debut = c.indexOf('<g><path d="M269.8,128');
  const fin = c.indexOf('</g>', debut) + 4;
  if (debut < 0) throw new Error('bibliothèque : repli latéral introuvable (forme dérivée)');
  // Repli ALLONGÉ le long du bord latéral de la lame (pas de forme ronde : lue « bouton ») : boudin qui suit le contour de l'orteil, du
  // coin distal (y ≈ 124) jusqu'au-delà de la mi-longueur de la lame (y ≈ 194), plus épais au tiers distal, effilé aux deux bouts ;
  // le bord externe déborde un peu le contour de l'orteil (gonflement), le bord interne avance sur la lame, qui plonge dessous.
  const xOrteil = (y: number) => (y >= 166 ? 283 + (y - 166) * 0.03 : 217 + Math.sqrt(Math.max(0, 66 ** 2 - (166 - y) ** 2)));
  const epais = (y: number) => Math.max(0, Math.sin((Math.PI * (y - 124)) / 70)) ** 0.8 * (y < 150 ? 1 : 1 - 0.45 * ((y - 150) / 44));
  const ys = Array.from({ length: 15 }, (_, k) => 124 + k * 5);
  const ext = ys.map((y) => [xOrteil(y) + 5.5 * epais(y), y] as [number, number]);
  // Bord interne : sur la lame au milieu (x ≈ 249), rejoint le contour de l'orteil aux deux bouts (effilé, jamais coupé à plat)
  const int = [...ys].reverse().map((y) => { const t = Math.min(1, epais(y) * 2.2); return [xOrteil(y) - (xOrteil(y) - (256 - 7 * epais(y))) * t, y] as [number, number]; });
  const courbe = (pts: [number, number][], debut = true) => {
    const n = pts.length, P = (i: number) => pts[Math.max(0, Math.min(n - 1, i))], r = (v: number) => Math.round(v * 10) / 10;
    let d = debut ? `M${r(pts[0][0])},${r(pts[0][1])}` : '';
    for (let i = 0; i < n - 1; i++) {
      const [p0, p1, p2, p3] = [P(i - 1), P(i), P(i + 1), P(i + 2)];
      d += ` C${r(p1[0] + (p2[0] - p0[0]) / 6)},${r(p1[1] + (p2[1] - p0[1]) / 6)} ${r(p2[0] - (p3[0] - p1[0]) / 6)},${r(p2[1] - (p3[1] - p1[1]) / 6)} ${r(p2[0])},${r(p2[1])}`;
    }
    return d;
  };
  const exterieur = courbe(ext), interieur = courbe([ext[ext.length - 1], ...int, ext[0]], false);
  const debutInt = `M${ext[ext.length - 1].join(',')}`;
  // Retour de Paul du 2026-10-07 (« on dirait qu'il y a un ongle incarné inclus dedans ») : le boudin plein, brun, cerné d'un trait
  // intérieur sur la lame, se lisait comme une SECONDE lame. Le repli gonflé est désormais de la PEAU (même teinte que l'orteil, qui
  // recouvre le bord de la lame), avec une rougeur fondue en dégradé radial, sans trait intérieur : seul le contour extérieur bombé reste.
  const rougeur = `<defs><radialGradient id="EZID-repli" cx="0.55" cy="0.4" r="0.6">${[[0, 0.75], [0.45, 0.45], [0.8, 0.12], [1, 0]].map(([o, a]) => `<stop offset="${o}" style="stop-color:var(--ez-rougeur);stop-opacity:${a}"/>`).join('')}</radialGradient></defs>`;
  c = c.slice(0, debut) + `${rougeur}<g><path d="${exterieur}${interieur} Z" style="fill:var(--ez-peau-ombre)"/><path d="${exterieur}${interieur} Z" fill="url(#EZID-repli)" style="stroke:none"/><path d="${exterieur}" style="stroke:var(--ez-trait);stroke-width:var(--ez-ep-normal)"/></g>` + c.slice(fin);
  void debutInt;
  return { ...f, ids: true, corps: c };
}

/**
 * `hallux-dorsal-incarne-net` : POD-AT-0009 incarné (ÉcranZen) dont la lame n'a plus de cran ni de spicule triangulaire au coin (retour
 * de Paul du 2026-10-07 : « on dirait que l'ongle est cassé... mais bien ») : le bord latéral de la lame plonge d'un seul arc sous le
 * repli épaissi de l'atome, inchangé.
 */
const halluxIncarneNet = (): FormeEcranZen => ({ ...FORMES['hallux-dorsal-incarne'], corps: lameSansCran(FORMES['hallux-dorsal-incarne'].corps) });

/** Déforme les coordonnées « x,y » d'un corps de forme (tous les tracés : ombre, semelle, liserés, bride suivent la même déformation) */
const deformer = (corps: string, f: (x: number, y: number) => [number, number]) =>
  corps.replace(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g, (_, x, y) => f(+x, +y).map((v) => Math.round(v * 10) / 10).join(','));

/**
 * `sandale-tong-sites` : la tong de POD-AT-0006 dont le BOUT est arrondi et droit (retour de Paul du 2026-10-07 : « le haut de la tong
 * est un peu bizarre, normalement il est plus rond / droit ») : le bout de la semelle, coupé en biais comme la ligne des orteils, est
 * ramené vers une demi-ellipse symétrique (axe x ≈ 255) au-dessus de y ≈ 230 ; raccord progressif sur 70 u (rien ne bouge sous y = 230,
 * ni la bride ni le talon). Les points intérieurs (liserés, ombre décalée) suivent la même déformation, au prorata de leur rayon.
 */
function tongSites(): FormeEcranZen {
  const f = FORMES['sandale-tong'];
  const [cx, cy, a, b] = [255.5, 230, 94.5, 186];
  // Rayon (normalisé) du contour actuel de la semelle selon l'angle, mesuré sur le premier tracé (la semelle pleine)
  const pts = [...(f.corps.match(/d="([^"]*)"/)?.[1] ?? '').matchAll(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)].map((m) => [+m[1], +m[2]]);
  const rayon = (t: number) => {
    let best = 1, ecart = Infinity;
    for (const [x, y] of pts) {
      if (y > cy) continue;
      const u = (x - cx) / a, v = (y - cy) / b, d = Math.abs(Math.atan2(v, u) - t);
      if (d < ecart) { ecart = d; best = Math.hypot(u, v); }
    }
    return best;
  };
  return {
    ...f,
    corps: deformer(f.corps, (x, y) => {
      if (y >= cy) return [x, y];
      const u = (x - cx) / a, v = (y - cy) / b, r = Math.hypot(u, v), t = Math.atan2(v, u);
      const rr = r / rayon(t);
      const s = Math.min(1, (cy - y) / 70), w = s * s * (3 - 2 * s);
      const [nx, ny] = [cx + a * rr * Math.cos(t), cy + b * rr * Math.sin(t)];
      return [x + (nx - x) * w, y + (ny - y) * w];
    }),
  };
}

/**
 * `chaussure-sneaker-profil` : TRV-AT-0009 redessinée pour les sites en BASKET DE VILLE (retour de Paul du 2026-10-07 : « elle fait
 * trop vieille, il faut un truc plus dynamique, style basket de ville / sneaker ») : même repère et même vue que l'atome (profil médial,
 * pointe à droite), semelle « cup » blanche épaisse et plate avec sa ligne de couture, tige basse au col rembourré, languette, laçage,
 * renfort de talon et tirette, bout rapporté. Générique, sans marque, bande ni logo. Jetons --ez-* de l'atome (chaussure, neutre-clair).
 */
const SNEAKER: FormeEcranZen = {
  viewBox: [24, 304, 478, 164],
  ids: false,
  corps:
    '<g><path d="M44,416 L468,422 C482,424 489,431 488,440 C487,450 479,456 466,456 L52,456 C40,456 34,449 34,437 C34,426 38,417 44,416 Z" style="fill:var(--ez-neutre-clair);stroke:var(--ez-trait);stroke-width:var(--ez-ep-normal)"/></g>' +
    '<g><path d="M40,443 L484,445" style="stroke:var(--ez-trait);stroke-width:var(--ez-ep-fin);stroke-opacity:0.55;stroke-dasharray:6 6"/></g>' +
    '<g><path d="M44,416 C39,396 41,372 51,357 C57,349 67,347 77,351 C91,357 104,366 121,368 C141,370 160,363 175,351 L185,335 C189,329 199,327 205,331 C227,345 261,361 299,375 C339,389 379,397 419,401 C451,404 473,411 477,422 Z" style="fill:var(--ez-chaussure);stroke:var(--ez-trait);stroke-width:var(--ez-ep-normal)"/></g>' +
    '<g><path d="M52,362 C68,357 92,365 118,372 C140,377 160,372 178,360" style="stroke:var(--ez-trait);stroke-width:var(--ez-ep-fin);stroke-opacity:0.6"/></g>' +
    '<g><path d="M47,384 C66,384 84,392 92,416" style="stroke:var(--ez-trait);stroke-width:var(--ez-ep-fin);stroke-opacity:0.6"/></g>' +
    '<g><path d="M50,357 L46,345 C45,340 52,338 55,342 L60,353" style="fill:var(--ez-chaussure);stroke:var(--ez-trait);stroke-width:var(--ez-ep-fin)"/></g>' +
    '<g><path d="M398,400 C428,401 456,408 474,419" style="stroke:var(--ez-trait);stroke-width:var(--ez-ep-fin);stroke-opacity:0.6"/></g>' +
    '<g><path d="M150,378 C206,394 268,408 338,410" style="stroke:var(--ez-trait);stroke-width:var(--ez-ep-fin);stroke-opacity:0.45"/></g>' +
    '<g><path d="M213,337 L222,348 M233,347 L241,358 M254,356 L261,367 M275,364 L281,375" style="stroke:var(--ez-blanc);stroke-width:var(--ez-ep-normal);stroke-opacity:0.95"/></g>',
};

export const FORMES_DERIVEES: Record<string, FormeEcranZen> = {
  'hallux-dorsal-incarne-sites': halluxIncarneSites(),
  // Retours de Paul du 2026-10-07 : ongle incarné sans cran (« ongle cassé »), tong au bout arrondi, chaussure de ville en basket
  'hallux-dorsal-incarne-net': halluxIncarneNet(),
  'sandale-tong-sites': tongSites(),
  'chaussure-sneaker-profil': SNEAKER,
  // Gros plan de l'hallux, normal et incarné, dessiné de zéro pour les sites (2026-10-05, brouillon) : hallux-gros-plan.ts
  ...FORMES_HALLUX_GROS_PLAN,
  // Fiches de soins de la migration 0020 (2026-10-05, brouillon) : orthonyxie, onychoplastie, mycose, ongle épais, cor, orthoplastie
  ...FORMES_SOINS_ONGLES,
};
