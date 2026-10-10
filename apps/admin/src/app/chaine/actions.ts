'use server';

import { revalidatePath, updateTag } from 'next/cache';
import { TAGS_DONNEES } from '@/lib/cache-donnees';
import {
  cleComposition, choixDePreselection, designDe, estAppareilModele, estEtiquetteTicket, estPageModele, estRoleEquipe, groupeTournoi, nomRecette, nouvelleVersion, peut, peutPublier,
  prochainEcran, profilDemo, profilsCompatibles, profilsDePratique, serialiserComposition, serialiserRecetteAvecScenario, statutModele, tagsAutomatiques, tournoiDuProfil, validerChoixGrille, type TagsModele,
} from '@plateforme/core';
import { exigerContributeur, exigerValidateur, LECTURE_CHAINE, lireChaine, MIGRATION_CHAINE, oublierAutomate, signauxCandidats } from '@/lib/chaine-modeles';
import { getRecettes } from '@/lib/recettes';
import { createClient } from '@/lib/supabase/server';
import { compositionDe, verrousDeLaFiche } from './validation';
import { profilsChaine } from './donnees';

// Gestes humains de la chaîne (le reste tourne tout seul : lib/chaine-modeles.ts faireTournerChaine). Chaque action revérifie le
// rôle côté serveur ; la base le revérifie aussi (RLS et déclencheurs de 0050). Contributeur : présélection, votes, avis, tickets,
// relances, revalidation. Validateur : en plus tags vérifiés, publication, rôles.

export type Retour = { ok: boolean; message: string };
const UUID = /^[0-9a-f-]{36}$/;
const echec = (e: { code?: string } | null): Retour => ({ ok: false, message: e?.code === '42P01' || e?.code === 'PGRST205' ? MIGRATION_CHAINE : 'Enregistrement impossible pour le moment.' });
const rafraichir = (...chemins: string[]) => { oublierAutomate(); for (const c of ['/chaine', ...chemins]) revalidatePath(c); };

// ---------------------------------------------------------------------------------------------------------------
// 1. Présélection
// ---------------------------------------------------------------------------------------------------------------

export type PropositionPreselection = { cle: string; nom: string; design: Record<string, unknown>; ingredients: Record<string, unknown>; profilDemo: string };

/** Profils compatibles d'un design (harmonie, chaine-design.ts), calculés côté serveur à partir des profils de la profession */
function compatibles(design: Record<string, unknown>, profils: { id: string; sujets: string[]; scenario: { principaux: string[]; secondaires: string[]; couleurs: string[] } }[]): string[] {
  const p0 = profils[0];
  if (!p0) return [];
  const x = compositionDe({ scenario: p0.scenario }, design);
  return x ? profilsCompatibles(x, profils).map((p) => p.id) : profils.map((p) => p.id);
}

/**
 * Designs touchés d'une page de 6 → candidats (fiche SANS profil + version 1 = design sans images) ; points versés au journal de la
 * Dégustation ; un « J'aime » par votant et par design (signal a priori du tournoi). Profils compatibles pré-calculés dans les tags.
 */
