'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Recharge les données de la page toutes les 20 s tant qu'une publication est en cours. */
export default function ActualisationAuto({ actif }: { actif: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!actif) return;
    const minuterie = setInterval(() => router.refresh(), 20_000);
    return () => clearInterval(minuterie);
  }, [actif, router]);
  return null;
}
