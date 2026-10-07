// Jeux de détails du studio de recettes (demande de Paul du 2026-10-07 : « ajouter des “éléments” de style qui permettent de
// créer des combinaisons de templates vraiment wow »). Les DÉTAILS : séparateurs entre sections, soulignés des intertitres,
// encadrés et citations, étiquettes, motif de fond des sections, coins, ombres, boutons, densité (respiration), cadres d'images.
// Ils vont par JEUX cohérents (Éditorial chic, Graphique pop, Doux et rond, Technique net, Classique sobre, Magazine affirmé) :
// le dé tire un jeu entier (ensemble harmonieux) ; chaque élément peut ensuite être varié ou verrouillé seul.
// Une seule feuille CSS (cssDetails), partagée par les gabarits Astro (Gabarit.astro : <style> en ligne, data-td sur <html>) et
// l'aperçu de l'admin (ApercuTheme : racine .ap) : déclarations en !important (comme formes.ts) pour primer sur les styles
// propres au gabarit et sur les styles en ligne de l'aperçu, sans toucher au balisage.
//
// Règles : CSS seul, aucun JS ; aucune image externe (motifs en dégradés ou SVG en ligne, ≤ 1 Ko) ; aucun changement de mise en
// page du premier écran (élément LCP) ni décalage (séparateurs en position absolue, aucun contenu ajouté) ; contrastes AA
// inchangés (motifs ≤ 8 % d'opacité, boutons « contour » jamais sur fond sombre) ; couleurs : rôles de la gamme seulement.
// Module pur.

export const ELEMENTS_DETAILS = {
  separateur: [
    { id: 'aucun', nom: 'Aucun' }, { id: 'filet', nom: 'Filet fin' }, { id: 'double', nom: 'Double filet' },
    { id: 'ondulation', nom: 'Ondulation' }, { id: 'points', nom: 'Points de pression' },
  ],
  souligne: [
    { id: 'aucun', nom: 'Aucun' }, { id: 'trait', nom: 'Trait épais décalé' }, { id: 'surligneur', nom: 'Surligneur couleur' }, { id: 'vague', nom: 'Vague' },
  ],
  citation: [
    { id: 'gabarit', nom: 'Celle du gabarit' }, { id: 'filet', nom: 'Filet de côté' }, { id: 'guillemets', nom: 'Grands guillemets' }, { id: 'aplat', nom: 'Aplat doux' },
  ],
  badge: [
    { id: 'gabarit', nom: 'Celles du gabarit' }, { id: 'contour', nom: 'Contour fin' }, { id: 'plein', nom: 'Pleines' }, { id: 'carre', nom: 'Carrées' },
  ],
  fond: [
    { id: 'aucun', nom: 'Aucun' }, { id: 'trame', nom: 'Trame de points' }, { id: 'grain', nom: 'Grain' }, { id: 'formes', nom: 'Formes floues de la gamme' }, { id: 'grille', nom: 'Grille fine' },
  ],
  coins: [
    { id: 'gabarit', nom: 'Ceux du gabarit' }, { id: 'carres', nom: 'Carrés' }, { id: 'arrondis', nom: 'Arrondis' }, { id: 'tres-arrondis', nom: 'Très arrondis' }, { id: 'mixtes', nom: 'Mixtes' },
  ],
  ombres: [
    { id: 'gabarit', nom: 'Celles du gabarit' }, { id: 'aucune', nom: 'Aucune' }, { id: 'douce', nom: 'Douce' }, { id: 'portee', nom: 'Portée graphique' },
  ],
  boutons: [
    { id: 'gabarit', nom: 'Ceux du gabarit' }, { id: 'contour', nom: 'Contour' }, { id: 'fleche', nom: 'Flèche animée' }, { id: 'pilule', nom: 'Pilule' },
  ],
  densite: [
    { id: 'compacte', nom: 'Compacte' }, { id: 'aeree', nom: 'Aérée' }, { id: 'tres-aeree', nom: 'Très aérée' },
  ],
  cadre: [
    { id: 'aucun', nom: 'Aucun' }, { id: 'arrondi', nom: 'Arrondi' }, { id: 'organique', nom: 'Découpe organique' }, { id: 'decale', nom: 'Cadre décalé' },
  ],
} as const;
export type ElementDetails = keyof typeof ELEMENTS_DETAILS;
export const NOMS_ELEMENTS_DETAILS: Record<ElementDetails, string> = {
  separateur: 'Séparateurs', souligne: 'Soulignés', citation: 'Encadrés et citations', badge: 'Étiquettes', fond: 'Motif de fond',
  coins: 'Coins', ombres: 'Ombres', boutons: 'Boutons', densite: 'Densité', cadre: 'Cadres d’images',
};
type ValeursDetails = { [E in ElementDetails]: (typeof ELEMENTS_DETAILS)[E][number]['id'] };

