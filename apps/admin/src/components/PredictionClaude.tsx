'use client';

import { useEffect, useState } from 'react';
import { empreinteImage, predictionPour, type PredictionJuge } from '@plateforme/core/juge';

// « Claude prévoit : 4★ — … » (juge du goût de Paul, retours/predictions.json). Discret, et seulement APRÈS la note de Paul
// pour ne pas l'influencer ; l'option « afficher avant » (désactivée par défaut) est mémorisée dans ce navigateur.

const CLE_OPTION = 'juge-afficher-avant';

/** Empreinte à comparer à la prédiction : celle du rendu (SVG, gamme) ou l'adresse de l'image */
export function empreintePourJuge(empreinte: string | null | undefined, src?: string | null): string | null {
  return empreinte ?? (src ? empreinteImage(src) : null);
}

/** Option « afficher la prévision avant de noter » (faux par défaut ; stockage local facultatif) */
export function useAfficherAvant(): [boolean, (v: boolean) => void] {
  const [v, setV] = useState(false);
  useEffect(() => { try { setV(localStorage.getItem(CLE_OPTION) === '1'); } catch { /* stockage indisponible */ } }, []);
  const changer = (x: boolean) => { setV(x); try { localStorage.setItem(CLE_OPTION, x ? '1' : '0'); } catch { /* ignoré */ } };
  return [v, changer];
}

/** Texte court pour un message (après une note) */
export function textePrediction(p: PredictionJuge): string {
  return `Claude prévoyait ${p.note}★ — ${p.note >= 4 ? p.vaBien : p.generait}`;
}

export default function PredictionClaude({ predictions, cle, empreinte, notee, afficherAvant = false, className = '' }: {
  predictions: Record<string, PredictionJuge[]> | undefined;
  cle: string;
  empreinte: string | null;
  /** Paul a déjà noté CETTE version (même empreinte) */
  notee: boolean;
  afficherAvant?: boolean;
  className?: string;
}) {
  const p = predictionPour(predictions?.[cle] ?? [], cle, empreinte);
  if (!p || (!notee && !afficherAvant)) return null;
  return (
    <p className={`text-xs text-neutral-500 ${className}`} title={`Va bien : ${p.vaBien}\nGênerait : ${p.generait}\nConfiance ${p.confiance} · profil ${p.profil} · ${p.le}`}>
      <span className="font-semibold text-neutral-600">Claude prévoit : {p.note}★</span> — {p.note >= 4 ? p.vaBien : p.generait}
      {p.eliminatoire ? <span className="ml-1 rounded bg-neutral-100 px-1">{p.eliminatoire}</span> : null}
    </p>
  );
}
