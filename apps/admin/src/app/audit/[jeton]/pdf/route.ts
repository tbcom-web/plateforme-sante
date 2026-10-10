import type { NextRequest } from 'next/server';

// Version PDF du rapport d'audit (voir ../route.ts), téléchargée sous un nom lisible : audit-<domaine>.pdf.
const JETON = /^[0-9a-f]{64}$/;

export async function GET(req: NextRequest, ctx: { params: Promise<{ jeton: string }> }) {
  const { jeton } = await ctx.params;
  if (!JETON.test(jeton)) return new Response('Rapport introuvable.', { status: 404 });
  const r = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/audits/${jeton}/rapport.pdf`, { cache: 'no-store' });
  if (!r.ok) return new Response('Rapport introuvable ou en cours de préparation.', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  const nom = (req.nextUrl.searchParams.get('nom') ?? 'site').replace(/[^a-z0-9.-]/gi, '').slice(0, 60) || 'site';
  return new Response(r.body, {
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="audit-${nom}.pdf"`, 'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'private, max-age=300' },
  });
}
