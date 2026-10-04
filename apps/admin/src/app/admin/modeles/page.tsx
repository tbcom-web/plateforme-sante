import { GAMMES, MODELES_INTEGRES, MOTIFS, POLICES_TEXTE, POLICES_TITRES, SECTIONS_ACCUEIL, TRAITEMENTS_IMAGES, validerManifeste } from '@plateforme/core';
import { getModelesImportes } from '@/lib/modeles';
import { ActionsModele, Import } from './Import';
import Propagation from '@/components/Propagation';

export const metadata = { title: 'Super admin · Modèles' };

const exemple = JSON.stringify({ ...MODELES_INTEGRES[2], id: 'prestige-sable', nom: 'Prestige sable', version: 1 }, null, 2);

export default async function Modeles() {
  const { lignes, erreur } = await getModelesImportes();

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="text-2xl font-bold">Modèles de sites</h1>
        <p className="mt-1 max-w-3xl text-sm text-neutral-600">
          Un modèle est une fiche JSON qui règle l’apparence (accueil diaporama ou scindé, ordre des sections, police, arrondis, couleurs).
          Les adresses des pages, titres, descriptions, données structurées et sitemap sont produits par le moteur : changer de modèle ne modifie pas le référencement.
          Une fiche importée avec l’id d’un modèle intégré le remplace sur tous les sites à leur prochaine publication.
        </p>
      </div>

      {erreur && <p className="text-sm text-red-700">Lecture impossible : exécutez la migration 0010 des modèles dans Supabase.</p>}

      <section>
        <h2 className="mb-3 font-semibold">Modèles intégrés</h2>
        <ul className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {MODELES_INTEGRES.map((m) => (
            <li key={m.id} className="rounded-xl border border-black/5 bg-white p-4 text-sm">
              <span className="block font-semibold">{m.nom}</span>
              <span className="block text-neutral-600">{m.description}</span>
              <code className="mt-2 block text-xs text-neutral-400">{m.id} · v{m.version}</code>
              <div className="mt-3"><Propagation cible={{ modele: m.id }} libelle="ce modèle" /></div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 font-semibold">Modèles importés</h2>
        <ul className="grid gap-2">
          {lignes.length === 0 && !erreur && <li className="text-sm text-neutral-500">Aucun modèle importé.</li>}
          {lignes.map((l) => {
            const valide = validerManifeste(l.manifeste).erreurs.length === 0;
            return (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-black/5 bg-white p-4">
                <span>
                  <span className="block font-semibold">{l.nom}</span>
                  <code className="text-xs text-neutral-500">{l.id} · v{l.version} · {new Date(l.updated_at).toLocaleDateString('fr-FR')}</code>
                </span>
                <span className="flex items-center gap-3">
                  {!valide && <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-800">Fiche invalide</span>}
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${l.actif ? 'bg-teal-100 text-teal-900' : 'bg-neutral-100 text-neutral-700'}`}>
                    {l.actif ? 'Actif' : 'Inactif'}
                  </span>
                  <ActionsModele id={l.id} actif={l.actif} />
                </span>
                {l.actif && <div className="w-full"><Propagation cible={{ modele: l.id }} libelle="ce modèle" /></div>}
              </li>
            );
          })}
        </ul>
      </section>

      <Import exemple={exemple} />

      <details className="text-sm text-neutral-600">
        <summary className="cursor-pointer font-medium">Format de la fiche</summary>
        <ul className="mt-2 list-disc pl-5">
          <li><code>id</code> : 3 à 40 caractères (minuscules, chiffres, tirets) ; <code>version</code> : à augmenter à chaque mise à jour.</li>
          <li><code>entete</code> : <code>opaque</code> ou <code>transparent</code> (transparent sur l’image puis opaque au défilement).</li>
          <li><code>accueil.hero</code> : <code>diaporama</code>, <code>plein</code> (une grande photo) ou <code>scinde</code> ; <code>accueil.voile</code> : assombrissement de la photo, 0 à 90.</li>
          <li><code>pied</code> : <code>sombre</code>, <code>accent</code> ou <code>clair</code> ; <code>animations</code> : <code>douces</code> ou <code>aucune</code> ; <code>couleurConseillee</code> : #rrggbb proposé au praticien.</li>
          <li><code>accueil.sections</code> : ordre parmi {SECTIONS_ACCUEIL.join(', ')} ; <code>competences</code> et <code>acces</code> obligatoires.</li>
          <li><code>competences</code> : <code>liste</code> ou <code>cartes</code>.</li>
          <li><code>jetons</code> : <code>policeTitres</code> ({POLICES_TITRES.join(', ')}), <code>policeTexte</code> ({POLICES_TEXTE.join(', ')}), <code>graisseTitres</code> (300–800), <code>rayon</code> (0–40), <code>boutons</code> (pilule, arrondi, carre), <code>accent</code> (couleur, encre), <code>fond</code> et <code>fondDoux</code> (#rrggbb), <code>images</code> ({TRAITEMENTS_IMAGES.join(', ')}), <code>motif</code> ({MOTIFS.join(', ')}), <code>plan</code> (fond des surfaces sombres « plan d’architecte », #rrggbb) et <code>signal</code> (lectures de données sur fond sombre, #rrggbb). Police <code>schibsted</code> : grotesque des références « relevé de podoscope ».</li>
          <li><code>gammes</code> (facultatif) : gammes de couleurs recommandées parmi {GAMMES.map((g) => g.id).join(', ')}. Traits, trame, typographie des données et mouvement viennent de la charte du core (<code>docs/charte-graphique.md</code>).</li>
        </ul>
      </details>
    </div>
  );
}
