-- 0036 — Habillage des recettes du studio (2026-10-07, demande de Paul : « plus de combinaisons de polices, de tailles, MAJUSCULES
-- vs minuscules… des éléments de style… des styles de menus différents »).
-- Nouveaux types notables dans assets_notes (le type reste le préfixe de la clé) :
--   typo     : `typo:police:<paire>` (spécimen d'une paire de polices), `typo:<axe>:<valeur>` (échelle, casse, graisse…)
--   details  : `details:jeu:<jeu>`, `details:<élément>:<valeur>` (séparateurs, soulignés, coins, ombres, boutons…)
--   menu     : `menu:<ordinateur|mobile|rdv>:<variante>`
-- La composition d'une recette (recettes.composition, jsonb) porte déjà ces réglages (typo, details, menu) : aucune colonne.
-- Rejouable : la contrainte est remplacée à l'identique.

alter table public.assets_notes drop constraint if exists assets_notes_type_check;
alter table public.assets_notes add constraint assets_notes_type_check
  check (type in ('picto', 'dessin', 'ligne', 'materiel', 'animation', 'heros', 'biblio', 'photo', 'modele', 'gamme', 'structure', 'effets', 'composant', 'typo', 'details', 'menu'));
