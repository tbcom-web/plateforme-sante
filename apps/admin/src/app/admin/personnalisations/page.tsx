import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { blocsDuModele, casseLaCharte, controlerPersonnalisations, normaliserDraft, resumePersonnalisations } from '@plateforme/core';
import { getCatalogue } from '@/lib/sites';
import { sitesPersonnalises } from '@/lib/personnalisations-site';
import { annulerPersonnalisations } from '@/app/mon-site/personnaliser/actions';

export const metadata = { title: 'Personnalisations des sites' };

// Admin / commercial : personnalisations des praticiens site par site (« Personnaliser mon site »), alerte quand une
// personnalisation casse la charte (contraste, débordement, texte), annulation complète (retour au modèle).
export default async function PersonnalisationsAdmin() {
  const [sites, catalogue] = await Promise.all([sitesPersonnalises(), getCatalogue()]);
  const lignes = sites.map((s) => {
    const d = normaliserDraft(s.config);
    const modele = Object.fromEntries(Object.keys(s.perso.reglages.pages ?? {}).map((cle) => {
      const c = catalogue.find((x) => `soin:${x.slug}` === cle) as { corps?: string; faq?: { q: string; r: string }[] } | undefined;
      return [cle, blocsDuModele(c?.corps ?? '', c?.faq ?? [])];
    }));
    const titres = catalogue.filter((c) => d.soins.includes(c.slug)).map((c) => c.titre_court);
    const alertes = controlerPersonnalisations(s.perso.reglages, { titres, majuscules: d.theme.typo?.casse === 'majuscules', modele, nomsPages: Object.fromEntries(catalogue.map((c) => [`soin:${c.slug}`, c.titre_court])) });
    return { ...s, alertes, resume: resumePersonnalisations(s.perso.reglages, Object.fromEntries(catalogue.map((c) => [`soin:${c.slug}`, c.titre_court]))), casse: casseLaCharte(alertes) };
  }).sort((a, b) => Number(b.casse) - Number(a.casse));

  async function annuler(form: FormData) {
    'use server';
    await annulerPersonnalisations(String(form.get('site')), String(form.get('version') || '') || null);
    revalidatePath('/admin/personnalisations');
  }

  return (
    <div className="grid gap-4">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Personnalisations des sites</h1>
        <p className="mt-1 max-w-prose text-sm text-neutral-600">Réglages des praticiens (police, taille, couleurs, images, textes), appliqués après la recette. Les sites dont une personnalisation casse la charte passent en premier.</p>
      </header>
      {!lignes.length && <p className="rounded-xl bg-neutral-50 p-4 text-sm text-neutral-600">Aucun site personnalisé pour l’instant.</p>}
      <ul className="grid gap-3">
        {lignes.map((s) => (
          <li key={s.id} className={`grid gap-2 rounded-xl border p-4 ${s.casse ? 'border-red-200 bg-red-50/40' : 'border-black/10 bg-white'}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">{s.nom} <span className="text-xs font-normal text-neutral-500">· version {s.perso.revision}{s.perso.le ? ` · ${new Date(s.perso.le).toLocaleDateString('fr-FR')}` : ''}{s.perso.par === 'admin' ? ' · par un conseiller' : ''}</span></p>
              <span className="flex flex-wrap gap-2">
                {/* État de publication : version figée en ligne comparée au brouillon */}
                {s.publication.etat === 'publie'
                  ? <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-900">Publié</span>
                  : <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-950">{s.publication.etat === 'jamais' ? 'Jamais publié' : `Modifications non publiées${s.publication.revisionEnLigne ? ` (en ligne : version ${s.publication.revisionEnLigne})` : ''}`}</span>}
                {s.casse && <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-900">Casse la charte</span>}
              </span>
            </div>
            <p className="text-sm text-neutral-700">{s.resume.length ? s.resume.map((x) => `${x.libelle} : ${x.valeur}`).join(' · ') : 'Revenu au modèle'}</p>
            {s.alertes.filter((a) => a.niveau !== 'info').length > 0 && (
              <ul className="grid gap-1 text-sm">
                {s.alertes.filter((a) => a.niveau !== 'info').map((a, i) => <li key={i} className={a.niveau === 'casse-charte' ? 'text-red-900' : 'text-amber-900'}>• {a.message}</li>)}
              </ul>
            )}
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <Link href={`/mon-site/personnaliser?site=${s.id}`} className="inline-flex min-h-11 items-center font-semibold text-teal-800 underline-offset-4 hover:underline">Voir et modifier</Link>
              {s.resume.length > 0 && (
                <form action={annuler}>
                  <input type="hidden" name="site" value={s.id} />
                  <input type="hidden" name="version" value={s.updatedAt} />
                  <button className="inline-flex min-h-11 items-center rounded-lg border border-black/15 bg-white px-3 font-semibold hover:bg-neutral-50">Tout annuler (revenir au modèle)</button>
                </form>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
