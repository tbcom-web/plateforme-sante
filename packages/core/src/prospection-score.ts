// SCORES DE PROSPECTION (migration 0057, scripts/synchro-rpps.mjs, /admin/prospection ; docs/prospection-rpps.md).
// Pur, sans import : le script de synchro (Node, types effacés) l'importe directement.
//
// 1. Score d'INSTALLATION (0-100) : confiance qu'une situation d'exercice correspond à une installation récente à une nouvelle
//    adresse. Somme de signaux indépendants, chacun pondéré par son ancienneté (3 mois : plein, 6 mois : 85 %, 1 an : 65 %,
//    2 ans : 35 %, au-delà : rien), plus des indices sans date. Plusieurs signaux concordants → score élevé.
// 2. Score de PROSPECTION (0-100) : intérêt commercial = installation récente + rôle (le titulaire décide) + joignabilité +
//    spécialités valorisables + cabinet individuel. Nul si le praticien n'exerce plus là ou pas en libéral.
// 3. CABINET : le site se vend au cabinet et le TITULAIRE décide. Le titulaire (ou l'associé) hérite de la vie de sa structure :
//    arrivée d'un collaborateur (le cabinet grandit), départ d'un confrère (à remplacer), reprise (collaborateur devenu
//    titulaire, événement « role » de prospection-evenements.ts). Un collaborateur ne décide pas seul : moins de points.
// 4. CLIENTS (statut « gagne » du suivi, 0055) : un client n'est plus un prospect ; ceux qui travaillent ou ont travaillé avec un
//    client (même structure ou même adresse) sont des recommandations possibles ; et chaque prospect reçoit des points de
//    RESSEMBLANCE avec les clients : rapport de vraisemblance (bayésien naïf, lissé) de ses traits chez les clients et chez
//    l'ensemble des podologues libéraux (rôle, type de cabinet, taille, maison de santé, multi-sites, ancienneté RPPS, département).
// Chaque point est expliqué (raisons), pour que la commerciale sache quoi vérifier au téléphone.

export const SPECIALITES_DIPLOMES = [
  { id: 'sport', libelle: 'Sport', motif: /sport/i },
  { id: 'diabete', libelle: 'Pied diabétique', motif: /diab/i },
  { id: 'posturo', libelle: 'Posturologie', motif: /postur/i },
  { id: 'osteo', libelle: 'Ostéopathie', motif: /ost[ée]opath/i },
  { id: 'orthese', libelle: 'Orthèses', motif: /orth[ée]s|orthop[ée]d/i },
  { id: 'enfant', libelle: 'Enfant', motif: /p[ée]diatr|enfant|apprentissage/i },
  { id: 'geriatrie', libelle: 'Gériatrie', motif: /g[ée]riatr|g[ée]ronto/i },
  { id: 'eee', libelle: 'Diplôme européen', motif: /\bEEE\b|europ/i },
  // Pas un diplôme : situation d'exercice « Enseignant salarié » (institut de formation, CHU), posée par la synchro
  { id: 'enseignant', libelle: 'Enseignant', motif: /(?!)/ },
] as const;
/** Situation d'enseignement (rôle « Enseignant salarié » ou établissement d'enseignement) */
export const estEnseignement = (l: { role?: string | null; secteur?: string | null }) => /enseign/i.test(`${l.role ?? ''} ${l.secteur ?? ''}`);
export type IdSpecialite = (typeof SPECIALITES_DIPLOMES)[number]['id'];
export const libelleSpecialite = (id: string) => SPECIALITES_DIPLOMES.find((s) => s.id === id)?.libelle ?? id;

/** Spécialités repérées dans les libellés de diplômes et d'autorisations (DU, DIU, titres) */
export function specialitesDepuisDiplomes(libelles: readonly string[]): IdSpecialite[] {
  return SPECIALITES_DIPLOMES.filter((s) => libelles.some((l) => s.motif.test(l))).map((s) => s.id);
}

