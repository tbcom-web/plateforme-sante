'use client';

// Avant / après : version notée (instantané enregistré avec la note, sinon archive du commit dont l'empreinte correspond :
// apps/admin/public/archives, scripts/archiver-assets.mjs) à côté de la version actuelle, avec la note et les remarques.
// Animation (clé animation:…) : l'instantané est l'image figée (le SVG noté ne garde pas le mouvement) : posée sur le fond sombre
// des animations, avec la mention ; la version actuelle, elle, joue (LectureAnimation).
import { useEffect, useState, type ReactNode } from 'react';
import { libelleEtiquetteAsset, rendusAvant, type ArchiveAssets, type IndexArchives, type Instantane } from '@plateforme/core';
import { derniereNoteAsset, type NoteAvant } from '@/app/admin/retours/actions';

let archivesChargees: Promise<ArchiveAssets[]> | null = null;

/** Archives des rendus (index + fichiers .json.gz décompressés dans le navigateur), chargées une fois */
export function chargerArchives(): Promise<ArchiveAssets[]> {
  archivesChargees ??= (async () => {
    try {
      const idx = (await (await fetch('/archives/index.json', { cache: 'no-store' })).json()) as IndexArchives;
      const lues = await Promise.all(idx.archives.map(async (a) => {
        const r = await fetch(`/archives/${a.fichier}`);
        if (!r.ok || !r.body) return null;
        const texte = await new Response(r.body.pipeThrough(new DecompressionStream('gzip'))).text();
        return JSON.parse(texte) as ArchiveAssets;
      }).map((p) => p.catch(() => null)));
      return lues.filter((x): x is ArchiveAssets => x !== null);
    } catch {
      return [];
    }
  })();
  return archivesChargees;
}

/** SVG d'un instantané : sans script ni gestionnaire d'événement */
const svgSur = (s: string) => s.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/\son\w+\s*=\s*("[^"]*"|'[^']*')/gi, '').replace(/javascript:/gi, '');

export function RenduInstantane({ r, fond = 'var(--fond)' }: { r: Instantane; fond?: string }) {
  if (r.kind === 'svg') {
    return (
      <div className="grid aspect-[4/3] w-full place-items-center overflow-hidden rounded-xl ring-1 ring-black/10" style={{ background: fond, color: 'var(--encre)' }}>
        <div className="rt-svg h-[80%] w-[80%] [&_svg]:h-full [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: svgSur(r.svg) }} />
      </div>
    );
  }
  if (r.kind === 'image') {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={r.src} alt="Version notée" className="aspect-[4/3] w-full rounded-xl object-cover ring-1 ring-black/10" />;
  }
  const g = r.gamme;
  return (
    <div className="grid aspect-[4/3] w-full grid-cols-3 gap-2 rounded-xl p-3 ring-1 ring-black/10" style={{ background: g.fond }}>
      {[g.accent, g.accentFonce, g.fondDoux, g.plan, g.signal, g.vif ?? g.accent].map((c, i) => <span key={i} className="rounded-lg ring-1 ring-black/10" style={{ background: c }} title={c} />)}
    </div>
  );
}

type Props = {
  cle: string;
  /** Rendu actuel (« Après ») */
  children: ReactNode;
  /** Note déjà chargée (tests, captures) ; sinon lue à la demande */
  note?: NoteAvant | null;
};

/** Avant / après côte à côte ; sans version notée retrouvable, le rendu actuel seul (avec un avertissement) */
export default function AvantApres({ cle, children, note: noteInitiale }: Props) {
  const [note, setNote] = useState<NoteAvant | null | undefined>(noteInitiale);
  const [avant, setAvant] = useState<Instantane | null | undefined>(undefined);
  useEffect(() => {
    let actif = true;
    (async () => {
      const n = noteInitiale ?? (await derniereNoteAsset(cle).catch(() => null));
      const archives = n?.apercu ? [] : await chargerArchives();
      if (!actif) return;
      setNote(n);
      setAvant(n ? rendusAvant({ cle, empreinte: n.empreinte, apercu: n.apercu }, archives) : null);
    })();
    return () => { actif = false; };
  }, [cle, noteInitiale]);

  const remarques = note ? [
    note.positif && { t: 'Ce qui allait bien', v: note.positif, c: 'text-teal-900' },
    note.negatif && { t: 'Ce qui n’allait pas', v: note.negatif, c: 'text-red-900' },
    note.commentaire && { t: 'Commentaire', v: note.commentaire, c: 'text-neutral-800' },
  ].filter(Boolean) as { t: string; v: string; c: string }[] : [];

  return (
    <div className="grid gap-3 md:grid-cols-2 md:items-start" aria-label="Avant / après">
      <figure className="grid gap-1.5 rounded-xl bg-amber-50/60 p-2 ring-1 ring-amber-200">
        <figcaption className="text-sm font-semibold text-amber-950">
          Avant {note ? <>(votre note : {note.note}<span aria-hidden="true">★</span>{note.le ? `, le ${new Date(note.le).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' })}` : ''})</> : ''}
        </figcaption>
        {avant === undefined ? <div className="grid aspect-[4/3] place-items-center rounded-xl bg-white text-xs text-neutral-500">Chargement de la version notée…</div>
          : avant ? (cle.startsWith('animation:') && avant.kind === 'svg' ? (
            <>
              <div className="surface-plan rounded-xl"><RenduInstantane r={avant} fond="transparent" /></div>
              <p className="text-xs font-medium text-amber-950">Image figée de l’animation notée : l’instantané ne garde pas le mouvement.</p>
            </>
          ) : <RenduInstantane r={avant} />)
            : <div className="grid aspect-[4/3] place-items-center rounded-xl bg-white p-3 text-center text-xs text-neutral-600">Version notée introuvable (ni instantané ni archive pour cette empreinte).</div>}
        {note && note.etiquettes.length > 0 && <p className="text-xs text-neutral-700">{note.etiquettes.map(libelleEtiquetteAsset).join(' · ')}</p>}
        {remarques.map((r) => <p key={r.t} className={`text-xs ${r.c}`}><strong>{r.t} :</strong> {r.v}</p>)}
      </figure>
      <figure className="grid gap-1.5 rounded-xl bg-teal-50/60 p-2 ring-1 ring-teal-200">
        <figcaption className="text-sm font-semibold text-teal-950">Après (version actuelle)</figcaption>
        {children}
      </figure>
    </div>
  );
}
