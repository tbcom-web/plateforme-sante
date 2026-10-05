// Drapeau admin des thèmes différés (themes.ts du core) : THEMES_ACTIVES=posture active un thème « differe » après
// validation déontologique. Vide par défaut : la posture reste grisée « bientôt disponible » et refusée à l'enregistrement.
// La même variable doit être posée au build des sites (apps/sites/src/lib/navigation.ts) pour que la page soit construite.
export const themesActives = (): string[] => (process.env.THEMES_ACTIVES ?? '').split(',').map((x) => x.trim()).filter(Boolean);
