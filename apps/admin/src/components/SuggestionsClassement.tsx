'use client';

// Suggestions de classement (packages/core/src/classement-visuels.ts) : puces « suggérées » en pointillé, qu'un clic
// transforme en vrai sujet / hashtag ; × refuse la suggestion ; « Tout accepter ». AUCUNE suggestion appliquée
// automatiquement. Chaque acceptation / refus est journalisé (table classement_suggestions, migration 0033 ; sans elle :
// ignoré) pour améliorer le dictionnaire métier.
// - SuggestionsClassement : affichage seul (l'appelant applique).
// - SuggestionsBibliotheque : vue agrandie de la bibliothèque (enregistre via les actions sujets / hashtags existantes).
import { useMemo, useState } from 'react';
import { appliquerHashtag, hashtagsDe, SUJETS_VISUELS, sujetsDuVisuel, type HashtagsAssets, type SurchargesSujets, type VisuelSujets } from '@plateforme/core';
import { suggererClassement, type ContexteSuggestion, type DecisionClassement, type SuggestionsClassement as Suggestions } from '@plateforme/core/classement-visuels';
import { basculerSujetAsset } from '@/app/admin/retours/actions';
import { basculerHashtagAsset } from '@/app/admin/retours/actions-hashtags';
import { journaliserSuggestions } from '@/app/admin/illustrations/actions-references';
import { appliquerAction } from '@/components/SujetsVisuel';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-1';
const libelle = (id: string) => SUJETS_VISUELS.find((s) => s.id === id)?.libelle ?? id;

const journaliser = (d: DecisionClassement[]) => void journaliserSuggestions(d).catch(() => undefined);

type Props = {
  suggestions: Suggestions;
  contexte: ContexteSuggestion;
  onSujet?: (ids: string[]) => void;
  onHashtag?: (tags: string[]) => void;
  compact?: boolean;
  desactive?: boolean;
};

export function SuggestionsClassement({ suggestions, contexte, onSujet, onHashtag, compact = false, desactive = false }: Props) {
  const [refusees, setRefusees] = useState<Set<string>>(new Set());
  const sujets = suggestions.sujets.filter((s) => onSujet && !refusees.has(`s:${s.id}`));
  const tags = suggestions.hashtags.filter((h) => onHashtag && !refusees.has(`h:${h.tag}`));
  if (!sujets.length && !tags.length) return null;
  const refuser = (nature: 'sujet' | 'hashtag', valeur: string, raison: string) => {
    setRefusees((r) => new Set(r).add(`${nature === 'sujet' ? 's' : 'h'}:${valeur}`));
    journaliser([{ contexte, nature, valeur, decision: 'refusee', raison }]);
  };
  const accepterSujets = (l: { id: string; raison: string }[]) => { if (!l.length) return; onSujet?.(l.map((x) => x.id)); journaliser(l.map((x) => ({ contexte, nature: 'sujet' as const, valeur: x.id, decision: 'acceptee' as const, raison: x.raison }))); };
  const accepterTags = (l: { tag: string; raison: string }[]) => { if (!l.length) return; onHashtag?.(l.map((x) => x.tag)); journaliser(l.map((x) => ({ contexte, nature: 'hashtag' as const, valeur: x.tag, decision: 'acceptee' as const, raison: x.raison }))); };
  const puce = (cle: string, texte: string, raison: string, confiance: number, accepter: () => void, refus: () => void) => (
    <li key={cle} className="flex min-h-9 items-center rounded-full border border-dashed border-sky-400 bg-white text-sm text-sky-950">
      <button type="button" onClick={accepter} disabled={desactive} title={`${raison} · confiance ${Math.round(confiance * 100)} %`}
        className={`min-h-9 rounded-l-full pl-3 pr-1.5 hover:bg-sky-50 ${focus}`}>+ {texte}</button>
      <button type="button" onClick={refus} disabled={desactive} aria-label={`Refuser la suggestion ${texte}`}
        className={`grid size-8 place-items-center rounded-full text-base leading-none text-neutral-500 hover:bg-black/5 ${focus}`}>×</button>
    </li>
  );
  return (
    <div className="grid gap-1.5 rounded-lg bg-sky-50/50 p-2 ring-1 ring-sky-100" aria-label="Classement suggéré">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={`font-medium text-sky-950 ${compact ? 'text-xs' : 'text-sm'}`}>Suggéré <span className="font-normal text-neutral-600">· un clic pour ajouter, × pour refuser</span></p>
        <button type="button" disabled={desactive} onClick={() => { accepterSujets(sujets); accepterTags(tags); }}
          className={`min-h-9 rounded-full bg-sky-800 px-3 text-xs font-semibold text-white hover:bg-sky-900 disabled:opacity-50 ${focus}`}>Tout accepter</button>
      </div>
      <ul className="flex flex-wrap gap-1.5">
        {sujets.map((s) => puce(`s:${s.id}`, libelle(s.id), s.raison, s.confiance, () => accepterSujets([s]), () => refuser('sujet', s.id, s.raison)))}
        {tags.map((h) => puce(`h:${h.tag}`, `#${h.tag}`, h.raison, h.confiance, () => accepterTags([h]), () => refuser('hashtag', h.tag, h.raison)))}
      </ul>
    </div>
  );
}