export async function garderPreselection(p: { propositions: PropositionPreselection[]; selection: number[]; appareil: 'ordinateur' | 'mobile'; dureeMs?: number }): Promise<Retour & { ajoutes?: number }> {
  const moi = await exigerContributeur();
  if (!peut(moi.role, 'preselectionner')) return { ok: false, message: 'Action réservée à l’équipe.' };
  const { profession, profils } = await profilsChaine();
  if (!Array.isArray(p.propositions) || p.propositions.length > 6) return { ok: false, message: 'Page invalide.' };
  const demo = profils.find((x) => x.id === p.propositions[0]?.profilDemo) ?? profils[0];
  if (!demo) return { ok: false, message: 'Aucun profil de démonstration.' };
  const supabase = await createClient();
  const choix = choixDePreselection({ propositions: p.propositions.map((x) => ({ cle: x.cle, ingredients: x.ingredients })), selection: p.selection, profil: demo.id, profession: profession.id, scenario: { sujets: demo.sujets }, appareil: p.appareil, dureeMs: p.dureeMs ?? null });
  if (choix) {
    const v = validerChoixGrille(choix);
    if (v.ok) {
      const c = v.choix;
      await supabase.from('degustation_choix').insert({ format: c.format, type: c.type, dimension: c.dimension, scenario: c.scenario, propositions: c.propositions, meilleures: c.meilleures, pire: null, pari: null, appareil: c.appareil, duree_ms: c.dureeMs, profession: c.profession, profil: c.profil, auteur: moi.id });
    }
  }
  let ajoutes = 0;
  for (const i of [...new Set(p.selection)]) {
    const x = p.propositions[i];
    if (!x || !x.design || typeof x.design !== 'object') continue;
    const design = designDe(x.design);
    const cle = cleComposition(design);
    const scenarioDemo = profils.find((q) => q.id === x.profilDemo)?.scenario ?? demo.scenario;
    const { data, error } = await supabase.from('modeles_fiches').insert({
      nom: String(x.nom || 'Design').slice(0, 120), profession: profession.id, profil: null, cle, origine: 'preselection',
      scenario: { principaux: scenarioDemo.principaux, secondaires: scenarioDemo.secondaires, couleurs: scenarioDemo.couleurs },
      tags: tagsAutomatiques(design, { profession: profession.id, profilsCibles: compatibles(design, profils) }),
    }).select('id').maybeSingle();
    let id = data?.id as string | undefined;
    if (error?.code === '23505') {
      // Déjà candidat : seulement un « J'aime » de plus
      const { data: d2 } = await supabase.from('modeles_fiches').select('id').eq('profession', profession.id).eq('cle', cle).is('profil', null).maybeSingle();
      id = d2?.id as string | undefined;
    } else if (error || !data) return { ...echec(error), ajoutes };
    else {
      await supabase.from('modeles_versions').insert({ modele: data.id, version: 1, composition: design, cle, journal: [{ type: 'creation', texte: `présélection par ${moi.email || 'l’équipe'} (vu avec « ${demo.nom} »)` }], auteur: moi.id });
      ajoutes++;
    }
    if (id) await supabase.from('modeles_jaime').insert({ modele: id, votant: moi.id });
  }
  rafraichir('/chaine/preselection');
  return { ok: true, message: ajoutes ? `${ajoutes} candidat${ajoutes > 1 ? 's' : ''} ajouté${ajoutes > 1 ? 's' : ''}.` : 'J’aime enregistré (déjà candidats).', ajoutes };
}

/** Recettes existantes (actives) importées comme candidats : leur design (images retirées) */
export async function importerRecettes(): Promise<Retour> {
  const moi = await exigerContributeur();
  const { profession, profils } = await profilsChaine();
  const { recettes } = await getRecettes();
  const supabase = await createClient();
  let n = 0;
  for (const r of recettes.filter((x) => x.statut === 'active').slice(0, 60)) {
    const design = designDe(JSON.parse(serialiserComposition(r.composition)));
    const cle = cleComposition(design);
    const demo = profils.find((p) => p.sujets[0] === r.sujets[0]) ?? profils[0];
    const { data, error } = await supabase.from('modeles_fiches').insert({
      nom: r.nom.slice(0, 120), profession: profession.id, profil: null, cle, origine: 'recette', recette: r.id,
      scenario: demo ? { principaux: demo.scenario.principaux, secondaires: demo.scenario.secondaires, couleurs: demo.scenario.couleurs } : {},
      tags: tagsAutomatiques(design, { profession: profession.id, profilsCibles: compatibles(design, profils) }),
    }).select('id').maybeSingle();
    if (error || !data) continue;
    await supabase.from('modeles_versions').insert({ modele: data.id, version: 1, composition: design, cle, journal: [{ type: 'creation', texte: `importée de la recette « ${r.nom} »` }], auteur: moi.id });
    n++;
  }
  rafraichir('/chaine/preselection');
  return { ok: true, message: n ? `${n} recette${n > 1 ? 's' : ''} importée${n > 1 ? 's' : ''} comme candidats.` : 'Aucune nouvelle recette à importer.' };
}

