'use client';

// Confirmation avant de publier un site incomplet : rien n'empêche plus la publication (règle de Paul, 2026-10-05), mais
// le praticien voit ce que le site affichera à la place des informations manquantes (packages/core/src/replis.ts).
// `soumettre` : le bouton « Publier quand même » soumet le formulaire englobant (action serveur) au lieu d'appeler onConfirmer.
export default function ConfirmationPublication({
  remplacements, onConfirmer, onAnnuler, enCours = false, soumettre = false, libelleAnnuler = 'Compléter d’abord',
}: {
  remplacements: string[];
  onConfirmer?: () => void;
  onAnnuler: () => void;
  enCours?: boolean;
  soumettre?: boolean;
  libelleAnnuler?: string;
}) {
  return (
    <div role="alertdialog" aria-labelledby="titre-confirmation-publication" className="grid gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
      <p id="titre-confirmation-publication" className="font-semibold">
        {remplacements.length > 1 ? `${remplacements.length} informations manquent` : 'Une information manque'} : le site sera publié avec une mention sobre à la place.
      </p>
      <ul className="grid gap-1">
        {remplacements.map((m) => <li key={m} className="flex gap-2"><span aria-hidden="true">○</span>{m}</li>)}
      </ul>
      <p className="text-xs text-amber-900">Vous pourrez compléter ces informations et republier à tout moment.</p>
      <div className="flex flex-wrap gap-2">
        <button
          type={soumettre ? 'submit' : 'button'}
          onClick={soumettre ? undefined : onConfirmer}
          disabled={enCours}
          className="min-h-11 rounded-lg bg-teal-800 px-4 font-semibold text-white hover:bg-teal-900 disabled:opacity-60"
        >
          {enCours ? 'Publication…' : 'Publier quand même'}
        </button>
        <button type="button" onClick={onAnnuler} disabled={enCours} className="min-h-11 rounded-lg px-4 font-semibold text-teal-900 hover:bg-amber-100">
          {libelleAnnuler}
        </button>
      </div>
    </div>
  );
}
