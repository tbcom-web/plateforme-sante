-- Relecture praticien (2026-10-04) : précisions médicales sur le pied diabétique et le bilan.
-- Remplacements ciblés : un texte déjà modifié dans l'admin (catalogue) n'est pas touché.

-- Pied diabétique : une plaie relève du médecin, sans attendre.
update public.soins_catalogue
set faq = replace(faq::text,
  'Ne pas la négliger : contacter rapidement le médecin ou le pédicure-podologue, même si elle n’est pas douloureuse.',
  'Ne pas la négliger, même si elle n’est pas douloureuse : consulter le médecin traitant sans attendre (dans les 24 à 48 heures). En cas de rougeur qui s’étend, de fièvre ou de plaie qui s’aggrave, appeler le 15.')::jsonb
where slug = 'pied-diabetique';

-- Pied diabétique : prise en charge par grade de risque.
update public.soins_catalogue
set corps = replace(corps,
  'Selon le grade de risque, déterminé par le médecin, l’Assurance Maladie prend en charge un bilan et un nombre défini de séances de prévention par an, sur prescription médicale.',
  'Le médecin détermine un grade de risque podologique (de 0 à 3). Pour les grades 2 et 3, l’Assurance Maladie prend en charge, sur prescription, un bilan podologique puis des séances de soins de prévention : jusqu’à 5 par an en grade 2 et 8 par an en grade 3.')
where slug = 'pied-diabetique';

-- Bilan : l'équipement dépend du cabinet, sans formule de modèle.
update public.soins_catalogue
set corps = replace(corps,
  '(podoscope, plateforme de pression selon l’équipement du cabinet)',
  'sur podoscope et, quand le cabinet en est équipé, sur plateforme de pression')
where slug = 'bilan-podologique';
