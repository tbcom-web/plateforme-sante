import {
  cleCandidatePhoto, clePhoto, estSourcePhotoLibre, gamme as gammeParId, hashtagsDe, inventaireAssets, inventaireStudio, libelleSujet, motsClesDuSujet,
  SUJETS_VISUELS, sujetsDuVisuel, universDuParcours, variablesGamme, type Asset,
} from '@plateforme/core';
import { typeIngredient } from '@plateforme/core/arrivages';
import { sujetDeLaProfession } from '@plateforme/core/professions';
import { exigerAdmin } from '@/lib/admin';
import { getArrivagesEnAttente } from '@/lib/arrivages';
import { getSurchargesSujets } from '@/lib/assets-notes';
import { getHashtagsAssets } from '@/lib/hashtags';
import { getMarquesImportees } from '@/lib/marques';
import { getModelesDisponibles } from '@/lib/modeles';
import { getMotsClesEnBase, sourcesConfigurees } from '@/lib/photos-libres';
import { getProfession } from '@/lib/profession';
import { getCatalogue } from '@/lib/sites';
import { themesActives } from '@/lib/themes';
import { getUnivers } from '@/lib/univers';
import Arrivages, { type ItemArrivage, type VisuelArrivage } from './Arrivages';

export const metadata = { title: 'Super admin · Arrivages' };

// ARRIVAGES (décision de Paul du 2026-10-08, docs/espaces-admin.md) : boîte d'entrée unique de tout ce qui est nouveau —
// nouveautés poussées par Claude (registre inventaire-connu.json : icônes, animations, mises en page, polices…), photos gardées ou
// images générées « à valider », et, à la demande, photos à découvrir (Pexels, Pixabay). Un geste : Accepter (au frigo) ou Refuser.
// Ce qui n'est pas accepté n'est pas utilisable par le générateur (ContexteImages, arrivages.ts).

const MAX_NOUVEAUTES = 150;

function visuelDe(a: Asset | undefined): VisuelArrivage {
  if (!a) return { kind: 'aucun' };
  if (a.rendu.kind === 'svg') {
    let svg = '';
    try { svg = a.rendu.svg(); } catch { svg = ''; }
    return svg ? { kind: 'svg', svg, fond: a.rendu.fond, picto: a.type === 'picto' } : { kind: 'aucun' };
  }
  if (a.rendu.kind === 'image') return { kind: 'image', src: a.rendu.src };
  if (a.rendu.kind === 'gamme') {
    const g = gammeParId(a.rendu.gamme);
    return { kind: 'gamme', couleurs: g ? Object.values(variablesGamme(g)).filter((v): v is string => typeof v === 'string' && v.startsWith('#')).slice(0, 6) : [] };
  }
  return { kind: 'studio', cle: a.rendu.cle };
}

export default async function PageArrivages({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await exigerAdmin();
  const sp = await searchParams;
  const profession = await getProfession();
  const [attente, surcharges, hashtags, motsCles] = await Promise.all([getArrivagesEnAttente(profession), getSurchargesSujets(), getHashtagsAssets(), getMotsClesEnBase()]);
  const parCle = new Map([...inventaireAssets(), ...inventaireStudio()].map((a) => [a.cle, a]));
  const sujetsProfession = SUJETS_VISUELS.filter((s) => sujetDeLaProfession(s, profession));

  const items: ItemArrivage[] = [];
  for (const n of attente.nouveautes.slice(0, MAX_NOUVEAUTES)) {
    const a = parCle.get(n.cle);
    items.push({
      id: `n:${n.cle}`, source: 'nouveautes', type: typeIngredient(n.cle), titre: a?.titre ?? n.cle, detail: a?.detail ?? null, date: n.date,
      arrivage: { kind: 'nouveaute', cle: n.cle, precedent: attente.statuts[n.cle] ?? null },
      visuel: visuelDe(a),
      sujets: a && a.rendu.kind !== 'studio' ? sujetsDuVisuel(a, surcharges).sujets : [],
      hashtags: hashtagsDe(hashtags.hashtags, n.cle),
    });
  }
  for (const p of attente.photos) {
    const cle = (p.url && clePhoto(p.url)) || (estSourcePhotoLibre(p.source) ? cleCandidatePhoto(p.source, p.idSource) : '');
    const sujets = cle ? sujetsDuVisuel({ cle, type: 'photo', soins: [p.sujet] }, surcharges).sujets : [p.sujet];
    items.push({
      id: `p:${p.id}`, source: p.source === 'ia' ? 'images-generees' : 'photos-libres', type: 'photo',
      titre: p.source === 'ia' ? `Image générée${p.iaOutil ? ` (${p.iaOutil})` : ''} · ${libelleSujet(p.sujet)}` : `Photo ${p.source === 'pexels' ? 'Pexels' : 'Pixabay'} · ${libelleSujet(p.sujet)}`,
      detail: p.url ? 'Hébergée chez nous' : 'Gardée, pas encore importée : « Accepter » l’importe (WebP, sans métadonnées)',
      date: (p.importeLe ?? p.telechargeLe ?? '').slice(0, 10) || null,
      arrivage: { kind: 'photo', id: p.id },
      visuel: p.url || p.apercuUrl ? { kind: 'image', src: (p.url ?? p.apercuUrl)! } : { kind: 'aucun' },
      sujets, hashtags: cle ? hashtagsDe(hashtags.hashtags, cle) : [],
      credit: p.source === 'ia' ? null : `${p.auteur}`, pageUrl: p.pageUrl,
    });
  }
  // Éléments du studio (polices, menus, mises en page, animations d'en-tête…) : aperçu de site de l'admin, données chargées à part
  const avecStudio = items.some((i) => i.visuel.kind === 'studio');
  const [modeles, catalogue, marquesImportees, univers] = avecStudio
    ? await Promise.all([getModelesDisponibles(), getCatalogue(), getMarquesImportees(), getUnivers()])
    : [[], [], [], { univers: [] }];

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <div>
        <h1 className="text-2xl font-bold">Arrivages</h1>
        <p className="mt-1 max-w-3xl text-sm text-neutral-600">
          Tout ce qui est nouveau, au même endroit. Accepter : l’élément entre au frigo et le générateur peut l’utiliser. Refuser : il n’est
          jamais utilisé. Touches A / R ou flèches → / ←, glisser au doigt ; Z annule la dernière décision.
        </p>
        {attente.nouveautes.length > MAX_NOUVEAUTES && (
          <p className="mt-1 text-sm text-neutral-600">
            {attente.nouveautes.length} nouveautés en attente : les {MAX_NOUVEAUTES} plus récentes sont dans la file, les suivantes arrivent au rechargement.
          </p>
        )}
      </div>
      <Arrivages
        items={items}
        sujets={sujetsProfession.map((s) => ({ id: s.id, libelle: s.libelle }))}
        sourcesPhotos={sourcesConfigurees()}
        motsCles={Object.fromEntries(sujetsProfession.map((s) => [s.id, motsClesDuSujet(s.id, motsCles.motsCles)]))}
        frequencesHashtags={Object.fromEntries(Object.values(hashtags.hashtags).flat().reduce((m, h) => m.set(h, (m.get(h) ?? 0) + 1), new Map<string, number>()))}
        sourceInitiale={typeof sp.source === 'string' ? sp.source : null}
        typeInitial={typeof sp.type === 'string' ? sp.type : null}
        studio={{ proposes: universDuParcours(univers.univers), modeles: modeles.map((m) => ({ id: m.id, manifeste: m.manifeste })), catalogue, marquesImportees, themesActives: themesActives() }}
      />
    </div>
  );
}
