'use client';

// Bibliothèque & retours : inventaire unifié du core (inventaireAssets : illustrations, photos, modèles, gammes), aperçu dans
// une gamme au choix (mêmes variables que les sites : charte + gamme), statut et commentaires enregistrés dans le journal
// (migration 0021), note rapide 1 à 5 étoiles (migration 0027 ; avis détaillé dans /admin/retours), export Markdown.
import '@plateforme/core/dessins.css';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState, useTransition, type CSSProperties } from 'react';
import {
  empreinteAsset, empreinteSvg, GAMMES, instantaneAsset, SUJETS_VISUELS, sujetsDuVisuel, type SurchargesSujets, gamme as gammeParId, inventaireAssets, LIBELLES_REGISTRES, LIBELLES_STATUTS_ILLUSTRATION, LIBELLES_TYPES_ASSET, markdownRetours,
  pastilleGamme, STATUTS_ILLUSTRATION, SURFACES_CSS, variablesCharte, variablesGamme,
  type Asset, type PhotoDeJeu, type Registre, type StatutIllustration, type TypeAsset,
} from '@plateforme/core';
import AvantApres from '@/components/AvantApres';
import SujetsVisuel from '@/components/SujetsVisuel';
import HashtagsVisuel, { FiltreHashtag } from '@/components/HashtagsVisuel';
import { correspondHashtag, hashtagsDe, type HashtagsAssets } from '@plateforme/core';
import { lireHashtagsAssets } from '../retours/actions-hashtags';
import type { Revue, StatutEnregistre } from '@/lib/illustrations';
import { ajouterNoteAsset } from '../retours/actions';
import { ajouterRevue } from './actions';

type Props = {
  statuts: StatutEnregistre[]; revues: Revue[]; migrationManquante: boolean; photosJeux: PhotoDeJeu[]; moyennes: Record<string, { n: number; somme: number }>; migrationNotes: boolean;
  /** Sujets ajoutés / retirés par Paul (0028) */
  surchargesSujets: SurchargesSujets;
  /** Empreinte de la dernière note par clé (avant / après) */
  empreintesNotees: Record<string, string | null>;
};
type Ligne = Asset & { empreinte: string; svgRendu: string; fond: 'grille' | 'plan' | 'doux' | 'clair'; registre?: Registre };
type FiltreStatut = 'tous' | 'a_regarder' | StatutIllustration;

const COULEURS: Record<StatutIllustration, string> = {
  a_revoir: 'bg-amber-100 text-amber-900',
  valide: 'bg-teal-100 text-teal-900',
  a_retravailler: 'bg-rose-100 text-rose-900',
  retire: 'bg-neutral-200 text-neutral-700',
};
const BOUTONS: Record<StatutIllustration, string> = {
  a_revoir: 'ring-amber-300 data-[actif=true]:bg-amber-500 data-[actif=true]:text-white',
  valide: 'ring-teal-300 data-[actif=true]:bg-teal-700 data-[actif=true]:text-white',
  a_retravailler: 'ring-rose-300 data-[actif=true]:bg-rose-600 data-[actif=true]:text-white',
  retire: 'ring-neutral-300 data-[actif=true]:bg-neutral-600 data-[actif=true]:text-white',
};
const COURTS: Record<StatutIllustration, string> = { a_revoir: 'À revoir', valide: 'Validé', a_retravailler: 'Retravailler', retire: 'Retiré' };
const CLE_GAMME = 'revue-illustrations-gamme';

/** Aperçu d'un asset non SVG : photo ou modèle (vignette optimisée), gamme (pastilles) */
function ApercuAutre({ l, grand = false }: { l: Ligne; grand?: boolean }) {
  if (l.rendu.kind === 'image') {
    return (
      <div className={`relative w-full overflow-hidden bg-neutral-100 ${grand ? 'aspect-[4/3] rounded-xl' : 'aspect-[4/3]'}`}>
        <Image src={l.rendu.src} alt={l.titre} fill sizes={grand ? '(max-width: 767px) 100vw, 900px' : '(max-width: 767px) 50vw, 300px'} className={l.type === 'modele' ? 'object-contain' : 'object-cover'} />
      </div>
    );
  }
  if (l.rendu.kind === 'gamme') {
    const g = gammeParId(l.rendu.gamme) ?? GAMMES[0];
    const [a, b] = pastilleGamme(g);
    return (
      <div className={`grid w-full grid-cols-3 gap-2 p-4 ${grand ? 'aspect-[4/3] rounded-xl' : 'aspect-[4/3]'}`} style={{ background: g.fond }}>
        {[a, b, g.accent, g.accentFonce, g.fondDoux, g.plan].map((c, i) => <span key={i} className="rounded-lg ring-1 ring-black/10" style={{ background: c }} />)}
      </div>
    );
  }
  return null;
}

