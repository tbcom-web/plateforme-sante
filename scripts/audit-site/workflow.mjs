// AUDIT DE SITE — étape du workflow auditer-site (lancé depuis /admin/audits). Lit la demande dans la table audits, audite le
// site du prospect et l'aperçu du site préparé (https://apercu.<slug>.pages.dev, déployé par le job précédent), puis dépose
// rapport.html, rapport.pdf et mesures.json dans le stockage « audits » sous <jeton>/, et met à jour la ligne.
//
// Usage : node scripts/audit-site/workflow.mjs <audit_id>   (SUPABASE_URL, SUPABASE_SECRET_KEY ; RUN_URL, PAGESPEED_KEY facultatifs)
import { produireAudit } from './produire.mjs';

const auditId = process.argv[2];
const URL_SB = process.env.SUPABASE_URL?.replace(/\/+$/, '');
const CLE = process.env.SUPABASE_SECRET_KEY;
if (!/^[0-9a-f-]{36}$/.test(auditId ?? '') || !URL_SB || !CLE) { console.error('Usage : workflow.mjs <audit_id> (SUPABASE_URL et SUPABASE_SECRET_KEY requis)'); process.exit(1); }

const entetes = { apikey: CLE, Authorization: `Bearer ${CLE}` };
async function api(chemin, init = {}) {
  const r = await fetch(`${URL_SB}/rest/v1/${chemin}`, { ...init, headers: { ...entetes, 'Content-Type': 'application/json', Prefer: 'return=representation', ...init.headers } });
  if (!r.ok) throw new Error(`Supabase ${r.status} : ${(await r.text()).slice(0, 200)}`);
  return r.status === 204 ? null : r.json();
}
const maj = (champs) => api(`audits?id=eq.${auditId}`, { method: 'PATCH', body: JSON.stringify(champs) });
async function deposer(chemin, corps, type) {
  const r = await fetch(`${URL_SB}/storage/v1/object/audits/${chemin}`, { method: 'POST', headers: { ...entetes, 'Content-Type': type, 'x-upsert': 'true', 'cache-control': 'no-cache' }, body: corps });
  if (!r.ok) throw new Error(`Stockage ${r.status} : ${(await r.text()).slice(0, 200)}`);
}

/** Attend que l'aperçu réponde : pour un projet Cloudflare Pages tout neuf, le certificat HTTPS de apercu.<slug>.pages.dev met plusieurs minutes à être émis (ERR_SSL_VERSION_OR_CIPHER_MISMATCH en attendant) */
async function attendre(url, maxMs = 720000) {
  const fin = Date.now() + maxMs;
  while (Date.now() < fin) {
    try { const r = await fetch(url, { redirect: 'follow' }); if (r.ok) return true; } catch {}
    await new Promise((ok) => setTimeout(ok, 10000));
  }
  return false;
}

const [audit] = await api(`audits?id=eq.${auditId}&select=*`);
if (!audit) { console.error(`Audit introuvable : ${auditId}`); process.exit(1); }
await maj({ statut: 'en_cours', run_url: process.env.RUN_URL ?? null, erreur: null });

try {
  let proposition = null;
  if (audit.site_id) {
    const [site] = await api(`sites?id=eq.${audit.site_id}&select=slug`);
    if (site?.slug) {
      const url = `https://apercu.${site.slug}.pages.dev/`;
      if (await attendre(url)) proposition = url;
      else console.error(`Aperçu injoignable (${url}) : rapport sans comparaison.`);
    }
  }
  const id = audit.identite ?? {};
  const r = await produireAudit({
    cible: audit.domaine, proposition, lienSite: proposition, libelle: 'Votre futur site webpodologue',
    praticien: [id.prenom, id.nom].filter(Boolean).join(' ') || undefined,
    commercial: audit.commercial_nom || audit.commercial_tel ? { nom: audit.commercial_nom, tel: audit.commercial_tel } : null,
  });
  await deposer(`${audit.jeton}/rapport.html`, r.html, 'text/html');
  await deposer(`${audit.jeton}/rapport.pdf`, r.pdf, 'application/pdf');
  await deposer(`${audit.jeton}/mesures.json`, JSON.stringify(r.mesures), 'application/json');
  await maj({
    statut: 'pret', fini_le: new Date().toISOString(), note_actuelle: r.note.globale, note_proposee: r.proposition?.note.globale ?? null,
    marquants: r.note.marquants, erreur: proposition || !audit.site_id ? null : 'Aperçu du site préparé injoignable : rapport sans comparaison.',
  });
  console.log(`Audit prêt : ${r.note.globale}/100${r.proposition ? ` → ${r.proposition.note.globale}/100` : ''}`);
} catch (e) {
  await maj({ statut: 'echec', fini_le: new Date().toISOString(), erreur: String(e.message ?? e).slice(0, 500) }).catch(() => {});
  console.error(e);
  process.exit(1);
}
