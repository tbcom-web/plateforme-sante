'use client';

// « Importer une photo sous licence » : un fichier ou un LOT (12 au plus, mêmes informations) téléchargé par Paul lui-même chez la
// banque (aperçu « comp » ou fichier acheté). Traçabilité obligatoire (photos-sous-licence.ts : validerDeclarationLicence), contrôles
// dans le navigateur puis sur le serveur (route importer/, un envoi par fichier). Au-delà de 4 Mo, réencodage JPEG dans le navigateur.
// Aucun téléchargement depuis une banque, aucun compte, aucune API payante.
import { useId, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BANQUES_PAYANTES, banquePayante, contientGpsExif, creditParDefaut, GRAND_COTE_MIN_APERCU, GRAND_COTE_MIN_LICENCE, LIBELLES_TYPES_LICENCE, libelleSujetKit, LOT_MAX_LICENCE,
  SUJETS_KITS, TAILLE_MAX_FICHIER_CHOISI, TAILLE_MAX_PHOTO_LICENCE, TYPES_LICENCE, typeImageDepuisOctets, validerDeclarationLicence, type DeclarationLicence, type TypeLicence,
} from '@plateforme/core';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';
const champ = `min-h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 text-base md:text-sm ${focus}`;
const aujourdhui = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });
const nouveauLot = () => Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => b.toString(16).padStart(2, '0')).join('');

async function reencoder(f: Blob): Promise<Blob> {
  const img = await createImageBitmap(f);
  const k = Math.min(1, 2560 / Math.max(img.width, img.height));
  const c = document.createElement('canvas');
  c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
  for (const q of [0.92, 0.85, 0.78]) {
    const b = await new Promise<Blob | null>((ok) => c.toBlob(ok, 'image/jpeg', q));
    if (b && b.size <= TAILLE_MAX_PHOTO_LICENCE) return b;
  }
  throw new Error('trop lourd');
}

type Choisi = { id: string; fichier: File; apercu: string; l: number; h: number; etat: 'pret' | 'envoi' | 'ok' | 'erreur'; message?: string };

async function controler(f: File, apercu: boolean): Promise<{ l: number; h: number } | string> {
  if (f.size > TAILLE_MAX_FICHIER_CHOISI) return 'Fichier trop lourd (30 Mo au plus).';
  const debut = new Uint8Array(await f.slice(0, 512 * 1024).arrayBuffer());
  if (!typeImageDepuisOctets(debut)) return 'Format refusé : PNG, JPEG ou WebP seulement.';
  if (contientGpsExif(debut)) return 'Localisation GPS dans les métadonnées : refusée.';
  try {
    const img = await createImageBitmap(f);
    const min = apercu ? GRAND_COTE_MIN_APERCU : GRAND_COTE_MIN_LICENCE;
    if (Math.max(img.width, img.height) < min) return `Image trop petite (${img.width} × ${img.height} px) : grand côté ${min} px au moins.`;
    return { l: img.width, h: img.height };
  } catch { return 'Image illisible.'; }
}

