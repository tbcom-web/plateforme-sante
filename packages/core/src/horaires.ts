// Horaires d'ouverture par jour : modèle structuré (jour → plages { debut, fin } au format « HH:MM »), lecture des anciens
// horaires en texte libre (« 9h-12h / 14h-19h »), affichage regroupé (« Lundi au vendredi : 9h00–12h00, 14h00–19h00 »),
// données schema.org (OpeningHoursSpecification) et avertissements doux (jamais bloquants : règle de Paul, 2026-10-05).
//
// Compatibilité : chaque jour garde `heures`, le texte affiché (« 9h00–12h30, 14h00–19h00 » ou « Fermé »), lu par les
// gabarits et modèles existants. `plages` fait foi tant que `heures` en est la traduction exacte ; si un ancien code a
// modifié `heures` seul, c'est `heures` qui est relu (plagesDe). Fonctions pures, sans dépendance au navigateur.
import type { Horaire, Plage } from './types';
import { verifierTexte } from './lexique';

export type { Plage };

/** Jours dans l'ordre de la semaine (même ordre que JOURS de draft.ts). */
export const JOURS_SEMAINE = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'] as const;
export const JOURS_OUVRES = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'] as const;
const SCHEMA: Record<string, string> = {
  Lundi: 'Monday', Mardi: 'Tuesday', Mercredi: 'Wednesday', Jeudi: 'Thursday', Vendredi: 'Friday', Samedi: 'Saturday', Dimanche: 'Sunday',
};

export const FERME_TEXTE = 'Fermé';
/** Plages par jour dans l'éditeur (matin, après-midi) ; jusqu'à 3 conservées pour les anciens horaires. */
export const PLAGES_PAR_JOUR = 2;
export const PLAGES_MAX = 3;
export const PAS_MINUTES = 15;
export const NOTE_HORAIRES_MAX = 120;

/** Heures proposées dans les sélecteurs : de 6h00 à 22h00, au pas de 15 minutes. */
export const HEURES_CHOIX: { value: string; label: string }[] = Array.from({ length: (22 - 6) * 4 + 1 }, (_, i) => {
  const m = 6 * 60 + i * PAS_MINUTES;
  const value = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  return { value, label: formaterHeure(value) };
});

const minutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
const versHHMM = (h: number, m: number) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

/** « 9h », « 9h00 », « 9 h 30 », « 09:00 », « 14 » → « HH:MM » ; null si ce n'est pas une heure valide. */
export function lireHeure(t: string): string | null {
  const m = String(t).trim().match(/^(\d{1,2})\s*(?:[h:.]\s*(\d{2})?)?\s*$/i);
  if (!m) return null;
  const h = Number(m[1]);
  const mn = m[2] ? Number(m[2]) : 0;
  if (h > 24 || mn > 59 || (h === 24 && mn > 0)) return null;
  return versHHMM(h, mn);
}

/** « 09:00 » → « 9h00 » (charte des sites : « 9h00–12h30 »). */
export function formaterHeure(hhmm: string): string {
  const [h, m] = hhmm.split(':');
  return `${Number(h)}h${m ?? '00'}`;
}

export const formaterPlage = (p: Plage) => `${formaterHeure(p.debut)}–${formaterHeure(p.fin)}`;

/** Texte affiché d'un jour : « 9h00–12h30, 14h00–19h00 », « Fermé » sans plage. */
export const texteHeures = (plages: readonly Plage[]) => (plages.length ? plages.map(formaterPlage).join(', ') : FERME_TEXTE);

const plageValide = (p: unknown): p is Plage =>
  Boolean(p) && typeof (p as Plage).debut === 'string' && typeof (p as Plage).fin === 'string' && /^\d{2}:\d{2}$/.test((p as Plage).debut) && /^\d{2}:\d{2}$/.test((p as Plage).fin)
  && lireHeure((p as Plage).debut) !== null && lireHeure((p as Plage).fin) !== null;