/** Jeux cohérents (le dé « Jeu de détails » tire un jeu entier ; « gabarit » = rendu historique, aucune règle) */
export const JEUX_DETAILS = [
  { id: 'gabarit', nom: 'Ceux du modèle', description: 'Aucun détail ajouté : le rendu du gabarit.', valeurs: { separateur: 'aucun', souligne: 'aucun', citation: 'gabarit', badge: 'gabarit', fond: 'aucun', coins: 'gabarit', ombres: 'gabarit', boutons: 'gabarit', densite: 'aeree', cadre: 'aucun' } },
  { id: 'editorial-chic', nom: 'Éditorial chic', description: 'Filets fins, grands guillemets, coins nets, beaucoup d’air, boutons à flèche.', valeurs: { separateur: 'filet', souligne: 'aucun', citation: 'guillemets', badge: 'contour', fond: 'aucun', coins: 'carres', ombres: 'aucune', boutons: 'fleche', densite: 'tres-aeree', cadre: 'aucun' } },
  { id: 'graphique-pop', nom: 'Graphique pop', description: 'Surligneur, ombres portées pleine couleur, cadres décalés, formes de la gamme.', valeurs: { separateur: 'points', souligne: 'surligneur', citation: 'aplat', badge: 'plein', fond: 'formes', coins: 'mixtes', ombres: 'portee', boutons: 'pilule', densite: 'aeree', cadre: 'decale' } },
  { id: 'doux-rond', nom: 'Doux et rond', description: 'Ondulations, coins très arrondis, ombres douces, découpes organiques.', valeurs: { separateur: 'ondulation', souligne: 'vague', citation: 'aplat', badge: 'plein', fond: 'formes', coins: 'tres-arrondis', ombres: 'douce', boutons: 'pilule', densite: 'aeree', cadre: 'organique' } },
  { id: 'technique-net', nom: 'Technique net', description: 'Points de pression, grille fine, trait décalé, coins carrés, compact.', valeurs: { separateur: 'points', souligne: 'trait', citation: 'filet', badge: 'contour', fond: 'grille', coins: 'carres', ombres: 'aucune', boutons: 'fleche', densite: 'compacte', cadre: 'aucun' } },
  { id: 'classique-sobre', nom: 'Classique sobre', description: 'Filet fin, coins arrondis, ombres douces, images arrondies.', valeurs: { separateur: 'filet', souligne: 'aucun', citation: 'filet', badge: 'gabarit', fond: 'aucun', coins: 'arrondis', ombres: 'douce', boutons: 'gabarit', densite: 'aeree', cadre: 'arrondi' } },
  { id: 'magazine', nom: 'Magazine affirmé', description: 'Double filet, grain, trait épais, ombres portées, boutons en contour.', valeurs: { separateur: 'double', souligne: 'trait', citation: 'guillemets', badge: 'plein', fond: 'grain', coins: 'carres', ombres: 'portee', boutons: 'contour', densite: 'aeree', cadre: 'decale' } },
] as const satisfies readonly { id: string; nom: string; description: string; valeurs: ValeursDetails }[];
export type IdJeuDetails = (typeof JEUX_DETAILS)[number]['id'];
export const jeuDetails = (id: unknown) => JEUX_DETAILS.find((j) => j.id === id);

export type ReglagesDetails = ValeursDetails & { jeu: IdJeuDetails };
export const DETAILS_PAR_DEFAUT: ReglagesDetails = { jeu: 'gabarit', ...JEUX_DETAILS[0].valeurs };
const valeursElement = (e: ElementDetails) => (ELEMENTS_DETAILS[e] as readonly { id: string }[]).map((x) => x.id);

/** Réglages d'un jeu (tous ses éléments) */
export const detailsDuJeu = (id: unknown): ReglagesDetails => { const j = jeuDetails(id) ?? JEUX_DETAILS[0]; return { jeu: j.id, ...j.valeurs }; };
/** Réglages reçus : jeu connu (sinon « gabarit »), éléments connus (sinon ceux du jeu) */
export function normaliserDetails(brut: unknown): ReglagesDetails {
  const o = brut && typeof brut === 'object' && !Array.isArray(brut) ? (brut as Record<string, unknown>) : {};
  const r = detailsDuJeu(o.jeu) as Record<string, string>;
  for (const e of Object.keys(ELEMENTS_DETAILS) as ElementDetails[]) if (valeursElement(e).includes(o[e] as string)) r[e] = o[e] as string;
  return r as ReglagesDetails;
}
export const estDetailsParDefaut = (d: ReglagesDetails) => (Object.keys(ELEMENTS_DETAILS) as ElementDetails[]).every((e) => d[e] === DETAILS_PAR_DEFAUT[e]);

