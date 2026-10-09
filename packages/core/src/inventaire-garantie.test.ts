// GARANTIE (exigence de Paul du 2026-10-08 : « il faut absolument que tous les nouveaux "ingrédients" passent par le filtre de
// notation de base ») : tout ingrédient que le générateur, le Studio, l'atelier, les duels ou les kits peuvent tirer doit être
// présent dans l'inventaire de notation (inventaireAssets ∪ inventaireStudio), donc notable dans « Donner mon avis ».
// Ce test parcourt toutes les sources d'ingrédients du code et échoue en listant les clés absentes. Un agent qui ajoute un
// ingrédient (nouvelle valeur d'un registre, nouveau picto, nouvelle animation…) sans le brancher dans l'inventaire le voit ici.
// Voir aussi inventaire-connu.test.ts (registre des nouveautés : npm run inventaire:maj).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inventaireAssets, inventaireStudio } from './assets';
import { lireCleStructure, ORDRES_ACCUEIL, clesRecette, compositionInitiale, DIMENSIONS_RECETTE, FAMILLES_COMPOSANTS, PAGES_STRUCTURE, tirerDimension, tirerPage, toutChanger, photosIntegreesBanque, type ContexteRecette, type CompositionRecette, type PageStructure } from './recettes';
import { VARIANTES_SECTIONS, PAIRES_POLICES, type Variantes } from './modeles';
import { TRAITEMENTS_PHOTOS, cleTraitementPhotos } from './traitements-photos';
import { JEUX_EFFETS } from './effets';
import { SURFACES, cleAssetSurfaces } from './surfaces';
import { GAMMES } from './gammes';
import { STRUCTURES } from './propositions';
import { toutesClesTypo } from './typo';
import { toutesClesDetails } from './details';
import { toutesClesMenu } from './menus';
import { ANIMATIONS } from './packs';
import { VISUELS_SOINS } from './jeux';
import { SOURCES_ANIMATIONS } from './animations-sources';
import { PICTOS } from './pictos';
import { DIRECTIONS_PICTOS, ECHANTILLON_DIRECTIONS, cleDirection, cleStyleIcones } from './pictos-directions';
import { KITS, clesDuKit } from './kits';
import { SPORTS } from './sports';
import { THEMES_ILLUSTRES } from './heros-themes';
import { SCENES_HEROS } from './heros-scenes';
import { DESSINS_PODOLOGIE } from './univers';
import { DESSINS_LIGNE } from './ligne';
import { EQUIPEMENTS_DESSINES } from './dessins';
import { DESSINS_UNIVERS } from './dessins-univers';
import { CLES_UNIVERS_DIABETE } from './univers-diabete';
import { STYLES_EXPERIMENTAUX, SUJETS_STYLES, cleStyleExperimental } from './styles-experimentaux';
import { PHOTOS_INTEGREES } from './jeux-photos';
import { clePhoto, estCleNeutre } from './assets-poids';
import { ANIMATIONS_ENTETE, PREMIERS_ECRANS_NOUVEAUX, TRANSITIONS_DIAPORAMA, TRANSITIONS_SECTIONS, INGREDIENTS_A_VALIDER } from './heros-photo-variantes';
import { ANIMATIONS_EMPREINTES } from './entete-empreintes';
import { PRESENTATIONS_PORTRAITS } from './portraits-variantes';
import { ETIQUETTES_HARMONIE } from './harmonie';

const inventaire = () => new Set([...inventaireAssets(), ...inventaireStudio()].map((a) => a.cle));

/** Valeurs « neutres » qui ne sont pas des ingrédients à juger seuls (celle du modèle, aucune animation) */
const NEUTRES: Readonly<Record<string, readonly string[]>> = { 'soins-forme': ['gabarit'], 'entete-anim': ['aucune'] };

/** Clé notable d'une valeur de section : l'élément (`composant:<famille>:<v>`), sinon la structure de sa page (page à une section) */
function cleSection(s: string, v: string): string | null {
  if ((FAMILLES_COMPOSANTS as string[]).includes(s)) return `composant:${s}:${v}`;
  const p = PAGES_STRUCTURE.find((x) => !x.ordre && x.sections.length === 1 && x.sections[0] === s);
  return p ? `structure:${p.id}:${v}` : null;
}

function manquants(sources: Record<string, Iterable<string>>): string[] {
  const inv = inventaire();
  const l: string[] = [];
  for (const [source, cles] of Object.entries(sources)) for (const k of cles) if (!inv.has(k)) l.push(`${source} → ${k}`);
  return [...new Set(l)];
}

