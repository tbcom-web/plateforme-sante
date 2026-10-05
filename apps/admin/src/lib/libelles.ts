// Libellés affichés pour les valeurs techniques (statut du site, état de publication).
import { DUREE_MAX_PUBLICATION_MS } from '@plateforme/core';

export type Statut = 'brouillon' | 'en_ligne' | 'suspendu';

export const STATUTS: Record<Statut, { label: string; classe: string }> = {
  brouillon: { label: 'Pas encore en ligne', classe: 'bg-amber-100 text-amber-900' },
  en_ligne: { label: 'En ligne', classe: 'bg-teal-100 text-teal-900' },
  suspendu: { label: 'Suspendu', classe: 'bg-neutral-200 text-neutral-700' },
};

export type Etat = 'en_cours' | 'ok' | 'echec';

/** Au-delà, une publication « en cours » est considérée comme interrompue (le workflow dure environ une minute ; marge
 * pour la file d'attente GitHub). Même valeur que le suivi détaillé (@plateforme/core, suivi-publication.ts). */
const DUREE_MAX_MS = DUREE_MAX_PUBLICATION_MS;

/** État affiché d'une publication, en tenant compte d'une publication restée « en cours » trop longtemps. */
export function etatPublication(etat: Etat | null, debut: string | null, maintenant = Date.now()): { cle: Etat | 'interrompue'; label: string; classe: string } | null {
  if (!etat) return null;
  if (etat === 'en_cours' && debut && maintenant - Date.parse(debut) > DUREE_MAX_MS) {
    return { cle: 'interrompue', label: 'Publication sans réponse', classe: 'bg-red-100 text-red-900' };
  }
  return {
    en_cours: { cle: 'en_cours' as const, label: 'Publication en cours', classe: 'bg-sky-100 text-sky-900' },
    ok: { cle: 'ok' as const, label: 'Publication réussie', classe: 'bg-teal-50 text-teal-800' },
    echec: { cle: 'echec' as const, label: 'Publication échouée', classe: 'bg-red-100 text-red-900' },
  }[etat];
}

export const dateCourte = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' }) : '—';
