'use client';

// Provenance d'une photo envoyée à la main (obligatoire à l'envoi, ou pour compléter une photo « Source à renseigner ») :
// Adobe Stock (référence de licence), photo personnelle / réalisée pour le cabinet (auteur), autre banque (nom, page, licence).
import { useId, useState } from 'react';
import { LIBELLES_PROVENANCES, PROVENANCES_PHOTO, validerSourcePhoto, type ProvenancePhoto, type SourcePhotoManuelle } from '@plateforme/core';

const champ = 'min-h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 text-base md:text-sm';

type Props = {
  libelleBouton: string;
  onValider: (s: SourcePhotoManuelle) => void;
  onAnnuler?: () => void;
  desactive?: boolean;
};

export default function FormulaireSource({ libelleBouton, onValider, onAnnuler, desactive = false }: Props) {
  const id = useId();
  const [valeurs, setValeurs] = useState<Record<string, string>>({ provenance: '' });
  const [erreurs, setErreurs] = useState<string[]>([]);
  const p = valeurs.provenance as ProvenancePhoto | '';
  const maj = (k: string, v: string) => setValeurs((x) => ({ ...x, [k]: v }));
  const saisie = (k: string, label: string, opts: { type?: string; placeholder?: string } = {}) => (
    <label className="grid gap-1 text-sm">
      <span>{label}</span>
      <input type={opts.type ?? 'text'} value={valeurs[k] ?? ''} onChange={(e) => maj(k, e.target.value)} placeholder={opts.placeholder} className={champ} />
    </label>
  );
  const valider = () => {
    const r = validerSourcePhoto(valeurs);
    setErreurs(r.erreurs);
    if (r.source) onValider(r.source);
  };
  return (
    <div className="grid gap-2 rounded-lg border border-amber-200 bg-amber-50/60 p-3">
      <fieldset className="grid gap-1.5">
        <legend className="mb-1 text-sm font-medium text-amber-950">Provenance de la photo <span className="font-normal text-neutral-600">(obligatoire)</span></legend>
        {PROVENANCES_PHOTO.map((x) => (
          <label key={x} className="flex min-h-11 items-center gap-2 text-sm">
            <input type="radio" name={`${id}-provenance`} value={x} checked={p === x} onChange={() => maj('provenance', x)} className="size-4 accent-teal-700" />
            {LIBELLES_PROVENANCES[x]}
          </label>
        ))}
      </fieldset>
      {p === 'adobe-stock' && saisie('referenceLicence', 'Référence de la licence Adobe Stock')}
      {p === 'personnelle' && saisie('auteur', 'Auteur (photographe ou cabinet)')}
      {p === 'autre-banque' && (
        <div className="grid gap-2 sm:grid-cols-2">
          {saisie('banque', 'Nom de la banque')}
          {saisie('urlSource', 'Adresse de la photo dans la banque', { type: 'url', placeholder: 'https://…' })}
          {saisie('licence', 'Licence (nom)')}
          {saisie('licenceUrl', 'Lien de la licence (facultatif)', { type: 'url', placeholder: 'https://…' })}
          {saisie('auteur', 'Auteur (facultatif)')}
        </div>
      )}
      {erreurs.length > 0 && <p role="alert" className="text-sm text-red-800">{erreurs.join(' ')}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={valider} disabled={desactive || !p} className="min-h-11 rounded-xl bg-teal-800 px-4 text-sm font-semibold text-white hover:bg-teal-900 disabled:opacity-50">{libelleBouton}</button>
        {onAnnuler && <button type="button" onClick={onAnnuler} className="min-h-11 rounded-xl px-3 text-sm font-semibold text-neutral-700">Annuler</button>}
      </div>
    </div>
  );
}
