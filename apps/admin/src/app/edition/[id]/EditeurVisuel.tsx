'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { definitionChamp, verifierTexte, type DefinitionChamp } from '@plateforme/core';
import { envoyerPhoto, TAILLE_MAX } from '@/lib/envoi-photo';
import SaisieGardee from '@/components/SaisieGardee';
import ConfirmationPublication from '@/components/ConfirmationPublication';
import { garderLocalement, oublierLocalement } from '@/lib/brouillon-local';
import { enregistrerEdition, etatApercu, lancerApercu, publierDepuisEdition, type ResultatEdition } from './actions';

type Props = { siteId: string; slug: string | null; version: string | null; edition: boolean; textesInitiaux: Record<string, string>; champs: DefinitionChamp[]; remplacements?: string[] };

// Recadrage des photos selon l'emplacement (portraits en 4:5, le reste libre).
const ratioPhoto = (emplacement: string) => (emplacement.startsWith('praticien.') ? 4 / 5 : null);

export default function EditeurVisuel({ siteId, slug: slugInitial, version: versionInitiale, edition, textesInitiaux, champs, remplacements = [] }: Props) {
  const cadre = useRef<HTMLIFrameElement>(null);
  const fichier = useRef<HTMLInputElement>(null);
  const [slug, setSlug] = useState(slugInitial);
  // Date de modification du brouillon lue : l'enregistrement est refusé si quelqu'un l'a modifié depuis.
  const [version, setVersion] = useState(versionInitiale);
  const [genere, setGenere] = useState<string | null>(null);
  const [recharge, setRecharge] = useState(0);
  const [textes, setTextes] = useState<Record<string, string>>({});
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [actif, setActif] = useState<string | null>(null);
  const [photoCible, setPhotoCible] = useState<string | null>(null);
  const [message, setMessage] = useState<ResultatEdition | { ok: boolean; message: string } | null>(null);
  const [attente, setAttente] = useState(false);
  const [enCours, demarrer] = useTransition();
  // Rien n'empêche la publication : avec des informations manquantes, la même confirmation que /mon-site les liste.
  const [confirmer, setConfirmer] = useState(false);
  const publierMaintenant = () => { setConfirmer(false); demarrer(async () => setMessage(await publierDepuisEdition(siteId))); };

  const url = slug ? `https://apercu.${slug}.pages.dev/` : null;
  const origine = url ? new URL(url).origin : null;
  const modifie = Object.keys(textes).length + Object.keys(photos).length;
  const guides = champs.filter((c) => c.niveau === 'guide').map((c) => c.cle);

  const envoyer = useCallback((m: object) => origine && cadre.current?.contentWindow?.postMessage(m, origine), [origine]);

  // État de l'aperçu en ligne.
  useEffect(() => { etatApercu(siteId).then((e) => { setSlug(e.slug); setGenere(e.genere); }); }, [siteId]);

  // Messages de l'aperçu (origine vérifiée).
  useEffect(() => {
    const ecoute = (e: MessageEvent) => {
      if (!origine || e.origin !== origine || e.source !== cadre.current?.contentWindow) return;
      const m = e.data ?? {};
      if (m.type === 'pret') envoyer({ type: 'init', edition, guides });
      if (m.type === 'texte' && typeof m.cle === 'string') { setActif(m.cle); setTextes((t) => ({ ...t, [m.cle]: String(m.valeur ?? '') })); }
      if (m.type === 'photo' && typeof m.emplacement === 'string') { setPhotoCible(m.emplacement); fichier.current?.click(); }
    };
    addEventListener('message', ecoute);
    return () => removeEventListener('message', ecoute);
  }, [origine, edition, guides, envoyer]);

  async function remplacerPhoto(f: File) {
    if (!photoCible) return;
    setMessage({ ok: true, message: 'Optimisation et envoi de la photo…' });
    try {
      const { url: u, taille } = await envoyerPhoto(siteId, photoCible.replace(/\W+/g, '-'), f, ratioPhoto(photoCible), TAILLE_MAX);
      setPhotos((p) => ({ ...p, [photoCible]: u }));
      envoyer({ type: 'photo-ok', emplacement: photoCible, url: u });
      setMessage({ ok: true, message: `Photo remplacée (${Math.round(taille / 1024)} Ko). Pensez à enregistrer.` });
    } catch {
      setMessage({ ok: false, message: 'Envoi impossible. Vérifiez le format de l’image.' });
    }
  }

  // Régénère l'aperçu puis attend sa mise en ligne (vérification toutes les 10 s, 4 minutes au plus).
  function regenerer() {
    demarrer(async () => {
      const avant = genere;
      const r = await lancerApercu(siteId);
      setMessage(r);
      if (!r.ok) return;
      setAttente(true);
      for (let k = 0; k < 24; k++) {
        await new Promise((ok) => setTimeout(ok, 10_000));
        const e = await etatApercu(siteId);
        if (e.slug) setSlug(e.slug);
        if (e.genere && e.genere !== avant) { setGenere(e.genere); setRecharge((n) => n + 1); setMessage({ ok: true, message: 'Aperçu à jour.' }); break; }
      }
      setAttente(false);
    });
  }

  const def = actif ? definitionChamp(actif) : undefined;
  const valeurActive = actif ? textes[actif] ?? textesInitiaux[actif] ?? '' : '';
  const alertes = actif && valeurActive ? verifierTexte(valeurActive, 'standard') : [];

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[1fr_340px]">
      <div className="relative min-h-0 bg-neutral-200">
        {url && genere ? (
          <iframe key={recharge} ref={cadre} src={url} title="Aperçu du site" className="h-full w-full border-0 bg-white" />
        ) : (
          <div className="grid h-full place-items-center p-8 text-center text-sm text-neutral-600">
            <div className="max-w-sm">
              <p className="font-semibold text-neutral-800">Aucun aperçu pour le moment</p>
              <p className="mt-1">L’aperçu est une copie privée de votre site, non référencée, sur laquelle vous cliquez pour modifier photos et textes.</p>
              <button type="button" disabled={enCours} onClick={regenerer} className="mt-4 rounded-lg bg-teal-800 px-4 py-2.5 font-semibold text-white disabled:opacity-50">
                {attente ? 'Préparation… (1 à 2 minutes)' : 'Générer l’aperçu'}
              </button>
            </div>
          </div>
        )}
      </div>

      <aside className="flex min-h-0 flex-col gap-4 overflow-y-auto border-l border-black/5 bg-white p-4 text-sm">
        <SaisieGardee<{ textes: Record<string, string>; photos: Record<string, string> }>
          espace="edition"
          id={siteId}
          onReprendre={(v) => { setTextes(v.textes ?? {}); setPhotos(v.photos ?? {}); setMessage({ ok: true, message: 'Saisie reprise : enregistrez pour la conserver.' }); }}
        />
        <section>
          <h2 className="font-semibold">Comment modifier</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-neutral-600">
            <li>Cliquez sur <strong>« Remplacer la photo »</strong> sur une image.</li>
            <li>Cliquez sur un <strong>texte encadré</strong> et écrivez directement.</li>
            {!edition && <li>Les textes encadrés en orange se personnalisent avec l’<strong>option « édition »</strong>.</li>}
          </ul>
        </section>

        {actif && def && (
          <section className="rounded-xl border border-black/5 bg-neutral-50 p-3">
            <p className="font-semibold">{def.libelle}</p>
            <p className={`mt-1 text-xs ${valeurActive.length > def.max ? 'text-red-700' : 'text-neutral-500'}`}>{valeurActive.length} / {def.max} caractères</p>
            {alertes.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs">
                {alertes.map((a) => (
                  <li key={a.extrait + a.raison} className={a.bloquante ? 'text-red-700' : 'text-amber-800'}>
                    « {a.extrait} » : {a.raison}{a.suggestion ? ` (préférez : ${a.suggestion})` : ''}
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              onClick={() => { setTextes((t) => ({ ...t, [actif]: '' })); envoyer({ type: 'retablir', cle: actif }); }}
              className="mt-3 text-xs font-semibold text-teal-800 underline-offset-4 hover:underline"
            >
              Revenir au texte standard
            </button>
          </section>
        )}

        {message && (
          <div className={`rounded-lg p-3 text-xs ${message.ok ? 'bg-teal-50 text-teal-900' : 'bg-red-50 text-red-800'}`}>
            <p className="font-medium">{message.message}</p>
            {'refus' in message && message.refus && Object.keys(message.refus).length > 0 && (
              <ul className="mt-1 list-disc pl-4">{Object.entries(message.refus).map(([k, v]) => <li key={k}>{definitionChamp(k)?.libelle ?? k} : {v}</li>)}</ul>
            )}
          </div>
        )}

        <div className="mt-auto grid gap-2 border-t border-neutral-100 pt-4">
          <button
            type="button"
            disabled={enCours || modifie === 0}
            onClick={() => demarrer(async () => {
              const r = await enregistrerEdition(siteId, textes, photos, version);
              setMessage(r);
              if (r.version) setVersion(r.version);
              if (r.conflit) garderLocalement('edition', siteId, { textes, photos });
              if (r.ok) { setTextes({}); setPhotos({}); oublierLocalement('edition', siteId); }
            })}
            className="rounded-lg bg-teal-800 px-4 py-2.5 font-semibold text-white hover:bg-teal-900 disabled:opacity-50"
          >
            {modifie ? `Enregistrer (${modifie} modification${modifie > 1 ? 's' : ''})` : 'Aucune modification'}
          </button>
          <button type="button" disabled={enCours || attente} onClick={regenerer} className="rounded-lg border border-neutral-300 px-4 py-2.5 font-semibold hover:bg-neutral-50 disabled:opacity-50">
            {attente ? 'Mise à jour de l’aperçu…' : 'Mettre à jour l’aperçu'}
          </button>
          <button
            type="button"
            disabled={enCours || modifie > 0}
            title={modifie > 0 ? 'Enregistrez d’abord vos modifications' : undefined}
            onClick={() => (remplacements.length ? setConfirmer(true) : publierMaintenant())}
            className="rounded-lg border border-teal-800 px-4 py-2.5 font-semibold text-teal-900 hover:bg-teal-50 disabled:opacity-50"
          >
            Publier le site
          </button>
          {confirmer && <ConfirmationPublication remplacements={remplacements} onConfirmer={publierMaintenant} onAnnuler={() => setConfirmer(false)} enCours={enCours} />}
          {genere && <p className="text-xs text-neutral-500">Aperçu du {new Date(genere).toLocaleString('fr-FR')}</p>}
        </div>
      </aside>

      <input
        ref={fichier}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => { const f = e.target.files?.[0]; if (f) remplacerPhoto(f); e.target.value = ''; }}
      />
    </div>
  );
}