/** Structure partielle (gabarit classique : seules ses sections variables) : valeurs lues dans l'ordre des axes, axes absents sautés */
function lireStructurePartielle(cle: string): { variantes: Record<string, string> } | null {
  const [, id, b] = cle.split(':');
  const p = PAGES_STRUCTURE.find((x) => x.id === id);
  if (!p || !b) return null;
  const axes = [...(p.ordre ? ['ordre'] : []), ...p.sections] as string[];
  const valeurs = (a: string) => [...(a === 'ordre' ? ORDRES_ACCUEIL.map((o) => o.id as string) : (VARIANTES_SECTIONS[a as keyof Variantes] as readonly string[]))].sort((x, y) => y.length - x.length);
  let reste = b;
  const variantes: Record<string, string> = {};
  for (const a of axes) {
    const v = valeurs(a).find((x) => reste === x || reste.startsWith(`${x}-`));
    if (!v) continue;
    if (a !== 'ordre') variantes[a] = v;
    reste = reste.slice(v.length + 1);
  }
  return reste ? null : { variantes };
}

/** Ingrédients des compositions réellement tirées (Studio, atelier, recettes, /creer) : tous les dés, beaucoup de graines */
function clesTirees(): Set<string> {
  const sujets = [['sport', 'enfant'], ['diabete', 'senior'], ['ongles', 'semelles', 'pedicurie'], []];
  const cles = new Set<string>();
  const ajouter = (x: CompositionRecette, s: readonly string[]) => {
    for (const k of clesRecette(x, s).assets) cles.add(k);
    if (x.visuels.animation) cles.add(`animation:${x.visuels.animation}`);
  };
  for (const s of sujets) {
    for (const horsRegles of [false, true]) {
      const c: ContexteRecette = { sujets: s, photos: photosIntegreesBanque(), horsRegles };
      for (let g = 0; g < 14; g++) {
        let x = compositionInitiale(c, g);
        ajouter(x, s);
        for (const d of DIMENSIONS_RECETTE) { x = tirerDimension(x, d.id, c, g * 31 + d.id.length); ajouter(x, s); }
        for (const p of PAGES_STRUCTURE) ajouter(tirerPage(x, { page: p.id as PageStructure }, c, g * 17 + p.id.length), s);
        for (const f of FAMILLES_COMPOSANTS) ajouter(tirerPage(x, { composant: f }, c, g * 13 + f.length), s);
        ajouter(toutChanger(x, [], c, g * 7919), s);
      }
    }
  }
  return cles;
}

test('garantie : chaque valeur des registres d’éléments (premiers écrans, animations d’en-tête, transitions, portraits, sections…) est notable', () => {
  const l: string[] = [];
  for (const [s, valeurs] of Object.entries(VARIANTES_SECTIONS)) {
    for (const v of valeurs as readonly string[]) {
      if (NEUTRES[s]?.includes(v)) continue;
      const k = cleSection(s, v);
      if (!k) { l.push(`section « ${s} » sans clé notable (ni élément ni page à une section)`); continue; }
      l.push(k);
    }
  }
  const sansCle = l.filter((x) => !x.includes(':'));
  assert.deepEqual(sansCle, []);
  assert.deepEqual(manquants({
    'VARIANTES_SECTIONS': l,
    'premiers écrans': PREMIERS_ECRANS_NOUVEAUX.map((v) => `composant:accueil:${v}`),
    "animations d'en-tête": ANIMATIONS_ENTETE.filter((a) => a !== 'aucune').map((a) => `composant:entete-anim:${a}`),
    "animations d'en-tête empreintes": ANIMATIONS_EMPREINTES.map((a) => `composant:entete-anim:${a}`),
    'transitions du diaporama': TRANSITIONS_DIAPORAMA.map((v) => `composant:transition:${v}`),
    'transitions entre sections': TRANSITIONS_SECTIONS.map((v) => `composant:sections:${v}`),
    'présentations des portraits': PRESENTATIONS_PORTRAITS.map((v) => `composant:portraits:${v}`),
    'ingrédients à valider': INGREDIENTS_A_VALIDER,
  }), []);
});

test('garantie : couleurs, polices, typographie, détails, menus, effets, traitements des photos, surfaces, modèles', () => {
  assert.deepEqual(manquants({
    gammes: GAMMES.map((g) => `gamme:${g.id}`),
    'modèles de structure': STRUCTURES.map((u) => `modele:${u}`),
    'paires de polices': PAIRES_POLICES.map((p) => `typo:police:${p.id}`),
    'axes de typographie': toutesClesTypo(),
    'jeux et éléments de détails': toutesClesDetails(),
    menus: toutesClesMenu(),
    "jeux d'effets": JEUX_EFFETS.map((j) => `effets:${j.id}`),
    'traitements des photos': TRAITEMENTS_PHOTOS.flatMap((t) => [cleTraitementPhotos({ id: t.id, grain: false }), cleTraitementPhotos({ id: t.id, grain: true })]),
    'répartitions des surfaces': SURFACES.filter((s) => s.id !== 'modele').map((s) => cleAssetSurfaces(s.id)),
  }), []);
});