// ---------------------------------------------------------------------------------------------------------------
// Feuille CSS
// ---------------------------------------------------------------------------------------------------------------

// Cibles : site (gabarits classique et coquille) et aperçu (classes ap-*, eff-*, forme-*, td-*)
const SECTION = ':is(.g-section,.section,.eff-section)';
/** Respiration : sections en pleine largeur (classique, village, revue ; aperçu .ap-section) et sections en cartes du tableau */
const SECTION_AIR = ':is(.section,.coquille--village .g-section,.coquille--revue .g-section,.ap-section:not(.ap-section--carte))';
const BLOC = ':is(.coquille--tableau .g-bloc__dedans,.ap-bloc)';
const H2 = ':is(h2,.ap-h2):not(:is(.prose,.ap-prose,summary) *)';
const CARTE = ':is(.g-carte,.g-bloc__dedans,.soin,.sujet__lien,.carte,.ap-carte,.eff-carte,.forme-carte)';
const BOUTON = ':is(.g-bouton,.bouton,.ap-bouton,.td-bouton)';
const VISUEL = ':is(.soin__visuel,.sujet__visuel,.pe__visuel,.eff-visuel,.forme-visuel,.td-visuel)';
const ENCADRE = ':is(blockquote,.fiche__cote,.td-encadre)';
const BADGE = ':is(.g-bulle,.td-badge)';
/** Hors fonds sombres (jamais de contour sombre sur un plan sombre : AA) */
const CLAIR = ':not(:is([data-fond=sombre],.surface-plan,.pied,.c-pied) *)';
const ACCENT = 'var(--g-vif,var(--accent))';
const LIGNE = 'var(--g-ligne,var(--ligne))';
const ENCRE = 'var(--g-encre,var(--encre))';

const svg = (s: string) => `url("data:image/svg+xml,${encodeURIComponent(s)}")`;
/** Point de la palette de pression (charte : --pression-n, bleu-vert → orange ; jamais le rouge du niveau 5) */
const point = (n: number, x: number, rayon: number) => `radial-gradient(circle at ${x}px 50%,var(--pression-${n},${ACCENT}) ${rayon}px,transparent ${rayon + 0.6}px)`;
/** Séparateurs : centrés sur le haut de la section (position absolue : aucun décalage), couleur de l'encre adoucie */
const SEPARATEURS: Record<Exclude<ValeursDetails['separateur'], 'aucun'>, { l: number; h: number; fond: string }> = {
  filet: { l: 120, h: 2, fond: 'background:currentColor' },
  double: { l: 160, h: 7, fond: 'border-block:1.5px solid currentColor' },
  ondulation: { l: 132, h: 12, fond: `background:${svg("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 132 12' fill='none' stroke='black' stroke-width='2' stroke-linecap='round'><path d='M2 6c8-8 14 8 22 0s14 8 22 0 14 8 22 0 14 8 22 0 14 8 22 0 14 8 18 0'/></svg>")} 0 0/100% 100% no-repeat;opacity:.45` },
  // Points de pression : la signature de la marque, en petit (niveaux 1 → 4 et retour)
  points: { l: 108, h: 10, fond: `background:${[[1, 5, 2.4], [2, 22, 3.2], [3, 40, 4], [4, 54, 4.6], [3, 68, 4], [2, 86, 3.2], [1, 103, 2.4]].map(([n, x, ra]) => point(n, x, ra)).join(',')}` },
};
const FONDS: Record<Exclude<ValeursDetails['fond'], 'aucun'>, string> = {
  trame: `background-image:radial-gradient(color-mix(in srgb,${ENCRE} 9%,transparent) 1.2px,transparent 1.7px);background-size:16px 16px`,
  grain: `background-image:${svg("<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='g'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .07 0'/></filter><rect width='160' height='160' filter='url(#g)'/></svg>")};background-size:160px 160px`,
  formes: `background-image:radial-gradient(38% 46% at 8% 18%,color-mix(in srgb,${ACCENT} 13%,transparent),transparent 70%),radial-gradient(30% 40% at 94% 82%,color-mix(in srgb,var(--g-accent-texte,var(--accent)) 10%,transparent),transparent 70%);background-size:100% 100%`,
  grille: `background-image:linear-gradient(color-mix(in srgb,${ENCRE} 6%,transparent) 1px,transparent 1px),linear-gradient(90deg,color-mix(in srgb,${ENCRE} 6%,transparent) 1px,transparent 1px);background-size:28px 28px`,
};

