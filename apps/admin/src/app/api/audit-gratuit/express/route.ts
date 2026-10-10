import { auditExpress } from '@plateforme/core/audit-express';
import { hacherIp, ipDe } from '@/lib/capture';
import { limiteDebit } from '@/lib/annuaire-sante';
import { recupererPagePublique } from '@/lib/recuperation-sure';

// Test immédiat de /audit-gratuit : lit la page d'accueil du site saisi (sans JavaScript, comme un robot d'IA) et son
// robots.txt, puis renvoie le score « lisible par ChatGPT » et les premiers constats (packages/core/src/audit-express.ts).
// Public, sans session : adresse vérifiée contre la SSRF (recuperation-sure.ts), débit limité par visiteur. Rien n'est
// enregistré à ce stade.
export const dynamic = 'force-dynamic';

const UA = 'Mozilla/5.0 (compatible; webpodologue-audit/1.0; +https://www.webpodologue.fr)';
const reponse = (corps: Record<string, unknown>, status = 200) => Response.json(corps, { status, headers: { 'cache-control': 'no-store' } });

export async function POST(req: Request) {
  let saisie = '';
  try {
    const texte = await req.text();
    if (texte.length > 500) return reponse({ ok: false, message: 'Demande invalide.' }, 413);
    saisie = String((JSON.parse(texte) as { domaine?: unknown }).domaine ?? '').trim().toLowerCase();
  } catch { return reponse({ ok: false, message: 'Demande invalide.' }, 400); }
  if (!limiteDebit(`audit:${hacherIp(ipDe(req)) || 'inconnu'}`, 5, 60)) return reponse({ ok: false, message: 'Beaucoup de tests en peu de temps : réessayez dans une minute.' }, 429);

  let hote: string;
  try { hote = new URL(/^https?:\/\//.test(saisie) ? saisie : `https://${saisie}`).hostname; } catch { return reponse({ ok: false, message: 'Adresse invalide. Exemple : cabinet-podologie-dupont.fr' }, 422); }
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(hote)) return reponse({ ok: false, message: 'Adresse invalide. Exemple : cabinet-podologie-dupont.fr' }, 422);

  let page = await recupererPagePublique(`https://${hote}/`, UA);
  if ((!page || page.statut >= 400) && !hote.startsWith('www.')) page = await recupererPagePublique(`https://www.${hote}/`, UA);
  let https = true;
  if (!page || page.statut >= 400) { page = await recupererPagePublique(`http://${hote}/`, UA); https = Boolean(page?.url.startsWith('https:')); }
  if (!page || page.statut >= 400 || !/<html|<body|<title/i.test(page.texte)) return reponse({ ok: false, message: `Nous n’arrivons pas à ouvrir ${hote}. Vérifiez l’adresse de votre site.` }, 422);

  const robots = await recupererPagePublique(new URL('/robots.txt', page.url).href, UA);
  const r = auditExpress({
    html: page.texte, url: page.url, https: https && page.url.startsWith('https:'), entetes: page.entetes,
    robotsTxt: robots && robots.statut < 400 && !/<html/i.test(robots.texte) ? robots.texte : null,
  });
  return reponse({ ok: true, resultat: r });
}