// ---------------------------------------------------------------------------------------------------------------
// 2. Tournoi en grilles (tournoi-grilles.ts, migration 0052)
// ---------------------------------------------------------------------------------------------------------------

export type Ecran = { kind: 'grille'; id: string; propositions: string[]; profilDemo: string; texte: string; certitude: number } | { kind: 'duel'; a: string; b: string; profilDemo: string; texte: string; certitude: number } | { kind: 'fini'; texte: string; certitude: number };

/**
 * Prochain écran du votant pour un groupe (profession, ou profession + profil des anciens modèles) : grille de 6 autour de la frontière
 * du top 10 (réservée à ce votant 15 minutes : ses candidats ne sont pas servis à un autre votant), ou duel de départage. Même profil
 * de démonstration pour les 6 (contenu égal). Une grille déjà servie et pas répondue est resservie au même votant.
 */
export async function servirEcran(profil: string | null): Promise<Ecran> {
  const moi = await exigerContributeur();
  const { profession, profils } = await profilsChaine();
  const chaine = await lireChaine(profession.id);
  if (chaine.erreurLecture) return { kind: 'fini', texte: LECTURE_CHAINE, certitude: 0 };
  const groupe = `${profession.id}|${profil ?? '*'}`;
  const cand = chaine.fiches.filter((f) => f.statut === 'candidat' && groupeTournoi(f) === groupe).map((f) => f.id);
  const signaux = await signauxCandidats(chaine);
  const t = tournoiDuProfil({ ...chaine, signaux }, cand);
  const base = { texte: t.texte, certitude: t.certitude };
  const demoDe = (seed: string) => { const l = profils.filter((p) => !profil || p.id === profil); return profilDemo(l, [...seed].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7))?.id ?? profils[0]?.id ?? ''; };
  const mienne = chaine.grillesEnCours.find((g) => g.votant === moi.id && g.propositions.every((x) => cand.includes(x)));
  if (mienne) return { kind: 'grille', id: mienne.id, propositions: mienne.propositions, profilDemo: demoDe(mienne.id), ...base };
  const reserves = new Set(chaine.grillesEnCours.filter((g) => g.votant !== moi.id).flatMap((g) => g.propositions));
  const e = prochainEcran(t, { reserves, graine: chaine.grilles?.length ?? 0 });
  if (!e) return { kind: 'fini', ...base };
  if (e.kind === 'duel') return { kind: 'duel', a: e.a, b: e.b, profilDemo: demoDe(`${e.a}${e.b}`), ...base };
  const supabase = await createClient();
  const demo = demoDe(e.propositions.join(''));
  const { data, error } = await supabase.from('modeles_grilles').insert({ profession: profession.id, profil, profil_demo: demo || null, propositions: e.propositions, votant: moi.id }).select('id').maybeSingle();
  if (error || !data) return { kind: 'fini', texte: `${MIGRATION_GRILLES}${error?.message ? ` (détail : ${error.message})` : ''}`, certitude: t.certitude };
  return { kind: 'grille', id: data.id as string, propositions: e.propositions, profilDemo: demo, ...base };
}

const MIGRATION_GRILLES = 'Migration 0052 à exécuter (supabase/migrations/0052_tournoi_grilles.sql) : le tournoi en grilles ne peut pas encore être enregistré.';

