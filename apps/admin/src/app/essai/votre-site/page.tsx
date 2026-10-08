import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import ContexteImages from '@/components/ContexteImages';
import { getUser } from '@/lib/supabase/server';
import { getRole } from '@/lib/admin';
import { estModeTest } from '@/lib/mode-test';
import { annuaireConfigure, annuaireDemo } from '@/lib/annuaire-sante';
import { getCatalogue, getMonSite } from '@/lib/sites';
import { getModelesDisponibles } from '@/lib/modeles';
import { getMarquesImportees } from '@/lib/marques';
import { getUnivers } from '@/lib/univers';
import { themesActives } from '@/lib/themes';
import { getDefautsMobileOuverts, getRecettesLecture } from '@/lib/recettes';
import { publicationDepuisLigne, recetteDepuisLigne, type PublicationRecette, type Recette } from '@plateforme/core';
import { createClient } from '@/lib/supabase/server';
import Onboarding from './Onboarding';
import { etatsProfessionsParcours } from '@/lib/professions-parcours';
import { capturerRenduClient, chercherAnnuaire, enregistrerSiteClient, inscrireListeAttente } from './actions';

export const metadata: Metadata = {
  title: 'Votre site en quelques minutes',
  description: 'Profession, informations du cabinet, sujets et style : votre site prend forme sous vos yeux.',
  robots: { index: false, follow: false },
};

// Parcours client (« landing d'onboarding », demande de Paul du 2026-10-08) : profession, informations préremplies depuis
// l'Annuaire Santé si le praticien le souhaite (il confirme tout), sujets, activités, couleurs, « Choisissez votre style »
// (J'aime / Pas pour moi), puis « Voir mon site » (rendu immédiat, e-mail demandé à ce moment : flux de l'essai existant).
// Session ANONYME ouverte par /essai/commencer (aucune donnée tant que le praticien ne la donne pas) ; rien n'est publié.
// Site déjà commencé : suite dans /creer. Super admin : seulement en MODE TEST (/admin/tester-parcours), sans aucune écriture.
/** Recettes publiées pour les profils de pratique d'une profession (recettes_publiees, migration 0043) ; vides sans elle */
async function recettesPubliees(profession: string): Promise<{ recettes: Recette[]; publications: PublicationRecette[] }> {
  try {
    const { data, error } = await (await createClient()).rpc('recettes_publiees', { p_profession: profession });
    if (error || !Array.isArray(data)) return { recettes: [], publications: [] };
    const lignes = data as Record<string, unknown>[];
    return {
      recettes: lignes.map((l) => recetteDepuisLigne(l)).filter((r): r is Recette => Boolean(r)),
      publications: lignes.map((l) => publicationDepuisLigne({ ...l, recette: l.id, publiee: true })).filter((x): x is PublicationRecette => Boolean(x)),
    };
  } catch {
    return { recettes: [], publications: [] };
  }
}

export default async function PageVotreSite({ searchParams }: PageProps<'/essai/votre-site'>) {
  const user = await getUser();
  if (!user) redirect('/essai/commencer');
  const test = await estModeTest();
  // Site déjà commencé ailleurs (ce navigateur n'a pas l'état du parcours) : le navigateur ouvre /creer (Onboarding). Pas de
  // redirection serveur ici : la page est re-rendue après chaque action (enregistrement du site) et doit rester affichée.
  let siteCommence = false;
  if (!test) {
    if ((await getRole()) === 'admin') redirect('/admin/tester-parcours');
    if (!user.is_anonymous) redirect('/creer');
    const site = await getMonSite();
    siteCommence = Boolean(site.id && site.draft.theme.univers);
  }
  const p = await searchParams;
  const un = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

  // Professions ouvertes au public : parcours disponible, profession publique ET pack publiable (lib/professions-parcours.ts) ;
  // en mode test, les professions en préparation sont testables (fiches de leur pack en catalogue de démonstration).
  // Recettes publiées des profils de la profession par défaut (seule ouverte aujourd'hui).
  const [catalogue, modeles, marquesImportees, { univers }, recettes, defautsMobile, publiees, professions] = await Promise.all([
    getCatalogue(), getModelesDisponibles(), getMarquesImportees(), getUnivers(), getRecettesLecture(4), getDefautsMobileOuverts(), recettesPubliees('podologue'), etatsProfessionsParcours(test),
  ]);

  return (
    <>
      <ContexteImages praticien />
      <Onboarding
        siteCommence={siteCommence}
        test={test ? { persona: un(p.persona) || 'vierge', etape: un(p.etape), neuf: un(p.neuf) === '1' } : null}
        annuaire={test || annuaireDemo() ? 'demonstration' : annuaireConfigure() ? 'actif' : 'indisponible'}
        catalogue={catalogue}
        modeles={modeles}
        marquesImportees={marquesImportees}
        univers={univers}
        recettes={recettes}
        publiees={publiees}
        defautsMobile={defautsMobile}
        themesActives={themesActives()}
        professions={professions}
        actions={{ chercher: chercherAnnuaire, enregistrer: enregistrerSiteClient, capturer: capturerRenduClient, listeAttente: inscrireListeAttente }}
      />
    </>
  );
}