/** `petit` : pictos (grille de 24 px) montrés à taille modérée, pour juger le trait comme sur un site */
function Apercu({ html, fond, grand = false, petit = false }: { html: string; fond: Ligne['fond']; grand?: boolean; petit?: boolean }) {
  const classe = fond === 'grille' ? 'surface-grille' : fond === 'plan' ? 'surface-plan' : '';
  const style: CSSProperties = { background: fond === 'doux' ? 'var(--doux)' : fond === 'clair' ? 'var(--fond)' : undefined, color: fond === 'plan' ? undefined : 'var(--encre)' };
  return (
    <div className={`${classe} grid place-items-center overflow-hidden ${grand ? 'aspect-[4/3] w-full rounded-xl' : 'aspect-[4/3] w-full'}`} style={style}>
      <div className="rv-svg" style={{ width: petit ? '42%' : grand ? '86%' : '80%', height: petit ? '42%' : grand ? '86%' : '80%' }} dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

const registreDeCle = (cle: string): Registre | undefined => (cle.startsWith('ligne:') || cle.endsWith(':ligne') ? 'ligne' : cle.endsWith(':releve') || cle.startsWith('animation:') ? 'releve' : cle.endsWith(':pedagogique') || cle.startsWith('biblio:') ? 'pedagogique' : undefined);

export default function RevueIllustrations({ statuts, revues: revuesInitiales, migrationManquante, photosJeux, moyennes: moyennesInitiales, migrationNotes, surchargesSujets, empreintesNotees }: Props) {
  const [surcharges, setSurcharges] = useState(surchargesSujets);
  const [filtreSujet, setFiltreSujet] = useState('');
  // Hashtags des visuels (0029), chargés après l'affichage ; filtre « #… » (saisie partielle acceptée) et recherche
  const [hashtags, setHashtags] = useState<HashtagsAssets>({});
  const [migrationHashtags, setMigrationHashtags] = useState(false);
  const [filtreHashtag, setFiltreHashtag] = useState('');
  useEffect(() => {
    void lireHashtagsAssets().then((r) => { setHashtags(r.hashtags); setMigrationHashtags(r.migrationManquante); }).catch(() => undefined);
  }, []);
  const lignes = useMemo<Ligne[]>(() => inventaireAssets({ photosJeux }).map((a) => {
    const s = a.rendu.kind === 'svg' ? a.rendu.svg() : '';
    return { ...a, svgRendu: s, empreinte: s ? empreinteSvg(s) : '', fond: a.rendu.kind === 'svg' ? a.rendu.fond : 'clair', registre: registreDeCle(a.cle) };
  }), [photosJeux]);
  // Notes (0027) : moyenne par clé, mise à jour localement après une note rapide
  const [moyennes, setMoyennes] = useState(moyennesInitiales);
  const [notesMsg, setNotesMsg] = useState<Record<string, string>>({});
  const noterVite = async (l: Ligne, n: number) => {
    if (migrationNotes) { setNotesMsg((m) => ({ ...m, [l.cle]: 'Migration 0027 à exécuter.' })); return; }
    const r = await ajouterNoteAsset(l.cle, n, [], '', empreinteAsset(l, l.svgRendu || null), { apercu: instantaneAsset(l, l.svgRendu || null) }).catch(() => ({ ok: false, message: 'Connexion perdue.' }));
    setNotesMsg((m) => ({ ...m, [l.cle]: r.message }));
    if (r.ok) setMoyennes((m) => ({ ...m, [l.cle]: { n: (m[l.cle]?.n ?? 0) + 1, somme: (m[l.cle]?.somme ?? 0) + n } }));
  };
  const etoilesRapides = (l: Ligne) => {
    const m = moyennes[l.cle];
    return (
      <div className="grid gap-1">
        <div className="flex items-center justify-between gap-1">
          <div role="group" aria-label={`Note rapide de ${l.titre}`} className="flex">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => void noterVite(l, n)} aria-label={`Noter ${n} sur 5`}
                className={`grid size-9 place-items-center rounded text-lg leading-none hover:bg-amber-50 ${m && Math.round(m.somme / m.n) >= n ? 'text-amber-500' : 'text-neutral-300'}`}>★</button>
            ))}
          </div>
          <span className="text-[11px] tabular-nums text-neutral-500">{m ? `${(m.somme / m.n).toFixed(1).replace('.', ',')} (${m.n})` : 'non noté'}</span>
        </div>
        <a href={`/admin/retours?cle=${encodeURIComponent(l.cle)}`} className="text-[11px] font-semibold text-teal-900 underline-offset-2 hover:underline">Avis détaillé →</a>
        {notesMsg[l.cle] && <p className="text-[11px] text-neutral-600">{notesMsg[l.cle]}</p>}
      </div>
    );
  };
  const [gamme, setGamme] = useState('canard');
  useEffect(() => {
    try { const g = localStorage.getItem(CLE_GAMME); if (g && GAMMES.some((x) => x.id === g)) setGamme(g); } catch { /* stockage indisponible */ }
  }, []);
  const choisirGamme = (g: string) => { setGamme(g); try { localStorage.setItem(CLE_GAMME, g); } catch { /* stockage indisponible */ } };

  // Statut courant et journal, mis à jour localement après chaque retour enregistré
  const [courants, setCourants] = useState(() => new Map(statuts.map((s) => [s.cle, s])));
  const [revues, setRevues] = useState(revuesInitiales);
  const parCle = useMemo(() => {
    const m = new Map<string, Revue[]>();
    for (const r of revues) m.set(r.cle, [...(m.get(r.cle) ?? []), r]);
    return m;
  }, [revues]);
  const statutDe = useCallback((l: Ligne): StatutIllustration => courants.get(l.cle)?.statut ?? l.statutParDefaut, [courants]);
  // « Nouveau » : jamais revu (et pas déjà validé par le catalogue) ; « Modifié » : le rendu a changé depuis le dernier retour
  const nouveau = useCallback((l: Ligne) => !courants.has(l.cle) && l.statutParDefaut === 'a_revoir', [courants]);
  const modifie = useCallback((l: Ligne) => { const e = courants.get(l.cle)?.empreinte; return Boolean(e && e !== l.empreinte); }, [courants]);

  const [filtreStatut, setFiltreStatut] = useState<FiltreStatut>('tous');
  const [filtreType, setFiltreType] = useState<'tous' | TypeAsset>('tous');
  const [filtreRegistre, setFiltreRegistre] = useState<'tous' | Registre>('tous');
  const [filtreSoin, setFiltreSoin] = useState('tous');
  const [recherche, setRecherche] = useState('');
  const soins = useMemo(() => [...new Set(lignes.flatMap((l) => l.soins))].sort(), [lignes]);

  const visibles = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return lignes.filter((l) => {
      const s = statutDe(l);
      if (filtreStatut === 'a_regarder' ? !(nouveau(l) || modifie(l)) : filtreStatut !== 'tous' && s !== filtreStatut) return false;
      if (filtreType !== 'tous' && l.type !== filtreType) return false;
      if (filtreRegistre !== 'tous' && l.registre !== filtreRegistre) return false;
      if (filtreSoin !== 'tous' && !l.soins.includes(filtreSoin)) return false;
      if (filtreSujet && !sujetsDuVisuel(l, surcharges).sujets.includes(filtreSujet)) return false;
      if (!correspondHashtag(hashtags, l.cle, filtreHashtag, true)) return false;
      if (q && ![l.cle, l.titre, l.detail ?? '', ...l.soins, ...hashtagsDe(hashtags, l.cle).map((h) => `#${h}`)].some((t) => t.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [lignes, recherche, filtreStatut, filtreType, filtreRegistre, filtreSoin, filtreSujet, surcharges, hashtags, filtreHashtag, statutDe, nouveau, modifie]);

  const compteurs = useMemo(() => {
    const c: Record<StatutIllustration, number> = { a_revoir: 0, valide: 0, a_retravailler: 0, retire: 0 };
    for (const l of lignes) c[statutDe(l)]++;
    return c;
  }, [lignes, statutDe]);
  const aRegarder = useMemo(() => lignes.filter((l) => nouveau(l) || modifie(l)).length, [lignes, nouveau, modifie]);

  // Enregistrement d'un retour
  const [enCours, demarrer] = useTransition();
  const [messages, setMessages] = useState<Record<string, { ok: boolean; message: string }>>({});
  const [brouillons, setBrouillons] = useState<Record<string, string>>({});
  const envoyer = (l: Ligne, statut: StatutIllustration) => {
    if (migrationManquante) { setMessages((m) => ({ ...m, [l.cle]: { ok: false, message: 'Migration 0021 à exécuter.' } })); return; }
    const commentaire = brouillons[l.cle] ?? '';
    demarrer(async () => {
      const r = await ajouterRevue(l.cle, statut, commentaire, l.empreinte);
      setMessages((m) => ({ ...m, [l.cle]: r }));
      if (!r.ok) return;
      const le = r.le ?? new Date().toISOString();
      setCourants((c) => new Map(c).set(l.cle, { cle: l.cle, statut, empreinte: l.empreinte, majLe: le }));
      setRevues((rv) => [{ id: `local-${le}-${l.cle}`, cle: l.cle, statut, commentaire: commentaire.trim() || null, empreinte: l.empreinte, le, auteur: 'vous' }, ...rv]);
      setBrouillons((b) => ({ ...b, [l.cle]: '' }));
    });
  };

  // Vue agrandie et raccourcis clavier (1 à 4 : statut, ← → : précédente / suivante, Échap : fermer)
  const [ouverte, setOuverte] = useState<string | null>(null);
  const indexOuverte = ouverte ? visibles.findIndex((l) => l.cle === ouverte) : -1;
  const ligneOuverte = ouverte ? lignes.find((l) => l.cle === ouverte) ?? null : null;
  useEffect(() => {
    if (!ligneOuverte) return;
    const touche = (e: KeyboardEvent) => {
      const cible = e.target as HTMLElement | null;
      if (cible && (cible.tagName === 'TEXTAREA' || cible.tagName === 'INPUT' || cible.tagName === 'SELECT')) { if (e.key === 'Escape') cible.blur(); return; }
      if (e.key === 'Escape') setOuverte(null);
      else if (e.key === 'ArrowRight' && indexOuverte >= 0 && indexOuverte < visibles.length - 1) setOuverte(visibles[indexOuverte + 1].cle);
      else if (e.key === 'ArrowLeft' && indexOuverte > 0) setOuverte(visibles[indexOuverte - 1].cle);
      else if (['1', '2', '3', '4'].includes(e.key)) envoyer(ligneOuverte, (['valide', 'a_retravailler', 'a_revoir', 'retire'] as const)[Number(e.key) - 1]);
    };
    window.addEventListener('keydown', touche);
    return () => window.removeEventListener('keydown', touche);
  });

  // Export Markdown des « À retravailler » (dernier commentaire de chaque illustration)
  const [export_, setExport] = useState<{ texte: string; copie: boolean } | null>(null);
  const copierRetours = async () => {
    const texte = markdownRetours(lignes.map((l) => {
      const derniere = (parCle.get(l.cle) ?? []).find((r) => r.commentaire);
      return { cle: l.cle, titre: l.titre, source: l.source, statut: statutDe(l), commentaire: derniere?.commentaire ?? null, le: derniere?.le ?? null, auteur: derniere?.auteur ?? null };
    }));
    let copie = false;
    try { await navigator.clipboard.writeText(texte); copie = true; } catch { /* presse-papiers refusé : le texte s'affiche */ }
    setExport({ texte, copie });
  };

  const g = GAMMES.find((x) => x.id === gamme) ?? GAMMES[0];
  const style = useMemo(() => {
    const v: Record<string, string> = { ...variablesCharte(), ...variablesGamme(g) };
    return v as CSSProperties;
  }, [g]);

  const choix = 'min-h-11 rounded-lg bg-white px-3 text-sm ring-1 ring-black/10';
  const boutonsStatut = (l: Ligne, grand = false) => (
    <div className={`grid gap-1.5 ${grand ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2'}`}>
      {(['valide', 'a_retravailler', 'a_revoir', 'retire'] as const).map((s, k) => (
        <button key={s} type="button" disabled={enCours} data-actif={statutDe(l) === s} onClick={() => envoyer(l, s)}
          className={`min-h-11 rounded-lg bg-white px-2 text-xs font-semibold ring-1 disabled:opacity-60 ${BOUTONS[s]}`}>
          {COURTS[s]}{grand && <span className="ml-1 font-normal opacity-60">({k + 1})</span>}
        </button>
      ))}
    </div>
  );
  const champCommentaire = (l: Ligne, grand = false) => {
    const props = {
      value: brouillons[l.cle] ?? '', placeholder: 'Commentaire (puis choisir le statut)', maxLength: 4000,
      onChange: (e: { target: { value: string } }) => setBrouillons((b) => ({ ...b, [l.cle]: e.target.value })),
      className: 'w-full rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-black/10 min-h-11',
    };
    return grand ? <textarea rows={3} {...props} /> : <input type="text" {...props} />;
  };

  return (
    <div className="grid gap-4">
      <style>{SURFACES_CSS + '.rv-svg svg{width:100%;height:100%;display:block}'}</style>

      <div className="flex flex-wrap gap-2">
        {([['tous', `Toutes · ${lignes.length}`], ...STATUTS_ILLUSTRATION.map((s) => [s, `${LIBELLES_STATUTS_ILLUSTRATION[s]} · ${compteurs[s]}`]), ['a_regarder', `Nouveaux ou modifiés · ${aRegarder}`]] as [FiltreStatut, string][]).map(([v, t]) => (
          <button key={v} type="button" onClick={() => setFiltreStatut(v)}
            className={`min-h-11 rounded-full px-4 text-sm font-semibold ring-1 ring-black/10 ${filtreStatut === v ? 'bg-neutral-900 text-white' : v === 'tous' || v === 'a_regarder' ? 'bg-white' : COULEURS[v]}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
        <input type="search" value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Rechercher (clé, nom, soin, #hashtag)" className={`${choix} lg:col-span-2`} />
        <select value={filtreType} onChange={(e) => setFiltreType(e.target.value as typeof filtreType)} className={choix} aria-label="Type">
          <option value="tous">Tous les types</option>
          {(Object.keys(LIBELLES_TYPES_ASSET) as TypeAsset[]).map((t) => <option key={t} value={t}>{LIBELLES_TYPES_ASSET[t]}</option>)}
        </select>
        <select value={filtreRegistre} onChange={(e) => setFiltreRegistre(e.target.value as typeof filtreRegistre)} className={choix} aria-label="Registre">
          <option value="tous">Tous les registres</option>
          {(Object.keys(LIBELLES_REGISTRES) as Registre[]).map((r) => <option key={r} value={r}>{LIBELLES_REGISTRES[r]}</option>)}
        </select>
        <select value={filtreSoin} onChange={(e) => setFiltreSoin(e.target.value)} className={choix} aria-label="Soin ou fiche">
          <option value="tous">Tous les soins et fiches</option>
          {soins.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filtreSujet} onChange={(e) => setFiltreSujet(e.target.value)} className={choix} aria-label="Sujet">
          <option value="">Tous les sujets</option>
          {SUJETS_VISUELS.map((x) => <option key={x.id} value={x.id}>{x.libelle}</option>)}
        </select>
        <FiltreHashtag valeur={filtreHashtag} onChange={setFiltreHashtag} etat={hashtags} className={choix} />
        <select value={gamme} onChange={(e) => choisirGamme(e.target.value)} className={choix} aria-label="Gamme de couleurs de l’aperçu">
          {GAMMES.map((x) => <option key={x.id} value={x.id}>Gamme {x.nom}</option>)}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={copierRetours} className="min-h-11 rounded-lg bg-teal-800 px-4 text-sm font-semibold text-white hover:bg-teal-900">
          Copier les retours à traiter ({compteurs.a_retravailler})
        </button>
        <span className="text-xs text-neutral-500">{visibles.length} affichée(s) · raccourcis dans la vue agrandie : 1 Validé, 2 À retravailler, 3 À revoir, 4 Retiré, ← → suivante, Échap</span>
      </div>
      {export_ && (
        <div className="grid gap-2 rounded-lg bg-white p-3 ring-1 ring-black/10">
          <p className="text-sm">{export_.copie ? 'Copié dans le presse-papiers. ' : 'Copie automatique impossible : sélectionnez le texte ci-dessous. '}
            <button type="button" className="underline" onClick={() => setExport(null)}>Fermer</button></p>
          <textarea readOnly rows={8} value={export_.texte} className="w-full rounded bg-neutral-50 p-2 font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
        </div>
      )}

      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4" style={style}>
        {visibles.map((l) => {
          const s = statutDe(l);
          const derniere = (parCle.get(l.cle) ?? []).find((r) => r.commentaire);
          const msg = messages[l.cle];
          return (
            <li key={l.cle} className={`grid content-start gap-2 overflow-hidden rounded-xl bg-white text-sm ring-1 ${nouveau(l) || modifie(l) ? 'ring-2 ring-sky-400' : 'ring-black/5'}`}>
              <button type="button" onClick={() => setOuverte(l.cle)} className="relative block w-full" aria-label={`Agrandir ${l.titre}`}>
                {l.rendu.kind === 'svg' ? <Apercu html={l.svgRendu} fond={l.fond} petit={l.type === 'picto'} /> : <ApercuAutre l={l} />}
                <span className="absolute right-1.5 top-1.5 rounded bg-white/90 px-1.5 py-0.5 text-[11px] text-neutral-700 ring-1 ring-black/10">Agrandir</span>
              </button>
              <div className="grid gap-2 px-2.5 pb-2.5">
                <div className="flex flex-wrap items-center gap-1">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${COULEURS[s]}`}>{LIBELLES_STATUTS_ILLUSTRATION[s]}</span>
                  {nouveau(l) && <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-900">Nouveau</span>}
                  {modifie(l) && <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-900">Modifié</span>}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold" title={l.titre}>{l.titre}</p>
                  <p className="truncate text-[11px] text-neutral-500" title={l.detail}>{l.detail}</p>
                  <code className="block truncate text-[10px] text-neutral-400" title={l.cle}>{l.cle}</code>
                  {hashtagsDe(hashtags, l.cle).length > 0 && <p className="truncate text-[11px] text-sky-800">{hashtagsDe(hashtags, l.cle).map((h) => `#${h}`).join(' ')}</p>}
                </div>
                {derniere && <p className="line-clamp-2 text-xs text-neutral-700" title={derniere.commentaire ?? ''}>« {derniere.commentaire} »</p>}
                {etoilesRapides(l)}
                {boutonsStatut(l)}
                {champCommentaire(l)}
                {msg && <p className={`text-xs ${msg.ok ? 'text-teal-800' : 'text-red-700'}`}>{msg.message}</p>}
              </div>
            </li>
          );
        })}
      </ul>
      {!visibles.length && <p className="text-sm text-neutral-500">Aucune illustration pour ces filtres.</p>}

      {ligneOuverte && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-white" role="dialog" aria-modal="true" aria-label={ligneOuverte.titre} style={style}>
          <div className="mx-auto grid max-w-5xl gap-4 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-lg font-bold">{ligneOuverte.titre}</p>
                <p className="text-xs text-neutral-500">{ligneOuverte.detail} · <code>{ligneOuverte.cle}</code></p>
              </div>
              <div className="flex gap-2">
                <button type="button" disabled={indexOuverte <= 0} onClick={() => setOuverte(visibles[indexOuverte - 1].cle)} className="min-h-11 min-w-11 rounded-lg bg-white px-3 ring-1 ring-black/10 disabled:opacity-40" aria-label="Précédente">←</button>
                <button type="button" disabled={indexOuverte < 0 || indexOuverte >= visibles.length - 1} onClick={() => setOuverte(visibles[indexOuverte + 1].cle)} className="min-h-11 min-w-11 rounded-lg bg-white px-3 ring-1 ring-black/10 disabled:opacity-40" aria-label="Suivante">→</button>
                <button type="button" onClick={() => setOuverte(null)} className="min-h-11 rounded-lg bg-neutral-900 px-4 text-sm font-semibold text-white">Fermer</button>
              </div>
            </div>
            {(() => {
              // Avant / après : la dernière note porte sur une autre version que l'actuelle
              const notee = empreintesNotees[ligneOuverte.cle];
              const actuelle = empreinteAsset(ligneOuverte, ligneOuverte.svgRendu || null);
              return notee && actuelle && notee !== actuelle ? (
                <AvantApres key={ligneOuverte.cle} cle={ligneOuverte.cle}>
                  {ligneOuverte.rendu.kind === 'svg' ? <Apercu html={ligneOuverte.svgRendu} fond={ligneOuverte.fond} grand petit={ligneOuverte.type === 'picto'} /> : <ApercuAutre l={ligneOuverte} grand />}
                </AvantApres>
              ) : null;
            })()}
            <div className={`grid gap-3 ${ligneOuverte.rendu.kind === 'svg' && ligneOuverte.rendu.svgVariante ? 'md:grid-cols-2' : ''}`}>
              {ligneOuverte.rendu.kind === 'svg' ? <Apercu html={ligneOuverte.svgRendu} fond={ligneOuverte.fond} grand petit={ligneOuverte.type === 'picto'} /> : <ApercuAutre l={ligneOuverte} grand />}
              {ligneOuverte.rendu.kind === 'svg' && ligneOuverte.rendu.svgVariante && (
                <div className="grid gap-1">
                  <Apercu html={ligneOuverte.rendu.svgVariante()} fond="grille" grand />
                  <p className="text-xs text-neutral-500">Même élément en registre relevé.</p>
                </div>
              )}
            </div>
            <div className="grid gap-3 md:grid-cols-[1fr_1fr]">
              <div className="grid content-start gap-2">
                <p className="text-sm">Statut : <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${COULEURS[statutDe(ligneOuverte)]}`}>{LIBELLES_STATUTS_ILLUSTRATION[statutDe(ligneOuverte)]}</span>
                  {modifie(ligneOuverte) && <span className="ml-2 text-xs text-sky-800">rendu modifié depuis le dernier retour</span>}</p>
                {champCommentaire(ligneOuverte, true)}
                {boutonsStatut(ligneOuverte, true)}
                {etoilesRapides(ligneOuverte)}
                {messages[ligneOuverte.cle] && <p className={`text-xs ${messages[ligneOuverte.cle].ok ? 'text-teal-800' : 'text-red-700'}`}>{messages[ligneOuverte.cle].message}</p>}
                <p className="text-xs text-neutral-500">Source : <code className="break-all">{ligneOuverte.source}</code></p>
                <SujetsVisuel visuel={ligneOuverte} surcharges={surcharges} onChange={setSurcharges} compact />
                <HashtagsVisuel cle={ligneOuverte.cle} etat={hashtags} onChange={setHashtags} migrationManquante={migrationHashtags} compact />
                {ligneOuverte.soins.length > 0 && <p className="text-xs text-neutral-500">Soins et fiches (code) : {ligneOuverte.soins.join(', ')}</p>}
              </div>
              <div className="grid content-start gap-2">
                <p className="text-sm font-semibold">Historique</p>
                {(parCle.get(ligneOuverte.cle) ?? []).length === 0 && <p className="text-xs text-neutral-500">Aucun retour pour l’instant.</p>}
                <ol className="grid gap-2">
                  {(parCle.get(ligneOuverte.cle) ?? []).map((r) => (
                    <li key={r.id} className="rounded-lg bg-neutral-50 p-2 text-xs ring-1 ring-black/5">
                      <p className="text-neutral-500">
                        {new Date(r.le).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}{r.auteur ? ` · ${r.auteur}` : ''} ·{' '}
                        <span className={`rounded-full px-1.5 py-0.5 font-semibold ${COULEURS[r.statut]}`}>{LIBELLES_STATUTS_ILLUSTRATION[r.statut]}</span>
                        {r.empreinte && r.empreinte !== ligneOuverte.empreinte && <span className="ml-1 text-sky-800">(version antérieure)</span>}
                      </p>
                      {r.commentaire && <p className="mt-1 whitespace-pre-wrap text-neutral-800">{r.commentaire}</p>}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
