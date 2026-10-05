// COPIE du studio ÉcranZen (TBCOM CLAUDE/ecranzen/studio/html/reels/moteur-reel.js, 2026-10-05),
// reprise autorisée par Paul. Quatre adaptations seulement, marquées « ADAPTATION plateforme-sante ». Voir docs/moteur-contenus.md (§ Reels).
// MOTEUR DE REEL — html/reels/moteur-reel.js. Un reel = UN fichier JSON court (html/reels/<id>.json → donnees/<id>.js par reel.mjs) :
// des scènes { kicker, titre, sous_texte, mise_en_page, passage, visuel: { type, …paramètres }, duree } et, en dernier, { mention: "M1" }.
// Style des pages de Paul (La posturologie, La carte des pressions, Chaque foulée compte) : en-tête marque + sujet, barre de
// progression par scène. MISES EN PAGE (templates) : split · visuel-plein · titre-geant · comparaison · etapes · question.
// PASSAGES : scan (ligne qui balaie) · fondu · glissement ; « auto » = fondu si un personnage est à l'écran (le scan le couperait).
// Formats d'image : 9:16 PAR DÉFAUT (1080 × 1920, Reels : zone utile y 250–1560) ; 16:9 (1920 × 1080) en adaptation via ?ratio=16x9.
// TOUT est fonction de t (lib/moteur.js : ezAller(t) exact, export MP4 image par image) : aucune minuterie, aucune animation CSS.
// Garde-fous (garde-fous.js) revérifiés dans la page ; règle de lecture vérifiée par lib/cartons.js ; erreur → export refusé.
// URL : reel.html?reel=<id>[&ratio=9x16][&format=site][&palette=clair][&dev][&image=300]
(function () {
  'use strict';
  const P = EZ.params;
  const charger = (src) => new Promise((ok, ko) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => ko(new Error(`introuvable : ${src} (lancer node studio/html/reels/reel.mjs <id>)`)); document.head.appendChild(s); });
  const FPS = 30;
  const TYPO = { taille: 88, min: 72, interligne: 0.98, approche: '-0.035em' };

  // ------------------------------------------------ gabarits de mise en page (px). titre : { x, l, lmax, taille, ancre, y, align }
  //   ancre « centre » : bloc (kicker + titre + lead) centré sur y ; « haut » : commence à y ; « bas » : finit à y.
  const MISES = {
    '16x9': {
      W: 1920, H: 1080, marge: 96, progres: 1036,
      split: { titre: { x: 96, l: 800, lmax: 760, taille: 88, ancre: 'centre', y: 556 }, viz: [1000, 150, 824, 800] },
      'split-mention': { titre: { x: 96, l: 1180, lmax: 1180, taille: 88, ancre: 'centre', y: 556 }, viz: [1330, 250, 494, 600] },
      'visuel-plein': { titre: { x: 96, l: 1728, lmax: 1400, taille: 88, ancre: 'bas', y: 985 }, viz: [96, 100, 1728, 690], bandeau: 700 },
      'titre-geant': { titre: { x: 160, l: 1600, lmax: 1300, taille: 116, ancre: 'centre', y: 720, align: 'centre' }, viz: [735, 100, 450, 420] },
      'titre-geant-mention': { titre: { x: 160, l: 1600, lmax: 1600, taille: 96, ancre: 'centre', y: 730, align: 'centre' }, viz: [760, 100, 400, 380] },
      comparaison: { titre: { x: 96, l: 1728, lmax: 1500, taille: 88, ancre: 'haut', y: 140 }, viz: [96, 430, 816, 540], viz2: [1008, 430, 816, 540], sep: [960, 450, 960, 950] },
      etapes: { titre: { x: 96, l: 800, lmax: 760, taille: 88, ancre: 'centre', y: 420 }, viz: [1000, 110, 824, 580], frise: { x0: 190, x1: 1730, y: 850 } },
      question: { titre: { x: 96, l: 1180, lmax: 1100, taille: 88, ancre: 'haut', y: 230 }, reponse: 600, viz: [1330, 200, 494, 760] },
    },
    // 9:16 = FORMAT DE RÉFÉRENCE (Paul, 2026-09-30) : 1080 × 1920, zone utile y 250–1560 et x 72–1008 (hors interface Instagram).
    // Texte en haut (ou en bas), visuel GRAND et centré ; rien d'essentiel hors de la zone utile.
    '9x16': {
      W: 1080, H: 1920, marge: 72, progres: 1590, entete: 176,
      split: { titre: { x: 72, l: 936, lmax: 900, taille: 92, ancre: 'haut', y: 290 }, viz: [72, 720, 936, 820] },
      'split-mention': { titre: { x: 72, l: 936, lmax: 936, taille: 80, ancre: 'haut', y: 300 }, viz: [190, 820, 700, 700] },
      'visuel-plein': { titre: { x: 72, l: 936, lmax: 900, taille: 92, ancre: 'bas', y: 1555 }, viz: [40, 250, 1000, 1100], bandeau: 1180 },
      'titre-geant': { titre: { x: 72, l: 936, lmax: 880, taille: 112, ancre: 'centre', y: 1170, align: 'centre' }, viz: [215, 270, 650, 600] },
      // ADAPTATION plateforme-sante : zone de la mention élargie à la marge de 5 % (x 54 → 1026) : les mentions au titre légal
      // (« Votre pédicure-podologue », décision de Paul du 2026-10-02) dépassent 936 px à 72 px en Sora 800
      'titre-geant-mention': { titre: { x: 54, l: 972, lmax: 972, taille: 80, ancre: 'centre', y: 1200, align: 'centre' }, viz: [240, 270, 600, 580] },
      comparaison: { titre: { x: 72, l: 936, lmax: 900, taille: 88, ancre: 'haut', y: 290 }, viz: [60, 700, 470, 840], viz2: [550, 700, 470, 840], sep: [540, 720, 540, 1520] },
      etapes: { titre: { x: 72, l: 936, lmax: 900, taille: 88, ancre: 'haut', y: 290 }, viz: [72, 640, 936, 700], frise: { x0: 140, x1: 940, y: 1440 } },
      question: { titre: { x: 72, l: 936, lmax: 900, taille: 92, ancre: 'haut', y: 300 }, reponse: 720, viz: [120, 960, 840, 600] },
    },
  };

  async function demarrer() {
    const id = P.get('reel') || document.documentElement.dataset.reel;
    // ADAPTATION plateforme-sante (2026-10-05) : le reel peut être fourni directement par la page (window.EZ_REEL, générateur Node)
    if (!window.EZ_REEL) await charger(`donnees/${id}.js`);
    const R = window.EZ_REEL;
    const format = P.get('format') || R.format || 'salle';
    const site = format === 'site';
    const ratio = P.get('ratio') || R.ratio || '9x16'; // 9:16 par défaut (format de Paul) ; 16:9 = adaptation
    const G = MISES[ratio];
    if (!G) throw new Error(`ratio « ${ratio} » inconnu (16x9 | 9x16)`);
    const { W, H } = G;
    const palette = P.get('palette') || R.palette || 'plan';
    document.documentElement.dataset.palette = palette;
    document.documentElement.dataset.ratio = ratio;
    document.title = `${R.id} · ${R.titre} · ÉcranZen`;
    const scene = document.getElementById('ez-scene');
    scene.setAttribute('aria-label', R.alt || R.titre);
    scene.style.width = W + 'px'; scene.style.height = H + 'px';

    // ------------------------------------------------ garde-fous (mêmes que Node)
    const gf = EZR_GF.verifier(R, { visuels: EZR.visuels, format });
    gf.erreurs.forEach((m) => EZ.erreur('garde-fou : ' + m));
    gf.avertissements.forEach((m) => console.warn('[ÉcranZen] ' + m));
    const C = EZR_GF.chrono(R), T = C.T;

    const famille = getComputedStyle(document.documentElement).getPropertyValue('--typo').trim() || 'Sora';
    await Promise.all([`800 88px ${famille}`, '500 24px "JetBrains Mono"', `300 34px ${famille}`, `600 34px ${famille}`].map((p) => document.fonts.load(p).catch(() => null)));
    await document.fonts.ready;
    const css = getComputedStyle(document.documentElement);
    const couleurs = Object.fromEntries(['fond', 'fond-alt', 'texte', 'ligne', 'accent', 'signal', 'p1', 'p2', 'p3', 'p4', 'p5'].map((k) => [k, css.getPropertyValue('--' + k).trim()]));

    // ------------------------------------------------ mesure et coupure équilibrée des titres (jamais de mot coupé)
    const mesure = document.createElement('span');
    mesure.style.cssText = `position:absolute;left:-9999px;top:0;white-space:nowrap;font-family:${famille};font-weight:800;letter-spacing:${TYPO.approche};word-spacing:0.07em`;
    scene.appendChild(mesure);
    const largeur = (txt, taille) => { mesure.style.fontSize = taille + 'px'; mesure.textContent = txt; return mesure.getBoundingClientRect().width / (scene.getBoundingClientRect().width / W || 1); };
    const insecable = (s) => s.replace(/\s+([?:!;»])/g, ' $1').replace(/«\s+/g, '« ');
    function couper(texte, taille, lmax) {
      const motsT = insecable(texte).split(/ +/);
      const glouton = (L) => { const lignes = []; let cur = ''; for (const m of motsT) { const essai = cur ? cur + ' ' + m : m; if (cur && largeur(essai, taille) > L) { lignes.push(cur); cur = m; } else cur = essai; } if (cur) lignes.push(cur); return lignes; };
      const base = glouton(lmax);
      let a = lmax * 0.4, b = lmax; // plus petite largeur qui garde le même nombre de lignes (équilibre, « text-wrap: balance »)
      for (let k = 0; k < 14; k++) { const m = (a + b) / 2; if (glouton(m).length > base.length) a = m; else b = m; }
      return glouton(b);
    }
    function composer(texte, lignesImposees, Z) { // → { lignes, taille, inter } ; taille réduite (≥ 72) si une ligne dépasse
      let taille = Z.taille, lignes = lignesImposees ? lignesImposees.map(insecable) : couper(texte, taille, Z.lmax);
      while (taille > TYPO.min && Math.max(...lignes.map((l) => largeur(l, taille))) > Z.l) { taille -= 2; if (!lignesImposees) lignes = couper(texte, taille, Z.lmax); }
      return { lignes, taille, inter: Math.round(taille * TYPO.interligne) };
    }

    // ------------------------------------------------ en-tête, scan, progression (globaux, DÉCOR : data-decor, ≤ 60 %)
    const couche = (cls, parent = scene) => { const d = document.createElement('div'); d.className = cls; parent.appendChild(d); return d; };
    const decor = (d) => { d.dataset.decor = '1'; d.setAttribute('aria-hidden', 'true'); return d; };
    const entete = decor(couche('rl-entete')); entete.style.opacity = '0.6'; entete.style.left = entete.style.right = G.marge + 'px'; if (G.entete) entete.style.top = G.entete + 'px';
    // ADAPTATION plateforme-sante : personnalisation au cabinet (window.EZ_IDENTITE) — son nom remplace la marque ÉcranZen (décor)
    entete.innerHTML = window.EZ_IDENTITE ? '<div class="rl-marque"></div>' : '<div class="rl-marque">Ecran<span>Zen</span></div>';
    if (window.EZ_IDENTITE) entete.firstChild.textContent = window.EZ_IDENTITE.nom;
    const sujet = couche('rl-sujet', entete); sujet.textContent = R.titre || '';
    const scan = couche('rl-scan');
    const progres = decor(couche('rl-progres')); Object.assign(progres.style, { left: G.marge + 'px', right: G.marge + 'px', top: G.progres + 'px', bottom: 'auto' });
    const segs = R.scenes.map(() => { const i = document.createElement('i'); const b = document.createElement('b'); i.appendChild(b); progres.appendChild(i); return b; });
    const courbeScan = EZ.bezier(0.65, 0, 0.35, 1);
    const courbeTexte = EZ.bezier(0.2, 0.7, 0.2, 1);
    const NS = 'http://www.w3.org/2000/svg';

    // ------------------------------------------------ couches de scènes
    const scenes = R.scenes.map((s, i) => {
      const c = C.scenes[i];
      const div = couche('rl-couche'); div.dataset.scene = String(i + 1); div.dataset.mise = c.mise;
      const L = G[s.mention && G[c.mise + '-mention'] ? c.mise + '-mention' : c.mise];
      const Z = L.titre, centre = Z.align === 'centre';
      const ctx = { format, site, couleurs, duree: c.images / FPS, scene: i, reel: R, ratio };
      // bandeau (visuel plein) : dégradé de fond sous le titre, décor
      if (L.bandeau) { const b = couche('rl-bandeau', div); b.style.top = L.bandeau + 'px'; }
      // visuels (1, ou 2 en comparaison)
      const vizs = [];
      for (const [v, box] of [[s.visuel, L.viz], [s.visuel_b, L.viz2]]) {
        const def = v && EZR.visuels[v.type];
        if (!def || !box) continue;
        const [x, y, l, h] = box;
        const d = couche('rl-viz', div); Object.assign(d.style, { left: x + 'px', top: y + 'px', width: l + 'px', height: h + 'px' });
        let inst = null;
        try { inst = def.construire({ div: d, l, h }, { ...EZR_GF.defauts(def), ...v }, ctx); } catch (e) { EZ.erreur(`scène ${i + 1} : visuel ${v.type} : ${e.message}`); }
        vizs.push({ def, inst });
      }
      // comparaison : séparateur + étiquettes (décor mono, 60 %)
      const etiqs = [];
      if (L.sep) {
        const sep = couche('rl-sep', div); Object.assign(sep.style, { left: L.sep[0] + 'px', top: L.sep[1] + 'px', height: L.sep[3] - L.sep[1] + 'px' });
        (s.etiquettes || []).forEach((t, k) => { const box = [L.viz, L.viz2][k]; const e = decor(couche('rl-kicker', div)); e.textContent = t; Object.assign(e.style, { left: box[0] + 'px', width: box[2] + 'px', top: box[1] - 44 + 'px', textAlign: 'center' }); etiqs.push(e); });
      }
      // titre (ou mention) + réponse
      const T1 = composer(s.titre, s.mention ? s.lignes_mention || [] : null, Z);
      let lead = null, hLead = 0;
      if (s.sous_texte && site && !['comparaison', 'visuel-plein', 'question'].includes(c.mise)) {
        lead = couche('rl-lead', div); lead.style.width = Math.min(Z.l, 700) + 'px'; lead.style.left = (centre ? Z.x + (Z.l - Math.min(Z.l, 700)) / 2 : Z.x) + 'px'; if (centre) lead.style.textAlign = 'center';
        lead.innerHTML = String(s.sous_texte).replace(/[<>&]/g, (m) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[m]).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        hLead = lead.getBoundingClientRect().height / (scene.getBoundingClientRect().width / W || 1) + 28;
      }
      const hKick = s.kicker ? 32 + 28 : 0, hTitre = T1.lignes.length * T1.inter, hBloc = hKick + hTitre + hLead;
      const haut = Math.round(Z.ancre === 'centre' ? Z.y - hBloc / 2 : Z.ancre === 'bas' ? Z.y - hBloc : Z.y);
      let kick = null;
      if (s.kicker) { kick = decor(couche('rl-kicker', div)); kick.textContent = s.kicker; Object.assign(kick.style, { left: Z.x + 'px', top: haut + 'px', width: Z.l + 'px', textAlign: centre ? 'center' : 'left' }); }
      const yTitre = haut + hKick;
      if (lead) lead.style.top = yTitre + hTitre + 28 + 'px';
      const textes = couche('rl-textes', div); textes.style.cssText = 'position:absolute;inset:0;pointer-events:none';
      const fmt = (z, y, h, t) => ({ '16x9': { zone: [z.x, y, z.l, h], taille: t.taille, interligne: t.inter, taille_fixe: true, alignement: centre ? 'centre' : 'gauche' } });
      const doc = { textes: [{ ref: s.mention || `S${i + 1}`, role: s.mention ? 'mention' : 'titre', mention: s.mention || undefined, lignes: T1.lignes, graisse: 'bold', couleur: 'texte', filet: false,
        formats: fmt(Z, yTitre, hTitre, T1), entree: c.cartons[0].entree, sortie: c.cartons[0].sortie }] };
      if (c.cartons[1]) {
        const T2 = composer(s.reponse, null, Z);
        const remplace = c.cartons[0].sortie <= c.cartons[1].entree; // la question est sortie : la réponse prend sa place
        doc.textes.push({ ref: `S${i + 1}r`, role: 'reponse', lignes: T2.lignes, graisse: 'bold', couleur: 'accent', filet: false,
          formats: fmt(Z, remplace ? yTitre : L.reponse, T2.lignes.length * T2.inter, T2), entree: c.cartons[1].entree, sortie: c.cartons[1].sortie });
      }
      // courbe d'entrée des cartons (clé « animation » du format de textes, posée par crochets : controler.mjs y verrait du CSS)
      doc['animation'] = { entree: { images: T.entree, montee_px: 18 }, sortie: { images: T.fondu }, courbe: [0.2, 0.7, 0.2, 1] };
      const cartons = EZ.cartons(textes, doc, { markers: {}, format: '16x9', fps: FPS, images: C.images, largeur: W, filet: false, typo: { famille: true, approche: TYPO.approche } });
      if (centre) for (const it of cartons.items) for (const sp of it.div.querySelectorAll('span')) { sp.style.marginLeft = 'auto'; sp.style.marginRight = 'auto'; }
      // frise d'étapes : ronds reliés ; passés = pleins, actif = grand anneau + numéro (texte ≥ 72 px), à venir = creux
      let frise = null;
      if (L.frise && Array.isArray(s.etape)) {
        const [k, tot] = s.etape, F = L.frise;
        const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.classList.add('rl-frise'); div.appendChild(svg);
        const mk = (tag, a) => { const e = document.createElementNS(NS, tag); for (const [x, v] of Object.entries(a)) e.setAttribute(x, v); svg.appendChild(e); return e; };
        const xs = Array.from({ length: tot }, (_, j) => F.x0 + ((F.x1 - F.x0) * j) / (tot - 1));
        const base = mk('line', { x1: xs[0], y1: F.y, x2: xs[0], y2: F.y, class: 'v-croix', style: 'stroke-width:3' });
        const fait = mk('line', { x1: xs[0], y1: F.y, x2: xs[0], y2: F.y, class: 'v-accent-trait', style: 'stroke-width:5' });
        const ronds = xs.map((x, j) => mk('circle', { cx: x, cy: F.y, r: 22, class: j + 1 < k ? 'v-accent' : 'v-noeud', style: j + 1 < k ? '' : 'stroke-width:3' }));
        const actif = mk('circle', { cx: xs[k - 1], cy: F.y, r: 58, class: 'v-noeud', style: 'stroke:var(--accent);stroke-width:5;fill:var(--fond-alt)' });
        const num = couche('rl-num', div); num.textContent = String(k);
        Object.assign(num.style, { left: xs[k - 1] - 60 + 'px', top: F.y - 38 + 'px', width: '120px' });
        frise = { xs, base, fait, ronds, actif, num, k };
      }
      return { s, c, div, kick, lead, etiqs, cartons, vizs, ctx, frise };
    });
    scene.appendChild(scan); scene.appendChild(progres); scene.appendChild(entete); mesure.remove();

    // ------------------------------------------------ rendu d'une image (f flottante) : ne pose QUE des attributs
    const n = scenes.length;
    const ent = (f, a, sortie, d = T.entree) => { if (f < a || f >= sortie) return [0, 18]; const u = courbeTexte(Math.min(1, (f - a) / d)); let op = u; const s = (f - (sortie - T.fondu + 1)) / T.fondu; if (s > 0) op *= 1 - Math.min(1, s); return [op, 18 * (1 - u)]; };
    const poser = (o, [op, dy], k = 1) => { if (!o) return; o.style.opacity = (k * op).toFixed(4); o.style.transform = dy ? `translateY(${dy.toFixed(2)}px)` : 'none'; };
    function rendu(f) {
      let i = 0; for (let k = 0; k < n; k++) if (f >= C.scenes[k].debut) i = k;
      const ci = C.scenes[i];
      const scanDebut = ci.fin - T.scan;
      const j = f >= scanDebut ? (i + 1) % n : -1;
      const u = j >= 0 ? (f - scanDebut) / T.scan : 0, ue = courbeScan(u);
      const mode = j >= 0 ? C.scenes[j].passage : null;
      scenes.forEach((S, k) => {
        const vis = k === i || k === j;
        S.div.style.display = vis ? '' : 'none';
        if (!vis) return;
        const entre = k === j;
        S.div.style.zIndex = entre ? '3' : '2';
        S.div.style.clipPath = entre && mode === 'scan' ? `inset(0 0 ${((1 - ue) * 100).toFixed(3)}% 0)` : '';
        S.div.style.opacity = entre && mode === 'fondu' ? EZ.courbes.douce(u).toFixed(4) : ''; // hors passage : propriétés retirées (rendu identique quel que soit l'historique)
        S.div.style.transform = mode === 'glissement' ? `translateX(${((entre ? 1 - ue : -ue) * W).toFixed(2)}px)` : '';
        // temps local : pendant son passage d'entrée, la scène suivante a un temps NÉGATIF (≥ −1 s)
        const tau = entre ? (f - ci.fin) / FPS : (f - S.c.debut) / FPS;
        for (const V of S.vizs) if (V.inst) V.def.rendre(V.inst, tau, S.ctx);
        const fk = entre ? f - ci.fin : f - S.c.debut; // image locale
        const fin = S.c.titreSortie - S.c.debut;
        poser(S.kick, ent(fk, T.kicker, fin), 0.6);
        for (const e of S.etiqs) poser(e, ent(fk, T.kicker + 12, fin), 0.6);
        poser(S.lead, ent(fk, T.titre + 7, fin));
        if (S.frise) {
          const Fz = S.frise, o = (a, d) => Math.max(0, Math.min(1, (fk / FPS - a) / d)), e = EZ.courbes.standard;
          const xl = Fz.xs[0] + (Fz.xs[Fz.xs.length - 1] - Fz.xs[0]) * e(o(0.2, 0.9));
          Fz.base.setAttribute('x2', xl.toFixed(1));
          Fz.fait.setAttribute('x2', (Fz.xs[0] + (Fz.xs[Fz.k - 1] - Fz.xs[0]) * e(o(0.9, 0.8))).toFixed(1));
          Fz.ronds.forEach((r, q) => r.setAttribute('opacity', e(o(0.3 + q * 0.12, 0.3)).toFixed(3)));
          const a = e(o(1.5, 0.5));
          Fz.actif.setAttribute('r', (58 * (0.6 + 0.4 * a)).toFixed(2)); Fz.actif.setAttribute('opacity', a.toFixed(3));
          poser(Fz.num, ent(fk, 50, fin, 15));
        }
      });
      for (const S of scenes) S.cartons.rendre(f);
      // ligne de scan (passage « scan » seulement)
      if (j >= 0 && mode === 'scan') { scan.style.opacity = (u < 0.95 ? 1 : Math.max(0, (1 - u) / 0.05)).toFixed(3); scan.style.top = (ue * H - 1).toFixed(2) + 'px'; }
      else scan.style.opacity = '0';
      // progression (vidée pendant le passage de bouclage vers la scène 1)
      segs.forEach((b, k) => { const c = C.scenes[k]; b.style.transform = `scaleX(${Math.max(0, Math.min(1, (f - c.debut) / (c.fin - c.debut))).toFixed(4)})`; });
      progres.style.opacity = (j === 0 ? 1 - ue : 1).toFixed(4);
      // ADAPTATION plateforme-sante : le nom du cabinet n’est jamais à côté de la mention (référentiel éthique) : en-tête effacé
      // pendant la scène mention, en fondu pendant les passages qui l’encadrent
      if (window.EZ_IDENTITE) { const mi = !!R.scenes[i].mention, mj = j >= 0 && !!R.scenes[j].mention; entete.style.opacity = (0.6 * (mi ? (j >= 0 ? ue : 0) : mj ? 1 - ue : 1)).toFixed(4); }
    }
    EZ.scene({ id: R.id, images: C.images, fps: FPS, largeur: W, hauteur: H, rendu,
      polices: [`800 88px ${famille}`], pret: () => { window.ezLecture = scenes.flatMap((S) => S.cartons.verifier()); } });
    window.ezReel = { id: R.id, chrono: C, garde_fous: gf, format, palette, ratio };
    return window.ezPret;
  }
  let ok, ko; window.ezPret = new Promise((a, b) => { ok = a; ko = b; });
  demarrer().then((r) => ok(r)).catch((e) => { EZ.erreur(e.message); ko(e); });
})();