/** Feuille CSS des détails (racine `[data-td]`) ; vide pour le jeu « gabarit » sans retouche */
export function cssDetails(brut: unknown): string {
  const d = normaliserDetails(brut);
  if (estDetailsParDefaut(d)) return '';
  const r = '[data-td]';
  const css: string[] = [];
  const imp = (s: string) => s.replace(/\{([^{}]*)\}/g, (_, x: string) => `{${x.split(';').filter(Boolean).map((y) => (y.includes('!important') ? y : `${y}!important`)).join(';')}}`);
  if (d.separateur !== 'aucun') {
    const s = SEPARATEURS[d.separateur];
    css.push(imp(`${r} ${SECTION}+${SECTION}{position:relative}${r} ${SECTION}+${SECTION}::before{content:'';position:absolute;z-index:1;left:50%;top:0;width:${s.l}px;height:${s.h}px;transform:translate(-50%,-50%);color:color-mix(in srgb,${ENCRE} 40%,transparent);pointer-events:none;${s.fond}}`));
  }
  if (d.souligne === 'trait') css.push(imp(`${r} ${H2}{text-decoration:underline;text-decoration-color:${ACCENT};text-decoration-thickness:.14em;text-underline-offset:.22em;text-decoration-skip-ink:none}`));
  if (d.souligne === 'surligneur') css.push(imp(`${r} ${H2}{text-decoration:underline;text-decoration-color:color-mix(in srgb,${ACCENT} 34%,transparent);text-decoration-thickness:.42em;text-underline-offset:-.24em;text-decoration-skip-ink:none}`));
  if (d.souligne === 'vague') css.push(imp(`${r} ${H2}{text-decoration:underline wavy;text-decoration-color:${ACCENT};text-decoration-thickness:2px;text-underline-offset:.3em;text-decoration-skip-ink:none}`));
  if (d.citation === 'filet') css.push(imp(`${r} ${ENCADRE}{border-left:4px solid ${ACCENT};border-radius:0;padding-left:22px;background:none;box-shadow:none}`));
  if (d.citation === 'guillemets') css.push(imp(`${r} ${ENCADRE}{position:relative;padding-top:44px;background:none;box-shadow:none;border-top:1px solid ${LIGNE}}${r} ${ENCADRE}::before{content:'“';position:absolute;left:0;top:-6px;font-family:var(--police-titres);font-size:4.2rem;line-height:1;color:${ACCENT}}`));
  if (d.citation === 'aplat') css.push(imp(`${r} ${ENCADRE}{background:var(--g-doux,var(--doux));border-radius:var(--rayon-carte,var(--rayon));padding:26px;box-shadow:none}`));
  if (d.badge === 'contour') css.push(imp(`${r} ${BADGE}{background:transparent;box-shadow:inset 0 0 0 1.5px currentColor;color:${ENCRE}}`));
  if (d.badge === 'plein') css.push(imp(`${r} ${BADGE}{background:${ACCENT};color:var(--g-vif-texte,#fff);box-shadow:none}`));
  if (d.badge === 'carre') css.push(imp(`${r} ${BADGE}{border-radius:4px}`));
  if (d.fond !== 'aucun') css.push(imp(`${r} ${SECTION}:nth-of-type(2n){${FONDS[d.fond]}}`));
  const rayons = { carres: ['2px', '2px'], arrondis: ['14px', '18px'], 'tres-arrondis': ['28px', '36px'], mixtes: ['24px', '30px'] } as const;
  if (d.coins !== 'gabarit') {
    const [a, b] = rayons[d.coins];
    css.push(imp(`${r}{--rayon:${a};--rayon-carte:${b};--rayon-grand:${b}}`));
    if (d.coins === 'mixtes') css.push(imp(`${r} ${CARTE}{border-radius:${b} 4px ${b} 4px}`));
  }
  if (d.ombres === 'aucune') css.push(imp(`${r} ${CARTE}{box-shadow:inset 0 0 0 1px ${LIGNE}}`));
  if (d.ombres === 'douce') css.push(imp(`${r} ${CARTE}{box-shadow:0 1px 2px rgb(20 30 50 / .06),0 12px 32px -12px rgb(20 30 50 / .18)}`));
  if (d.ombres === 'portee') css.push(imp(`${r} ${CARTE}${CLAIR}{box-shadow:inset 0 0 0 1.5px ${ENCRE},7px 7px 0 ${ACCENT}}`));
  if (d.boutons === 'contour') css.push(imp(`${r} ${BOUTON}${CLAIR}{background:transparent;color:${ENCRE};box-shadow:inset 0 0 0 2px ${ENCRE}}`));
  if (d.boutons === 'pilule') css.push(imp(`${r} ${BOUTON}{border-radius:999px;padding-inline:28px}`));
  if (d.boutons === 'fleche') css.push(`${r} ${BOUTON}::after{content:'→';display:inline-block;margin-left:10px;transition:transform .2s ease-out}@media (prefers-reduced-motion:no-preference){${r} ${BOUTON}:hover::after{transform:translateX(5px)}}`);
  if (d.densite === 'compacte') css.push(imp(`${r} ${SECTION_AIR}{padding-block:clamp(26px,3.6vw,44px)}${r} ${BLOC}{padding:clamp(20px,3vw,30px)}`));
  if (d.densite === 'tres-aeree') css.push(imp(`${r} ${SECTION_AIR}{padding-block:clamp(64px,9vw,128px)}${r} ${BLOC}{padding:clamp(34px,6vw,84px)}${r} :is(.coquille--tableau .g-section.g-bloc,.ap-section--carte){padding-top:36px}`));
  // Cadres d'images (seulement si la forme des cartes est celle du modèle : formes.ts prime)
  const v = `${r}:is(:not([data-forme]),[data-forme=gabarit]) ${VISUEL}`;
  if (d.cadre === 'arrondi') css.push(imp(`${v}{border-radius:22px;overflow:hidden}`));
  if (d.cadre === 'organique') css.push(imp(`${v}{border-radius:42% 58% 63% 37%/45% 39% 61% 55%;overflow:hidden}`));
  if (d.cadre === 'decale') css.push(imp(`${v}{box-shadow:10px 10px 0 ${ACCENT};border-radius:var(--rayon,6px)}`));
  return css.join('');
}

