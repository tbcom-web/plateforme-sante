import { clientAnonyme, hacherIp, ipDe, turnstileCaptureActif, verifierTurnstile } from '@/lib/capture';

// Demande d'audit complet depuis /audit-gratuit : coordonnées + accord de recontact, enregistrées par la fonction SQL
// demander_audit_gratuit (0062, clé publique seulement). Champ piège « site_web » (robots) ; Turnstile vérifié si configuré.
// La demande apparaît dans /admin/audits : la commerciale lance la préparation du site et l'audit, puis rappelle.
export const dynamic = 'force-dynamic';

const reponse = (ok: boolean, message: string, status = 200) => Response.json({ ok, message }, { status, headers: { 'cache-control': 'no-store' } });
const champ = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);

export async function POST(req: Request) {
  let c: Record<string, unknown>;
  try {
    const texte = await req.text();
    if (texte.length > 12000) return reponse(false, 'Demande invalide.', 413);
    c = JSON.parse(texte) as Record<string, unknown>;
  } catch { return reponse(false, 'Demande invalide.', 400); }

  // Champ piège rempli : on répond comme si tout allait bien, sans rien enregistrer
  if (champ(c.site_web, 200)) return reponse(true, 'Demande reçue.');
  const email = champ(c.email, 200).toLowerCase();
  const telephone = champ(c.telephone, 30);
  if (!champ(c.prenom, 80) || !champ(c.nom, 80)) return reponse(false, 'Indiquez votre prénom et votre nom.', 422);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return reponse(false, 'Adresse e-mail invalide.', 422);
  if (telephone.replace(/\D/g, '').length < 9) return reponse(false, 'Numéro de téléphone invalide.', 422);
  if (c.recontact !== true) return reponse(false, 'Cochez la case pour être recontacté(e) au sujet de votre audit.', 422);

  const ip = ipDe(req);
  if (turnstileCaptureActif() && !(await verifierTurnstile(champ(c.turnstile, 2048), ip))) return reponse(false, 'Vérification anti-robot échouée : rechargez la page.', 403);

  const { error } = await clientAnonyme().rpc('demander_audit_gratuit', {
    p_domaine: champ(c.domaine, 120).toLowerCase(), p_prenom: champ(c.prenom, 80), p_nom: champ(c.nom, 80), p_email: email,
    p_telephone: telephone, p_recontact: true, p_ip_hash: hacherIp(ip), p_express: typeof c.express === 'object' && c.express ? c.express : null,
  });
  if (error?.code === '54000') return reponse(false, 'Plusieurs demandes ont déjà été envoyées : nous revenons vers vous très vite.', 429);
  if (error?.code === '22023') return reponse(false, error.message, 422);
  if (error) { console.error('demander_audit_gratuit', error.code, error.message); return reponse(false, 'Envoi impossible pour le moment. Écrivez-nous à contact@webpodologue.fr.', 500); }
  return reponse(true, 'Demande reçue.');
}
