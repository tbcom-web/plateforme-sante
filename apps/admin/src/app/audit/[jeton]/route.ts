import type { NextRequest } from 'next/server';

// Rapport d'audit remis au praticien (lien à capacité : jeton aléatoire de 64 caractères, voir 0061_audits_sites.sql).
// Page publique, sans session (proxy.ts) ; le fichier est lu dans le stockage public « audits » et servi en HTML,
// jamais indexé. /audit/<jeton>/pdf : la version PDF.
const JETON = /^[0-9a-f]{64}$/;

export async function GET(_req: NextRequest, ctx: { params: Promise<{ jeton: string }> }) {
  const { jeton } = await ctx.params;
  if (!JETON.test(jeton)) return new Response('Rapport introuvable.', { status: 404 });
  const r = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/audits/${jeton}/rapport.html`, { cache: 'no-store' });
  if (!r.ok) return new Response('Rapport introuvable ou en cours de préparation.', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  return new Response(r.body, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'private, max-age=300', 'Referrer-Policy': 'no-referrer' },
  });
}
