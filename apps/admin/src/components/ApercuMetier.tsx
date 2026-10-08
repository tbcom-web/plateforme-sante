'use client';

// Métier affiché par les aperçus (ApercuTheme et ses sous-aperçus : gabarits, premier écran photo, pages sujet) : titre et
// discipline du pack de la profession (packs-professions.ts). Absent (null) : textes de la profession par défaut, À L'IDENTIQUE
// (« Pédicure-podologue », « pédicurie-podologie »). Posé par ApercuTheme quand une autre profession est montrée (parcours client
// en mode test : profession en préparation).
import { createContext, useContext } from 'react';

export type MetierApercu = { titre: string; discipline: string; /** Accroche du pack (titre de la section des soins) */ accroche: string };
export const ContexteMetierApercu = createContext<MetierApercu | null>(null);
export const useMetierApercu = () => useContext(ContexteMetierApercu);
