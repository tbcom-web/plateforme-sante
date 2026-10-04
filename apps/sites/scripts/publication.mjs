// Outils du workflow « publier-site » (GitHub Actions).
//   node scripts/publication.mjs preparer <site_id>   → choisit le slug du site, l'écrit dans Supabase, l'affiche
//   node scripts/publication.mjs terminer <site_id> <domaine_pages_dev>  → passe le site « en ligne »
// Variables requises : SUPABASE_URL, SUPABASE_SECRET_KEY.

const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;
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

const [commande, siteId, domaine] = process.argv.slice(2);
if (!/^[0-9a-f-]{36}$/.test(siteId ?? '')) throw new Error('Identifiant de site invalide.');

const [site] = await api(`sites?id=eq.${siteId}&select=id,slug,profession_slug,domaine,config`);
if (!site) throw new Error(`Site introuvable : ${siteId}`);

if (commande === 'preparer') {
  let slug = site.slug;
  if (!slug) {
    // Brouillon v2 (praticiens[]) ou v1 (praticien).
    const { cabinet } = site.config;
    const nom = site.config.praticiens?.[0]?.nom || site.config.praticien?.nom || 'cabinet';
    const base = slugifier(`${site.profession_slug} ${nom} ${cabinet?.ville ?? ''}`).slice(0, 50);
    slug = base;
    // Garantit l'unicité du slug (et donc du nom de projet Cloudflare).
    for (let i = 2; (await api(`sites?slug=eq.${slug}&select=id`)).length > 0; i++) slug = `${base}-${i}`;
    await api(`sites?id=eq.${siteId}`, { method: 'PATCH', body: JSON.stringify({ slug }) });
  }
  console.log(slug);
} else if (commande === 'terminer') {
  const maj = { statut: 'en_ligne', published_at: new Date().toISOString() };
  if (!site.domaine && domaine) maj.domaine = domaine;
  await api(`sites?id=eq.${siteId}`, { method: 'PATCH', body: JSON.stringify(maj) });
  console.log(`Site ${siteId} en ligne.`);
} else {
  throw new Error(`Commande inconnue : ${commande}`);
}
