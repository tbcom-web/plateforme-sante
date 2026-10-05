import Propagation from '@/components/Propagation';

export const metadata = { title: 'Super admin · Maintenance' };

// Opérations groupées sur l'ensemble des sites, séparées de la liste pour éviter un clic malheureux.
export default function Maintenance() {
  return (
    <div className="grid max-w-3xl gap-6">
      <div>
        <h1 className="text-2xl font-bold">Maintenance</h1>
        <p className="mt-1 text-sm text-neutral-600">Opérations qui concernent tous les sites en ligne.</p>
      </div>
      <section className="grid gap-3 rounded-2xl border border-black/5 bg-white p-5">
        <h2 className="font-semibold">Appliquer la charte et les visuels communs</h2>
        <p className="text-sm text-neutral-600">
          Après une évolution de la charte, des dessins ou des animations (mise en ligne du code), republiez les sites déjà en ligne.
          Chaque site est reconstruit à partir de sa version publiée : les modifications non publiées des praticiens ne sont pas mises en ligne,
          et les sites suspendus ne sont pas concernés. Confirmation par saisie du nombre de sites.
        </p>
        <Propagation cible={{ tous: true }} libelle="la charte et les visuels communs" saisie />
      </section>
    </div>
  );
}
