'use client';

// Champ « portrait » d'un praticien (formulaire /mon-site, parcours /creer) : studio portrait (chargé à la demande),
// envoi simple sans retouche, retrait. Si les couleurs du site changent, le portrait se recompose depuis les fichiers
// enregistrés (photo d'origine et photo détourée), sans refaire le détourage. Le studio n'est jamais obligatoire.
import { lazy, Suspense, useRef, useState } from 'react';
import type { PraticienDraft } from '@plateforme/core';
import { palettePortrait, portraitARecomposer } from '@plateforme/core/portrait';
import { envoyerPhoto } from '@/lib/envoi-photo';

const StudioPortrait = lazy(() => import('./StudioPortrait'));

type Props = {
  siteId: string | null;
  praticien: PraticienDraft;
  label: string;
  /** Couleurs du site (gamme ou couleur libre) appliquées aux fonds du portrait */
  theme: { couleur: string; gamme?: string | null };
  onChange: (patch: Partial<PraticienDraft>) => void;
};

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';

export default function PortraitPraticien({ siteId, praticien: p, label, theme, onChange }: Props) {
  const [ouvert, setOuvert] = useState<'nouveau' | 'reprise' | null>(null);
  const [etat, setEtat] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);
  const entree = useRef<HTMLInputElement>(null);
  const nom = `${p.prenom} ${p.nom}`.trim();
  const portrait = p.portrait && p.photo && [...p.portrait.rendus.portrait, ...p.portrait.rendus.carre].some((r) => r.url === p.photo) ? p.portrait : undefined;
  const aRecomposer = portraitARecomposer(portrait, theme);

  const ouvrir = (mode: 'nouveau' | 'reprise') => {
    if (!siteId) return setEtat('Enregistrez d’abord une étape pour pouvoir ajouter des photos.');
    setEtat(null);
    setOuvert(mode);
  };

  const envoiSimple = async (f: File) => {
    if (!siteId) return setEtat('Enregistrez d’abord une étape pour pouvoir ajouter des photos.');
    setEtat('Optimisation et envoi…');
    try {
      const { url, taille } = await envoyerPhoto(siteId, `portrait-${p.id}`, f, 1, 800);
      onChange({ photo: url, portrait: undefined });
      setEtat(`Photo ajoutée (${Math.round(taille / 1024)} Ko).`);
    } catch {
      setEtat('Envoi impossible. Vérifiez le format de l’image et réessayez.');
    }
  };

  // Recomposition aux nouvelles couleurs (sans MediaPipe : fichiers enregistrés relus)
  const recomposer = async () => {
    if (!portrait || !siteId) return;
    setOccupe(true);
    setEtat('Mise aux nouvelles couleurs…');
    try {
      const [{ reprendre }, { enregistrerPortrait }] = await Promise.all([import('@/lib/portrait/atelier'), import('@/lib/portrait/envoi')]);
      const a = await reprendre(portrait.source, portrait.detouree, portrait.retouche, portrait.ancre);
      const r = await enregistrerPortrait(siteId, p.id, a, {
        style: portrait.style, ombre: portrait.ombre, retouche: portrait.retouche !== null, palette: palettePortrait(theme), reglage: portrait.reglage,
        sansDetourage: !portrait.detouree,
      }, theme);
      onChange({ photo: r.photo, portrait: r.portrait });
      setEtat('Portrait mis aux couleurs du site. Pensez à enregistrer.');
    } catch {
      setEtat('Recomposition impossible. Ouvrez le studio pour refaire le portrait.');
    } finally {
      setOccupe(false);
    }
  };

  return (
    <div className="grid gap-2 text-sm">
      <span className="font-medium">{label}</span>
      <div className="flex flex-wrap items-center gap-3">
        {p.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={portrait?.rendus.carre[0]?.url ?? p.photo} alt="" className="size-16 rounded-full border border-neutral-200 object-cover" />
        ) : (
          <span className="grid size-16 place-items-center rounded-full border border-dashed border-neutral-300 text-xs text-neutral-400">Aucun</span>
        )}
        <button type="button" onClick={() => ouvrir(portrait?.source ? 'reprise' : 'nouveau')} className={`min-h-11 rounded-lg bg-teal-800 px-3 py-2 font-semibold text-white hover:bg-teal-900 ${focus}`}>
          {portrait?.source ? 'Retoucher dans le studio' : p.photo ? 'Refaire dans le studio' : 'Studio portrait'}
        </button>
        <button type="button" onClick={() => entree.current?.click()} className={`min-h-11 rounded-lg border border-neutral-300 px-3 py-2 font-medium hover:bg-neutral-50 ${focus}`}>
          {p.photo ? 'Remplacer sans retouche' : 'Envoyer sans retouche'}
        </button>
        {p.photo && (
          <button type="button" onClick={() => { onChange({ photo: '', portrait: undefined }); setEtat(null); }} className={`min-h-11 px-2 text-xs text-red-700 ${focus}`}>
            Retirer
          </button>
        )}
        <input ref={entree} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) envoiSimple(f); e.target.value = ''; }} />
      </div>
      {!p.photo && <span className="text-xs text-neutral-600">Le studio cadre la photo, corrige la lumière et peut remplacer le fond par les couleurs du site. Une photo au téléphone suffit.</span>}
      {aRecomposer && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-amber-900">
          <span>Les couleurs du site ont changé depuis la création du portrait.</span>
          <button type="button" disabled={occupe} onClick={recomposer} className={`min-h-11 rounded-lg bg-white px-3 font-semibold ring-1 ring-amber-300 hover:bg-amber-100 disabled:opacity-60 ${focus}`}>
            Mettre le portrait aux nouvelles couleurs
          </button>
        </div>
      )}
      {etat && <span className="text-xs text-neutral-600" aria-live="polite">{etat}</span>}
      {ouvert && (
        <Suspense fallback={<div className="fixed inset-0 z-50 grid place-items-center bg-black/40 text-sm font-medium text-white" role="status">Préparation du studio…</div>}>
          <StudioPortrait
            siteId={siteId}
            praticienId={p.id}
            nom={nom}
            theme={theme}
            initial={ouvert === 'reprise' ? portrait : undefined}
            onFermer={() => setOuvert(null)}
            onValider={(r) => {
              onChange({ photo: r.photo, portrait: r.portrait });
              setOuvert(null);
              setEtat('Portrait prêt. Pensez à enregistrer.');
            }}
          />
        </Suspense>
      )}
    </div>
  );
}
