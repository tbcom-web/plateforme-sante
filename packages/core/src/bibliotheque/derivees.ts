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
 * `hallux-dorsal-incarne-sites` : dérivé de POD-AT-0009 (état incarné), retouche du spicule validée par Paul le 2026-10-05 (contre-revue
 * de l'illustrateur médical, N8). Le spicule n'est plus un triangle pointu détaché de la lame par un cran et peint par-dessus le repli
 * (lu « écharde ») : il PROLONGE l'arc latéral de la lame (même tracé, même trait, un seul contour avec la lame), bout arrondi, et son
 * bout est RECOUVERT par le repli latéral épaissi, peint après la lame (contour du repli continu). Lecture patient à 240 px (revue de
 * la session principale) : repli ALLONGÉ (boudin) le long du bord latéral, du coin distal à la mi-longueur de la lame, posé sur le
 * bord de la lame qui plonge dessous, teinte localisée un peu plus sombre que la peau ; jamais une forme ronde (« bouton »).
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
  c = c.slice(0, debut) + `<g><path d="${exterieur}${interieur} Z" style="fill:var(--ez-inflammation)"/><path d="${exterieur}" style="stroke:var(--ez-trait);stroke-width:var(--ez-ep-normal)"/><path d="${debutInt}${interieur}" style="stroke:var(--ez-trait);stroke-width:var(--ez-ep-fin);stroke-opacity:0.7"/></g>` + c.slice(fin);
  return { ...f, corps: c };
}

export const FORMES_DERIVEES: Record<string, FormeEcranZen> = {
  'hallux-dorsal-incarne-sites': halluxIncarneSites(),
  // Gros plan de l'hallux, normal et incarné, dessiné de zéro pour les sites (2026-10-05, brouillon) : hallux-gros-plan.ts
  ...FORMES_HALLUX_GROS_PLAN,
  // Fiches de soins de la migration 0020 (2026-10-05, brouillon) : orthonyxie, onychoplastie, mycose, ongle épais, cor, orthoplastie
  ...FORMES_SOINS_ONGLES,
};
