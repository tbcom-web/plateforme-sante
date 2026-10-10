// Juge du goût de Paul (étape 2 de la « boucle autonome », 2026-10-07) : Claude PRÉDIT la note que Paul donnera à un élément
// (agent .claude/agents/juge-gout-paul.md, profil docs/gout-paul.md) ; on mesure s'il « ressemble » à Paul avant toute autonomie.
// - retours/predictions.json : prédictions (clé + empreinte de l'élément au moment de la prédiction) ;
// - l'admin affiche « Claude prévoit » APRÈS la note de Paul (jamais avant par défaut, pour ne pas l'influencer), seulement si
//   l'empreinte de la prédiction est celle de l'élément noté ;
// - « Ce que vos avis ont changé » : justesse du juge sur les dernières notes ; l'export quotidien réécrit retours/CALIBRATION.md.
// Paul garde toujours le statut « Validé », l'anatomie et les mises en ligne. Module pur.

export type ConfianceJuge = 'faible' | 'moyenne' | 'forte';

export type PredictionJuge = {
  cle: string;
  /** Empreinte du rendu prédit (SVG : empreinteSvg ; gamme : ses couleurs ; image : « img:<adresse> ») */
  empreinte: string;
  note: number;
  confiance: ConfianceJuge;
  vaBien: string;
  generait: string;
  eliminatoire: string | null;
  /** Version de docs/gout-paul.md utilisée */
  profil: string;
  /** Jour de la prédiction (AAAA-MM-JJ) */
  le: string;
  /** « calibration-aveugle » (élément déjà noté, note cachée au juge) ou « nouveaux » */
  serie?: string;
  /** Note de Paul sur la version précédente, quand l'élément a été retouché depuis (repère seulement) */
  noteAvant?: number;
};

export type FichierPredictions = { version: 1; maj: string; profil: string; predictions: PredictionJuge[] };

/** Note de Paul telle que la lisent l'admin et l'export (clé, note, empreinte de l'élément noté, date) */
export type NotePourJuge = { cle: string; note: number; empreinte?: string | null; le?: string | null; etiquettes?: readonly string[] | null };

/** Empreinte d'une prédiction pour une image (photo, structure) : son adresse sans paramètres */
export const empreinteImage = (src: string) => `img:${src.split('?')[0]}`;

/** Relit le fichier (tolérant : entrées invalides ignorées) */
export function lirePredictions(json: unknown): PredictionJuge[] {
  const l = Array.isArray(json) ? json : (json as Partial<FichierPredictions> | null)?.predictions;
  if (!Array.isArray(l)) return [];
  return l.filter((p): p is PredictionJuge =>
    Boolean(p) && typeof p.cle === 'string' && typeof p.empreinte === 'string' && Number.isInteger(p.note) && p.note >= 1 && p.note <= 5,
  );
}

/** Prédiction pour une clé et une empreinte (la plus récente) ; null si l'élément a changé depuis la prédiction */
export function predictionPour(preds: readonly PredictionJuge[], cle: string, empreinte: string | null | undefined): PredictionJuge | null {
  if (!empreinte) return null;
  let best: PredictionJuge | null = null;
  for (const p of preds) if (p.cle === cle && p.empreinte === empreinte && (!best || p.le >= best.le)) best = p;
  return best;
}

/** Index clé → prédictions (pour passer au client seulement ce qui sert) */
export function predictionsParCle(preds: readonly PredictionJuge[]): Record<string, PredictionJuge[]> {
  const r: Record<string, PredictionJuge[]> = {};
  for (const p of preds) (r[p.cle] ??= []).push(p);
  return r;
}

export type PaireJuge = { cle: string; predite: number; paul: number; le: string; profil: string; eliminatoirePredit: boolean; eliminatoirePaul: boolean };

const ETIQUETTES_ELIMINATOIRES = new Set(['clipart', 'anatomie-fausse']);

/**
 * Paires (prédiction, note de Paul) : même clé ET même empreinte (l'élément jugé est celui que Paul a noté). Une note par clé et
 * empreinte (la plus récente). Les notes sans empreinte (photos, structures) se comparent à l'empreinte d'image fournie par
 * `empreinteDe` (adresse de l'image dans l'inventaire), sinon sont ignorées.
 */
export function pairesJuge(preds: readonly PredictionJuge[], notes: readonly NotePourJuge[], empreinteDe?: (cle: string) => string | null): PaireJuge[] {
  return pairesDesDernieres(preds, dernieresNotesJuge(notes, empreinteDe));
}

/**
 * Notes comparables au juge : la plus récente par clé et empreinte (empreinte résolue), dans l'ordre de première apparition.
 * Ne dépend pas des prédictions : gardée tant que les notes n'ont pas changé (/admin/retours, perf vague 2, 2026-10-10).
 */
export function dernieresNotesJuge(notes: readonly NotePourJuge[], empreinteDe?: (cle: string) => string | null): NotePourJuge[] {
  const derniere = new Map<string, NotePourJuge>();
  for (const n of notes) {
    const e = n.empreinte ?? empreinteDe?.(n.cle) ?? null;
    if (!e) continue;
    const k = `${n.cle}|${e}`;
    const p = derniere.get(k);
    if (!p || String(n.le ?? '') >= String(p.le ?? '')) derniere.set(k, { ...n, empreinte: e });
  }
  return [...derniere.values()];
}

