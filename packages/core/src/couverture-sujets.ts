// Tri par sujet et couverture des visuels (demande de Paul, 2026-10-07 : « il faut améliorer le tagging des ressources par
// sujet »). Page /admin/retours/tri. Module pur, déterministe.
//
// - fileTri : file des visuels à trier, en commençant par les NON ÉTIQUETÉS (aucun sujet effectif), puis ceux qui ne sont que
//   « général », puis ceux qu'une suggestion range dans un sujet MAL COUVERT, puis ceux que Paul n'a jamais touchés, enfin les
//   autres. Les visuels « retirés » n'y sont pas.
// - couvertureParSujet : par sujet, nombre de héros, d'illustrations par style (relevé, illustrations douces, trait fin,
//   bibliothèque, registres expérimentaux), d'icônes, de photos importées (stockage) et intégrées, d'animations validées ; les
//   visuels retirés ne comptent pas. alertesCouverture en tire les manques (« Seniors : 0 photo importée », « Diabète : 1 seule
//   illustration en trait fin ») avec le filtre du tri correspondant ; markdownCouverture écrit la section « Couverture par
//   sujet » de retours/SYNTHESE.md et de retours/MANQUES.md (export quotidien).

import { SUJETS_VISUELS } from './photos-libres';
import { sujetsDuVisuel, type VisuelSujets } from './sujets-visuels';
import type { SurchargesSujets } from './assets-poids';

/** Visuel de l'inventaire avec son statut courant (illustrations_statuts) */
export type VisuelCouverture = VisuelSujets & { statut?: string | null };

/** Styles d'illustration suivis (ordre d'affichage) */
export const STYLES_COUVERTURE: readonly { id: string; libelle: string; suivi: boolean }[] = [
  { id: 'releve', libelle: 'relevé', suivi: true },
  { id: 'pedagogique', libelle: 'illustrations douces', suivi: true },
  { id: 'ligne', libelle: 'trait fin', suivi: true },
  { id: 'bibliotheque', libelle: 'bibliothèque', suivi: false },
  { id: 'experimental', libelle: 'registres expérimentaux', suivi: false },
];

const EXPERIMENTAUX = ['decoupe', 'riso', 'volume', 'geometrique'];

/** Style d'une illustration d'après sa clé (`dessin:x:releve` → releve, `ligne:x` → ligne, `biblio:…` → bibliotheque) ; sinon null */
export function styleDeCle(cle: string): string | null {
  const p = cle.split(':');
  if (p[0] === 'ligne') return 'ligne';
  if (p[0] === 'biblio') return 'bibliotheque';
  if (p[0] === 'dessin' || p[0] === 'materiel' || p[0] === 'heros') {
    const r = p[p.length - 1];
    if (r === 'releve' || r === 'pedagogique' || r === 'ligne') return r;
    if (EXPERIMENTAUX.includes(r)) return 'experimental';
  }
  return null;
}

/** Photo importée (stockage Supabase : `photo:banque/…`, `photo:jeux/…`) plutôt qu'intégrée (`photo:sport-course`) */
export const estPhotoStockee = (cle: string) => cle.startsWith('photo:') && cle.includes('/');

export type CouvertureSujet = {
  sujet: string;
  libelle: string;
  heros: number;
  illustrations: Record<string, number>;
  icones: number;
  photosImportees: number;
  photosIntegrees: number;
  animations: number;
  animationsValidees: number;
  total: number;
};

const retire = (v: VisuelCouverture) => v.statut === 'retire';

/** Couverture par sujet (sujets effectifs : défauts du code ± surcharges de Paul) */
export function couvertureParSujet(visuels: readonly VisuelCouverture[], surcharges?: SurchargesSujets | null): CouvertureSujet[] {
  const res = new Map<string, CouvertureSujet>(SUJETS_VISUELS.map((s) => [s.id, {
    sujet: s.id, libelle: s.libelle, heros: 0, illustrations: Object.fromEntries(STYLES_COUVERTURE.map((x) => [x.id, 0])), icones: 0,
    photosImportees: 0, photosIntegrees: 0, animations: 0, animationsValidees: 0, total: 0,
  }]));
  for (const v of visuels) {
    if (retire(v)) continue;
    for (const s of sujetsDuVisuel(v, surcharges).sujets) {
      const c = res.get(s);
      if (!c) continue;
      c.total++;
      if (v.type === 'heros') c.heros++;
      if (v.type === 'picto') c.icones++;
      if (v.type === 'photo') { if (estPhotoStockee(v.cle)) c.photosImportees++; else c.photosIntegrees++; }
      if (v.type === 'animation') { c.animations++; if (v.statut === 'valide') c.animationsValidees++; }
      if (v.type === 'dessin' || v.type === 'ligne' || v.type === 'materiel' || v.type === 'biblio' || v.type === 'heros') {
        const st = styleDeCle(v.cle);
        if (st && v.type !== 'heros') c.illustrations[st]++;
      }
    }
  }
  return [...res.values()];
}

