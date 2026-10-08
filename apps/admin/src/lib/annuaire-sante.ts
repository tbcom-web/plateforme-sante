import 'server-only';
import {
  ficheDemo, ficheDepuisBundles, nomPourRecherche, memeVille, rechercheDemo, resumesDepuisBundle, rppsSaisi,
  type BundleFhir, type FicheAnnuaire, type ResumeAnnuaire,
} from '@plateforme/core/annuaire-sante';

// Appel SERVEUR de l'API FHIR « Annuaire Santé en libre accès » (Agence du Numérique en Santé), pour préremplir le site
// d'un praticien qui le demande (/commencer). Documentation et sources : docs/rpps-annuaire.md.
//  - Clé : variable d'environnement ANNUAIRE_SANTE_API_KEY (créée par Paul sur portal.api.esante.gouv.fr, renseignée dans
//    Vercel) ; jamais envoyée au navigateur. Sans clé : « indisponible », le parcours continue en saisie libre.
//  - Débit : 17 appels/s par application côté ANS ; ici, garde locale (par instance) : 8 recherches par minute et par
//    visiteur, 120 par minute au total, 3 appels au plus par recherche. Cache court (10 min) : les CGU recommandent de ne pas
//    redemander une réponse déjà obtenue.
//  - Démonstration : ANNUAIRE_SANTE_DEMO=1 (tests locaux, Playwright) ou mode test de l'admin : fiches FICTIVES uniquement.
//  - Rien n'est stocké : la fiche ne vit qu'en mémoire (cache) et dans le navigateur du praticien, jusqu'à sa confirmation.

const BASE = (process.env.ANNUAIRE_SANTE_URL || 'https://gateway.api.esante.gouv.fr/fhir/v2').replace(/\/$/, '');
const S_RPPS = 'https://rpps.esante.gouv.fr';
const S_PROFESSION = 'https://mos.esante.gouv.fr/NOS/TRE_G15-ProfessionSante/FHIR/TRE-G15-ProfessionSante';
const DUREE_CACHE_MS = 10 * 60 * 1000;
const DELAI_MS = 6000;

export type ResultatAnnuaire =
  | { etat: 'fiche'; fiche: FicheAnnuaire }
  | { etat: 'liste'; resultats: ResumeAnnuaire[] }
  | { etat: 'introuvable' }
  | { etat: 'indisponible' }
  | { etat: 'limite' }
  | { etat: 'erreur' };

export const annuaireConfigure = () => Boolean(process.env.ANNUAIRE_SANTE_API_KEY);
export const annuaireDemo = () => process.env.ANNUAIRE_SANTE_DEMO === '1';

// ---- Cache et limite de débit (mémoire de l'instance) ----
const cache = new Map<string, { t: number; v: unknown }>();
const lire = <T>(k: string): T | undefined => {
  const e = cache.get(k);
  if (!e) return undefined;
  if (Date.now() - e.t > DUREE_CACHE_MS) { cache.delete(k); return undefined; }
  return e.v as T;
};
const ecrire = (k: string, v: unknown) => {
  if (cache.size > 500) for (const [c, e] of cache) if (Date.now() - e.t > DUREE_CACHE_MS || cache.size > 400) cache.delete(c);
  cache.set(k, { t: Date.now(), v });
};

const journal = new Map<string, number[]>();
/** Vrai si la demande est acceptée (fenêtre glissante d'une minute) */
export function limiteDebit(visiteur: string, parVisiteur = 8, global = 120): boolean {
  const t = Date.now();
  const garder = (l: number[] | undefined) => (l ?? []).filter((x) => t - x < 60_000);
  const v = garder(journal.get(visiteur));
  const g = garder(journal.get('*'));
  if (v.length >= parVisiteur || g.length >= global) return false;
  journal.set(visiteur, [...v, t]);
  journal.set('*', [...g, t]);
  if (journal.size > 2000) for (const [k, l] of journal) if (k !== '*' && !garder(l).length) journal.delete(k);
  return true;
}

