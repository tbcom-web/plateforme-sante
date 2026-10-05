/* COPIE conforme du studio ÉcranZen (TBCOM CLAUDE/ecranzen/studio/html, 2026-10-05), reprise autorisée par Paul : ne pas modifier ici, recopier depuis ÉcranZen. Voir docs/moteur-contenus.md (§ Reels). */
// VISUEL « foulee » — reprise vectorielle de « Chaque foulée compte » (Paul) : la semelle de chaussure vue de dessous, la caméra
// s'approche et trois zones s'allument (talon, voûte, avant-pied) ; ou mode « pas » : empreintes qui avancent (la marche).
// La photo de maquette de Paul (sans licence) est remplacée par un dessin au trait : aucun média externe.
(function (racine) {
  'use strict';
  const EZR = racine.EZR;
  // Semelle vue de dessous : contour de la semelle POD-AT-0004 (géométrie commune), ramené dans le cadre 0–200 × 14–436.
  const SOLE_XF = 'translate(-158 -25)';
  const ZONES = { 'avant-pied': [104, 122], voute: [104, 262], talon: [99, 378] };
  let uid = 0;
  const ST = 'fill:color-mix(in srgb, var(--ligne) 22%, transparent);stroke:var(--ligne);stroke-width:5;stroke-linejoin:round';
  EZR.visuels.foulee = {
    titre: 'Foulée : semelle de chaussure et zones, ou empreintes de pas',
    parametres: {
      mode: { defaut: 'zones', aide: '"zones" (semelle vue de dessous, zones qui s\'allument) | "pas" (empreintes qui avancent)' },
      zones: { defaut: ['talon', 'voute', 'avant-pied'], aide: 'ordre d\'allumage : "talon", "voute", "avant-pied" (étiquettes : format site)' },
      debut: { defaut: 1.6, aide: 's : première zone (mode zones) / premier pas' },
      pas: { defaut: 1.0, aide: 's entre deux zones (mode zones) ; cadence d\'un pas (mode pas : 0,6 conseillé)' },
      zoom: { defaut: 1.25, aide: 'approche de la caméra sur la semelle (1 = aucune)' },
    },
    mots: () => 0,
    verifier(p) {
      const m = [];
      if (!['zones', 'pas'].includes(p.mode)) m.push(`mode « ${p.mode} » inconnu (zones, pas)`);
      for (const z of p.zones || []) if (!ZONES[z]) m.push(`zone « ${z} » inconnue (talon, voute, avant-pied)`);
      return m;
    },
    construire(boite, p, ctx) {
      const O = EZR.outils, { el } = O;
      const I = { p };
      if (p.mode === 'pas') {
        // PISTE DE PAS : taille FIXE à l'écran (empreinte ≈ 200 px de long, quelle que soit la boîte), 4 à 6 empreintes visibles
        const LONG = EZR.FORMES.empreinte.boite[3] - EZR.FORMES.empreinte.boite[1], k = Math.max(200, Math.min(300, boite.h / 4)) / LONG; // px par unité : empreinte de 200 à 300 px (≈ 275 px en 9:16)
        I.W = boite.l / k; I.H = boite.h / k; I.LONG = LONG;
        const svg = O.svg(boite, `0 0 ${I.W.toFixed(1)} ${I.H.toFixed(1)}`);
        svg.style.overflow = 'hidden';
        I.monde = el('g', {}, svg);
        // vraies empreintes (trace d'appui, pulpes arrondies) : gauche / droite alternées, sans cercle autour
        I.pool = Array.from({ length: 8 }, () => { const g = el('g', {}, I.monde); return { g, gauche: EZR.empreinte(g, 'g', ST), droite: EZR.empreinte(g, 'd', ST) }; });
        return I;
      }
      const svg = O.svg(boite, '-60 -10 320 460');
      I.cam = el('g', {}, svg);
      const id = `ezr-sole-${++uid}`;
      const SOLE = EZR.FORMES.semelle.contour;
      el('clipPath', { id }, el('defs', {}, svg)).appendChild(O.el('path', { d: SOLE, transform: SOLE_XF }));
      el('path', { class: 'v-aplat', d: SOLE, transform: SOLE_XF }, I.cam);
      const crampons = el('g', { 'clip-path': `url(#${id})` }, I.cam);
      for (let k = -30; k < 30; k++) { el('line', { class: 'v-trait-fin', x1: k * 18, y1: 0, x2: k * 18 + 460, y2: 460, opacity: 0.18 }, crampons); el('line', { class: 'v-trait-fin', x1: k * 18 + 460, y1: 0, x2: k * 18, y2: 460, opacity: 0.18 }, crampons); } // relief en losanges (maille)
      el('path', { class: 'v-trait', d: SOLE, transform: SOLE_XF }, I.cam);
      I.zones = p.zones.map((z, k) => {
        const [x, y] = ZONES[z], g = el('g', {}, I.cam);
        const anneau = el('circle', { cx: x, cy: y, r: 22, style: 'fill:none;stroke:var(--accent);stroke-width:3' }, g);
        el('circle', { cx: x, cy: y, r: 10, style: 'fill:var(--accent)' }, g);
        const lab = O.etiquette(ctx, g, { x: x + 90, y: y + 5 }, { talon: 'Le talon', voute: 'La voûte', 'avant-pied': 'L\'avant-pied' }[z]);
        return { g, anneau, k };
      });
      return I;
    },
    rendre(I, tau) {
      const O = EZR.outils, p = I.p;
      if (p.mode === 'pas') {
        // marche : un pas toutes les « pas » s ; la piste avance vers le haut, la caméra suit (la dernière empreinte reste au tiers haut)
        const L = 0.8 * I.LONG, DX = 0.2 * I.LONG, X0 = I.W / 2, yHaut = 0.3 * I.H;
        const s = (tau - p.debut) / p.pas, n = Math.floor(s); // n = dernier pas posé
        I.pool.forEach((P, k) => {
          const i = n - k;
          if (i < 0 || s < 0) { P.g.setAttribute('opacity', 0); return; }
          const gauche = i % 2 === 0, x = X0 + (gauche ? -DX : DX), y = yHaut + (s - i) * L;
          const o = O.clamp((s - i) * p.pas / 0.25) * (1 - O.clamp((k - 4) / 2)); // apparition au pas, effacement des plus anciennes
          P.g.setAttribute('opacity', o.toFixed(3));
          O.set(P.g, { transform: `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${gauche ? -7 : 7})` });
          P.gauche.setAttribute('display', gauche ? '' : 'none'); P.droite.setAttribute('display', gauche ? 'none' : '');
        });
        return;
      }
      const z = O.lerp(1, p.zoom, O.ease((tau - 0) / 3));
      O.set(I.cam, { transform: `translate(100 225) scale(${z.toFixed(4)}) translate(-100 -225)` });
      I.zones.forEach(({ g, anneau, k }) => {
        const a = p.debut + k * p.pas, o = O.clamp((tau - a) / 0.6);
        g.setAttribute('opacity', o.toFixed(3));
        const ph = O.phase(tau, 1.8, a), e = O.outCubic(ph);
        O.set(anneau, { r: 22 * (0.5 + 1.3 * e), opacity: (1 - e).toFixed(3) });
      });
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
