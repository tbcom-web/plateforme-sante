// Dessins techniques de la marque, en chaîne SVG : source unique du site (components/dessins/Dessin.astro,
// simple enveloppe) et de l'aperçu de l'admin. Trait anatomique fin, contours en pointillés (relevé de
// podoscope), trame hexagonale de points colorés par la pression. Même géométrie de pied que les animations.
// Couleurs (surchargeables par le parent) : --dessin-trait, --dessin-accent, --dessin-fond ; le reste vient
// de la charte. Les styles sont dans dessins.css (importé une fois par le site et par l'admin).
// Les traits marqués « trace » se dessinent quand le bloc parent apparaît (.pret.vu).
//
// svgAnimationFixe : image fixe et fidèle de chaque animation d'accueil, pour les aperçus (fond transparent,
// l'appelant pose le fond sombre « plan »).
import { CONTOUR, ORTEILS, TRAJET } from './pied';
import { trame, dansPlante, pression, type Appui } from './trame';
import { PRESSION, ARRETS_PRESSION, couleurPression, type NomDessin } from './univers';
import { TRAIT, TRAME, NEUTRES, PLAN, POINTILLE, POLICE_MONO, transparence } from './charte';
import type { Animation } from './packs';

// Échelle d'un pied (repère 92 × 222) dans le dessin (240 × 180).
const E = 0.68;
const piedDroit = (x: number, y: number, e = E) => `translate(${x} ${y}) scale(${e})`;
const piedGauche = (x: number, y: number, e = E) => `translate(${x + 92 * e} ${y}) scale(${-e} ${e})`;
// Sites du test au monofilament (repère du pied).
const SITES: [number, number][] = [[27, 16], [56, 20], [75, 35], [24, 62], [48, 50], [72, 62], [34, 120], [68, 132], [48, 196]];

// Soin : loupe sur l'ongle du gros orteil, reliée au détail agrandi par ses deux tangentes extérieures.
const S = { x: 14, y: 20, e: 0.64 };
const c1 = { x: S.x + (92 - 27) * S.e, y: S.y + 9 * S.e, r: 12 };
const c2 = { x: 170, y: 92, r: 56 };
const TANGENTES = (() => {
  const dx = c2.x - c1.x, dy = c2.y - c1.y, d = Math.hypot(dx, dy);
  const t = Math.atan2(dy, dx), a = Math.acos((c1.r - c2.r) / d);
  return [t + a, t - a].map((n) => [c1.x + c1.r * Math.cos(n), c1.y + c1.r * Math.sin(n), c2.x + c2.r * Math.cos(n), c2.y + c2.r * Math.sin(n)].map((v) => +v.toFixed(1)));
})();

// Sport : chaussure de course de profil (talon à gauche), hauteurs de semelle au talon et à l'avant-pied.
const SOL = 150;
const LACETS = [[118, 82], [129, 88], [140, 94], [151, 99], [162, 104]];

const echapper = (v: string) => v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/** Trame de points d'un pied (un tracé par niveau de pression) */
const traceTrame = (appui: Appui, pas?: number) =>
  `<g class="trame">${trame(appui, pas).map((n) => `<path d="${n.d}" stroke="${n.couleur}" stroke-width="${n.epaisseur}" style="--k:${n.k}"></path>`).join('')}</g>`;

