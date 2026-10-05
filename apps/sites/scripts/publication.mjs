// Outils du workflow « publier-site » (GitHub Actions).
//   node scripts/publication.mjs preparer <site_id>   → choisit le slug du site, l'écrit dans Supabase, l'affiche ;
//                                                       en production, passe la publication « en cours » (lien du run)
//   node scripts/publication.mjs terminer <site_id> <domaine_pages_dev>  → publication réussie, site « en ligne »
//                                                       (sauf site suspendu, dont le statut n'est jamais changé)
//   node scripts/publication.mjs echec <site_id> [journal]  → publication échouée (message lisible tiré du journal)
// Variables requises : SUPABASE_URL, SUPABASE_SECRET_KEY. Facultatives : RUN_URL (lien du run GitHub), APERCU=1.

const { SUPABASE_URL, SUPABASE_SECRET_KEY, RUN_URL, APERCU } = process.env;
if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) throw new Error('SUPABASE_URL et SUPABASE_SECRET_KEY sont requis.');

const api = async (chemin, init = {}) => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${chemin}`, {
    ...init,
    headers: { apikey: SUPABASE_SECRET_KEY, 'Content-Type': 'application/json', Prefer: 'return=representation', ...init.headers },
  });
  if (!r.ok) throw new Error(`Supabase ${r.status} : ${await r.text()}`);
  return r.json();
};

const slugifier = (t) =>
  t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** Message d'échec lisible : liste « Publication refusée » de la construction si elle existe, sinon message générique. */
export function messageEchec(journal) {
  const lignes = String(journal ?? '').split(/\r?\n/);
  const debut = lignes.findIndex((l) => l.includes('Publication refusée'));
  if (debut >= 0) {
    const manques = [];
    for (const l of lignes.slice(debut + 1)) {
      const m = l.match(/^\s*- (.+)$/);
      if (!m) break;
      manques.push(m[1].trim());
    }
    if (manques.length) return `Site incomplet : ${manques.join(' ; ')}`.slice(0, 500);
  }
  return 'La construction ou la mise en ligne a échoué : voir le journal de publication.';
}

const [commande, siteId, argument] = process.argv.slice(2);
if (commande && !/^[0-9a-f-]{36}$/.test(siteId ?? '')) throw new Error('Identifiant de site invalide.');

const production = APERCU !== '1';
const runUrl = /^https:\/\/[^\s]+$/.test(RUN_URL ?? '') ? RUN_URL : null;

if (commande === 'preparer') {
  const [site] = await api(`sites?id=eq.${siteId}&select=id,slug,profession_slug,config,config_publiee`);
  if (!site) throw new Error(`Site introuvable : ${siteId}`);
  let slug = site.slug;
  if (!slug) {
    // Version publiée (repli sur le brouillon pour les sites jamais publiés) ; brouillon v2 (praticiens[]) ou v1.
    const config = (production && site.config_publiee) || site.config;
    const { cabinet } = config;
    const nom = config.praticiens?.[0]?.nom || config.praticien?.nom || 'cabinet';
    const base = slugifier(`${site.profession_slug} ${nom} ${cabinet?.ville ?? ''}`).slice(0, 50);
    slug = base;
    // Garantit l'unicité du slug (et donc du nom de projet Cloudflare).
    for (let i = 2; (await api(`sites?slug=eq.${slug}&select=id`)).length > 0; i++) slug = `${base}-${i}`;
    await api(`sites?id=eq.${siteId}`, { method: 'PATCH', body: JSON.stringify({ slug }) });
  }
  if (production) {
    await api(`sites?id=eq.${siteId}`, {
      method: 'PATCH',
      body: JSON.stringify({ publication_etat: 'en_cours', publication_run_url: runUrl, publication_debut: new Date().toISOString(), publication_fin: null, publication_erreur: null }),
    });
  }
  console.log(slug);
} else if (commande === 'terminer') {
  const [site] = await api(`sites?id=eq.${siteId}&select=id,statut,domaine`);
  if (!site) throw new Error(`Site introuvable : ${siteId}`);
  const maintenant = new Date().toISOString();
  const maj = { published_at: maintenant, publication_etat: 'ok', publication_fin: maintenant, publication_erreur: null };
  // Un site suspendu par l'admin le reste : seule une action de l'admin le remet en ligne.
  if (site.statut !== 'suspendu') maj.statut = 'en_ligne';
  if (runUrl) maj.publication_run_url = runUrl;
  if (!site.domaine && argument) maj.domaine = argument;
  await api(`sites?id=eq.${siteId}`, { method: 'PATCH', body: JSON.stringify(maj) });
  console.log(`Site ${siteId} publié${site.statut === 'suspendu' ? ' (reste suspendu)' : ', en ligne'}.`);
} else if (commande === 'echec') {
  let journal = '';
  if (argument) {
    const { readFile } = await import('node:fs/promises');
    journal = await readFile(argument, 'utf8').catch(() => '');
  }
  const maj = { publication_etat: 'echec', publication_fin: new Date().toISOString(), publication_erreur: messageEchec(journal) };
  if (runUrl) maj.publication_run_url = runUrl;
  await api(`sites?id=eq.${siteId}`, { method: 'PATCH', body: JSON.stringify(maj) });
  console.log(`Échec de publication enregistré pour ${siteId}.`);
} else if (commande) {
  throw new Error(`Commande inconnue : ${commande}`);
}
