/* COPIE conforme du studio ÉcranZen (TBCOM CLAUDE/ecranzen/studio/html, 2026-10-05), reprise autorisée par Paul : ne pas modifier ici, recopier depuis ÉcranZen. Voir docs/moteur-contenus.md (§ Reels). */
// OUTILS COMMUNS DES VISUELS DE REEL — html/reels/visuels/_commun.js (chargé AVANT les visuels).
// Un visuel = EZR.visuels['<nom>'] = {
//   titre, parametres: { nom: { defaut, aide } },       (documentation + valeurs par défaut ; un paramètre inconnu est refusé)
//   verifier(p, { format }) → [messages]                  (garde-fous propres au visuel ; facultatif)
//   mots(p) → n                                          (mots affichés par le visuel, pour la limite de 12 ; facultatif)
//   construire(boite, p, ctx) → inst                     (UNE fois : crée le SVG/canvas dans boite = { div, l, h })
//   rendre(inst, tau, ctx)                               (à chaque image : ne fait que poser des attributs calculés depuis tau,
// }                                                        temps local de la scène en secondes, NÉGATIF pendant le scan d'entrée)
// ctx = { format: 'salle'|'site', duree (s), palette (couleurs lues), site: bool }. Aucune horloge, aucune animation CSS.
// Les petits textes (étiquettes) ne s'affichent qu'en format « site » (en salle d'attente : ≥ 72 px ou rien).
(function (racine) {
  'use strict';
  const EZR = (racine.EZR = racine.EZR || {});
  EZR.visuels = EZR.visuels || {};
  const NS = 'http://www.w3.org/2000/svg';
  const r3 = (v) => Math.round(v * 1000) / 1000;
  const O = (EZR.outils = {
    el(tag, attrs = {}, parent = null) {
      const e = document.createElementNS(NS, tag);
      for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, typeof v === 'number' ? r3(v) : v);
      if (parent) parent.appendChild(e);
      return e;
    },
    set(e, attrs) { for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, typeof v === 'number' ? r3(v) : v); },
    svg(boite, vb) { return O.el('svg', { viewBox: vb, preserveAspectRatio: 'xMidYMid meet' }, boite.div); },
    clamp: (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)),
    lerp: (a, b, u) => a + (b - a) * u,
    // courbes (cubic in/out de Paul, quintique de la carte, outBack, outCubic)
    ease: (u) => { u = Math.max(0, Math.min(1, u)); return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; },
    inOut5: (u) => { u = Math.max(0, Math.min(1, u)); return u < 0.5 ? 16 * u ** 5 : 1 - (-2 * u + 2) ** 5 / 2; },
    outBack: (u) => { u = Math.max(0, Math.min(1, u)); const c = 1.6; return 1 + (c + 1) * (u - 1) ** 3 + c * (u - 1) ** 2; },
    outCubic: (u) => { u = Math.max(0, Math.min(1, u)); return 1 - (1 - u) ** 3; },
    /** progression 0→1 entre a et a+d secondes, avec courbe */
    prog: (tau, a, d, c = O.ease) => c((tau - a) / d),
    /** onde périodique 0→1→0 (ping) : phase dans [0,1[ */
    phase: (tau, periode, decalage = 0) => ((((tau - decalage) / periode) % 1) + 1) % 1,
    rad: (d) => (d * Math.PI) / 180,
    rot(v, d) { const c = Math.cos(O.rad(d)), s = Math.sin(O.rad(d)); return [v[0] * c - v[1] * s, v[0] * s + v[1] * c]; },
    add: (a, b) => [a[0] + b[0], a[1] + b[1]],
    L(l, a, b) { O.set(l, { x1: a[0], y1: a[1], x2: b[0], y2: b[1] }); },
    C(c, p) { O.set(c, { cx: p[0], cy: p[1] }); },
    /** position sur une polyligne [[x,y],…] à la fraction u (longueur) */
    surChemin(pts, u) {
      const seg = []; let tot = 0;
      for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); tot += d; }
      let x = O.clamp(u) * tot;
      for (let i = 0; i < seg.length; i++) { if (x <= seg[i] || i === seg.length - 1) { const k = seg[i] ? Math.min(1, x / seg[i]) : 0; return [O.lerp(pts[i][0], pts[i + 1][0], k), O.lerp(pts[i][1], pts[i + 1][1], k)]; } x -= seg[i]; }
      return pts[pts.length - 1];
    },
    /** petit texte SVG : seulement en format site (sinon rien) */
    etiquette(ctx, parent, attrs, texte) { if (!ctx.site) return null; const t = O.el('text', { class: 'v-etiquette', ...attrs }, parent); t.textContent = texte; return t; },
  });

  // ------------------------------------------------------------------------------------------------------------------
  // SILHOUETTE « PLAN TECHNIQUE » (traits et ronds) — géométrie de « La posturologie » (Paul), repère 330 × 540.
  // Partagée par silhouette, chaine et capteurs.
  // ------------------------------------------------------------------------------------------------------------------
  // Formes JUSTES de la géométrie commune (visuels/_formes.js, généré par construire-formes.mjs) : jamais redessinées ici.
  //   empreinte(parent, cote, style) : trace d'appui réelle (talon ovale, bande externe, avant-pied, 5 pulpes décroissantes),
  //     centrée sur (0, 0), hauteur ≈ 393 u ; cote 'g' (gros orteil à droite, vue de dessus) ou 'd' (miroir).
  //   piedPlantaire(parent, style, styleOrteils) : pied POD-AT-0002 vu de dessous, centré, hauteur ≈ 397 u.
  //   semelleDessus(parent, zones) : semelle POD-AT-0004 (L/l 2,63), orteils en haut, centrée, hauteur ≈ 422 u.
  const centre = (b) => [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2];
  EZR.empreinte = function (parent, cote = 'g', style = '') {
    const F = EZR.FORMES.empreinte, [cx, cy] = centre(F.boite);
    const g = O.el('g', { transform: cote === 'd' ? 'scale(-1 1)' : '' }, parent);
    const h = O.el('g', { transform: `translate(${-cx} ${-cy}) ${F.xf}` }, g);
    O.el('path', { d: F.plante, style }, h); for (const d of F.pulpes) O.el('path', { d, style }, h); // pulpes arrondies (construire-formes.mjs)
    return g;
  };
  EZR.piedPlantaire = function (parent, style = '', styleOrteils = style) {
    const F = EZR.FORMES.pied, [cx, cy] = centre(F.boite);
    const h = O.el('g', { transform: `translate(${-cx} ${-cy}) ${F.xf}` }, parent);
    const els = [O.el('path', { d: F.plante, style }, h)]; // plante d'abord, puis les orteils arrondis PAR-DESSUS (ils cachent le bord droit)
    els.push(...F.orteilsRonds.map((d) => O.el('path', { d, style: styleOrteils }, h)));
    return { g: h, els, centre: [cx, cy] };
  };
  EZR.semelleDessus = function (parent, style = '', zones = true) {
    const F = EZR.FORMES.semelle, [cx, cy] = centre(F.boite);
    const h = O.el('g', { transform: `translate(${-cx} ${-cy})` }, parent);
    O.el('path', { d: F.contour, style: 'fill:color-mix(in srgb, var(--ligne) 16%, var(--fond))' }, h); // aplats OPAQUES (pas de mélange translucide qui vire au kaki, pièges semelle)
    const z = zones ? {
      talonnette: O.el('path', { d: F.talonnette, style: 'fill:color-mix(in srgb, var(--accent) 60%, var(--fond))' }, h),
      voute: O.el('path', { d: F.voute, style: 'fill:color-mix(in srgb, var(--p3) 75%, var(--ligne))' }, h),
      avant: O.el('path', { d: F.barre, style: 'fill:color-mix(in srgb, var(--accent) 60%, var(--fond))' }, h),
    } : {};
    const contour = O.el('path', { d: F.contour, class: 'v-trait', style }, h);
    return { g: h, zones: z, contour, centre: [cx, cy] };
  };
  const C0 = [160, 262], CHEV_G = [132, 484], CHEV_D = [188, 484];
  const INCLINAISONS = { neutre: { ap: 0, s: 0, as: 0, h: 0 }, legere: { ap: 3, s: -2, as: -3, h: 2 }, marquee: { ap: 7, s: -4, as: -8, h: 6 } };
  EZR.INCLINAISONS = INCLINAISONS;
  EZR.inclinaison = (v) => (typeof v === 'object' && v ? { ...INCLINAISONS.neutre, ...v } : INCLINAISONS[v] || INCLINAISONS.neutre);

  /** construit la figure dans g ; renvoie F avec F.poser(p, { unipodal }) → points */
  EZR.figure = function (g) {
    const { el } = O;
    const F = { g };
    F.os = {};
    F.pieds = { g: el('ellipse', { class: 'v-pied', rx: 20, ry: 7 }, g), d: el('ellipse', { class: 'v-pied', rx: 20, ry: 7 }, g) };
    for (const k of ['cuisseG', 'jambeG', 'cuisseD', 'jambeD', 'bassin', 'colonne', 'epaules', 'cou', 'brasG', 'avbrasG', 'brasD', 'avbrasD']) F.os[k] = el('line', { class: 'v-os' }, g);
    F.tete = el('circle', { class: 'v-tete', r: 26 }, g);
    F.art = {};
    for (const k of ['hancheG', 'hancheD', 'genouG', 'genouD', 'epauleG', 'epauleD', 'coudeG', 'coudeD', 'C', 'T']) F.art[k] = el('circle', { class: 'v-articulation', r: 6 }, g);
    F.poser = function (p, o = {}) {
      const { add, rot, L, C, lerp } = O;
      const u = o.unipodal || 0; // 0 → deux pieds ; 1 → pied gauche levé (appui unipodal stable)
      const Cc = C0;
      const hG = add(Cc, rot([-28, 0], p.ap)), hD = add(Cc, rot([28, 0], p.ap));
      const T = add(Cc, rot([0, -150], p.s));
      const eG = add(T, rot([-52, 0], p.as)), eD = add(T, rot([52, 0], p.as));
      const N = add(T, rot([0, -22], p.s + p.h));
      const H = add(N, rot([0, -26], p.s + p.h));
      const chG = [lerp(CHEV_G[0], 146, u), lerp(CHEV_G[1], 430, u)];
      const gG = [lerp((hG[0] + CHEV_G[0]) / 2 - 3, 112, u), lerp((hG[1] + CHEV_G[1]) / 2, 360, u)];
      const gD = [(hD[0] + CHEV_D[0]) / 2 + 3, (hD[1] + CHEV_D[1]) / 2];
      const cG = add(eG, [-9 - 14 * u, 78 - 8 * u]), cD = add(eD, [9 + 14 * u, 78 - 8 * u]);
      const pG = add(cG, [-4 - 22 * u, 70 - 14 * u]), pD = add(cD, [4 + 22 * u, 70 - 14 * u]);
      const B = F.os;
      L(B.cuisseG, hG, gG); L(B.jambeG, gG, chG); L(B.cuisseD, hD, gD); L(B.jambeD, gD, CHEV_D);
      L(B.bassin, hG, hD); L(B.colonne, Cc, T); L(B.epaules, eG, eD); L(B.cou, T, N);
      L(B.brasG, eG, cG); L(B.avbrasG, cG, pG); L(B.brasD, eD, cD); L(B.avbrasD, cD, pD);
      C(F.tete, H);
      O.set(F.pieds.g, { cx: chG[0] - 4, cy: chG[1] + 10 }); O.set(F.pieds.d, { cx: 192, cy: 494 });
      const J = F.art;
      C(J.hancheG, hG); C(J.hancheD, hD); C(J.genouG, gG); C(J.genouD, gD); C(J.epauleG, eG); C(J.epauleD, eD);
      C(J.coudeG, cG); C(J.coudeD, cD); C(J.C, Cc); C(J.T, T);
      return { C: Cc, T, H, N, hG, hD, gG, gD, eG, eD, chG, chD: CHEV_D, piedG: [chG[0] - 4, chG[1] + 10], piedD: [192, 494] };
    };
    return F;
  };
})(typeof window !== 'undefined' ? window : globalThis);
