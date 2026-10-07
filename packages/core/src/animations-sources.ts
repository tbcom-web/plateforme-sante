// Ingrédients de base de chaque animation (règle de Paul, 2026-10-07) : « Je ne générerais jamais d'animation avant d'avoir validé
// les ingrédients initiaux. Les animations sont faites à partir des images de base, les ingrédients de base. »
//
// Pour chaque animation d'accueil (ANIMATIONS, packs.ts) : les clés de l'inventaire (assets.ts / illustrations.ts) dont elle reprend
// la géométrie — dessins des registres relevé et pédagogique, matériel, éléments de la bibliothèque. Une animation est « en attente »
// tant qu'un de ses ingrédients n'est pas au statut « valide » dans /admin/illustrations : sa carte de notation (/admin/retours)
// le dit, liste les ingrédients à valider et passe après tout le reste dans le tirage ; SYNTHESE.md (scripts/exporter-retours.mjs)
// les liste. Règle de production (.claude/agents/graphiste-sante.md) : aucune animation nouvelle ou modifiée tant que ses
// ingrédients ne sont pas validés, et toujours construite À PARTIR de leurs géométries, jamais de formes nouvelles.
// Test : animations-sources.test.ts (chaque animation a des sources, toutes présentes dans l'inventaire).
import { ANIMATIONS, LIBELLES_ANIMATIONS, type Animation } from './packs';
import { LIBELLES_STATUTS_ILLUSTRATION, type StatutIllustration } from './illustrations';
import { inventaireAssets, type Asset } from './assets';

export interface SourceAnimation {
  /** Clé de l'inventaire (dessin:…, materiel:…, biblio:…) */
  cle: string;
  /** Ce que l'animation en reprend */
  role: string;
}

/** Ingrédients de base de chaque animation (clés de l'inventaire) */
export const SOURCES_ANIMATIONS: Record<Animation, readonly SourceAnimation[]> = {
  podoscope: [
    { cle: 'materiel:podoscope:releve', role: 'Le podoscope (relevé) : plateau et lecture des appuis' },
    { cle: 'biblio:POD-SC-0007', role: 'Empreinte plantaire (trace d’appui) : forme des deux empreintes' },
    { cle: 'dessin:analyse:releve', role: 'Dessin « analyse » (relevé) : trame de points colorés par la pression' },
    { cle: 'dessin:analyse:pedagogique', role: 'Dessin « analyse » (pédagogique) : image calme de l’animation' },
  ],
  coureur: [
    { cle: 'dessin:sport:releve', role: 'Dessin « sport » (relevé) : foulée, chaussure de course' },
    { cle: 'dessin:sport:pedagogique', role: 'Dessin « sport » (pédagogique) : image calme de l’animation' },
    { cle: 'materiel:tapis-de-course:releve', role: 'Tapis de course (relevé) : laboratoire d’analyse de la foulée' },
  ],
  trajectoire: [
    { cle: 'dessin:equilibre:releve', role: 'Dessin « équilibre » (relevé) : appuis et centre de pression' },
    { cle: 'dessin:equilibre:pedagogique', role: 'Dessin « équilibre » (pédagogique) : image calme de l’animation' },
    { cle: 'biblio:POD-SC-0007', role: 'Empreinte plantaire (trace d’appui) : contour des deux pieds' },
    { cle: 'materiel:stabilometrie:releve', role: 'Plateforme de stabilométrie (relevé) : tracé du centre de pression' },
  ],
  'premiers-pas': [
    { cle: 'dessin:enfant:releve', role: 'Dessin « enfant » (relevé) : empreintes d’enfant en trame de points' },
    { cle: 'dessin:enfant:pedagogique', role: 'Dessin « enfant » (pédagogique) : image calme de l’animation' },
  ],
  semelle: [
    { cle: 'dessin:semelle:releve', role: 'Dessin « semelle » (relevé) : courbes de relief de la semelle' },
    { cle: 'dessin:semelle:pedagogique', role: 'Dessin « semelle » (pédagogique) : image calme de l’animation' },
    { cle: 'biblio:POD-AT-0004', role: 'Semelle orthopédique (bibliothèque, vue de dessus) : contour de la semelle' },
    { cle: 'biblio:EZ-HTML/semelle-ortho', role: 'Semelle orthopédique en couleur (bibliothèque) : pièces de la semelle' },
  ],
  meulage: [
    { cle: 'biblio:POD-AT-0003:profil-medial:ongle-epais', role: 'Hallux de profil, ongle épaissi (bibliothèque) : géométrie de la scène' },
    { cle: 'biblio:POD-AT-0003:profil-medial:ongle-epais-meulage', role: 'Fraise et pièce à main du micromoteur (bibliotheque/soins-ongles.ts)' },
    { cle: 'dessin:ongles-epais:releve', role: 'Dessin « ongles épais » (relevé)' },
    { cle: 'dessin:ongles-epais:pedagogique', role: 'Dessin « ongles épais » (pédagogique)' },
  ],
};

