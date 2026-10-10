// SCORES DE PROSPECTION (migration 0057, scripts/synchro-rpps.mjs, /admin/prospection ; docs/prospection-rpps.md).
// Pur, sans import : le script de synchro (Node, types effacés) l'importe directement.
//
// 1. Score d'INSTALLATION (0-100) : confiance qu'une situation d'exercice correspond à une installation récente à une nouvelle
//    adresse. Somme de signaux indépendants, chacun pondéré par son ancienneté (3 mois : plein, 6 mois : 85 %, 1 an : 65 %,
//    2 ans : 35 %, au-delà : rien), plus des indices sans date. Plusieurs signaux concordants → score élevé.
// 2. Score de PROSPECTION (0-100) : intérêt commercial = installation récente + rôle (le titulaire décide) + joignabilité +
//    spécialités valorisables + cabinet individuel. Nul si le praticien n'exerce plus là ou pas en libéral.
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
] as const;
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
  commune?: string | null;
  telephone?: string | null;
  email?: string | null;
  specialites?: readonly string[] | null;
};
/** t : « i » (installation) ou « p » (prospection) ; l : libellé ; p : points */
export type Raison = { t: 'i' | 'p'; l: string; p: number };
export type ScoreProspection = { installation: number; prospect: number; raisons: Raison[] };

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

/** Scores de toutes les situations d'une profession (les liens entre lignes servent : adresse partagée, départ d'un autre lieu) */
export function scorerProspection(lignes: readonly LigneScore[], aujourdhui: string): Map<string, ScoreProspection> {
  const parAdresse = new Map<string, LigneScore[]>();
  const parRpps = new Map<string, LigneScore[]>();
  for (const l of lignes) {
    if (l.adresse_cle) parAdresse.set(l.adresse_cle, [...(parAdresse.get(l.adresse_cle) ?? []), l]);
    parRpps.set(l.rpps, [...(parRpps.get(l.rpps) ?? []), l]);
  }
  // Numéros RPPS attribués dans l'ordre : les 5 % les plus élevés de la profession = inscriptions les plus récentes
  const numeros = [...parRpps.keys()].sort();
  const seuilRecent = numeros[Math.floor(numeros.length * 0.95)] ?? null;

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
    const date = Math.max(aRpps, aSiret, aAns);
    if (date && /titulaire/i.test(l.role ?? '')) ajouter('i', 'Titulaire du cabinet', 5);
    const installation = Math.min(100, raisons.filter((r) => r.t === 'i').reduce((s, r) => s + r.p, 0));

    // --- Prospection
    let prospect = 0;
    if (l.disparu_le || l.siret_ferme) raisons.push({ t: 'p', l: l.disparu_le ? 'N’exerce plus à cette adresse' : 'Établissement fermé', p: 0 });
    else if (!estLiberal(l)) raisons.push({ t: 'p', l: 'Exercice non libéral', p: 0 });
    else {
      ajouter('p', `Installation (${installation} %)`, installation * 0.55);
      if (/titulaire/i.test(l.role ?? '')) ajouter('p', 'Titulaire : décide pour le cabinet', 15);
      else if (/associ/i.test(l.role ?? '')) ajouter('p', 'Associé', 10);
      else if (/collaborat/i.test(l.role ?? '')) ajouter('p', 'Collaborateur', 5);
      if (l.telephone) ajouter('p', 'Téléphone au RPPS', 8);
      if (l.email) ajouter('p', 'E-mail au RPPS', 4);
      const specs = (l.specialites ?? []).filter((s) => s !== 'eee');
      if (specs.length) ajouter('p', `Spécialité à mettre en avant : ${specs.map(libelleSpecialite).join(', ')}`, Math.min(2, specs.length) * 4);
      if (/individuel/i.test(l.secteur ?? '')) ajouter('p', 'Cabinet individuel', 5);
      prospect = Math.min(100, raisons.filter((r) => r.t === 'p').reduce((s, r) => s + r.p, 0));
    }
    scores.set(l.cle, { installation, prospect, raisons });
  }
  return scores;
}
