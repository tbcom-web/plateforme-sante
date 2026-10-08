import ContexteImages from '@/components/ContexteImages';

// Contexte d'images (photos exclues, kits par sujet : packages/core/src/contexte-images.ts) posé avant les aperçus du praticien
export default function Disposition({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ContexteImages praticien />
      {children}
    </>
  );
}
