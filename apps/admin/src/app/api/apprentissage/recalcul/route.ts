import { after } from 'next/server';
import { calculerEtGarder } from '@/lib/apprentissage-instantane';
import { definitionRecalcul } from '@/lib/apprentissage-calculs';
import { createClient } from '@/lib/supabase/server';

// RECALCUL D'UN INSTANTANÉ D'APPRENTISSAGE HORS DES PAGES (perf vague 2, 2026-10-10 ; apprentissage-instantane.ts) : demandé par une
// page qui a servi un instantané périmé. Fonction Vercel à part (maxDuration propre : les pages ne partagent pas son processeur).
// 1. Session de la personne (cookies transmis par la page) : même portée, même profession, mêmes droits de lecture qu'elle.
// 2. Verrou en base (0060, prendre_verrou_apprentissage) : un seul recalcul à la fois par clé et portée, toutes instances
//    confondues (libéré à la fin, sinon au bout de 150 s). Sans la migration 0060 : un calcul à la fois par instance.
// 3. Réponse aussitôt (202), calcul après la réponse (after), enregistré dans apprentissage_instantane.
export const maxDuration = 120;
export const dynamic = 'force-dynamic';

const DUREE_VERROU_S = 150;

export async function POST(request: Request) {
  // En-tête propre aux demandes des pages : jamais envoyé par un formulaire d'un autre site
  if (request.headers.get('x-apprentissage') !== '1') return Response.json({ ok: false }, { status: 400 });
  let corps: { cle?: unknown; portee?: unknown };
  try { corps = await request.json(); } catch { return Response.json({ ok: false }, { status: 400 }); }
  const cle = typeof corps.cle === 'string' ? corps.cle : '', portee = corps.portee === 'admin' || corps.portee === 'equipe' ? corps.portee : null;
  if (!cle || !portee) return Response.json({ ok: false }, { status: 400 });
  const def = await definitionRecalcul(cle, portee).catch(() => null);
  if (!def) return Response.json({ ok: false, message: 'Instantané inconnu ou portée différente.' }, { status: 403 });
  const supabase = await createClient();
  const cleVerrou = `${cle}|${portee}`;
  const verrou = await supabase.rpc('prendre_verrou_apprentissage', { p_cle: cleVerrou, p_portee: portee, p_secondes: DUREE_VERROU_S }).then((r) => r, () => ({ data: null, error: { message: 'réseau' } }));
  // Verrou tenu par un autre recalcul : rien à faire (la page suivante aura son résultat)
  if (!verrou.error && verrou.data === false) return Response.json({ ok: true, deja: true }, { status: 409 });
  const avecVerrou = !verrou.error;
  after(async () => {
    try {
      await calculerEtGarder(def, portee);
    } catch (e) {
      console.warn(`[apprentissage] recalcul ${cleVerrou} en échec : ${e instanceof Error ? e.message : 'erreur'}`);
    } finally {
      if (avecVerrou) await supabase.rpc('rendre_verrou_apprentissage', { p_cle: cleVerrou }).then(() => null, () => null);
    }
  });
  return Response.json({ ok: true, verrou: avecVerrou }, { status: 202 });
}
