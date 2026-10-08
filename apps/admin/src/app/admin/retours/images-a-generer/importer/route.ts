import { revalidatePath } from 'next/cache';
import { TAILLE_MAX_IMAGE_GENEREE, validerDeclarationIa, type DeclarationIa } from '@plateforme/core';
import { exigerAdmin } from '@/lib/admin';
import { importerImageGeneree } from '@/lib/images-generees';
import { createClient, getUser } from '@/lib/supabase/server';

// « Importer une image générée » (/admin/retours/images-a-generer) : fichier (multipart, 4 Mo au plus, le navigateur réencode au-delà)
// + déclaration de Paul (outil, date, prompt, conditions de l'outil, vérifications). Admin seulement. Contrôles et traçabilité :
// packages/core/src/images-generees.ts ; conversion et stockage : lib/images-generees.ts. Aucun appel à un service d'IA.

export const dynamic = 'force-dynamic';

const reponse = (corps: unknown, statut = 200) => Response.json(corps, { status: statut, headers: { 'cache-control': 'no-store' } });

export async function POST(req: Request) {
  await exigerAdmin();
  const longueur = Number(req.headers.get('content-length') ?? 0);
  if (longueur > TAILLE_MAX_IMAGE_GENEREE + 256 * 1024) return reponse({ ok: false, message: 'Fichier trop lourd (4 Mo au plus).' }, 413);
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return reponse({ ok: false, message: 'Envoi illisible. Réessayez.' }, 400);
  }
  const fichier = form.get('fichier');
  if (!(fichier instanceof File) || !fichier.size) return reponse({ ok: false, message: 'Choisissez une image.' }, 400);
  if (fichier.size > TAILLE_MAX_IMAGE_GENEREE) return reponse({ ok: false, message: 'Fichier trop lourd (4 Mo au plus).' }, 413);
  let brut: Partial<DeclarationIa> = {};
  try { brut = JSON.parse(String(form.get('declaration') ?? '{}')); } catch { /* déclaration vide : erreurs ci-dessous */ }
  const { declaration, erreurs } = validerDeclarationIa(brut);
  if (!declaration) return reponse({ ok: false, message: erreurs.join(' '), erreurs }, 400);

  const supabase = await createClient();
  const user = await getUser();
  const r = await importerImageGeneree(supabase, { octets: Buffer.from(await fichier.arrayBuffer()), typeAnnonce: fichier.type || null, declaration, auteurId: user?.id ?? null });
  if (r.ok) {
    revalidatePath('/admin/photos');
    revalidatePath('/admin/retours');
    revalidatePath('/admin/retours/images-a-generer');
    revalidatePath('/admin/illustrations');
  }
  return reponse(r, r.ok ? 200 : r.migration ? 409 : 400);
}
