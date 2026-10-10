import 'server-only';
import { moisAvant, PERIODES_INSTALLATION, ROLES_PROSPECTION, type FiltresProspection, type Raison } from '@plateforme/core';
import { createClient } from '@/lib/supabase/server';

// Lecture de la prospection RPPS (migrations 0055 à 0057, docs/prospection-rpps.md) avec la session de la personne : RLS admin
// seulement. Chaque migration ajoute des colonnes : on lit le niveau le plus riche disponible (0057 → 0056 → 0055) ; null quand
// même 0055 n'est pas passée.

export type LigneProspection = {
  cle: string; rpps: string; civilite: string | null; nom: string | null; prenom: string | null; profession: string | null; mode_exercice: string | null;
  raison_sociale: string | null; enseigne: string | null; adresse: string | null; code_postal: string | null; commune: string | null; departement: string | null;
  telephone: string | null; email: string | null; siret: string | null; apparu_le: string | null; disparu_le: string | null;
  siret_cree_le: string | null; siret_source: string | null; siret_ferme: boolean | null; entreprise_nom: string | null;
  statut: string | null; note: string | null; relance_le: string | null; situation_maj_le?: string | null;
  // 0057
  role?: string | null; secteur?: string | null; structure_cle?: string | null; adresse_cle?: string | null;
  autres_professions?: Record<string, number> | null; diplomes?: { t: string; l: string }[] | null; specialites?: string[] | null;
  score_installation?: number | null; score_prospect?: number | null; raisons?: Raison[] | null;
};
export type Synchro = { le: string; lignes: number | null; nouveaux: number | null; disparus: number | null; verifies: number | null };

const BASE = 'cle,rpps,civilite,nom,prenom,profession,mode_exercice,raison_sociale,enseigne,adresse,code_postal,commune,departement,telephone,email,siret,'
  + 'apparu_le,disparu_le,siret_cree_le,siret_source,siret_ferme,entreprise_nom,statut,note,relance_le';
const NIVEAUX = [
  { niveau: 57, colonnes: `${BASE},situation_maj_le,role,secteur,structure_cle,adresse_cle,autres_professions,diplomes,specialites,score_installation,score_prospect,raisons` },
  { niveau: 56, colonnes: `${BASE},situation_maj_le` },
  { niveau: 55, colonnes: BASE },
] as const;
type Niveau = (typeof NIVEAUX)[number]['niveau'];
export const PAR_PAGE = 50;

export async function lireProspection(f: FiltresProspection, options: { tout?: boolean } = {}): Promise<{ lignes: LigneProspection[]; total: number; niveau: Niveau } | null> {
  for (const n of NIVEAUX) {
    const r = await lireAvec(f, options, n.niveau, n.colonnes);
    if (r) return { ...r, niveau: n.niveau };
  }
  return null;
}