export type LigneScore = {
  cle: string;
  rpps: string;
  apparu_le?: string | null;
  disparu_le?: string | null;
  siret_cree_le?: string | null;
  siret_source?: string | null;
  siret_ferme?: boolean | null;
  situation_maj_le?: string | null;
  role?: string | null;
  secteur?: string | null;
  mode_exercice?: string | null;
  adresse_cle?: string | null;
  structure_cle?: string | null;
  raison_sociale?: string | null;
  commune?: string | null;
  departement?: string | null;
  nom?: string | null;
  prenom?: string | null;
  autres_professions?: Record<string, number> | null;
  /** Statut du suivi de la commerciale : « gagne » = client */
  statut?: string | null;
  telephone?: string | null;
  email?: string | null;
  specialites?: readonly string[] | null;
};
/** t : « i » (installation) ou « p » (prospection) ; l : libellé ; p : points ; k : clé de filtre (« client » : lien avec un client) */
export type Raison = { t: 'i' | 'p'; l: string; p: number; k?: string };
export type ScoreProspection = { installation: number; prospect: number; raisons: Raison[] };
/** Événements utiles au score (prospection_evenements, 0058) : changements de rôle surtout */
export type EvenementScore = { type: string; cle: string; le: string; details?: Record<string, unknown> | null };

const JOUR_MS = 86_400_000;
const jourFr = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

/** Poids d'un signal daté selon son ancienneté */
export function attenuation(date: string | null | undefined, aujourdhui: string): number {
  if (!date) return 0;
  const mois = (Date.parse(aujourdhui.slice(0, 10)) - Date.parse(date.slice(0, 10))) / JOUR_MS / 30.44;
  if (mois <= 3) return 1;
  if (mois <= 6) return 0.85;
  if (mois <= 12) return 0.65;
  if (mois <= 24) return 0.35;
  return 0;
}

const estLiberal = (l: LigneScore) => /^lib/i.test(l.mode_exercice ?? '');
const ecartJours = (a: string, b: string) => Math.abs(Date.parse(a.slice(0, 10)) - Date.parse(b.slice(0, 10))) / JOUR_MS;

