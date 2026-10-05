/* COPIE conforme du studio ÉcranZen (TBCOM CLAUDE/ecranzen/studio/html, 2026-10-05), reprise autorisée par Paul : ne pas modifier ici, recopier depuis ÉcranZen. Voir docs/moteur-contenus.md (§ Reels). */
// VISUEL « silhouette » — silhouette « plan technique » (traits et ronds) de « La posturologie », déterministe et paramétrable.
(function (racine) {
  'use strict';
  const EZR = racine.EZR;
  EZR.visuels.silhouette = {
    titre: 'Silhouette plan technique (traits et ronds)',
    parametres: {
      inclinaison: { defaut: 'neutre', aide: '"neutre" | "legere" | "marquee" | { ap, s, as, h } (degrés : bassin, colonne, épaules, tête)' },
      oscillation: { defaut: 0.6, aide: 'balancement doux (degrés, période 4 s) ; 0 = immobile' },
      appui: { defaut: 'deux-pieds', aide: '"deux-pieds" | "unipodal" (pied gauche levé, stable)' },
      appui_debut: { defaut: 1.5, aide: 's : moment où le pied se lève (unipodal)' },
      tourner: { defaut: null, aide: 's : la silhouette pivote de face vers dos (1 s) ; null = pas de pivot' },
      reperes: { defaut: 'aucun', aide: '"aucun" | "horizontaux" (traits fins à l\'horizontale : on REGARDE) | "inclinaison" (repères + lignes inclinées)' },
      reperes_debut: { defaut: 1.2, aide: 's : premier repère (puis un toutes les 0,7 s ; ils s\'effacent 3 s après)' },
      niveaux: { defaut: false, aide: 'niveaux à bulle épaules / bassin (bulle accent si droit, signal sinon)' },
      fil_a_plomb: { defaut: 'aucun', aide: '"aucun" | "cote" (à côté de la silhouette, avec son poids ; avec « tourner » : apparaît APRÈS la rotation, en vue de dos) | "axe" (à travers le corps)' },
      douleur: { defaut: [], aide: 'zones signalées par un ROND CREUX : "dos", "genou", "hanche", "cheville"' },
      semelles: { defaut: false, aide: 'semelles sous les pieds (statique)' },
      plateforme: { defaut: false, aide: 'plateau plat au sol sous les pieds, sans écran de données' },
      correction: { defaut: false, aide: 'INTERDIT par défaut : semelles qui glissent puis réalignement = avant/après (lignes rouges §2)' },
      derogation: { defaut: '', aide: 'référence d\'une décision éthique écrite qui autorise « correction »' },
    },
    verifier(p) {
      const m = [];
      if (p.correction && !p.derogation) m.push('« correction » = avant/après (semelles puis silhouette qui se redresse) : interdit (lignes rouges §2, « aucun avant/après »). Laisser false, ou citer une décision éthique dans « derogation ».');
      if (!['deux-pieds', 'unipodal'].includes(p.appui)) m.push(`appui « ${p.appui} » inconnu`);
      if (!['aucun', 'horizontaux', 'inclinaison'].includes(p.reperes)) m.push(`reperes « ${p.reperes} » inconnu`);
      if (!['aucun', 'cote', 'axe'].includes(p.fil_a_plomb)) m.push(`fil_a_plomb « ${p.fil_a_plomb} » inconnu`);
      if (typeof p.inclinaison === 'string' && !EZR.INCLINAISONS?.[p.inclinaison]) m.push(`inclinaison « ${p.inclinaison} » inconnue`);
      for (const d of p.douleur || []) if (!['dos', 'genou', 'hanche', 'cheville'].includes(d)) m.push(`douleur « ${d} » inconnue`);
      return m;
    },
    construire(boite, p, ctx) {
      const O = EZR.outils, { el } = O;
      const svg = O.svg(boite, '0 0 330 540');
      const g = el('g', {}, svg);
      const I = { p, svg, g };
      I.aplomb = p.fil_a_plomb === 'axe' ? el('line', { class: 'v-aplomb', x1: 160, y1: 6, x2: 160, y2: 510 }, g) : null;
      I.refs = p.reperes === 'inclinaison' ? [el('line', { class: 'v-ref', x1: 70, x2: 250 }, g), el('line', { class: 'v-ref', x1: 90, x2: 230 }, g)] : null;
      I.incl = p.reperes === 'inclinaison' ? [el('line', { class: 'v-incl' }, g), el('line', { class: 'v-incl' }, g)] : null;
      I.horiz = p.reperes === 'horizontaux' ? [0, 1, 2].map(() => el('line', { class: 'v-repere' }, g)) : null;
      I.plateau = p.plateforme ? el('rect', { class: 'v-plateau', x: 78, y: 502, width: 164, height: 14, rx: 5 }, g) : null;
      I.semelles = p.semelles || p.correction ? [el('rect', { class: 'v-semelle', x: 106, y: 492, width: 44, height: 8, rx: 4 }, g), el('rect', { class: 'v-semelle', x: 170, y: 492, width: 44, height: 8, rx: 4 }, g)] : null;
      I.corps = el('g', {}, g);
      I.F = EZR.figure(I.corps);
      I.douleurs = (p.douleur || []).map((d) => ({ d, c: el('circle', { class: 'v-douleur', r: d === 'dos' ? 15 : 12 }, g) }));
      if (p.niveaux) I.niveaux = ['Épaules', 'Bassin'].map((lab) => {
        const gg = el('g', {}, svg);
        return { r: el('rect', { class: 'v-niveau', x: 262, width: 60, height: 16, rx: 8 }, gg), m1: el('line', { class: 'v-niveau-trait' }, gg), m2: el('line', { class: 'v-niveau-trait' }, gg),
          b: el('circle', { r: 5.5 }, gg), t: O.etiquette(ctx, gg, { x: 262 }, lab) };
      });
      if (p.fil_a_plomb === 'cote') {
        I.fil = el('g', {}, svg);
        el('line', { class: 'v-trait-fin', x1: 286, y1: 8, x2: 286, y2: 462, style: 'stroke:var(--accent)' }, I.fil);
        el('path', { class: 'v-accent', d: 'M286 460 C276 474 278 488 286 494 C294 488 296 474 286 460 Z' }, I.fil);
      }
      return I;
    },
    rendre(I, tau, ctx) {
      const O = EZR.outils, p = I.p;
      const base = EZR.inclinaison(p.inclinaison);
      let pose = base;
      if (p.correction && p.derogation) {
        const k = (a) => O.ease((tau - a) / 1.8);
        pose = { ap: O.lerp(base.ap, 0, k(2.4)), s: O.lerp(base.s, 0, k(3.0)), as: O.lerp(base.as, 0, k(3.6)), h: O.lerp(base.h, 0, k(4.2)) };
        const si = O.clamp(tau - 1), e = O.ease(si);
        O.set(I.semelles[0], { x: O.lerp(10, 106, e), opacity: si > 0 ? 1 : 0 }); O.set(I.semelles[1], { x: O.lerp(270, 170, e), opacity: si > 0 ? 1 : 0 });
      }
      const uni = p.appui === 'unipodal' ? O.ease((tau - p.appui_debut) / 1.2) : 0;
      const P = I.F.poser(pose, { unipodal: uni });
      // balancement (périodique, continu en boucle) et pivot face → dos
      const sway = p.oscillation * Math.sin((2 * Math.PI * tau) / 4) * (1 - 0.5 * uni);
      let sx = 1;
      if (p.tourner != null) { const u = O.clamp((tau - p.tourner) / 1); sx = Math.max(0.04, Math.abs(Math.cos(Math.PI * O.ease(u)))); }
      O.set(I.g, { transform: `rotate(${sway.toFixed(3)} 160 500)` });
      O.set(I.corps, { transform: sx < 1 ? `translate(160 0) scale(${sx.toFixed(4)} 1) translate(-160 0)` : '' });
      // repères
      if (I.refs) { O.set(I.refs[0], { y1: P.T[1], y2: P.T[1] }); O.set(I.refs[1], { y1: P.C[1], y2: P.C[1] }); }
      const off = Math.abs(pose.ap) + Math.abs(pose.as);
      if (I.incl) {
        O.L(I.incl[0], O.add(P.eG, O.rot([-20, 0], pose.as)), O.add(P.eD, O.rot([20, 0], pose.as)));
        O.L(I.incl[1], O.add(P.hG, O.rot([-22, 0], pose.ap)), O.add(P.hD, O.rot([22, 0], pose.ap)));
        I.incl.forEach((l) => l.setAttribute('opacity', Math.min(1, off / 6).toFixed(3)));
      }
      if (I.horiz) {
        // on REGARDE : traits fins horizontaux (épaules, bassin, genoux), tracés depuis le centre puis effacés — jamais d'angle
        const ys = [P.T[1], P.C[1], (P.gG[1] + P.gD[1]) / 2], demi = [96, 70, 62];
        I.horiz.forEach((l, k) => {
          const a = p.reperes_debut + 0.7 * k, u = O.ease((tau - a) / 0.6), o = u * (1 - O.ease((tau - a - 3) / 0.6));
          O.set(l, { x1: 160 - demi[k] * u, x2: 160 + demi[k] * u, y1: ys[k], y2: ys[k], opacity: o.toFixed(3) });
        });
      }
      if (I.niveaux) [[P.T[1], pose.as], [P.C[1], pose.ap]].forEach(([y, ang], k) => {
        const L = I.niveaux[k];
        O.set(L.r, { y: y - 8 }); O.L(L.m1, [286, y - 8], [286, y + 8]); O.L(L.m2, [298, y - 8], [298, y + 8]);
        O.set(L.b, { cx: 292 + O.clamp(ang * 3, -22, 22), cy: y, style: `fill:var(--${Math.abs(ang) < 1 ? 'accent' : 'signal'})` });
        if (L.t) O.set(L.t, { y: y - 14 });
      });
      if (I.fil) { const u = p.tourner != null ? O.ease((tau - p.tourner - 1.05) / 0.6) : O.ease((tau - 0.6) / 0.6); O.set(I.fil, { opacity: u.toFixed(3) }); }
      // douleur : ROND CREUX, taille constante, respiration d'opacité (jamais un disque plein qui pulse)
      const pos = { dos: O.add(P.C, O.rot([0, -34], pose.s)), genou: P.gD, hanche: P.hD, cheville: [188, 484] };
      I.douleurs.forEach(({ d, c }, k) => {
        const resp = 0.7 + 0.3 * Math.cos(2 * Math.PI * O.phase(tau, 1.6, k * 0.5));
        const vis = p.correction ? Math.min(1, off / 8) : 1;
        O.set(c, { cx: pos[d][0], cy: pos[d][1], opacity: (resp * vis * O.ease((tau - 0.8) / 0.6)).toFixed(3) });
      });
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
