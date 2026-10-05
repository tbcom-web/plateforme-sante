-- Titres courts des compétences : uniquement des intitulés reconnus (relecture praticien 2026-10-04).
-- « Podo-diabétologie » et « Podopédiatrie » ne sont pas des titres reconnus par l'Ordre.
update public.soins_catalogue set titre_court = 'Suivi du pied diabétique'
  where slug = 'pied-diabetique' and titre_court = 'Podo-diabétologie';
update public.soins_catalogue set titre_court = 'Podologie de l’enfant'
  where slug = 'podologie-enfant' and titre_court in ('Podopédiatrie', 'Podo-pédiatrie');
