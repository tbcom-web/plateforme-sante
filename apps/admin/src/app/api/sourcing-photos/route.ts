import { createHash, timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { cibleProfil, ciblesPrioritaires, couvertureRequetes, ligneDeSerie, QUOTAS_SOURCING, type EntreesCibles, type LigneSerie } from '@plateforme/core';
import { professionsAdmin } from '@plateforme/core/professions';
import { executerSourcing, nouveauGroupe } from '@/lib/sourcing-photos';

// ENDPOINT PROTÉGÉ du sourcing automatique (workflow .github/workflows/sourcer-photos.yml, désactivé par défaut ; docs/sourcing-photos.md).
// Authentification : en-tête « Authorization: Bearer <SOURCING_PHOTOS_JETON> » (secret partagé Vercel ↔ GitHub, 32 caractères au
// moins, jamais affiché ni journalisé ; comparaison à temps constant). Sans jeton configuré : 503.
// L'endpoint N'ÉCRIT RIEN et ne lit pas la base : le workflow lui envoie le contexte (déjà vues, couverture, finalistes, séries en
// attente) lu avec sa propre clé, reçoit les séries (aperçus des sources, scores : aucune clé) et les enregistre dans photos_series.
// Les clés Pexels / Pixabay restent sur Vercel. Quotas : 3 cibles par appel, 4 appels par jour et par instance (QUOTAS_SOURCING).

export const maxDuration = 300;

const prive = { 'Cache-Control': 'private, no-store' };
const reponse = (code: number, corps: unknown) => new Response(JSON.stringify(corps), { status: code, headers: { ...prive, 'Content-Type': 'application/json' } });
const empreinte = (s: string) => createHash('sha256').update(s).digest();

function autorise(req: NextRequest): boolean | null {
  const attendu = (process.env.SOURCING_PHOTOS_JETON ?? '').trim();
  if (attendu.length < 32) return null;
  const recu = String(req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  return Boolean(recu) && timingSafeEqual(empreinte(recu), empreinte(attendu));
}

const appelsDuJour = new Map<string, number>();
const CLE = /^(pexels|pixabay):[0-9]{1,20}$/;
const tableau = (v: unknown, max: number) => (Array.isArray(v) ? v.slice(0, max) : []);
const chaines = (v: unknown, max: number, forme = /^[a-z0-9:#./ -]{1,120}$/) => tableau(v, max).filter((x): x is string => typeof x === 'string' && forme.test(x));

export async function GET() {
  return reponse(405, { ok: false, message: 'POST seulement.' });
}

export async function POST(req: NextRequest) {
  const ok = autorise(req);
  if (ok === null) return reponse(503, { ok: false, message: 'Jeton SOURCING_PHOTOS_JETON non configuré sur le serveur.' });
  if (!ok) return reponse(401, { ok: false, message: 'Jeton invalide.' });
  if (Number(req.headers.get('content-length') ?? 0) > 8_000_000) return reponse(413, { ok: false, message: 'Contexte trop volumineux.' });
  const jour = new Date().toISOString().slice(0, 10);
  const n = appelsDuJour.get(jour) ?? 0;
  if (n >= QUOTAS_SOURCING.lancementsAutoParJour) return reponse(429, { ok: false, message: `Quota du jour atteint (${QUOTAS_SOURCING.lancementsAutoParJour} lancements).` });
  appelsDuJour.clear();
  appelsDuJour.set(jour, n + 1);

  const corps = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const profession = typeof corps?.profession === 'string' && professionsAdmin().some((p) => p.id === corps.profession) ? corps.profession : null;
  if (!profession) return reponse(400, { ok: false, message: 'Profession inconnue.' });
  const c = (corps?.contexte ?? {}) as Record<string, unknown>;
  const photos: EntreesCibles['photos'] = tableau(c.photos, 20000).map((x) => x as Record<string, unknown>).map((x) => ({
    requete: typeof x.requete === 'string' ? x.requete.slice(0, 80) : null, statut: typeof x.statut === 'string' ? x.statut.slice(0, 20) : null,
    professions: chaines(x.professions, 10), hashtags: chaines(x.hashtags, 30), sujets: chaines(x.sujets, 10), note: typeof x.note === 'number' ? x.note : null,
  }));
  const finalistes = tableau(c.finalistes, 200).map((x) => x as Record<string, unknown>).filter((x) => typeof x.profil === 'string')
    .map((x) => ({ profil: String(x.profil).slice(0, 60), gamme: typeof x.gamme === 'string' ? x.gamme.slice(0, 40) : null, traitement: typeof x.traitement === 'string' ? x.traitement.slice(0, 40) : null }));
  const dejaVues = new Set(chaines(c.dejaVues, 60000, CLE));
  const entrees: EntreesCibles = { profession, photos, finalistes, enAttente: chaines(c.enAttente, 500) };
  const max = Math.max(1, Math.min(QUOTAS_SOURCING.ciblesParLancement, Number(corps?.max ?? QUOTAS_SOURCING.ciblesParLancement) || 1));
  const profil = typeof corps?.profil === 'string' ? corps.profil : null;
  const cibles = profil ? [cibleProfil(profession, profil, { finalistes })].filter((x) => x !== null) : ciblesPrioritaires(entrees).slice(0, max);

  const lignes: LigneSerie[] = [];
  const bilan: { cible: string; libelle: string; raison: string; series: number; motif: string | null }[] = [];
  const couverture = couvertureRequetes(photos, profession);
  for (const cible of cibles) {
    const { series, journal, motif } = await executerSourcing(cible, { dejaVues, couverture });
    const groupe = nouveauGroupe();
    for (const s of series) { lignes.push(ligneDeSerie(s, groupe, journal)); for (const p of s.photos) dejaVues.add(p.cle); }
    bilan.push({ cible: cible.id, libelle: cible.libelle, raison: cible.raison, series: series.length, motif });
  }
  return reponse(200, { ok: true, lignes, bilan });
}
