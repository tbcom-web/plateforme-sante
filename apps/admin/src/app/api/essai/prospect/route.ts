import { utmDepuis, validerCapture, type SaisieCapture } from '@plateforme/core';
import { clientAnonyme, hacherIp, ipDe, turnstileCaptureActif, verifierTurnstile } from '@/lib/capture';

// Étape 1 de l'essai (« Créer mon site gratuit ») : enregistre le prospect AVANT la création du compte, pour que la
// commerciale puisse rappeler ceux qui s'arrêtent. Étape 2 : note « création du compte commencée » (prospect existant).
// Turnstile vérifié ici si configuré ; IP hachée pour la limitation de débit ; fonction SQL capturer_prospect (0024),
// clé publique seulement. Si la base n'a pas encore la mise à jour 0024, le parcours continue sans enregistrement.
export const dynamic = 'force-dynamic';

type Corps = Record<string, unknown> & { etape?: unknown; utm?: unknown; source?: unknown; turnstile?: unknown };

const reponse = (ok: boolean, message: string, status = 200, extra: Record<string, unknown> = {}) => Response.json({ ok, message, ...extra }, { status, headers: { 'cache-control': 'no-store' } });

export async function POST(req: Request) {
  let corps: Corps;
  try {
    const texte = await req.text();
    if (texte.length > 4000) return reponse(false, 'Demande invalide.', 413);
    corps = JSON.parse(texte) as Corps;
  } catch {
    return reponse(false, 'Demande invalide.', 400);
  }
  const etape = corps.etape === 'inscription' ? 'inscription' : 'capture';
  const ip = ipDe(req);
  const supabase = clientAnonyme();

  if (etape === 'inscription') {
    const email = String(corps.email ?? '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) return reponse(false, 'Adresse e-mail invalide.', 400);
    const { error } = await supabase.rpc('capturer_prospect', {
      p_email: email, p_prenom: '', p_nom: '', p_telephone: '', p_ville: '', p_source: '', p_utm: {}, p_recontact: false, p_conseils: false,
      p_ip_hash: hacherIp(ip), p_etape: 'inscription', p_jeton: process.env.PROSPECTS_JETON ?? null,
    });
    if (error && error.code !== 'PGRST202') console.error('capturer_prospect (inscription)', error.code, error.message);
    return reponse(true, 'Noté.');
  }

  const v = validerCapture(corps as SaisieCapture);
  if (!v.ok) return reponse(false, Object.values(v.erreurs)[0] ?? 'Saisie incomplète.', 422, { erreurs: v.erreurs });

  if (turnstileCaptureActif() && !(await verifierTurnstile(String(corps.turnstile ?? ''), ip))) {
    return reponse(false, 'La vérification anti-robot a échoué. Rechargez la page et réessayez.', 403);
  }

  const { prenom, nom, email, telephone, ville, conseils } = v.valeurs;
  const { error } = await supabase.rpc('capturer_prospect', {
    p_email: email, p_prenom: prenom, p_nom: nom, p_telephone: telephone, p_ville: ville,
    p_source: String(corps.source ?? '').slice(0, 80) || 'page-essai',
    p_utm: utmDepuis(typeof corps.utm === 'object' && corps.utm ? (corps.utm as Record<string, unknown>) : null),
    p_recontact: true, p_conseils: conseils, p_ip_hash: hacherIp(ip), p_etape: 'capture', p_jeton: process.env.PROSPECTS_JETON ?? null,
  });
  if (error) {
    if (error.code === '54000') return reponse(false, 'Trop de demandes : réessayez dans quelques minutes.', 429);
    if (error.code === '22023') return reponse(false, 'Vérifiez les informations saisies.', 422);
    // Base sans la mise à jour 0024 (fonction absente) ou incident : on ne bloque pas le praticien, il passe à l'étape 2.
    console.error('capturer_prospect', error.code, error.message);
    return reponse(true, 'Continuer.', 200, { enregistre: false });
  }
  return reponse(true, 'Enregistré.', 200, { enregistre: true });
}
