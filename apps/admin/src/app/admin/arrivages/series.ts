import {
  appliquerRevueSerie, gamme as gammeParId, libelleSujet, profilsDePratique, themeRecherche, hashtagsAcceptation, LIBELLES_ECARTS, LIBELLES_ECARTS_CLAUDE, libelleEmplacementSerie, pratiqueDe, traitementPhotos,
  type CouleurPalette, type PhotoSerie, type RaisonEcart, type RevueSerieClaude, type SerieEnregistree,
} from '@plateforme/core';
import type { ItemArrivage } from './Arrivages';

// Forme AFFICHÉE d'une série de l'agent dans les Arrivages (planche, signature, aperçu appliqué) : construite côté serveur à partir
// de la série enregistrée (photos_series, 0053) et de la revue de Claude (retours/series-photos-claude.json). Pur, sans réseau.

export type PhotoSerieAffichee = Pick<PhotoSerie, 'cle' | 'source' | 'idSource' | 'apercu' | 'pageUrl' | 'auteur' | 'auteurUrl' | 'largeur' | 'hauteur' | 'requete' | 'emplacement' | 'qualite' | 'pertinence' | 'ecart'> & {
  libelleEmplacement: string;
  /** Hashtags pré-remplis à l'acceptation (#basket, #accueil, #kit-sport, #serie-…) */
  hashtags: string[];
  temperature: number; luminosite: number;
};

export type SerieAffichee = {
  id: string;
  groupe: string;
  rang: number;
  titre: string;
  profession: string;
  cible: { id: string; type: string; libelle: string; profil: string | null; sujet: string; activite: string | null; raison: string; pour: string | null };
  signature: { libelle: string; mots: string[] };
  coherence: number;
  score: number;
  gamme: { id: string; nom: string };
  traitement: { id: string; nom: string };
  palette: CouleurPalette[];
  photos: PhotoSerieAffichee[];
  ecartees: (PhotoSerieAffichee & { raison: string })[];
  revue: { libelle: string; note: number | null; remarque: string | null } | null;
  /** Thèmes cochés à l'acceptation (identifiants) et leurs libellés */
  themes: { id: string; libelle: string }[];
  journal: { requetes: number; candidates: number; analysees: number; ecartees: string };
  /** Vocabulaire du site d'exemple (« Cabinet de podologie », « pédicure-podologue ») */
  vocabulaire: { discipline: string; metier: string };
  creeLe: string;
};

const affichee = (s: SerieEnregistree, p: PhotoSerie): PhotoSerieAffichee => ({
  cle: p.cle, source: p.source, idSource: p.idSource, apercu: p.apercu, pageUrl: p.pageUrl, auteur: p.auteur, auteurUrl: p.auteurUrl, largeur: p.largeur, hauteur: p.hauteur, requete: p.requete,
  emplacement: p.emplacement, qualite: p.qualite, pertinence: p.pertinence, ecart: p.ecart, libelleEmplacement: libelleEmplacementSerie(p.emplacement), hashtags: hashtagsAcceptation(s, p),
  temperature: p.car?.temperature ?? 0, luminosite: p.car?.luminosite ?? 0,
});

export function serieAffichee(s: SerieEnregistree, revue: RevueSerieClaude | null | undefined): SerieAffichee {
  const r = appliquerRevueSerie(s, revue);
  const pratique = pratiqueDe(s.profession);
  const c = s.cibleDetails;
  const g = gammeParId(s.gamme);
  const ecarts = Object.entries(s.journal?.ecartees ?? {}).filter(([, n]) => n).map(([k, n]) => `${n} ${LIBELLES_ECARTS[k as RaisonEcart] ?? k}`).join(', ');
  return {
    id: s.id, groupe: s.groupe, rang: s.rang, titre: s.titre, profession: s.profession,
    cible: { id: c.id, type: c.type, libelle: c.libelle, profil: c.profil, sujet: c.sujet, activite: c.activite, raison: c.raison, pour: c.profil ? profilsDePratique(s.profession).find((x) => x.id === c.profil)?.pour ?? null : null },
    signature: { libelle: s.signature?.libelle ?? '', mots: s.signature?.mots ?? [] }, coherence: s.coherence, score: s.score,
    gamme: { id: s.gamme, nom: g?.nom ?? s.gamme }, traitement: { id: s.traitement, nom: traitementPhotos(s.traitement)?.nom ?? s.traitement }, palette: s.palette,
    photos: r.photos.map((p) => affichee(s, p)),
    ecartees: r.ecartees.map((p) => ({ ...affichee(s, p), raison: `${LIBELLES_ECARTS_CLAUDE[p.raisonClaude]}${p.detailClaude ? ` : ${p.detailClaude}` : ''}` })),
    revue: r.libelle ? { libelle: r.libelle, note: r.revue?.note ?? null, remarque: r.revue?.remarque ?? null } : null,
    themes: (c.themesDecision ?? []).map((id) => ({ id, libelle: themeRecherche(s.profession, id)?.libelle ?? libelleSujet(id) })),
    journal: { requetes: s.journal?.requetes?.length ?? 0, candidates: s.journal?.candidates ?? 0, analysees: s.journal?.analysees ?? 0, ecartees: ecarts },
    vocabulaire: { discipline: pratique.vocabulaire.discipline, metier: pratique.vocabulaire.metier },
    creeLe: s.creeLe,
  };
}

/** Ligne de la file pour une série de l'agent */
export const itemSerie = (s: SerieAffichee): ItemArrivage => ({
  id: `s:${s.id}`, source: 'series-photos', type: 'photo', titre: s.titre, detail: `Série ${s.rang + 1} · ${s.signature.libelle} · cohérence ${s.coherence}/100`, date: s.creeLe.slice(0, 10) || null,
  arrivage: { kind: 'serie', id: s.id }, visuel: { kind: 'serie', serie: s }, sujets: s.themes.map((t) => t.id), hashtags: [],
});
