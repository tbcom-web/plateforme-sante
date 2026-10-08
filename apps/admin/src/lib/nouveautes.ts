import 'server-only';
import { cache } from 'react';
import { baseDeCle, clesRecentes, clesUnitairesInventaire, joursAvant, jourParis, lotsNouveautes } from '@plateforme/core';
import { createClient } from '@/lib/supabase/server';

// Badge du lien « Donner mon avis » (menu de l'admin) : nombre de nouveautés jamais notées (nouveautes.ts, registre
// inventaire-connu.json). Lecture légère : seules les notes postérieures au début de la fenêtre (une nouveauté ne peut pas avoir été
// notée avant d'exister) ; 0 en cas d'erreur (migration 0027 absente, hors ligne). Les réévaluations ne sont pas lues : le
// compteur exact (avec elles) est celui de la tuile « Nouveautés à noter ».

let connues: Set<string> | null = null;

export const getNombreNouveautes = cache(async (): Promise<number> => {
  try {
    const recentes = clesRecentes(jourParis(new Date()));
    if (!recentes.length) return 0;
    const debut = joursAvant(recentes[recentes.length - 1].date, 1);
    const supabase = await createClient();
    const { data, error } = await supabase.from('assets_notes').select('cle_asset').gte('created_at', `${debut}T00:00:00Z`).limit(20000);
    if (error) return 0;
    connues ??= new Set(clesUnitairesInventaire());
    // Une note de variante compte aussi pour son illustration de base (bases-illustrations.ts), comme dans la tuile
    const notees = new Set(((data ?? []) as { cle_asset: string }[]).flatMap((l) => [l.cle_asset, baseDeCle(l.cle_asset) ?? l.cle_asset]));
    return lotsNouveautes(recentes, { notees, connues }).reduce((s, l) => s + l.cles.length, 0);
  } catch {
    return 0;
  }
});