export type GraviteAlerte = 'forte' | 'moyenne';
export type AlerteCouverture = { sujet: string; gravite: GraviteAlerte; texte: string; filtre: { sujet: string; famille: FamilleTri } };

/** Familles du tri (filtre « ?famille= ») */
export const FAMILLES_TRI = ['tout', 'illustrations', 'heros', 'icones', 'photos', 'animations'] as const;
export type FamilleTri = (typeof FAMILLES_TRI)[number];
export const estFamilleTri = (x: unknown): x is FamilleTri => (FAMILLES_TRI as readonly unknown[]).includes(x);
export const LIBELLES_FAMILLES_TRI: Record<FamilleTri, string> = { tout: 'Tous les visuels', illustrations: 'Illustrations', heros: 'Héros', icones: 'Icônes', photos: 'Photos', animations: 'Animations' };

/** Le visuel appartient-il à la famille du tri ? */
export function dansFamille(v: Pick<VisuelSujets, 'type'>, f: FamilleTri): boolean {
  switch (f) {
    case 'tout': return ['picto', 'dessin', 'ligne', 'materiel', 'animation', 'heros', 'biblio', 'photo'].includes(v.type);
    case 'illustrations': return ['dessin', 'ligne', 'materiel', 'biblio'].includes(v.type);
    case 'heros': return v.type === 'heros';
    case 'icones': return v.type === 'picto';
    case 'photos': return v.type === 'photo';
    case 'animations': return v.type === 'animation';
  }
}

/** Manques de couverture, les plus graves d'abord (le sujet « général » : photos seulement) */
export function alertesCouverture(c: readonly CouvertureSujet[]): AlerteCouverture[] {
  const l: AlerteCouverture[] = [];
  for (const s of c) {
    const a = (gravite: GraviteAlerte, texte: string, famille: FamilleTri) => l.push({ sujet: s.sujet, gravite, texte: `${s.libelle} : ${texte}`, filtre: { sujet: s.sujet, famille } });
    if (!s.photosImportees) a('forte', '0 photo importée', 'photos');
    // « Général » : photos seulement (les illustrations, icônes, héros et animations se rangent dans un sujet)
    if (s.sujet === 'general') continue;
    if (!s.heros) a('forte', 'aucun héros', 'heros');
    for (const st of STYLES_COUVERTURE.filter((x) => x.suivi)) {
      const n = s.illustrations[st.id] ?? 0;
      if (n === 0) a('moyenne', `aucune illustration en ${st.libelle}`, 'illustrations');
      else if (n === 1) a('moyenne', `1 seule illustration en ${st.libelle}`, 'illustrations');
    }
    if (!s.icones) a('moyenne', 'aucune icône', 'icones');
    if (!s.animationsValidees) a('moyenne', s.animations ? `aucune animation validée (${s.animations} en attente)` : 'aucune animation', 'animations');
  }
  return l.sort((x, y) => Number(x.gravite === 'moyenne') - Number(y.gravite === 'moyenne'));
}

export type RaisonTri = 'sans-sujet' | 'general-seul' | 'sujet-faible' | 'jamais-trie' | 'deja-trie';
export const LIBELLES_RAISONS_TRI: Record<RaisonTri, string> = {
  'sans-sujet': 'Sans sujet',
  'general-seul': 'Seulement « général »',
  'sujet-faible': 'Peut compléter un sujet mal couvert',
  'jamais-trie': 'Jamais trié',
  'deja-trie': 'Déjà trié',
};
const RANG: Record<RaisonTri, number> = { 'sans-sujet': 0, 'general-seul': 1, 'sujet-faible': 2, 'jamais-trie': 3, 'deja-trie': 4 };