// ---------------------------------------------------------------------------------------------------------------
// Notables, libellés
// ---------------------------------------------------------------------------------------------------------------

/** Clés notables (assets_notes, type details) : `details:jeu:<id>`, `details:<élément>:<valeur>` */
export const clesDetails = (d: ReglagesDetails): string[] => [`details:jeu:${d.jeu}`, ...(Object.keys(ELEMENTS_DETAILS) as ElementDetails[]).map((e) => `details:${e}:${d[e]}`)];
export const toutesClesDetails = (): string[] => [
  ...JEUX_DETAILS.filter((j) => j.id !== 'gabarit').map((j) => `details:jeu:${j.id}`),
  ...(Object.keys(ELEMENTS_DETAILS) as ElementDetails[]).flatMap((e) => valeursElement(e).filter((v) => !['aucun', 'gabarit', 'aucune'].includes(v)).map((v) => `details:${e}:${v}`)),
];
export function estCleDetails(k: unknown): boolean {
  if (typeof k !== 'string') return false;
  const [type, e, v, ...reste] = k.split(':');
  if (type !== 'details' || reste.length || !v) return false;
  if (e === 'jeu') return Boolean(jeuDetails(v));
  return e in ELEMENTS_DETAILS && valeursElement(e as ElementDetails).includes(v);
}
export function libelleCleDetails(k: string): string {
  const [, e, v] = k.split(':');
  if (e === 'jeu') return `Jeu de détails : ${jeuDetails(v)?.nom ?? v}`;
  return `${NOMS_ELEMENTS_DETAILS[e as ElementDetails] ?? e} : ${(ELEMENTS_DETAILS[e as ElementDetails] as readonly { id: string; nom: string }[] | undefined)?.find((x) => x.id === v)?.nom ?? v}`;
}
/** Détails montrés par une clé : le jeu entier, ou l'élément posé sur `d` */
export function detailsPourCle(d: ReglagesDetails, k: string): ReglagesDetails {
  const [, e, v] = k.split(':');
  return e === 'jeu' ? detailsDuJeu(v) : normaliserDetails({ ...d, [e]: v });
}
export const libelleDetails = (d: ReglagesDetails) => `${jeuDetails(d.jeu)?.nom ?? d.jeu}${(Object.keys(ELEMENTS_DETAILS) as ElementDetails[]).some((e) => d[e] !== detailsDuJeu(d.jeu)[e]) ? ' (retouché)' : ''}`;
