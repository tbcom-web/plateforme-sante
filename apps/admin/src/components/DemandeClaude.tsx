'use client';

// Demande à Claude, MOBILE D'ABORD (demandes de Paul du 2026-10-10 : « arriver à la création d'un modèle depuis mobile only » ;
// option A : pas d'automatisation par API, Paul envoie lui-même). Gros bouton « Envoyer à Claude » : feuille de partage du
// téléphone (navigator.share, texte complet, titre « Corrections du modèle <nom> » ; l'app Claude y figure, session Code) ;
// repli (pas de partage, ou partage en échec) : copie dans le presse-papiers et consigne « ouvrez l'app Claude, session Code, et
// collez ». Bouton « Copier » à côté. Le texte est AUTONOME (tickets en clair) : Claude corrige même si l'export des retours n'est
// pas encore arrivé dans le dépôt ; l'export est quand même lancé au même geste (`avantEnvoi`, sans attendre : le partage doit
// partir dans le geste lui-même, Safari l'exige). Texte affiché en entier, sélectionné d'un toucher si la copie est refusée.
import { useEffect, useRef, useState } from 'react';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900';
const CONSIGNE = 'Copié : ouvrez l’app Claude, session Code, et collez.';

type Props = {
  texte: string;
  titre: string;
  /** Lancé au geste « Envoyer à Claude » sans être attendu (export des retours vers le dépôt) */
  avantEnvoi?: () => Promise<{ ok: boolean; message: string }>;
};

export default function DemandeClaude({ texte, titre, avantEnvoi }: Props) {
  const [etat, setEtat] = useState<'' | 'copie' | 'manuel' | 'partage'>('');
  const [export_, setExport] = useState('');
  const [partage, setPartage] = useState(false);
  const [ouvert, setOuvert] = useState(false);
  const zone = useRef<HTMLPreElement>(null);
  useEffect(() => { setPartage(typeof navigator !== 'undefined' && typeof navigator.share === 'function'); }, []);
  /** Repli : le texte entier sélectionné, prêt pour « Copier » du menu du téléphone */
  const selectionner = () => {
    const el = zone.current;
    const s = typeof window !== 'undefined' ? window.getSelection() : null;
    if (!el || !s) return;
    setOuvert(true);
    const r = document.createRange();
    r.selectNodeContents(el);
    s.removeAllRanges(); s.addRange(r);
  };
  const copier = async () => {
    try { await navigator.clipboard.writeText(texte); setEtat('copie'); try { navigator.vibrate?.(12); } catch { /* ignoré */ } }
    catch { selectionner(); setEtat('manuel'); }
  };
  const exporter = () => {
    if (!avantEnvoi) return;
    setExport('Export des retours lancé…');
    avantEnvoi().then((r) => setExport(r.message), () => setExport('Export non lancé : la demande contient déjà tous les tickets.'));
  };
  const envoyer = async () => {
    exporter();
    if (partage) {
      try { await navigator.share({ title: titre, text: texte }); setEtat('partage'); return; }
      catch (e) { if ((e as Error)?.name === 'AbortError') return; }
    }
    await copier();
  };
  const lignes = texte.split('\n').length;
  return (
    <div className="grid gap-2 rounded-xl bg-neutral-900 p-3 text-white" data-phrase-claude="">
      <p className="text-xs uppercase tracking-wide text-neutral-300">{titre} · à envoyer dans l’app Claude (session Code)</p>
      <div className="grid gap-2 sm:flex sm:flex-wrap">
        <button type="button" onClick={() => void envoyer()} className={`min-h-14 rounded-xl bg-orange-600 px-5 text-lg font-semibold text-white shadow sm:min-h-12 sm:text-base ${focus}`} data-action="partager-claude">
          {etat === 'partage' ? 'Envoyé ✓' : 'Envoyer à Claude'}
        </button>
        <button type="button" onClick={() => void copier()} className={`min-h-12 rounded-xl bg-white px-4 text-base font-semibold text-neutral-900 ${focus}`} data-action="copier-claude">
          {etat === 'copie' ? 'Copié ✓' : 'Copier'}
        </button>
      </div>
      {(etat === 'copie' || etat === 'manuel' || export_) && (
        <p role="status" className="text-sm text-neutral-100">
          {etat === 'copie' ? CONSIGNE : etat === 'manuel' ? 'Copie automatique refusée : le texte est sélectionné, touchez « Copier » dans le menu du téléphone, puis collez-le dans l’app Claude (session Code).' : ''}
          {export_ ? <span className="block text-neutral-300">{export_}</span> : null}
        </p>
      )}
      <pre ref={zone} onClick={selectionner} className={`select-all overflow-y-auto whitespace-pre-wrap break-words rounded-lg bg-neutral-800 px-3 py-2.5 font-mono text-sm leading-snug ${ouvert ? '' : 'max-h-40'}`} data-texte-claude="">{texte}</pre>
      {!ouvert && lignes > 6 && <button type="button" onClick={() => setOuvert(true)} className={`min-h-11 justify-self-start rounded-lg px-2 text-sm text-neutral-200 underline ${focus}`}>Tout afficher ({lignes} lignes)</button>}
    </div>
  );
}
