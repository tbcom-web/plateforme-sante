// Outils du workflow « publier-site » (GitHub Actions).
//   node scripts/publication.mjs preparer <site_id>   → choisit le slug du site, l'écrit dans Supabase, l'affiche ;
//                                                       en production, passe la publication « en cours » (lien du run)
//                                                       et donne l'horodatage de la demande (sortie GitHub « version »)
//   node scripts/publication.mjs terminer <site_id> <domaine_pages_dev>  → publication réussie, site « en ligne »
//                                                       (sauf site suspendu, dont le statut n'est jamais changé)
//   node scripts/publication.mjs echec <site_id> [journal]  → publication échouée (message lisible tiré du journal)
//   node scripts/publication.mjs terminer-apercu <site_id>  → version d'essai prête (aperçu privé ; statut inchangé)
//   node scripts/publication.mjs page-suspendue <site_id> <dossier> → page « version d'essai suspendue » (noindex) à déployer
// Essai gratuit (migration 0023, docs/onboarding-lead.md) : un site d'essai non validé n'est JAMAIS publié en
// production (« preparer » échoue) ; en aperçu, il est suivi comme une publication (sorties « essai », « suspendu »).
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

/** Essai du propriétaire du site (null si aucun, ou si la base n'a pas la mise à jour 0023). */
async function essaiDuSite(siteId) {
  const [site] = await api(`sites?id=eq.${siteId}&select=owner,statut`);
  if (!site) return null;
  const [essai] = await api(`essais?owner=eq.${site.owner}&select=owner,essai_fin,valide_le,suspendu_le,paiement_statut,cgu_version`).catch(() => []);
  return essai ? { ...essai, statut: site.statut } : null;
}

/** Propriétaire sans accès (0025) : compte anonyme (profil sans e-mail) ou essai sans CGU. */
async function sansAcces(siteId, essai) {
  if (essai && essai.cgu_version == null) return true;
  const [site] = await api(`sites?id=eq.${siteId}&select=owner`);
  const [profil] = site?.owner ? await api(`profiles?id=eq.${site.owner}&select=email`).catch(() => []) : [];
  return Boolean(profil) && !profil.email;
}

const sortie = async (ligne) => {
  if (!process.env.GITHUB_OUTPUT) return;
  const { appendFile } = await import('node:fs/promises');
  await appendFile(process.env.GITHUB_OUTPUT, `${ligne}\n`);
};

