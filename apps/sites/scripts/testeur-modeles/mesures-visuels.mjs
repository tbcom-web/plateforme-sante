// Mesures des VISUELS dans le navigateur (testeur de modèles, contrôles « cadrage » et « coherence » ; générateur des cadrages des
// dessins, mesurer-cadrages-dessins.mjs). Retour de Paul du 2026-10-10 : « Tu as mis vert alors que les images ne sont pas centrées
// dans leurs cases… » (cartes de soins : dessins coupés en haut, collés au bord inférieur).
//
// `mesurerVisuels` est exécutée DANS la page (page.evaluate) : elle doit rester autonome (aucune variable extérieure).
// Géométrie, pas pixels : boîte de chaque élément dessiné (path, circle, use…) à l'écran, découpée par ses clip-path, par les
// fenêtres des <svg> (overflow) et par les ancêtres HTML qui masquent leur débordement. On obtient ainsi, pour chaque dessin posé
// dans une case : la boîte de TOUT le tracé (même hors de la case) et la boîte de ce qui se VOIT ; le jugement (coupé, décentré)
// est fait par le core (defautCadrage, testeur-modeles.ts), testé sans navigateur.
// Les décisions de coupe se font sur la géométrie (sans l'épaisseur des traits) : un trait de 1,5 px ne change pas un verdict à 4 %.

/**
 * @param {{ mode?: 'page' | 'repere' }} [o]
 *   page : visuels des cases de la page (svg des dessins, illustrations), images étirées, cartes sœurs incohérentes ;
 *   repere : chaque `[data-repere] > svg` mesuré dans son parent (générateur des cadrages, repère 240 × 180).
 */
