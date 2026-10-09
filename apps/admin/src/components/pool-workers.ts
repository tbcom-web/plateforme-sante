'use client';

// Workers de préparation partagés par l'onglet (perf, 2026-10-09) : cartes de la Dégustation (cartes.worker.ts) et grilles
// « Directions » de la Présélection (grilles.worker.ts). Créés une fois et gardés d'une page à l'autre (navigation de l'admin) ;
// réchauffés (code du core chargé et évalué) dès que l'admin est au repos ou au survol d'un lien vers ces pages, pour que la
// première carte ne paie pas le démarrage. Chaque page envoie ses données (`diffuser`) puis ses demandes (`demander`).

export type TypeOuvrier = 'cartes' | 'grilles';
type Ouvrier = { w: Worker; enCours: number; attente: Map<number, (r: Record<string, unknown> | undefined) => void> };
const pools: Record<TypeOuvrier, Ouvrier[]> = { cartes: [], grilles: [] };
let numero = 0;

function creer(type: TypeOuvrier): Ouvrier | null {
  let w: Worker;
  try {
    w = type === 'cartes'
      ? new Worker(new URL('../app/admin/degustation/cartes.worker.ts', import.meta.url))
      : new Worker(new URL('../app/chaine/preselection/grilles.worker.ts', import.meta.url));
  } catch { return null; }
  const o: Ouvrier = { w, enCours: 0, attente: new Map() };
  w.onmessage = (e: MessageEvent<Record<string, unknown> & { id?: number }>) => {
    const id = e.data?.id;
    if (typeof id !== 'number') return;
    o.enCours = Math.max(0, o.enCours - 1);
    o.attente.get(id)?.(e.data);
    o.attente.delete(id);
  };
  w.onerror = () => {
    const l = pools[type], i = l.indexOf(o);
    if (i >= 0) l.splice(i, 1);
    for (const f of o.attente.values()) f(undefined);
    o.attente.clear();
    w.terminate();
  };
  return o;
}

/** Workers du type (créés jusqu'à `nb`) */
export function ouvriers(type: TypeOuvrier, nb: number): Ouvrier[] {
  const l = pools[type];
  while (l.length < nb) { const o = creer(type); if (!o) break; l.push(o); }
  return l;
}

/** Nombre de workers conseillé (cœurs disponibles, 1 à 3) */
export const nbOuvriers = (max = 3) => (typeof navigator === 'undefined' ? 1 : Math.max(1, Math.min(max, (navigator.hardwareConcurrency || 2) - 1)));

/** Message à tous les workers du type (données de la page) */
export function diffuser(type: TypeOuvrier, nb: number, message: Record<string, unknown>): boolean {
  const l = ouvriers(type, nb);
  for (const o of l) o.w.postMessage(message);
  return l.length > 0;
}

/** Demande au worker le moins chargé ; undefined si aucun worker ou en cas d'erreur (la page calcule alors elle-même) */
export function demander(type: TypeOuvrier, message: Record<string, unknown>): Promise<Record<string, unknown> | undefined> {
  const l = pools[type];
  if (!l.length) return Promise.resolve(undefined);
  const o = l.reduce((a, b) => (b.enCours < a.enCours ? b : a));
  const id = ++numero;
  o.enCours++;
  return new Promise((ok) => { o.attente.set(id, ok); o.w.postMessage({ ...message, id }); });
}

let rechauffe = false;
/** Un worker de chaque type, créé une seule fois par onglet */
export function rechaufferOuvriers() {
  if (rechauffe || typeof Worker === 'undefined') return;
  rechauffe = true;
  ouvriers('cartes', 1);
  ouvriers('grilles', 1);
}
