'use client';

// Mémoire commune des expositions côté navigateur (packages/core/src/politique-evaluation.ts) : état du serveur (derniers écrans de
// TOUTES les surfaces, implicites, règles apprises) + écrans de la session. `montrer` ajoute un écran à la mémoire de la session ;
// `journaliser` l'envoie aussi au journal `expositions` (0054) : écrans passés sans réponse, décisions des Arrivages, « Pas pour
// ici » des kits (les notes, duels et grilles sont déjà journalisés dans leurs tables). Sans la migration : mémoire de secours dans
// ce navigateur (localStorage, 180 jours, 500 lignes), relue à chaque page.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { contexteDepuisEtat, nouvelEcran, POLITIQUE_EVALUATION, type EtatPolitique, type Exposition, type ResultatExposition, type SurfaceEvaluation } from '@plateforme/core';
import { enregistrerExpositions } from '@/app/admin/retours/actions-politique';

const CLE_LOCALE = 'expositions-locales';
type Montre = { cle: string; resultat: ResultatExposition; note?: number | null; etiquettes?: string[] | null; texte?: string | null };

function lireLocales(): Exposition[] {
  try {
    const l = JSON.parse(localStorage.getItem(CLE_LOCALE) ?? '[]') as Exposition[];
    const limite = new Date(Date.now() - POLITIQUE_EVALUATION.purgeJours * 86400000).toISOString();
    return Array.isArray(l) ? l.filter((e) => e && typeof e.cle === 'string' && typeof e.le === 'string' && e.le >= limite) : [];
  } catch { return []; }
}
function ecrireLocales(l: readonly Exposition[]) {
  try { localStorage.setItem(CLE_LOCALE, JSON.stringify(l.slice(-500))); } catch { /* stockage indisponible */ }
}

export function useExpositions(surface: SurfaceEvaluation, etat: EtatPolitique | null | undefined) {
  const [session, setSession] = useState<Exposition[]>([]);
  const [locales, setLocales] = useState<Exposition[]>([]);
  useEffect(() => { setLocales(lireLocales()); }, []);
  const ctx = useMemo(() => contexteDepuisEtat(etat, [...locales, ...session]), [etat, locales, session]);

  const montrer = useCallback((items: readonly Montre[], o: { journaliser?: boolean; ecran?: string; surface?: SurfaceEvaluation } = {}) => {
    if (!items.length) return;
    const surf = o.surface ?? surface;
    const ecran = o.ecran ?? nouvelEcran(surf);
    const le = new Date().toISOString();
    const l: Exposition[] = items.map((x) => ({ cle: x.cle, surface: surf, ecran, le, resultat: x.resultat, ...(x.note ? { note: x.note } : {}), ...(x.etiquettes?.length ? { etiquettes: x.etiquettes } : {}), ...(x.texte ? { texte: x.texte } : {}) }));
    setSession((s) => [...s, ...l]);
    if (!o.journaliser) return;
    void enregistrerExpositions(l).then((r) => {
      if (r.ok || !r.migrationManquante) return;
      const n = [...lireLocales(), ...l];
      ecrireLocales(n);
    }).catch(() => ecrireLocales([...lireLocales(), ...l]));
  }, [surface]);

  return { ctx, montrer };
}