if (commande === 'preparer') {
  const essai = await essaiDuSite(siteId);
  // Garde « essai = aperçu seulement » (aussi dans demander_publication et le back-office).
  if (production && essai && !essai.valide_le) {
    throw new Error('Version d’essai non validée : mise en ligne publique refusée (validation par la commerciale dans /admin/leads).');
  }
  // Garde « anonyme = jamais de workflow » (0025, aussi en SQL et côté serveur) : ni aperçu ni production sans accès.
  if (await sansAcces(siteId, essai)) {
    throw new Error('Propriétaire sans accès créé (session anonyme) : ni aperçu ni mise en ligne.');
  }
  // Sans config_publiee si la base n'a pas encore reçu la mise à jour 0017.
  const [site] = await api(`sites?id=eq.${siteId}&select=id,slug,profession_slug,config,config_publiee,publication_demandee_at`).catch(() =>
    api(`sites?id=eq.${siteId}&select=id,slug,profession_slug,config`),
  );
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
    }).catch((e) => console.error(`Suivi de publication non enregistré : ${e.message}`));
  }
  // Horodatage de la demande, écrit au build dans /version.json : le back-office n'annonce « publié » qu'une fois
  // cette version servie par le site en ligne (sortie « version » de l'étape, voir publier-site.yml).
  if (production && process.env.GITHUB_OUTPUT && site.publication_demandee_at) {
    const { appendFile } = await import('node:fs/promises');
    await appendFile(process.env.GITHUB_OUTPUT, `version=${site.publication_demandee_at}\n`);
  }
  // Version d'essai en aperçu : suivie comme une publication (le back-office affiche les étapes puis « Voir mon site »).
  if (!production && essai && !essai.valide_le) {
    await sortie('essai=1');
    const termine = Date.parse(essai.essai_fin) < Date.now() && essai.paiement_statut !== 'paye';
    if (essai.suspendu_le || essai.statut === 'suspendu' || termine) await sortie('suspendu=1');
    await api(`sites?id=eq.${siteId}`, {
      method: 'PATCH',
      body: JSON.stringify({ publication_etat: 'en_cours', publication_run_url: runUrl, publication_erreur: null, publication_fin: null }),
    }).catch((e) => console.error(`Suivi de l'aperçu non enregistré : ${e.message}`));
    if (site.publication_demandee_at) await sortie(`version=${site.publication_demandee_at}`);
  }
  console.log(slug);
} else if (commande === 'terminer-apercu') {
  const essai = await essaiDuSite(siteId);
  if (!essai) {
    console.log('Aperçu sans essai : rien à enregistrer.');
  } else {
    const maintenant = new Date().toISOString();
    await api(`sites?id=eq.${siteId}`, {
      method: 'PATCH',
      body: JSON.stringify({ publication_etat: 'ok', publication_fin: maintenant, publication_erreur: null, ...(runUrl ? { publication_run_url: runUrl } : {}) }),
    });
    if (!essai.suspendu_le) await api(`essais?owner=eq.${essai.owner}`, { method: 'PATCH', body: JSON.stringify({ apercu_genere_le: maintenant }) });
    console.log(`Version d'essai prête pour ${siteId}.`);
  }
} else if (commande === 'terminer') {
  const [site] = await api(`sites?id=eq.${siteId}&select=id,statut,domaine`);
  if (!site) throw new Error(`Site introuvable : ${siteId}`);
  const maintenant = new Date().toISOString();
  const maj = { published_at: maintenant };
  // Un site suspendu par l'admin le reste : seule une action de l'admin le remet en ligne.
  if (site.statut !== 'suspendu') maj.statut = 'en_ligne';
  if (!site.domaine && argument) maj.domaine = argument;
  const suivi = { publication_etat: 'ok', publication_fin: maintenant, publication_erreur: null, ...(runUrl ? { publication_run_url: runUrl } : {}) };
  // Repli sans le suivi si la base n'a pas encore reçu la mise à jour 0017.
  await api(`sites?id=eq.${siteId}`, { method: 'PATCH', body: JSON.stringify({ ...maj, ...suivi }) }).catch(() =>
    api(`sites?id=eq.${siteId}`, { method: 'PATCH', body: JSON.stringify(maj) }),
  );
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
} else if (commande === 'page-suspendue') {
  // Remplace l'aperçu d'une version d'essai suspendue ou terminée par une page sobre, jamais indexée.
  const { mkdir, writeFile } = await import('node:fs/promises');
  const { join } = await import('node:path');
  const dossier = argument || 'dist';
  await mkdir(dossier, { recursive: true });
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>Version d’essai suspendue</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;font:17px/1.5 system-ui,sans-serif;background:#f7f7f5;color:#1c2731;padding:16px}main{max-width:32rem}h1{font-size:1.4rem}</style></head><body><main><h1>Version d’essai suspendue</h1><p>Cette version d’essai n’est plus disponible. Le praticien peut la réactiver auprès de sa conseillère.</p></main></body></html>`;
  await writeFile(join(dossier, 'index.html'), html);
  await writeFile(join(dossier, '404.html'), html);
  await writeFile(join(dossier, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
  await writeFile(join(dossier, '_headers'), '/*\n  X-Robots-Tag: noindex, nofollow\n');
  await writeFile(join(dossier, 'apercu.json'), JSON.stringify({ genere: new Date().toISOString(), publication: process.env.PUBLICATION_VERSION || null, run: process.env.PUBLICATION_RUN || null, suspendu: true }));
  console.log(`Page de version d'essai suspendue écrite dans ${dossier}.`);
} else if (commande) {
  throw new Error(`Commande inconnue : ${commande}`);
}
