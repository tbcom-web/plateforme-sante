'use client';

// Liste des photos sous licence : statut (APERÇU SEULEMENT / ACHETÉE), curation, sites rattachés (demandes, licences achetées),
// « Marquer comme achetée pour le site X » (référence, titulaire, date ; la licence est achetée par TBCOM hors plateforme).
import { useState, useTransition } from 'react';
import {
  finApercu, LIBELLES_RATTACHEMENTS, LIBELLES_STATUTS_LICENCE, LIBELLES_TYPES_LICENCE, libelleBanque, libelleSujetKit, type PhotoSousLicence,
} from '@plateforme/core';
import { changerEtatPhoto, marquerAcheteePourSite, retirerDemande, type Resultat } from './actions';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';
const champ = `min-h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 text-base md:text-sm ${focus}`;
const bouton = `min-h-11 rounded-lg border border-neutral-300 bg-white px-3 text-sm font-semibold hover:bg-neutral-50 disabled:opacity-50 ${focus}`;
const aujourdhui = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });

function FormulaireAchat({ photo, sites, siteInitial, onFait }: { photo: PhotoSousLicence; sites: { id: string; nom: string }[]; siteInitial?: string; onFait: (r: Resultat) => void }) {
  const [site, setSite] = useState(siteInitial ?? '');
  const [reference, setReference] = useState('');
  const [titulaire, setTitulaire] = useState(siteInitial ? sites.find((s) => s.id === siteInitial)?.nom ?? '' : '');
  const [dateAchat, setDateAchat] = useState(aujourdhui());
  const [expireLe, setExpireLe] = useState('');
  const [enCours, lancer] = useTransition();
  return (
    <form className="grid gap-2 rounded-lg bg-neutral-50 p-2 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); lancer(async () => onFait(await marquerAcheteePourSite(photo.id!, site, { reference, titulaire, dateAchat, expireLe: expireLe || null }))); }}
      aria-label={`Marquer comme achetée pour un site : ${photo.idImage}`}>
      <label className="grid gap-1 text-sm sm:col-span-2">
        <span className="font-medium">Site</span>
        <select value={site} onChange={(e) => { setSite(e.target.value); if (!titulaire) setTitulaire(sites.find((s) => s.id === e.target.value)?.nom ?? ''); }} className={champ} required>
          <option value="">Choisir le site…</option>
          {sites.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
        </select>
      </label>
      <label className="grid gap-1 text-sm"><span className="font-medium">Référence de facture ou de licence</span><input value={reference} onChange={(e) => setReference(e.target.value)} maxLength={120} className={champ} required /></label>
      <label className="grid gap-1 text-sm"><span className="font-medium">Titulaire (le praticien, licence transférée)</span><input value={titulaire} onChange={(e) => setTitulaire(e.target.value)} maxLength={120} className={champ} required /></label>
      <label className="grid gap-1 text-sm"><span className="font-medium">Date d’achat</span><input type="date" value={dateAchat} max={aujourdhui()} onChange={(e) => setDateAchat(e.target.value)} className={champ} required /></label>
      <label className="grid gap-1 text-sm"><span className="font-medium">Fin de licence (vide : perpétuelle)</span><input type="date" value={expireLe} onChange={(e) => setExpireLe(e.target.value)} className={champ} /></label>
      <button type="submit" disabled={enCours || !site} className={`min-h-11 rounded-lg bg-teal-800 px-3 text-sm font-semibold text-white hover:bg-teal-900 disabled:opacity-50 sm:col-span-2 ${focus}`}>{enCours ? 'Enregistrement…' : 'Marquer comme achetée pour ce site'}</button>
    </form>
  );
}

export default function ListePhotosLicence({ photos, sites, jour }: { photos: PhotoSousLicence[]; sites: { id: string; nom: string }[]; jour: string }) {
  const [ouvert, setOuvert] = useState<{ photo: string; site?: string } | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  const [enCours, lancer] = useTransition();
  const nom = (id: string) => sites.find((s) => s.id === id)?.nom ?? id.slice(0, 8);
  const fait = (r: Resultat) => { if (r) setMessage({ ok: r.ok, texte: r.message }); if (r?.ok) setOuvert(null); };
  if (!photos.length) return <p className="text-sm text-neutral-600">Aucune photo sous licence pour l’instant.</p>;
  return (
    <div className="grid gap-3">
      {message && <p role="status" className={`rounded-lg p-2 text-sm ring-1 ${message.ok ? 'bg-teal-50 text-teal-950 ring-teal-200' : 'bg-red-50 text-red-900 ring-red-200'}`}>{message.texte}</p>}
      <ul className="grid gap-3 lg:grid-cols-2" aria-label="Photos sous licence">
        {photos.map((p) => {
          const fin = finApercu(p);
          const demandes = p.rattachements.filter((r) => r.statut === 'demandee');
          return (
            <li key={p.idFichier} className="grid gap-2 rounded-xl border border-black/5 bg-white p-3 sm:grid-cols-[9rem_minmax(0,1fr)]">
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url.replace(/-\d+\.webp$/, '-640.webp')} alt={`Photo ${libelleBanque(p.banque, p.banqueNom)} ${p.idImage}`} className="aspect-[4/3] w-full rounded-lg object-cover" loading="lazy" />
                <span className="absolute left-1.5 top-1.5 rounded bg-white/95 px-1.5 py-0.5 text-[11px] font-semibold text-neutral-900 ring-1 ring-black/10">Photo premium</span>
              </div>
              <div className="grid content-start gap-1 text-sm">
                <p className="flex flex-wrap items-center gap-2">
                  <span className={`rounded px-1.5 py-0.5 text-xs font-bold ${p.statutLicence === 'apercu' ? 'bg-amber-100 text-amber-950' : 'bg-teal-100 text-teal-950'}`}>{LIBELLES_STATUTS_LICENCE[p.statutLicence]}</span>
                  <span className="font-semibold">{libelleBanque(p.banque, p.banqueNom)} · {p.idImage}</span>
                  <span className="text-xs text-neutral-600">{p.etat === 'validee' ? 'Validée' : p.etat === 'retiree' ? 'Retirée' : 'À valider'}</span>
                </p>
                <p className="text-neutral-700">
                  {LIBELLES_TYPES_LICENCE[p.type]} · {libelleSujetKit(p.sujet)}{p.contributeur ? ` · ${p.contributeur}` : ''}
                  {p.reference ? ` · réf. ${p.reference}` : ''}{p.titulaire ? ` · titulaire ${p.titulaire}` : ''} · {p.sitesParLicence} site(s) par licence
                </p>
                {fin && <p className={`text-xs ${fin < jour ? 'font-semibold text-red-800' : 'text-neutral-600'}`}>Aperçu (comp) valable jusqu’au {fin}{fin < jour ? ' : expiré' : ''} · démo seulement</p>}
                {p.creditRequis && <p className="text-xs text-neutral-600">Crédit exigé : {p.creditTexte}</p>}
                {p.personneReconnaissable && <p className="text-xs text-amber-900">Personne reconnaissable : mention « modèle » dans les crédits</p>}
                <a href={p.pageUrl} target="_blank" rel="noreferrer" className="w-fit text-xs font-semibold text-teal-900 underline underline-offset-4">Page chez la banque</a>
                <div>
                  <p className="text-xs font-semibold text-neutral-700">Sites rattachés</p>
                  {p.rattachements.length === 0 ? <p className="text-xs text-neutral-500">Aucun.</p> : (
                    <ul className="grid gap-1 text-xs">
                      {p.rattachements.map((r) => (
                        <li key={r.siteId} className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{nom(r.siteId)}</span>
                          <span className={r.statut === 'demandee' ? 'text-amber-900' : r.statut === 'achetee' ? 'text-teal-900' : 'text-neutral-500'}>
                            {LIBELLES_RATTACHEMENTS[r.statut]}{r.reference ? ` · réf. ${r.reference}` : ''}{r.expireLe ? ` · jusqu’au ${r.expireLe}` : ''}
                          </span>
                          {r.statut === 'demandee' && p.statutLicence === 'achetee' && (
                            <button type="button" className={`${bouton} min-h-9 px-2 text-xs`} onClick={() => setOuvert({ photo: p.idFichier, site: r.siteId })}>Marquer achetée</button>
                          )}
                          {r.statut === 'demandee' && (
                            <button type="button" className={`${bouton} min-h-9 px-2 text-xs`} disabled={enCours} onClick={() => lancer(async () => fait(await retirerDemande(p.id!, r.siteId)))}>Retirer la demande</button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  {demandes.length > 0 && p.statutLicence === 'apercu' && <p className="mt-1 text-xs text-amber-900">Aperçu demandé : achetez la licence, importez le fichier acheté, puis marquez-le acheté pour ce site.</p>}
                </div>
                <div className="mt-1 flex flex-wrap gap-2">
                  {p.etat !== 'validee' && <button type="button" className={bouton} disabled={enCours} onClick={() => lancer(async () => fait(await changerEtatPhoto(p.id!, 'validee')))}>Valider</button>}
                  {p.etat !== 'retiree' && <button type="button" className={bouton} disabled={enCours} onClick={() => lancer(async () => fait(await changerEtatPhoto(p.id!, 'retiree')))}>Retirer la photo</button>}
                  {p.statutLicence === 'achetee' && p.etat !== 'retiree' && <button type="button" className={bouton} onClick={() => setOuvert(ouvert?.photo === p.idFichier ? null : { photo: p.idFichier })}>Marquer comme achetée pour un site…</button>}
                </div>
                {ouvert?.photo === p.idFichier && <FormulaireAchat key={ouvert.site ?? ''} photo={p} sites={sites} siteInitial={ouvert.site} onFait={fait} />}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