export type EntreeTri<T> = { visuel: T; raison: RaisonTri; sujets: string[] };

/**
 * File du tri : ordre des raisons ci-dessus, puis ordre de l'inventaire. `suggestions(v)` : sujets suggérés pour le visuel
 * (suggererClassement) ; `faibles` : sujets avec une alerte forte ou moyenne pour la famille du visuel ; `tries` : clés déjà
 * passées dans le tri (Paul a validé l'état actuel, enregistrées dans le navigateur) ou modifiées par Paul (surcharges).
 */
export function fileTri<T extends VisuelCouverture>(visuels: readonly T[], opts: {
  surcharges?: SurchargesSujets | null; famille?: FamilleTri; sujet?: string | null; tries?: ReadonlySet<string>;
  suggestions?: (v: T) => readonly string[]; faibles?: ReadonlySet<string>;
} = {}): EntreeTri<T>[] {
  const f = opts.famille ?? 'tout';
  const l = visuels.map((v, i) => ({ v, i })).filter(({ v }) => !retire(v) && dansFamille(v, f)).map(({ v, i }) => {
    const sujets = sujetsDuVisuel(v, opts.surcharges).sujets;
    const touche = Boolean(opts.surcharges?.[v.cle]) || Boolean(opts.tries?.has(v.cle));
    let raison: RaisonTri;
    if (!sujets.length) raison = 'sans-sujet';
    else if (sujets.length === 1 && sujets[0] === 'general') raison = touche ? 'deja-trie' : 'general-seul';
    else if (touche) raison = 'deja-trie';
    else if (opts.faibles?.size && (opts.suggestions?.(v) ?? []).some((s) => opts.faibles!.has(s) && !sujets.includes(s))) raison = 'sujet-faible';
    else raison = 'jamais-trie';
    return { visuel: v, raison, sujets, i };
  });
  const filtres = opts.sujet ? l.filter((x) => x.sujets.includes(opts.sujet!) || x.raison === 'sans-sujet' || (opts.suggestions?.(x.visuel) ?? []).includes(opts.sujet!)) : l;
  return filtres.sort((a, b) => RANG[a.raison] - RANG[b.raison] || a.i - b.i).map(({ visuel, raison, sujets }) => ({ visuel, raison, sujets }));
}

/** Actions à enregistrer pour passer des sujets effectifs `avant` aux sujets cochés `apres` */
export function actionsTri(avant: readonly string[], apres: readonly string[]): { sujet: string; action: 'ajout' | 'retrait' }[] {
  return [
    ...apres.filter((s) => !avant.includes(s)).map((sujet) => ({ sujet, action: 'ajout' as const })),
    ...avant.filter((s) => !apres.includes(s)).map((sujet) => ({ sujet, action: 'retrait' as const })),
  ];
}

/** Section « Couverture par sujet » (retours/SYNTHESE.md et retours/MANQUES.md) */
export function markdownCouverture(c: readonly CouvertureSujet[], opts: { titre?: string; niveau?: number } = {}): string {
  const l = [opts.titre ?? '## Couverture par sujet', ''];
  const styles = STYLES_COUVERTURE.filter((s) => s.suivi);
  l.push(`| Sujet | Héros | ${styles.map((s) => `Illustr. ${s.libelle}`).join(' | ')} | Icônes | Photos importées | Photos intégrées | Animations validées |`);
  l.push(`|---|---:|${styles.map(() => '---:').join('|')}|---:|---:|---:|---:|`);
  for (const s of c) l.push(`| ${s.libelle} | ${s.heros} | ${styles.map((x) => s.illustrations[x.id] ?? 0).join(' | ')} | ${s.icones} | ${s.photosImportees} | ${s.photosIntegrees} | ${s.animationsValidees}/${s.animations} |`);
  const al = alertesCouverture(c);
  l.push('', al.length ? 'Manques (tri : /admin/retours/tri?sujet=<sujet>&famille=<famille>) :' : 'Aucun manque de couverture.');
  for (const a of al) l.push(`- ${a.gravite === 'forte' ? '**' : ''}${a.texte}${a.gravite === 'forte' ? '**' : ''} — tri : \`?sujet=${a.filtre.sujet}&famille=${a.filtre.famille}\``);
  return l.join('\n');
}
