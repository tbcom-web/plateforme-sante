import HubEspace from '@/components/HubEspace';
import { getProfession } from '@/lib/profession';

export const metadata = { title: 'Super admin · Cuisine' };

// Cuisine (espaces de l'admin, docs/espaces-admin.md) : composer avec les ingrédients du frigo.
export default async function Cuisine() {
  const profession = await getProfession();
  return (
    <HubEspace id="cuisine" sousTitre={`Profession : ${profession.libelle}.`} details={{
      '/admin/cuisine/studio': 'Composer une recette, l’améliorer, l’enregistrer.',
      '/admin/cuisine/atelier': 'Combinaisons complètes du générateur, page entière.',
      '/admin/cuisine/kits': 'Un jeu cohérent de visuels par sujet.',
      '/admin/cuisine/images-a-generer': 'Prompts des images manquantes, import des images générées.',
      '/admin/profils': 'Profils de pratique et publication des recettes.',
    }} />
  );
}
