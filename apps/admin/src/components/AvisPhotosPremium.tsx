'use client';

// « Cette photo nécessite l'option Photos premium » (parcours et /mon-site ; packages/core/src/photos-sous-licence.ts) : quand le modèle
// ou le choix du praticien contient une photo sous licence d'une banque payante, deux choix clairs :
// - Demander l'option : enregistrement d'une demande (aucun paiement, aucun e-mail) ; TBCOM achète la licence pour ce site ;
// - Remplacer : la photo premium est retirée du brouillon ; la photo du kit, les siennes ou l'illustration reprennent.
// Licence déjà achetée pour ce site : simple mention « Photo premium incluse ».
import { useEffect, useMemo, useState, useTransition } from 'react';
import { MESSAGE_OPTION_PREMIUM, photosPremiumDans, photosPremiumDuDraft, sansPhotosPremium, type PhotoSousLicence, type SiteDraft } from '@plateforme/core';
import { demanderOptionPhotosPremium, lireEtatPhotosPremium } from '@/app/mon-site/actions-premium';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';
const vignette = (u: string) => u.replace(/-\d+\.webp$/, '-640.webp');

export default function AvisPhotosPremium({ siteId, draft, onRemplacer }: { siteId: string | null; draft: SiteDraft; onRemplacer: (d: SiteDraft) => void }) {
  const urls = useMemo(() => photosPremiumDans(draft), [draft]);
  const cle = urls.join('|');
  const [etats, setEtats] = useState<PhotoSousLicence[]>([]);
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  const [enCours, lancer] = useTransition();
  useEffect(() => {
    if (!cle || !siteId) return;
    let actif = true;
    lireEtatPhotosPremium(siteId).then((e) => { if (actif) setEtats(e); }).catch(() => {});
    return () => { actif = false; };
  }, [cle, siteId]);
  if (!urls.length) return null;
  const jour = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });
  const photos = photosPremiumDuDraft(draft, { siteId, photos: etats, jour });
  const aTraiter = photos.filter((p) => p.etat !== 'achetee');
  if (!aTraiter.length) {
    return <p role="note" className="rounded-xl bg-teal-50 p-3 text-sm text-teal-950 ring-1 ring-teal-200">Photo premium incluse : la licence est achetée pour votre site.</p>;
  }
  const demandees = aTraiter.every((p) => p.etat === 'demandee');
  const demander = () => lancer(async () => {
    const r = await demanderOptionPhotosPremium(siteId, aTraiter.map((p) => p.url));
    setMessage({ ok: r.ok, texte: r.message });
    if (r.ok && siteId) setEtats(await lireEtatPhotosPremium(siteId));
  });
  return (
    <section aria-labelledby="avis-premium" className="grid gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
      <div className="flex flex-wrap items-start gap-3">
        <ul className="flex gap-2" aria-label="Photos premium">
          {aTraiter.slice(0, 3).map((p) => (
            <li key={p.url} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={vignette(p.url)} alt="Photo premium de votre modèle" className="h-16 w-24 rounded-lg object-cover ring-1 ring-black/10" />
              <span className="absolute bottom-1 left-1 rounded bg-white/95 px-1 text-[10px] font-semibold text-neutral-900">Photo premium</span>
            </li>
          ))}
        </ul>
        <div className="min-w-0 flex-1">
          <h2 id="avis-premium" className="font-semibold">{MESSAGE_OPTION_PREMIUM}</h2>
          <p className="mt-1">
            {demandees
              ? 'Option demandée : la licence de la photo sera achetée pour votre site, puis vous pourrez publier avec elle. En attendant, vous pouvez la remplacer.'
              : 'Cette photo vient d’une banque d’images payante : pour l’afficher sur votre site publié, une licence doit être achetée à votre nom. Choisissez l’option Photos premium, ou remplacez-la par une photo du kit ou les vôtres.'}
          </p>
          {aTraiter.some((p) => p.etat === 'apercu') && <p className="mt-1 text-xs">Version d’aperçu : elle n’est jamais publiée et disparaît à l’enregistrement.</p>}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {!demandees && (
          <button type="button" disabled={enCours || !siteId} onClick={demander} className={`min-h-11 rounded-xl bg-teal-800 px-4 font-semibold text-white hover:bg-teal-900 disabled:opacity-50 ${focus}`}>
            {enCours ? 'Envoi de la demande…' : 'Demander l’option Photos premium'}
          </button>
        )}
        <button type="button" onClick={() => { onRemplacer(sansPhotosPremium(draft, aTraiter.map((p) => p.url))); setMessage({ ok: true, texte: 'Photo premium retirée : la photo du kit ou vos photos la remplacent. Ajoutez les vôtres dans l’étape Photos.' }); }}
          className={`min-h-11 rounded-xl border border-amber-400 bg-white px-4 font-semibold text-amber-950 hover:bg-amber-100 ${focus}`}>
          Remplacer par une photo du kit ou les miennes
        </button>
      </div>
      {!siteId && <p className="text-xs">Enregistrez d’abord votre site pour demander l’option.</p>}
      <p className="text-xs">Aucun paiement maintenant : la demande est enregistrée et votre conseillère vous confirme le tarif de l’option.</p>
      {message && <p role="status" className={`rounded-lg bg-white p-2 ring-1 ${message.ok ? 'ring-teal-200' : 'ring-red-200 text-red-900'}`}>{message.texte}</p>}
    </section>
  );
}
