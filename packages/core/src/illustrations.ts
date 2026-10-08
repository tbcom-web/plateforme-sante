// Inventaire des illustrations et revue par le super admin (/admin/illustrations, migration 0021).
//
// L'inventaire est calculé depuis les listes du core (aucune liste recopiée à la main) : dessins techniques (DESSINS_PODOLOGIE)
// en registres « relevé » et « pédagogique », dessins au trait continu (DESSINS_LIGNE), dessins du matériel (EQUIPEMENTS_DESSINES),
// pictos (PICTOS), images fixes des animations d'accueil (ANIMATIONS) et déclinaisons de la bibliothèque partagée (BIBLIOTHEQUE).
// Chaque illustration a une clé stable (`dessin:orthonyxie:releve`, `picto:orthonyxie`, `biblio:POD-AT-0001`…) : c'est elle que
// la table illustrations_revues enregistre. Renommer un dessin dans le code change sa clé : sa revue repart de « À revoir ».
//
// Le statut de revue ne modifie pas encore le rendu des sites : illustrationUtilisable() est prête pour un usage futur.
import { DESSINS_PODOLOGIE, type NomDessin } from './univers';
import { ANIMATIONS, LIBELLES_ANIMATIONS, type Animation } from './packs';
import { EQUIPEMENTS_DESSINES, svgAnimationFixe, svgDessin, svgEquipement, type Registre } from './dessins';
import { DESSINS_LIGNE, LIGNE_DESSIN, svgLigne, type NomLigne } from './ligne';
import { FAMILLES_PICTOS, PICTOS, PICTOS_SOINS, svgPicto, type Famille } from './pictos';
import { BIBLIOTHEQUE, svgElement, type StatutBibliotheque } from './bibliotheque/catalogue';
import { VISUELS_SOINS } from './jeux';
import { EQUIPEMENTS } from './equipements';
import { THEMES_ILLUSTRES, illustrationTheme, sourcesTheme } from './heros-themes';
import { THEMES } from './themes';
import { SPORTS, FICHES_SPORTS, svgSport } from './sports';
import { clesSport, sujetsDesKits } from './kits';
import { DESSINS_UNIVERS, FICHES_DESSINS_UNIVERS, svgDessinUnivers, sujetsUnivers } from './dessins-univers';
import { STYLES_EXPERIMENTAUX, SUJETS_STYLES, FICHES_STYLES, LIBELLES_SUJETS_STYLES, SUJET_VISUEL_STYLES, cleStyleExperimental, svgStyleExperimental, type StyleExperimental } from './styles-experimentaux';

/** Statut de revue d'une illustration (valeurs de la colonne `statut` de la migration 0021) */
export type StatutIllustration = 'a_revoir' | 'valide' | 'a_retravailler' | 'retire';
export const STATUTS_ILLUSTRATION: readonly StatutIllustration[] = ['a_revoir', 'valide', 'a_retravailler', 'retire'];
export const LIBELLES_STATUTS_ILLUSTRATION: Record<StatutIllustration, string> = {
  a_revoir: 'À revoir',
  valide: 'Validé',
  a_retravailler: 'À retravailler',
  retire: 'Retiré',
};
export const estStatutIllustration = (s: unknown): s is StatutIllustration => typeof s === 'string' && (STATUTS_ILLUSTRATION as readonly string[]).includes(s);

/**
 * Une illustration peut-elle être montrée sur un site ? Seul « Retiré » l'exclut : « À revoir » et « À retravailler » restent
 * utilisables (le dessin actuel reste en place tant que la retouche n'est pas livrée). Statut absent = jamais revue = utilisable.
 * Pas encore branché sur la génération des sites (apps/sites) : à utiliser le jour où l'on filtre les visuels par revue.
 */
export function illustrationUtilisable(statut: StatutIllustration | null | undefined): boolean {
  return statut !== 'retire';
}

export type TypeIllustration = 'dessin' | 'materiel' | 'picto' | 'animation' | 'bibliotheque' | 'heros';
export const LIBELLES_TYPES_ILLUSTRATION: Record<TypeIllustration, string> = {
  dessin: 'Dessin',
  materiel: 'Matériel',
  picto: 'Picto',
  animation: 'Animation',
  bibliotheque: 'Bibliothèque',
  heros: 'Héros de thème',
};
export const LIBELLES_REGISTRES: Record<Registre, string> = { releve: 'Relevé', pedagogique: 'Pédagogique', ligne: 'Trait continu' };

