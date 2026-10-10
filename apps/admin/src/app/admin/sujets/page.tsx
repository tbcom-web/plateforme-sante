import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { CSSProperties } from 'react';
import '@plateforme/core/dessins.css';
import { clesRecentes, jourParis, profilsSeriesASourcer, SEUIL_PHOTOS_SUJET, SURFACES_CSS, variablesCharte, variablesGamme, gamme as gammeParId } from '@plateforme/core';
import { lotDeCle } from '@plateforme/core/arrivages';
import { lienSujet, ordonnerSujets, sujetDeCle, sujetDuLot } from '@plateforme/core/sujets-validation';
import { exigerAdmin } from '@/lib/admin';
import { getProfession } from '@/lib/profession';
import { getDecisionsParJour, getDonneesSujets } from '@/lib/sujets-validation';
import { sourcesConfigurees } from '@/lib/photos-libres';
import SourcerSeriesActivites from './SourcerSeriesActivites';
import { visuelCarte } from './actions';
import BandeauJour from './BandeauJour';
import TuilesSujets from './TuilesSujets';
import type { VisuelArrivage } from '../arrivages/Arrivages';

export const metadata = { title: 'Super admin · À valider' };
// « Sourcer des photos » lance l'agent depuis cette page (une action serveur par profil) : délai large
export const maxDuration = 300;

// POINT D'ENTRÉE UNIQUE « À VALIDER » (demande de Paul du 2026-10-10, packages/core/src/sujets-validation.ts, docs/a-valider.md) :
// une tuile par sujet (golf, cyclisme, diabète, enfant…) avec sa représentation graphique (aperçu composite), sa progression
// (vus / à voir, part OK) et ses nouveautés ; sujets avec nouveautés d'abord. Un geste ouvre le sujet (une carte à la fois).
// ?nouveautes=<lot> (lien envoyé après une livraison, nouveautes.ts lienNouveautes) : ouvre directement le sujet du lot.

export default async function PageSujets({ searchParams }: PageProps<'/admin/sujets'>) {
  await exigerAdmin();
  const sp = await searchParams;
  const profession = await getProfession();
  const [donnees, jours] = await Promise.all([getDonneesSujets(profession), getDecisionsParJour()]);
  const ordre = donnees.sujets.map((s) => s.id);

  // Lien d'une livraison : le sujet qui contient le plus d'éléments du lot (nouveautés encore en attente, sinon tout le lot)
  const lot = typeof sp.nouveautes === 'string' ? sp.nouveautes.trim() : '';
  if (lot) {
    const dans = (cle: string, date: string | null) => lot === 'tout' || lot === '1' || (date ? lotDeCle(cle, date) === lot || lotDeCle(cle, date).split('@')[0] === lot : false);
    const attente = [...donnees.cartes.entries()].flatMap(([s, l]) => l.filter((c) => c.nouveaute && dans(c.cle, c.date)).map((c) => ({ s, cle: c.cle })));
    const cible = attente.length
      ? sujetDuLot(attente.map((x) => x.cle), (k) => attente.find((x) => x.cle === k)!.s, ordre)
      : sujetDuLot(clesRecentes(jourParis(new Date())).filter((r) => dans(r.cle, r.date)).map((r) => r.cle), (k) => sujetDeCle(k, { profession: profession.id }), ordre);
    if (cible) redirect(lienSujet(cible));
  }

  const sujets = ordonnerSujets(donnees.sujets).filter((s) => s.total > 0);
  const vides = donnees.sujets.filter((s) => s.total === 0);
  // Aperçus composites : 3 vignettes par sujet (nouveautés d'abord)
  const apercus = new Map<string, VisuelArrivage | null>();
  await Promise.all(sujets.flatMap((s) => s.apercu.slice(0, 3)).map(async (id) => {
    const c = [...donnees.cartes.values()].flat().find((x) => x.id === id);
    if (!c || c.kind === 'photo' || c.kind === 'serie' || c.kind === 'contenu' || c.famille === 'photo') { apercus.set(id, null); return; }
    try { apercus.set(id, await visuelCarte(c.cle)); } catch { apercus.set(id, null); }
  }));
  const carteDe = (id: string) => [...donnees.cartes.values()].flat().find((x) => x.id === id)!;
  const enAttente = sujets.reduce((n, s) => n + s.nouveautes, 0);
  // Photos à compléter (séries d'activité, series-photos-activites.ts) : profils sous le seuil, sans série en attente
  const pret = Object.values(sourcesConfigurees()).some(Boolean);
  const parId = new Map(donnees.sujets.map((s) => [s.id, s]));
  const aSourcer = profession.id === 'podologue'
    ? profilsSeriesASourcer(Object.fromEntries(donnees.sujets.map((s) => [s.id, s.photos])), donnees.sujets.filter((s) => s.serieEnAttente).map((s) => s.id))
      .filter((id) => parId.has(id)).map((id) => ({ id, libelle: parId.get(id)!.libelle, photos: parId.get(id)!.photos, href: lienSujet(id) }))
    : [];
  const sourcer = Object.fromEntries(sujets.filter((s) => s.profil && s.photos < SEUIL_PHOTOS_SUJET && !s.serieEnAttente).map((s) => [s.id, { profil: s.profil!, photos: s.photos }]));
  const style = { ...variablesCharte(), ...variablesGamme(gammeParId('canard')!) } as CSSProperties;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5" style={style}>
      <style>{SURFACES_CSS + '.sv-svg svg{width:100%;height:100%;display:block}'}</style>
      <div className="grid gap-1">
        <h1 className="text-2xl font-bold">À valider</h1>
        <p className="max-w-3xl text-sm text-neutral-600">
          Un seul endroit. Choisis un sujet : une carte à la fois, montrée en situation. OK, Pas OK, un commentaire si tu veux.
          {enAttente > 0 ? <> <strong className="text-neutral-900">{enAttente} nouveauté{enAttente > 1 ? 's' : ''}</strong> t’attend{enAttente > 1 ? 'ent' : ''}.</> : ' Rien de nouveau : les sujets ci-dessous peuvent encore être affinés.'}
        </p>
      </div>
      <BandeauJour jours={jours.jours} aujourdhui={jours.aujourdhui} />
      <SourcerSeriesActivites profils={aSourcer} pret={pret} />
      <TuilesSujets sujets={sujets} cartes={Object.fromEntries(sujets.flatMap((s) => s.apercu.slice(0, 3)).map((id) => [id, carteDe(id)]))} apercus={Object.fromEntries(apercus)} sourcer={sourcer} pret={pret} seuil={SEUIL_PHOTOS_SUJET} />
      {vides.length > 0 && <p className="text-xs text-neutral-500">Sans élément pour l’instant : {vides.map((s) => s.libelle).join(', ')}.</p>}
      {donnees.migrationSeries && <p className="text-xs text-neutral-500">Séries de l’agent : migration 0053 à exécuter pour les voir ici.</p>}
      <p className="text-xs text-neutral-500">
        Vues détaillées (anciennes pages) : <Link className="underline" href="/admin/arrivages">Arrivages</Link> · <Link className="underline" href="/admin/retours">Tuiles</Link> · <Link className="underline" href="/admin/degustation">Dégustation</Link> · <Link className="underline" href="/admin/profils">Profils</Link>
      </p>
    </div>
  );
}