/** Corps de chaque dessin (repère 240 × 180) ; `pied` : id du symbole du pied, `degrade`, `loupe` : ids des définitions */
function corps(nom: NomDessin, pied: string, degrade: string, loupe: string): string {
  const use = (classe: string) => `<use href="#${pied}" class="${classe}"></use>`;
  switch (nom) {
    case 'analyse':
      return `<g><g class="grille">${[40, 80, 120, 160].map((y) => `<line x1="16" x2="200" y1="${y}" y2="${y}"></line>`).join('')}</g>${[piedGauche(52, 12), piedDroit(126, 12)]
        .map((t) => `<g transform="${t}">${use('pointille pointille--leger')}${traceTrame('normal')}</g>`)
        .join('')}<g class="legende"><rect x="218" y="30" width="5" height="116" fill="url(#${degrade})"></rect>${[30, 59, 88, 117, 146]
        .map((y) => `<line class="cote" x1="214" x2="217" y1="${y}" y2="${y}"></line>`)
        .join('')}<text class="mono" x="220.5" y="24" text-anchor="middle">+</text><text class="mono" x="220.5" y="158" text-anchor="middle">−</text></g></g>`;

    case 'appuis':
      return `<g><g class="grille">${[30, 60, 90, 120, 150].map((y) => `<line x1="16" x2="200" y1="${y}" y2="${y}"></line>`).join('')}</g><g transform="${piedDroit(30, 8, 0.74)}">${use('pointille pointille--leger')}${traceTrame('avant')}<circle class="anneau-chaud" cx="32" cy="60" r="14"></circle><circle class="anneau-chaud pulse" cx="32" cy="60" r="14"></circle></g><line class="trace fin" pathLength="1" x1="${30 + 32 * 0.74 + 11}" y1="${8 + 60 * 0.74 - 6}" x2="150" y2="38"></line><text class="mono" x="152" y="40">zone d’appui</text><g class="barres"><text class="mono" x="128" y="122">pic</text><rect class="piste" x="148" y="117" width="56" height="5"></rect><rect class="barre" x="148" y="117" width="49" height="5" fill="var(--d-chaud)"></rect><text class="mono" x="128" y="136">moy.</text><rect class="piste" x="148" y="131" width="56" height="5"></rect><rect class="barre" x="148" y="131" width="25" height="5" fill="var(--d-froid)"></rect></g><g class="legende"><rect x="218" y="30" width="5" height="116" fill="url(#${degrade})"></rect><path class="curseur" d="M213 44 l-6 -3.5 v7 z"></path></g></g>`;

    case 'semelle':
      return `<g><g transform="${piedDroit(40, 12)}">${[1, 0.8, 0.6, 0.42, 0.25]
        .map(
          (e, k) =>
            `<path class="trace niveau" d="${CONTOUR}" pathLength="1" transform="translate(${47 * (1 - e)} ${125 * (1 - e)}) scale(${e})" style="--k:${k};stroke:${['var(--d-trait)', 'var(--d-bas)', 'var(--d-froid)', 'var(--d-doux)', 'var(--d-chaud)'][k]};stroke-width:${TRAIT.normal / e / E}"></path>`,
        )
        .join('')}</g><g class="profil"><path class="trace" pathLength="1" d="M128 150 C150 152 184 152 214 146 L216 138 C196 134 178 126 160 118 C146 112 134 114 130 124 C127 132 127 142 128 150 Z"></path><path class="trace fin" pathLength="1" d="M132 138 C160 140 190 140 214 138"></path><path class="trace fin" pathLength="1" d="M136 128 C150 126 162 128 176 134"></path><line class="cote" x1="128" y1="162" x2="216" y2="162"></line><line class="cote" x1="128" y1="158" x2="128" y2="166"></line><line class="cote" x1="216" y1="158" x2="216" y2="166"></line></g></g>`;

    case 'soin': {
      const rad = (a: number) => (a * Math.PI) / 180;
      return `<g><g transform="${piedGauche(S.x, S.y, S.e)}">${use('trait')}${ORTEILS.map(
        ([cx, cy, rx, ry, r]) => `<rect class="ongle-petit" x="${cx - rx * 0.55}" y="${cy - ry * 0.8}" width="${rx * 1.1}" height="${ry * 0.85}" rx="${rx * 0.45}" transform="rotate(${r} ${cx} ${cy})"></rect>`,
      ).join('')}</g><circle class="trace mire" cx="${c1.x}" cy="${c1.y}" r="${c1.r}" pathLength="1"></circle>${TANGENTES.map(
        ([x1, y1, x2, y2]) => `<line class="trace liaison" pathLength="1" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"></line>`,
      ).join('')}<circle class="fond-loupe" cx="${c2.x}" cy="${c2.y}" r="${c2.r}"></circle><g clip-path="url(#${loupe})" class="zoom"><path class="trace" pathLength="1" d="M136 162 C134 128 136 88 149 68 C157 54 183 54 191 68 C204 88 206 128 204 162"></path><path class="trace ongle" pathLength="1" d="M150 84 C151 72 189 72 190 84 L193 124 C183 131 157 131 147 124 Z"></path><path class="trace fin" pathLength="1" d="M155 121 C163 111 177 111 185 121"></path><path class="trace fin" pathLength="1" d="M152 82 C162 77 178 77 188 82"></path><path class="sillon" d="M143 82 C139 98 139 114 142 132"></path><path class="sillon" d="M197 82 C201 98 201 114 198 132"></path><circle class="anneau-chaud pulse" cx="142" cy="104" r="9"></circle>${(
        [[142, 96, 3.2, 'var(--d-chaud)'], [141.2, 106, 2.8, 'var(--d-haut)'], [142, 116, 2.2, 'var(--d-doux)']] as const
      )
        .map(([x, y, r, c], k) => `<circle class="point" cx="${x}" cy="${y}" r="${r}" fill="${c}" style="--k:${k}"></circle>`)
        .join('')}</g><circle class="trace loupe" cx="${c2.x}" cy="${c2.y}" r="${c2.r}" pathLength="1"></circle>${[0, 90, 180, 270]
        .map(
          (a) =>
            `<line class="cote" x1="${c2.x + (c2.r + 3) * Math.cos(rad(a))}" y1="${c2.y + (c2.r + 3) * Math.sin(rad(a))}" x2="${c2.x + (c2.r + 8) * Math.cos(rad(a))}" y2="${c2.y + (c2.r + 8) * Math.sin(rad(a))}"></line>`,
        )
        .join('')}<text class="mono" x="${c2.x + c2.r + 2}" y="${c2.y + c2.r + 10}" text-anchor="end">× 6</text></g>`;
    }

    case 'diabete':
      return `<g><g transform="${piedDroit(56, 10, 0.72)}">${use('pointille')}${SITES.map(
        ([x, y], k) => `<g style="--k:${k}" class="site"><circle class="anneau" cx="${x}" cy="${y}" r="8.5"></circle><circle class="point" cx="${x}" cy="${y}" r="3" fill="var(--d-accent)" style="--k:${k}"></circle></g>`,
      ).join('')}</g><g class="filament"><rect class="trace" pathLength="1" x="176" y="24" width="12" height="62" rx="6"></rect><path class="trace" pathLength="1" d="M182 86 C182 104 178 116 168 126"></path><circle class="point" cx="168" cy="126" r="2.6" fill="var(--d-chaud)" style="--k:10"></circle></g></g>`;

    case 'sport':
      // Courbe de force verticale pendant l'appui (double bosse : impact puis propulsion), sol, semelle
      // crantée (plus épaisse au talon : drop), tige, cotes des hauteurs de semelle, force de réaction du sol.
      return `<g><g class="courbe"><line class="cote" x1="172" y1="44" x2="230" y2="44"></line><line class="cote" x1="172" y1="44" x2="172" y2="10"></line><path class="trace force-courbe" pathLength="1" d="M172 44 C176 44 177 22 181 20 C184 19 185 29 189 29 C195 29 197 12 204 12 C212 12 214 44 222 44"></path><text class="mono" x="174" y="9">F(t)</text></g><line class="sol" x1="12" y1="${SOL}" x2="232" y2="${SOL}"></line><g class="hachures">${Array.from(
        { length: 22 },
        (_, k) => `<line x1="${16 + k * 10}" y1="${SOL + 2}" x2="${10 + k * 10}" y2="${SOL + 8}"></line>`,
      ).join(
        '',
      )}</g><path class="trace semelle" pathLength="1" d="M44 126 C37 129 35 138 36 143 C37 147 41 150 47 150 L150 150 C172 150 196 147 213 138 C218 135 218 131 212 131 C200 132 186 133 172 133 C140 132 90 128 44 126 Z"></path><path class="trace fin" pathLength="1" d="M38 144.5 C40 145 43 145 47 145 L150 145 C171 145 193 142.5 209 135"></path><path class="crampons" d="M49 147.6 L150 147.6 C171 147.6 192 145 208 137"></path><path class="trace fin" pathLength="1" d="M44 136 C80 138 130 140 170 141 C186 141 200 139 210 136"></path><path class="trace" pathLength="1" d="M44 126 C38 112 38 98 44 88 C48 82 55 81 60 85 C66 90 75 91 83 87 C89 83 93 77 99 73 C103 70 108 71 110 75 C123 89 150 102 180 112 C196 117 208 123 212 131"></path><path class="trace fin" pathLength="1" d="M49 121 C46 110 47 99 53 92"></path><path class="trace fin" pathLength="1" d="M180 133 C186 123 200 122 210 127"></path><path class="trace fin" pathLength="1" d="M66 122 C92 116 128 112 166 111"></path><path class="trace fin" pathLength="1" d="M45 89 C41 86 41 81 45 80 C48 79 51 81 52 84"></path>${LACETS.map(
        ([x, y], k) => `<g><circle class="oeillet" cx="${x}" cy="${y}" r="1.5"></circle><line class="lacet" x1="${x + 2.4}" y1="${y - 4.6}" x2="${x - 2.4}" y2="${y + 4.6}" style="--k:${k}"></line></g>`,
      ).join(
        '',
      )}<line class="guide" x1="20" y1="126" x2="44" y2="126"></line><line class="cote" x1="24" y1="126" x2="24" y2="${SOL}"></line><line class="cote" x1="21" y1="126" x2="27" y2="126"></line><text class="mono" x="20" y="141" text-anchor="end">32</text><line class="guide" x1="172" y1="133" x2="230" y2="133"></line><line class="cote" x1="226" y1="133" x2="226" y2="${SOL}"></line><line class="cote" x1="223" y1="133" x2="229" y2="133"></line><text class="mono" x="231" y="145">24</text><text class="mono mono--accent" x="124" y="172" text-anchor="middle">drop 8 mm</text><line class="trace force" pathLength="1" x1="62" y1="${SOL}" x2="55" y2="104"></line><path class="force-fleche" d="M51.2 112.8 L55 103.2 L60.6 111.8"></path><circle class="point" cx="62" cy="${SOL}" r="3" fill="var(--d-chaud)" style="--k:2"></circle><text class="mono mono--chaud" x="62" y="112">FRS</text></g>`;

    case 'enfant':
      return `<g><g transform="${piedDroit(48, 12, 0.7)}">${use('pointille')}</g><g transform="${piedDroit(132, 70, 0.4)} rotate(6 46 111)">${use('pointille pointille--leger')}${traceTrame('enfant', 9)}</g><g class="toise"><line class="trace" pathLength="1" x1="206" y1="20" x2="206" y2="166"></line>${[0, 1, 2, 3, 4, 5, 6, 7]
        .map((k) => `<line class="cote" x1="200" x2="${k % 2 ? 206 : 212}" y1="${28 + k * 18}" y2="${28 + k * 18}"></line>`)
        .join('')}</g></g>`;

    case 'equilibre':
      return `<g><path class="trace polygone" pathLength="1" d="M70 20 L176 20 L184 168 L62 168 Z"></path><g transform="${piedGauche(64, 16, 0.64)}">${use('trait')}</g><g transform="${piedDroit(124, 16, 0.64)}">${use('trait')}</g><path class="trace oscillation" pathLength="1" d="M120 96 C130 88 134 104 124 108 C112 112 108 92 118 88 C128 84 132 100 122 104"></path><circle class="point" cx="121" cy="98" r="4" fill="var(--d-chaud)" style="--k:2"></circle></g>`;

    case 'talon': {
      const cx = 74 + 47 * 0.72, cy = 8 + 192 * 0.72;
      return `<g><g transform="${piedDroit(74, 8, 0.72)}">${use('trait')}</g>${[14, 24, 34]
        .map((r, k) => `<circle class="trace onde" cx="${cx}" cy="${cy}" r="${r}" pathLength="1" style="--k:${k}"></circle>`)
        .join('')}<circle class="point" cx="${cx}" cy="${cy}" r="5" fill="var(--d-chaud)" style="--k:3"></circle></g>`;
    }
  }
  return '';
}

/**
 * Dessin technique complet (<svg>…</svg>), décoratif (aria-hidden). `id` préfixe les identifiants internes
 * (symbole du pied, dégradé, découpe) : il doit être unique dans la page. Par défaut, déterministe
 * (`d-${nom}`) pour que le rendu serveur et le rendu navigateur de l'admin coïncident.
 */
export function svgDessin(nom: NomDessin, opts: { id?: string; classe?: string } = {}): string {
  const id = opts.id ?? `d-${nom}`;
  const pied = `${id}-pied`, degrade = `${id}-degrade`, loupe = `${id}-loupe`;
  const classes = ['dessin', `dessin--${nom}`, opts.classe].filter(Boolean).join(' ');
  const defs =
    `<defs><symbol id="${pied}" viewBox="0 0 92 222" width="92" height="222" overflow="visible"><path d="${CONTOUR}"></path>` +
    ORTEILS.map(([cx, cy, rx, ry, r]) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" transform="rotate(${r} ${cx} ${cy})"></ellipse>`).join('') +
    `</symbol><linearGradient id="${degrade}" x1="0" y1="1" x2="0" y2="0">` +
    PRESSION.map((c, k) => `<stop offset="${ARRETS_PRESSION[k]}" stop-color="${c}"></stop>`).join('') +
    `</linearGradient><clipPath id="${loupe}"><circle cx="${c2.x}" cy="${c2.y}" r="${c2.r - 1}"></circle></clipPath></defs>`;
  return `<svg class="${echapper(classes)}" viewBox="0 0 240 180" aria-hidden="true" fill="none" stroke-linecap="round" stroke-linejoin="round">${defs}${corps(nom, pied, degrade, loupe)}</svg>`;
}

