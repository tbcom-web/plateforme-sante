/* COPIE conforme du studio ÉcranZen (TBCOM CLAUDE/ecranzen/studio/html, 2026-10-05), reprise autorisée par Paul : ne pas modifier ici, recopier depuis ÉcranZen. Voir docs/moteur-contenus.md (§ Reels). */
// VISUEL « capteurs » — capteurs qui pulsent (yeux, oreille interne, pieds) et signaux qui remontent vers le cerveau
// (« La posturologie », scène 3). Déterministe : la position des signaux est calculée depuis tau (plus d'animateMotion).
(function (racine) {
  'use strict';
  const EZR = racine.EZR;
  EZR.visuels.capteurs = {
    titre: 'Capteurs qui pulsent et signaux vers le cerveau',
    parametres: {
      sources: { defaut: ['yeux', 'oreille', 'pieds'], aide: 'capteurs affichés : "yeux", "oreille", "pieds" (étiquettes : format site)' },
      signaux: { defaut: true, aide: 'points lumineux qui remontent des pieds vers la tête' },
      cerveau: { defaut: true, aide: 'forme du cerveau qui s\'illumine doucement' },
      periode: { defaut: 2.4, aide: 's : trajet d\'un signal des pieds à la tête' },
    },
    mots: () => 0,
    verifier(p) { return (p.sources || []).filter((s) => !['yeux', 'oreille', 'pieds'].includes(s)).map((s) => `source « ${s} » inconnue`); },
    construire(boite, p, ctx) {
      const O = EZR.outils, { el } = O;
      const svg = O.svg(boite, '0 0 330 540');
      const F = EZR.figure(el('g', {}, svg));
      const P = F.poser(EZR.inclinaison('neutre'));
      const H = P.H;
      const I = { p };
      if (p.cerveau) I.cerveau = el('path', { class: 'v-cerveau', d: `M${H[0] - 14} ${H[1] - 6} C${H[0] - 16} ${H[1] - 20} ${H[0] + 16} ${H[1] - 20} ${H[0] + 14} ${H[1] - 6} C${H[0] + 10} ${H[1] + 2} ${H[0] - 10} ${H[1] + 2} ${H[0] - 14} ${H[1] - 6} Z` }, svg);
      const spots = [];
      if (p.sources.includes('yeux')) spots.push(['Yeux', [H[0] + 10, H[1] + 2], [H[0] + 22, H[1] - 12]]);
      if (p.sources.includes('oreille')) spots.push(['Oreille interne', [H[0] - 24, H[1] + 4], [H[0] - 142, H[1] + 9]]);
      if (p.sources.includes('pieds')) { spots.push(['Pieds', [128, 494], [150, 530]]); spots.push(['', [192, 494], null]); }
      I.capteurs = spots.map(([lab, pt, pl], k) => { const c = el('circle', { class: 'v-capteur', cx: pt[0], cy: pt[1], r: 16 }, svg); if (lab && pl) O.etiquette(ctx, svg, { x: pl[0], y: pl[1] }, lab); return { c, k }; });
      I.routes = p.signaux && p.sources.includes('pieds') ? [
        [[128, 494], P.gG, P.hG, P.C, P.T, H], [[192, 494], P.gD, P.hD, P.C, P.T, H],
      ] : [];
      I.signaux = I.routes.flatMap((r, j) => [0, 1, 2].map((k) => ({ r, debut: j * 0.4 + k * 0.8, c: el('circle', { class: 'v-signal v-lueur', r: 4 }, svg) })));
      return I;
    },
    rendre(I, tau) {
      const O = EZR.outils, p = I.p;
      I.capteurs.forEach(({ c, k }) => {
        const ph = O.phase(tau, 2, k * 0.3), e = O.outCubic(ph);
        O.set(c, { r: 16 * (0.4 + 1.4 * e), opacity: (0.9 * (1 - e) * O.clamp(tau / 0.4 + 1)).toFixed(3) });
      });
      for (const s of I.signaux) {
        if (tau < s.debut) { s.c.setAttribute('opacity', 0); continue; }
        const u = O.phase(tau, p.periode, s.debut), pt = O.surChemin(s.r, u);
        O.set(s.c, { cx: pt[0], cy: pt[1], opacity: Math.min(1, u * 8, (1 - u) * 8).toFixed(3) });
      }
      if (I.cerveau) I.cerveau.style.fill = `color-mix(in srgb, var(--accent) ${(18 + 27 * (0.5 - 0.5 * Math.cos((2 * Math.PI * tau) / 2))).toFixed(1)}%, transparent)`;
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
