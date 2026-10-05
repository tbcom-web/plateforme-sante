import DemoStudio from './DemoStudio';

export const metadata = { title: 'Super admin · Studio portrait (essai)' };

// Essai du studio portrait avec une photo locale : rien n'est envoyé ni enregistré (réservé au super admin, layout /admin).
export default function StudioPortraitEssai() {
  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-xl font-semibold">Studio portrait (essai)</h1>
        <p className="text-sm text-neutral-600">
          Essayez le studio avec une photo : détourage, cadrage, retouche et fonds aux couleurs d’une gamme. Tout reste dans ce navigateur,
          rien n’est envoyé au stockage ; les fichiers produits (tailles et poids) s’affichent ci-dessous.
        </p>
      </div>
      <DemoStudio />
    </div>
  );
}
