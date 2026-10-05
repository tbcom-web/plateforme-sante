/* COPIE conforme du studio ÉcranZen (TBCOM CLAUDE/ecranzen/studio/html, 2026-10-05), reprise autorisée par Paul : ne pas modifier ici, recopier depuis ÉcranZen. Voir docs/moteur-contenus.md (§ Reels). */
// VISUEL « chiffre-cle » — grand chiffre qui compte jusqu'à sa valeur (« Chaque foulée compte », 0 → 800 km).
// Le chiffre est un TEXTE (HTML, gras, ≥ 72 px, compté dans les 12 mots à l'écran). Un chiffre santé doit être sourcé.
(function (racine) {
  'use strict';
  const EZR = racine.EZR;
  EZR.visuels['chiffre-cle'] = {
    titre: 'Chiffre clé animé (grand nombre qui compte)',
    parametres: {
      valeur: { defaut: 100, aide: 'nombre final' },
      de: { defaut: 0, aide: 'nombre de départ' },
      unite: { defaut: '', aide: 'unité courte après le nombre (ex. "km", "%")' },
      debut: { defaut: 0.8, aide: 's : début du comptage' },
      duree: { defaut: 3.5, aide: 's : durée du comptage (sortie cubique)' },
      decimales: { defaut: 0, aide: 'chiffres après la virgule' },
      taille: { defaut: 220, aide: 'px (≥ 72)' },
      source: { defaut: '', aide: 'OBLIGATOIRE : source de 1er rang du chiffre (lignes rouges §1)' },
    },
    mots(p) { return 1 + (p.unite ? String(p.unite).split(/\s+/).filter(Boolean).length : 0); },
    verifier(p) {
      const m = [];
      if (!p.source) m.push('« source » manquante : un chiffre santé cite sa source de 1er rang (lignes rouges §1)');
      if (p.taille < 72) m.push('taille < 72 px');
      if (typeof p.valeur !== 'number') m.push('« valeur » doit être un nombre');
      return m;
    },
    construire(boite, p) {
      const d = document.createElement('div');
      d.className = 'rl-chiffre';
      d.style.fontSize = p.taille + 'px';
      boite.div.appendChild(d);
      const n = document.createElement('span'), u = document.createElement('span');
      u.style.cssText = 'font-size:.42em;margin-left:.18em;color:var(--texte);letter-spacing:-0.02em';
      d.appendChild(n); if (p.unite) { u.textContent = p.unite; d.appendChild(u); }
      d.style.left = '0'; d.style.width = boite.l + 'px'; d.style.textAlign = 'center';
      d.style.top = Math.round(boite.h / 2 - p.taille * 0.45) + 'px';
      return { p, d, n };
    },
    rendre(I, tau) {
      const O = EZR.outils, p = I.p;
      const v = O.lerp(p.de, p.valeur, O.outCubic((tau - p.debut) / p.duree));
      I.n.textContent = v.toLocaleString('fr-FR', { minimumFractionDigits: p.decimales, maximumFractionDigits: p.decimales });
      const e = O.clamp((tau - p.debut + 0.6) / 0.6);
      I.d.style.opacity = e.toFixed(3); I.d.style.transform = `translateY(${(24 * (1 - O.outCubic(e))).toFixed(2)}px)`;
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