export default function ImportPhotoLicence({ migrationManquante }: { migrationManquante: boolean }) {
  const router = useRouter();
  const id = useId();
  const [choisis, setChoisis] = useState<Choisi[]>([]);
  const [refuses, setRefuses] = useState<string[]>([]);
  const [banque, setBanque] = useState('adobe-stock');
  const [banqueAutre, setBanqueAutre] = useState('');
  const [idImage, setIdImage] = useState('');
  const [pageUrl, setPageUrl] = useState('');
  const [contributeur, setContributeur] = useState('');
  const [sujet, setSujet] = useState<string>('general');
  const [type, setType] = useState<TypeLicence>('apercu');
  const [telechargeLe, setTelechargeLe] = useState(aujourdhui());
  const [titulaire, setTitulaire] = useState('TBCOM');
  const [dateAchat, setDateAchat] = useState(aujourdhui());
  const [reference, setReference] = useState('');
  const [expireLe, setExpireLe] = useState('');
  const [sitesParLicence, setSitesParLicence] = useState(1);
  const [creditRequis, setCreditRequis] = useState(false);
  const [creditTexte, setCreditTexte] = useState('');
  const [restrictions, setRestrictions] = useState('');
  const [personneReconnaissable, setPersonneReconnaissable] = useState(false);
  const [aucunePathologie, setAucunePathologie] = useState(false);
  const [conditionsVerifiees, setConditionsVerifiees] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [lot] = useState(nouveauLot);
  const b = banquePayante(banque);
  const apercu = type === 'apercu';

  const declaration: Partial<DeclarationLicence> = useMemo(() => ({
    banque, banqueAutre, idImage, pageUrl, contributeur, sujet, type, statut: apercu ? 'apercu' : 'achetee', telechargeLe,
    titulaire: apercu ? null : titulaire, dateAchat: apercu ? null : dateAchat, reference: apercu ? null : reference, expireLe: apercu ? null : expireLe || null,
    sitesParLicence, creditRequis, creditTexte, restrictions, personneReconnaissable, aucunePathologie, conditionsVerifiees, lot: choisis.length > 1 ? lot : null,
  }), [banque, banqueAutre, idImage, pageUrl, contributeur, sujet, type, apercu, telechargeLe, titulaire, dateAchat, reference, expireLe, sitesParLicence, creditRequis, creditTexte, restrictions, personneReconnaissable, aucunePathologie, conditionsVerifiees, choisis.length, lot]);

  const ajouter = async (liste: FileList | null) => {
    setMessage(null);
    const fichiers = [...(liste ?? [])];
    const place = LOT_MAX_LICENCE - choisis.filter((c) => c.etat !== 'ok').length;
    const pris = fichiers.slice(0, Math.max(0, place));
    const ref: string[] = fichiers.length > pris.length ? [`${fichiers.length - pris.length} fichier(s) en trop : ${LOT_MAX_LICENCE} au plus par lot.`] : [];
    const nouveaux: Choisi[] = [];
    for (const f of pris) {
      const r = await controler(f, apercu);
      if (typeof r === 'string') { ref.push(`${f.name} : ${r}`); continue; }
      nouveaux.push({ id: `${f.name}-${f.size}-${f.lastModified}`, fichier: f, apercu: URL.createObjectURL(f), l: r.l, h: r.h, etat: 'pret' });
    }
    setRefuses(ref);
    setChoisis((l) => [...l.filter((c) => c.etat !== 'ok'), ...nouveaux.filter((n) => !l.some((c) => c.id === n.id))]);
  };

  const envoyer = async () => {
    const v = validerDeclarationLicence(declaration);
    const aEnvoyer = choisis.filter((c) => c.etat === 'pret' || c.etat === 'erreur');
    if (!aEnvoyer.length) { setMessage({ ok: false, texte: 'Choisissez un ou plusieurs fichiers.' }); return; }
    if (!v.declaration) { setMessage({ ok: false, texte: v.erreurs.join(' ') }); return; }
    setEnvoi(true);
    let reussis = 0;
    for (const [k, c] of aEnvoyer.entries()) {
      setMessage({ ok: true, texte: `Envoi ${k + 1} / ${aEnvoyer.length} : conversion WebP sans métadonnées et hébergement…` });
      setChoisis((l) => l.map((x) => (x.id === c.id ? { ...x, etat: 'envoi', message: undefined } : x)));
      let r: { ok: boolean; message: string };
      try {
        const corps = c.fichier.size > TAILLE_MAX_PHOTO_LICENCE ? await reencoder(c.fichier) : c.fichier;
        const form = new FormData();
        form.set('fichier', corps, c.fichier.size > TAILLE_MAX_PHOTO_LICENCE ? 'image.jpg' : c.fichier.name);
        // Lot : un identifiant d'image par fichier (« 123456 » pour le premier, « 123456-2 »… si Paul n'a saisi qu'un identifiant)
        const d = aEnvoyer.length > 1 && k > 0 ? { ...v.declaration, idImage: `${v.declaration.idImage}-${k + 1}` } : v.declaration;
        form.set('declaration', JSON.stringify(d));
        const rep = await fetch('/admin/photos-sous-licence/importer', { method: 'POST', body: form });
        const j = (await rep.json().catch(() => null)) as { ok: boolean; message: string } | null;
        r = { ok: Boolean(j?.ok), message: j?.message ?? `Erreur ${rep.status}.` };
      } catch {
        r = { ok: false, message: 'Envoi impossible (connexion ou fichier trop lourd).' };
      }
      if (r.ok) reussis++;
      setChoisis((l) => l.map((x) => (x.id === c.id ? { ...x, etat: r.ok ? 'ok' : 'erreur', message: r.message } : x)));
    }
    setEnvoi(false);
    const echecs = aEnvoyer.length - reussis;
    setMessage({ ok: !echecs, texte: `${reussis} photo${reussis > 1 ? 's' : ''} importée${reussis > 1 ? 's' : ''} « à valider »${apercu ? ' (aperçu : démo seulement)' : ''}${echecs ? ` ; ${echecs} en échec (motif sous chaque fichier)` : ''}.` });
    if (reussis) router.refresh();
  };

  const prets = choisis.filter((c) => c.etat === 'pret' || c.etat === 'erreur').length;

  return (
    <form className="grid gap-3 rounded-xl border border-amber-200 bg-amber-50/40 p-3 md:p-4" onSubmit={(ev) => { ev.preventDefault(); void envoyer(); }} aria-label="Importer une photo sous licence">
      <h2 className="text-lg font-semibold">Importer une photo sous licence</h2>
      <p className="text-sm text-neutral-700">
        Téléchargez vous-même la photo chez la banque (aperçu filigrané ou fichier acheté), puis importez-la ici avec sa traçabilité.
        Rien n’est téléchargé automatiquement, aucun compte n’est créé, aucun achat n’est fait ici.
      </p>
      {migrationManquante && <p role="alert" className="rounded-lg bg-amber-100 p-2 text-sm text-amber-950 ring-1 ring-amber-300">Migration à exécuter (<code>0057_photos_sous_licence.sql</code>) : l’import sera possible après.</p>}

      <fieldset className="grid gap-1 text-sm">
        <legend className="font-medium">Type de fichier (obligatoire)</legend>
        <div className="grid gap-1.5 sm:grid-cols-3">
          {TYPES_LICENCE.map((t) => (
            <label key={t} className={`flex min-h-11 items-start gap-2 rounded-lg border px-3 py-2 ${type === t ? 'border-teal-800 bg-white' : 'border-neutral-300 bg-white/60'}`}>
              <input type="radio" name={`${id}-type`} className="mt-1 size-4" checked={type === t} onChange={() => setType(t)} />
              <span>{LIBELLES_TYPES_LICENCE[t]}<span className="block text-xs text-neutral-600">{t === 'apercu' ? 'APERÇU SEULEMENT : démo, jamais publié' : 'ACHETÉE : publiable sur les sites rattachés'}</span></span>
            </label>
          ))}
        </div>
      </fieldset>
      {apercu && b && (
        <p className="rounded-lg bg-white p-2 text-xs text-neutral-700 ring-1 ring-black/5">
          {b.joursApercu ? `Licence « comp » ${b.libelle} : prévisualisation seulement, ${b.joursApercu} jours après le téléchargement. ` : `${b.libelle} ne propose pas d’aperçu. `}
          L’aperçu sert uniquement aux démos ; il est retiré à l’enregistrement d’un site et ne peut jamais être publié.
        </p>
      )}

      <label className="grid gap-1 text-sm">
        <span className="font-medium">Fichiers (PNG, JPEG ou WebP ; {LOT_MAX_LICENCE} au plus, mêmes informations)</span>
        <input type="file" multiple accept="image/png,image/jpeg,image/webp" onChange={(x) => { void ajouter(x.target.files); x.target.value = ''; }}
          className={`block w-full text-sm file:mr-3 file:min-h-11 file:rounded-lg file:border-0 file:bg-teal-800 file:px-3 file:font-semibold file:text-white ${focus}`} />
      </label>
      {refuses.length > 0 && <ul role="alert" className="list-disc rounded-lg bg-red-50 p-2 pl-6 text-xs text-red-900 ring-1 ring-red-200">{refuses.map((r) => <li key={r}>{r}</li>)}</ul>}
      {choisis.length > 0 && (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Fichiers choisis">
          {choisis.map((c) => (
            <li key={c.id} className="grid content-start gap-1 rounded-lg bg-white p-1.5 text-xs ring-1 ring-black/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.apercu} alt={`Fichier choisi : ${c.fichier.name}`} className="aspect-[4/3] w-full rounded object-cover" />
              <span>{c.l} × {c.h} px</span>
              <span className={c.etat === 'ok' ? 'font-semibold text-teal-900' : c.etat === 'erreur' ? 'text-red-800' : 'text-neutral-600'}>{c.etat === 'pret' ? 'Prêt' : c.etat === 'envoi' ? 'Envoi…' : c.etat === 'ok' ? 'Importé' : c.message ?? 'Échec'}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Banque</span>
          <select value={banque} onChange={(x) => setBanque(x.target.value)} className={champ}>
            {BANQUES_PAYANTES.map((x) => <option key={x.id} value={x.id}>{x.libelle}</option>)}
          </select>
        </label>
        {banque === 'autre' && (
          <label className="grid gap-1 text-sm"><span className="font-medium">Nom de la banque</span><input value={banqueAutre} onChange={(x) => setBanqueAutre(x.target.value)} maxLength={60} className={champ} /></label>
        )}
        <label className="grid gap-1 text-sm"><span className="font-medium">Identifiant de l’image chez la banque</span><input value={idImage} onChange={(x) => setIdImage(x.target.value)} maxLength={80} placeholder="Ex. : 123456789" className={champ} /></label>
        <label className="grid gap-1 text-sm"><span className="font-medium">Adresse de l’image chez la banque (https)</span><input type="url" inputMode="url" value={pageUrl} onChange={(x) => setPageUrl(x.target.value)} placeholder="https://…" className={champ} /></label>
        <label className="grid gap-1 text-sm"><span className="font-medium">Contributeur (photographe)</span><input value={contributeur} onChange={(x) => setContributeur(x.target.value)} maxLength={120} className={champ} /></label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Sujet</span>
          <select value={sujet} onChange={(x) => setSujet(x.target.value)} className={champ}>{SUJETS_KITS.map((s) => <option key={s} value={s}>{libelleSujetKit(s)}</option>)}</select>
        </label>
        <label className="grid gap-1 text-sm"><span className="font-medium">Téléchargé le</span><input type="date" value={telechargeLe} max={aujourdhui()} onChange={(x) => setTelechargeLe(x.target.value)} className={champ} /></label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Sites couverts par une licence</span>
          <input type="number" min={1} max={100} value={sitesParLicence} onChange={(x) => setSitesParLicence(Number(x.target.value) || 1)} className={champ} />
          <span className="text-xs text-neutral-600">1 par défaut : une licence par client (Adobe Stock, Getty, iStock).</span>
        </label>
      </div>

      {!apercu && (
        <fieldset className="grid gap-3 rounded-lg bg-white p-3 ring-1 ring-black/5 sm:grid-cols-2">
          <legend className="px-1 text-sm font-medium">Achat (ACHETÉE)</legend>
          <label className="grid gap-1 text-sm"><span className="font-medium">Titulaire de la licence</span><input value={titulaire} onChange={(x) => setTitulaire(x.target.value)} maxLength={120} className={champ} /></label>
          <label className="grid gap-1 text-sm"><span className="font-medium">Date d’achat</span><input type="date" value={dateAchat} max={aujourdhui()} onChange={(x) => setDateAchat(x.target.value)} className={champ} /></label>
          <label className="grid gap-1 text-sm"><span className="font-medium">Référence de facture ou de licence</span><input value={reference} onChange={(x) => setReference(x.target.value)} maxLength={120} className={champ} /></label>
          <label className="grid gap-1 text-sm"><span className="font-medium">Fin de licence (vide : perpétuelle)</span><input type="date" value={expireLe} onChange={(x) => setExpireLe(x.target.value)} className={champ} /></label>
        </fieldset>
      )}

      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-1 size-5" checked={creditRequis} onChange={(x) => { setCreditRequis(x.target.checked); if (x.target.checked && !creditTexte) setCreditTexte(creditParDefaut(banque, contributeur)); }} />
        <span>La licence exige un crédit (affiché dans les mentions légales des sites)</span>
      </label>
      {creditRequis && <label className="grid gap-1 text-sm"><span className="font-medium">Texte du crédit</span><input value={creditTexte} onChange={(x) => setCreditTexte(x.target.value)} maxLength={160} className={champ} /></label>}
      <label className="grid gap-1 text-sm"><span className="font-medium">Restrictions (facultatif)</span><textarea value={restrictions} onChange={(x) => setRestrictions(x.target.value)} rows={2} maxLength={1000} className={`${champ} py-2`} /></label>

      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-1 size-5" checked={personneReconnaissable} onChange={(x) => setPersonneReconnaissable(x.target.checked)} />
        <span>Une personne reconnaissable figure sur la photo (usage sensible en santé : mention « modèle » ajoutée aux crédits)</span>
      </label>
      {personneReconnaissable && (
        <label className="flex items-start gap-2 rounded-lg bg-white p-2 text-sm ring-1 ring-amber-200">
          <input type="checkbox" className="mt-1 size-5" checked={aucunePathologie} onChange={(x) => setAucunePathologie(x.target.checked)} />
          <span>La photo ne suggère aucune pathologie ni atteinte de la personne représentée{b?.santeReconnaissableInterdit ? ` (${b.libelle} l’interdit : pas de personne reconnaissable pour le diabète, les ongles ou la pédicurie)` : ''}.</span>
        </label>
      )}
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-1 size-5" checked={conditionsVerifiees} onChange={(x) => setConditionsVerifiees(x.target.checked)} />
        <span>J’ai lu les conditions de la banque (aperçu, usage pour un client, crédit, usage sensible).{b?.licenceUrl ? <> <a href={b.licenceUrl} target="_blank" rel="noreferrer" className="font-semibold text-teal-900 underline">Conditions {b.libelle}</a></> : null}</span>
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={envoi || migrationManquante || !prets} className={`min-h-11 rounded-xl bg-teal-800 px-4 text-sm font-semibold text-white hover:bg-teal-900 disabled:opacity-50 ${focus}`}>
          {envoi ? 'Import en cours…' : prets > 1 ? `Importer les ${prets} photos « à valider »` : 'Importer « à valider »'}
        </button>
        <span className="text-xs text-neutral-600">WebP sans métadonnées · dossier banque/licence/{apercu ? 'apercu' : 'achetee'}/</span>
      </div>
      {message && <p role="status" className={`rounded-lg p-2 text-sm ring-1 ${message.ok ? 'bg-teal-50 text-teal-950 ring-teal-200' : 'bg-red-50 text-red-900 ring-red-200'}`}>{message.texte}</p>}
    </form>
  );
}
