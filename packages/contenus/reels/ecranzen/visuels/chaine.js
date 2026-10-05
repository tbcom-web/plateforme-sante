/* COPIE conforme du studio ÉcranZen (TBCOM CLAUDE/ecranzen/studio/html, 2026-10-05), reprise autorisée par Paul : ne pas modifier ici, recopier depuis ÉcranZen. Voir docs/moteur-contenus.md (§ Reels). */
// VISUEL « chaine » — la silhouette plan technique dont les nœuds s'allument un à un (« La posturologie », scène 2).
(function (racine) {
  'use strict';
  const EZR = racine.EZR;
  const POSITIONS = {
    Pieds: (P) => [160, 494], Chevilles: (P) => [160, 484], Genoux: (P) => [(P.gG[0] + P.gD[0]) / 2, (P.gG[1] + P.gD[1]) / 2], Hanches: (P) => P.hD,
    Bassin: (P) => P.C, Colonne: (P) => [(P.C[0] + P.T[0]) / 2, (P.C[1] + P.T[1]) / 2], 'Épaules': (P) => P.T, 'Tête': (P) => P.H,
  };
  EZR.visuels.chaine = {
    titre: 'Chaîne : nœuds qui s\'allument un à un sur la silhouette',
    parametres: {
      noeuds: { defaut: ['Pieds', 'Genoux', 'Bassin', 'Colonne', 'Épaules', 'Tête'], aide: `dans l'ordre d'allumage ; parmi ${Object.keys(POSITIONS).join(', ')} (étiquettes : format site seulement)` },
      inclinaison: { defaut: 'neutre', aide: 'comme silhouette ("neutre" | "legere" | "marquee")' },
      debut: { defaut: 1.5, aide: 's : premier nœud' },
      pas: { defaut: 0.9, aide: 's entre deux nœuds' },
      oscillation: { defaut: 0.6, aide: 'balancement (degrés)' },
    },
    mots: () => 0,
    verifier(p) { return (p.noeuds || []).filter((n) => !POSITIONS[n]).map((n) => `nœud « ${n} » inconnu (${Object.keys(POSITIONS).join(', ')})`); },
    construire(boite, p, ctx) {
      const O = EZR.outils, { el } = O;
      const svg = O.svg(boite, '0 0 330 540');
      const g = el('g', {}, svg);
      const F = EZR.figure(g);
      const P = F.poser(EZR.inclinaison(p.inclinaison));
      const noeuds = p.noeuds.map((nom) => {
        const pt = POSITIONS[nom](P);
        const gg = el('g', {}, svg);
        const lien = el('line', { class: 'v-lien', x1: pt[0] + 12, y1: pt[1], x2: 250, y2: pt[1] }, gg);
        const base = el('circle', { class: 'v-noeud', cx: pt[0], cy: pt[1], r: 9 }, gg);
        const on = el('circle', { class: 'v-noeud-on v-lueur', cx: pt[0], cy: pt[1], r: 9 }, gg);
        const lab = O.etiquette(ctx, gg, { x: 256, y: pt[1] + 5 }, nom);
        return { lien, base, on, lab };
      });
      return { p, g, noeuds };
    },
    rendre(I, tau) {
      const O = EZR.outils, p = I.p;
      O.set(I.g, { transform: `rotate(${(p.oscillation * Math.sin((2 * Math.PI * tau) / 4)).toFixed(3)} 160 500)` });
      I.noeuds.forEach((n, k) => {
        const u = O.clamp((tau - p.debut - k * p.pas) / 0.4);
        n.on.setAttribute('opacity', u.toFixed(3)); n.lien.setAttribute('opacity', u.toFixed(3));
        if (n.lab) n.lab.setAttribute('opacity', u.toFixed(3));
      });
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