// ———————————————————————————————————————————————————— Images fixes des animations d'accueil

const F = 'viewBox="0 0 400 300" aria-hidden="true" preserveAspectRatio="xMidYMid meet" fill="none" stroke-linecap="round" stroke-linejoin="round"';
/** Couleur d'accent des animations sur fond sombre (même cascade que les composants du site) */
const ACCENT = `var(--accent-pale, var(--signal, ${PLAN.signal}))`;
const r1 = (v: number) => +v.toFixed(1);

/** Podoscope : deux empreintes en trame de points, pression à l'instant où le pied gauche est sur le talon */
function podoscopeFixe(): string {
  const L = 92, H = 222;
  const hauteur = 222, k = 1, largeur = L * k; // repère 400 × 300, pied à l'échelle 1 : ~74 % de la hauteur
  const pasPx = TRAME.pas * k;
  const { min, max } = TRAME.diametre;
  const zone = (y: number) => (y > 150 ? 0 : y > 38 ? 1 : 2);
  const points: string[] = [];
  for (const gauche of [true, false]) {
    const ox = 200 + (gauche ? -largeur * 1.2 : largeur * 0.2);
    const oy = (300 - hauteur) / 2 + (gauche ? hauteur * 0.04 : -hauteur * 0.04);
    // Phase du pas (voir Podoscope.astro) : gauche au talon, droit sur les orteils
    const centre = gauche ? 0 : 2;
    for (let rang = 0, y = 3; y <= H - 1; rang++, y += TRAME.pas * 0.866) {
      for (let x = 6 + (rang % 2 ? TRAME.pas / 2 : 0); x <= L - 4; x += TRAME.pas) {
        if (!dansPlante(x, y)) continue;
        const b = pression('normal', x, y);
        if (b <= 0) continue;
        const z = zone(y);
        const base = [0.55, 0.62, 0.38][z];
        const bonus = z === centre ? 0.45 : z === (centre + 2) % 3 ? 0.1 : 0;
        const v = Math.min(1, (base + bonus) * (0.55 + 0.45 * b));
        const px = ox + (gauche ? L - x : x) * k, py = oy + y * k;
        const rayon = (pasPx * (min + (max - min) * v)) / 2;
        points.push(`<circle cx="${r1(px)}" cy="${r1(py)}" r="${+rayon.toFixed(2)}" fill="${couleurPression(v)}" fill-opacity="${+(0.35 + 0.65 * v).toFixed(2)}"></circle>`);
      }
    }
  }
  return points.join('');
}

