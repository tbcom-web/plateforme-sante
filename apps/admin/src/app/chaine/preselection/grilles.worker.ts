// Worker de la présélection (/chaine/preselection) : grilles « Directions » tirées hors du fil principal, la page suivante préparée
// pendant que l'on regarde la page en cours (perf, 2026-10-09 : 0,2 à 2 s par grille, jusqu'à 6 grilles par page). Même calcul
// que la page (contexteDuProfil + grilleDirectionsDegustation), mêmes registres du core : même graine, même grille.
import { grilleDirectionsDegustation, poserRegistresTirage, type PhotoBanque, type PoidsAtelier, type ModeleManifeste, type RegistresTirage } from '@plateforme/core';
import { contexteDuProfil, type ProfilRendu } from '../rendu-profil';

type Donnees = { poids: PoidsAtelier | null; photos: PhotoBanque[]; modeles: { id: string; manifeste: ModeleManifeste }[]; tranches: { refuses: string[]; favoris: string[] } };
let donnees: (Donnees & { refuses: Set<string>; favoris: Set<string> }) | null = null;

type Message = { type: 'donnees'; donnees: Donnees; registres: RegistresTirage } | { type: 'grille'; id: number; profil: ProfilRendu; graine: number };

self.onmessage = (e: MessageEvent<Message>) => {
  const m = e.data;
  if (m.type === 'donnees') { donnees = { ...m.donnees, refuses: new Set(m.donnees.tranches.refuses), favoris: new Set(m.donnees.tranches.favoris) }; poserRegistresTirage(m.registres); return; }
  try {
    if (!donnees) throw new Error('données absentes');
    const ctx = contexteDuProfil(m.profil, { poids: donnees.poids, photos: donnees.photos, modeles: donnees.modeles });
    const g = grilleDirectionsDegustation({ contexte: ctx, notes: donnees.poids?.notesElements ?? {}, tranches: { refuses: donnees.refuses, favoris: donnees.favoris }, graine: m.graine });
    self.postMessage({ id: m.id, ok: true, grille: g });
  } catch (err) {
    self.postMessage({ id: m.id, ok: false, message: String(err) });
  }
};
