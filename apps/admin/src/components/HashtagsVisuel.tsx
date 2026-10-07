'use client';

// Hashtags des visuels (packages/core/src/hashtags.ts, table assets_hashtags, migration 0029) : complément libre des sujets.
// - SaisieHashtags : saisie contrôlée (« #trail #sneakers » ou « trail, sneakers »), puces supprimables, autocomplétion
//   (hashtags déjà utilisés, mots-clés de recherche) et suggestions non cochées (tags de la source) ; rien n'est enregistré.
// - HashtagsVisuel (défaut) : hashtags d'un asset enregistrés à chaque ajout / retrait (même logique que SujetsVisuel).
// - FiltreHashtag : champ de filtre « #hashtag » avec autocomplétion (bibliothèque, Donner mon avis).
import { useId, useMemo, useState } from 'react';
import { appliquerHashtag, completerHashtag, debutHashtag, HASHTAGS_MAX, hashtagsDe, lireHashtags, type HashtagsAssets } from '@plateforme/core';
import { basculerHashtagAsset } from '@/app/admin/retours/actions-hashtags';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-1';

type Connus = readonly string[] | Readonly<Record<string, number>>;

type PropsSaisie = {
  valeurs: string[];
  /** Ajout ou retrait d'un hashtag (normalisé) */
  onAjout: (h: string[]) => void;
  onRetrait: (h: string) => void;
  /** Autocomplétion : hashtags connus (fréquences) ou liste */
  connus?: Connus;
  /** Suggestions non cochées (un clic les ajoute) */
  suggestions?: readonly string[];
  compact?: boolean;
  libelle?: string;
  desactive?: boolean;
};

/** Champ + puces : ne fait qu'appeler onAjout / onRetrait (l'appelant enregistre ou garde en mémoire) */
export function SaisieHashtags({ valeurs, onAjout, onRetrait, connus = [], suggestions = [], compact = false, libelle = 'Hashtags', desactive = false }: PropsSaisie) {
  const id = useId();
  const [texte, setTexte] = useState('');
  const [ouvert, setOuvert] = useState(false);
  const [alerte, setAlerte] = useState('');
  const plein = valeurs.length >= HASHTAGS_MAX;
  const propositions = useMemo(() => (ouvert && debutHashtag(texte) ? completerHashtag(texte, connus, valeurs, 6) : []), [ouvert, texte, connus, valeurs]);
  const sugg = suggestions.filter((s) => !valeurs.includes(s));

  const valider = (brut: string) => {
    const { hashtags, rejetes } = lireHashtags(brut, HASHTAGS_MAX);
    const nouveaux = hashtags.filter((h) => !valeurs.includes(h)).slice(0, Math.max(0, HASHTAGS_MAX - valeurs.length));
    if (nouveaux.length) onAjout(nouveaux);
    setAlerte(rejetes.length ? `Ignoré : ${rejetes.map((r) => `« ${r} »`).join(', ')} (2 à 30 caractères : lettres, chiffres, tirets).`
      : hashtags.length > nouveaux.length && valeurs.length + nouveaux.length >= HASHTAGS_MAX ? `${HASHTAGS_MAX} hashtags au plus.` : '');
  };

  const changer = (v: string) => {
    // Séparateur tapé ou collé (espace, virgule, point-virgule) : les morceaux complets deviennent des puces
    const m = /^([\s\S]*)[\s,;]+([^\s,;]*)$/.exec(v);
    if (m && m[1].replace(/[#\s,;]/g, '')) { valider(m[1]); setTexte(m[2]); return; }
    setTexte(v);
    setOuvert(true);
  };

  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className={`font-medium ${compact ? 'text-xs' : 'text-sm'}`}>
        {libelle} <span className="font-normal text-neutral-500">{valeurs.length}/{HASHTAGS_MAX}</span>
      </label>
      {valeurs.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label={libelle}>
          {valeurs.map((h) => (
            <li key={h} className="flex min-h-9 items-center gap-0.5 rounded-full bg-sky-50 pl-3 pr-1 text-sm text-sky-950 ring-1 ring-sky-200">
              #{h}
              <button type="button" onClick={() => onRetrait(h)} disabled={desactive} aria-label={`Retirer #${h}`}
                className={`grid size-8 place-items-center rounded-full text-base leading-none hover:bg-black/10 ${focus}`}>×</button>
            </li>
          ))}
        </ul>
      )}
      <div className="relative">
        <input id={id} type="text" value={texte} disabled={desactive || plein} autoComplete="off" autoCapitalize="none" spellCheck={false} enterKeyHint="done"
          placeholder={plein ? `${HASHTAGS_MAX} hashtags au plus` : '#trail #sneakers ou trail, sneakers'}
          onChange={(e) => changer(e.target.value)} onFocus={() => setOuvert(true)} onBlur={() => window.setTimeout(() => setOuvert(false), 150)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); if (texte.trim()) { valider(texte); setTexte(''); } }
            else if (e.key === 'Backspace' && !texte && valeurs.length) onRetrait(valeurs[valeurs.length - 1]);
            else if (e.key === 'Escape') setOuvert(false);
          }}
          role="combobox" aria-expanded={propositions.length > 0} aria-controls={`${id}-liste`} aria-autocomplete="list"
          className="min-h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 text-base disabled:bg-neutral-50 md:text-sm" />
        {propositions.length > 0 && (
          <ul id={`${id}-liste`} role="listbox" className="absolute inset-x-0 top-full z-30 mt-1 grid max-h-60 overflow-y-auto rounded-lg border border-neutral-200 bg-white py-1 shadow-lg">
            {propositions.map((h) => (
              <li key={h} role="option" aria-selected={false}>
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { valider(h); setTexte(''); }}
                  className={`flex min-h-11 w-full items-center px-3 text-left text-sm hover:bg-sky-50 ${focus}`}>#{h}</button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {sugg.length > 0 && !plein && (
        <div className="flex flex-wrap items-center gap-1.5" aria-label="Suggestions">
          <span className="text-xs text-neutral-500">Suggestions :</span>
          {sugg.map((s) => (
            <button key={s} type="button" onClick={() => valider(s)} disabled={desactive}
              className={`min-h-9 rounded-full border border-dashed border-sky-300 px-2.5 text-sm text-sky-900 hover:bg-sky-50 ${focus}`}>+ #{s}</button>
          ))}
        </div>
      )}
      {alerte && <p role="status" className="text-xs text-amber-800">{alerte}</p>}
    </div>
  );
}

