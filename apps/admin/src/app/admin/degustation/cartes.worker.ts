// Worker de /admin/degustation : prépare les cartes (grilles, duels, notes) hors du fil principal, pendant que Paul joue
// (perf, 2026-10-09). Même calcul que la page (construireCarte, core : degustation-cartes.ts), mêmes registres du core.
import { construireCarte, outilsCartes, poserRegistresTirage, type CarteSession, type DonneesCartes, type IdFamilleStyle, type RegistresTirage } from '@plateforme/core';

let donnees: DonneesCartes | null = null;
let outils: ReturnType<typeof outilsCartes> | null = null;

type Message = { type: 'donnees'; donnees: DonneesCartes; registres: RegistresTirage } | { type: 'carte'; id: number; carte: CarteSession; graine: number; famille: IdFamilleStyle | null };

self.onmessage = (e: MessageEvent<Message>) => {
  const m = e.data;
  if (m.type === 'donnees') { donnees = m.donnees; outils = outilsCartes(m.donnees); poserRegistresTirage(m.registres); return; }
  try {
    if (!donnees || !outils) throw new Error('données absentes');
    self.postMessage({ id: m.id, ok: true, carte: construireCarte(donnees, m.carte, m.graine, m.famille, outils) });
  } catch (err) {
    self.postMessage({ id: m.id, ok: false, message: String(err) });
  }
};
