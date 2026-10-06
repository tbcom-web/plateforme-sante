'use client';

// Écrans des étapes 3 à 6 du parcours guidé (/creer ; l'étape 1 « Vos sujets » est components/ChoixSujets.tsx, la 2 dans Parcours.tsx) et vérification avant publication. Peu d'information à la fois,
// une recommandation par défaut, libellés explicites ; les champs avancés restent dans le formulaire complet (/mon-site).
import { useEffect, useId, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  basculerEnAvant,
  basculerSoin,
  choisirCouleurLibre,
  choisirGamme,
  couleursMarque,
  deplacerSoin,
  fichesConseilsValides,
  GAMMES_SOBRES,
  GAMMES_VITAMINEES,
  gammesConseillees,
  initiales,
  marquesLogo,
  natureCouleur,
  normaliserCouleur,
  pastilleGamme,
  placerSoin,
  praticienVide,
  soinsEnAvantValides,
  SOINS_EN_AVANT_MAX,
  SUJETS_FICHES_CONSEILS,
  svgMarque,
  svgMarqueImportee,
  couleursImportee,
  THEMES_FLUX,
  traitementLogo,
  GAMMES,
  type Gamme,
  type MarqueImportee,
  type ModeleManifeste,
  type PraticienDraft,
  type ResultatControle,
  type SiteDraft,
  type Univers,
  themeParId,
} from '@plateforme/core';
import Photo from '@/components/Photo';
import ConfirmationPublication from '@/components/ConfirmationPublication';
import SuiviPublication from '@/components/SuiviPublication';
import PortraitPraticien from '@/components/PortraitPraticien';
import SuggestionsVoisinage from '@/components/SuggestionsVoisinage';
import EditeurHoraires from '@/components/EditeurHoraires';
import type { SoinCatalogue } from '@/lib/sites';

type Maj = (patch: Partial<SiteDraft>) => void;

const carte = 'grid gap-4 rounded-2xl border border-black/10 bg-white p-4 sm:p-5';
const champ = 'h-12 w-full rounded-lg border border-neutral-300 bg-white px-3 text-base outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/25 aria-[invalid=true]:border-red-600';
const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';

