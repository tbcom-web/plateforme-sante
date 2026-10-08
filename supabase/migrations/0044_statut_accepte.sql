-- Arrivages du super admin (décision de Paul du 2026-10-08, /admin/arrivages, packages/core/src/arrivages.ts) : statut
-- « accepte » des revues (journal illustrations_revues, statut courant illustrations_statuts, migration 0021). Une nouveauté
-- du code acceptée entre au frigo (utilisable par le générateur) sans être « validée » (revue fine, posée par Paul seul).
-- Aucune autre table : les photos libres gardent leurs statuts (a_valider → validee / retiree, migrations 0028 et 0031).
-- Rejouable : contraintes supprimées puis recréées sous le même nom. Aucune donnée modifiée.

alter table public.illustrations_revues drop constraint if exists illustrations_revues_statut_check;
alter table public.illustrations_revues add constraint illustrations_revues_statut_check
  check (statut in ('a_revoir', 'accepte', 'valide', 'a_retravailler', 'retire'));

alter table public.illustrations_statuts drop constraint if exists illustrations_statuts_statut_check;
alter table public.illustrations_statuts add constraint illustrations_statuts_statut_check
  check (statut in ('a_revoir', 'accepte', 'valide', 'a_retravailler', 'retire'));
