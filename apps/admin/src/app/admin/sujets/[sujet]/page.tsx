import Link from 'next/link';
import { notFound } from 'next/navigation';
import { pratiqueDe, profilsDePratique, SEUIL_PHOTOS_SUJET, universDuParcours } from '@plateforme/core';
import { ordonnerSujets, SEUIL_MODELES } from '@plateforme/core/sujets-validation';
import { exigerAdmin } from '@/lib/admin';
import { getProfession } from '@/lib/profession';
import { getEtatPolitique } from '@/lib/politique-evaluation';
import { getDecisionsParJour, getDonneesSujets, assetDeCle } from '@/lib/sujets-validation';
import { getMarquesImportees } from '@/lib/marques';
import { getModelesDisponibles } from '@/lib/modeles';
import { getCatalogue } from '@/lib/sites';
import { themesActives } from '@/lib/themes';
import { getUnivers } from '@/lib/univers';
import { avecDelai, DELAIS } from '@/lib/delai';
import { sourcesConfigurees } from '@/lib/photos-libres';
import SourcerProfil from '../../profils/SourcerProfil';
import { visuelCarte } from '../actions';
import CartesSujet from './CartesSujet';
import type { VisuelArrivage } from '../../arrivages/Arrivages';

export const metadata = { title: 'Super admin · À valider · Sujet' };
// Accepter une série importe ses photos une à une (actions des séries) : délai large
export const maxDuration = 300;

/** Aperçus rendus avec la page (les suivants sont préchargés par le navigateur pendant que Paul décide) */
const APERCUS_INITIAUX = 6;

// UN SUJET, UNE CARTE À LA FOIS (point d'entrée « À valider », packages/core/src/sujets-validation.ts) : nouveautés d'abord, puis les
// éléments du kit du profil selon la politique d'évaluation ; chaque carte montrée EN SITUATION (premier écran, section de soins,
// page de texte, aperçu du site pour les mises en page et animations). OK · Pas OK · J'adore · commentaire · Plus tard.
export default async function PageSujet({ params }: PageProps<'/admin/sujets/[sujet]'>) {
  await exigerAdmin();
  const { sujet: id } = await params;
  const profession = await getProfession();
  const [donnees, jours, politique] = await Promise.all([getDonneesSujets(profession), getDecisionsParJour(), getEtatPolitique()]);
  const sujet = donnees.sujets.find((s) => s.id === decodeURIComponent(id));
  if (!sujet) notFound();
  const cartes = donnees.cartes.get(sujet.id) ?? [];
  const pratique = pratiqueDe(profession.id);
  const profil = sujet.profil ? profilsDePratique(profession.id).find((p) => p.id === sujet.profil) ?? null : null;

  // Soins montrés dans la section « soins » des scènes (titres du catalogue, sinon l'adresse du soin)
  const avecStudio = cartes.some((c) => (c.kind === 'nouveaute' || c.kind === 'element') && assetDeCle(c.cle)?.rendu.kind === 'studio');
  const [catalogue, studio] = await Promise.all([
    avecDelai(getCatalogue(), DELAIS.compteurs, []),
    avecStudio ? Promise.all([getModelesDisponibles(), getCatalogue(), getMarquesImportees(), getUnivers()]) : Promise.resolve(null),
  ]);
  const theme = pratique.themes.find((t) => t.id === sujet.theme);
  const activite = profil?.activites[0] ? pratique.activites.find((a) => a.id === profil.activites[0]) : null;
  const slugs = [...(activite?.soins ?? []), ...(theme?.soins ?? [])].filter((s, i, l) => l.indexOf(s) === i).slice(0, 3);
  const soins = slugs.map((s) => catalogue.find((c) => c.slug === s)?.titre_court ?? s.replace(/-/g, ' '));

  // Premières cartes : aperçus rendus tout de suite (les suivantes : préchargées)
  const visuels: Record<string, VisuelArrivage> = {};
  await Promise.all(cartes.filter((c) => c.kind === 'nouveaute' || c.kind === 'element' || c.kind === 'contenu').filter((c) => c.famille !== 'photo').slice(0, APERCUS_INITIAUX)
    .map(async (c) => { try { visuels[c.cle] = await visuelCarte(c.cle); } catch { /* chargé plus tard */ } }));

  const suivants = ordonnerSujets(donnees.sujets).filter((s) => s.id !== sujet.id && s.aVoir > 0).slice(0, 3).map((s) => ({ id: s.id, libelle: s.libelle, nouveautes: s.nouveautes, aVoir: s.aVoir }));

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-bold sm:text-2xl"><Link href="/admin/sujets" className="text-neutral-500 hover:underline">À valider</Link> <span aria-hidden="true" className="text-neutral-400">›</span> {sujet.libelle}</h1>
        <span className="text-xs text-neutral-500">Vue détaillée : <Link className="underline" href="/admin/arrivages">Arrivages</Link>{profil ? <> · <Link className="underline" href="/admin/profils">Profil</Link></> : null}</span>
      </div>
      {/* Moins de SEUIL_PHOTOS_SUJET photos : l'agent source une série (series-photos-activites.ts), qui arrive ici comme carte */}
      {profil?.principal && sujet.photos < SEUIL_PHOTOS_SUJET && !sujet.serieEnAttente && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          <span>{sujet.photos} photo{sujet.photos > 1 ? 's' : ''} sur {SEUIL_PHOTOS_SUJET} attendues pour ce sujet.</span>
          <SourcerProfil profil={profil.id} pret={Object.values(sourcesConfigurees()).some(Boolean)} lien={null} texte="Sourcer des photos" />
        </div>
      )}
      <CartesSujet
        sujet={{ id: sujet.id, libelle: sujet.libelle, profil: sujet.profil, okServeur: sujet.ok, total: sujet.total, aVoir: sujet.aVoir }}
        cartes={cartes}
        visuelsInitiaux={visuels}
        politique={politique}
        jours={jours.jours}
        aujourdhui={jours.aujourdhui}
        scene={{ metier: pratique.vocabulaire.metier, pour: profil?.pour ?? theme?.pour ?? pratique.vocabulaire.discipline, soins }}
        studio={studio ? { proposes: universDuParcours(studio[3].univers), modeles: studio[0].map((m) => ({ id: m.id, manifeste: m.manifeste })), catalogue: studio[1], marquesImportees: studio[2], themesActives: themesActives() } : null}
        suivants={suivants}
        seuilModeles={SEUIL_MODELES}
      />
    </div>
  );
}