const FERME_RE = /^\s*(ferm[ée]e?s?|clos|repos|-+|—|–)?\s*\.?\s*$/i;
const PLAGE_RE = /(\d{1,2}\s*(?:[h:.]\s*\d{0,2})?)\s*(?:–|—|-|à|a|>|jusqu'?à)\s*(\d{1,2}\s*(?:[h:.]\s*\d{0,2})?)/gi;

/**
 * Lit un ancien texte d'horaires d'un jour. `plages` : plages reconnues ; `reste` : texte non interprété (vide si tout est
 * lu). « Fermé » ou vide → aucune plage.
 */
export function lirePlages(texte: string): { plages: Plage[]; reste: string } {
  const t = String(texte ?? '').trim();
  if (FERME_RE.test(t)) return { plages: [], reste: '' };
  const plages: Plage[] = [];
  for (const m of t.matchAll(PLAGE_RE)) {
    const debut = lireHeure(m[1].replace(/\s+/g, ''));
    const fin = lireHeure(m[2].replace(/\s+/g, ''));
    if (debut && fin) plages.push({ debut, fin });
  }
  // Ce qui reste une fois les plages et les liaisons retirées (« et », « / », « de », virgules) : texte libre à garder.
  const reste = t
    .replace(PLAGE_RE, ' ')
    .replace(/\b(et|de|puis|le matin|l'après-midi|matin|après-midi|apr[eè]s-midi)\b/gi, ' ')
    .replace(/[\s,;/+&|()]+/g, ' ')
    .trim();
  return { plages: plages.slice(0, PLAGES_MAX), reste: plages.length ? (/[a-zà-ÿ\d]{2,}/i.test(reste) ? t : '') : t };
}

/** Plages effectives d'un jour : `plages` si `heures` en est la traduction, sinon relecture de `heures` (ancien code). */
export function plagesDe(h: Pick<Horaire, 'heures' | 'plages'>): Plage[] {
  if (Array.isArray(h.plages)) {
    const valides = h.plages.filter(plageValide);
    if (texteHeures(valides) === String(h.heures ?? '').trim() || h.heures === undefined) return valides;
  }
  return lirePlages(h.heures ?? '').plages;
}

/** Un jour structuré : plages bornées, texte affiché recalculé. */
export const horaireDe = (jour: string, plages: readonly Plage[]): Horaire => {
  const p = plages.filter(plageValide).slice(0, PLAGES_MAX).map((x) => ({ debut: x.debut, fin: x.fin }));
  return { jour, heures: texteHeures(p), plages: p };
};

/**
 * Normalise les horaires d'un lieu : les 7 jours dans l'ordre, chacun avec ses plages. Les anciens horaires en texte
 * libre sont convertis ; ce qui ne s'interprète pas est rendu dans `nonLus` (« Mardi : sur rendez-vous l'après-midi »)
 * pour être gardé dans la note du lieu : aucune perte.
 */
export function normaliserHoraires(brut: unknown): { horaires: Horaire[]; nonLus: string[] } {
  const liste = Array.isArray(brut) ? (brut as Partial<Horaire>[]) : [];
  const nonLus: string[] = [];
  const horaires = JOURS_SEMAINE.map((jour, i) => {
    const h = liste.find((x) => String(x?.jour ?? '').trim().toLowerCase() === jour.toLowerCase()) ?? (liste.length === 7 && !liste[i]?.jour ? liste[i] : undefined);
    if (!h) return horaireDe(jour, []);
    const heures = String(h.heures ?? '').trim();
    if (Array.isArray(h.plages) && (h.heures === undefined || texteHeures(h.plages.filter(plageValide)) === heures)) return horaireDe(jour, h.plages);
    const { plages, reste } = lirePlages(heures);
    if (reste) nonLus.push(`${jour} : ${reste}`);
    return horaireDe(jour, plages);
  });
  return { horaires, nonLus };
}

/** Horaires bornés pour l'enregistrement (côté serveur) : 7 jours, 3 plages au plus, heures valides. */
export const nettoyerHoraires = (brut: unknown): Horaire[] => normaliserHoraires(brut).horaires;

/** Ajoute à une note les textes non interprétés des anciens horaires (sans doublon) : rien n'est perdu. */
export function noteAvecNonLus(note: string, nonLus: readonly string[]): string {
  const base = String(note ?? '').trim();
  const ajouts = nonLus.filter((n) => !base.includes(n));
  return [base, ...ajouts].filter(Boolean).join(' ; ');
}

// ---- Regroupement et affichage ----

export type GroupeHoraires = {
  jours: string[];
  /** Numéros des jours JavaScript (dimanche = 0) séparés par des espaces : repérage du jour courant côté navigateur */
  numeros: string;
  plages: Plage[];
  /** « 9h00–12h00, 14h00–19h00 » ou « Fermé » */
  texte: string;
  ouvert: boolean;
};

const trier = (p: readonly Plage[]) => [...p].sort((a, b) => a.debut.localeCompare(b.debut));

/** Regroupe les jours consécutifs aux plages identiques (ordre lundi → dimanche). */
export function regrouperHoraires(horaires: readonly Horaire[]): GroupeHoraires[] {
  const groupes: GroupeHoraires[] = [];
  JOURS_SEMAINE.forEach((jour, i) => {
    const h = horaires.find((x) => x.jour === jour);
    const plages = trier(h ? plagesDe(h) : []);
    const texte = texteHeures(plages);
    const dernier = groupes.at(-1);
    const numero = String((i + 1) % 7);
    if (dernier && dernier.texte === texte) {
      dernier.jours.push(jour);
      dernier.numeros += ` ${numero}`;
    } else groupes.push({ jours: [jour], numeros: numero, plages, texte, ouvert: plages.length > 0 });
  });
  return groupes;
}

/** « Lundi », « Lundi et mardi », « Lundi au vendredi » (jours consécutifs). */
export function libelleJours(jours: readonly string[]): string {
  if (jours.length === 0) return '';
  if (jours.length === 1) return jours[0];
  const suite = (a: string) => a.toLowerCase();
  return jours.length === 2 ? `${jours[0]} et ${suite(jours[1])}` : `${jours[0]} au ${suite(jours.at(-1)!)}`;
}

/** Au moins un jour ouvert. */
export const horairesRenseignes = (horaires: readonly Horaire[]) => horaires.some((h) => plagesDe(h).length > 0);

/**
 * Résumé en une ligne : « Lundi au mercredi : 9h00–12h00, 14h00–19h00 ; Jeudi : 8h30–17h00 ». Jours fermés omis ;
 * vide si aucun jour n'est ouvert.
 */
export const resumeHoraires = (horaires: readonly Horaire[]) =>
  regrouperHoraires(horaires).filter((g) => g.ouvert).map((g) => `${libelleJours(g.jours)} : ${g.texte}`).join(' ; ');

/** Lignes affichables (jours fermés compris) : « Dimanche : fermé ». */
export const lignesHoraires = (horaires: readonly Horaire[]) =>
  regrouperHoraires(horaires).map((g) => `${libelleJours(g.jours)} : ${g.ouvert ? g.texte : 'fermé'}`);

/** Mentions qui accompagnent les horaires d'un lieu (« Sur rendez-vous uniquement », note courte). */
export function mentionsHoraires(l: { surRendezVous?: boolean; noteHoraires?: string }): string[] {
  // Sans point final : les gabarits ajoutent la ponctuation.
  return [l.surRendezVous ? 'Sur rendez-vous uniquement' : '', String(l.noteHoraires ?? '').trim().replace(/[\s.]+$/, '')].filter(Boolean);
}

/** Jours de visites à domicile en phrase : « Le mardi et le jeudi » ; vide sans jour. */
export function phraseJoursDomicile(jours: readonly string[] | undefined): string {
  const j = JOURS_SEMAINE.filter((x) => jours?.includes(x)).map((x) => `le ${x.toLowerCase()}`);
  if (!j.length) return '';
  const phrase = j.length === 1 ? j[0] : `${j.slice(0, -1).join(', ')} et ${j.at(-1)}`;
  return phrase.charAt(0).toUpperCase() + phrase.slice(1);
}

/**
 * OpeningHoursSpecification schema.org : une entrée par plage, jours aux plages identiques réunis (dayOfWeek en liste).
 * Exact au quart d'heure près, rien d'inventé : aucun jour ouvert → liste vide.
 */
export function specificationsHoraires(horaires: readonly Horaire[]) {
  const parPlage = new Map<string, { jours: string[]; plage: Plage }>();
  for (const jour of JOURS_SEMAINE) {
    const h = horaires.find((x) => x.jour === jour);
    if (!h) continue;
    for (const p of trier(plagesDe(h))) {
      if (minutes(p.fin) <= minutes(p.debut)) continue;
      const cle = `${p.debut}-${p.fin}`;
      const e = parPlage.get(cle) ?? { jours: [], plage: p };
      e.jours.push(jour);
      parPlage.set(cle, e);
    }
  }
  return [...parPlage.values()]
    .sort((a, b) => JOURS_SEMAINE.indexOf(a.jours[0] as never) - JOURS_SEMAINE.indexOf(b.jours[0] as never) || a.plage.debut.localeCompare(b.plage.debut))
    .map(({ jours, plage }) => ({
      '@type': 'OpeningHoursSpecification' as const,
      dayOfWeek: jours.length === 1 ? `https://schema.org/${SCHEMA[jours[0]]}` : jours.map((j) => `https://schema.org/${SCHEMA[j]}`),
      opens: plage.debut,
      closes: plage.fin === '24:00' ? '23:59' : plage.fin,
    }));
}

// ---- Avertissements (ambre, jamais bloquants) ----

/** Plages incohérentes : fin avant le début, plages qui se chevauchent. `lieu` : « (lieu 2) » en multi-lieux. */
export function avertissementsHoraires(horaires: readonly Horaire[], lieu = ''): string[] {
  const n = lieu ? ` ${lieu}` : '';
  const alertes: string[] = [];
  for (const h of horaires) {
    const plages = plagesDe(h);
    for (const p of plages) {
      if (minutes(p.fin) <= minutes(p.debut)) alertes.push(`${h.jour}${n} : la plage ${formaterPlage(p)} se termine avant de commencer ; elle ne sera pas lue par Google.`);
    }
    const t = trier(plages.filter((p) => minutes(p.fin) > minutes(p.debut)));
    for (let i = 1; i < t.length; i++) {
      if (minutes(t[i].debut) < minutes(t[i - 1].fin)) alertes.push(`${h.jour}${n} : les plages ${formaterPlage(t[i - 1])} et ${formaterPlage(t[i])} se chevauchent.`);
    }
  }
  return alertes;
}

/** Note courte des horaires : longueur et lexique de la profession (avertissements seulement). */
export function avertissementsNoteHoraires(note: string): string[] {
  const t = String(note ?? '').trim();
  if (!t) return [];
  const alertes = verifierTexte(t).map((a) => `Note des horaires : « ${a.extrait} » — ${a.raison}${a.suggestion ? ` (préférer « ${a.suggestion} »)` : ''}.`);
  if (t.length > NOTE_HORAIRES_MAX) alertes.push(`Note des horaires longue (${t.length} caractères) : ${NOTE_HORAIRES_MAX} au plus sont conseillés pour rester lisible.`);
  return alertes;
}

// ---- Accélérateurs de saisie ----

/** Copie les plages d'un jour vers d'autres jours. */
export function copierJour(horaires: readonly Horaire[], source: string, cibles: readonly string[]): Horaire[] {
  const plages = plagesDe(horaires.find((h) => h.jour === source) ?? { heures: '' });
  return horaires.map((h) => (cibles.includes(h.jour) && h.jour !== source ? horaireDe(h.jour, plages) : h));
}

/** Remplace les plages d'un jour. */
export const definirJour = (horaires: readonly Horaire[], jour: string, plages: readonly Plage[]) =>
  horaires.map((h) => (h.jour === jour ? horaireDe(jour, plages) : h));

const P = (debut: string, fin: string): Plage => ({ debut, fin });
export const MATIN: Plage = P('09:00', '12:00');
export const APRES_MIDI: Plage = P('14:00', '19:00');

/** Plage ajoutée par « + plage » : l'après-midi après une matinée, sinon une plage d'une heure après la dernière. */
export function plageSuivante(plages: readonly Plage[]): Plage {
  const derniere = trier(plages).at(-1);
  if (!derniere) return MATIN;
  const fin = minutes(derniere.fin);
  if (fin <= 13 * 60) return APRES_MIDI;
  const debut = Math.min(fin + 60, 21 * 60);
  return P(versHHMM(Math.floor(debut / 60), debut % 60), versHHMM(Math.min(Math.floor(debut / 60) + 2, 22), debut % 60));
}

/** « Journée continue » : du début de la première plage à la fin de la dernière (9h00–19h00 par défaut). */
export function journeeContinue(plages: readonly Plage[]): Plage[] {
  const t = trier(plages);
  return t.length ? [P(t[0].debut, t.at(-1)!.fin)] : [P('09:00', '19:00')];
}

export type ModeleHoraires = { id: string; libelle: string; appliquer: (h: readonly Horaire[]) => Horaire[] };

/** Modèles rapides : remplacent la semaine (sauf « samedi matin », qui n'ajoute que le samedi). */
export const MODELES_HORAIRES: ModeleHoraires[] = [
  {
    id: 'coupee',
    libelle: '9h–12h / 14h–19h du lundi au vendredi',
    appliquer: () => JOURS_SEMAINE.map((j) => horaireDe(j, (JOURS_OUVRES as readonly string[]).includes(j) ? [MATIN, APRES_MIDI] : [])),
  },
  {
    id: 'continue',
    libelle: 'Journée continue 9h–18h du lundi au vendredi',
    appliquer: () => JOURS_SEMAINE.map((j) => horaireDe(j, (JOURS_OUVRES as readonly string[]).includes(j) ? [P('09:00', '18:00')] : [])),
  },
  {
    id: 'samedi-matin',
    libelle: 'Ajouter le samedi matin (9h–12h)',
    appliquer: (h) => definirJour(h, 'Samedi', [MATIN]),
  },
];

/** Semaine complète vide (7 jours fermés). */
export const semaineFermee = (): Horaire[] => JOURS_SEMAINE.map((j) => horaireDe(j, []));
