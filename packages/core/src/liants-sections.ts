// Air autour des liants entre sections (retour de Paul du 2026-10-10 : « Attention c'est pas bien entre les deux sections
// là » : sous les cartes des sujets, la légende « Pieds de l'enfant » collée contre l'ombre de la section suivante, sa
// description masquée). Cause : chaque liant (séparateur du jeu de détails, chevrons, vague, sections qui se recouvrent) se
// posait SUR la limite entre deux sections en supposant de l'air de part et d'autre ; or bien des sections n'ont aucune marge
// basse (sujets de l'accueil, cartes du tableau à 14 px les unes des autres) : séparateur sur le texte, carte traversée,
// section suivante qui remontait de 36 px par-dessus la légende.
// Règle commune (site Astro et aperçu de l'admin, mêmes feuilles) : un liant a TOUJOURS sa propre bande d'air, réservée
// au-dessus de la section qu'il annonce (marge, jamais un recouvrement de contenu), avec au moins AIR_LIANT de vide de chaque
// côté (échelle « élément » de la charte, ≥ 20 px). Module pur.

/** Sections visées par les liants (gabarits du site, aperçu de l'admin) */
export const SECTIONS_LIANTS = ':is(.g-section,.section,.eff-section)';
/** Air minimal entre un liant et tout contenu : échelle « élément » de la charte (20 → 28 px) */
export const AIR_LIANT = 'var(--espace-element,clamp(20px,2.4vw,28px))';
/** Air minimal mesuré (px) : le contrôle automatique refuse moins de 16 px */
export const AIR_LIANT_MIN_PX = 20;

/**
 * Bande d'air d'un liant de hauteur `h` (px) dessiné par le ::before de la section suivante : marge haute = h + 2 × air,
 * liant centré dedans (son centre à air + h/2 au-dessus du bord de la section ; le ::before doit être centré verticalement sur
 * son `top`, translate(-50%) ou marge de -h/2). `racine` : préfixe éventuel (`[data-td] `). Déclarations à passer en
 * !important par l'appelant si nécessaire.
 */
export function cssBandeLiant(h: number, racine = ''): string {
  const s = `${racine}${SECTIONS_LIANTS}+${SECTIONS_LIANTS}`;
  return `${s}{margin-top:calc(${h}px + 2 * ${AIR_LIANT})}${s}::before{top:calc(-1 * ${AIR_LIANT} - ${h / 2}px)}`;
}
