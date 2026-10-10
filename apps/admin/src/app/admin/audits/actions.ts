'use server';

// AUDITS DE SITES (demande de Paul du 2026-10-10). « Auditer » : lit le site du prospect, prépare un site webpodologue non
// publié à son nom (univers déduit des sujets du site : packages/core/src/audit-prospect.ts), enregistre l'audit et lance le
// workflow auditer-site (aperçu du site préparé, audit des deux sites, rapport web + PDF). Rien n'est publié, rien n'est
// envoyé au praticien : la commerciale transmet elle-même le lien du rapport.
import { revalidatePath } from 'next/cache';
import { soinsDeBaseParcours, universDuParcours, universRecommande } from '@plateforme/core';
import {
  avecVitrine, draftProspect, identiteDepuisPage, imagesHeros, pagesDeSoins, praticienReconnu, prioritesDepuisSujets, sujetsDepuisTexte, texteDeHtml,
  type PraticienAnnuaire,
} from '@plateforme/core/audit-prospect';
import { exigerAdmin } from '@/lib/admin';
import { lancerWorkflow } from '@/lib/publication';
import { createClient } from '@/lib/supabase/server';
import { getUnivers, appliquerUniversAuSite } from '@/lib/univers';
import { getCatalogue } from '@/lib/sites';
import { enregistrerSite } from '@/app/mon-site/actions';

export type ResultatAudit = { ok: boolean; message: string } | null;

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
async function lire(url: string): Promise<{ html: string; url: string } | null> {
  try {
    const r = await fetch(url, { headers: { 'user-agent': UA, 'accept-language': 'fr-FR,fr;q=0.9' }, redirect: 'follow', signal: AbortSignal.timeout(10000), cache: 'no-store' });
    return r.ok ? { html: (await r.text()).slice(0, 2_000_000), url: r.url } : null;
  } catch { return null; }
}

