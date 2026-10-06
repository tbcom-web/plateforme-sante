// Typographie des mots qu'on ne coupe jamais (règle de Paul, 2026-10-06) : « pédicure-podologue », « pédicurie-podologie »,
// noms de personnes et de villes composés (« Marie-Dominique », « Saint-Rémy-de-Provence »). Le texte garde le vrai trait
// d'union (U+002D : moteurs, recherche et agents lisent le mot normal) ; à l'affichage, chaque mot composé est enveloppé
// dans <mot-lie> (white-space: nowrap, Gabarit.astro), et le texte qui le contient dans <mots-lies> : ce texte reste UN seul
// élément dans un conteneur flex ou grille (sinon chaque mot deviendrait un élément à part et la ligne ne se replierait
// plus). Éléments personnalisés plutôt que <span> : aucune règle « span » existante ne s'y applique. Appliqué une fois à
// toutes les pages au build (astro.config.mjs, intégration « insecables ») : aucun composant n'a à y penser. Les titres trop
// longs pour l'écran sont réduits par la règle --mot-long (Gabarit.astro) : jamais de césure, jamais de débordement.

/** Mot composé d'au moins deux parties reliées par un trait d'union (lettres, apostrophes comprises) */
const COMPOSE = /[\p{L}\p{M}’']+(?:-[\p{L}\p{M}’']+)+/gu;

/** Morceau de texte HTML → mots composés liés, le texte enveloppé ; inchangé s'il n'en contient pas */
function lier(t) {
  COMPOSE.lastIndex = 0;
  if (!COMPOSE.test(t)) return t;
  COMPOSE.lastIndex = 0;
  // --n : longueur du mot, pour le réduire en dernier recours s'il ne tient pas dans l'écran (Gabarit.astro)
  return `<mots-lies>${t.replace(COMPOSE, (m) => (m.length > 14 ? `<mot-lie style="--n:${[...m].length}">${m}</mot-lie>` : `<mot-lie>${m}</mot-lie>`))}</mots-lies>`;
}

/** Texte brut → HTML : échappé, mots composés insécables */
export function insecables(texte) {
  return lier(String(texte).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));
}

/** Éléments dont le contenu n'est jamais retouché (code, styles, dessins, champs, données structurées) */
const BRUTS = new Set(['script', 'style', 'svg', 'textarea', 'title', 'noscript', 'pre', 'code', 'template', 'mots-lies']);

/**
 * Page HTML complète → même page, mots composés du <body> insécables (texte seulement : ni attributs, ni scripts, ni
 * SVG). Idempotent : un texte déjà dans <mots-lies> n'est pas réenveloppé.
 */
export function insecablesHtml(html) {
  const debut = html.indexOf('<body');
  if (debut < 0) return html;
  const morceaux = html.slice(debut).split(/(<[^>]*>)/);
  const pile = [];
  for (let i = 0; i < morceaux.length; i++) {
    const m = morceaux[i];
    if (!m) continue;
    if (m.startsWith('<')) {
      const ferme = m.match(/^<\/([a-zA-Z0-9-]+)/);
      const ouvre = m.match(/^<([a-zA-Z0-9-]+)/);
      if (ferme) {
        if (pile.at(-1) === ferme[1].toLowerCase()) pile.pop();
      } else if (ouvre && !m.endsWith('/>') && BRUTS.has(ouvre[1].toLowerCase())) pile.push(ouvre[1].toLowerCase());
      continue;
    }
    if (!pile.length) morceaux[i] = lier(m);
  }
  return html.slice(0, debut) + morceaux.join('');
}

/** Longueur du plus long mot insécable d'un texte (mot composé compris) : taille des titres sur petit écran */
export const motLePlusLong = (texte) => Math.max(0, ...String(texte).split(/[\s  –—,.;:!?()«»"]+/).map((m) => [...m].length));
