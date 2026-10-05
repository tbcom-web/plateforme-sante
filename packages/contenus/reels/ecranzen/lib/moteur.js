/* COPIE conforme du studio ÉcranZen (TBCOM CLAUDE/ecranzen/studio/html, 2026-10-05), reprise autorisée par Paul : ne pas modifier ici, recopier depuis ÉcranZen. Voir docs/moteur-contenus.md (§ Reels). */
// MOTEUR — ligne de temps DÉTERMINISTE pilotée par t (secondes). html/lib/moteur.js (sans dépendance, file:// compatible).
//
//   EZ.scene({ id, images: 1072, fps: 30, largeur: 1920, hauteur: 1080, rendu(f, t) { … } })
//     rendu(f, t) : dessine l'image EXACTE au temps t (f = t × fps, image flottante). Il ne lit JAMAIS l'horloge : tout dépend de f.
//   window.ezAller(t)  → rend l'image à t (s) puis résout après 2 rAF (export MP4 image par image, planches).
//   window.ezPret      → Promise résolue quand polices + scène sont prêtes (le capteur l'attend).
//   Lecture temps réel en boucle sinon. Paramètres d'URL : ?t=12.3 (image figée) · ?image=300 · ?dev (timecode, erreurs visibles)
//     · ?theme=contraste · ?style=classique (rendu Lottie à plat au lieu du style D) · ?export (aucune lecture automatique).
//
// Courbes (mêmes que la grammaire §5, bezier CSS) : EZ.courbes.standard (0.4,0,0.2,1) · sortie (0,0,0.2,1) · entree (0.4,0,1,1)
//   · douce (0.45,0,0.55,1) · lineaire. EZ.cle(f, [[f0, v0], [f1, v1, 'courbe'], …]) : interpolation par segments (nombres ou
//   tableaux), maintien avant la 1re et après la dernière clé ; la courbe d'une clé s'applique au segment qui y ARRIVE.
(function () {
  'use strict';
  function bezier(x1, y1, x2, y2) {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const X = (u) => ((ax * u + bx) * u + cx) * u, Y = (u) => ((ay * u + by) * u + cy) * u, dX = (u) => (3 * ax * u + 2 * bx) * u + cx;
    return (x) => {
      if (x <= 0) return 0; if (x >= 1) return 1;
      let u = x;
      for (let i = 0; i < 8; i++) { const e = X(u) - x, d = dX(u); if (Math.abs(e) < 1e-7) break; if (Math.abs(d) < 1e-6) break; u -= e / d; }
      if (u < 0 || u > 1 || Math.abs(X(u) - x) > 1e-5) { let a = 0, b = 1; u = x; for (let i = 0; i < 40; i++) { if (X(u) < x) a = u; else b = u; u = (a + b) / 2; } }
      return Y(u);
    };
  }
  const courbes = {
    lineaire: (x) => Math.min(1, Math.max(0, x)),
    standard: bezier(0.4, 0, 0.2, 1),
    sortie: bezier(0, 0, 0.2, 1),
    entree: bezier(0.4, 0, 1, 1),
    douce: bezier(0.45, 0, 0.55, 1),
    maintien: () => 0,
  };
  const mix = (a, b, u) => (Array.isArray(a) ? a.map((v, i) => v + (b[i] - v) * u) : a + (b - a) * u);
  function cle(f, cles) {
    if (f <= cles[0][0]) return cles[0][1];
    for (let i = 1; i < cles.length; i++) {
      const [f1, v1, c] = cles[i], [f0, v0] = cles[i - 1];
      if (f < f1) return mix(v0, v1, (courbes[c || 'standard'] || courbes.standard)((f - f0) / (f1 - f0)));
    }
    return cles[cles.length - 1][1];
  }
  const params = new URLSearchParams(location.search);
  const dev = params.has('dev');
  const erreurs = [];
  function erreur(m) {
    erreurs.push(m); console.error('[ÉcranZen] ' + m);
    if (!dev) return;
    let b = document.getElementById('ez-erreurs');
    if (!b) { b = document.createElement('div'); b.id = 'ez-erreurs'; b.style.cssText = 'position:fixed;left:0;right:0;top:0;z-index:99;background:#B00020;color:#fff;font:600 15px/1.4 system-ui,sans-serif;padding:10px 16px;white-space:pre-wrap'; document.body.appendChild(b); }
    b.textContent = erreurs.map((e) => '✗ ' + e).join('\n');
  }

  function scene(o) {
    const fps = o.fps || 30, W = o.largeur || 1920, H = o.hauteur || 1080, duree = o.images / fps;
    const root = document.documentElement;
    if (params.get('theme')) root.dataset.theme = params.get('theme');
    const scene = document.getElementById('ez-scene');
    scene.style.width = W + 'px'; scene.style.height = H + 'px';
    if (params.get('style') === 'classique') scene.classList.remove('style-d');
    // Mise à l'échelle 16:9 dans la fenêtre (bandes de la couleur du fond)
    function ajuster() {
      const k = Math.min(innerWidth / W, innerHeight / H);
      scene.style.transform = `translate(${(innerWidth - W * k) / 2}px, ${(innerHeight - H * k) / 2}px) scale(${k})`;
    }
    addEventListener('resize', ajuster); ajuster();
    let tc = null;
    if (dev) { tc = document.createElement('div'); tc.style.cssText = 'position:fixed;right:8px;bottom:8px;z-index:98;font:600 14px/1 ui-monospace,monospace;background:rgba(0,0,0,.55);color:#fff;padding:6px 8px;border-radius:4px'; document.body.appendChild(tc); }
    let courant = -1;
    function rendre(t) {
      t = ((t % duree) + duree) % duree;
      const f = t * fps;
      o.rendu(f, t);
      courant = t;
      if (tc) tc.textContent = `${t.toFixed(2)} s · image ${f.toFixed(1)}`;
    }
    let lecture = null;
    function jouer() {
      const t0 = performance.now() - Math.max(0, courant) * 1000;
      const boucle = (now) => { rendre((now - t0) / 1000); lecture = requestAnimationFrame(boucle); };
      lecture = requestAnimationFrame(boucle);
    }
    const polices = document.fonts ? Promise.all((o.polices || []).map((p) => document.fonts.load(p).catch(() => null))).then(() => document.fonts.ready) : Promise.resolve();
    window.ezRendreSync = (t) => rendre(t);
    window.ezDuree = duree; window.ezFps = fps; window.ezImages = o.images; window.ezErreurs = erreurs;
    window.ezPret = polices.then(() => (o.pret ? o.pret() : null)).then(() => {
      const figer = params.has('t') ? +params.get('t') : params.has('image') ? +params.get('image') / fps : null;
      rendre(figer ?? 0);
      if (figer === null && !params.has('export')) jouer();
      return { duree, fps, images: o.images, erreurs: erreurs.slice() };
    });
    window.ezAller = (t) => {
      if (lecture) { cancelAnimationFrame(lecture); lecture = null; }
      rendre(t);
      // 2 rAF (image peinte) ; filet de sécurité 250 ms si le navigateur étrangle rAF (plusieurs Chrome headless en parallèle)
      return new Promise((ok) => { requestAnimationFrame(() => requestAnimationFrame(() => ok(true))); setTimeout(() => ok(true), 250); });
    };
    window.ezJouer = () => { if (!lecture) jouer(); };
    return { rendre, duree, fps };
  }

  // Petits outils de dessin partagés par les scènes
  const svgNS = 'http://www.w3.org/2000/svg';
  function el(tag, attrs = {}, parent = null, html = null) {
    const e = document.createElementNS(svgNS, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    if (html !== null) e.innerHTML = html;
    if (parent) parent.appendChild(e);
    return e;
  }
  /** Instancie un élément de la bibliothèque (window.EZ_ELEMENTS) dans un <g>. */
  function element(id, parent, attrs = {}) {
    const E = window.EZ_ELEMENTS && window.EZ_ELEMENTS[id];
    if (!E) { erreur(`élément inconnu : ${id} (relancer html/outils/construire.mjs ?)`); return el('g', attrs, parent); }
    return el('g', { class: 'ez-el', 'data-el': id, ...attrs }, parent, E.markup);
  }
  const r = (v) => Math.round(v * 1000) / 1000;
  const set = (e, attrs) => { for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, typeof v === 'number' ? r(v) : v); };

  window.EZ = { scene, cle, courbes, bezier, mix, erreur, dev, params, el, element, set, r };
})();