/** Réponse à une grille : 1 ou 2 préférées (dans l'ordre touché), « celle qui ne va pas » facultative */
export async function repondreGrille(id: string, meilleures: number[], pire: number | null, appareil: 'ordinateur' | 'mobile'): Promise<Retour> {
  await exigerContributeur();
  if (!UUID.test(id)) return { ok: false, message: 'Grille inconnue.' };
  const m = [...new Set(meilleures)].filter((i) => Number.isInteger(i) && i >= 0 && i < 6).slice(0, 2);
  if (!m.length) return { ok: false, message: 'Choisissez une ou deux préférées.' };
  const pi = pire !== null && Number.isInteger(pire) && pire >= 0 && pire < 6 && !m.includes(pire) ? pire : null;
  const supabase = await createClient();
  const { data, error } = await supabase.from('modeles_grilles').update({ meilleures: m, pire: pi, appareil: estAppareilModele(appareil) ? appareil : null }).eq('id', id).select('id');
  if (error) return { ok: false, message: error.message?.includes('déjà') ? 'Grille déjà répondue.' : `${MIGRATION_GRILLES} (détail : ${error.message})` };
  if (!data?.length) return { ok: false, message: 'Grille introuvable ou déjà répondue.' };
  oublierAutomate(); // fin du tournoi possible : finalistes au prochain chargement (sans attendre 30 s)
  return { ok: true, message: 'Choix enregistré.' };
}

/** Duel de départage (rangs 9-12) : table modeles_votes */
export async function voter(p: { profil: string | null; a: string; b: string; resultat: 'a' | 'b' | 'egalite'; appareil: 'ordinateur' | 'mobile' }): Promise<Retour> {
  const moi = await exigerContributeur();
  if (!UUID.test(p.a) || !UUID.test(p.b) || p.a === p.b || !['a', 'b', 'egalite'].includes(p.resultat)) return { ok: false, message: 'Vote invalide.' };
  const { profession } = await profilsChaine();
  const supabase = await createClient();
  const { error } = await supabase.from('modeles_votes').insert({ profession: profession.id, profil: p.profil, a: p.a, b: p.b, resultat: p.resultat, appareil: estAppareilModele(p.appareil) ? p.appareil : null, votant: moi.id });
  if (error) return echec(error);
  oublierAutomate();
  return { ok: true, message: 'Vote enregistré.' };
}

// ---------------------------------------------------------------------------------------------------------------
// 4. et 7. Avis humain, tickets, relances, revalidation
// ---------------------------------------------------------------------------------------------------------------

async function numeroLibre(supabase: Awaited<ReturnType<typeof createClient>>, modele: string): Promise<number> {
  const { data } = await supabase.from('modeles_tickets').select('numero').eq('modele', modele).order('numero', { ascending: false }).limit(1);
  return ((data?.[0] as { numero?: number } | undefined)?.numero ?? 0) + 1;
}

export type TicketSaisi = { page: string; appareil: string; zone?: { forme: 'rect' | 'ellipse'; x: number; y: number; l: number; h: number } | null; element?: string | null; etiquette: string; commentaire: string };

/** Tickets de goût (zones entourées ou éléments cliqués) sur la version courante */
export async function creerTickets(modele: string, tickets: TicketSaisi[]): Promise<Retour> {
  await exigerContributeur();
  if (!UUID.test(modele) || !Array.isArray(tickets) || !tickets.length || tickets.length > 24) return { ok: false, message: 'Tickets invalides.' };
  const supabase = await createClient();
  const { data: f } = await supabase.from('modeles_fiches').select('version_courante').eq('id', modele).maybeSingle();
  if (!f) return { ok: false, message: 'Modèle introuvable.' };
  let n = await numeroLibre(supabase, modele);
  for (const t of tickets) {
    if (!estPageModele(t.page) || !estAppareilModele(t.appareil) || !estEtiquetteTicket(t.etiquette) || String(t.etiquette).startsWith('technique:')) return { ok: false, message: 'Ticket invalide.' };
    const borne = (x: number) => Math.min(1, Math.max(0, Number(x) || 0));
    const ligne = {
      modele, page: t.page, appareil: t.appareil, zone: t.zone ? { forme: t.zone.forme === 'ellipse' ? 'ellipse' : 'rect', x: borne(t.zone.x), y: borne(t.zone.y), l: borne(t.zone.l), h: borne(t.zone.h) } : null,
      element: t.element ? String(t.element).slice(0, 200) : null, etiquette: t.etiquette, commentaire: String(t.commentaire ?? '').slice(0, 500), origine: 'humain', statut: 'ouvert', version_ouverture: f.version_courante,
    };
    let { error } = await supabase.from('modeles_tickets').insert({ ...ligne, numero: n });
    if (error?.code === '23505') { n = await numeroLibre(supabase, modele); ({ error } = await supabase.from('modeles_tickets').insert({ ...ligne, numero: n })); }
    if (error) return echec(error);
    n++;
  }
  rafraichir(`/chaine/revision/${modele}`, `/chaine/modele/${modele}`);
  return { ok: true, message: `${tickets.length} ticket${tickets.length > 1 ? 's' : ''} créé${tickets.length > 1 ? 's' : ''}.` };
}