function Badge({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-teal-800 px-2 py-0.5 text-[11px] font-semibold text-white">{children}</span>;
}

// ---------------------------------------------------------------------------------------------------------------
// Étape 3 : couleurs
// ---------------------------------------------------------------------------------------------------------------

function Pastille({ g, actif, recommandee, onChoisir, petite = false }: { g: Gamme; actif: boolean; recommandee?: boolean; onChoisir: () => void; petite?: boolean }) {
  const [a, b] = pastilleGamme(g);
  return (
    <button
      type="button"
      role="radio"
      aria-checked={actif}
      onClick={onChoisir}
      className={`flex items-center gap-3 rounded-xl border p-2.5 text-left ${focus} ${actif ? 'border-teal-700 bg-teal-50 ring-1 ring-teal-700' : 'border-neutral-200 bg-white hover:bg-neutral-50'}`}
    >
      <span aria-hidden="true" className={`relative shrink-0 overflow-hidden rounded-full ring-1 ring-black/10 ${petite ? 'size-8' : 'size-11'}`} style={{ background: `linear-gradient(135deg, ${a} 0 50%, ${b} 50% 100%)` }} />
      <span className="grid gap-0.5">
        <span className={`font-semibold ${petite ? 'text-sm' : ''}`}>{g.nom}</span>
        {recommandee && <span><Badge>Recommandée</Badge></span>}
      </span>
    </button>
  );
}

export function EtapeCouleurs({ d, modele, univers, onTheme }: { d: SiteDraft; modele: ModeleManifeste; univers?: Univers; onTheme: (t: SiteDraft['theme']) => void }) {
  const conseillees = gammesConseillees(modele);
  const recommandee = univers?.preReglage.gamme ?? conseillees[0]?.id;
  const nature = natureCouleur(d.theme, modele);
  const [saisie, setSaisie] = useState(d.theme.couleur);
  useEffect(() => setSaisie(d.theme.couleur), [d.theme.couleur]);
  const idAide = useId();
  const autres = (liste: Gamme[]) => liste.filter((g) => !conseillees.some((c) => c.id === g.id));

  return (
    <>
      <fieldset className={carte}>
        <legend className="sr-only">Couleurs conseillées</legend>
        <p className="text-lg font-semibold">Couleurs conseillées pour ce site</p>
        <div role="radiogroup" aria-label="Couleurs conseillées" className="grid gap-2 sm:grid-cols-2">
          {conseillees.map((g) => (
            <Pastille key={g.id} g={g} actif={d.theme.gamme === g.id} recommandee={g.id === recommandee} onChoisir={() => onTheme(choisirGamme(d.theme, g.id))} />
          ))}
        </div>
      </fieldset>

      <details className={carte} open={nature === 'autre'}>
        <summary className={`cursor-pointer rounded font-semibold ${focus}`}>Plus de couleurs</summary>
        <div role="radiogroup" aria-label="Toutes les couleurs" className="grid gap-4">
          {[['Vives', autres(GAMMES_VITAMINEES)], ['Sobres', autres(GAMMES_SOBRES)]].map(([titre, liste]) => (
            <div key={titre as string} className="grid gap-2">
              <p className="text-sm font-medium text-neutral-600">{titre as string}</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {(liste as Gamme[]).map((g) => <Pastille key={g.id} petite g={g} actif={d.theme.gamme === g.id} onChoisir={() => onTheme(choisirGamme(d.theme, g.id))} />)}
              </div>
            </div>
          ))}
        </div>
      </details>

      <details className={carte} open={nature === 'libre'}>
        <summary className={`cursor-pointer rounded font-semibold ${focus}`}>Ma couleur</summary>
        <div className="flex flex-wrap items-end gap-3">
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Choisir</span>
            <input type="color" value={d.theme.couleur} onChange={(e) => onTheme(choisirCouleurLibre(d.theme, e.target.value))} className="h-12 w-16 cursor-pointer rounded-lg border border-neutral-300 bg-white p-1" />
          </label>
          <label className="grid flex-1 gap-1.5 text-sm">
            <span className="font-medium">Ou saisir le code (ex. #2d5bff)</span>
            <input
              className={champ}
              value={saisie}
              aria-describedby={idAide}
              aria-invalid={saisie !== '' && !normaliserCouleur(saisie)}
              onChange={(e) => { setSaisie(e.target.value); if (normaliserCouleur(e.target.value)) onTheme(choisirCouleurLibre(d.theme, e.target.value)); }}
            />
          </label>
        </div>
        <p id={idAide} className="text-sm text-neutral-600">
          Votre couleur est ajustée automatiquement là où il le faut pour que les textes restent lisibles.
          {nature === 'libre' && ' Couleur personnalisée en cours.'}
        </p>
      </details>
    </>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Étape 4 : cabinet
// ---------------------------------------------------------------------------------------------------------------

type ChampProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  /** Avertissements non bloquants (affichés en ambre, le champ reste valide) */
  avertissements?: string[];
  messages?: string[];
  aide?: string;
  montrer: boolean;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>;

/** Champ avec validation douce : les messages des contrôles de publication s'affichent après la saisie */
function Champ({ label, value, onChange, messages = [], avertissements = [], aide, montrer, onBlur, ...rest }: ChampProps) {
  const idBase = useId();
  const [touche, setTouche] = useState(false);
  const visibles = touche || montrer ? messages : [];
  const avertis = touche || montrer ? avertissements : [];
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      <input
        className={champ}
        value={value}
        aria-invalid={visibles.length > 0}
        aria-describedby={`${idBase}-aide ${idBase}-msg`}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => { setTouche(true); onBlur?.(e); }}
        {...rest}
      />
      {aide && <span id={`${idBase}-aide`} className="text-xs text-neutral-500">{aide}</span>}
      <span id={`${idBase}-msg`} className="grid gap-0.5 text-xs text-red-700">{visibles.map((m) => <span key={m}>{m}</span>)}{avertis.map((m) => <span key={m} className="text-amber-800">{m}</span>)}</span>
    </label>
  );
}

const qui = (p: PraticienDraft, i: number) => (p.prenom || p.nom ? `${p.prenom} ${p.nom}`.trim() : `praticien ${i + 1}`);

export function EtapeCabinet({ d, controle, maj, lienAvance }: { d: SiteDraft; controle: ResultatControle; maj: Maj; lienAvance: string }) {
  const [montrer, setMontrer] = useState(false);
  const lieu = d.lieux[0];
  // Plus rien n'est bloquant : informations manquantes (remplacées sur le site par une mention sobre) en ambre, près du champ.
  const filtre = (re: RegExp, personne?: string, avecConseils = false) =>
    [...new Set([...controle.remplacements, ...(avecConseils ? controle.conseils : [])])].filter((b) => re.test(b) && (!personne || b.includes(`(${personne})`)));
  const majLieu = (patch: Partial<typeof lieu>) => maj({ lieux: d.lieux.map((l, j) => (j === 0 ? { ...l, ...patch } : l)) });
  const majPraticien = (i: number, patch: Partial<PraticienDraft>) => maj({ praticiens: d.praticiens.map((p, j) => (j === i ? { ...p, ...patch } : p)) });
  const idRdv = useId();
  const reste = controle.remplacements.filter((b) => !/compétence/i.test(b));

  return (
    <>
      <fieldset className={carte}>
        <legend className="sr-only">Le cabinet</legend>
        <p className="text-lg font-semibold">Le cabinet</p>
        <Champ montrer={montrer} label="Nom du cabinet (facultatif)" aide="À défaut, « Cabinet de » suivi du nom des praticiens." value={d.cabinet.nom} onChange={(v) => maj({ cabinet: { ...d.cabinet, nom: v } })} avertissements={filtre(/Nom du cabinet/)} />
        <Champ montrer={montrer} label="Adresse" autoComplete="street-address" value={lieu.adresse} onChange={(v) => majLieu({ adresse: v })} avertissements={filtre(/^Adresse incomplète/)} />
        <div className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-3">
          <Champ montrer={montrer} label="Code postal" inputMode="numeric" autoComplete="postal-code" value={lieu.codePostal} onChange={(v) => majLieu({ codePostal: v.replace(/[^\dA-Za-z -]/g, '').slice(0, 10) })} avertissements={filtre(/Code postal/)} />
          <Champ
            montrer={montrer}
            label="Ville"
            autoComplete="address-level2"
            value={lieu.ville}
            onChange={(v) => maj({ lieux: d.lieux.map((l, j) => (j === 0 ? { ...l, ville: v } : l)), cabinet: { ...d.cabinet, ville: !d.cabinet.ville || d.cabinet.ville === lieu.ville ? v : d.cabinet.ville } })}
            avertissements={filtre(/^Ville/, undefined, true)}
          />
        </div>
        <SuggestionsVoisinage d={d} maj={maj} avecChamps />
        <Champ montrer={montrer} label="Téléphone du cabinet" type="tel" autoComplete="tel" value={d.cabinet.telephone} onChange={(v) => maj({ cabinet: { ...d.cabinet, telephone: v } })} avertissements={filtre(/^Téléphone/)} />
      </fieldset>

      <fieldset className={carte}>
        <legend className="sr-only">Praticiens</legend>
        <p className="text-lg font-semibold">{d.praticiens.length > 1 ? 'Les praticiens' : 'Le praticien'}</p>
        {d.praticiens.map((p, i) => (
          <div key={p.id} className="grid gap-3 rounded-xl bg-neutral-50 p-3">
            <div className="flex items-center justify-between">
              <p className="font-medium">{d.praticiens.length > 1 ? `Praticien ${i + 1}` : 'Vous'}</p>
              {d.praticiens.length > 1 && (
                <button type="button" className={`min-h-11 rounded px-2 text-sm text-red-700 ${focus}`} onClick={() => maj({ praticiens: d.praticiens.filter((_, j) => j !== i) })}>
                  Retirer
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Champ montrer={montrer} label="Prénom" autoComplete="given-name" value={p.prenom} onChange={(v) => majPraticien(i, { prenom: v })} avertissements={filtre(/^Prénom non renseigné/, qui(p, i), true)} />
              <Champ montrer={montrer} label="Nom" autoComplete="family-name" value={p.nom} onChange={(v) => majPraticien(i, { nom: v })} avertissements={[...filtre(/^Nom de famille/, qui(p, i)), ...(i === 0 ? filtre(/^Aucun praticien nommé/) : [])]} />
            </div>
            {d.pays === 'FR' && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Champ montrer={montrer} label="N° d’inscription à l’Ordre" aide="9 chiffres, sur annuaire.sante.fr" inputMode="numeric" value={p.numeroOrdre} onChange={(v) => majPraticien(i, { numeroOrdre: v.replace(/\D/g, '').slice(0, 11) })} avertissements={controle.conseils.filter((c) => /Ordre/.test(c) && c.includes(`(${qui(p, i)})`))} />
                <Champ montrer={montrer} label="N° RPPS (facultatif)" aide="11 chiffres" inputMode="numeric" value={p.rpps} onChange={(v) => majPraticien(i, { rpps: v.replace(/\D/g, '').slice(0, 11) })} avertissements={controle.conseils.filter((c) => /^(Le RPPS|Vérifier le RPPS)/.test(c) && c.includes(`(${qui(p, i)})`))} />
              </div>
            )}
            {d.pays === 'BE' && <Champ montrer={montrer} label="N° INAMI" placeholder="5-12345-12-123" value={p.inami} onChange={(v) => majPraticien(i, { inami: v })} avertissements={filtre(/INAMI/, qui(p, i))} />}
            {d.pays === 'CH' && <Champ montrer={montrer} label="N° RCC / ZSR" value={p.rcc} onChange={(v) => majPraticien(i, { rcc: v })} />}
          </div>
        ))}
        {d.praticiens.length < 6 && (
          <button type="button" className={`min-h-11 justify-self-start rounded px-1 text-sm font-semibold text-teal-800 ${focus}`} onClick={() => maj({ praticiens: [...d.praticiens, praticienVide('collaborateur')] })}>
            + Ajouter un praticien
          </button>
        )}
      </fieldset>

      <fieldset className={carte}>
        <legend className="sr-only">Horaires</legend>
        <p className="text-lg font-semibold">Horaires</p>
        <EditeurHoraires lieux={d.lieux} onLieux={(lieux) => maj({ lieux })} domicile={d.domicile} onDomicileJours={(jours) => maj({ domicile: { ...d.domicile, jours } })} />
      </fieldset>

      <fieldset className={carte}>
        <legend className="sr-only">Prise de rendez-vous</legend>
        <p className="text-lg font-semibold">Prise de rendez-vous</p>
        <div role="radiogroup" aria-label="Comment prendre rendez-vous" className="grid gap-2 sm:grid-cols-2">
          {([['les_deux', 'En ligne et par téléphone', true], ['telephone', 'Par téléphone uniquement', false]] as const).map(([v, l, reco]) => (
            <button key={v} type="button" role="radio" aria-checked={d.rdv.mode === v || (v === 'les_deux' && d.rdv.mode === 'en_ligne')} onClick={() => maj({ rdv: { ...d.rdv, mode: v } })} className={`flex min-h-12 items-center justify-between gap-2 rounded-xl border px-3 text-left text-sm font-semibold ${focus} ${d.rdv.mode === v || (v === 'les_deux' && d.rdv.mode === 'en_ligne') ? 'border-teal-700 bg-teal-50' : 'border-neutral-200'}`}>
              {l}{reco && <Badge>Recommandé</Badge>}
            </button>
          ))}
        </div>
        {d.rdv.mode !== 'telephone' && (
          <Champ montrer={montrer} id={idRdv} label="Lien de prise de rendez-vous" type="url" inputMode="url" placeholder="https://www.doctolib.fr/…" aide="La page du praticien sur la plateforme, pas son accueil." value={d.rdv.url} onChange={(v) => maj({ rdv: { ...d.rdv, url: v.trim() } })} avertissements={[...filtre(/^(Lien de prise de rendez-vous|Le lien de rendez-vous)/), ...controle.conseils.filter((c) => /Doctolib/.test(c))]} />
        )}
      </fieldset>

      <div className="grid gap-2 rounded-2xl bg-neutral-50 p-4 text-sm">
        {reste.length ? (
          <>
            <p className="font-semibold text-amber-900">Informations manquantes ({reste.length}) : le site affichera une mention sobre à la place, la mise en ligne reste possible.</p>
            <button type="button" className={`min-h-11 justify-self-start rounded px-1 font-semibold text-teal-800 underline ${focus}`} onClick={() => setMontrer(true)}>Montrer les champs concernés</button>
          </>
        ) : (
          <p className="font-semibold text-teal-900">Les informations essentielles sont complètes.</p>
        )}
        <p className="text-neutral-600">E-mail, accès, diplômes, tarifs, matériel : <Link className="font-semibold text-teal-800 underline" href={lienAvance}>réglages avancés</Link>.</p>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Étape 5 : soins et image
// ---------------------------------------------------------------------------------------------------------------

export function EtapeSoinsImage({
  d, id, catalogue, suggestions, modele, marquesImportees, maj, onSuggestion,
}: {
  d: SiteDraft;
  id: string | null;
  catalogue: SoinCatalogue[];
  suggestions: string[];
  modele: ModeleManifeste;
  marquesImportees: MarqueImportee[];
  maj: Maj;
  /** Soins suggérés affichés mais pas encore confirmés (aperçu ; « Continuer » les confirme) */
  onSuggestion: (e: { soins: string[]; enAvant: string[] } | null) => void;
}) {
  // Aucun soin coché : les soins des sujets choisis (sinon du modèle) sont pré-cochés en suggestion, enregistrés seulement après confirmation
  const [aConfirmer, setAConfirmer] = useState(d.soins.length === 0 && suggestions.length > 0);
  const etat = aConfirmer
    ? { soins: suggestions, enAvant: suggestions.slice(0, SOINS_EN_AVANT_MAX) }
    : { soins: d.soins, enAvant: soinsEnAvantValides(d.theme.soinsEnAvant, d.soins) };
  const ecrire = (e: { soins: string[]; enAvant: string[] }) => {
    setAConfirmer(false);
    maj({ soins: e.soins, theme: { ...d.theme, soinsEnAvant: e.enAvant } });
  };
  // Suggestion en attente : montrée dans l'aperçu, confirmée par « Je confirme » ou « Continuer » (Parcours)
  const cle = aConfirmer ? suggestions.join(',') : '';
  useEffect(() => {
    onSuggestion(aConfirmer ? { soins: suggestions, enAvant: suggestions.slice(0, SOINS_EN_AVANT_MAX) } : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cle]);

  const titreSoin = (slug: string) => catalogue.find((c) => c.slug === slug)?.titre_court ?? slug;
  const suggeres = catalogue.filter((c) => suggestions.includes(c.slug));
  const autres = catalogue.filter((c) => !suggestions.includes(c.slug));
  const [glisse, setGlisse] = useState<string | null>(null);

  const caseSoin = (s: SoinCatalogue, suggere: boolean) => {
    const coche = etat.soins.includes(s.slug);
    return (
      <label key={s.slug} className={`flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border p-3 ${coche ? 'border-teal-700 bg-teal-50' : 'border-neutral-200 bg-white hover:bg-neutral-50'}`}>
        <input type="checkbox" className="mt-0.5 size-5 shrink-0 accent-teal-800" checked={coche} onChange={(e) => ecrire(basculerSoin(etat, s.slug, e.target.checked))} />
        <span className="grid gap-0.5">
          <span className="font-semibold">{s.titre_court}{suggere && aConfirmer && <span className="ml-2 align-middle text-xs font-medium text-teal-800">suggéré</span>}</span>
          <span className="text-sm text-neutral-600">{s.resume}</span>
        </span>
      </label>
    );
  };

  // Logo : marque dessinée dans le style du modèle, ou logo envoyé
  const traitement = traitementLogo(modele);
  const couleurs = couleursMarque(modele, { couleur: d.theme.couleur, gamme: d.theme.gamme || null });
  const sigle = initiales(d.cabinet.nom || `${d.praticiens[0]?.prenom ?? ''} ${d.praticiens[0]?.nom ?? ''}`).replace(/[^\p{L}]/gu, '');
  const apercuMarque = (mid: string) => {
    const imp = marquesImportees.find((x) => x.id === mid);
    return imp
      ? svgMarqueImportee(imp, couleursImportee(traitement.marque, couleurs, traitement.rayon), 48)
      : svgMarque(mid, couleurs, { traitement: traitement.marque, rayon: traitement.rayon, epais: traitement.epais, taille: 48, initiales: sigle, police: traitement.police, graisse: traitement.graisse });
  };
  const [modeLogo, setModeLogo] = useState<'marque' | 'perso'>(d.theme.logoPerso.url ? 'perso' : 'marque');

  return (
    <>
      <section className={carte} aria-labelledby="titre-soins">
        <h2 id="titre-soins" className="text-lg font-semibold">Vos soins</h2>
        {aConfirmer && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Suggestion d’après vos sujets et le modèle : décochez les soins que vous ne pratiquez pas. Chaque soin coché aura sa page sur votre site.
          </p>
        )}
        <div className="grid gap-2">{suggeres.map((s) => caseSoin(s, true))}</div>
        {autres.length > 0 && (
          <details className="grid gap-2">
            <summary className={`min-h-11 cursor-pointer content-center rounded font-semibold text-teal-800 ${focus}`}>Autres soins ({autres.filter((s) => etat.soins.includes(s.slug)).length} cochés sur {autres.length})</summary>
            <div className="mt-2 grid gap-2">{autres.map((s) => caseSoin(s, false))}</div>
          </details>
        )}
        {catalogue.length === 0 && <p className="text-sm text-red-700">Catalogue des soins indisponible pour le moment.</p>}
        {aConfirmer && (
          <button type="button" onClick={() => ecrire(etat)} className={`min-h-11 justify-self-start rounded-lg bg-teal-800 px-4 text-sm font-semibold text-white ${focus}`}>
            Je confirme ces soins
          </button>
        )}
      </section>

      {/* Soins mis en avant : pré-remplis par les sujets ; l'ordre manuel est un réglage avancé, replié par défaut */}
      <details className={carte}>
        <summary className={`min-h-11 cursor-pointer content-center rounded ${focus}`}>
          <span className="font-semibold">Réglages avancés</span>
          <span className="block text-sm text-neutral-600">
            Soins mis en avant sur l’accueil{etat.enAvant.length ? ` : ${etat.enAvant.map(titreSoin).join(', ')}` : ''} (tirés de vos sujets)
          </span>
        </summary>
        <div className="mt-3 grid gap-3">
        <div>
          <h2 className="text-lg font-semibold">À mettre en avant</h2>
          <p className="text-sm text-neutral-600">Les {SOINS_EN_AVANT_MAX} soins montrés en premier sur l’accueil. Réordonnez avec les flèches ou en glissant.</p>
        </div>
        <ol className="grid gap-2">
          {etat.enAvant.map((slug, k) => (
            <li
              key={slug}
              draggable
              onDragStart={() => setGlisse(slug)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => { if (glisse) ecrire({ ...etat, enAvant: placerSoin(etat.enAvant, glisse, k) }); setGlisse(null); }}
              className="flex min-h-12 items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3"
            >
              <span aria-hidden="true" className="cursor-grab select-none text-neutral-400">⠿</span>
              <span className="w-5 font-semibold text-teal-800">{k + 1}</span>
              <span className="flex-1 font-medium">{titreSoin(slug)}</span>
              <button type="button" aria-label={`Monter ${titreSoin(slug)}`} disabled={k === 0} onClick={() => ecrire({ ...etat, enAvant: deplacerSoin(etat.enAvant, slug, -1) })} className={`grid size-11 place-items-center rounded-lg text-lg disabled:opacity-30 ${focus}`}>↑</button>
              <button type="button" aria-label={`Descendre ${titreSoin(slug)}`} disabled={k === etat.enAvant.length - 1} onClick={() => ecrire({ ...etat, enAvant: deplacerSoin(etat.enAvant, slug, 1) })} className={`grid size-11 place-items-center rounded-lg text-lg disabled:opacity-30 ${focus}`}>↓</button>
              <button type="button" aria-label={`Ne plus mettre en avant ${titreSoin(slug)}`} onClick={() => ecrire({ ...etat, enAvant: basculerEnAvant(etat.enAvant, slug, etat.soins) })} className={`grid size-11 place-items-center rounded-lg text-neutral-500 ${focus}`}>✕</button>
            </li>
          ))}
        </ol>
        {etat.enAvant.length < SOINS_EN_AVANT_MAX && etat.soins.some((s) => !etat.enAvant.includes(s)) && (
          <div className="flex flex-wrap gap-2">
            {etat.soins.filter((s) => !etat.enAvant.includes(s)).map((s) => (
              <button key={s} type="button" onClick={() => ecrire({ ...etat, enAvant: basculerEnAvant(etat.enAvant, s, etat.soins) })} className={`min-h-11 rounded-full bg-white px-3 text-sm font-medium ring-1 ring-neutral-300 ${focus}`}>
                + {titreSoin(s)}
              </button>
            ))}
          </div>
        )}
        </div>
      </details>

      <section className={carte} aria-labelledby="titre-portraits">
        <div>
          <h2 id="titre-portraits" className="text-lg font-semibold">{d.praticiens.length > 1 ? 'Portraits des praticiens' : 'Votre portrait'}</h2>
          <p className="text-sm text-neutral-600">Facultatif. Sans portrait, le site affiche un monogramme.</p>
        </div>
        {d.praticiens.map((p, i) => (
          <PortraitPraticien key={p.id} siteId={id} praticien={p} label={qui(p, i)} theme={d.theme} onChange={(m) => maj({ praticiens: d.praticiens.map((x, j) => (j === i ? { ...x, ...m } : x)) })} />
        ))}
      </section>

      <section className={carte} aria-labelledby="titre-logo">
        <h2 id="titre-logo" className="text-lg font-semibold">Logo</h2>
        <div role="radiogroup" aria-label="Type de logo" className="grid gap-2 sm:grid-cols-2">
          {([['marque', 'Une marque proposée', true], ['perso', 'J’ai déjà un logo', false]] as const).map(([v, l, reco]) => (
            <button key={v} type="button" role="radio" aria-checked={modeLogo === v} onClick={() => { setModeLogo(v); if (v === 'marque' && d.theme.logoPerso.url) maj({ theme: { ...d.theme, logoPerso: { ...d.theme.logoPerso, url: '' } } }); }} className={`flex min-h-12 items-center justify-between gap-2 rounded-xl border px-3 text-left text-sm font-semibold ${focus} ${modeLogo === v ? 'border-teal-700 bg-teal-50' : 'border-neutral-200'}`}>
              {l}{reco && <Badge>Recommandé</Badge>}
            </button>
          ))}
        </div>
        {modeLogo === 'marque' ? (
          <div role="radiogroup" aria-label="Marques dans le style du site" className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {[...marquesLogo('podologie'), ...marquesImportees].map((m) => (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={d.theme.logo.marque === m.id}
                title={m.sens}
                onClick={() => maj({ theme: { ...d.theme, logo: { ...d.theme.logo, marque: m.id } } })}
                className={`grid justify-items-center gap-1.5 rounded-xl border p-2.5 text-xs ${focus} ${d.theme.logo.marque === m.id ? 'border-teal-700 bg-teal-50 ring-1 ring-teal-700' : 'border-neutral-200 hover:bg-neutral-50'}`}
              >
                <span aria-hidden="true" dangerouslySetInnerHTML={{ __html: apercuMarque(m.id) }} />
                <span className="font-semibold">{m.nom}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="grid gap-2">
            <Photo siteId={id} type="logo" largeurMax={800} label="Votre logo (PNG à fond transparent de préférence)" valeur={d.theme.logoPerso.url} onChange={(u) => maj({ theme: { ...d.theme, logoPerso: { ...d.theme.logoPerso, url: u } } })} />
            {d.theme.logoPerso.url && (
              <label className="flex min-h-11 items-center gap-2 text-sm">
                <input type="checkbox" className="size-5 accent-teal-800" checked={d.theme.logoPerso.complet} onChange={(e) => maj({ theme: { ...d.theme, logoPerso: { ...d.theme.logoPerso, complet: e.target.checked } } })} />
                Mon logo contient déjà le nom du cabinet
              </label>
            )}
          </div>
        )}
      </section>
    </>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Étape 6 : contenus
// ---------------------------------------------------------------------------------------------------------------

export function EtapeContenus({ d, univers, maj }: { d: SiteDraft; univers?: Univers; maj: Maj }) {
  const proposees = univers?.preReglage.fichesConseils ?? [];
  const fiches = d.fichesConseils ?? [];
  const basculerFiche = (f: string, coche: boolean) => maj({ fichesConseils: fichesConseilsValides(coche ? [...fiches, f] : fiches.filter((x) => x !== f)) });
  const caseFiche = (s: (typeof SUJETS_FICHES_CONSEILS)[number]) => (
    <label key={s.id} className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg p-1.5 text-sm hover:bg-neutral-50">
      <input type="checkbox" className="mt-0.5 size-5 shrink-0 accent-teal-800" checked={fiches.includes(s.id)} onChange={(e) => basculerFiche(s.id, e.target.checked)} />
      <span>{s.titre}</span>
    </label>
  );
  return (
    <>
      <fieldset className={carte}>
        <legend className="sr-only">Articles d’actualité</legend>
        <div>
          <p className="text-lg font-semibold">Articles d’actualité</p>
          <p className="text-sm text-neutral-600">Des articles relus par la plateforme, proposés sur les thèmes choisis.</p>
        </div>
        <div role="radiogroup" aria-label="Publication des articles" className="grid gap-2">
          {([['manuel', 'Je valide chaque article', 'Ils vous sont proposés dans le tableau de bord.', true], ['auto', 'Publication automatique', 'Les articles des thèmes choisis sont publiés sans relecture.', false]] as const).map(([v, l, desc, reco]) => (
            <button key={v} type="button" role="radio" aria-checked={d.flux.mode === v} onClick={() => maj({ flux: { ...d.flux, mode: v } })} className={`grid gap-0.5 rounded-xl border p-3 text-left ${focus} ${d.flux.mode === v ? 'border-teal-700 bg-teal-50' : 'border-neutral-200'}`}>
              <span className="flex flex-wrap items-center gap-2 font-semibold">{l}{reco && <Badge>Recommandé</Badge>}</span>
              <span className="text-sm text-neutral-600">{desc}</span>
            </button>
          ))}
        </div>
        <div role="group" aria-label="Thèmes suivis">
          <p className="mb-2 text-sm font-medium">Thèmes suivis</p>
          <div className="flex flex-wrap gap-2">
            {THEMES_FLUX.map((th) => {
              const actif = d.flux.themes.includes(th);
              return (
                <button key={th} type="button" aria-pressed={actif} onClick={() => maj({ flux: { ...d.flux, themes: actif ? d.flux.themes.filter((x) => x !== th) : [...d.flux.themes, th] } })} className={`min-h-11 rounded-full px-3.5 text-sm font-medium ring-1 ${focus} ${actif ? 'bg-teal-800 text-white ring-teal-800' : 'bg-white text-neutral-700 ring-neutral-300'}`}>
                  {th}
                </button>
              );
            })}
          </div>
          {d.flux.themes.length === 0 && <p className="mt-2 text-xs text-neutral-500">Aucun thème coché : tous les thèmes sont suivis.</p>}
        </div>
      </fieldset>

      <fieldset className={carte}>
        <legend className="sr-only">Fiches conseils</legend>
        <div>
          <p className="text-lg font-semibold">Fiches conseils pour vos patients</p>
          <p className="text-sm text-neutral-600">Des fiches pratiques à lire avant ou après le rendez-vous. Celles du modèle sont cochées.</p>
        </div>
        <div className="grid gap-1">{SUJETS_FICHES_CONSEILS.filter((s) => (proposees as readonly string[]).includes(s.id) || fiches.includes(s.id)).map(caseFiche)}</div>
        <details>
          <summary className={`min-h-11 cursor-pointer content-center rounded text-sm font-semibold text-teal-800 ${focus}`}>Autres fiches</summary>
          <div className="mt-1 grid gap-1">{SUJETS_FICHES_CONSEILS.filter((s) => !(proposees as readonly string[]).includes(s.id) && !fiches.includes(s.id)).map(caseFiche)}</div>
        </details>
      </fieldset>
    </>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Vérifier et publier
// ---------------------------------------------------------------------------------------------------------------

/** Étape où se complète une information manquante */
const etapeDuManque = (m: string) => (/compétence/i.test(m) ? 5 : 4);

export function Verification({
  d, siteId, controle, catalogue, univers, admin, enCours, publication, onModifier, onPublier, lienAvance,
}: {
  d: SiteDraft;
  controle: ResultatControle;
  catalogue: SoinCatalogue[];
  univers?: Univers;
  admin: boolean;
  enCours: boolean;
  publication: { ok: boolean; message: string } | null;
  /** Site enregistré : suivi de la publication une fois lancée */
  siteId?: string | null;
  onModifier: (etape: number) => void;
  onPublier: () => void | Promise<void>;
  lienAvance: string;
}) {
  const g = GAMMES.find((x) => x.id === d.theme.gamme);
  const noms = d.praticiens.map((p) => `${p.prenom} ${p.nom}`.trim()).filter(Boolean);
  const lieu = d.lieux[0];
  const titreSoin = (slug: string) => catalogue.find((c) => c.slug === slug)?.titre_court ?? slug;
  const enAvant = soinsEnAvantValides(d.theme.soinsEnAvant, d.soins);
  const lignes: [string, ReactNode, number][] = [
    ['Sujets', d.priorites.principaux.length ? [...d.priorites.principaux.map((x, i) => `${i + 1}. ${themeParId(x)?.court ?? x}`), ...(d.priorites.secondaires.length ? [`aussi : ${d.priorites.secondaires.map((x) => themeParId(x)?.court ?? x).join(', ')}`] : [])].join(' · ') : 'Aucun', 1],
    ['Site', univers?.nom ?? '—', 2],
    ['Couleurs', g ? g.nom : <span className="inline-flex items-center gap-2"><span aria-hidden="true" className="size-4 rounded-full ring-1 ring-black/10" style={{ background: d.theme.couleur }} />Couleur personnalisée</span>, 3],
    ['Cabinet', [d.cabinet.nom, [lieu.adresse, lieu.codePostal, lieu.ville].filter(Boolean).join(' '), d.cabinet.telephone].filter(Boolean).join(' · ') || '—', 4],
    [d.praticiens.length > 1 ? 'Praticiens' : 'Praticien', noms.join(', ') || '—', 4],
    ['Rendez-vous', d.rdv.mode === 'telephone' ? 'Par téléphone' : d.rdv.url || 'Lien à indiquer', 4],
    ['Soins', d.soins.length ? `${d.soins.length} soin${d.soins.length > 1 ? 's' : ''}${enAvant.length ? `, en avant : ${enAvant.map(titreSoin).join(', ')}` : ''}` : 'Aucun', 5],
    ['Logo', d.theme.logoPerso.url ? 'Votre logo' : 'Marque proposée', 5],
    ['Articles', `${d.flux.mode === 'manuel' ? 'Validés par vous' : 'Publication automatique'}${d.flux.themes.length ? ` · ${d.flux.themes.join(', ')}` : ''}`, 6],
    ['Fiches conseils', `${(d.fichesConseils ?? []).length} fiche(s)`, 6],
  ];
  // Plus rien ne bloque la publication : avec des informations manquantes, une confirmation les liste (« Publier quand même »).
  const [confirmer, setConfirmer] = useState(false);
  const publierOuConfirmer = () => (controle.remplacements.length && !confirmer ? setConfirmer(true) : (setConfirmer(false), onPublier()));

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-start">
      <section className={carte} aria-labelledby="titre-recap">
        <h2 id="titre-recap" className="text-lg font-semibold">Récapitulatif</h2>
        <dl className="grid gap-0 divide-y divide-neutral-100">
          {lignes.map(([t, v, e]) => (
            <div key={t} className="grid grid-cols-[110px_minmax(0,1fr)_auto] items-center gap-2 py-2 text-sm">
              <dt className="font-medium text-neutral-600">{t}</dt>
              <dd className="break-words">{v}</dd>
              <dd><button type="button" onClick={() => onModifier(e)} className={`min-h-11 rounded px-2 font-semibold text-teal-800 ${focus}`} aria-label={`Modifier : ${t}`}>Modifier</button></dd>
            </div>
          ))}
        </dl>
        <p className="text-sm text-neutral-600">Photos du cabinet, accès, tarifs, matériel : <Link className="font-semibold text-teal-800 underline" href={lienAvance}>réglages avancés</Link>.</p>
      </section>

      <section className={carte} aria-labelledby="titre-publier">
        <h2 id="titre-publier" className="text-lg font-semibold">Avant la mise en ligne</h2>
        {controle.remplacements.length ? (
          <ul className="grid gap-2 text-sm" aria-label="Informations manquantes, remplacées sur le site par une mention sobre">
            {controle.remplacements.map((b) => (
              <li key={b} className="flex items-start justify-between gap-2 text-amber-900">
                <span className="flex gap-2"><span aria-hidden="true">●</span>{b}</span>
                <button type="button" onClick={() => onModifier(etapeDuManque(b))} className={`min-h-11 shrink-0 rounded px-1 font-semibold text-teal-800 ${focus}`}>Compléter</button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-lg bg-teal-50 px-3 py-2 text-sm font-medium text-teal-900">Tout est prêt pour la mise en ligne.</p>
        )}
        {controle.conseils.length > controle.remplacements.length && (
          <details className="text-sm">
            <summary className={`min-h-11 cursor-pointer content-center rounded font-semibold text-amber-900 ${focus}`}>Conseils facultatifs ({controle.conseils.length - controle.remplacements.length})</summary>
            <ul className="mt-1 grid gap-1 text-amber-900">{controle.conseils.filter((c) => !controle.remplacements.includes(c)).map((c) => <li key={c} className="flex gap-2"><span aria-hidden="true">○</span>{c}</li>)}</ul>
          </details>
        )}
        {confirmer && !enCours && !publication?.ok && (
          <ConfirmationPublication remplacements={controle.remplacements} onConfirmer={publierOuConfirmer} onAnnuler={() => setConfirmer(false)} />
        )}
        <button
          type="button"
          onClick={publierOuConfirmer}
          disabled={enCours || Boolean(publication?.ok)}
          className={`min-h-12 rounded-xl bg-teal-800 px-5 text-base font-semibold text-white hover:bg-teal-900 disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-500 ${focus}`}
        >
          {enCours ? 'Publication…' : 'Publier mon site'}
        </button>
        {publication?.ok && siteId ? (
          <SuiviPublication siteId={siteId} reessayer={async () => { await onPublier(); }} />
        ) : (
          <p role="status" aria-live="polite" className={`text-sm ${publication?.ok ? 'text-teal-800' : 'text-red-700'}`}>{publication?.message ?? ''}</p>
        )}
        {publication?.ok && <Link href="/tableau-de-bord" className="font-semibold text-teal-800 underline">Aller au tableau de bord →</Link>}
      </section>
    </div>
  );
}
