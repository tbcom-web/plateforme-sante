import AnimationsPretes from '@/components/AnimationsPretes';
import { getAnimationsPretes } from '@/lib/illustrations';

// Registre des animations d'illustrations prêtes (images de base validées) pour toutes les pages de cette section : posé avant
// la page, une lecture des statuts de la bibliothèque (mémorisée pour la requête, déjà lue par ces pages).
export default async function Layout({ children }: { children: React.ReactNode }) {
  const cles = await getAnimationsPretes().catch(() => []);
  return (
    <>
      <AnimationsPretes cles={cles} />
      {children}
    </>
  );
}