/** « https://www.Cabinet-X.fr/accueil » → « www.cabinet-x.fr » ; null si ce n'est pas un nom de domaine */
function domaineDe(saisie: string): string | null {
  const s = saisie.trim().toLowerCase();
  try {
    const h = new URL(/^https?:\/\//.test(s) ? s : `https://${s}`).hostname;
    return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(h) && !/^(localhost|\d+\.\d+\.\d+\.\d+)$/.test(h) ? h : null;
  } catch { return null; }
}

const sansAccents = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * Photo principale du site actuel, recopiée dans le stockage « photos » du site préparé (les sites n'affichent que des images
 * hébergées chez nous : en-tête CSP). WebP de 1600 px de large au plus ; écartée si elle fait moins de 600 px de large.
 * Elle reste dans un site non publié : le praticien la garde, la remplace ou la retire avant toute mise en ligne.
 */
async function recopierPhoto(supabase: Awaited<ReturnType<typeof createClient>>, siteId: string, candidats: string[]): Promise<string | null> {
  const sharp = ((await import('sharp')) as unknown as { default: typeof import('sharp') }).default;
  for (const url of candidats) {
    try {
      const r = await fetch(url, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(10000), cache: 'no-store' });
      if (!r.ok || !/^image\//.test(r.headers.get('content-type') ?? 'image/')) continue;
      const brut = Buffer.from(await r.arrayBuffer());
      if (brut.length > 15_000_000) continue;
      const image = sharp(brut, { failOn: 'none' }).rotate();
      const { width = 0, height = 0 } = await image.metadata();
      if (width < 600 || height < 300) continue;
      const webp = await image.resize({ width: Math.min(width, 1600), withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
      const chemin = `${siteId}/accueil-${Date.now()}.webp`;
      const { error } = await supabase.storage.from('photos').upload(chemin, webp, { contentType: 'image/webp', cacheControl: '31536000' });
      if (error) continue;
      return supabase.storage.from('photos').getPublicUrl(chemin).data.publicUrl;
    } catch { /* image suivante */ }
  }
  return null;
}

export async function lancerAudit(_: ResultatAudit, formData: FormData): Promise<ResultatAudit> {
  await exigerAdmin();
  const domaine = domaineDe(String(formData.get('domaine') ?? ''));
  if (!domaine) return { ok: false, message: 'Adresse du site invalide (exemple : cabinet-podologie-dupont.fr).' };
  const commercialNom = String(formData.get('commercial_nom') ?? '').trim().slice(0, 80) || null;
  const commercialTel = String(formData.get('commercial_tel') ?? '').trim().slice(0, 30) || null;
  const preparer = formData.get('preparer') !== 'non';

  const page = (await lire(`https://${domaine}/`)) ?? (domaine.startsWith('www.') ? null : await lire(`https://www.${domaine}/`));
  if (!page) return { ok: false, message: `Le site ${domaine} ne répond pas (adresse, ou certificat HTTPS ?).` };

  const supabase = await createClient();
  // L'audit d'abord : sans table (migration 0061 non passée), aucun site préparé orphelin n'est créé
  const { data: audit, error } = await supabase.from('audits')
    .insert({ domaine, commercial_nom: commercialNom, commercial_tel: commercialTel })
    .select('id').single();
  if (error || !audit) return { ok: false, message: 'Audit non enregistré : exécutez la migration 0061_audits_sites.sql dans Supabase.' };

  let siteId: string | null = null;
  let universId: string | null = null;
  let identite: Record<string, unknown> = {};

  if (preparer) {
    const id = identiteDepuisPage(page.html, domaine);
    const autres = await Promise.all(pagesDeSoins(page.html, page.url).map(lire));
    const sujets = sujetsDepuisTexte([id.texte, ...autres.map((p) => (p ? texteDeHtml(p.html) : ''))].join('\n'), id.titre);
    const priorites = prioritesDepuisSujets(sujets);

    // Praticien de l'annuaire RPPS (prospection) : même code postal, sinon même commune, nom présent sur la page
    let candidats: PraticienAnnuaire[] = [];
    if (id.codePostal || id.ville) {
      let q = supabase.from('prospection_liste').select('rpps, nom, prenom, adresse, code_postal, commune').not('rpps', 'is', null).limit(400);
      q = id.codePostal ? q.eq('code_postal', id.codePostal) : q.ilike('commune', `%${sansAccents(id.ville).toUpperCase().replace(/[%_]/g, '')}%`);
      const { data } = await q;
      candidats = (data ?? []) as PraticienAnnuaire[];
    }
    const praticien = praticienReconnu(`${id.titre}\n${id.texte}`, candidats);

    const [{ univers }, catalogue] = await Promise.all([getUnivers(supabase), getCatalogue()]);
    const base = draftProspect(id, priorites, praticien);
    const u = universRecommande(base, universDuParcours(univers));
    universId = u?.id ?? null;
    // Soins de base cochés comme dans le parcours /creer (sujets du cabinet, sinon ceux du style) : le praticien les ajuste
    const draft = { ...base, soins: soinsDeBaseParcours(base, u, catalogue.map((c) => c.slug)) };
    const r = await enregistrerSite(null, draft);
    if (!r.ok || !r.id) {
      await supabase.from('audits').update({ statut: 'echec', erreur: `Site préparé non créé : ${r.message}` }).eq('id', audit.id);
      return { ok: false, message: `Site préparé non créé : ${r.message}` };
    }
    siteId = r.id;
    let courant: { draft: typeof draft; version?: string } = { draft, version: r.version };
    if (universId) {
      const a = await appliquerUniversAuSite(siteId, universId, { admin: true, parcours: true });
      if (a.ok && a.draft) courant = { draft: a.draft, version: a.version };
      else universId = null;
    }
    // Vitrine (Paul, 2026-10-10 : « le futur site doit faire plus envie ») : animation des semelles en tête, photo du cabinet
    const photo = await recopierPhoto(supabase, siteId, imagesHeros(page.html, page.url));
    // Écriture directe, comme appliquerUniversAuSite : le formulaire (enregistrerSite → nettoyer) ne conserve pas
    // theme.variantes ni theme.herosSujet, qui portent l'animation du premier écran.
    let maj = supabase.from('sites').update({ config: avecVitrine(courant.draft, photo) }).eq('id', siteId);
    if (courant.version) maj = maj.eq('updated_at', courant.version);
    await maj;
    const aPhoto = Boolean(photo);
    identite = {
      nomCabinet: id.nomCabinet, ville: id.ville, telephone: id.telephone, rdv: Boolean(id.rdvUrl),
      prenom: draft.praticiens[0].prenom, nom: draft.praticiens[0].nom, rpps: draft.praticiens[0].rpps,
      sujets: sujets.slice(0, 6).map((s) => ({ sujet: s.sujet, score: s.score })), principaux: priorites.principaux, photo: aPhoto,
    };
  }

  if (siteId) await supabase.from('audits').update({ site_id: siteId, univers: universId, identite }).eq('id', audit.id);

  const echec = await lancerWorkflow('auditer-site.yml', { audit_id: audit.id, site_id: siteId ?? '' });
  if (echec) {
    await supabase.from('audits').update({ statut: 'echec', erreur: echec.message }).eq('id', audit.id);
    return { ok: false, message: echec.message };
  }
  revalidatePath('/admin/audits');
  return { ok: true, message: `Audit de ${domaine} lancé : le rapport est prêt dans 4 à 6 minutes${siteId ? ' (site préparé, puis aperçu, puis audit des deux sites)' : ''}.` };
}

/** Relance le workflow d'un audit en échec (même site préparé, même jeton : le lien déjà transmis reste valable) */
export async function relancerAudit(auditId: string): Promise<ResultatAudit> {
  await exigerAdmin();
  if (!/^[0-9a-f-]{36}$/.test(auditId)) return { ok: false, message: 'Audit invalide.' };
  const supabase = await createClient();
  const { data } = await supabase.from('audits').select('id, site_id').eq('id', auditId).maybeSingle();
  if (!data) return { ok: false, message: 'Audit introuvable.' };
  await supabase.from('audits').update({ statut: 'en_attente', erreur: null, fini_le: null }).eq('id', auditId);
  const echec = await lancerWorkflow('auditer-site.yml', { audit_id: data.id, site_id: data.site_id ?? '' });
  revalidatePath('/admin/audits');
  return echec ?? { ok: true, message: 'Audit relancé.' };
}