export const cleAnimation = (a: Animation) => `animation:${a}`;
/** Animation d'une clé `animation:<nom>` (sinon null) */
export function animationDeCle(cle: string): Animation | null {
  const nom = cle.startsWith('animation:') ? cle.slice('animation:'.length) : '';
  return (ANIMATIONS as readonly string[]).includes(nom) ? (nom as Animation) : null;
}

export interface IngredientAnimation {
  cle: string;
  role: string;
  /** Titre et précision de l'asset dans l'inventaire */
  titre: string;
  detail?: string;
  /** Statut courant (revue enregistrée, sinon statut par défaut de l'asset) */
  statut: StatutIllustration;
  valide: boolean;
  /** Clé absente de l'inventaire (dessin renommé) : jamais validable, à corriger dans SOURCES_ANIMATIONS */
  inconnu?: boolean;
}

export interface EtatAnimation {
  animation: Animation;
  cle: string;
  titre: string;
  ingredients: IngredientAnimation[];
  /** Au moins un ingrédient n'est pas « valide » */
  enAttente: boolean;
  /** Ingrédients à valider d'abord */
  aValider: IngredientAnimation[];
}

let index: Map<string, Asset> | null = null;
const assetDe = (cle: string) => (index ??= new Map(inventaireAssets().map((a) => [a.cle, a]))).get(cle);

type Statuts = ReadonlyMap<string, StatutIllustration> | Readonly<Record<string, StatutIllustration | undefined>>;
const lire = (s: Statuts, cle: string) => (s instanceof Map ? s.get(cle) : (s as Record<string, StatutIllustration | undefined>)[cle]);

/** État des ingrédients d'une animation, d'après les statuts enregistrés (illustrations_statuts) */
export function etatAnimation(a: Animation, statuts: Statuts = {}): EtatAnimation {
  const ingredients = SOURCES_ANIMATIONS[a].map((s): IngredientAnimation => {
    const asset = assetDe(s.cle);
    const statut = lire(statuts, s.cle) ?? asset?.statutParDefaut ?? 'a_revoir';
    return { cle: s.cle, role: s.role, titre: asset?.titre ?? s.cle, detail: asset?.detail, statut, valide: Boolean(asset) && statut === 'valide', ...(asset ? {} : { inconnu: true }) };
  });
  const aValider = ingredients.filter((i) => !i.valide);
  return { animation: a, cle: cleAnimation(a), titre: LIBELLES_ANIMATIONS[a] ?? a, ingredients, enAttente: aValider.length > 0, aValider };
}

/** État de toutes les animations */
export const etatsAnimations = (statuts: Statuts = {}) => (ANIMATIONS as readonly Animation[]).map((a) => etatAnimation(a, statuts));

/** Une clé d'asset est-elle une animation en attente d'ingrédients validés ? */
export function animationEnAttente(cle: string, statuts: Statuts = {}): boolean {
  const a = animationDeCle(cle);
  return a ? etatAnimation(a, statuts).enAttente : false;
}

/** Section Markdown « Animations en attente d'ingrédients validés » (synthèse de /admin/retours et SYNTHESE.md) */
export function markdownAnimationsEnAttente(statuts: Statuts = {}, o: { titre?: string } = {}): string {
  const attente = etatsAnimations(statuts).filter((e) => e.enAttente);
  const l = [o.titre ?? '## Animations en attente d’ingrédients validés', ''];
  if (!attente.length) {
    l.push('Aucune : toutes les animations ont leurs ingrédients de base validés.');
    return l.join('\n');
  }
  l.push(
    'Règle de Paul : aucune animation créée ni modifiée tant que ses images de base ne sont pas « Validé » dans /admin/illustrations ;',
    'une animation se construit À PARTIR des ingrédients validés (mêmes géométries). Source : packages/core/src/animations-sources.ts.',
    '',
  );
  for (const e of attente) {
    l.push(`### \`${e.cle}\` — ${e.titre} (${e.aValider.length} ingrédient${e.aValider.length > 1 ? 's' : ''} sur ${e.ingredients.length} à valider)`);
    for (const i of e.ingredients) l.push(`- ${i.valide ? '[x]' : '[ ]'} \`${i.cle}\` — ${i.role} : ${i.inconnu ? 'absent de l’inventaire' : LIBELLES_STATUTS_ILLUSTRATION[i.statut]}`);
    l.push('');
  }
  return l.join('\n').trimEnd();
}
