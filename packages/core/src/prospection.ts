// PROSPECTION À PARTIR DU RPPS (migration 0055, scripts/synchro-rpps.mjs, /admin/prospection ; docs/prospection-rpps.md).
// Fonctions pures : statuts du suivi de la commerciale, signal « récemment installé », lecture des filtres de la page, export CSV.
//
// Deux signaux d'installation, du plus sûr au moins sûr :
//  - « siret » : date de création de l'établissement à l'INSEE, pour le SIRET déclaré au RPPS (nouveau cabinet, ou cabinet
//    transféré : un transfert crée aussi un établissement) ;
//  - « rpps » : première apparition de la situation d'exercice dans l'extraction quotidienne (connue à partir de l'import
//    initial seulement : arrivée dans un cabinet de groupe déjà existant, nouveau diplômé, déménagement) ;
//  - « nom » : établissement trouvé par nom et code postal, faute de SIRET au RPPS (à confirmer au téléphone) ;
//  - « ans » : dernière modification d'une situation d'exercice dans l'API FHIR de l'ANS (meta.lastUpdated, 0056) : changement de
//    cabinet, d'adresse, de rôle… mais aussi simple correction (téléphone) : « à vérifier », utile quand rien d'autre ne date.

export const STATUTS_PROSPECTION = [
  { id: 'a_contacter', libelle: 'À contacter' },
  { id: 'contacte', libelle: 'Contacté' },
  { id: 'rappeler', libelle: 'À rappeler' },
  { id: 'rendez_vous', libelle: 'Rendez-vous' },
  { id: 'gagne', libelle: 'Gagné' },
  { id: 'perdu', libelle: 'Pas intéressé' },
  { id: 'hors_cible', libelle: 'Hors cible' },
] as const;
export type StatutProspection = (typeof STATUTS_PROSPECTION)[number]['id'];
export const estStatutProspection = (s: unknown): s is StatutProspection => STATUTS_PROSPECTION.some((x) => x.id === s);
export const libelleStatutProspection = (s: string | null | undefined) => STATUTS_PROSPECTION.find((x) => x.id === s)?.libelle ?? 'À contacter';

export const PERIODES_INSTALLATION = [
  { id: '3', mois: 3, libelle: 'Installés depuis 3 mois' },
  { id: '6', mois: 6, libelle: 'Depuis 6 mois' },
  { id: '12', mois: 12, libelle: 'Depuis 1 an' },
  { id: '24', mois: 24, libelle: 'Depuis 2 ans' },
  { id: 'sans_date', mois: null, libelle: 'Sans date connue' },
  { id: 'tous', mois: null, libelle: 'Tous' },
] as const;
export type PeriodeInstallation = (typeof PERIODES_INSTALLATION)[number]['id'];

/** Date ISO (AAAA-MM-JJ) `mois` mois avant `aujourdhui` (fin de mois ramenée au dernier jour) */
export function moisAvant(aujourdhui: string, mois: number): string {
  const [a, m, j] = aujourdhui.slice(0, 10).split('-').map(Number);
  const cible = new Date(Date.UTC(a, m - 1 - mois, 1));
  const dernier = new Date(Date.UTC(cible.getUTCFullYear(), cible.getUTCMonth() + 1, 0)).getUTCDate();
  cible.setUTCDate(Math.min(j, dernier));
  return cible.toISOString().slice(0, 10);
}

export type SourceInstallation = 'siret' | 'nom' | 'rpps' | 'ans';
export type Installation = { date: string; source: SourceInstallation; libelle: string } | null;

const ecartMois = (a: string, b: string) => Math.abs(Date.parse(a.slice(0, 10)) - Date.parse(b.slice(0, 10))) / 2_629_800_000;

/**
 * Date d'installation d'une ligne de prospection_praticiens. L'INSEE (création de l'établissement, déclarée au guichet des
 * formalités à l'ouverture) fait foi : le RPPS dépend des conseils de l'Ordre et peut être en retard de plusieurs mois. Exception :
 * apparition au RPPS à plus de 6 mois de la date INSEE → le praticien a rejoint un cabinet existant (SIRET du titulaire, ancien) :
 * c'est alors la date d'arrivée au RPPS qui compte. Dernier recours : modification de la situation dans l'API ANS.
 */
export function installation(p: { siret_cree_le?: string | null; siret_source?: string | null; apparu_le?: string | null; situation_maj_le?: string | null }): Installation {
  const insee = p.siret_cree_le ? { date: p.siret_cree_le.slice(0, 10), source: (p.siret_source === 'nom' ? 'nom' : 'siret') as SourceInstallation } : null;
  const rpps = p.apparu_le ? { date: p.apparu_le.slice(0, 10), source: 'rpps' as SourceInstallation } : null;
  const ans = p.situation_maj_le ? { date: p.situation_maj_le.slice(0, 10), source: 'ans' as SourceInstallation } : null;
  const c = insee && rpps ? (rpps.date > insee.date && ecartMois(rpps.date, insee.date) > 6 ? rpps : insee) : insee ?? rpps ?? ans;
  if (!c) return null;
  const libelle = { siret: 'Cabinet ouvert (INSEE)', nom: 'Ouvert à son nom (INSEE, à confirmer)', rpps: 'Nouveau au RPPS', ans: 'Situation modifiée au RPPS' }[c.source];
  return { ...c, libelle };
}