export function mesurerVisuels(o = {}) {
  const mode = o.mode ?? 'page';
  const sy = window.scrollY, sx = window.scrollX;
  const B = (r) => ({ x: r.left, y: r.top, d: r.right, b: r.bottom });
  const inter = (a, b) => (a && b ? { x: Math.max(a.x, b.x), y: Math.max(a.y, b.y), d: Math.min(a.d, b.d), b: Math.min(a.b, b.b) } : a ?? b);
  const valide = (a) => a && a.d - a.x >= -0.01 && a.b - a.y >= -0.01 && (a.d - a.x > 0.01 || a.b - a.y > 0.01);
  const unir = (a, b) => (!a ? b : !b ? a : { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), d: Math.max(a.d, b.d), b: Math.max(a.b, b.b) });
  const page = (a) => (a ? { x: a.x + sx, y: a.y + sy, d: a.d + sx, b: a.b + sy } : null);
  const arrondi = (a) => (a ? Object.fromEntries(Object.entries(a).map(([k, v]) => [k, Math.round(v * 10) / 10])) : null);
  const selecteur = (e) => {
    const sec = e.closest('[data-section], [data-zone], section[id], header, footer, nav, main');
    const local = `${e.tagName.toLowerCase()}${e.id ? `#${e.id}` : ''}${[...e.classList].slice(0, 2).map((c) => `.${c}`).join('')}`;
    const tete = sec && sec !== e ? (sec.dataset?.section ? `[data-section=${sec.dataset.section}]` : sec.dataset?.zone ? `[data-zone=${sec.dataset.zone}]` : sec.id ? `${sec.tagName.toLowerCase()}#${sec.id}` : sec.tagName.toLowerCase()) : '';
    return `${tete ? `${tete} ` : ''}${local}`.slice(0, 160);
  };
  /** Rectangle (repère de l'élément SVG) → boîte à l'écran, par sa matrice écran */
  const ecran = (el, x, y, l, h) => {
    const m = el.getScreenCTM?.();
    if (!m) return null;
    const pts = [[x, y], [x + l, y], [x, y + h], [x + l, y + h]].map(([a, b]) => [m.a * a + m.c * b + m.e, m.b * a + m.d * b + m.f]);
    return { x: Math.min(...pts.map((p) => p[0])), y: Math.min(...pts.map((p) => p[1])), d: Math.max(...pts.map((p) => p[0])), b: Math.max(...pts.map((p) => p[1])) };
  };
  const NON_RENDUS = 'defs, clipPath, mask, symbol, pattern, marker, linearGradient, radialGradient, filter, title, desc, metadata, style, script, foreignObject';
  const FEUILLES = 'path, circle, ellipse, line, polyline, polygon, rect, image, use, text';
  /** Zone de découpe d'un clip-path (url(#id)) posé sur l'élément ou un ancêtre jusqu'à la racine du dessin */
  const decoupe = (el, racine) => {
    let zone = null;
    for (let x = el; x && x !== racine.parentElement; x = x.parentElement) {
      const cp = getComputedStyle(x).clipPath;
      const m = cp && cp !== 'none' ? cp.match(/url\(["']?#([^"')]+)["']?\)/) : null;
      if (!m) continue;
      const c = document.getElementById(m[1]);
      if (!c) continue;
      let u = null;
      for (const k of c.children) {
        try { const b = k.getBBox(); u = unir(u, ecran(x, b.x, b.y, b.width, b.height)); } catch { /* forme sans boîte */ }
      }
      if (u) zone = inter(zone, u);
    }
    return zone;
  };
  /** Fenêtres qui masquent le tracé : <svg> (overflow ≠ visible) et ancêtres HTML qui masquent leur débordement, jusqu'à `jusque` */
  const fenetres = (el, racine, jusque) => {
    let zone = null;
    for (let x = el.parentElement; x; x = x.parentElement) {
      const s = getComputedStyle(x);
      const masque = s.overflowX !== 'visible' || s.overflowY !== 'visible';
      if (x.namespaceURI === 'http://www.w3.org/2000/svg' && x.tagName.toLowerCase() === 'svg') {
        if (masque) {
          if (x === racine || !(x.parentElement instanceof SVGGraphicsElement)) zone = inter(zone, B(x.getBoundingClientRect()));
          else {
            // <svg> imbriqué : sa fenêtre x, y, width, height dans le repère de son parent
            const g = (n) => { try { return x[n].baseVal.value; } catch { return 0; } };
            const l = g('width') || 0, h = g('height') || 0;
            if (l > 0 && h > 0) zone = inter(zone, ecran(x.parentElement, g('x'), g('y'), l, h));
          }
        }
      } else if (masque) zone = inter(zone, B(x.getBoundingClientRect()));
      if (x === jusque) break;
    }
    return zone;
  };
  const visibleDans = (el, racine) => {
    for (let x = el; x && x !== racine.parentElement; x = x.parentElement) {
      const s = getComputedStyle(x);
      if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) < 0.05) return false;
    }
    return true;
  };
  /** Boîtes du tracé d'un <svg> : `tout` (géométrie, découpée par les clip-path seulement) et `visible` (et par les fenêtres) */
  const traceDe = (racine, jusque) => {
    let tout = null, visible = null, n = 0;
    const feuilles = [...racine.querySelectorAll(FEUILLES)].filter((f) => !f.closest(NON_RENDUS) && visibleDans(f, racine));
    // Feuilles imbriquées dans un <use> déjà compté : impossible (les <use> internes pointent vers des <symbol>/<defs>)
    const cacheFenetres = new Map();
    for (const f of feuilles.slice(0, 4000)) {
      const r = f.getBoundingClientRect();
      if (r.width <= 0 && r.height <= 0) continue;
      let b = B(r);
      const cp = decoupe(f, racine);
      if (cp) { b = inter(b, cp); if (!valide(b)) continue; }
      n++;
      tout = unir(tout, b);
      const parent = f.parentElement;
      if (!cacheFenetres.has(parent)) cacheFenetres.set(parent, fenetres(f, racine, jusque));
      const v = inter(b, cacheFenetres.get(parent));
      if (valide(v)) visible = unir(visible, v);
    }
    return { tout, visible, feuilles: n };
  };

  if (mode === 'repere') {
    return [...document.querySelectorAll('[data-repere] > svg')].map((svg) => {
      const cadre = B(svg.parentElement.getBoundingClientRect());
      const t = traceDe(svg, svg.parentElement);
      const rel = (a) => (a ? { x: a.x - cadre.x, y: a.y - cadre.y, d: a.d - cadre.x, b: a.b - cadre.y } : null);
      return { cle: svg.parentElement.dataset.repere, tout: arrondi(rel(t.tout)), visible: arrondi(rel(t.visible)), feuilles: t.feuilles };
    });
  }

  // ———— Cases (cadres) des visuels ————
  /** Bord visible : fond coloré ou image, ombre, bordure (une case se voit) */
  const bordVisible = (s) => {
    const fond = s.backgroundColor.match(/rgba?\(([\d.]+)[, ]+([\d.]+)[, ]+([\d.]+)(?:[, /]+([\d.]+))?/);
    const alpha = fond ? (fond[4] === undefined ? 1 : Number(fond[4])) : 0;
    return alpha > 0.05 || s.backgroundImage !== 'none' || s.boxShadow !== 'none' || ['Top', 'Right', 'Bottom', 'Left'].some((c) => parseFloat(s[`border${c}Width`]) > 0 && s[`border${c}Style`] !== 'none');
  };
  /** Une case ne contient QUE le visuel : aucun texte visible hors du <svg> (sinon c'est une carte, pas la case du dessin) */
  const sansTexte = (e, svg) => {
    const m = document.createTreeWalker(e, NodeFilter.SHOW_TEXT);
    for (let n = m.nextNode(); n; n = m.nextNode()) if (n.data.trim() && !svg.contains(n) && !n.parentElement.closest('svg, style, script, noscript')) return false;
    return true;
  };
  const caseDe = (svg) => {
    const rs = svg.getBoundingClientRect();
    let x = svg.parentElement;
    for (let k = 0; x && k < 5; k++, x = x.parentElement) {
      const r = x.getBoundingClientRect();
      if (r.width > rs.width * 2.6 + 8 || r.height > rs.height * 2.6 + 8) return null;
      // La case est celle DU visuel : il en occupe au moins la moitié dans chaque sens (sinon c'est un fond de section, un héros)
      if (bordVisible(getComputedStyle(x))) return sansTexte(x, svg) && rs.width >= r.width * 0.5 && rs.height >= r.height * 0.5 ? x : null;
    }
    return null;
  };
  const visibleHtml = (e) => {
    if (e.checkVisibility && !e.checkVisibility({ contentVisibilityAuto: true, visibilityProperty: true, opacityProperty: true })) return false;
    const r = e.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const vus = new Set();
  const cadrages = [];
  const candidats = document.querySelectorAll('svg.dessin, .vt > svg, .ap-svg > svg, [class*="visuel"] > svg, [class*="dessin"] > svg, [class*="illustration"] > svg');
  for (const svg of candidats) {
    if (vus.has(svg) || svg.parentElement?.closest('svg')) continue;
    vus.add(svg);
    if (!visibleHtml(svg)) continue;
    const rs = svg.getBoundingClientRect();
    if (rs.width < 40 || rs.height < 30) continue; // pictos : hors sujet
    const c = caseDe(svg);
    if (!c) continue;
    const t = traceDe(svg, c);
    if (!t.tout || !t.visible || t.feuilles === 0) continue;
    const nom = [...svg.classList].find((k) => /^dessin--/.test(k) && !/^dessin--(releve|pedagogique|ligne)$/.test(k))?.slice(8) ?? (svg.closest('.vt--heros') ? 'illustration du sujet' : 'illustration');
    cadrages.push({
      selecteur: selecteur(c), dessin: nom,
      cadre: arrondi(page(B(c.getBoundingClientRect()))), svg: arrondi(page(B(rs))), tout: arrondi(page(t.tout)), visible: arrondi(page(inter(t.visible, B(c.getBoundingClientRect())))),
    });
    if (cadrages.length >= 120) break;
  }

  // ———— Images étirées (object-fit: fill, rapport largeur / hauteur différent de l'image) ————
  const etirees = [];
  for (const i of document.images) {
    if (!i.complete || !i.naturalWidth || !i.naturalHeight || !visibleHtml(i)) continue;
    const r = i.getBoundingClientRect();
    if (r.width < 24 || r.height < 24 || /\.svg(\?|$)/i.test(i.currentSrc || i.src)) continue;
    const s = getComputedStyle(i);
    const src = (i.currentSrc || i.src).split('/').pop()?.slice(0, 80) ?? '';
    // Image agrandie (floue) : fichier servi plus petit que sa place à l'écran (object-fit cover : le côté qui remplit)
    const naturel = i.naturalWidth / i.naturalHeight, rendu = r.width / r.height;
    const besoin = s.objectFit === 'cover' ? Math.max(r.width / i.naturalWidth, r.height / i.naturalHeight) : s.objectFit === 'contain' ? Math.min(r.width / i.naturalWidth, r.height / i.naturalHeight) : Math.max(r.width / i.naturalWidth, r.height / i.naturalHeight);
    const agrandie = besoin * (window.devicePixelRatio || 1);
    if (agrandie > 1.25 && r.width >= 120) etirees.push({ type: 'agrandie', selecteur: selecteur(i), src, ecart: Math.round(agrandie * 100) / 100, boite: arrondi(page(B(r))) });
    if (s.objectFit !== 'fill') continue;
    const ecart = Math.abs(rendu / naturel - 1);
    if (ecart > 0.03) etirees.push({ type: 'etiree', selecteur: selecteur(i), src, ecart: Math.round(ecart * 1000) / 1000, boite: arrondi(page(B(r))) });
  }

  // ———— Cartes sœurs d'une même rangée : hauteur, taille et position du visuel, alignement du texte ————
  const soeurs = [];
  const parents = new Set();
  for (const e of document.querySelectorAll('ul > li, ol > li, [class*="grille"] > *, [class*="cartes"] > *, [class*="blocs"] > *')) if (e.parentElement) parents.add(e.parentElement);
  const premierVisuel = (e) => [...e.querySelectorAll('img, svg, [class*="visuel"], [class*="dessin"]')].find((v) => { if (!visibleHtml(v)) return false; const r = v.getBoundingClientRect(); return r.width >= 32 && r.height >= 24 && !v.parentElement.closest('svg'); });
  const premierTexte = (e) => {
    const m = document.createTreeWalker(e, NodeFilter.SHOW_TEXT);
    for (let n = m.nextNode(); n; n = m.nextNode()) if (n.data.trim().length > 2 && !n.parentElement.closest('svg, style, script, noscript, [aria-hidden="true"]') && visibleHtml(n.parentElement)) return n.parentElement;
    return null;
  };
  for (const p of parents) {
    if (!visibleHtml(p)) continue;
    const s = getComputedStyle(p);
    if (!/grid|flex/.test(s.display)) continue;
    const enfants = [...p.children].filter((c) => visibleHtml(c) && c.getBoundingClientRect().width >= 120);
    // Rangées : mêmes balise et classes, même haut (± 2 px)
    const groupes = new Map();
    for (const c of enfants) {
      const r = c.getBoundingClientRect();
      const cle = `${c.tagName}|${c.className}|${Math.round(r.top / 3)}`;
      if (!groupes.has(cle)) groupes.set(cle, []);
      groupes.get(cle).push(c);
    }
    for (const g of groupes.values()) {
      if (g.length < 2) continue;
      const cartes = g.map((c) => {
        const r = c.getBoundingClientRect();
        const v = premierVisuel(c);
        const rv = v?.getBoundingClientRect();
        const t = premierTexte(c);
        return { boite: page(B(r)), h: r.height, l: r.width, visuel: rv ? { l: rv.width, h: rv.height, dy: rv.top - r.top, dx: rv.left - r.left, balise: v.tagName.toLowerCase() } : null, aligne: t ? getComputedStyle(t).textAlign.replace(/^start$/, 'left').replace(/^end$/, 'right') : null, texte: (t?.textContent ?? '').trim().slice(0, 40) };
      });
      soeurs.push({ selecteur: selecteur(p), cartes: cartes.map((c) => ({ ...c, boite: arrondi(c.boite) })) });
      if (soeurs.length >= 60) break;
    }
  }
  return { cadrages, etirees: etirees.slice(0, 40), soeurs };
}