/** « Rien à signaler sur cette page » (page × appareil, version courante) */
export async function rienASignaler(modele: string, page: string, appareil: string): Promise<Retour> {
  const moi = await exigerContributeur();
  if (!UUID.test(modele) || !estPageModele(page) || !estAppareilModele(appareil)) return { ok: false, message: 'Page invalide.' };
  const supabase = await createClient();
  const { data: f } = await supabase.from('modeles_fiches').select('version_courante').eq('id', modele).maybeSingle();
  if (!f) return { ok: false, message: 'Modèle introuvable.' };
  const { error } = await supabase.from('modeles_revues').insert({ modele, version: f.version_courante, page, appareil, verdict: 'rien', auteur: moi.id });
  if (error) return echec(error);
  rafraichir(`/chaine/revision/${modele}`);
  return { ok: true, message: 'Noté : rien à signaler.' };
}

/** Revalidation en 1 clic de ce qui a changé ; `rouvrir` : tickets corrigés qui ne le sont pas vraiment */
export async function revalider(modele: string, rouvrir: number[] = []): Promise<Retour> {
  const moi = await exigerContributeur();
  if (!peut(moi.role, 'revalider') || !UUID.test(modele)) return { ok: false, message: 'Action impossible.' };
  const supabase = await createClient();
  const { data: f } = await supabase.from('modeles_fiches').select('version_courante').eq('id', modele).maybeSingle();
  if (!f) return { ok: false, message: 'Modèle introuvable.' };
  const ok = rouvrir.filter((n) => Number.isInteger(n) && n > 0);
  if (ok.length) await supabase.from('modeles_tickets').update({ statut: 'ouvert', version_correction: null }).eq('modele', modele).eq('statut', 'corrige').in('numero', ok);
  // Tickets HUMAINS corrigés seulement : un ticket technique est refermé par le re-check du testeur (règle de 0050)
  let q = supabase.from('modeles_tickets').update({ statut: 'ferme' }).eq('modele', modele).eq('statut', 'corrige').eq('origine', 'humain');
  if (ok.length) q = q.not('numero', 'in', `(${ok.join(',')})`);
  await q;
  const { error } = await supabase.from('modeles_revues').insert({ modele, version: f.version_courante, page: null, appareil: null, verdict: 'revalide', auteur: moi.id });
  if (error) return echec(error);
  rafraichir(`/chaine/revision/${modele}`, `/chaine/modele/${modele}`);
  return { ok: true, message: ok.length ? `${ok.length} ticket(s) rouvert(s) ; le reste est revalidé.` : 'Revalidé.' };
}