export interface Illustration {
  /** Clé stable enregistrée en base */
  cle: string;
  type: TypeIllustration;
  /** Registre de rendu (absent pour les pictos) */
  registre?: Registre;
  titre: string;
  /** Précision affichée sous le titre (famille du picto, vue et état de la bibliothèque…) */
  detail?: string;
  /** Fichier source à retoucher (chemin depuis la racine du dépôt), et fonction ou forme concernée */
  source: string;
  /** Soins du catalogue (slugs) ou sujets où l'illustration sert */
  soins: string[];
  /** Statut par défaut quand aucune revue n'est enregistrée (bibliothèque : statut du catalogue) */
  statutParDefaut: StatutIllustration;
  /** Fond conseillé pour l'aperçu */
  fond: 'grille' | 'plan' | 'doux' | 'clair';
  /** Rendu SVG (chaîne) : les couleurs viennent des variables CSS de la charte et de la gamme du conteneur */
  svg: () => string;
  /** Rendu complémentaire montré dans la vue agrandie (bibliothèque : registre relevé) */
  svgVariante?: () => string;
  /** Registre EXPÉRIMENTAL (styles-experimentaux.ts, brouillon : ni générateur, ni sites, ni Studio) ; `registre` absent */
  style?: StyleExperimental;
}

/** Statut du catalogue de la bibliothèque → statut de revue par défaut */
export function statutRevueBibliotheque(s: StatutBibliotheque): StatutIllustration {
  if (s === 'valide') return 'valide';
  if (s === 'retire') return 'retire';
  return 'a_revoir';
}

const soinsDuDessin = (nom: NomDessin) => Object.entries(VISUELS_SOINS).filter(([, c]) => c.dessin === nom).map(([slug]) => slug);
const unique = (l: string[]) => [...new Set(l)];

let memo: Illustration[] | null = null;