/** pairesJuge à partir de dernieresNotesJuge (même résultat) */
export function pairesDesDernieres(preds: readonly PredictionJuge[], dernieres: readonly NotePourJuge[]): PaireJuge[] {
  const paires: PaireJuge[] = [];
  for (const n of dernieres) {
    const p = predictionPour(preds, n.cle, n.empreinte);
    if (!p) continue;
    paires.push({
      cle: n.cle, predite: p.note, paul: n.note, le: String(n.le ?? '').slice(0, 10), profil: p.profil,
      eliminatoirePredit: Boolean(p.eliminatoire) && p.note <= 2,
      eliminatoirePaul: n.note <= 2 || (n.etiquettes ?? []).some((t) => ETIQUETTES_ELIMINATOIRES.has(t)),
    });
  }
  return paires.sort((a, b) => b.le.localeCompare(a.le) || a.cle.localeCompare(b.cle));
}

export type MesureJuge = { n: number; exactes: number; aUnPres: number; ecartMoyen: number; biais: number; correlation: number | null; accordEliminatoires: number };

export function mesurerJuge(paires: readonly PaireJuge[]): MesureJuge {
  const n = paires.length;
  if (!n) return { n: 0, exactes: 0, aUnPres: 0, ecartMoyen: 0, biais: 0, correlation: null, accordEliminatoires: 0 };
  const e = paires.map((p) => p.predite - p.paul);
  const mx = paires.reduce((s, p) => s + p.predite, 0) / n;
  const my = paires.reduce((s, p) => s + p.paul, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (const p of paires) { const a = p.predite - mx, b = p.paul - my; sxy += a * b; sxx += a * a; syy += b * b; }
  return {
    n,
    exactes: e.filter((x) => x === 0).length,
    aUnPres: e.filter((x) => Math.abs(x) <= 1).length,
    ecartMoyen: e.reduce((s, x) => s + Math.abs(x), 0) / n,
    biais: e.reduce((s, x) => s + x, 0) / n,
    correlation: sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : null,
    accordEliminatoires: paires.filter((p) => p.eliminatoirePredit === p.eliminatoirePaul).length,
  };
}

/** Ligne de « Ce que vos avis ont changé » : justesse sur les `max` dernières notes comparables */
export function ligneJuge(paires: readonly PaireJuge[], max = 20): string | null {
  const recentes = paires.slice(0, max);
  if (!recentes.length) return null;
  const m = mesurerJuge(recentes);
  return `Juge : ${m.aUnPres}/${m.n} justes à ±1 (${m.exactes}/${m.n} exactes) sur les ${m.n} dernières notes comparables`;
}

const v = (x: number, d = 2) => x.toFixed(d).replace('.', ',');

/**
 * Section recalculée de retours/CALIBRATION.md (export quotidien) : mesures par version du profil et sur les dernières notes.
 * La partie manuelle (première mesure en aveugle, méthode) est conservée telle quelle par le script.
 */
export function markdownCalibration(paires: readonly PaireJuge[], opts: { jour?: string | null } = {}): string {
  const lignes = ['## Mesure automatique (export quotidien)', ''];
  if (!paires.length) return [...lignes, 'Aucune note de Paul ne correspond encore à une prédiction (même clé, même empreinte).', ''].join('\n');
  const parProfil = new Map<string, PaireJuge[]>();
  for (const p of paires) parProfil.set(p.profil, [...(parProfil.get(p.profil) ?? []), p]);
  lignes.push(`Notes comparables jusqu’au ${opts.jour ?? paires[0].le} : ${paires.length}.`, '');
  lignes.push('| Profil | Notes | Exactes | À ±1 | Écart moyen | Biais | Corrélation | Accord éliminatoires |', '|---|---:|---:|---:|---:|---:|---:|---:|');
  const ligne = (nom: string, l: readonly PaireJuge[]) => {
    const m = mesurerJuge(l);
    return `| ${nom} | ${m.n} | ${m.exactes} (${Math.round((100 * m.exactes) / m.n)} %) | ${m.aUnPres} (${Math.round((100 * m.aUnPres) / m.n)} %) | ${v(m.ecartMoyen)} | ${m.biais >= 0 ? '+' : ''}${v(m.biais)} | ${m.correlation === null ? '—' : v(m.correlation)} | ${m.accordEliminatoires}/${m.n} |`;
  };
  for (const [profil, l] of [...parProfil.entries()].sort((a, b) => b[0].localeCompare(a[0]))) lignes.push(ligne(profil, l));
  lignes.push(ligne('20 dernières', paires.slice(0, 20)));
  lignes.push('', 'Plus gros écarts récents :', '');
  const ecarts = [...paires].sort((a, b) => Math.abs(b.predite - b.paul) - Math.abs(a.predite - a.paul) || b.le.localeCompare(a.le)).filter((p) => p.predite !== p.paul).slice(0, 8);
  for (const p of ecarts) lignes.push(`- \`${p.cle}\` : prédit ${p.predite} ★, Paul ${p.paul} ★ (${p.le}, profil ${p.profil})`);
  if (!ecarts.length) lignes.push('- aucun');
  lignes.push('');
  return lignes.join('\n');
}