const casse = (s: string | null | undefined) => String(s ?? '').toLowerCase().replace(/(^|[\s'-])\p{L}/gu, (m) => m.toUpperCase());
const estClient = (l: LigneScore) => l.statut === 'gagne';

/** Traits d'un praticien pour la ressemblance (une valeur par trait), calculés sur ses situations libérales actives */
function traitsDe(situations: readonly LigneScore[], tailleStructure: (l: LigneScore) => number, recent: boolean): Record<string, string> {
  const lib = situations.filter((s) => estLiberal(s) && !s.disparu_le);
  const v = lib[0] ?? situations[0];
  const roles = lib.map((s) => s.role ?? '').join(' ');
  const taille = Math.max(1, ...lib.map(tailleStructure));
  return {
    role: /titulaire/i.test(roles) ? 'titulaire' : /associ/i.test(roles) ? 'associé' : /collaborat/i.test(roles) ? 'collaborateur' : 'autre',
    secteur: /individuel/i.test(v.secteur ?? '') ? 'cabinet individuel' : /groupe/i.test(v.secteur ?? '') ? 'cabinet de groupe' : /soci/i.test(v.secteur ?? '') ? 'exercice en société' : 'autre',
    taille: taille === 1 ? 'seul au cabinet' : taille <= 3 ? 'cabinet de 2 ou 3 podologues' : 'cabinet de 4 podologues ou plus',
    mixte: lib.some((s) => s.autres_professions && Object.keys(s.autres_professions).length) ? 'adresse partagée avec d’autres soignants' : 'sans autre soignant à l’adresse',
    lieux: lib.length > 1 ? 'plusieurs lieux d’exercice' : 'un seul lieu d’exercice',
    anciennete: recent ? 'inscrit récemment au RPPS' : 'installé de longue date',
    departement: v.departement ?? '?',
  };
}
const LIBELLE_TRAIT: Record<string, (v: string) => string> = {
  role: (v) => v, secteur: (v) => v, taille: (v) => v, mixte: (v) => v, lieux: (v) => v, anciennete: (v) => v,
  departement: (v) => `département ${v}`,
};

/** Scores de toutes les situations d'une profession (les liens entre lignes servent : adresse partagée, départ d'un autre lieu) */
/** Numéros RPPS attribués dans l'ordre : les 5 % les plus élevés de la profession = inscriptions les plus récentes */
function seuilRecentDe(parRpps: Map<string, LigneScore[]>): string | null {
  const numeros = [...parRpps.keys()].sort();
  return numeros[Math.floor(numeros.length * 0.95)] ?? null;
}

export function scorerProspection(lignes: readonly LigneScore[], aujourdhui: string, evenements: readonly EvenementScore[] = []): Map<string, ScoreProspection> {
  const parAdresse = new Map<string, LigneScore[]>();
  const parRpps = new Map<string, LigneScore[]>();
  const parStructure = new Map<string, LigneScore[]>();
  for (const l of lignes) {
    if (l.adresse_cle) parAdresse.set(l.adresse_cle, [...(parAdresse.get(l.adresse_cle) ?? []), l]);
    if (l.structure_cle) parStructure.set(l.structure_cle, [...(parStructure.get(l.structure_cle) ?? []), l]);
    parRpps.set(l.rpps, [...(parRpps.get(l.rpps) ?? []), l]);
  }
  // Clients et ressemblance (statistiques par praticien : une voix par RPPS)
  const tailleStructure = (l: LigneScore) => (l.structure_cle ? (parStructure.get(l.structure_cle) ?? []).filter((m) => !m.disparu_le).length : 1);
  const traits = new Map<string, Record<string, string>>();
  const seuil = seuilRecentDe(parRpps);
  for (const [rpps, sit] of parRpps) traits.set(rpps, traitsDe(sit, tailleStructure, seuil !== null && rpps >= seuil));
  const clients = new Set([...parRpps].filter(([, sit]) => sit.some(estClient)).map(([rpps]) => rpps));
  const liberaux = [...parRpps].filter(([, sit]) => sit.some((s) => estLiberal(s) && !s.disparu_le)).map(([rpps]) => rpps);
  const frequences = (groupe: string[]) => {
    const f = new Map<string, number>();
    for (const r of groupe) for (const [k, v] of Object.entries(traits.get(r) ?? {})) f.set(`${k}:${v}`, (f.get(`${k}:${v}`) ?? 0) + 1);
    return f;
  };
  const freqClients = frequences([...clients]);
  const freqTous = frequences(liberaux);
  const nClients = clients.size, nTous = liberaux.length;
  /**
   * Rapport de vraisemblance d'un trait, (part chez les clients) / (part chez tous), lissé vers 1 (m-estimation, poids 10) : un
   * trait porté par 2 ou 3 clients seulement (un département peu prospecté) ne pèse presque rien.
   */
  const rapport = (cle: string) => {
    const pTous = ((freqTous.get(cle) ?? 0) + 1) / (nTous + 2);
    return ((freqClients.get(cle) ?? 0) + 10 * pTous) / (nClients + 10) / pTous;
  };
  const logRapport = (rpps: string) => Object.entries(traits.get(rpps) ?? {}).reduce((s, [k, v]) => s + Math.log(rapport(`${k}:${v}`)), 0);
  // Points selon le RANG parmi les podologues libéraux (non clients) : 15 × rang³ → la moitié la moins ressemblante n'a presque rien
  const ordre = liberaux.filter((r) => !clients.has(r)).map((r) => ({ r, v: logRapport(r) })).sort((a, b) => a.v - b.v);
  const rangRessemblance = new Map(ordre.map((x, i) => [x.r, ordre.length > 1 ? i / (ordre.length - 1) : 0]));
  const reprises = new Map<string, string>(); // cle → date où la situation est passée à « titulaire »
  for (const e of evenements) if (e.type === 'role' && /titulaire/i.test(String(e.details?.apres ?? '')) && (!reprises.has(e.cle) || e.le > reprises.get(e.cle)!)) reprises.set(e.cle, e.le);
  const seuilRecent = seuilRecentDe(parRpps);

  const scores = new Map<string, ScoreProspection>();
  for (const l of lignes) {
    const raisons: Raison[] = [];
    const ajouter = (t: Raison['t'], libelle: string, points: number) => { if (points > 0) raisons.push({ t, l: libelle, p: Math.round(points) }); };

    // --- Installation
    const aRpps = attenuation(l.apparu_le, aujourdhui);
    const aSiret = attenuation(l.siret_cree_le, aujourdhui);
    const aAns = attenuation(l.situation_maj_le, aujourdhui);
    if (aRpps) ajouter('i', `Nouvelle situation au RPPS le ${jourFr(l.apparu_le!)}`, 45 * aRpps);
    if (aSiret) ajouter('i', l.siret_source === 'nom' ? `Établissement à son nom créé le ${jourFr(l.siret_cree_le!)} (trouvé par nom)` : `SIRET du cabinet créé le ${jourFr(l.siret_cree_le!)}`, (l.siret_source === 'nom' ? 25 : 40) * aSiret);
    if (aAns) ajouter('i', `Situation modifiée au RPPS le ${jourFr(l.situation_maj_le!)}`, 15 * aAns);
    const reprise = reprises.get(l.cle);
    const aReprise = attenuation(reprise, aujourdhui);
    if (aReprise) ajouter('i', `Devenu titulaire le ${jourFr(reprise!)} (reprise ou création de cabinet)`, 35 * aReprise);

    const voisins = (l.adresse_cle ? parAdresse.get(l.adresse_cle) ?? [] : []).filter((v) => v.rpps !== l.rpps);
    if (l.apparu_le && l.adresse_cle) {
      // Adresse déjà connue avant son arrivée ? (présent à l'import initial = apparu_le nul, ou arrivé avant)
      const avant = voisins.filter((v) => !v.apparu_le || v.apparu_le < l.apparu_le!);
      if (!avant.length) ajouter('i', 'Adresse nouvelle : aucun podologue connu à cette adresse avant son arrivée', 10);
      else raisons.push({ t: 'i', l: `Rejoint un cabinet existant (${avant.length} confrère${avant.length > 1 ? 's' : ''} déjà là)`, p: 0 });
    }
    const repere = l.apparu_le ?? l.siret_cree_le ?? null;
    const depart = repere && (parRpps.get(l.rpps) ?? []).find((a) => a.cle !== l.cle && a.disparu_le && ecartJours(a.disparu_le, repere) <= 120);
    if (depart) ajouter('i', `A quitté un autre lieu${depart.commune ? ` (${depart.commune})` : ''} le ${jourFr(depart.disparu_le!)}`, 10);
    if (seuilRecent && l.rpps >= seuilRecent) ajouter('i', 'Numéro RPPS parmi les plus récents (inscription récente)', 10);
    const date = Math.max(aRpps, aSiret, aAns, aReprise);
    if (date && /titulaire/i.test(l.role ?? '')) ajouter('i', 'Titulaire du cabinet', 5);
    const installation = Math.min(100, raisons.filter((r) => r.t === 'i').reduce((s, r) => s + r.p, 0));

    // --- Prospection
    let prospect = 0;
    if (clients.has(l.rpps)) raisons.push({ t: 'p', l: 'Déjà client', p: 0, k: 'deja_client' });
    else if (l.disparu_le || l.siret_ferme) raisons.push({ t: 'p', l: l.disparu_le ? 'N’exerce plus à cette adresse' : 'Établissement fermé', p: 0 });
    else if (!estLiberal(l)) raisons.push({ t: 'p', l: 'Exercice non libéral', p: 0 });
    else {
      ajouter('p', `Installation (${installation} %)`, installation * 0.55);
      const decideur = /titulaire|associ/i.test(l.role ?? '');
      if (/titulaire/i.test(l.role ?? '')) ajouter('p', 'Titulaire : décide pour le cabinet', 15);
      else if (/associ/i.test(l.role ?? '')) ajouter('p', 'Associé : décide avec ses associés', 10);
      else if (/collaborat/i.test(l.role ?? '')) {
        ajouter('p', 'Collaborateur', 3);
        raisons.push({ t: 'p', l: 'Le site du cabinet se décide avec le titulaire : voir la fiche du cabinet', p: 0 });
      }
      // Vie du cabinet, au bénéfice de ceux qui décident
      const confreres = decideur && l.structure_cle ? (parStructure.get(l.structure_cle) ?? []).filter((m) => m.rpps !== l.rpps) : [];
      const arrivee = confreres.filter((m) => m.apparu_le && attenuation(m.apparu_le, aujourdhui)).sort((a, b) => b.apparu_le!.localeCompare(a.apparu_le!))[0];
      if (arrivee) ajouter('p', `Un ${/collaborat/i.test(arrivee.role ?? '') ? 'collaborateur' : 'confrère'} a rejoint son cabinet le ${jourFr(arrivee.apparu_le!)} : le cabinet grandit`, 10 * attenuation(arrivee.apparu_le, aujourdhui));
      const depart = confreres.filter((m) => m.disparu_le && attenuation(m.disparu_le, aujourdhui)).sort((a, b) => b.disparu_le!.localeCompare(a.disparu_le!))[0];
      if (depart) ajouter('p', `Départ d’un confrère le ${jourFr(depart.disparu_le!)} : remplacement à prévoir`, 6 * attenuation(depart.disparu_le, aujourdhui));
      const presents = confreres.filter((m) => !m.disparu_le).length;
      if (presents) raisons.push({ t: 'p', l: `Cabinet de ${presents + 1} podologues`, p: 0 });
      if (l.telephone) ajouter('p', 'Téléphone au RPPS', 8);
      if (l.email) ajouter('p', 'E-mail au RPPS', 4);
      // Enseigner (institut de formation, CHU) : habitué à transmettre et à communiquer, sensible à son image
      const ecole = (parRpps.get(l.rpps) ?? []).find((x) => x.cle !== l.cle && estEnseignement(x));
      if (ecole) ajouter('p', `Enseigne aussi${ecole.raison_sociale ? ` (${ecole.raison_sociale.toLowerCase().replace(/(^|\s)\p{L}/gu, (m) => m.toUpperCase())})` : ''} : habitué à transmettre et à communiquer`, 8);
      const specs = (l.specialites ?? []).filter((s) => s !== 'eee' && s !== 'enseignant');
      if (specs.length) ajouter('p', `Spécialité à mettre en avant : ${specs.map(libelleSpecialite).join(', ')}`, Math.min(2, specs.length) * 4);
      if (/individuel/i.test(l.secteur ?? '')) ajouter('p', 'Cabinet individuel', 5);
      // Lien avec un client : même structure ou même adresse, aujourd'hui ou par le passé (recommandation possible)
      const liens = [
        ...(l.structure_cle ? parStructure.get(l.structure_cle) ?? [] : []),
        ...(l.adresse_cle ? parAdresse.get(l.adresse_cle) ?? [] : []),
      ].filter((m) => m.rpps !== l.rpps && clients.has(m.rpps));
      if (liens.length) {
        const c = liens.find((m) => !m.disparu_le) ?? liens[0];
        const qui = [casse(c.prenom), casse(c.nom)].filter(Boolean).join(' ') || 'un client';
        raisons.push({ t: 'p', l: `${c.disparu_le || l.disparu_le ? 'A travaillé' : 'Travaille'} avec votre client ${qui} (même cabinet) : recommandation possible`, p: 12, k: 'client' });
      }
      // Ressemblance avec les clients (5 clients au moins pour que ce soit parlant), 15 points au plus
      if (nClients >= 5) {
        const t = traits.get(l.rpps) ?? {};
        const rang = rangRessemblance.get(l.rpps) ?? 0;
        const points = Math.round(15 * rang ** 3);
        // Traits explicatifs : nettement plus fréquents chez les clients, et portés par 5 clients au moins
        const forts = Object.entries(t).map(([k, v]) => ({ k, v, r: rapport(`${k}:${v}`), n: freqClients.get(`${k}:${v}`) ?? 0 }))
          .filter((f) => f.r >= 1.2 && f.n >= 5).sort((a, b) => b.r - a.r).slice(0, 3);
        if (points > 0) {
          const pourquoi = forts.map((f) => `${LIBELLE_TRAIT[f.k](f.v)} (${Math.round((f.n / nClients) * 100)} % de vos clients)`).join(', ');
          raisons.push({ t: 'p', l: `Plus proche de vos clients que ${Math.round(rang * 100)} % des podologues${pourquoi ? ` : ${pourquoi}` : ''}`, p: points, k: 'ressemblance' });
        }
      }
      prospect = Math.min(100, raisons.filter((r) => r.t === 'p').reduce((s, r) => s + r.p, 0));
    }
    scores.set(l.cle, { installation, prospect, raisons });
  }
  return scores;
}
