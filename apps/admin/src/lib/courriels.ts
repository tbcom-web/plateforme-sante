import 'server-only';

// Envoi d'e-mails (relances de l'essai, conseils aux praticiens ayant accepté) : abstraction prête mais DÉSACTIVÉE.
// Aucun fournisseur n'est configuré et rien n'est jamais envoyé depuis ce code : la commerciale copie le message proposé
// (/admin/leads) dans sa propre messagerie. Pour l'activer plus tard (docs/onboarding-lead.md, « Envoi d'e-mails ») :
//   1. choisir un fournisseur (Brevo, hébergé en France, ou Resend), vérifier le domaine d'envoi (SPF, DKIM, DMARC) ;
//   2. implémenter `fournisseur()` ci-dessous avec sa clé d'API (variable serveur, jamais dans le code) ;
//   3. ne déclencher que des envois prévus par le moteur de relances (packages/core/src/essai.ts), conseils seulement
//      avec l'accord du praticien (essais.conseils_opt_in), lien de désinscription dans chaque message.

export type Courriel = { a: string; objet: string; texte: string; categorie: 'relance' | 'conseils' | 'service' };
export type ResultatEnvoi = { envoye: false; raison: string } | { envoye: true; id: string };

type Fournisseur = { nom: string; envoyer: (c: Courriel) => Promise<ResultatEnvoi> };

/** Fournisseur configuré : aucun pour l'instant (envoi désactivé). */
function fournisseur(): Fournisseur | null {
  return null;
}

export const envoiActive = () => fournisseur() !== null;

/** Ne fait rien tant qu'aucun fournisseur n'est branché : renvoie la raison, sans lever d'erreur. */
export async function envoyerCourriel(c: Courriel): Promise<ResultatEnvoi> {
  const f = fournisseur();
  if (!f) return { envoye: false, raison: 'Envoi d’e-mails désactivé : aucun fournisseur configuré.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.a)) return { envoye: false, raison: 'Adresse invalide.' };
  return f.envoyer(c);
}