/** 🎲 Relance gardée : nouvelle version (verrous respectés côté navigateur, composition revérifiée ici) */
export async function garderRelance(modele: string, composition: Record<string, unknown>, quoi: string): Promise<Retour> {
  const moi = await exigerContributeur();
  if (!peut(moi.role, 'relancer') || !UUID.test(modele)) return { ok: false, message: 'Action impossible.' };
  const chaine = await lireChaine(null);
  if (chaine.erreurLecture) return { ok: false, message: LECTURE_CHAINE };
  const f = chaine.fiches.find((x) => x.id === modele);
  if (!f) return { ok: false, message: 'Modèle introuvable.' };
  const x = compositionDe(f, composition);
  if (!x) return { ok: false, message: 'Composition invalide.' };
  // Design (profil nul) : on garde le design, sans les images du profil de démonstration
  const propre = (f.profil === null ? designDe(JSON.parse(serialiserComposition(x))) : JSON.parse(serialiserComposition(x))) as Record<string, unknown>;
  const nv = nouvelleVersion({ fiche: f, composition: propre, cle: cleComposition(propre), tickets: chaine.tickets.filter((t) => t.modele === modele), corrections: [], auteur: moi.id, type: 'relance', note: `relance 🎲 (${String(quoi).slice(0, 120)}) par ${moi.email || 'l’équipe'}` });
  const supabase = await createClient();
  const { error } = await supabase.from('modeles_versions').insert({ modele, version: nv.version.version, composition: propre, cle: nv.version.cle, journal: nv.version.journal, auteur: moi.id });
  if (error) return echec(error);
  await supabase.from('modeles_fiches').update({ version_courante: nv.version.version }).eq('id', modele);
  rafraichir(`/chaine/revision/${modele}`, `/chaine/modele/${modele}`);
  return { ok: true, message: `Version ${nv.version.version} gardée : le testeur repasse.` };
}

// ---------------------------------------------------------------------------------------------------------------
// 8. Validation finale (Paul)
// ---------------------------------------------------------------------------------------------------------------

export async function verifierTags(modele: string, tags: TagsModele): Promise<Retour> {
  await exigerValidateur();
  if (!UUID.test(modele)) return { ok: false, message: 'Modèle inconnu.' };
  const propre = (l: unknown) => (Array.isArray(l) ? [...new Set(l.filter((x): x is string => typeof x === 'string' && /^[a-z0-9:~.+_-]{2,80}$/.test(x)))].slice(0, 12) : []);
  const t = { profession: /^[a-z0-9-]{2,40}$/.test(tags?.profession ?? '') ? tags.profession : '', profils: propre(tags?.profils), couleurs: propre(tags?.couleurs) };
  if (!t.profession || !t.profils.length || !t.couleurs.length) return { ok: false, message: 'Profession, au moins un profil et une couleur.' };
  const supabase = await createClient();
  const { error } = await supabase.from('modeles_fiches').update({ tags: t, tags_valides: true }).eq('id', modele);
  if (error) return echec(error);
  rafraichir(`/chaine/modele/${modele}`);
  return { ok: true, message: 'Tags vérifiés.' };
}

/** Test orange : justification écrite de Paul pour la version courante (≥ 15 caractères, regleValidationModele) */
export async function justifierTest(modele: string, texte: string): Promise<Retour> {
  await exigerValidateur();
  if (!UUID.test(modele)) return { ok: false, message: 'Modèle inconnu.' };
  const j = String(texte ?? '').trim().slice(0, 1000);
  if (j.length < 15) return { ok: false, message: 'Justification trop courte (15 caractères au moins).' };
  const chaine = await lireChaine(null);
  if (chaine.erreurLecture) return { ok: false, message: LECTURE_CHAINE };
  const f = chaine.fiches.find((x) => x.id === modele);
  if (!f) return { ok: false, message: 'Modèle introuvable.' };
  const supabase = await createClient();
  const { error } = await supabase.from('modeles_fiches').update({ justification_test: j, justification_version: f.versionCourante }).eq('id', modele);
  if (error) return echec(error);
  rafraichir(`/chaine/modele/${modele}`);
  return { ok: true, message: `Justification enregistrée pour la v${f.versionCourante}.` };
}

