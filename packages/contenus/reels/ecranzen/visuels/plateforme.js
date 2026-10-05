/* COPIE conforme du studio ÉcranZen (TBCOM CLAUDE/ecranzen/studio/html, 2026-10-05), reprise autorisée par Paul : ne pas modifier ici, recopier depuis ÉcranZen. Voir docs/moteur-contenus.md (§ Reels). */
// VISUEL « plateforme » — plateforme de mesure vue de dessus, empreintes, tracé live du centre de pression en 2 modes
// (« La posturologie », scène 4). Le tracé est RECALCULÉ depuis tau (échantillons à 60 Hz sur la fenêtre des 260 derniers) :
// ezAller(t) donne exactement la même image, quel que soit l'ordre des images.
(function (racine) {
  'use strict';
  const EZR = racine.EZR;
  const MODES = { ouverts: { A: 11, couleur: 'accent', oeil: true }, fermes: { A: 30, couleur: 'signal', oeil: false } };
  EZR.visuels.plateforme = {
    titre: 'Plateforme : empreintes et tracé du centre de pression',
    parametres: {
      trace: { defaut: true, aide: 'tracé live du centre de pression ; false = plateforme SANS données (bilan : on montre qu\'on mesure, pas le résultat)' },
      modes: { defaut: ['ouverts', 'fermes'], aide: 'suite de modes : "ouverts" (petites oscillations, accent) puis "fermes" (plus amples, signal)' },
      bascule: { defaut: 6, aide: 's : passage au mode suivant (le tracé repart de zéro)' },
      icone: { defaut: true, aide: 'œil ouvert / fermé sous la plateforme (indique le mode sans texte) ; en format site : pastille « Yeux ouverts / fermés »' },
    },
    mots: () => 0,
    verifier(p) { return (p.modes || []).filter((m) => !MODES[m]).map((m) => `mode « ${m} » inconnu (ouverts, fermes)`); },
    construire(boite, p, ctx) {
      const O = EZR.outils, { el } = O;
      const svg = O.svg(boite, '0 0 420 350');
      el('rect', { class: 'v-plateau', x: 50, y: 20, width: 320, height: 270, rx: 26 }, svg);
      el('line', { class: 'v-croix', x1: 210, y1: 36, x2: 210, y2: 274 }, svg);
      el('line', { class: 'v-croix', x1: 66, y1: 155, x2: 354, y2: 155 }, svg);
      el('circle', { class: 'v-croix', cx: 210, cy: 155, r: 40 }, svg);
      el('circle', { class: 'v-croix', cx: 210, cy: 155, r: 80 }, svg);
      // empreintes réelles (trace d'appui de la géométrie commune), pieds légèrement écartés, pointes un peu ouvertes
      for (const [x, cote, a] of [[166, 'g', -6], [254, 'd', 6]]) EZR.empreinte(el('g', { transform: `translate(${x} 158) rotate(${a}) scale(0.5)` }, svg), cote, 'fill:color-mix(in srgb, var(--ligne) 16%, transparent);stroke:color-mix(in srgb, var(--ligne) 55%, transparent);stroke-width:3');
      const I = { p, svg };
      if (p.trace) { I.trace = el('path', { class: 'v-trace' }, svg); I.cop = el('circle', { r: 6 }, svg); }
      if (p.icone) {
        I.oeil = el('g', { transform: 'translate(210 320)' }, svg);
        I.ouvert = el('g', {}, I.oeil);
        el('path', { d: 'M-26 0 C-14 -16 14 -16 26 0 C14 16 -14 16 -26 0 Z', style: 'fill:none;stroke:var(--accent);stroke-width:2.5' }, I.ouvert);
        el('circle', { r: 6.5, style: 'fill:var(--accent)' }, I.ouvert);
        I.ferme = el('g', {}, I.oeil);
        el('path', { d: 'M-26 -2 C-14 12 14 12 26 -2', style: 'fill:none;stroke:var(--signal);stroke-width:2.5;stroke-linecap:round' }, I.ferme);
        for (const x of [-16, -5, 6, 17]) el('line', { x1: x, y1: 7, x2: x * 1.15, y2: 14, style: 'stroke:var(--signal);stroke-width:2;stroke-linecap:round' }, I.ferme);
        if (ctx.site) { I.pastille = O.etiquette(ctx, svg, { x: 250, y: 325 }, ''); }
      }
      if (ctx.site) O.etiquette(ctx, svg, { x: 50, y: 346, style: 'font-size:12px;font-family:var(--mono);opacity:.7' }, 'Centre de pression, tracé illustratif');
      return I;
    },
    rendre(I, tau) {
      const O = EZR.outils, p = I.p;
      const k = Math.min(p.modes.length - 1, Math.max(0, Math.floor(tau / p.bascule)));
      const M = MODES[p.modes[k]], t0 = k * p.bascule;
      if (I.oeil) { I.ouvert.setAttribute('opacity', M.oeil ? 1 : 0); I.ferme.setAttribute('opacity', M.oeil ? 0 : 1); if (I.pastille) { I.pastille.textContent = M.oeil ? 'Yeux ouverts' : 'Yeux fermés'; I.pastille.style.fill = `var(--${M.couleur})`; } }
      if (!I.trace) return;
      const pos = (t) => [210 + M.A * (Math.sin(t * 1.3) * 0.6 + Math.sin(t * 3.1 + 1) * 0.3 + Math.sin(t * 7.3 + 2) * 0.12),
        155 + M.A * (Math.sin(t * 1.1 + 0.5) * 0.7 + Math.sin(t * 2.7 + 2) * 0.25 + Math.sin(t * 6.1) * 0.1)];
      if (tau < 0) { I.trace.setAttribute('d', ''); I.cop.setAttribute('opacity', 0); return; }
      const n1 = Math.floor(tau * 60), n0 = Math.max(Math.ceil(t0 * 60), n1 - 259);
      const pts = [];
      for (let n = n0; n <= n1; n++) { const [x, y] = pos(n / 60); pts.push(x.toFixed(1) + ' ' + y.toFixed(1)); }
      const [x, y] = pos(tau);
      pts.push(x.toFixed(1) + ' ' + y.toFixed(1));
      O.set(I.trace, { d: 'M' + pts.join(' L'), style: `stroke:var(--${M.couleur})` });
      O.set(I.cop, { cx: x, cy: y, opacity: 1, style: `fill:var(--${M.couleur});filter:drop-shadow(0 0 6px var(--${M.couleur}))` });
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
