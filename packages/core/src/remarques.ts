// Remarques libres d'une note (espace « Donner mon avis », atelier) : « Ce qui va bien », « Ce qui ne va pas » (champs
// distincts, migration 0028) et l'ancien commentaire unique, gardé pour les notes plus anciennes. Module pur.

/** Remarques libres d'une note, séparées (« Ce qui va bien », « Ce qui ne va pas », commentaire) ; '' si aucune */
export function texteRemarques(x: { positif?: string | null; negatif?: string | null; commentaire?: string | null }): string {
  const t = (v?: string | null) => (v ?? '').replace(/\s+/g, ' ').replace(/\|/g, '/').trim();
  return [
    t(x.positif) && `Ce qui va bien : ${t(x.positif)}`,
    t(x.negatif) && `Ce qui ne va pas : ${t(x.negatif)}`,
    t(x.commentaire) && `Commentaire : ${t(x.commentaire)}`,
  ].filter(Boolean).join(' — ');
}
