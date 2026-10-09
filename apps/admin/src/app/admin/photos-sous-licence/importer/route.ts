import { revalidatePath } from 'next/cache';
import { TAILLE_MAX_PHOTO_LICENCE, validerDeclarationLicence, type DeclarationLicence } from '@plateforme/core';
import { exigerAdmin } from '@/lib/admin';
import { importerPhotoSousLicence } from '@/lib/photos-sous-licence';
import { createClient, getUser } from '@/lib/supabase/server';

// « Importer une photo sous licence » (/admin/photos-sous-licence) : fichier téléchargé par Paul lui-même chez la banque (aperçu
// « comp » ou fichier acheté ; multipart, 4 Mo au plus, le navigateur réencode au-delà) + déclaration de traçabilité. Admin seulement.
// AUCUN téléchargement depuis une banque, aucun compte, aucune API payante. Règles : packages/core/src/photos-sous-licence.ts.

export const dynamic = 'force-dynamic';

const reponse = (corps: unknown, statut = 200) => Response.json(corps, { status: statut, headers: { 'cache-control': 'no-store' } });

export async function POST(req: Request) {
  await exigerAdmin();
  const longueur = Number(req.headers.get('content-length') ?? 0);
  if (longueur > TAILLE_MAX_PHOTO_LICENCE + 256 * 1024) return reponse({ ok: false, message: 'Fichier trop lourd (4 Mo au plus).' }, 413);
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return reponse({ ok: false, message: 'Envoi illisible. Réessayez.' }, 400);
  }
  const fichier = form.get('fichier');
  if (!(fichier instanceof File) || !fichier.size) return reponse({ ok: false, message: 'Choisissez une image.' }, 400);
  if (fichier.size > TAILLE_MAX_PHOTO_LICENCE) return reponse({ ok: false, message: 'Fichier trop lourd (4 Mo au plus).' }, 413);
  let brut: Partial<DeclarationLicence> = {};
  try { brut = JSON.parse(String(form.get('declaration') ?? '{}')); } catch { /* déclaration vide : erreurs ci-dessous */ }
  const { declaration, erreurs } = validerDeclarationLicence(brut);
  if (!declaration) return reponse({ ok: false, message: erreurs.join(' '), erreurs }, 400);

  const supabase = await createClient();
  const user = await getUser();
  const r = await importerPhotoSousLicence(supabase, { octets: Buffer.from(await fichier.arrayBuffer()), typeAnnonce: fichier.type || null, declaration, auteurId: user?.id ?? null });
  if (r.ok) revalidatePath('/admin/photos-sous-licence');
  return reponse(r, r.ok ? 200 : r.migration ? 409 : 400);
}
