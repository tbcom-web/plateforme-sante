/* COPIE conforme du studio ÉcranZen (TBCOM CLAUDE/ecranzen/studio/html, 2026-10-05), reprise autorisée par Paul : ne pas modifier ici, recopier depuis ÉcranZen. Voir docs/moteur-contenus.md (§ Reels). */
// CARTONS DE TEXTE — html/lib/cartons.js. Lit un fichier de textes du studio (window.EZ_TEXTES, généré depuis
// production/<ID>/textes/<ID>.<langue>.json par html/outils/construire.mjs) : mots, coupures, zones, entrées/sorties par marker.
//
//   const cartons = EZ.cartons(conteneurHTML, EZ_TEXTES, { markers: { S1: 0, … }, format: '16x9', fps: 30, images: 1072 });
//   cartons.rendre(f)      (à appeler dans rendu(f)) : fondu-montée 18 i / 20 px à l'entrée, fondu 9 i à la sortie (fichier de textes).
//   cartons.verifier()     (appelé au chargement, après les polices) : RÈGLE DE LECTURE du studio (outils/lib/lecture.mjs, Paul
//                          2026-09-30) = 2 s + 0,5 s/mot de texte NET (hors animations d'entrée et de sortie) ; mentions figées
//                          (M1–M5, carton « Diabète : » en fin de déroulé) ≥ 6 s ; gras ≥ 72 px ; ≤ 12 mots à l'écran ; aucune
//                          ligne plus large que sa zone ; marge ≥ 5 %. Erreur → console + bandeau rouge en mode ?dev.
// La règle n'est PAS recopiée ailleurs : si outils/lib/lecture.mjs change, mettre à jour REGLE ci-dessous (même nom de champs).
(function () {
  'use strict';
  const REGLE = { base_s: 2, par_mot_s: 0.5, figee_min_s: 6, taille_min: 72, mots_max: 12, marge: 0.05 };
  const compterMots = (lignes) => lignes.join(' ').split(/[\s  ]+/).filter((m) => /[\p{L}\p{N}]/u.test(m)).length;
  const norm = (s) => s.normalize('NFC').toLocaleLowerCase('fr-FR').replace(/[’']/g, "'").replace(/\s+/g, ' ').trim();

  // options de mise en page (gabarits) : typo { taille, interligne, approche, famille }, colonne { x, l } — la zone y du fichier est gardée.
  function cartons(conteneur, doc, { markers, format = '16x9', fps = 30, images, largeur = 1920, filet = true, typo = null, colonne = null, revelation = false }) {
    const A = doc.animation || {};
    const ne = A.entree?.images ?? 18, montee = revelation ? 44 : (A.entree?.montee_px ?? 20), ns = A.sortie?.images ?? 9;
    const courbe = A.courbe ? EZ.bezier(...A.courbe) : EZ.courbes.standard;
    const img = (ref) => (ref == null ? null : typeof ref === 'number' ? ref : ref.image ?? (markers[ref.marker] + (ref.decalage || 0)));
    const items = doc.textes.filter((t) => t.formats?.[format]).map((t) => {
      const F0 = t.formats[format];
      const F = { ...F0, zone: [colonne?.x ?? F0.zone[0], F0.zone[1], colonne?.l ?? F0.zone[2], F0.zone[3]], taille: F0.taille_fixe || !typo?.taille ? F0.taille : Math.round((typo.taille * F0.taille) / 80), interligne: F0.taille_fixe || !typo?.interligne ? F0.interligne : Math.round((typo.interligne * F0.taille) / 80) };
      const div = document.createElement('div');
      div.className = 'ez-carton'; div.dataset.ref = t.ref || t.role;
      div.style.cssText = `position:absolute;left:${F.zone[0]}px;top:${F.zone[1]}px;width:${F.zone[2]}px;font-size:${F.taille}px;line-height:${F.interligne}px;font-weight:${t.graisse === 'bold' ? 700 : 400};color:var(--${t.couleur || 'texte'});${typo?.approche ? `letter-spacing:${typo.approche};` : ''}${typo?.famille ? 'font-family:var(--typo);' : ''}text-align:${F.alignement === 'centre' ? 'center' : 'left'};opacity:0;will-change:opacity,transform`;
      // filet d'accent (décor, pas du texte) : se déploie avec l'entrée du carton — rythme « affiche », token accent
      const fil = filet && t.filet !== false ? document.createElement('i') : null;
      if (fil) { fil.style.cssText = 'position:absolute;left:2px;top:-26px;height:8px;width:88px;border-radius:4px;background:var(--accent);transform-origin:0 50%'; div.appendChild(fil); }
      for (const l of t.lignes) { const s = document.createElement('span'); s.textContent = l; s.style.cssText = 'display:block;white-space:nowrap;width:max-content'; div.appendChild(s); }
      conteneur.appendChild(div);
      return { t, F, div, fil, entree: img(t.entree), sortie: img(t.sortie) ?? images, mots: compterMots(t.lignes) };
    });
    function rendre(f) {
      for (const it of items) {
        let o = 0, dy = 0;
        if (f >= it.entree && f < it.sortie) {
          const u = courbe((f - it.entree) / ne);
          o = Math.min(1, u); dy = montee * (1 - Math.min(1, u));
          // fondu de sortie : la 1re image du fondu est encore à 100 % (même décompte que lib/textes.mjs)
          const s = (f - (it.sortie - ns + 1)) / ns;
          if (s > 0) o *= 1 - Math.min(1, s);
        }
        it.div.style.opacity = o.toFixed(4);
        // revelation : montée plus ample (44 px), TOUJOURS d'un bloc (pièges : jamais une ligne seule, jamais « Diabète : » seul)
        it.div.style.transform = dy ? `translateY(${dy.toFixed(2)}px)` : 'none';
        if (it.fil) it.fil.style.transform = `scaleX(${f >= it.entree ? courbe(Math.min(1, (f - it.entree - 4) / ne)).toFixed(4) : 0})`;
      }
    }
    function verifier() {
      const rapport = [];
      const debut = Math.min(...items.map((i) => i.entree)), fin = images ?? Math.max(...items.map((i) => i.sortie));
      for (const it of items) {
        const texte = norm(it.t.lignes.join(' '));
        const enFin = it.entree > debut && it.entree >= debut + (fin - debut) / 2;
        const figee = it.t.figee === true || !!it.t.mention || /^M[1-5]$/.test(it.t.ref || '') || /^au moindre doute\b/.test(texte) || (enFin && /^diabète\b/.test(texte));
        const net = [it.entree + ne, it.sortie - ns + 1];
        const requis = Math.ceil(Math.max(REGLE.base_s + REGLE.par_mot_s * it.mots, figee ? REGLE.figee_min_s : 0) * fps - 1e-6);
        const obtenu = net[1] - net[0];
        const ligne = { ref: it.t.ref, mots: it.mots, figee, entree: it.entree, sortie: it.sortie, net, requis, obtenu, marge: obtenu - requis };
        rapport.push(ligne);
        if (obtenu < requis) EZ.erreur(`${it.t.ref} : ${obtenu} images nettes < ${requis} requises (${REGLE.base_s} s + ${REGLE.par_mot_s} s/mot${figee ? `, figée ≥ ${REGLE.figee_min_s} s` : ''}, ${it.mots} mots)`);
        if (it.t.graisse !== 'bold' || it.F.taille < REGLE.taille_min) EZ.erreur(`${it.t.ref} : texte non gras ou < ${REGLE.taille_min} px`);
        const [x, , w] = it.F.zone;
        if (x < largeur * REGLE.marge || x + w > largeur * (1 - REGLE.marge) + 0.5) EZ.erreur(`${it.t.ref} : zone hors des marges de 5 %`);
        for (const s of it.div.querySelectorAll('span')) { const lw = s.getBoundingClientRect().width / (it.div.getBoundingClientRect().width / w || 1); ligne.largeurs = [...(ligne.largeurs || []), Math.round(lw)]; if (lw > w + 0.5) EZ.erreur(`${it.t.ref} : « ${s.textContent} » ${Math.round(lw)} px > zone ${w} px`); }
      }
      // ≤ 12 mots à l'écran à chaque image
      for (let f = 0; f < fin; f++) { const m = items.filter((i) => f >= i.entree && f < i.sortie).reduce((s, i) => s + i.mots, 0); if (m > REGLE.mots_max) { EZ.erreur(`image ${f} : ${m} mots à l'écran (> ${REGLE.mots_max})`); break; } }
      window.ezLecture = rapport;
      console.table(rapport.map(({ largeurs, ...l }) => ({ ...l, net: l.net.join('→'), largeurs: (largeurs || []).join('/') })));
      return rapport;
    }
    return { rendre, verifier, items };
  }
  window.EZ.cartons = cartons;
})();