/** Inventaire complet, dans l'ordre : dessins, trait continu, matériel, animations, pictos, bibliothèque */
export function inventaireIllustrations(): Illustration[] {
  if (memo) return memo;
  const l: Illustration[] = [];
  for (const nom of DESSINS_PODOLOGIE) {
    for (const registre of ['releve', 'pedagogique'] as const) {
      l.push({
        cle: `dessin:${nom}:${registre}`, type: 'dessin', registre, titre: nom, detail: LIBELLES_REGISTRES[registre],
        source: `packages/core/src/dessins.ts — corps('${nom}')`, soins: soinsDuDessin(nom), statutParDefaut: 'a_revoir',
        fond: registre === 'releve' ? 'grille' : 'doux',
        svg: () => svgDessin(nom, { registre, id: `rv-${nom}-${registre}` }),
      });
    }
  }
  for (const nom of DESSINS_LIGNE) {
    const dessins = Object.entries(LIGNE_DESSIN).filter(([, n]) => n === nom).map(([d]) => d as NomDessin);
    l.push({
      cle: `ligne:${nom}`, type: 'dessin', registre: 'ligne', titre: nom,
      detail: dessins.length ? `Trait continu · sert à : ${dessins.join(', ')}` : 'Trait continu',
      source: `packages/core/src/ligne.ts — '${nom}'`, soins: unique(dessins.flatMap(soinsDuDessin)), statutParDefaut: 'a_revoir', fond: 'clair',
      svg: () => svgLigne(nom as NomLigne),
    });
  }
  // Kit Sports (2026-10-07, brouillons) : un trait continu et un dessin pédagogique par sport (sports.ts) ; sujet « sport » par défaut
  for (const sport of SPORTS) {
    const f = FICHES_SPORTS[sport], cles = clesSport(sport);
    l.push({
      cle: cles.ligne, type: 'dessin', registre: 'ligne', titre: `${f.libelle} (kit Sports)`, detail: `Trait continu · ${f.regard}`,
      source: `packages/core/src/sports.ts — scene('${sport}')`, soins: ['sport'], statutParDefaut: 'a_revoir', fond: 'clair',
      svg: () => svgSport(sport, 'ligne'),
    });
    l.push({
      cle: cles.pedagogique, type: 'dessin', registre: 'pedagogique', titre: `${f.libelle} (kit Sports)`, detail: `Pédagogique · ${f.regard}`,
      source: `packages/core/src/sports.ts — scene('${sport}')`, soins: ['sport'], statutParDefaut: 'a_revoir', fond: 'doux',
      svg: () => svgSport(sport, 'pedagogique'),
    });
  }
  // Planche « ce qui manque » (2026-10-08, brouillons) : illustrations nouvelles en registre pédagogique (dessins-univers.ts) ;
  // base `dessin:<id>` (bases-illustrations.ts), sujets et hashtags par défaut tirés de leur fiche
  for (const nom of DESSINS_UNIVERS) {
    const f = FICHES_DESSINS_UNIVERS[nom];
    l.push({
      cle: `dessin:${nom}:pedagogique`, type: 'dessin', registre: 'pedagogique', titre: f.libelle, detail: `Pédagogique · ${f.regard}`,
      source: `packages/core/src/dessins-univers.ts — corps('${nom}')`, soins: sujetsUnivers(`dessin:${nom}:pedagogique`), statutParDefaut: 'a_revoir', fond: 'doux',
      svg: () => svgDessinUnivers(nom, { id: `rv-du-${nom}` }),
    });
  }
  // Registres expérimentaux (2026-10-07, brouillons à noter) : 5 sujets × 4 styles, clé dessin:<sujet>:<style>, hashtag #style-<style>
  // (HASHTAGS_PAR_DEFAUT, kits.ts) ; vue agrandie = format portrait (premier écran téléphone)
  for (const style of STYLES_EXPERIMENTAUX) {
    for (const sujet of SUJETS_STYLES) {
      l.push({
        cle: cleStyleExperimental(sujet, style), type: 'dessin', style, titre: `${LIBELLES_SUJETS_STYLES[sujet]} (${FICHES_STYLES[style].nom})`,
        detail: `Style expérimental « ${FICHES_STYLES[style].nom} » · brouillon, non branché sur les sites`,
        source: `packages/core/src/styles-experimentaux.ts — style${style[0].toUpperCase()}${style.slice(1)} / compo '${sujet}'`, soins: [SUJET_VISUEL_STYLES[sujet]],
        statutParDefaut: 'a_revoir', fond: 'clair',
        svg: () => svgStyleExperimental(sujet, style, { id: `rv-se-${sujet}-${style}` }),
        svgVariante: () => svgStyleExperimental(sujet, style, { id: `rv-sep-${sujet}-${style}`, format: 'portrait' }),
      });
    }
  }
  for (const id of EQUIPEMENTS_DESSINES) {
    const e = EQUIPEMENTS.find((x) => x.id === id);
    for (const registre of ['releve', 'pedagogique', 'ligne'] as const) {
      l.push({
        cle: `materiel:${id}:${registre}`, type: 'materiel', registre, titre: e?.libelle ?? id, detail: `${id} · ${LIBELLES_REGISTRES[registre]}`,
        source: `packages/core/src/dessins.ts — corpsEquipement('${id}')${registre === 'ligne' ? ' / ligne.ts' : ''}`, soins: e?.soins ?? [],
        statutParDefaut: 'a_revoir', fond: registre === 'releve' ? 'grille' : registre === 'ligne' ? 'clair' : 'doux',
        svg: () => svgEquipement(id, { registre, id: `rv-m-${id}-${registre}` }),
      });
    }
  }
  for (const a of ANIMATIONS as readonly Animation[]) {
    l.push({
      cle: `animation:${a}`, type: 'animation', registre: 'releve', titre: a, detail: LIBELLES_ANIMATIONS[a],
      source: a === 'meulage' ? 'packages/core/src/meulage.ts — svgMeulage (animation du site : Meulage.astro ; ÉcranZen : packages/contenus/scripts/exporter-animation.mjs)' : `packages/core/src/dessins.ts — svgAnimationFixe('${a}') (animation du site : apps/sites)`,
      soins: Object.entries(VISUELS_SOINS).filter(([, c]) => c.animation === a).map(([slug]) => slug), statutParDefaut: 'a_revoir', fond: 'plan',
      svg: () => svgAnimationFixe(a, { id: `rv-a-${a}` }),
    });
  }
  for (const p of PICTOS) {
    l.push({
      cle: `picto:${p.id}`, type: 'picto', titre: p.libelle, detail: `${p.id} · ${FAMILLES_PICTOS[p.famille as Famille] ?? p.famille}`,
      source: `packages/core/src/pictos.ts — '${p.id}'`, soins: [...Object.entries(PICTOS_SOINS).filter(([, v]) => v === p.id).map(([slug]) => slug), ...sujetsDesKits(`picto:${p.id}`), ...sujetsUnivers(`picto:${p.id}`)],
      statutParDefaut: 'a_revoir', fond: 'clair',
      svg: () => svgPicto(p.id, { taille: '100%', accent: true }) ?? '',
    });
  }
  // Héros des thèmes (heros-themes.ts, 2026-10-06) : une revue par thème et par registre ; vue agrandie = format portrait (téléphone)
  for (const t of THEMES_ILLUSTRES) {
    const theme = THEMES.find((x) => x.id === t);
    for (const registre of ['releve', 'pedagogique', 'ligne'] as const) {
      l.push({
        cle: `heros:${t}:${registre}`, type: 'heros', registre, titre: theme?.libelle ?? t,
        detail: `${LIBELLES_REGISTRES[registre]} · paysage 16:9 et portrait 3:4 · ${sourcesTheme(t, registre).join(' + ')}`,
        source: `packages/core/src/heros-themes.ts — COMPOSITIONS.${t}.${registre}`, soins: [...(theme?.soins ?? [])], statutParDefaut: 'a_revoir', fond: 'clair',
        svg: () => illustrationTheme(t, { format: 'paysage', registre, id: `rv-h-${t}-${registre}` }),
        svgVariante: () => illustrationTheme(t, { format: 'portrait', registre, id: `rv-hp-${t}-${registre}` }),
      });
    }
  }
  const soinsConnus = new Set([...Object.keys(VISUELS_SOINS), ...Object.keys(PICTOS_SOINS)]);
  for (const e of BIBLIOTHEQUE) {
    e.declinaisons.forEach((dd, i) => {
      // Première déclinaison (vue canonique) : `biblio:<id>` ; les suivantes : `biblio:<id>:<vue>:<état>`
      const cle = i === 0 ? `biblio:${e.id}` : `biblio:${e.id}:${dd.vue}:${dd.etat}`;
      l.push({
        cle, type: 'bibliotheque', registre: 'pedagogique', titre: e.titre, detail: `${e.id} · ${dd.vue} · ${dd.etat}`,
        source: `${dd.source ?? e.source} — forme « ${dd.forme} » (packages/core/src/bibliotheque/)`,
        soins: unique([...e.sujets, ...(soinsConnus.has(dd.etat) ? [dd.etat] : [])]), statutParDefaut: statutRevueBibliotheque(dd.statut ?? e.statut), fond: 'doux',
        svg: () => svgElement(e.id, { vue: dd.vue, etat: dd.etat }),
        svgVariante: () => svgElement(e.id, { vue: dd.vue, etat: dd.etat, registre: 'releve' }),
      });
    });
  }
  memo = l;
  return l;
}

