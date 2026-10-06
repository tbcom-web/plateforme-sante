import 'server-only';
import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

// Capture des prospects de l'essai (route /api/essai/prospect) et compteur de visites (/api/essai/mesure).
// Clé PUBLIQUE uniquement (rôle anon) : les écritures passent par les fonctions SQL capturer_prospect et
// compter_visite_essai (migration 0024). Jamais de clé service_role.

/** Turnstile actif pour la capture : clé de site ET clé secrète présentes (sinon vérification désactivée). */
export const turnstileCaptureActif = () => Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && process.env.TURNSTILE_SECRET_KEY);

/** Vérifie un jeton Turnstile auprès de Cloudflare (siteverify). La clé secrète Turnstile n'est pas une clé Supabase. */
export async function verifierTurnstile(jeton: string, ip: string | null): Promise<boolean> {
  if (!jeton || jeton.length > 2048) return false;
  const corps = new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY ?? '', response: jeton, ...(ip ? { remoteip: ip } : {}) });
  try {
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: corps, signal: AbortSignal.timeout(5000) });
    const j = (await r.json()) as { success?: boolean };
    return j.success === true;
  } catch {
    return false;
  }
}

/** Adresse IP du visiteur (en-têtes de Vercel), ou null. */
export function ipDe(req: Request): string | null {
  const brut = req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for')?.split(',')[0] || '';
  const ip = brut.trim();
  return ip && ip.length <= 64 ? ip : null;
}

/**
 * IP hachée (limitation de débit seulement, journal purgé au bout d'un jour) : SHA-256 de l'IP, du jour et d'un sel
 * facultatif (IP_HASH_SEL, chaîne aléatoire côté Vercel). L'IP en clair n'est jamais enregistrée.
 */
export function hacherIp(ip: string | null, jour = new Date().toISOString().slice(0, 10)): string {
  if (!ip) return '';
  return createHash('sha256').update(`${jour}|${ip}|${process.env.IP_HASH_SEL ?? ''}`).digest('hex').slice(0, 32);
}

/** Client Supabase anonyme (clé publique, sans session). */
export const clientAnonyme = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });

/** Robots et outils de mesure : leurs chargements de page ne sont pas comptés comme des visites. */
export const estRobot = (ua: string | null) => !ua || /bot|crawl|spider|slurp|preview|lighthouse|headless|pagespeed|monitor|curl|wget|python|axios|node-fetch/i.test(ua);