/** « Publier pour les praticiens » : verrous recalculés ici, recette créée ou mise à jour, publication par profil (0043) */
export async function publierModele(modele: string): Promise<Retour> {
  await exigerValidateur();
  if (!UUID.test(modele)) return { ok: false, message: 'Modèle inconnu.' };
  const chaine = await lireChaine(null);
  if (chaine.erreurLecture) return { ok: false, message: LECTURE_CHAINE };
  const f = chaine.fiches.find((x) => x.id === modele);
  if (!f) return { ok: false, message: 'Modèle introuvable.' };
  if (f.statut !== 'pret-validation') return { ok: false, message: `Étape actuelle : ${statutModele(f.statut).libelle}. La publication vient après la revalidation.` };
  const { verrous } = await verrousDeLaFiche(f, chaine);
  if (!peutPublier(verrous)) return { ok: false, message: `Verrous au rouge : ${verrous.filter((v) => !v.ok).map((v) => v.libelle).join(', ')}.` };
  const v = chaine.versions.find((x) => x.modele === f.id && x.version === f.versionCourante)!;
  const x = compositionDe(f, v.composition)!;
  const sujets = [...f.scenario.principaux, ...f.scenario.secondaires];
  const scenario = { principaux: f.scenario.principaux, secondaires: f.scenario.secondaires, couleurs: f.scenario.couleurs, soins: [] };
  const supabase = await createClient();
  let recette = f.recette;
  const ligne = { nom: f.nom || nomRecette(x, sujets), sujets: sujets.slice(0, 6), couleurs_preferees: f.scenario.couleurs.slice(0, 3), composition: serialiserRecetteAvecScenario(x, scenario), statut: 'active' };
  if (recette) {
    const { error } = await supabase.from('recettes').update(ligne).eq('id', recette);
    if (error) return echec(error);
  } else {
    const { data, error } = await supabase.from('recettes').insert({ ...ligne, note: 5, etiquettes: ['gardee'] }).select('id').maybeSingle();
    if (error || !data) return echec(error);
    recette = data.id as string;
  }
  const connus = new Set((() => { try { return profilsDePratique(f.profession).map((p) => p.id); } catch { return []; } })());
  const profils = f.tags.profils.filter((p) => !connus.size || connus.has(p));
  const { error: e2 } = await supabase.from('recettes_publications').upsert({ recette, profession: f.profession, profils: profils.length ? profils : f.profil ? [f.profil] : [], publiee: true }, { onConflict: 'recette' });
  if (e2) return { ok: false, message: 'Publication impossible (migration 0043 exécutée ?).' };
  const { error: e3 } = await supabase.from('modeles_fiches').update({ statut: 'publie', version_publiee: f.versionCourante, recette }).eq('id', f.id);
  if (e3) return echec(e3);
  rafraichir(`/chaine/modele/${modele}`, '/admin/profils');
  return { ok: true, message: `Publié pour les praticiens (v${f.versionCourante}).` };
}

/** Repêcher un modèle écarté (validateur) */
export async function repecher(modele: string): Promise<Retour> {
  await exigerValidateur();
  const supabase = await createClient();
  const { error } = await supabase.from('modeles_fiches').update({ statut: 'candidat', rang: null }).eq('id', modele).eq('statut', 'ecarte');
  if (error) return echec(error);
  rafraichir(`/chaine/modele/${modele}`);
  return { ok: true, message: 'Remis dans les candidats.' };
}

// ---------------------------------------------------------------------------------------------------------------
// Rôles (validateur ; la base n'autorise que le super admin à modifier un profil)
// ---------------------------------------------------------------------------------------------------------------

export async function definirRole(compte: string, role: string | null): Promise<Retour> {
  const moi = await exigerValidateur();
  if (!UUID.test(compte)) return { ok: false, message: 'Compte inconnu.' };
  if (compte === moi.id) return { ok: false, message: 'Votre propre rôle ne se change pas ici.' };
  if (role !== null && !estRoleEquipe(role)) return { ok: false, message: 'Rôle inconnu.' };
  const supabase = await createClient();
  const { data, error } = await supabase.from('profiles').update({ role_equipe: role }).eq('id', compte).select('id');
  if (error) return echec(error);
  if (!data?.length) return { ok: false, message: 'Aucun compte modifié (droits du super admin requis).' };
  rafraichir('/chaine/equipe');
  updateTag(TAGS_DONNEES.equipe);
  return { ok: true, message: role ? 'Rôle attribué.' : 'Rôle retiré.' };
}