/** Empreinte courte d'un rendu SVG (FNV-1a 32 bits, hexadécimal) : signale une illustration modifiée depuis sa dernière revue */
export function empreinteSvg(svg: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < svg.length; i++) {
    h ^= svg.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export interface RetourIllustration {
  cle: string;
  titre: string;
  source: string;
  statut: StatutIllustration;
  commentaire: string | null;
  le: string | null;
  auteur?: string | null;
}

/** Markdown des retours à traiter (statut « À retravailler »), pour l'agent graphiste */
export function markdownRetours(retours: RetourIllustration[], date = new Date()): string {
  const a = retours.filter((r) => r.statut === 'a_retravailler');
  const lignes = [
    `# Retours illustrations à traiter (${a.length})`,
    '',
    `Export de /admin/illustrations le ${date.toLocaleDateString('fr-FR')}. Après retouche, l'illustration repasse « À revoir » dans l'admin ; seul Paul la passe en « Validé ».`,
    '',
  ];
  for (const r of a) {
    lignes.push(`## \`${r.cle}\` — ${r.titre}`, `- Fichier : ${r.source}`);
    lignes.push(`- Retour${r.le ? ` du ${new Date(r.le).toLocaleDateString('fr-FR')}` : ''}${r.auteur ? ` (${r.auteur})` : ''} : ${r.commentaire?.trim() || '(sans commentaire)'}`, '');
  }
  if (!a.length) lignes.push('Aucune illustration à retravailler.');
  return lignes.join('\n');
}