test('garantie : illustrations, pictos et directions, héros, matériel, kits, animations de soins et leurs ingrédients, photos intégrées', () => {
  assert.deepEqual(manquants({
    pictos: PICTOS.map((p) => `picto:${p.id}`),
    'directions de style des pictos': DIRECTIONS_PICTOS.flatMap((d) => [...ECHANTILLON_DIRECTIONS.map((id) => cleDirection(id, d)), cleStyleIcones(d)]),
    'dessins (relevé, pédagogique)': DESSINS_PODOLOGIE.flatMap((n) => [`dessin:${n}:releve`, `dessin:${n}:pedagogique`]),
    'traits continus': DESSINS_LIGNE.map((n) => `ligne:${n}`),
    'dessins de la planche « ce qui manque »': DESSINS_UNIVERS.map((n) => `dessin:${n}:pedagogique`),
    'univers diabète (héros et cartes)': [...CLES_UNIVERS_DIABETE],
    'styles expérimentaux': STYLES_EXPERIMENTAUX.flatMap((st) => SUJETS_STYLES.map((s) => cleStyleExperimental(s, st))),
    matériel: EQUIPEMENTS_DESSINES.flatMap((id) => ['releve', 'pedagogique', 'ligne'].map((r) => `materiel:${id}:${r}`)),
    'héros des thèmes': [...new Set([...THEMES_ILLUSTRES, ...SCENES_HEROS])].flatMap((t) => ['releve', 'pedagogique', 'ligne'].map((r) => `heros:${t}:${r}`)),
    'kits (Sports)': [...KITS.flatMap(clesDuKit), ...SPORTS.flatMap((s) => [`ligne:sport-${s}`, `dessin:sport-${s}:pedagogique`])],
    'animations de soins': [...ANIMATIONS.map((a) => `animation:${a}`), ...Object.values(VISUELS_SOINS).flatMap((v) => (v.animation ? [`animation:${v.animation}`] : []))],
    'ingrédients des animations': Object.values(SOURCES_ANIMATIONS).flatMap((l) => l.map((s) => s.cle)),
    'photos intégrées': PHOTOS_INTEGREES.map((u) => clePhoto(u)!).filter(Boolean),
  }), []);
});

test('garantie : registre d’harmonie — chaque valeur étiquetée (police, typo, détails, menus, sections, structures, gammes, effets, traitements) est notable', () => {
  const cles: string[] = [];
  for (const k of Object.keys(ETIQUETTES_HARMONIE)) {
    const i = k.indexOf(':');
    const dim = k.slice(0, i), v = k.slice(i + 1);
    if (dim === 'police') cles.push(`typo:police:${v}`);
    else if (dim === 'structure') cles.push(`modele:${v}`);
    else if (dim === 'gamme') cles.push(`gamme:${v}`);
    else if (dim === 'effets') cles.push(`effets:${v}`);
    else if (dim === 'traitement') cles.push(cleTraitementPhotos({ id: v as (typeof TRAITEMENTS_PHOTOS)[number]['id'], grain: false }));
    else if (dim.startsWith('typo.')) { if (!(dim === 'typo.graisse' && v === 'paire')) cles.push(`typo:${dim.slice(5)}:${v}`); }
    else if (dim === 'details.jeu') { if (v !== 'gabarit') cles.push(`details:jeu:${v}`); }
    else if (dim.startsWith('details.')) { if (!['aucun', 'aucune', 'gabarit'].includes(v)) cles.push(`details:${dim.slice(8)}:${v}`); }
    else if (dim.startsWith('menu.')) { if (v !== 'gabarit' || dim === 'menu.ordinateur') cles.push(`menu:${dim.slice(5)}:${v}`); }
    else if (dim.startsWith('v.')) { const s = dim.slice(2); if (!NEUTRES[s]?.includes(v)) { const c = cleSection(s, v); if (c) cles.push(c); } }
  }
  assert.ok(cles.length > 100, `registre d'harmonie lu : ${cles.length} clés`);
  assert.deepEqual(manquants({ 'registre d’harmonie': cles }), []);
});

test('garantie : tout ce que le générateur et le Studio tirent réellement (tous les dés, toutes les pages, « Tout changer ») est notable', () => {
  const tirees = [...clesTirees()];
  assert.ok(tirees.length > 150, `${tirees.length} clés tirées`);
  // Valeurs neutres (celle du modèle, « aucun ») : pas des ingrédients (estCleNeutre)
  const neutres = tirees.filter(estCleNeutre);
  assert.ok(neutres.every((k) => !k.startsWith('gamme:') && !k.startsWith('picto:')));
  // Structures de pages = combinaisons de leurs valeurs (gabarit classique : structures partielles) : chaque VALEUR doit être notable
  const parts: string[] = [];
  for (const k of tirees.filter((x) => x.startsWith('structure:'))) {
    const s = lireCleStructure(k) ?? lireStructurePartielle(k);
    if (!s) { parts.push(`structure illisible ${k}`); continue; }
    for (const [sec, v] of Object.entries(s.variantes)) if (!NEUTRES[sec]?.includes(v as string)) { const c = cleSection(sec, v as string); if (c) parts.push(c); }
  }
  // Photos des jeux (base) : vérifiées à part (inventaireAssets({ photosJeux })) ; ici seules les photos intégrées sont tirables
  assert.deepEqual(manquants({
    générateur: tirees.filter((k) => !k.startsWith('structure:') && !estCleNeutre(k)),
    'valeurs des structures tirées': parts,
  }), []);
});
