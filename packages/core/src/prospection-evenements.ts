// ACTUALITÉS DES CABINETS (migration 0058, scripts/synchro-rpps.mjs, /admin/prospection/actualites ; docs/prospection-rpps.md).
// Pur, sans import : le script de synchro l'importe tel quel. Compare l'état des situations d'exercice de la veille à celui du
// jour et en tire des événements datés, attachés au praticien ET à sa structure (le cabinet) :
//  - nouveau_cabinet : situation dans une structure inconnue jusque-là ;
//  - arrivee : situation dans une structure où d'autres praticiens exerçaient déjà (nouveau collaborateur, associé…) ;
//  - depart : situation disparue, d'autres praticiens restent dans la structure ;
//  - fermeture : le dernier praticien connu de la structure est parti ;
//  - role : rôle changé dans la même situation (collaborateur devenu titulaire : reprise de cabinet) ;
//  - demenagement : le même praticien quitte un lieu et en ouvre un autre le même jour.
// Rien à l'import initial (aucun « avant »).

export const TYPES_EVENEMENTS = [
  { id: 'nouveau_cabinet', libelle: 'Nouveau cabinet' },
  { id: 'arrivee', libelle: 'Arrivée dans un cabinet' },
  { id: 'depart', libelle: 'Départ d’un cabinet' },
  { id: 'fermeture', libelle: 'Cabinet vidé' },
  { id: 'role', libelle: 'Changement de rôle' },
  { id: 'demenagement', libelle: 'Déménagement' },
] as const;
export type TypeEvenement = (typeof TYPES_EVENEMENTS)[number]['id'];
export const libelleEvenement = (t: string) => TYPES_EVENEMENTS.find((x) => x.id === t)?.libelle ?? t;

export type EtatSituation = {
  cle: string;
  rpps: string;
  structure_cle?: string | null;
  role?: string | null;
  nom?: string | null;
  prenom?: string | null;
  commune?: string | null;
  departement?: string | null;
  cabinet?: string | null;
};
export type Evenement = {
  le: string;
  type: TypeEvenement;
  cle: string;
  rpps: string;
  structure_cle: string | null;
  departement: string | null;
  commune: string | null;
  praticien: string;
  cabinet: string | null;
  details: Record<string, string | number | null>;
};

const nomDe = (s: EtatSituation) => [s.prenom, s.nom].filter(Boolean).join(' ').trim() || s.rpps;

/** `avant` : situations actives la veille ; `apres` : situations du fichier du jour */
export function evenementsDuJour(avant: readonly EtatSituation[], apres: readonly EtatSituation[], le: string): Evenement[] {
  const avantParCle = new Map(avant.map((s) => [s.cle, s]));
  const apresParCle = new Map(apres.map((s) => [s.cle, s]));
  const membresAvant = new Map<string, EtatSituation[]>();
  for (const s of avant) if (s.structure_cle) membresAvant.set(s.structure_cle, [...(membresAvant.get(s.structure_cle) ?? []), s]);
  const membresApres = new Map<string, EtatSituation[]>();
  for (const s of apres) if (s.structure_cle) membresApres.set(s.structure_cle, [...(membresApres.get(s.structure_cle) ?? []), s]);

  const ev = (type: TypeEvenement, s: EtatSituation, details: Evenement['details'] = {}): Evenement => ({
    le, type, cle: s.cle, rpps: s.rpps, structure_cle: s.structure_cle ?? null, departement: s.departement ?? null, commune: s.commune ?? null,
    praticien: nomDe(s), cabinet: s.cabinet ?? null, details,
  });
  const sortis = avant.filter((s) => !apresParCle.has(s.cle));
  const entres = apres.filter((s) => !avantParCle.has(s.cle));
  const evenements: Evenement[] = [];

  for (const s of entres) {
    const deja = s.structure_cle ? (membresAvant.get(s.structure_cle) ?? []).filter((m) => m.rpps !== s.rpps) : [];
    evenements.push(deja.length
      ? ev('arrivee', s, { role: s.role ?? null, confreres: deja.length, titulaires: deja.filter((m) => /titulaire/i.test(m.role ?? '')).map(nomDe).join(', ') || null })
      : ev('nouveau_cabinet', s, { role: s.role ?? null }));
    const quitte = sortis.find((o) => o.rpps === s.rpps);
    if (quitte) evenements.push(ev('demenagement', s, { depuis_commune: quitte.commune ?? null, depuis_cabinet: quitte.cabinet ?? null, depuis_structure: quitte.structure_cle ?? null }));
  }
  for (const s of sortis) {
    const restent = s.structure_cle ? (membresApres.get(s.structure_cle) ?? []).filter((m) => m.rpps !== s.rpps) : [];
    evenements.push(ev(restent.length || !s.structure_cle ? 'depart' : 'fermeture', s, { role: s.role ?? null, restent: restent.length }));
  }
  for (const s of apres) {
    const a = avantParCle.get(s.cle);
    if (a && a.role && s.role && a.role !== s.role) evenements.push(ev('role', s, { avant: a.role, apres: s.role }));
  }
  return evenements;
}