type PropsBibliotheque = {
  visuel: VisuelSujets & { titre: string; detail?: string | null };
  /** Inventaire (co-occurrences : sujets effectifs des autres visuels) */
  inventaire: readonly VisuelSujets[];
  surcharges: SurchargesSujets;
  onSurcharges: (s: SurchargesSujets) => void;
  hashtags: HashtagsAssets;
  onHashtags: (h: HashtagsAssets) => void;
};

/** Vue agrandie de la bibliothèque : suggestions pour l'élément ouvert, enregistrées par les actions existantes (0028, 0029) */
export function SuggestionsBibliotheque({ visuel, inventaire, surcharges, onSurcharges, hashtags, onHashtags }: PropsBibliotheque) {
  const [message, setMessage] = useState('');
  const suggestions = useMemo(() => {
    const sujetsVoisins = Object.fromEntries(inventaire.map((v) => [v.cle, sujetsDuVisuel(v, surcharges).sujets]));
    return suggererClassement({
      // Titre et soins (français) : le dictionnaire les reconnaît ; ni la requête anglaise ni le détail technique (bruit)
      titre: [visuel.titre, ...visuel.soins].join(' '),
      voisins: { hashtags, sujets: sujetsVoisins },
      deja: { sujets: sujetsDuVisuel(visuel, surcharges).sujets, hashtags: hashtagsDe(hashtags, visuel.cle) },
    });
  }, [visuel, inventaire, surcharges, hashtags]);
  const ajouterSujets = async (ids: string[]) => {
    const avant = surcharges;
    let s = surcharges;
    for (const id of ids) s = appliquerAction(s, visuel.cle, id, 'ajout');
    onSurcharges(s);
    const res = await Promise.all(ids.map((id) => basculerSujetAsset(visuel.cle, id, 'ajout').catch(() => ({ ok: false, message: 'Connexion perdue.' }))));
    const echec = res.find((r) => !r.ok);
    setMessage(echec ? echec.message : `${ids.map(libelle).join(', ')} : ajouté${ids.length > 1 ? 's' : ''}.`);
    if (echec) onSurcharges(avant);
  };
  const ajouterTags = async (tags: string[]) => {
    let e = hashtags;
    for (const t of tags) e = appliquerHashtag(e, visuel.cle, t, 'ajout');
    onHashtags(e);
    const res = await Promise.all(tags.map((t) => basculerHashtagAsset(visuel.cle, t, 'ajout').catch(() => ({ ok: false, message: 'Connexion perdue.' }))));
    const echec = res.find((r) => !r.ok);
    if (echec) { onHashtags(hashtags); setMessage(echec.message); } else setMessage(`${tags.map((t) => `#${t}`).join(' ')} ajouté${tags.length > 1 ? 's' : ''}.`);
  };
  return (
    <div className="grid gap-1">
      <SuggestionsClassement suggestions={suggestions} contexte="bibliotheque" compact onSujet={(ids) => void ajouterSujets(ids)} onHashtag={(t) => void ajouterTags(t)} />
      {message && <p role="status" className="text-xs text-neutral-600">{message}</p>}
    </div>
  );
}
