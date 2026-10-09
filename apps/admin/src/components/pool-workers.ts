'use client';

// Workers de préparation partagés par l'onglet (perf, 2026-10-09) : cartes de la Dégustation (cartes.worker.ts) et grilles
// « Directions » de la Présélection (grilles.worker.ts). Créés une fois et gardés d'une page à l'autre (navigation de l'admin) ;
// réchauffés (code du core chargé et évalué) dès que l'admin est au repos ou au survol d'un lien vers ces pages, pour que la
// première carte ne paie pas le démarrage. Chaque page envoie ses données (`diffuser`) puis ses demandes (`demander`).
//
// GARDE-FOUS (2026-10-09, « la Dégustation reste bloquée » en production) : un worker ne doit JAMAIS faire attendre une page.
// - chaque demande a un délai maximal (DELAI_MS, + une marge par demande déjà en file) : passé ce délai, réponse `undefined` et
//   la page calcule elle-même (même fonction du core, résultats identiques) ;
// - worker en retard, en erreur (onerror), message illisible (onmessageerror) ou envoi impossible (données non clonables) :
//   arrêté, retiré du pool, ses demandes en attente renvoyées à la page ; le type est alors marqué défaillant pour l'onglet
//   (plus aucun worker recréé de ce type : pas de relance en boucle, la page calcule sur place).
//   Journal dans la console (avertissement) pour le diagnostic.

export type TypeOuvrier = 'cartes' | 'grilles';
type Ouvrier = { w: Worker; vivant: boolean; enCours: number; attente: Map<number, (r: Record<string, unknown> | undefined) => void> };
const pools: Record<TypeOuvrier, Ouvrier[]> = { cartes: [], grilles: [] };
const defaillants: Record<TypeOuvrier, boolean> = { cartes: false, grilles: false };
let numero = 0;

/** Délai maximal d'une demande (ms) : DELAI_MS (DELAI_DEMARRAGE_MS tant que le worker n'a jamais répondu : chargement du code
 *  et des données), plus MARGE_FILE_MS par demande déjà en file sur le même worker */
export const DELAI_MS = 4000;
const DELAI_DEMARRAGE_MS = 8000;
const MARGE_FILE_MS = 1500;

/** Arrête un worker défaillant : retiré du pool, demandes en attente rendues à la page (undefined → calcul sur place) */
function abandonner(type: TypeOuvrier, o: Ouvrier, raison: string) {
  const l = pools[type], i = l.indexOf(o);
  if (i >= 0) l.splice(i, 1);
  if (!defaillants[type]) console.warn(`[workers] ${type} : ${raison} — calcul dans la page pour la suite de la session`);
  defaillants[type] = true;
  // Tous les workers du type sont arrêtés (le type est défaillant pour l'onglet) ; leurs demandes reviennent à la page
  for (const x of [o, ...l.splice(0)]) {
    const attente = [...x.attente.values()];
    x.attente.clear();
    x.enCours = 0;
    try { x.w.terminate(); } catch { /* déjà arrêté */ }
    for (const f of attente) f(undefined);
  }
}

function creer(type: TypeOuvrier): Ouvrier | null {
  let w: Worker;
  try {
    w = type === 'cartes'
      ? new Worker(new URL('../app/admin/degustation/cartes.worker.ts', import.meta.url))
      : new Worker(new URL('../app/chaine/preselection/grilles.worker.ts', import.meta.url));
  } catch { defaillants[type] = true; return null; }
  const o: Ouvrier = { w, vivant: false, enCours: 0, attente: new Map() };
  w.onmessage = (e: MessageEvent<Record<string, unknown> & { id?: number }>) => {
    const id = e.data?.id;
    if (typeof id !== 'number') return;
    o.vivant = true;
    const f = o.attente.get(id);
    if (!f) return; // déjà rendue à la page (délai dépassé)
    o.enCours = Math.max(0, o.enCours - 1);
    o.attente.delete(id);
    f(e.data);
  };
  w.onerror = (e) => { e.preventDefault?.(); abandonner(type, o, `erreur (${(e as ErrorEvent).message || 'chargement'})`); };
  w.onmessageerror = () => abandonner(type, o, 'message illisible');
  return o;
}

/** Workers du type (créés jusqu'à `nb`) ; aucun si le type est défaillant dans cet onglet */
export function ouvriers(type: TypeOuvrier, nb: number): Ouvrier[] {
  const l = pools[type];
  while (!defaillants[type] && l.length < nb) { const o = creer(type); if (!o) break; l.push(o); }
  return l;
}

/** Nombre de workers conseillé (cœurs disponibles, 1 à 3) */
export const nbOuvriers = (max = 3) => (typeof navigator === 'undefined' ? 1 : Math.max(1, Math.min(max, (navigator.hardwareConcurrency || 2) - 1)));

/** Message à tous les workers du type (données de la page) ; false si aucun worker utilisable (la page calcule elle-même) */
export function diffuser(type: TypeOuvrier, nb: number, message: Record<string, unknown>): boolean {
  if (typeof Worker === 'undefined') return false;
  const l = ouvriers(type, nb);
  for (const o of [...l]) {
    try { o.w.postMessage(message); } catch (err) { abandonner(type, o, `envoi impossible (${String(err).slice(0, 120)})`); }
  }
  return pools[type].length > 0;
}

/**
 * Demande au worker le moins chargé. Toujours résolue : la réponse du worker, ou undefined (aucun worker, délai dépassé, erreur)
 * — la page calcule alors elle-même.
 */
export function demander(type: TypeOuvrier, message: Record<string, unknown>): Promise<Record<string, unknown> | undefined> {
  const l = pools[type];
  if (!l.length || defaillants[type]) return Promise.resolve(undefined);
  const o = l.reduce((a, b) => (b.enCours < a.enCours ? b : a));
  const id = ++numero;
  const delai = (o.vivant ? DELAI_MS : DELAI_DEMARRAGE_MS) + MARGE_FILE_MS * o.enCours;
  o.enCours++;
  return new Promise((ok) => {
    const minuteur = setTimeout(() => { if (o.attente.has(id)) abandonner(type, o, `pas de réponse en ${delai} ms`); }, delai);
    o.attente.set(id, (r) => { clearTimeout(minuteur); ok(r); });
    try { o.w.postMessage({ ...message, id }); } catch (err) { abandonner(type, o, `envoi impossible (${String(err).slice(0, 120)})`); }
  });
}

let rechauffe = false;
/** Un worker de chaque type, créé une seule fois par onglet (jamais recréé en boucle ; rien si le type est défaillant) */
export function rechaufferOuvriers() {
  if (rechauffe || typeof Worker === 'undefined') return;
  rechauffe = true;
  try { ouvriers('cartes', 1); ouvriers('grilles', 1); } catch { /* le préchauffage ne bloque jamais */ }
}
