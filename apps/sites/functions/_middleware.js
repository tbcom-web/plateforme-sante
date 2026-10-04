// Cloudflare Pages Function : négociation de contenu pour les assistants IA.
// Une requête « Accept: text/markdown » sur une page reçoit sa version Markdown (/soins/x → /soins/x.md),
// générée au build ; les navigateurs reçoivent la page HTML, inchangée. Seules les pages listées dans
// public/_routes.json passent par cette fonction (jamais les images, polices ni feuilles de style).
//
// Les en-têtes de _headers ne sont pas garantis sur une réponse de Function : ceux de la règle « /* »
// (sécurité, CSP, Link) sont relus dans en-tetes.json, produit au build depuis _headers, et ajoutés s'ils manquent.

let communs = null;

async function enTetesCommuns(env, url) {
  if (!communs) {
    communs = await env.ASSETS.fetch(new URL('/en-tetes.json', url))
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({}));
  }
  return communs;
}

/** « / » → « /index.md », « /soins/x » → « /soins/x.md ». */
const versionMarkdown = (chemin) => (chemin === '/' ? '/index.md' : `${chemin.replace(/\/$/, '')}.md`);

/** Page HTML d'une version Markdown : « /index.md » → « / », « /soins/x.md » → « /soins/x ». */
const pageHtml = (chemin) => (chemin === '/index.md' ? '/' : chemin.slice(0, -3));

export async function onRequest({ request, next, env }) {
  const url = new URL(request.url);
  const lecture = request.method === 'GET' || request.method === 'HEAD';
  const estMarkdown = url.pathname.endsWith('.md');
  const demandeMarkdown = lecture && !estMarkdown && /\btext\/markdown\b/i.test(request.headers.get('accept') ?? '');

  let reponse = null;
  let markdown = estMarkdown;
  if (demandeMarkdown) {
    const md = await env.ASSETS.fetch(new URL(versionMarkdown(url.pathname), url));
    if (md.ok) {
      reponse = new Response(request.method === 'HEAD' ? null : md.body, { status: 200, headers: md.headers });
      markdown = true;
    }
  }
  if (!reponse) {
    const suite = await next();
    reponse = new Response(suite.body, suite);
  }

  const h = reponse.headers;
  if (markdown && reponse.ok) {
    // Version Markdown : jamais indexée, rattachée à sa page HTML (sauf si _headers l'a déjà fait).
    h.set('Content-Type', 'text/markdown; charset=utf-8');
    h.set('X-Robots-Tag', 'noindex');
    const page = estMarkdown ? pageHtml(url.pathname) : url.pathname;
    if (!h.has('Link')) h.set('Link', `<${new URL(page, url).href}>; rel="canonical", </llms.txt>; rel="describedby"; type="text/plain"`);
  }
  for (const [nom, valeur] of Object.entries(await enTetesCommuns(env, url))) if (!h.has(nom)) h.set(nom, valeur);
  h.append('Vary', 'Accept');
  return reponse;
}
