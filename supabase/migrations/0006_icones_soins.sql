-- Icône de chaque soin du catalogue ("prefixe:nom" d'un jeu intégré : healthicons, lucide, ph, tabler).
-- Vide = icône par défaut selon le slug (voir packages/core/src/icones-meta.ts).

alter table public.soins_catalogue
  add column if not exists icone text
  check (icone is null or icone ~ '^(healthicons|lucide|ph|tabler):[a-z0-9]+(-[a-z0-9]+)*$');

update public.soins_catalogue set icone = v.icone
from (values
  ('bilan-podologique', 'healthicons:foot-outline'),
  ('semelles-orthopediques', 'ph:footprints'),
  ('soins-de-pedicurie', 'healthicons:health-worker-outline'),
  ('pied-diabetique', 'healthicons:diabetes-measure-outline'),
  ('podologie-du-sport', 'healthicons:running-outline'),
  ('podologie-enfant', 'healthicons:child-care-outline')
) as v(slug, icone)
where soins_catalogue.profession_slug = 'podologue'
  and soins_catalogue.slug = v.slug
  and soins_catalogue.icone is null;
