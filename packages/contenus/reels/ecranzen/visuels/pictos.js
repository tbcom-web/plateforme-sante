/* COPIE conforme du studio ÉcranZen (TBCOM CLAUDE/ecranzen/studio/html, 2026-10-05), reprise autorisée par Paul : ne pas modifier ici, recopier depuis ÉcranZen. Voir docs/moteur-contenus.md (§ Reels). */
// VISUEL « picto » — pictogrammes simples au trait, style plan technique : pied, chaussure, semelle, calendrier, paliers, loupe,
// questions (bulle « ? »), explication (bulle dont les lignes s'écrivent).
// Tracé qui se dessine (pathLength = 1), puis une petite action propre au picto. Aucun chiffre, aucune main.
(function (racine) {
  'use strict';
  const EZR = racine.EZR;
  const NOMS = ['pied', 'chaussure', 'semelle', 'calendrier', 'paliers', 'loupe', 'questions', 'explication'];
  // Formes JUSTES de la géométrie commune (visuels/_formes.js) : pied plantaire POD-AT-0002, semelle POD-AT-0004 / POD-AT-0005,
  // chaussure de profil TRV-AT-0009 (état ville : talon, contrefort, empeigne, semelle d'usure). Repères centrés sur la forme.
  const ZONES_PIED = { talon: [-4, 158], voute: [22, 50], 'avant-pied': [8, -88], orteils: [44, -165] };
  const EXAGERE = 'translate(0 440) scale(1 1.8) translate(0 -440)'; // semelle de profil : épaisseurs ×1,8 (lisible de loin), longueur inchangée
  let uid = 0;
  const trace = (e, u) => { e.setAttribute('stroke-dashoffset', (1 - u).toFixed(4)); };
  EZR.visuels.picto = {
    titre: 'Pictogrammes : pied, chaussure, semelle, calendrier, paliers, loupe, questions, explication',
    parametres: {
      nom: { defaut: 'pied', aide: NOMS.join(' | ') },
      debut: { defaut: 0.3, aide: 's : début du tracé' },
      pas: { defaut: 0.6, aide: 's entre deux étapes (cases du calendrier, marches des paliers)' },
      rond: { defaut: null, aide: 'pied : rond de repérage (creux) sur "talon" | "voute" | "avant-pied" | "orteils"' },
      vue: { defaut: 'dessus', aide: 'semelle : "dessus" (talonnette, voûte, avant-pied en aplats doux) | "profil" (talon épais, voûte relevée, avant-pied fin)' },
      dans_chaussure: { defaut: false, aide: 'semelle : la semelle se glisse dans une chaussure fermée (profil)' },
      cases: { defaut: 6, aide: 'calendrier : nombre de jours, sans chiffre ; ≤ 8 = UNE rangée (2 × 7 se lit « 2 semaines » : à éviter quand aucune durée n’est admise)' },
      jauges: { defaut: true, aide: 'calendrier : chaque jour, une jauge un peu plus haute (port progressif), sans graduation' },
      marches: { defaut: 5, aide: 'paliers : nombre de marches régulières, sans chiffre' },
    },
    mots: () => 0,
    verifier(p) {
      const m = [];
      if (!NOMS.includes(p.nom)) m.push(`nom « ${p.nom} » inconnu (${NOMS.join(', ')})`);
      if (p.rond && !ZONES_PIED[p.rond]) m.push(`rond « ${p.rond} » inconnu (${Object.keys(ZONES_PIED).join(', ')})`);
      if (p.cases > 21) m.push('calendrier : 21 cases au plus');
      return m;
    },
    construire(boite, p) {
      const O = EZR.outils, { el } = O;
      const I = { p, traits: [] };
      const trait = (tag, attrs, parent, cls = 'v-trait') => { const e = el(tag, { class: cls, pathLength: 1, 'stroke-dasharray': '1 1', 'stroke-dashoffset': 1, ...attrs }, parent); I.traits.push(e); return e; };
      const F = EZR.FORMES;
      const tracer = (e) => { O.set(e, { class: 'v-trait', pathLength: 1, 'stroke-dasharray': '1 1', 'stroke-dashoffset': 1 }); I.traits.push(e); return e; };
      if (p.nom === 'pied' || p.nom === 'loupe') {
        const svg = O.svg(boite, p.nom === 'loupe' ? '-170 -215 340 430' : '-125 -212 250 424');
        I.pied = el('g', {}, svg);
        EZR.piedPlantaire(I.pied, 'fill:var(--fond);stroke-width:2.6').els.forEach(tracer); // contour de la plante d'abord, puis les orteils
        if (p.nom === 'pied' && p.rond) { const [x, y] = ZONES_PIED[p.rond]; I.rond = el('circle', { class: 'v-accent-trait', cx: x, cy: y, r: 30 }, svg); }
        if (p.nom === 'loupe') {
          const id = `ezr-loupe-${++uid}`;
          I.clip = el('circle', { r: 58 }, el('clipPath', { id }, el('defs', {}, svg)));
          I.zoom = el('g', { 'clip-path': `url(#${id})` }, svg);
          el('circle', { r: 58, style: 'fill:var(--fond)' }, I.zoom);
          I.zoomPied = el('g', {}, I.zoom);
          EZR.piedPlantaire(I.zoomPied, 'fill:var(--fond);stroke:var(--ligne);stroke-width:2.5');
          I.loupe = el('g', {}, svg);
          el('circle', { class: 'v-accent-trait', r: 58, style: 'stroke-width:5' }, I.loupe);
          el('line', { class: 'v-accent-trait', x1: 41, y1: 41, x2: 92, y2: 92, style: 'stroke-width:12' }, I.loupe);
        }
      } else if (p.nom === 'chaussure' || (p.nom === 'semelle' && p.dans_chaussure)) {
        const svg = O.svg(boite, '20 290 490 190');
        el('path', { d: F.chaussure.tige, style: 'fill:color-mix(in srgb, var(--ligne) 8%, transparent)' }, svg);
        if (p.nom === 'semelle') { // la semelle (aplats doux, sans rond) se glisse dans la chaussure
          I.semelle = el('g', {}, svg);
          const sp = el('g', { transform: EXAGERE }, I.semelle);
          el('path', { d: F.semelleProfil.coque, style: 'fill:color-mix(in srgb, var(--accent) 75%, var(--fond))' }, sp);
          el('path', { d: F.semelleProfil.recouvrement, style: 'fill:color-mix(in srgb, var(--accent) 55%, var(--fond))' }, sp);
          el('path', { d: F.semelleProfil.voute, style: 'fill:color-mix(in srgb, var(--p3) 75%, var(--ligne))' }, sp);
          el('path', { d: F.semelleProfil.contour, style: 'fill:none;stroke:var(--ligne);stroke-width:1.2' }, sp);
        }
        const ch = el('g', {}, svg);
        tracer(el('path', { d: F.chaussure.tige }, ch)); tracer(el('path', { d: F.chaussure.semelle }, ch));
        tracer(el('path', { d: F.chaussure.lacets, style: 'stroke-width:3' }, ch));
        // pas de rond sur la chaussure : un rond creux se lit « douleur » (validation éthique 2026-09-30) ; la semelle est repérée par son aplat vert
      } else if (p.nom === 'semelle' && p.vue === 'profil') {
        const svg = O.svg(boite, '30 330 460 130');
        I.pied = el('g', { transform: EXAGERE }, svg);
        el('path', { d: F.semelleProfil.coque, style: 'fill:color-mix(in srgb, var(--accent) 75%, var(--fond))' }, I.pied);
        el('path', { d: F.semelleProfil.recouvrement, style: 'fill:color-mix(in srgb, var(--accent) 55%, var(--fond))' }, I.pied);
        el('path', { d: F.semelleProfil.voute, style: 'fill:color-mix(in srgb, var(--p3) 75%, var(--ligne))' }, I.pied);
        tracer(el('path', { d: F.semelleProfil.contour, style: 'stroke-width:2.5' }, I.pied));
      } else if (p.nom === 'semelle') {
        const svg = O.svg(boite, '-110 -222 220 444');
        I.pied = el('g', {}, svg);
        const S = EZR.semelleDessus(I.pied);
        tracer(S.contour); I.zonesSemelle = Object.values(S.zones);
      } else if (p.nom === 'calendrier') {
        const svg = O.svg(boite, '0 0 440 380');
        const parLigne = p.cases <= 8 ? p.cases : 7, lignes = Math.ceil(p.cases / parLigne), h = 70 + lignes * 92 + 18, pasX = Math.min(54, 368 / parLigne), x0 = 20 + (400 - parLigne * pasX + (pasX - 44)) / 2;
        trait('rect', { x: 20, y: 30, width: 400, height: h, rx: 22 }, svg);
        trait('line', { x1: 20, y1: 86, x2: 420, y2: 86 }, svg, 'v-trait-fin');
        for (const x of [110, 330]) trait('line', { x1: x, y1: 14, x2: x, y2: 46 }, svg);
        I.jours = Array.from({ length: p.cases }, (_, k) => {
          const x = x0 + (k % parLigne) * pasX, y = 100 + Math.floor(k / parLigne) * 92;
          const g = el('g', {}, svg);
          el('rect', { x, y, width: 44, height: 80, rx: 8, style: 'fill:color-mix(in srgb, var(--ligne) 7%, transparent);stroke:color-mix(in srgb, var(--ligne) 35%, transparent);stroke-width:1.5' }, g);
          const hj = p.jauges ? 12 + (56 * (k + 1)) / p.cases : 0;
          const jauge = p.jauges ? el('rect', { x: x + 12, width: 20, rx: 4, style: 'fill:var(--accent)' }, g) : null;
          const coche = el('path', { class: 'v-accent-trait', d: `M${x + 10} ${y + 40} L${x + 19} ${y + 50} L${x + 35} ${y + 28}`, pathLength: 1, 'stroke-dasharray': '1 1', style: 'stroke-width:4' }, g);
          return { g, jauge, coche, hj, y, k };
        });
        if (p.jauges) I.jours.forEach((j) => j.coche.remove());
      } else if (p.nom === 'questions' || p.nom === 'explication') {
        const svg = O.svg(boite, '0 0 440 380');
        const bulle = 'M70 60 H370 C392 60 404 72 404 94 V230 C404 252 392 264 370 264 H190 L130 318 L140 264 H70 C48 264 36 252 36 230 V94 C36 72 48 60 70 60 Z';
        el('path', { d: bulle, style: 'fill:color-mix(in srgb, var(--ligne) 7%, transparent)' }, svg);
        trait('path', { d: bulle }, svg);
        if (p.nom === 'questions') {
          trait('path', { d: 'M196 128 C196 104 244 104 244 128 C244 150 220 150 220 176', style: 'stroke:var(--accent);stroke-width:9' }, svg);
          I.point = el('circle', { cx: 220, cy: 206, r: 7, class: 'v-accent' }, svg);
        } else {
          I.lignes = [[88, 116, 352], [88, 162, 320], [88, 208, 250]].map(([x, y, x2]) => el('line', { x1: x, y1: y, x2, y2: y, class: 'v-accent-trait', pathLength: 1, 'stroke-dasharray': '1 1', 'stroke-dashoffset': 1, style: 'stroke-width:10' }, svg));
        }
      } else if (p.nom === 'paliers') {
        const svg = O.svg(boite, '0 0 440 380');
        const n = p.marches, l = 360 / n, hm = 260 / n;
        let d = `M40 340`;
        for (let k = 0; k < n; k++) d += ` L${40 + k * l} ${340 - (k + 1) * hm} L${40 + (k + 1) * l} ${340 - (k + 1) * hm}`;
        trait('path', { d: d + ' L400 340 Z', style: 'fill:color-mix(in srgb, var(--ligne) 7%, transparent)' }, svg);
        I.marches = Array.from({ length: n }, (_, k) => [40 + (k + 0.5) * l, 340 - (k + 1) * hm]);
        I.bille = el('circle', { r: 13, class: 'v-accent v-lueur' }, svg);
      }
      return I;
    },
    rendre(I, tau) {
      const O = EZR.outils, p = I.p;
      const u = O.ease((tau - p.debut) / 1.2);
      I.traits.forEach((e, k) => trace(e, O.clamp(u * 1.15 - k * 0.02)));
      if (p.nom === 'pied' && I.rond) { const ph = 0.7 + 0.3 * Math.cos(2 * Math.PI * O.phase(tau, 1.8)); I.rond.setAttribute('opacity', (O.clamp((tau - p.debut - 1.4) / 0.5) * ph).toFixed(3)); }
      if (p.nom === 'loupe') {
        const a = O.clamp((tau - p.debut - 1.2) / 0.5), t = Math.max(0, tau - p.debut - 1.2);
        const x = 38 * Math.sin(t * 0.9), y = -30 + 140 * Math.sin(t * 0.55 - 0.6);
        O.set(I.loupe, { transform: `translate(${x.toFixed(2)} ${y.toFixed(2)})`, opacity: a.toFixed(3) });
        O.set(I.clip, { cx: x, cy: y }); O.set(I.zoom.firstChild, { cx: x, cy: y });
        O.set(I.zoomPied, { transform: `translate(${x} ${y}) scale(1.6) translate(${-x} ${-y})` }); I.zoom.setAttribute('opacity', a.toFixed(3));
      }
      if (p.nom === 'semelle' && p.dans_chaussure) {
        const e = O.ease((tau - p.debut - 1.3) / 1.4);
        O.set(I.semelle, { transform: `translate(${O.lerp(-30, 0, e).toFixed(2)} ${O.lerp(-190, 0, e).toFixed(2)}) rotate(${O.lerp(-24, 0, e).toFixed(3)} 110 190)`, opacity: O.clamp((tau - p.debut - 1.0) / 0.4).toFixed(3) });
      }
      if (I.zonesSemelle) I.zonesSemelle.forEach((z, k) => z.setAttribute('opacity', O.ease((tau - p.debut - 1.1 - k * 0.3) / 0.5).toFixed(3)));
      if (p.nom === 'semelle' && !p.dans_chaussure && p.vue !== 'profil') O.set(I.pied, { transform: `translate(0 ${(4 * Math.sin((2 * Math.PI * tau) / 4)).toFixed(2)})` });
      if (I.jours) I.jours.forEach((j) => {
        const a = p.debut + 1.0 + j.k * p.pas, v = O.outCubic((tau - a) / 0.5);
        if (j.jauge) O.set(j.jauge, { y: j.y + 72 - j.hj * v, height: j.hj * v });
        else trace(j.coche, v);
      });
      if (I.point) I.point.setAttribute('opacity', O.clamp((tau - p.debut - 1.3) / 0.3).toFixed(3));
      if (I.lignes) I.lignes.forEach((l, k) => trace(l, O.ease((tau - p.debut - 1.2 - k * p.pas) / 0.8)));
      if (I.marches) {
        const t = tau - p.debut - 1.2, n = I.marches.length, depart = [I.marches[0][0] - 60, 340];
        const k = Math.min(n - 1, Math.max(0, Math.floor(t / p.pas)));
        const from = t < 0 ? depart : k === 0 ? depart : I.marches[k - 1], to = t < 0 ? depart : I.marches[k];
        const e = O.ease((t - k * p.pas) / (p.pas * 0.6));
        const x = O.lerp(from[0], to[0], e), y = O.lerp(from[1], to[1], e) - 13 - 40 * Math.sin(Math.PI * e);
        O.set(I.bille, { cx: x, cy: y, opacity: O.clamp((tau - p.debut - 0.8) / 0.4).toFixed(3) });
      }
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