async function lireAvec(f: FiltresProspection, { tout = false } = {}, niveau: Niveau, colonnes: string): Promise<{ lignes: LigneProspection[]; total: number } | null> {
  const supabase = await createClient();
  const aujourdhui = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });
  const ans = niveau >= 56;
  let req = supabase.from('prospection_liste').select(colonnes, { count: 'exact' });
  if (f.departement) req = req.eq('departement', f.departement);
  if (f.liberal) req = req.ilike('mode_exercice', 'lib%');
  if (f.actifs) req = req.is('disparu_le', null).not('siret_ferme', 'is', true);
  if (niveau >= 57 && f.specialite) req = req.contains('specialites', [f.specialite]);
  const role = ROLES_PROSPECTION.find((r) => r.id === f.role);
  if (niveau >= 57 && role) req = req.ilike('role', role.motif);
  // Conditions « l'une ou l'autre », réunies en un seul filtre or=(and(or(…),or(…)))
  const ou: string[] = [];
  const mois = PERIODES_INSTALLATION.find((p) => p.id === f.periode)?.mois ?? null;
  if (mois) {
    const limite = moisAvant(aujourdhui, mois);
    ou.push(`siret_cree_le.gte.${limite},apparu_le.gte.${limite}${ans ? `,situation_maj_le.gte.${limite}` : ''}`);
  }
  // Sans date : ni SIRET daté (souvent une entreprise individuelle non diffusible à l'INSEE), ni apparition depuis le premier import
  if (f.periode === 'sans_date') {
    req = req.is('siret_cree_le', null).is('apparu_le', null);
    if (ans) req = req.is('situation_maj_le', null);
  }
  if (f.statut === 'relance') req = req.lte('relance_le', aujourdhui).not('statut', 'in', '(gagne,perdu,hors_cible)');
  else if (f.statut === 'a_contacter') ou.push('statut.is.null,statut.eq.a_contacter');
  else if (f.statut) req = req.eq('statut', f.statut);
  if (f.q) {
    const motif = `"*${f.q.replace(/["*,()]/g, ' ')}*"`;
    ou.push(['nom', 'prenom', 'commune', 'code_postal', 'raison_sociale'].map((c) => `${c}.ilike.${motif}`).join(','));
  }
  if (ou.length === 1) req = req.or(ou[0]);
  else if (ou.length > 1) req = req.or(`and(${ou.map((o) => `or(${o})`).join(',')})`);
  if (niveau >= 57 && f.tri === 'score') req = req.order('score_prospect', { ascending: false, nullsFirst: false });
  req = req.order('siret_cree_le', { ascending: false, nullsFirst: false }).order('apparu_le', { ascending: false, nullsFirst: false }).order('nom');
  if (!tout) {
    const debut = (f.page - 1) * PAR_PAGE;
    const { data, count, error } = await req.range(debut, debut + PAR_PAGE - 1);
    if (error) return null;
    return { lignes: (data ?? []) as unknown as LigneProspection[], total: count ?? 0 };
  }
  // Export : Supabase renvoie 1 000 lignes au plus par requête (« Max rows ») → paquets de 1 000, 5 000 au plus
  const lignes: LigneProspection[] = [];
  let total = 0;
  for (let debut = 0; debut < 5000; debut += 1000) {
    const { data, count, error } = await req.range(debut, debut + 999);
    if (error) return debut ? { lignes, total } : null;
    total = count ?? total;
    lignes.push(...((data ?? []) as unknown as LigneProspection[]));
    if (!data || data.length < 1000) break;
  }
  return { lignes, total };
}

export type Lien = { ligne: LigneProspection; via: 'structure' | 'adresse'; depuis: string };
export type FichePraticien = { situations: LigneProspection[]; liens: Lien[] };

/**
 * Fiche d'un praticien : toutes ses situations (présentes et passées) et les confrères liés, présents ou passés, par la même
 * structure RPPS ou la même adresse. L'historique remonte à l'import initial (0055) : il s'enrichit chaque nuit.
 */