async function appeler(chemin: string): Promise<BundleFhir | null> {
  const k = `GET ${chemin}`;
  const deja = lire<BundleFhir>(k);
  if (deja) return deja;
  const r = await fetch(`${BASE}${chemin}`, {
    headers: { 'ESANTE-API-KEY': process.env.ANNUAIRE_SANTE_API_KEY ?? '', accept: 'application/fhir+json' },
    signal: AbortSignal.timeout(DELAI_MS),
    cache: 'no-store',
  });
  if (r.status === 429) throw new Error('limite');
  if (!r.ok) throw new Error(`http ${r.status}`);
  const j = (await r.json()) as BundleFhir;
  ecrire(k, j);
  return j;
}

const q = (o: Record<string, string>) => new URLSearchParams(o).toString();

/** Situations d'exercice (PractitionerRole) et structures (Organization) d'un ou plusieurs praticiens */
const roles = (ids: string[]) => appeler(`/PractitionerRole?${q({ practitioner: ids.join(','), active: 'true', _include: 'PractitionerRole:organization', _count: '50' })}`);

/** Recherche par RPPS (fiche directe) */
export async function parRpps(rpps: string, demo: boolean): Promise<ResultatAnnuaire> {
  const n = rppsSaisi(rpps);
  if (!n) return { etat: 'introuvable' };
  if (demo || annuaireDemo()) { const f = ficheDemo(n); return f ? { etat: 'fiche', fiche: f } : { etat: 'introuvable' }; }
  if (!annuaireConfigure()) return { etat: 'indisponible' };
  try {
    const p = await appeler(`/Practitioner?${q({ identifier: `${S_RPPS}|${n},urn:oid:1.2.250.1.71.4.2.1|8${n}` })}`);
    const id = p?.entry?.map((e) => e.resource).find((r) => r?.resourceType === 'Practitioner')?.id;
    if (!id) return { etat: 'introuvable' };
    const f = ficheDepuisBundles(p, await roles([id]));
    return f ? { etat: 'fiche', fiche: f } : { etat: 'introuvable' };
  } catch (e) {
    return (e as Error).message === 'limite' ? { etat: 'limite' } : { etat: 'erreur' };
  }
}

/** Recherche par nom (et ville) : liste courte à confirmer ; profession filtrée si son code est connu */
export async function parNom(nom: string, ville: string, codeProfession: string | null, demo: boolean): Promise<ResultatAnnuaire> {
  const n = nomPourRecherche(nom);
  if (n.length < 2) return { etat: 'introuvable' };
  if (demo || annuaireDemo()) { const l = rechercheDemo(n, ville); return l.length ? { etat: 'liste', resultats: l } : { etat: 'introuvable' }; }
  if (!annuaireConfigure()) return { etat: 'indisponible' };
  try {
    const p = await appeler(`/Practitioner?${q({ family: n, active: 'true', _count: '20', ...(codeProfession ? { 'qualification-code': `${S_PROFESSION}|${codeProfession}` } : {}) })}`);
    const ids = (p?.entry ?? []).map((e) => e.resource).filter((r) => r?.resourceType === 'Practitioner' && r.id).map((r) => r!.id!).slice(0, 20);
    if (!ids.length) return { etat: 'introuvable' };
    let l = resumesDepuisBundle(p, await roles(ids));
    if (ville.trim()) l = l.filter((x) => x.villes.some((v) => memeVille(v, ville)));
    return l.length ? { etat: 'liste', resultats: l.slice(0, 8) } : { etat: 'introuvable' };
  } catch (e) {
    return (e as Error).message === 'limite' ? { etat: 'limite' } : { etat: 'erreur' };
  }
}

/** Fiche complète d'un résultat de liste (identifiant FHIR) */
export async function parIdentifiant(idFhir: string, demo: boolean): Promise<ResultatAnnuaire> {
  if (!/^[A-Za-z0-9.-]{1,64}$/.test(idFhir)) return { etat: 'introuvable' };
  if (demo || annuaireDemo()) { const f = ficheDemo(idFhir); return f ? { etat: 'fiche', fiche: f } : { etat: 'introuvable' }; }
  if (!annuaireConfigure()) return { etat: 'indisponible' };
  try {
    const p = await appeler(`/Practitioner?${q({ _id: idFhir })}`);
    const f = ficheDepuisBundles(p, await roles([idFhir]));
    return f ? { etat: 'fiche', fiche: f } : { etat: 'introuvable' };
  } catch (e) {
    return (e as Error).message === 'limite' ? { etat: 'limite' } : { etat: 'erreur' };
  }
}
