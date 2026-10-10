import 'server-only';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

// Téléchargement d'une page dont l'adresse est saisie par un visiteur (/audit-gratuit) : protection contre la falsification
// de requêtes côté serveur (SSRF). Seuls http et https sur les ports standard ; chaque saut de redirection est revérifié ;
// toute adresse privée, locale ou réservée est refusée ; délai et taille bornés.

const PRIVEES_V4: [number, number][] = [
  [0x00000000, 8], [0x0a000000, 8], [0x64400000, 10], [0x7f000000, 8], [0xa9fe0000, 16], [0xac100000, 12],
  [0xc0000000, 24], [0xc0a80000, 16], [0xc6120000, 15], [0xe0000000, 4], [0xf0000000, 4],
];
const enEntier = (ip: string) => ip.split('.').reduce((n, x) => (n << 8) + Number(x), 0) >>> 0;

/** Vrai si l'adresse n'est pas joignable publiquement (réseau privé, boucle locale, lien local, réservée) */
export function adressePrivee(ip: string): boolean {
  if (isIP(ip) === 4) {
    const n = enEntier(ip);
    return PRIVEES_V4.some(([base, bits]) => ((n >>> (32 - bits)) << (32 - bits)) >>> 0 === base);
  }
  const x = ip.toLowerCase();
  if (x.startsWith('::ffff:')) return adressePrivee(x.slice(7));
  return x === '::' || x === '::1' || /^f[cd]/.test(x) || /^fe[89ab]/.test(x) || x.startsWith('ff');
}

async function hotePublic(url: URL): Promise<boolean> {
  if (!/^https?:$/.test(url.protocol) || (url.port && !['80', '443'].includes(url.port)) || url.username || url.password) return false;
  const h = url.hostname.replace(/^\[|\]$/g, '');
  if (isIP(h)) return !adressePrivee(h);
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(h) || /\.(local|internal|localhost)$/i.test(h)) return false;
  try {
    const adresses = await lookup(h, { all: true });
    return adresses.length > 0 && adresses.every((a) => !adressePrivee(a.address));
  } catch { return false; }
}

export type PageRecuperee = { url: string; statut: number; entetes: Record<string, string>; texte: string };

/** GET d'une page publique (3 redirections au plus, 8 s, 2 Mo) ; null si refusée ou injoignable */
export async function recupererPagePublique(depart: string, ua: string): Promise<PageRecuperee | null> {
  let url: URL;
  try { url = new URL(depart); } catch { return null; }
  for (let saut = 0; saut <= 3; saut++) {
    if (!(await hotePublic(url))) return null;
    let r: Response;
    try {
      r = await fetch(url, { headers: { 'user-agent': ua, 'accept-language': 'fr-FR,fr;q=0.9', accept: 'text/html,text/plain;q=0.9,*/*;q=0.5' }, redirect: 'manual', signal: AbortSignal.timeout(8000), cache: 'no-store' });
    } catch { return null; }
    if (r.status >= 300 && r.status < 400 && r.headers.get('location')) {
      try { url = new URL(r.headers.get('location')!, url); } catch { return null; }
      continue;
    }
    const lecteur = r.body?.getReader();
    let texte = '', taille = 0;
    const dec = new TextDecoder();
    if (lecteur) {
      for (;;) {
        const { done, value } = await lecteur.read();
        if (done) break;
        taille += value.length;
        texte += dec.decode(value, { stream: true });
        if (taille > 2_000_000) { await lecteur.cancel(); break; }
      }
    }
    return { url: url.href, statut: r.status, entetes: Object.fromEntries(r.headers), texte };
  }
  return null;
}