/** Coureur : squelette de profil en appui (même cinématique que Coureur.astro), marqueurs et lectures */
function coureurFixe(): string {
  const RAD = Math.PI / 180;
  const hanche = (p: number) => 15 + 30 * Math.sin(2 * Math.PI * p);
  const genou = (p: number) => 25 + 45 * (1 + Math.cos(2 * Math.PI * p));
  const cheville = (p: number) => 8 * Math.sin(2 * Math.PI * (p + 0.15));
  type Pt = { x: number; y: number };
  const jambe = (h: Pt, p: number, l: number) => {
    const a = hanche(p) * RAD;
    const g = { x: h.x + Math.sin(a) * l * 0.48, y: h.y + Math.cos(a) * l * 0.48 };
    const b = a - genou(p) * RAD;
    const c = { x: g.x + Math.sin(b) * l * 0.47, y: g.y + Math.cos(b) * l * 0.47 };
    const f = b + cheville(p) * RAD;
    const o = { x: c.x + Math.cos(f) * l * 0.17, y: c.y - Math.sin(f) * l * 0.17 };
    return { g, c, o, angleGenou: genou(p) };
  };
  const bras = (e: Pt, p: number, l: number) => {
    const a = -hanche(p) * 0.85 * RAD + 10 * RAD;
    const coude = { x: e.x + Math.sin(a) * l * 0.3, y: e.y + Math.cos(a) * l * 0.3 };
    const b = a + 95 * RAD;
    return { coude, main: { x: coude.x + Math.sin(b) * l * 0.27, y: coude.y + Math.cos(b) * l * 0.27 } };
  };
  const l = 400, h = 300, p = 0.32;
  const L = Math.min(h * 0.62, l * 0.9) * 0.5;
  const sol = h * 0.86;
  const bassin = { x: l * 0.5, y: sol - L * 0.97 - 5 * Math.cos(4 * Math.PI * p) * (L / 120) };
  const tronc = 8 * RAD;
  const epaule = { x: bassin.x + Math.sin(tronc) * L * 0.62, y: bassin.y - Math.cos(tronc) * L * 0.62 };
  const tete = { x: epaule.x + Math.sin(tronc) * L * 0.2, y: epaule.y - L * 0.2 };
  const d = jambe(bassin, p, L), g = jambe(bassin, (p + 0.5) % 1, L);
  const bd = bras(epaule, (p + 0.5) % 1, L), bg = bras(epaule, p, L);
  const COULEURS = { cheville: PRESSION[2], genou: PRESSION[4], orteil: PRESSION[1] };
  const trait = (a: number) => transparence(NEUTRES.blanc, a);
  const seg = (a: Pt, b: Pt, w: number, c: string) => `<line x1="${r1(a.x)}" y1="${r1(a.y)}" x2="${r1(b.x)}" y2="${r1(b.y)}" stroke="${c}" stroke-width="${w}"></line>`;
  const marq = (m: Pt, r: number, c: string = NEUTRES.blanc) => `<circle cx="${r1(m.x)}" cy="${r1(m.y)}" r="${r}" fill="${c}"></circle>`;
  const pale = trait(0.33);
  const [arriere, avant] = [+(TRAIT.marque * 0.85).toFixed(2), TRAIT.marque];
  // Grille du laboratoire et sol du tapis en pointillés ronds
  const pas = Math.max(24, L / 4);
  const grille: string[] = [];
  for (let x = (l / 2) % pas; x < l; x += pas) grille.push(`<line x1="${r1(x)}" y1="0" x2="${r1(x)}" y2="${h}"></line>`);
  for (let y = sol % pas; y < h; y += pas) grille.push(`<line x1="0" y1="${r1(y)}" x2="${l}" y2="${r1(y)}"></line>`);
  // Traces des marqueurs : quelques positions précédentes, décalées vers l'arrière comme sur un tapis
  const traces = (['cheville', 'genou', 'orteil'] as const).map((cle) => {
    const pts = Array.from({ length: 14 }, (_, i) => {
      const q = (p - (13 - i) * 0.035 + 1) % 1;
      const j = jambe(bassin, q, L);
      const m = cle === 'cheville' ? j.c : cle === 'genou' ? j.g : j.o;
      return `${r1(m.x - (13 - i) * L * 0.05)} ${r1(m.y)}`;
    });
    return `<path d="M${pts.join(' L')}" stroke="${COULEURS[cle]}" stroke-width="${TRAIT.normal}" opacity="0.5"></path>`;
  });
  const a1 = Math.atan2(bassin.y - d.g.y, bassin.x - d.g.x), a2 = Math.atan2(d.c.y - d.g.y, d.c.x - d.g.x);
  let ecart = a2 - a1;
  if (ecart > Math.PI) ecart -= 2 * Math.PI;
  if (ecart < -Math.PI) ecart += 2 * Math.PI;
  const ra = L * 0.12;
  const arc = `<path d="M${r1(d.g.x + ra * Math.cos(a1))} ${r1(d.g.y + ra * Math.sin(a1))} A${r1(ra)} ${r1(ra)} 0 0 ${ecart < 0 ? 0 : 1} ${r1(d.g.x + ra * Math.cos(a1 + ecart))} ${r1(d.g.y + ra * Math.sin(a1 + ecart))}" stroke="${COULEURS.genou}" stroke-width="${TRAIT.normal}"></path>`;
  const police = Math.max(11, L / 11);
  const mono = `font-family="${echapper(POLICE_MONO)}"`;
  return (
    `<g stroke="${trait(0.06)}" stroke-width="${TRAIT.fin}">${grille.join('')}</g>` +
    `<line x1="0" y1="${r1(sol + 2)}" x2="${l}" y2="${r1(sol + 2)}" stroke="${trait(0.35)}" stroke-width="${TRAIT.fort}" stroke-dasharray="0 ${POINTILLE.contour.ecart * 2.5}"></line>` +
    traces.join('') +
    seg(epaule, bg.coude, arriere, pale) + seg(bg.coude, bg.main, arriere, pale) +
    seg(bassin, g.g, arriere, pale) + seg(g.g, g.c, arriere, pale) + seg(g.c, g.o, arriere, pale) +
    seg(bassin, epaule, avant, ACCENT) + seg(bassin, d.g, avant, ACCENT) + seg(d.g, d.c, avant, ACCENT) + seg(d.c, d.o, avant, ACCENT) +
    seg(epaule, bd.coude, avant, ACCENT) + seg(bd.coude, bd.main, avant, ACCENT) +
    `<circle cx="${r1(tete.x)}" cy="${r1(tete.y)}" r="${r1(L * 0.085)}" stroke="${ACCENT}" stroke-width="${arriere}"></circle>` +
    [g.g, g.c, g.o, bg.coude].map((m) => marq(m, 3, pale)).join('') +
    marq(bassin, 4.5) + marq(epaule, 4.5) +
    marq(d.g, 4.5, COULEURS.genou) + marq(d.c, 4.5, COULEURS.cheville) + marq(d.o, 4, COULEURS.orteil) + marq(bd.coude, 4) +
    arc +
    `<text x="${r1(d.g.x + L * 0.16)}" y="${r1(d.g.y + 4)}" fill="${COULEURS.genou}" font-weight="600" font-size="${r1(police)}" ${mono}>${Math.round(180 - d.angleGenou)}°</text>` +
    `<g fill="${NEUTRES.papier}" opacity="0.75" font-size="${r1(police * 0.85)}" ${mono}><text x="${l * 0.06}" y="${h * 0.1}" font-weight="600">ANALYSE DE LA FOULÉE</text><text x="${l * 0.06}" y="${r1(h * 0.1 + police * 1.4)}">Cadence ${Math.round(120 / 0.72)} pas/min</text></g>`
  );
}

