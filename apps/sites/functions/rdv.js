// Cloudflare Pages Function : compte chaque clic « Prendre RDV » puis redirige vers l'agenda.
// Comptage anonyme : ni cookie, ni adresse IP, ni identifiant visiteur.
// Binding optionnel : RDV_CLICKS (Workers Analytics Engine).

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const config = await env.ASSETS.fetch(new URL('/rdv-config.json', url)).then((r) => r.json());

  const source = (url.searchParams.get('src') ?? 'inconnu').slice(0, 64);
  const ua = request.headers.get('user-agent') ?? '';
  const appareil = /mobile|android|iphone/i.test(ua) ? 'mobile' : 'ordinateur';
  const robot = /bot|crawler|spider|preview/i.test(ua);

  if (env.RDV_CLICKS && !robot) {
    env.RDV_CLICKS.writeDataPoint({
      indexes: [config.siteId],
      blobs: [config.siteId, source, appareil],
      doubles: [1],
    });
  }

  return new Response(null, {
    status: 302,
    headers: { Location: config.url, 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' },
  });
}
