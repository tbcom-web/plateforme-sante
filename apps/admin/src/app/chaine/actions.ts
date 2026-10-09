'use server';

import { revalidatePath } from 'next/cache';
import {
  cleComposition, choixDePreselection, estAppareilModele, estEtiquetteTicket, estPageModele, estRoleEquipe, nomRecette, nouvelleVersion, peut, peutPublier, profilsDePratique,
  serialiserComposition, serialiserRecetteAvecScenario, statutModele, tagsAutomatiques, profilsCiblesParDefaut, validerChoixGrille, type TagsModele,
} from '@plateforme/core';
import { exigerContributeur, exigerValidateur, lireChaine, MIGRATION_CHAINE } from '@/lib/chaine-modeles';
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
const rafraichir = (...chemins: string[]) => { for (const c of ['/chaine', ...chemins]) revalidatePath(c); };

// ---------------------------------------------------------------------------------------------------------------
// 1. Présélection
// ---------------------------------------------------------------------------------------------------------------

export type PropositionPreselection = { cle: string; nom: string; composition: Record<string, unknown>; ingredients: Record<string, unknown> };

/** Sites touchés d'une page de 6 → candidats (fiche + version 1) ; points versés au journal de la Dégustation */
export async function garderPreselection(p: { profil: string; propositions: PropositionPreselection[]; selection: number[]; appareil: 'ordinateur' | 'mobile'; dureeMs?: number }): Promise<Retour & { ajoutes?: number }> {
  const moi = await exigerContributeur();
  if (!peut(moi.role, 'preselectionner')) return { ok: false, message: 'Action réservée à l’équipe.' };
  const { profession, profils } = await profilsChaine();
  const profil = profils.find((x) => x.id === p.profil);
  if (!profil) return { ok: false, message: 'Profil inconnu.' };
  if (!Array.isArray(p.propositions) || p.propositions.length > 6) return { ok: false, message: 'Page invalide.' };
  const supabase = await createClient();
  // Points (même moteur que la Dégustation) : 1 ou 2 « meilleures » d'après l'ordre des touches
  const choix = choixDePreselection({ propositions: p.propositions, selection: p.selection, profil: profil.id, profession: profession.id, scenario: { sujets: profil.sujets }, appareil: p.appareil, dureeMs: p.dureeMs ?? null });
  if (choix) {
    const v = validerChoixGrille(choix);
    if (v.ok) {
      const c = v.choix;
      await supabase.from('degustation_choix').insert({ format: c.format, type: c.type, dimension: c.dimension, scenario: c.scenario, propositions: c.propositions, meilleures: c.meilleures, pire: null, pari: null, appareil: c.appareil, duree_ms: c.dureeMs, profession: c.profession, profil: c.profil, auteur: moi.id });
    }
  }
  let ajoutes = 0;
  const pratiques = (() => { try { return profilsDePratique(profession.id); } catch { return []; } })();
  for (const i of [...new Set(p.selection)]) {
    const x = p.propositions[i];
    if (!x || !x.composition || typeof x.composition !== 'object') continue;
    const cle = cleComposition(x.composition);
    const cibles = pratiques.length ? profilsCiblesParDefaut(profil.scenario, profession.id) : [];
    const { data, error } = await supabase.from('modeles_fiches').insert({
      nom: String(x.nom || 'Modèle').slice(0, 120), profession: profession.id, profil: profil.id, cle, origine: 'preselection',
      scenario: { principaux: profil.scenario.principaux, secondaires: profil.scenario.secondaires, couleurs: profil.scenario.couleurs },
      tags: tagsAutomatiques(x.composition, { profession: profession.id, profil: profil.id, profilsCibles: cibles }),
    }).select('id').maybeSingle();
    if (error?.code === '23505') continue; // déjà candidat
    if (error || !data) return { ...echec(error), ajoutes };
    await supabase.from('modeles_versions').insert({ modele: data.id, version: 1, composition: x.composition, cle, journal: [{ type: 'creation', texte: `présélection par ${moi.email || 'l’équipe'}` }], auteur: moi.id });
    ajoutes++;
  }
  rafraichir('/chaine/preselection');
  return { ok: true, message: ajoutes ? `${ajoutes} candidat${ajoutes > 1 ? 's' : ''} ajouté${ajoutes > 1 ? 's' : ''}.` : 'Rien de gardé sur cette page.', ajoutes };
}

/** Recettes existantes (actives, du profil) importées comme candidats */
export async function importerRecettes(profilId: string): Promise<Retour> {
  const moi = await exigerContributeur();
  const { profession, profils } = await profilsChaine();
  const profil = profils.find((x) => x.id === profilId);
  if (!profil) return { ok: false, message: 'Profil inconnu.' };
  const { recettes } = await getRecettes();
  const du = recettes.filter((r) => r.statut === 'active' && r.sujets[0] === profil.sujets[0]).slice(0, 50);
  const supabase = await createClient();
  let n = 0;
  for (const r of du) {
    const composition = JSON.parse(serialiserComposition(r.composition)) as Record<string, unknown>;
    const cle = cleComposition(composition);
    const { data, error } = await supabase.from('modeles_fiches').insert({
      nom: r.nom.slice(0, 120), profession: profession.id, profil: profil.id, cle, origine: 'recette', recette: r.id,
      scenario: { principaux: profil.scenario.principaux, secondaires: profil.scenario.secondaires, couleurs: profil.scenario.couleurs },
      tags: tagsAutomatiques(composition, { profession: profession.id, profil: profil.id }),
    }).select('id').maybeSingle();
    if (error || !data) continue;
    await supabase.from('modeles_versions').insert({ modele: data.id, version: 1, composition, cle, journal: [{ type: 'creation', texte: `importée de la recette « ${r.nom} »` }], auteur: moi.id });
    n++;
  }
  rafraichir('/chaine/preselection');
  return { ok: true, message: n ? `${n} recette${n > 1 ? 's' : ''} importée${n > 1 ? 's' : ''} comme candidats.` : 'Aucune nouvelle recette à importer pour ce profil.' };
}

// ---------------------------------------------------------------------------------------------------------------
// 2. Tournoi
// ---------------------------------------------------------------------------------------------------------------

export async function voter(p: { profil: string; a: string; b: string; resultat: 'a' | 'b' | 'egalite'; appareil: 'ordinateur' | 'mobile' }): Promise<Retour> {
  const moi = await exigerContributeur();
  if (!UUID.test(p.a) || !UUID.test(p.b) || p.a === p.b || !['a', 'b', 'egalite'].includes(p.resultat)) return { ok: false, message: 'Vote invalide.' };
  const { profession } = await profilsChaine();
  const supabase = await createClient();
  const { error } = await supabase.from('modeles_votes').insert({ profession: profession.id, profil: p.profil, a: p.a, b: p.b, resultat: p.resultat, appareil: estAppareilModele(p.appareil) ? p.appareil : null, votant: moi.id });
  if (error) return echec(error);
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
  const f = chaine.fiches.find((x) => x.id === modele);
  if (!f) return { ok: false, message: 'Modèle introuvable.' };
  const x = compositionDe(f, composition);
  if (!x) return { ok: false, message: 'Composition invalide.' };
  const propre = JSON.parse(serialiserComposition(x)) as Record<string, unknown>;
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
  const { error: e2 } = await supabase.from('recettes_publications').upsert({ recette, profession: f.profession, profils: profils.length ? profils : [f.profil], publiee: true }, { onConflict: 'recette' });
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
  return { ok: true, message: role ? 'Rôle attribué.' : 'Rôle retiré.' };
}
