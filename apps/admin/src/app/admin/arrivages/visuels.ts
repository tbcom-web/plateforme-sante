'use server';

import { gamme as gammeParId, inventaireAssets, inventaireStudio, variablesGamme, type Asset } from '@plateforme/core';
import { exigerAdmin } from '@/lib/admin';
import type { VisuelArrivage } from './Arrivages';

// Aperçus des nouveautés des Arrivages, chargés par petits paquets (les 250 nouveautés d'une livraison pèseraient plusieurs Mo
// d'un coup) : SVG rendu côté serveur, image, nuancier ou élément du studio (rendu dans le navigateur par ApercuStudio).

let parCle: Map<string, Asset> | null = null;

export async function visuelDe(a: Asset | undefined): Promise<VisuelArrivage> {
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

/** Aperçus de 24 nouveautés au plus */
export async function visuelsNouveautes(cles: string[]): Promise<Record<string, VisuelArrivage>> {
  await exigerAdmin();
  parCle ??= new Map([...inventaireAssets(), ...inventaireStudio()].map((a) => [a.cle, a]));
  const l = (Array.isArray(cles) ? cles : []).filter((k) => typeof k === 'string').slice(0, 24);
  return Object.fromEntries(await Promise.all(l.map(async (k) => [k, await visuelDe(parCle!.get(k))] as const)));
}