type Props = {
  /** Clé de l'asset (inventaire, bibliothèque) */
  cle: string;
  etat: HashtagsAssets;
  onChange: (e: HashtagsAssets) => void;
  /** Autocomplétion ; par défaut les hashtags de l'état */
  connus?: Connus;
  migrationManquante?: boolean;
  compact?: boolean;
};

/** Hashtags d'un asset, enregistrés à chaque ajout / retrait (journal 0029) */
export default function HashtagsVisuel({ cle, etat, onChange, connus, migrationManquante = false, compact = false }: Props) {
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  const valeurs = hashtagsDe(etat, cle);
  const freq = useMemo(() => {
    if (connus) return connus;
    const f: Record<string, number> = {};
    for (const l of Object.values(etat)) for (const h of l) f[h] = (f[h] ?? 0) + 1;
    return f;
  }, [connus, etat]);

  const agir = async (hashtags: string[], action: 'ajout' | 'retrait') => {
    let e = etat;
    for (const h of hashtags) e = appliquerHashtag(e, cle, h, action);
    onChange(e);
    const res = await Promise.all(hashtags.map((h) => basculerHashtagAsset(cle, h, action).catch(() => ({ ok: false, message: 'Connexion perdue.' }))));
    const echec = res.find((r) => !r.ok);
    if (echec) {
      // Annulé localement : rien n'est enregistré sans la migration 0029
      let r = e;
      for (const h of hashtags) r = appliquerHashtag(r, cle, h, action === 'ajout' ? 'retrait' : 'ajout');
      onChange(r);
      setMessage({ ok: false, texte: echec.message });
    } else {
      setMessage({ ok: true, texte: `${hashtags.map((h) => `#${h}`).join(' ')} ${action === 'ajout' ? 'ajouté' : 'retiré'}${hashtags.length > 1 ? 's' : ''}.` });
    }
  };

  return (
    <div className="grid gap-1">
      <SaisieHashtags valeurs={valeurs} connus={freq} compact={compact} libelle="Hashtags"
        onAjout={(h) => void agir(h, 'ajout')} onRetrait={(h) => void agir([h], 'retrait')} />
      {migrationManquante && !message && <p className="text-xs text-amber-800">Migration 0029 à exécuter : les hashtags ne sont pas encore enregistrés.</p>}
      {message && <p role="status" className={`text-xs ${message.ok ? 'text-neutral-600' : 'text-red-800'}`}>{message.texte}</p>}
    </div>
  );
}

/** Filtre « #hashtag » (saisie partielle acceptée : « tra » trouve #trail) avec liste des hashtags connus */
export function FiltreHashtag({ valeur, onChange, etat, className = '' }: { valeur: string; onChange: (v: string) => void; etat: HashtagsAssets; className?: string }) {
  const id = useId();
  const connus = useMemo(() => [...new Set(Object.values(etat).flat())].sort(), [etat]);
  return (
    <>
      <input type="search" value={valeur} onChange={(e) => onChange(e.target.value)} list={`${id}-h`} placeholder="#hashtag" aria-label="Filtrer par hashtag"
        autoCapitalize="none" spellCheck={false} className={className} />
      <datalist id={`${id}-h`}>{connus.map((h) => <option key={h} value={h} />)}</datalist>
    </>
  );
}