export async function lireFiche(rpps: string): Promise<FichePraticien | null> {
  if (!/^\d{11}$/.test(rpps)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.from('prospection_liste').select(NIVEAUX[0].colonnes).eq('rpps', rpps).order('disparu_le', { ascending: false, nullsFirst: true });
  if (error || !data?.length) return null;
  const situations = data as unknown as LigneProspection[];
  const structures = [...new Set(situations.map((s) => s.structure_cle).filter((x): x is string => Boolean(x)))];
  const adresses = [...new Set(situations.map((s) => s.adresse_cle).filter((x): x is string => Boolean(x)))];
  if (!structures.length && !adresses.length) return { situations, liens: [] };
  const liste = (cles: string[]) => cles.map((c) => `"${c.replace(/"/g, '')}"`).join(',');
  const conditions = [structures.length ? `structure_cle.in.(${liste(structures)})` : '', adresses.length ? `adresse_cle.in.(${liste(adresses)})` : ''].filter(Boolean).join(',');
  const { data: autres } = await supabase.from('prospection_liste').select(NIVEAUX[0].colonnes).neq('rpps', rpps).or(conditions).limit(200);
  const liens: Lien[] = ((autres ?? []) as unknown as LigneProspection[]).map((l) => {
    const s = situations.find((x) => (x.structure_cle && x.structure_cle === l.structure_cle) || (x.adresse_cle && x.adresse_cle === l.adresse_cle))!;
    return { ligne: l, via: s.structure_cle && s.structure_cle === l.structure_cle ? 'structure' : 'adresse', depuis: s.cle };
  });
  return { situations, liens };
}

export async function derniereSynchro(): Promise<Synchro | null> {
  const { data } = await (await createClient()).from('prospection_synchros').select('le,lignes,nouveaux,disparus,verifies').order('le', { ascending: false }).limit(1).maybeSingle();
  return (data as Synchro | null) ?? null;
}

// ---------------------------------------------------------------------------------------------------------------------
// Cabinets et actualités (migration 0058)
// ---------------------------------------------------------------------------------------------------------------------

export type Cabinet = {
  structure_cle: string; nom: string | null; adresse: string | null; code_postal: string | null; commune: string | null; departement: string | null;
  secteur: string | null; liberal: boolean | null; presents: number; titulaires: number; associes: number; collaborateurs: number; partis: number;
  decideurs: string | null; score: number | null; dernier_mouvement: string | null; telephone: string | null;
};
export type EvenementProspection = {
  id: string; le: string; type: string; cle: string; rpps: string; structure_cle: string | null; departement: string | null; commune: string | null;
  praticien: string | null; cabinet: string | null; details: Record<string, string | number | null>;
};
export type FiltresCabinets = { departement: string; q: string; taille: '' | 'groupe' | 'seul'; mouvement: boolean; page: number };

/** Cabinets triés par meilleur score de décideur ; null si la migration 0058 n'est pas passée */
export async function lireCabinets(f: FiltresCabinets): Promise<{ cabinets: Cabinet[]; total: number } | null> {
  const supabase = await createClient();
  let req = supabase.from('prospection_cabinets').select('*', { count: 'exact' }).gt('presents', 0).eq('liberal', true);
  if (f.departement) req = req.eq('departement', f.departement);
  if (f.taille === 'groupe') req = req.gt('presents', 1);
  if (f.taille === 'seul') req = req.eq('presents', 1);
  if (f.mouvement) req = req.not('dernier_mouvement', 'is', null);
  if (f.q) {
    const motif = `"*${f.q.replace(/["*,()]/g, ' ')}*"`;
    req = req.or(['nom', 'commune', 'code_postal', 'decideurs'].map((c) => `${c}.ilike.${motif}`).join(','));
  }
  const debut = (f.page - 1) * PAR_PAGE;
  const { data, count, error } = await req.order('score', { ascending: false, nullsFirst: false }).order('presents', { ascending: false }).range(debut, debut + PAR_PAGE - 1);
  if (error) return null;
  return { cabinets: (data ?? []) as Cabinet[], total: count ?? 0 };
}

/** Un cabinet : ses membres présents et passés, ses actualités */
export async function lireCabinet(structure: string): Promise<{ cabinet: Cabinet | null; membres: LigneProspection[]; evenements: EvenementProspection[] } | null> {
  if (!/^[A-Za-z0-9]{1,160}$/.test(structure)) return null;
  const supabase = await createClient();
  const [cab, membres, ev] = await Promise.all([
    supabase.from('prospection_cabinets').select('*').eq('structure_cle', structure).maybeSingle(),
    supabase.from('prospection_liste').select(NIVEAUX[0].colonnes).eq('structure_cle', structure).order('disparu_le', { ascending: false, nullsFirst: true }).order('score_prospect', { ascending: false, nullsFirst: false }),
    supabase.from('prospection_evenements').select('*').eq('structure_cle', structure).order('le', { ascending: false }).limit(100),
  ]);
  if (membres.error || !membres.data?.length) return null;
  return { cabinet: (cab.data as Cabinet | null) ?? null, membres: membres.data as unknown as LigneProspection[], evenements: (ev.data ?? []) as EvenementProspection[] };
}

/** Fil d'actualités ; null si la migration 0058 n'est pas passée */
export async function lireActualites(f: { departement: string; type: string; page: number }): Promise<{ evenements: EvenementProspection[]; total: number } | null> {
  const supabase = await createClient();
  let req = supabase.from('prospection_evenements').select('*', { count: 'exact' });
  if (f.departement) req = req.eq('departement', f.departement);
  if (f.type) req = req.eq('type', f.type);
  const debut = (f.page - 1) * 100;
  const { data, count, error } = await req.order('le', { ascending: false }).order('type').range(debut, debut + 99);
  if (error) return null;
  return { evenements: (data ?? []) as EvenementProspection[], total: count ?? 0 };
}