export type FiltresProspection = {
  departement: string;
  q: string;
  periode: PeriodeInstallation;
  statut: StatutProspection | 'relance' | '';
  /** Exercice libéral seulement (la cible d'un site de cabinet) */
  liberal: boolean;
  /** Masquer les praticiens disparus du RPPS et les établissements fermés */
  actifs: boolean;
  /** Spécialité repérée dans les diplômes (prospection-score.ts) */
  specialite: string;
  role: RoleProspection | '';
  /** Seulement les prospects qui travaillent ou ont travaillé avec un client (recommandation possible) */
  lienClient: boolean;
  /** Seulement les déménagements constatés, en cours ou probables (raisons « demenagement ») */
  demenagement: boolean;
  /** score : intérêt commercial (0057) ; recent : signal d'installation le plus récent */
  tri: 'score' | 'recent';
  page: number;
};

export const ROLES_PROSPECTION = [
  { id: 'titulaire', libelle: 'Titulaires', motif: 'Titulaire%' },
  { id: 'collaborateur', libelle: 'Collaborateurs', motif: 'Collaborat%' },
  { id: 'associe', libelle: 'Associés', motif: 'Associ%' },
] as const;
export type RoleProspection = (typeof ROLES_PROSPECTION)[number]['id'];

const premier = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';
export const departementSaisi = (s: string) => {
  const v = s.trim().toUpperCase();
  return /^(\d{2}|2[AB]|97\d)$/.test(v) ? v : '';
};

export function lireFiltresProspection(sp: Record<string, string | string[] | undefined>): FiltresProspection {
  // Une spécialité concerne peu de praticiens : sans période choisie, on ne la croise pas avec « Depuis 1 an »
  const periode = premier(sp.periode) || (premier(sp.specialite) || premier(sp.lien) || premier(sp.dem) ? 'tous' : '');
  const statut = premier(sp.statut);
  const page = Number.parseInt(premier(sp.page), 10);
  return {
    departement: departementSaisi(premier(sp.dep)),
    q: premier(sp.q).replace(/[^\p{L}\p{N} '-]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 60),
    periode: PERIODES_INSTALLATION.some((p) => p.id === periode) ? (periode as PeriodeInstallation) : '12',
    statut: statut === 'relance' || estStatutProspection(statut) ? statut : '',
    liberal: premier(sp.liberal) !== 'non',
    actifs: premier(sp.actifs) !== 'non',
    specialite: /^[a-z]{2,12}$/.test(premier(sp.specialite)) ? premier(sp.specialite) : '',
    role: ROLES_PROSPECTION.some((r) => r.id === premier(sp.role)) ? (premier(sp.role) as RoleProspection) : '',
    lienClient: premier(sp.lien) === 'client',
    demenagement: premier(sp.dem) === 'oui',
    tri: premier(sp.tri) === 'recent' ? 'recent' : 'score',
    page: Number.isFinite(page) && page > 0 ? Math.min(page, 1000) : 1,
  };
}

/** Paramètres d'adresse (liens de pagination, export) : seulement ce qui diffère des valeurs par défaut */
export function parametresProspection(f: FiltresProspection, page = f.page): string {
  const p = new URLSearchParams();
  if (f.departement) p.set('dep', f.departement);
  if (f.q) p.set('q', f.q);
  if (f.periode !== '12') p.set('periode', f.periode);
  if (f.statut) p.set('statut', f.statut);
  if (!f.liberal) p.set('liberal', 'non');
  if (!f.actifs) p.set('actifs', 'non');
  if (f.specialite) p.set('specialite', f.specialite);
  if (f.role) p.set('role', f.role);
  if (f.lienClient) p.set('lien', 'client');
  if (f.demenagement) p.set('dem', 'oui');
  if (f.tri !== 'score') p.set('tri', f.tri);
  if (page > 1) p.set('page', String(page));
  return p.toString();
}

export type LigneExport = {
  nom: string; prenom: string; profession: string; cabinet: string; adresse: string; codePostal: string; commune: string;
  telephone: string; email: string; installation: string; signal: string; statut: string; relance: string; note: string; rpps: string;
  score: string; role: string; specialites: string;
};

/** CSV pour Excel (point-virgule, BOM UTF-8). Les cellules qui commencent par = + - @ sont neutralisées. */
export function csvProspection(lignes: LigneExport[]): string {
  const entetes: [keyof LigneExport, string][] = [
    ['score', 'Score'], ['nom', 'Nom'], ['prenom', 'Prénom'], ['role', 'Rôle'], ['profession', 'Profession'], ['cabinet', 'Cabinet'], ['adresse', 'Adresse'], ['codePostal', 'Code postal'],
    ['commune', 'Commune'], ['telephone', 'Téléphone'], ['email', 'E-mail'], ['installation', 'Installation'], ['signal', 'Signal'],
    ['specialites', 'Spécialités'], ['statut', 'Statut'], ['relance', 'Relance'], ['note', 'Note'], ['rpps', 'RPPS'],
  ];
  const cellule = (v: string) => {
    const t = String(v ?? '').replace(/\r?\n/g, ' ');
    const sur = /^[=+\-@]/.test(t) ? `'${t}` : t;
    return /[";]/.test(sur) ? `"${sur.replace(/"/g, '""')}"` : sur;
  };
  return '﻿' + [entetes.map(([, l]) => l).join(';'), ...lignes.map((l) => entetes.map(([k]) => cellule(l[k])).join(';'))].join('\r\n') + '\r\n';
}
