'use server';

import { ingredientsDirection, serialiserComposition } from '@plateforme/core';
import { sujetsDuProfilComposeur } from '@plateforme/core/composeur';
import { exigerContributeur } from '@/lib/chaine-modeles';
import { professionDegustation } from '@/lib/degustation';
import { profilDepuisParametre, propositionsComposeur } from '@/lib/composeur';

export type CarteComposeur = { cle: string; nom: string; design: Record<string, unknown>; ingredients: Record<string, unknown>; profilDemo: string; legende: string; rendue: Record<string, unknown> };

/**
 * Présélection « composeur d'abord » (2026-10-11) : les propositions du composeur pour un profil de démonstration (profil de pratique),
 * au format des cartes de la présélection. [] si le profil est inconnu ou en cas d'échec (la page retombe sur les tirages au hasard).
 */
export async function cartesComposeur(profilId: string): Promise<CarteComposeur[]> {
  try {
    await exigerContributeur();
    const prof = await professionDegustation();
    const p = profilDepuisParametre(profilId, prof.id);
    if (!p?.id) return [];
    const r = await propositionsComposeur(p.id);
    if (!r) return [];
    const sujets = sujetsDuProfilComposeur(p);
    return r.propositions.map((x) => ({
      cle: x.cle, nom: `${x.nomFamille} · composé ${x.cle.slice(5, 9)}`, design: x.design, ingredients: ingredientsDirection(x.x, sujets, x.famille) as unknown as Record<string, unknown>,
      profilDemo: p.id!, legende: `Composé pour ${r.profil.nom} · ${x.legende}`, rendue: JSON.parse(serialiserComposition(x.x)),
    }));
  } catch (e) {
    console.error('[composeur] cartes de la présélection impossibles', e);
    return [];
  }
}
