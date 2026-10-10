'use client';
import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

// Mesure continue (2026-10-10, « optimiser les requêtes, la base ») : petite pastille « page servie en x ms », pour les admins
// seulement (rendue par les layouts du super admin et de la chaîne quand le compte est admin). Mesurée par le navigateur :
// chargement complet = début de la requête → fin de la réponse (rendu serveur en flux compris, document de navigation) ;
// navigation dans l'admin = durée de la dernière requête RSC (_rsc). En-tête Server-Timing du proxy (session) en info-bulle.
// Repère : < 500 ms vert, < 1,5 s orange, au-delà rouge. Aucun envoi, aucune donnée personnelle.
type Mesure = { ms: number; detail: string };

function derniereMesure(): Mesure | null {
  const ressources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  const rsc = ressources.filter((r) => r.name.includes('_rsc=')).at(-1);
  const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  const e = rsc && (!nav || rsc.startTime > nav.responseEnd) ? rsc : nav;
  if (!e || !e.responseEnd) return null;
  const timing = (e.serverTiming ?? []).map((t) => `${t.description || t.name} ${Math.round(t.duration)} ms`).join(' · ');
  const premierOctet = Math.round(e.responseStart - e.requestStart);
  return { ms: Math.round(e.responseEnd - e.requestStart), detail: `premier octet ${premierOctet} ms${timing ? ` · ${timing}` : ''}${e === rsc ? ' · navigation' : ' · chargement complet'}` };
}

export default function TempsServeur() {
  const chemin = usePathname();
  const params = useSearchParams();
  const [m, setM] = useState<Mesure | null>(null);
  useEffect(() => {
    // Après la fin du flux (fin de réponse) : relevé différé, puis quelques relevés pour la navigation en cours
    let n = 0;
    const id = setInterval(() => { const x = derniereMesure(); if (x) setM(x); if (++n >= 6) clearInterval(id); }, 500);
    return () => clearInterval(id);
  }, [chemin, params]);
  if (!m) return null;
  const couleur = m.ms < 500 ? 'bg-emerald-50 text-emerald-900 ring-emerald-200' : m.ms < 1500 ? 'bg-amber-50 text-amber-900 ring-amber-200' : 'bg-red-50 text-red-900 ring-red-200';
  return (
    <p className={`pointer-events-none fixed bottom-2 left-2 z-50 rounded-full px-2 py-0.5 text-xs tabular-nums ring-1 ${couleur}`} title={m.detail} data-temps-serveur={m.ms}>
      page servie en {m.ms.toLocaleString('fr-FR')} ms
    </p>
  );
}
