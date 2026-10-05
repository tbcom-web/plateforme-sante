/* COPIE conforme du studio ÉcranZen (TBCOM CLAUDE/ecranzen/studio/html, 2026-10-05), reprise autorisée par Paul : ne pas modifier ici, recopier depuis ÉcranZen. Voir docs/moteur-contenus.md (§ Reels). */
// VISUEL « carte-pression » — deux empreintes en trame hexagonale de points colorés (« La carte des pressions », Paul).
// Canvas redessiné depuis tau : apparition en onde depuis le centre, montée de la pression, état « concentre » ou « reparti ».
// Le passage concentré → réparti par balayage (« sans / avec semelles ») est un AVANT/APRÈS : refusé par défaut.
// Palette sans rouge d'alerte (lignes rouges §7) : --p1 … --p5 (bleu → orange).
(function (racine) {
  'use strict';
  const EZR = racine.EZR;
  // Champs de pression réglés par Paul dans l'ancien repère (plante 32–172 × 20–388) ; les points sont posés sur la VRAIE empreinte
  // (trace d'appui de la géométrie commune, pied gauche vu de dessus) et ramenés dans ce repère pour lire le champ.
  const ANC = { x0: 32, x1: 172, y0: 20, y1: 388 };
  let BOX = null;
  const versAncien = (x, y) => [ANC.x0 + ((x - BOX.x0) / (BOX.x1 - BOX.x0)) * (ANC.x1 - ANC.x0), ANC.y0 + ((y - BOX.y0) / (BOX.y1 - BOX.y0)) * (ANC.y1 - ANC.y0)];
  const g = (x, y, cx0, cy0, s) => Math.exp(-((x - cx0) ** 2 + (y - cy0) ** 2) / (2 * s * s));
  function concentre(x, y) {
    let p = 0.12 + 0.92 * g(x, y, 100, 338, 30) + 0.86 * g(x, y, 120, 132, 24) + 0.5 * g(x, y, 74, 146, 20) + 0.55 * g(x, y, 126, 50, 13) + 0.2 * g(x, y, 96, 44, 9);
    if (y < 96) p = Math.max(p, 0.38 + 0.3 * g(x, y, 121, 50, 12));
    return Math.min(1, p);
  }
  function reparti(x, y) { const n = Math.sin(x * 0.21 + y * 0.13) * 0.03; return Math.min(0.52, 0.36 + 0.1 * g(x, y, 100, 338, 40) + 0.08 * g(x, y, 112, 135, 34) + n); }
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

  EZR.visuels['carte-pression'] = {
    titre: 'Carte des pressions : pieds en points colorés',
    parametres: {
      etat: { defaut: 'concentre', aide: '"concentre" (talon et avant-pied chargés, voûte sans contact) | "reparti" (appui étalé)' },
      balayage: { defaut: false, aide: 'INTERDIT par défaut : passage concentre → reparti par une ligne de balayage (= avant/après)' },
      balayage_debut: { defaut: 4, aide: 's : début du balayage (si autorisé)' },
      derogation: { defaut: '', aide: 'référence d\'une décision éthique écrite qui autorise « balayage »' },
      legende: { defaut: true, aide: 'échelle verticale bleu → orange avec repère du pic (mots « Forte / Faible » en format site)' },
    },
    mots: () => 0,
    verifier(p) {
      const m = [];
      if (!['concentre', 'reparti'].includes(p.etat)) m.push(`etat « ${p.etat} » inconnu (concentre, reparti)`);
      if (p.balayage && !p.derogation) m.push('« balayage » (concentré → réparti, « sans / avec semelles ») = avant/après : interdit (lignes rouges §2). Montrer UN état, ou citer une décision éthique dans « derogation ».');
      return m;
    },
    construire(boite, p, ctx) {
      const cv = document.createElement('canvas');
      const R = 2; cv.width = boite.l * R; cv.height = boite.h * R;
      boite.div.appendChild(cv);
      const cx = cv.getContext('2d');
      const F = EZR.FORMES.empreinte, b = F.boite;
      BOX = { x0: b[0], x1: b[2], y0: b[1], y1: b[3] };
      const plante = new Path2D(F.plante), orteils = new Path2D(F.pulpes.join(' ')); // points DANS les pulpes des orteils
      const probe = document.createElement('canvas').getContext('2d');
      const inside = (x, y) => probe.isPointInPath(plante, 512 - x, y) || probe.isPointInPath(orteils, 512 - x, y); // xf de l'empreinte : X = 512 − x
      const S = 7.2, dots = []; // trame fine : les pulpes des orteils reçoivent plusieurs points
      for (let row = 0, y = BOX.y0; y <= BOX.y1; row++, y += S * 0.866)
        for (let x = BOX.x0 + (row % 2 ? S / 2 : 0); x <= BOX.x1; x += S) if (inside(x, y)) { const [u, v] = versAncien(x, y); dots.push({ x, y, b: concentre(u, v), a: reparti(u, v) }); }
      const cX = (BOX.x0 + BOX.x1) / 2, cY = (BOX.y0 + BOX.y1) / 2, maxD = Math.max(...dots.map((d) => Math.hypot(d.x - cX, d.y - cY)));
      dots.forEach((d) => { d.d = Math.hypot(d.x - cX, d.y - cY) / maxD; d.yn = (d.y - BOX.y0) / (BOX.y1 - BOX.y0); });
      const C = ctx.couleurs, stops = [[0, C.p1], [0.35, C.p2], [0.6, C.p3], [0.8, C.p4], [1, C.p5]].map(([t, h]) => [t, hex(h)]);
      const couleur = (v) => { for (let k = 1; k < stops.length; k++) if (v <= stops[k][0]) { const [t0, c0] = stops[k - 1], [t1, c1] = stops[k], u = (v - t0) / (t1 - t0); return `rgb(${c0.map((c, i) => Math.round(c + (c1[i] - c) * u)).join(',')})`; } return `rgb(${stops[4][1].join(',')})`; };
      const Wc = cv.width, Hc = cv.height, leg = p.legende ? 70 * R : 0;
      const scale = Math.min((Hc * 0.9) / (BOX.y1 - BOX.y0), ((Wc - leg) * 0.44) / (BOX.x1 - BOX.x0));
      const gapX = (BOX.x1 - BOX.x0) * scale * 1.12, ox = (Wc - leg) / 2;
      return { p, cv, cx, dots, couleur, stops, Wc, Hc, scale, gapX, ox, leg, R, ctx };
    },
    rendre(I, tau) {
      const O = EZR.outils, p = I.p, { cx, scale, gapX, ox, Wc, Hc, R } = I;
      cx.clearRect(0, 0, Wc, Hc);
      const bal = p.balayage && p.derogation;
      const cible = (d) => (p.etat === 'reparti' ? d.a : d.b);
      let pic = 0;
      for (const [miroir, dx] of [[false, -gapX / 2], [true, gapX / 2]]) for (const d of I.dots) {
        const vis = O.outBack((tau - 0.15 - d.d * 0.7) / 0.6);
        if (vis <= 0.001) continue;
        const monte = O.inOut5((tau - 0.9) / 1.7);
        let v0 = bal ? d.b : cible(d);
        let v = v0 < 0.02 ? v0 * monte : 0.18 + (v0 - 0.18) * monte;
        if (bal) { const pass = O.inOut5((tau - (p.balayage_debut + (1 - d.yn) * 1.3)) / 0.8); v += (d.a - v) * pass; }
        pic = Math.max(pic, v);
        const presence = O.clamp((v - 0.03) / 0.1);
        const r = 0.75 * (1.3 + v * 3.1) * scale * vis * presence;
        if (r <= 0) continue;
        const x = miroir ? BOX.x1 + BOX.x0 - d.x : d.x;
        cx.beginPath();
        cx.arc(ox + dx + (x - (BOX.x0 + BOX.x1) / 2) * scale, Hc / 2 + (d.y - (BOX.y0 + BOX.y1) / 2) * scale, r, 0, 6.2832);
        cx.fillStyle = I.couleur(v);
        cx.fill();
      }
      if (bal) {
        const sp = O.clamp((tau - p.balayage_debut) / 1.3);
        if (sp > 0 && sp < 1) {
          const y = Hc / 2 + (BOX.y1 - (BOX.y1 - BOX.y0) * sp - (BOX.y0 + BOX.y1) / 2) * scale, x0 = ox - gapX / 2 - (BOX.x1 - BOX.x0) * scale * 0.62, x1 = ox + gapX / 2 + (BOX.x1 - BOX.x0) * scale * 0.62;
          cx.fillStyle = I.ctx.couleurs.ligne; cx.fillRect(x0, y - R, x1 - x0, 2 * R);
        }
      }
      if (I.leg) {
        const x = Wc - I.leg + 20 * R, h = Hc * 0.62, y0 = (Hc - h) / 2, w = 12 * R;
        const grd = cx.createLinearGradient(0, y0 + h, 0, y0);
        for (const [t, c] of I.stops) grd.addColorStop(t, `rgb(${c.join(',')})`);
        cx.fillStyle = grd; cx.fillRect(x, y0, w, h);
        const ym = y0 + h * (1 - pic);
        cx.fillStyle = I.ctx.couleurs.ligne;
        cx.beginPath(); cx.moveTo(x + w + 4 * R, ym); cx.lineTo(x + w + 14 * R, ym - 7 * R); cx.lineTo(x + w + 14 * R, ym + 7 * R); cx.closePath(); cx.fill();
        if (I.ctx.site) { cx.font = `500 ${15 * R}px ${getComputedStyle(document.documentElement).getPropertyValue('--typo')}`; cx.textAlign = 'center'; cx.fillText('Forte', x + w / 2, y0 - 12 * R); cx.fillText('Faible', x + w / 2, y0 + h + 24 * R); }
      }
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
