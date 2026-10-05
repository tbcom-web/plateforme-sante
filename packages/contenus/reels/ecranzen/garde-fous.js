/* COPIE conforme du studio ÉcranZen (TBCOM CLAUDE/ecranzen/studio/html, 2026-10-05), reprise autorisée par Paul : ne pas modifier ici, recopier depuis ÉcranZen. Voir docs/moteur-contenus.md (§ Reels). */
// GARDE-FOUS DES REELS — html/reels/garde-fous.js. Partagé par le navigateur (reel.html) et par Node (reel.mjs) : même code,
// mêmes messages. Un reel qui casse un garde-fou n'est PAS généré (Node refuse d'écrire les données, la page affiche l'erreur et
// capturer.mjs refuse l'export). Sources : charte/lignes-rouges.md (mode agile, 2026-09-30), referentiels/ethique/podologie.md
// (mentions M1–M5), production/_programme/2026-09-29-podologie-posturologie-ethique.md (lot 040–042),
// production/_programme/2026-09-29-podologie-semelles-ethique.md (033). La règle de lecture vient de outils/lib/lecture.mjs
// (Node) ; la page la revérifie avec lib/cartons.js.
(function (racine) {
  'use strict';
  const FPS = 30;
  // Chronologie commune (images à 30 i/s). Le scan de la scène suivante occupe les T dernières images de chaque scène.
  const T = { scan: 30, kicker: 6, titre: 9, entree: 27, sortie_apres_scan: 18, fondu: 9 };
  const REGLE = { base_s: 2, par_mot_s: 0.5, figee_min_s: 6, titre_mots_max: 7, ecran_mots_max: 12 };
  const mots = (s) => String(s || '').split(/[\s  ]+/).filter((m) => /[\p{L}\p{N}]/u.test(m)).length;
  const norm = (s) => String(s || '').normalize('NFC').toLocaleLowerCase('fr-FR').replace(/[’']/g, "'").replace(/\s+/g, ' ').trim();

  // Mises en page (templates). deux : 2 visuels ; etape : frise numérotée ; reponse : 2e carton ; mention : admise pour M1–M5.
  const MISES = {
    split: { mention: true }, 'visuel-plein': { mention: true }, 'titre-geant': { mention: true },
    comparaison: { deux: true }, etapes: { etape: true }, question: { reponse: true },
  };
  const PASSAGES = ['auto', 'scan', 'fondu', 'glissement'];
  const PERSONNAGES = ['silhouette', 'chaine', 'capteurs']; // un scan (découpe horizontale) couperait le personnage en deux
  const miseEnPage = (reel, s) => s.mise_en_page || reel.mise_en_page || 'split';
  const aPersonnage = (s) => [s?.visuel, s?.visuel_b].some((v) => v && PERSONNAGES.includes(v.type));
  function passage(reel, i) {
    const s = reel.scenes[i], avant = reel.scenes[(i - 1 + reel.scenes.length) % reel.scenes.length];
    const p = s.passage || reel.passage || 'auto';
    return p === 'auto' ? (aPersonnage(s) || aPersonnage(avant) ? 'fondu' : 'scan') : p;
  }
  function chrono(reel) {
    let f = 0;
    const scenes = reel.scenes.map((s, i) => {
      const n = Math.round((+s.duree || 10) * FPS), d = f; f += n;
      // glissement : le texte sortant a fini son fondu quand la couche commence à glisser (jamais de texte net hors des marges)
      const glisse = passage(reel, (i + 1) % reel.scenes.length) === 'glissement';
      const titreEntree = d + T.titre, titreSortie = d + n - T.scan + (glisse ? T.fondu : T.sortie_apres_scan);
      const mise = miseEnPage(reel, s);
      const cartons = [{ role: s.mention ? 'mention' : 'titre', entree: titreEntree, sortie: titreSortie, mots: s.mention ? null : mots(s.titre) }];
      if (mise === 'question' && s.reponse) {
        const wq = mots(s.titre), wr = mots(s.reponse);
        const rep = s.reponse_a != null ? d + Math.round(s.reponse_a * FPS) : titreEntree + T.entree + Math.ceil((REGLE.base_s + REGLE.par_mot_s * wq) * FPS) + T.fondu;
        if (wq + wr > REGLE.ecran_mots_max) cartons[0].sortie = rep; // la question laisse la place à la réponse
        cartons.push({ role: 'reponse', entree: rep, sortie: titreSortie, mots: wr });
      }
      return { i, debut: d, fin: d + n, images: n, titreEntree, titreSortie, kicker: d + T.kicker, mise, passage: passage(reel, i), cartons };
    });
    return { scenes, images: f, fps: FPS, T };
  }

  // Profils éthiques par sujet (ce que la pré-validation GATE 1 a interdit). Un profil DURCIT les règles globales.
  const LOT_POSTURO = {
    mots: ['mal de dos', 'maux de dos', 'votre dos', 'du dos', 'le dos', 'lombalgie', 'cervicales', 'nuque', 'scoliose', 'migraine', 'maux de tête', 'vertige', 'mâchoire', 'dents', 'dyslexie',
      'concentration', 'performance', 'prévenir les blessures', 'rééquilibr', 'réaligne', 'reprogramm', 'corriger votre posture', 'bonne posture',
      'mauvaise posture', 'déséquilibre', 'jambe plus courte', 'bassin décalé', 'de la tête aux pieds', 'bilan complet', 'posturologue',
      'spécialiste de la posture', 'expert en posturologie', 'faites le point', 'votre posture révèle', 'un bilan pour tous', 'semelle'],
    visuels: { chaine: 'flèche/chaîne qui monte du pied vers la tête (lot posturologie §4)', capteurs: 'yeux, oreille, cerveau : anatomie hors champ (lot posturologie §4)',
      'carte-pression': 'carte de pressions colorée = un résultat d\'examen (lot posturologie §4)', 'chiffre-cle': 'aucune durée, aucun chiffre à l\'écran (lot posturologie)' },
    params: [
      ['silhouette', 'inclinaison', (v) => v && v !== 'neutre', 'silhouette inclinée = un résultat (« on montre qu\'on regarde, jamais ce qu\'on trouve »)'],
      ['silhouette', 'niveaux', (v) => !!v, 'niveaux à bulle = une mesure affichée'],
      ['silhouette', 'douleur', (v) => v && v.length, 'douleur montrée : hors message (bilan)'],
      ['silhouette', 'fil_a_plomb', (v, p) => v === 'cote' && p.tourner == null, 'fil à plomb seulement en vue de DOS : il faut « tourner » (il apparaît après la rotation, jamais de face ni de profil ; validation éthique 2026-09-30)'],
      ['silhouette', 'oscillation', (v, p) => p.appui === 'unipodal' && v > 0.3, 'appui unipodal : oscillation ≤ 0,3 (l’appui doit se lire stable, pas comme un déséquilibre)'],
      ['silhouette', 'fil_a_plomb', (v) => v === 'axe', 'fil à plomb À TRAVERS la silhouette = norme « idéale » (seulement « cote »)'],
      ['silhouette', 'reperes', (v) => v === 'inclinaison', 'repères inclinés : seuls des repères horizontaux sont admis'],
      ['silhouette', 'semelles', (v) => !!v, 'enchaînement bilan → semelles interdit'],
      ['plateforme', 'trace', (v) => v !== false, 'plateforme SANS écran de données (une courbe ressemblerait à un résultat) : trace:false'],
    ],
    mentions: ['M1'],
    // GATE 1 040 (cloisonnement bilan → dispositif) : jamais suivi d'un contenu semelles dans la même boucle / playlist
    apres_interdit_requis: ['semelles'],
  };
  const PROFILS = {
    'POD-SUJ-040': LOT_POSTURO, 'POD-SUJ-041': { ...LOT_POSTURO, canaux: ['site', 'instagram'] }, 'POD-SUJ-042': { ...LOT_POSTURO, canaux: ['site'] },
    'POD-SUJ-033': {
      mots: ["normal d'avoir mal", 'inconfort est normal', 'ça passe', 'mal de dos', 'votre dos', 'le dos', 'genoux', 'agit'],
      chiffres: 'aucun chiffre à l\'écran (programmes non concordants, éthique 033)',
      visuels: { 'chiffre-cle': 'aucun chiffre à l\'écran (033)' },
      params: [['silhouette', 'douleur', (v) => v && v.length, 'aucune onde de douleur (033)']],
      mentions: ['M3'],
      themes_requis: ['semelles'],
    },
  };
  const COMMERCIAL = /\b(rdv|rendez-vous|prenez|réservez|appelez|contactez|cliquez|promo|offre spéciale|prix|tarifs?|gratuit|rembours\w*|€)\b/iu;
  const CLES_INTERDITES = ['cta', 'bouton', 'button', 'lien', 'url', 'appel'];

  /**
   * reel : objet JSON du reel. ctx : { visuels (registre EZR.visuels), mentions (table du référentiel, Node) , format }.
   * Renvoie { erreurs: [], avertissements: [], a_valider: [] }.
   */
  function verifier(reel, ctx = {}) {
    const E = [], A = [], V = [];
    const err = (m) => E.push(m), av = (m) => A.push(m);
    if (!reel || !Array.isArray(reel.scenes) || !reel.scenes.length) return { erreurs: ['reel vide : « scenes » manquant'], avertissements: [], a_valider: [] };
    const format = ctx.format || reel.format || 'salle';
    if (!['salle', 'site'].includes(format)) err(`format « ${format} » inconnu (salle | site)`);
    const profil = PROFILS[reel.sujet] || null;
    if (!reel.sujet) av('pas de « sujet » (ID backlog) : aucun profil éthique appliqué');
    if (profil?.canaux && format === 'salle') err(`${reel.sujet} : canaux ${profil.canaux.join(', ')} seulement (pas de salle d'attente)`);
    // clés commerciales n'importe où
    (function fouiller(o, chemin) {
      if (!o || typeof o !== 'object') return;
      for (const [k, v] of Object.entries(o)) { if (CLES_INTERDITES.includes(k.toLowerCase())) err(`${chemin}${k} : pas de CTA, bouton ni lien (lignes rouges §5) — la dernière scène porte la mention M1–M5 en texte`); fouiller(v, `${chemin}${k}.`); }
    })(reel, '');
    const C = chrono(reel);
    const textes = [];
    reel.scenes.forEach((s, i) => {
      const nom = `scène ${i + 1}`, derniere = i === reel.scenes.length - 1;
      if (s.valide) V.push(`${nom} : ${s.valide}`);
      if (s.mention && !derniere) err(`${nom} : la mention ${s.mention} va EN DERNIER (référentiel éthique)`);
      if (derniere && !s.mention) err(`${nom} (dernière) : mention M1–M5 obligatoire (« mention »: "M1") — pas de bouton, pas d'appel`);
      if (s.mention && s.titre) err(`${nom} : une scène mention n'a pas d'autre titre (mention au poids du titre, seule)`);
      let lignesMention = null;
      if (s.mention) {
        if (profil?.mentions && !profil.mentions.includes(s.mention)) err(`${nom} : mention ${s.mention} interdite pour ${reel.sujet} (attendue : ${profil.mentions.join(' ou ')})`);
        if (s.mention === 'M4') err(`${nom} : M4 (deux temps indissociables) non gérée par le générateur — M4c si le sujet est la semelle elle-même`);
        if (s.mention === 'M5') {
          const t = norm((s.texte_mention || []).join(' '));
          if (!/(parlez-en à votre médecin\.$|^consultez un médecin)/.test(t)) err(`${nom} : M5 doit finir par « … parlez-en à votre médecin. » ou commencer par « Consultez un médecin »`);
          lignesMention = s.texte_mention || [];
        } else if (ctx.mentions) {
          const m = ctx.mentions[s.mention];
          if (!m) err(`${nom} : mention ${s.mention} absente du référentiel (${Object.keys(ctx.mentions).join(', ')})`);
          else lignesMention = m.lignes;
        } else lignesMention = s.lignes_mention || null;
        if (s.texte_mention && s.mention !== 'M5') err(`${nom} : le texte d'une mention ${s.mention} vient du référentiel, mot pour mot (ne pas l'écrire dans le reel)`);
        if (lignesMention && lignesMention.join(' ') === lignesMention.join(' ').toUpperCase()) err(`${nom} : mention en capitales interdite`);
      }
      const titre = s.mention ? (lignesMention || []).join(' ') : s.titre;
      const n = mots(titre);
      if (!s.mention) {
        if (!s.titre) err(`${nom} : « titre » manquant`);
        if (n > REGLE.titre_mots_max) err(`${nom} : titre de ${n} mots > ${REGLE.titre_mots_max} (lignes rouges §6) : « ${s.titre} »`);
      }
      if (s.sous_texte) {
        if (format === 'salle') av(`${nom} : sous-texte NON affiché en salle d'attente (34 px, interdit) — passez-le en titre ≤ ${REGLE.titre_mots_max} mots ou gardez-le pour le format « site »`);
      }
      // mise en page (template)
      const c = C.scenes[i];
      const M = MISES[c.mise];
      if (!M) err(`${nom} : mise_en_page « ${c.mise} » inconnue (${Object.keys(MISES).join(', ')})`);
      if (M && s.mention && !M.mention) err(`${nom} : une mention se pose en ${Object.keys(MISES).filter((k) => MISES[k].mention).join(', ')} (seule, au poids du titre)`);
      if (!PASSAGES.includes(s.passage || 'auto')) err(`${nom} : passage « ${s.passage} » inconnu (${PASSAGES.join(', ')})`);
      if (s.passage === 'scan' && (aPersonnage(s) || aPersonnage(reel.scenes[(i - 1 + reel.scenes.length) % reel.scenes.length]))) av(`${nom} : passage « scan » sur un personnage : la ligne le coupe en deux pendant 1 s (préférer fondu ou glissement)`);
      if (s.reponse && c.mise !== 'question') err(`${nom} : « reponse » n'existe qu'en mise_en_page question`);
      if (M?.reponse) {
        if (!s.reponse) err(`${nom} : question sans « reponse »`);
        else if (mots(s.reponse) > REGLE.titre_mots_max) err(`${nom} : réponse de ${mots(s.reponse)} mots > ${REGLE.titre_mots_max}`);
      }
      if (M?.etape) {
        const [k, tot] = Array.isArray(s.etape) ? s.etape : [];
        if (!(tot >= 3 && tot <= 6 && k >= 1 && k <= tot)) err(`${nom} : etapes demande « etape »: [numéro, total] avec 3 ≤ total ≤ 6`);
      } else if (s.etape) err(`${nom} : « etape » n'existe qu'en mise_en_page etapes`);
      if (M?.deux) {
        if (!s.visuel || !s.visuel_b) err(`${nom} : comparaison demande « visuel » ET « visuel_b »`);
        const A = s.visuel || {}, B = s.visuel_b || {};
        const inc = (v) => v.type === 'silhouette' && v.inclinaison && v.inclinaison !== 'neutre';
        if (A.type === 'silhouette' && B.type === 'silhouette' && inc(A) !== inc(B)) err(`${nom} : silhouette inclinée à côté d'une silhouette droite = avant/après implicite (lignes rouges §2)`);
        if (A.type === 'carte-pression' && B.type === 'carte-pression' && (A.etat || 'concentre') !== (B.etat || 'concentre') && !(A.derogation || B.derogation)) err(`${nom} : carte « concentré » à côté de « réparti » = le « sans / avec semelles » de la page d'origine (avant/après) : interdit sans « derogation »`);
        if ((A.correction || B.correction)) err(`${nom} : pas de « correction » dans une comparaison`);
        for (const e of s.etiquettes || []) if (/\b(avant|après|apres|sans|avec|guéri|corrig|mieux|pire)\b/i.test(e)) err(`${nom} : étiquette « ${e} » : une comparaison montre deux façons ou deux profils, jamais un avant/après de soin`);
        if (s.etiquettes && (!Array.isArray(s.etiquettes) || s.etiquettes.length !== 2)) err(`${nom} : « etiquettes » = 2 textes courts (décor)`);
      } else if (s.visuel_b || s.etiquettes) err(`${nom} : « visuel_b » / « etiquettes » n'existent qu'en mise_en_page comparaison`);
      // règle de lecture (même calcul que lib/cartons.js), pour chaque carton de la scène
      const figee = !!s.mention;
      for (const k of c.cartons) {
        const w = k.mots ?? n;
        const net = (k.sortie - T.fondu + 1) - (k.entree + T.entree);
        const requis = Math.ceil(Math.max(REGLE.base_s + REGLE.par_mot_s * w, figee ? REGLE.figee_min_s : 0) * FPS - 1e-6);
        if (net < requis) err(`${nom}${k.role === 'reponse' ? ' (réponse)' : ''} : ${(net / FPS).toFixed(1)} s nettes < ${(requis / FPS).toFixed(1)} s requises (2 s + 0,5 s × ${w} mots${figee ? ', mention ≥ 6 s' : ''}) : allonger « duree »`);
      }
      // visuels
      const simult = c.cartons.length > 1 && c.cartons[0].sortie > c.cartons[1].entree;
      let motsEcran = simult ? c.cartons.reduce((t, k) => t + (k.mots ?? n), 0) : Math.max(...c.cartons.map((k) => k.mots ?? n));
      if (M?.etape) motsEcran += 1; // numéro de l'étape active
      for (const [cle, v] of [['visuel', s.visuel || { type: 'aucun' }], ['visuel_b', s.visuel_b]]) {
        if (!v) continue;
        const def = ctx.visuels && v.type !== 'aucun' ? ctx.visuels[v.type] : null;
        if (ctx.visuels && v.type !== 'aucun' && !def) err(`${nom} : ${cle} « ${v.type} » inconnu (${Object.keys(ctx.visuels).join(', ')})`);
        if (def) {
          const connus = new Set(['type', ...Object.keys(def.parametres || {})]);
          for (const k of Object.keys(v)) if (!connus.has(k)) err(`${nom} : paramètre « ${k} » inconnu pour ${v.type} (connus : ${[...connus].slice(1).join(', ')})`);
          for (const m of def.verifier ? def.verifier({ ...defauts(def), ...v }, { format }) : []) err(`${nom} : ${v.type} : ${m}`);
          if (def.mots) motsEcran += def.mots({ ...defauts(def), ...v });
        }
        if (profil?.visuels?.[v.type]) err(`${nom} : visuel « ${v.type} » interdit pour ${reel.sujet} : ${profil.visuels[v.type]}`);
        for (const [type, p, test, pourquoi] of profil?.params || []) {
          const tout = v.type === type ? { ...(def ? defauts(def) : {}), ...v } : {}, val = tout[p];
          if (v.type === type && test(val, tout)) err(`${nom} : ${type}.${p} = ${JSON.stringify(val)} interdit pour ${reel.sujet} : ${pourquoi}`);
        }
      }
      if (motsEcran > REGLE.ecran_mots_max) err(`${nom} : ${motsEcran} mots à l'écran > ${REGLE.ecran_mots_max}`);
      textes.push([nom, titre], [nom + ' (kicker)', s.kicker], [nom + ' (sous-texte)', s.sous_texte], [nom + ' (réponse)', s.reponse], ...(s.etiquettes || []).map((e) => [nom + ' (étiquette)', e]));
    });
    textes.push(['en-tête', reel.titre]);
    for (const [ou, t] of textes) {
      if (!t) continue;
      const tn = norm(t);
      if (COMMERCIAL.test(tn)) err(`${ou} : ton commercial (« ${tn.match(COMMERCIAL)[0]} ») interdit (lignes rouges §5)`);
      for (const m of profil?.mots || []) if (new RegExp(`(^|[^\\p{L}])${m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'u').test(tn)) err(`${ou} : « ${m} » interdit pour ${reel.sujet} (pré-validation éthique)`);
      if (profil?.chiffres && !/^mention/.test(ou) && /\d/.test(tn)) err(`${ou} : ${profil.chiffres}`);
    }
    // diffusion : enchaînements interdits (playlist Yodeck, boucle) — affichés par reel.mjs, vérifiés par --playlist
    for (const k of ['apres_interdit', 'avant_interdit', 'themes']) if (reel[k] != null && !(Array.isArray(reel[k]) && reel[k].every((x) => typeof x === 'string'))) err(`« ${k} » = liste de textes (id de reel, sujet POD-SUJ-…, ou thème)`);
    for (const r of profil?.apres_interdit_requis || []) if (!(reel.apres_interdit || []).includes(r)) err(`${reel.sujet} : « apres_interdit » doit contenir « ${r} » (GATE 1 : jamais suivi d'un contenu ${r} dans la même boucle ou playlist)`);
    for (const r of profil?.themes_requis || []) if (!(reel.themes || []).includes(r)) err(`${reel.sujet} : « themes » doit contenir « ${r} » (pour que les règles d'enchaînement des autres reels le reconnaissent)`);
    if (!['plan', 'clair', 'violet', undefined].includes(reel.palette)) err(`palette « ${reel.palette} » inconnue (plan | clair | violet)`);
    return { erreurs: E, avertissements: A, a_valider: V, chrono: C };
  }
  function defauts(def) { return Object.fromEntries(Object.entries(def.parametres || {}).map(([k, d]) => [k, d.defaut])); }

  // Playlist (liste ordonnée de reels, en boucle) : aucun enchaînement interdit par « apres_interdit » / « avant_interdit ».
  const designe = (r, cle) => cle === r.id || cle === r.sujet || (r.themes || []).includes(cle);
  function verifierPlaylist(reels) {
    const E = [];
    reels.forEach((a, i) => {
      const b = reels[(i + 1) % reels.length];
      if (reels.length < 2) return;
      for (const k of a.apres_interdit || []) if (designe(b, k)) E.push(`${a.id} → ${b.id} : « ${a.id} » n'est jamais suivi de « ${k} » (apres_interdit)`);
      for (const k of b.avant_interdit || []) if (designe(a, k)) E.push(`${a.id} → ${b.id} : « ${b.id} » ne passe jamais après « ${k} » (avant_interdit)`);
    });
    return E;
  }
  const api = { verifier, verifierPlaylist, MISES, PASSAGES, chrono, defauts, mots, REGLE, T, FPS, PROFILS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  racine.EZR_GF = api;
})(typeof window !== 'undefined' ? window : globalThis);
