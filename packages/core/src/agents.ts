// Découvrabilité par les moteurs de réponse et les assistants IA (ChatGPT, Claude, Perplexity, Gemini…).
// Réglages communs à tous les sites praticiens ; voir docs/decouvrabilite-agents.md.

/**
 * Robots autorisés nommément dans robots.txt. Les moteurs classiques (Googlebot, Bingbot) et les robots
 * de recherche ou de réponse des assistants y figurent ; les robots d'entraînement aussi, mais leur usage
 * est encadré par le signal ai-train ci-dessous.
 */
export const ROBOTS_AGENTS = [
  // Moteurs de recherche
  'Googlebot',
  'Bingbot',
  'Applebot',
  'DuckDuckBot',
  // OpenAI : recherche ChatGPT, consultation à la demande, entraînement
  'OAI-SearchBot',
  'ChatGPT-User',
  'GPTBot',
  // Anthropic
  'Claude-SearchBot',
  'Claude-User',
  'ClaudeBot',
  // Perplexity
  'PerplexityBot',
  'Perplexity-User',
  // Google (Gemini) et Apple Intelligence : jetons de contrôle, sans robot propre
  'Google-Extended',
  'Applebot-Extended',
  // Mistral (Le Chat), Meta, Amazon, DuckDuckGo (Duck.ai), Common Crawl
  'MistralAI-User',
  'Meta-ExternalAgent',
  'Amazonbot',
  'DuckAssistBot',
  'CCBot',
] as const;

/**
 * Content Signals (https://contentsignals.org) : usages autorisés du contenu, déclarés dans robots.txt.
 * - search : indexation et liens dans les résultats de recherche ;
 * - ai-input : réponse d'un assistant à partir de la page (citation, résumé) ;
 * - ai-train : entraînement ou ajustement de modèles d'IA.
 *
 * DÉCISION À PRENDRE (Paul) : ai-train vaut « yes » par défaut, pour que le cabinet soit connu des modèles
 * (ChatGPT, Claude, Gemini…) même sans recherche en direct. Passer à « no » pour refuser l'entraînement :
 * robots.txt l'indique alors et ferme l'accès aux robots d'entraînement (GPTBot, ClaudeBot, Google-Extended,
 * Applebot-Extended, CCBot, Meta-ExternalAgent), sans toucher aux robots de recherche et de réponse.
 */
export const SIGNAUX_CONTENU: Record<'search' | 'ai-input' | 'ai-train', 'yes' | 'no'> = {
  search: 'yes',
  'ai-input': 'yes',
  'ai-train': 'yes',
};

/** Robots (ou jetons) servant uniquement à l'entraînement : fermés si ai-train vaut « no ». */
export const ROBOTS_ENTRAINEMENT = ['GPTBot', 'ClaudeBot', 'Google-Extended', 'Applebot-Extended', 'CCBot', 'Meta-ExternalAgent'] as const;

/** Ligne « Content-Signal » de robots.txt. */
export const ligneSignauxContenu = (signaux = SIGNAUX_CONTENU) =>
  `Content-Signal: ${Object.entries(signaux).map(([k, v]) => `${k}=${v}`).join(', ')}`;