/** Pieds gauche et droit des animations en 400 × 300 */
const PIEDS = [
  { transform: 'translate(178 40) scale(-1 1)' },
  { transform: 'translate(222 40)' },
];

/** Trajectoire : contours en pointillés, trajet du centre de pression tracé, zones d'appui allumées */
function trajectoireFixe(): string {
  const contour = `stroke="${ACCENT}" stroke-width="${POINTILLE.contour.point}" stroke-dasharray="0 ${POINTILLE.contour.ecart}" opacity="${POINTILLE.contour.opacite}"`;
  const appuis: [number, number, number, string, number][] = [[47, 196, 17, PRESSION[4], 0.3], [62, 135, 12, PRESSION[3], 0.3], [36, 62, 16, PRESSION[4], 0.3], [27, 17, 9, PRESSION[3], 0.3]];
  return PIEDS.map(
    (p) =>
      `<g transform="${p.transform}"><path d="${CONTOUR}" ${contour}></path>` +
      ORTEILS.map(([cx, cy, rx, ry, r]) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" transform="rotate(${r} ${cx} ${cy})" ${contour}></ellipse>`).join('') +
      appuis.map(([cx, cy, r, c, o]) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${c}" opacity="${o}"></circle>`).join('') +
      `<path d="${TRAJET}" stroke="${PRESSION[2]}" stroke-width="${TRAIT.marque}"></path><circle cx="27" cy="18" r="5" fill="${NEUTRES.blanc}"></circle></g>`,
  ).join('');
}

/** Premiers pas : petites empreintes aux cinq couleurs de la palette, le long d'un chemin */
function premiersPasFixe(): string {
  return Array.from({ length: 7 }, (_, i) => {
    const t = i / 6;
    const x = 70 + t * 250;
    const y = 262 - t * 210 - Math.sin(t * Math.PI) * 26;
    const angle = (Math.atan2(250, 210 + Math.cos(t * Math.PI) * 26 * Math.PI) * 180) / Math.PI;
    const gauche = i % 2 === 0;
    const dx = gauche ? -22 : 22;
    const px = x + dx * Math.cos((angle * Math.PI) / 180), py = y + dx * Math.sin((angle * Math.PI) / 180);
    return `<g transform="translate(${px.toFixed(1)} ${py.toFixed(1)}) rotate(${angle.toFixed(1)}) scale(${gauche ? -1.8 : 1.8} 1.8)"><g fill="${PRESSION[i % PRESSION.length]}"><ellipse cx="0" cy="-3" rx="7.5" ry="9"></ellipse><ellipse cx="0.8" cy="10" rx="5.2" ry="6.2"></ellipse><circle cx="-4.6" cy="-15" r="2.6"></circle><circle cx="-0.6" cy="-16.6" r="2"></circle><circle cx="2.8" cy="-15.6" r="1.8"></circle><circle cx="5.6" cy="-13.4" r="1.6"></circle><circle cx="7.6" cy="-10.6" r="1.4"></circle></g></g>`;
  }).join('');
}

/** Semelle : deux semelles en courbes de niveau aux couleurs de la palette */
function semelleFixe(): string {
  const niveaux = [1, 0.82, 0.64, 0.47, 0.3];
  return [
    { transform: 'translate(176 36) scale(-1 1)' },
    { transform: 'translate(224 36)' },
  ]
    .map(
      (p) =>
        `<g transform="${p.transform}">` +
        niveaux.map((e, k) => `<path d="${CONTOUR}" transform="translate(${47 * (1 - e)} ${125 * (1 - e)}) scale(${e})" stroke="${PRESSION[k]}" stroke-width="${TRAIT.fort / e}"></path>`).join('') +
        `</g>`,
    )
    .join('');
}

/**
 * Image fixe d'une animation d'accueil (<svg>…</svg>, repère 400 × 300), fidèle à l'animation du site :
 * même géométrie de pied, même trame, même palette. Fond transparent : l'appelant pose le fond sombre.
 */
export function svgAnimationFixe(animation: Animation, opts: { id?: string } = {}): string {
  const id = opts.id ?? `a-${animation}`;
  const contenu =
    animation === 'podoscope' ? podoscopeFixe()
    : animation === 'coureur' ? coureurFixe()
    : animation === 'trajectoire' ? trajectoireFixe()
    : animation === 'premiers-pas' ? premiersPasFixe()
    : semelleFixe();
  return `<svg id="${echapper(id)}" class="animation-fixe animation-fixe--${animation}" ${F}>${contenu}</svg>`;
}
